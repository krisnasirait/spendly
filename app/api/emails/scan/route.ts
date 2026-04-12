import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/firestore';
import { createGmailClient, fetchTransactionEmails } from '@/lib/gmail';
import { parseEmail } from '@/lib/parsers';
import type { Transaction } from '@/types';

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
  const emails = await fetchTransactionEmails(auth);

  const transactions: (Partial<Transaction> & { userId: string; createdAt: Date })[] = [];
  for (const email of emails) {
    const parsed = parseEmail(email);
    if (parsed) {
      transactions.push({
        ...parsed,
        userId,
        createdAt: new Date(),
      });
    }
  }

  const batch = db.batch();
  const txRef = db.collection('users').doc(userId).collection('transactions');
  
  transactions.forEach((tx) => {
    const docRef = txRef.doc();
    batch.set(docRef, tx);
  });
  
  await batch.commit();

  await db.collection('users').doc(userId).update({
    lastScanAt: new Date(),
  });

  return NextResponse.json({ scanned: transactions.length });
}