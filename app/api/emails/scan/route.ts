import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/firestore';
import { createGmailClient, fetchTransactionEmails } from '@/lib/gmail';
import { parseEmail } from '@/lib/parsers';
import type { Transaction } from '@/types';

function detectSource(from: string): string {
  const lower = from.toLowerCase();
  if (lower.includes('shopee')) return 'shopee';
  if (lower.includes('tokopedia')) return 'tokopedia';
  if (lower.includes('traveloka')) return 'traveloka';
  if (lower.includes('bca')) return 'bca';
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

  const auth = createGmailClient(accessToken);
  const rawEmails = await fetchTransactionEmails(auth);

  const scanned = rawEmails.length;
  const bySource: Record<string, number> = {};
  const emails = rawEmails.map((email) => {
    const source = detectSource(email.from);
    bySource[source] = (bySource[source] || 0) + 1;
    return {
      id: email.id,
      subject: email.subject,
      from: email.from,
      date: email.date,
      snippet: email.snippet,
      source,
    };
  });

  const transactions: (Partial<Transaction> & { userId: string; createdAt: Date })[] = [];
  for (const email of emails) {
    const parsed = parseEmail({ subject: email.subject, body: email.snippet, from: email.from });
    if (parsed) {
      transactions.push({
        ...parsed,
        userId,
        createdAt: new Date(),
      });
    }
  }

  const parsed = transactions.length;

  const db = getDb();
  const batch = db.batch();
  const txRef = db.collection('users').doc(userId).collection('transactions');
  
  transactions.forEach((tx) => {
    const docRef = txRef.doc();
    batch.set(docRef, tx);
  });
  
  await batch.commit();

  await db.collection('users').doc(userId).set({
    lastScanAt: new Date(),
  }, { merge: true });

  return NextResponse.json({ scanned, parsed, bySource, emails, transactions });
}