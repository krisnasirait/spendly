import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/firestore';
import type { Insight, Transaction } from '@/types';

function generateInsights(transactions: Transaction[]): Partial<Insight>[] {
  const insights: Partial<Insight>[] = [];
  
  const now = new Date();
  const thisWeek = transactions.filter((tx) => {
    const diff = now.getTime() - new Date(tx.date).getTime();
    return diff < 7 * 24 * 60 * 60 * 1000;
  });
  
  const totalThisWeek = thisWeek.reduce((sum, tx) => sum + tx.amount, 0);
  if (totalThisWeek > 500000) {
    insights.push({
      type: 'spike',
      text: `Lo udah habis Rp${(totalThisWeek / 1000).toFixed(0)}rb buat jajan minggu ini 😭`,
      severity: 'high',
      createdAt: new Date(),
      expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
    });
  }
  
  return insights;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  
  const db = getDb();
  const snapshot = await db
    .collection('users')
    .doc(userId)
    .collection('transactions')
    .orderBy('date', 'desc')
    .get();

  const transactions: Transaction[] = snapshot.docs.map((doc) => {
    const data = doc.data() as Omit<Transaction, 'id' | 'userId'>;
    return {
      id: doc.id,
      userId,
      ...data,
    };
  });

  const insights = generateInsights(transactions);

  return NextResponse.json({ insights });
}
