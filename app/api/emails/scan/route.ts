import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/firestore';
import { createGmailClient, fetchTransactionEmails } from '@/lib/gmail';
import { ParserRegistry } from '@/lib/parsers/registry';
import { ParserV2 } from '@/lib/parsers/parser-v2';
import { CategorizationPipeline } from '@/lib/categorization/pipeline';
import { generateDedupKey } from '@/lib/parsers/dedup';
import type { Transaction } from '@/types';

function getParserV2(): ParserV2 {
  const registry = new ParserRegistry();
  registry.register({
    id: 'bca_credit_card',
    version: '1.0.0',
    priority: 10,
    match: {
      from_patterns: ['*@bca.co.id'],
      subject_patterns: ['*credit card transaction*'],
    },
    extract: {
      amount: [{ type: 'regex', pattern: 'Sejumlah\\s*:\\s*Rp\\.?([\\d,\\.]+)', transform: 'parse_currency_idr' }],
      merchant: [
        { type: 'regex', pattern: 'Merchant\\/ATM\\s*:\\s*(.+)' },
        { type: 'keyword_proximity', fallback: 'Merchant', proximity_window: 50, secondary_pattern: 'Merchant[^:]*:\\s*(.+)' },
      ],
      date: [{ type: 'regex', pattern: 'Pada Tanggal\\s*:\\s*(\\d{2}-\\d{2}-\\d{4})\\s*(\\d{2}:\\d{2}:\\d{2})\\s*WIB', transform: 'parse_datetime_id' }],
    },
  });
  registry.register({
    id: 'bca_debit',
    version: '1.0.0',
    priority: 5,
    match: {
      from_patterns: ['*@bca.co.id', '*@klikbca.com'],
      subject_patterns: ['*internet transaction*'],
    },
    extract: {
      amount: [{ type: 'regex', pattern: '(?:Total Bill|Total Payment)\\s*:\\s*IDR\\s*([\\d,\\.]+)', transform: 'parse_currency_idr' }],
      merchant: [
        { type: 'regex', pattern: 'Payment to\\s*:\\s*(.+)' },
        { type: 'regex', pattern: 'Company\\/Product Name\\s*:\\s*(.+)' },
      ],
      date: [{ type: 'regex', pattern: 'Transaction Date\\s*:\\s*(\\d{2}\\s+\\w+\\s+\\d{4})' }],
    },
  });
  return new ParserV2(registry);
}

function isValidBcaEmail(from: string, subject: string): boolean {
  const lowerFrom = from.toLowerCase();
  const lowerSubject = subject.toLowerCase();
  const validSenders = ['bca@bca.co.id', 'kartukreditbca@klikbca.com'];
  const validSubjects = ['internet transaction journal', 'credit card transaction notification'];
  
  const isValidSender = validSenders.some(s => lowerFrom.includes(s));
  const isValidSubject = validSubjects.some(s => lowerSubject.includes(s));
  
  return isValidSender && isValidSubject;
}

