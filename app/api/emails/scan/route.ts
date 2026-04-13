import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/firestore';
import { createGmailClient, fetchTransactionEmails } from '@/lib/gmail';
import { parseEmail } from '@/lib/parsers';
import type { Transaction } from '@/types';

function isValidBcaEmail(from: string, subject: string): boolean {
  const lowerFrom = from.toLowerCase();
  const lowerSubject = subject.toLowerCase();
  const validSenders = ['bca@bca.co.id', 'kartukreditbca@klikbca.com'];
  const validSubjects = ['internet transaction journal', 'credit card transaction notification'];
  
  const isValidSender = validSenders.some(s => lowerFrom.includes(s));
  const isValidSubject = validSubjects.some(s => lowerSubject.includes(s));
  
  return isValidSender && isValidSubject;
}

function detectSource(from: string, subject: string): 'shopee' | 'tokopedia' | 'traveloka' | 'bca' | 'ayo' | 'unknown' {
  const lower = from.toLowerCase();
  if (lower.includes('shopee')) return 'shopee';
  if (lower.includes('tokopedia')) return 'tokopedia';
  if (lower.includes('traveloka')) return 'traveloka';
  if (lower.includes('bca')) {
    if (isValidBcaEmail(from, subject)) return 'bca';
    return 'unknown';
  }
  if (lower.includes('ayo')) return 'ayo';
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
    const auth = createGmailClient(accessToken);
    const emails = await fetchTransactionEmails(auth);

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
        const parsed = parseEmail({ subject: email.subject, body: email.snippet, from: email.from });
        if (!parsed && source === 'ayo') {
          console.log('AYO parse failed:', { subject: email.subject, body: email.snippet?.substring(0, 500) });
        }
        if (parsed) {
          transactions.push({
            ...parsed,
            source,
            userId,
            createdAt: new Date().toISOString(),
          });
        }
      } catch (e) {
        console.warn('Failed to parse email:', email.subject, e);
      }
    }

    const db = getDb();

    const existingSnap = await db
      .collection('users')
      .doc(userId)
      .collection('transactions')
      .select('merchant', 'amount', 'date')
      .get();

    const existingKeys = new Set(
      existingSnap.docs.map(doc => {
        const d = doc.data() as { merchant: string; amount: number; date: string | Date };
        const dateStr = typeof d.date === 'string' ? d.date.substring(0, 10) : '';
        return `${d.merchant}|${d.amount}|${dateStr}`;
      })
    );

    const newTransactions: (typeof transactions[0])[] = [];
    let duplicates = 0;

    for (const tx of transactions) {
      const dateStr = tx.date?.substring(0, 10) || '';
      const key = `${tx.merchant}|${tx.amount}|${dateStr}`;
      if (existingKeys.has(key)) {
        duplicates++;
      } else {
        newTransactions.push(tx);
        existingKeys.add(key);
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

    const txRef = db.collection('users').doc(userId).collection('transactions');
    
    const BATCH_SIZE = 500;
    const txIds: string[] = [];
    for (let i = 0; i < newTransactions.length; i += BATCH_SIZE) {
      const chunk = newTransactions.slice(i, i + BATCH_SIZE);
      const batch = db.batch();
      chunk.forEach((tx) => {
        const docRef = txRef.doc();
        txIds.push(docRef.id);
        batch.set(docRef, tx);
      });
      await batch.commit();
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
        categories: t.categories,
        source: t.source,
      })),
    });
  } catch (error) {
    console.error('Scan error:', error);
    return NextResponse.json({ error: 'Scan failed' }, { status: 500 });
  }
}