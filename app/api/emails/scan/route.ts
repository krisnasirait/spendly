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

function detectSource(from: string, subject: string): 'shopee' | 'tokopedia' | 'traveloka' | 'bca' | 'unknown' {
  const lower = from.toLowerCase();
  if (lower.includes('shopee')) return 'shopee';
  if (lower.includes('tokopedia')) return 'tokopedia';
  if (lower.includes('traveloka')) return 'traveloka';
  if (lower.includes('bca')) {
    if (isValidBcaEmail(from, subject)) return 'bca';
    return 'unknown';
  }
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
    const transactions: (Partial<Transaction> & { userId: string; createdAt: Date })[] = [];
    
    for (const email of emails) {
      const source = detectSource(email.from, email.subject);
      if (source === 'unknown') continue;
      bySource[source] = (bySource[source] || 0) + 1;
      try {
        const parsed = parseEmail({ subject: email.subject, body: email.snippet, from: email.from });
        if (parsed) {
          transactions.push({
            ...parsed,
            source,
            userId,
            createdAt: new Date(),
            emailId: email.id,
          });
        }
      } catch (e) {
        console.warn('Failed to parse email:', email.subject, e);
      }
    }

    const db = getDb();
    const txRef = db.collection('users').doc(userId).collection('transactions');
    
    const BATCH_SIZE = 500;
    for (let i = 0; i < transactions.length; i += BATCH_SIZE) {
      const chunk = transactions.slice(i, i + BATCH_SIZE);
      const batch = db.batch();
      chunk.forEach((tx) => {
        const docRef = txRef.doc();
        batch.set(docRef, tx);
      });
      await batch.commit();
    }

    await db.collection('users').doc(userId).set({
      lastScanAt: new Date(),
    }, { merge: true });

    return NextResponse.json({
      scanned: emails.length,
      parsed: transactions.length,
      bySource,
      emails: emails.map(e => ({
        id: e.id,
        subject: e.subject,
        from: e.from,
        date: e.date,
        snippet: e.snippet,
        source: detectSource(e.from, e.subject),
      })),
      transactions: transactions.map(t => ({
        merchant: t.merchant,
        amount: t.amount,
        date: t.date,
        category: t.category,
        source: t.source,
        emailId: t.emailId,
      })),
    });
  } catch (error) {
    console.error('Scan error:', error);
    return NextResponse.json({ error: 'Scan failed' }, { status: 500 });
  }
}