function detectSource(from: string, subject: string): 'shopee' | 'tokopedia' | 'traveloka' | 'bca' | 'ayo' | 'jago' | 'bni' | 'unknown' {
  const lower = from.toLowerCase();
  if (lower.includes('shopee')) return 'shopee';
  if (lower.includes('tokopedia')) return 'tokopedia';
  if (lower.includes('traveloka')) return 'traveloka';
  if (lower.includes('bca')) {
    if (isValidBcaEmail(from, subject)) return 'bca';
    return 'unknown';
  }
  if (lower.includes('ayo')) return 'ayo';
  if (lower.includes('jago')) return 'jago';
  return 'unknown';
}

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const accessToken = (session as unknown as { accessToken: string }).accessToken;
  
  if (!accessToken) {
    return NextResponse.json({ error: 'No access token' }, { status: 400 });
  }

  try {
    const db = getDb();
    const settingsSnap = await db.collection('users').doc(userId).collection('settings').doc('preferences').get();
    const manualVerificationEnabled = settingsSnap.data()?.manualVerificationEnabled ?? false;

    const auth = createGmailClient(accessToken);
    const emails = await fetchTransactionEmails(auth);

    const parser = getParserV2();
    const categorizationPipeline = new CategorizationPipeline();

    const bySource: Record<string, number> = {};
    const transactions: (Partial<Transaction> & { userId: string; createdAt: string })[] = [];

    for (const email of emails) {
      const source = detectSource(email.from, email.subject);
      if (source === 'unknown') {
        if (email.from.toLowerCase().includes('ayo')) {
          console.log('AYO email not detected:', { from: email.from, subject: email.subject, bodySnippet: email.snippet?.substring(0, 200) });
        }
        continue;
      }
      bySource[source] = (bySource[source] || 0) + 1;
      try {
        const parsed = await parser.parse({
          id: email.id,
          from: email.from,
          subject: email.subject,
          body: email.snippet || '',
        });

        if (parsed.status === 'failed') {
          console.warn('Failed to parse email:', email.subject);
          continue;
        }

        const categorization = await categorizationPipeline.categorize({
          merchant_normalized: parsed.data.merchant_normalized,
          source,
          userId,
        });

        const dedupKey = generateDedupKey({
          source,
          source_reference_id: email.id,
          merchant_normalized: parsed.data.merchant_normalized || '',
          amount: parsed.data.amount || 0,
          date: parsed.data.date || new Date().toISOString(),
          subject_snippet: email.subject,
        });

        transactions.push({
          amount: parsed.data.amount as number,
          currency: parsed.data.currency,
          merchant: parsed.data.merchant as string,
          merchant_normalized: parsed.data.merchant_normalized ?? null,
          date: parsed.data.date as string,
          category: categorization.result.category,
          category_confidence: categorization.result.confidence,
          category_source: categorization.result.source,
          category_reason: categorization.result.reason,
          source,
          parser_id: parsed.plugin_id,
          parser_version: parsed.plugin_version,
          dedup_key: dedupKey,
          parsing_status: parsed.status,
          userId,
          createdAt: new Date().toISOString(),
          messageId: email.id,
        });
      } catch (e) {
        console.warn('Failed to parse email:', email.subject, e);
      }
    }

    const existingSnap = await db
      .collection('users')
      .doc(userId)
      .collection('transactions')
      .select('messageId')
      .get();

    const pendingSnap = await db
      .collection('users')
      .doc(userId)
      .collection('pendingTransactions')
      .select('messageId')
      .get();

    const existingMessageIds = new Set(
      [...existingSnap.docs, ...pendingSnap.docs]
        .map(doc => doc.data().messageId)
        .filter((id): id is string => typeof id === 'string')
    );

    const newTransactions: (typeof transactions[0])[] = [];
    let duplicates = 0;

    for (const tx of transactions) {
      if (existingMessageIds.has(tx.messageId!)) {
        duplicates++;
      } else {
        newTransactions.push(tx);
        existingMessageIds.add(tx.messageId!);
      }
    }

    const catsSnap = await db.collection('users').doc(userId).collection('categories').get();
    if (catsSnap.empty) {
      const defaultCats = ['food', 'shopping', 'transport', 'entertainment', 'other'];
      const batch = db.batch();
      defaultCats.forEach(name => {
        const docRef = db.collection('users').doc(userId).collection('categories').doc();
        batch.set(docRef, { name, createdAt: new Date() });
      });
      await batch.commit();
    }

const jagoTxs = newTransactions.filter(tx => tx.source === 'jago');
    const otherTxs = newTransactions.filter(tx => tx.source !== 'jago');

    const BATCH_SIZE = 500;
    const txIds: string[] = [];

    if (jagoTxs.length > 0) {
      const pendingRef = db.collection('users').doc(userId).collection('pendingTransactions');
      for (let i = 0; i < jagoTxs.length; i += BATCH_SIZE) {
        const chunk = jagoTxs.slice(i, i + BATCH_SIZE);
        const batch = db.batch();
        chunk.forEach((tx) => {
          const docRef = pendingRef.doc();
          txIds.push(docRef.id);
          batch.set(docRef, tx);
        });
        await batch.commit();
      }
    }

    if (otherTxs.length > 0) {
      if (manualVerificationEnabled) {
        const pendingRef = db.collection('users').doc(userId).collection('pendingTransactions');
        for (let i = 0; i < otherTxs.length; i += BATCH_SIZE) {
          const chunk = otherTxs.slice(i, i + BATCH_SIZE);
          const batch = db.batch();
          chunk.forEach((tx) => {
            const docRef = pendingRef.doc();
            txIds.push(docRef.id);
            batch.set(docRef, tx);
          });
          await batch.commit();
        }
      } else {
        const txRef = db.collection('users').doc(userId).collection('transactions');
        for (let i = 0; i < otherTxs.length; i += BATCH_SIZE) {
          const chunk = otherTxs.slice(i, i + BATCH_SIZE);
          const batch = db.batch();
          chunk.forEach((tx) => {
            const docRef = txRef.doc();
            txIds.push(docRef.id);
            batch.set(docRef, tx);
          });
          await batch.commit();
        }
      }
    }
    
    await db.collection('users').doc(userId).set({
      lastScanAt: new Date(),
    }, { merge: true });

    return NextResponse.json({
      scanned: emails.length,
      parsed: newTransactions.length,
      duplicates,
      bySource,
      emails: emails.map(e => ({
        id: e.id,
        subject: e.subject,
        from: e.from,
        date: e.date,
        snippet: e.snippet,
        source: detectSource(e.from, e.subject),
      })),
      transactions: newTransactions.map((t, i) => ({
        id: txIds[i],
        merchant: t.merchant,
        amount: t.amount,
        date: t.date,
        category: t.category,
        source: t.source,
      })),
    });
  } catch (error) {
    console.error('Scan error:', error);
    return NextResponse.json({ error: 'Scan failed' }, { status: 500 });
  }
}