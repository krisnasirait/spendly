import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/firestore';

interface Transaction {
  id: string;
  merchant: string;
  amount: number;
  date: string;
  categories: string[];
  source: string;
}

interface RecurringTransaction {
  merchant: string;
  frequency: 'monthly' | 'weekly' | 'unknown';
  avgAmount: number;
  occurrences: number;
  lastCharge: string;
  nextExpected: string;
}

function calculateNextExpected(lastCharge: string, frequency: 'monthly' | 'weekly'): string {
  const last = new Date(lastCharge);
  if (frequency === 'monthly') {
    last.setMonth(last.getMonth() + 1);
  } else {
    last.setDate(last.getDate() + 7);
  }
  return last.toISOString();
}

function detectRecurringTransactions(transactions: Transaction[]): RecurringTransaction[] {
  const merchantTxs = new Map<string, Transaction[]>();

  transactions.forEach(tx => {
    if (!merchantTxs.has(tx.merchant)) merchantTxs.set(tx.merchant, []);
    merchantTxs.get(tx.merchant)!.push(tx);
  });

  const recurring: RecurringTransaction[] = [];

  merchantTxs.forEach((txs, merchant) => {
    if (txs.length < 3) return;

    const sorted = [...txs].sort((a, b) =>
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    const gaps: number[] = [];
    for (let i = 1; i < sorted.length; i++) {
      const gap = (new Date(sorted[i].date).getTime() - new Date(sorted[i - 1].date).getTime()) / (1000 * 60 * 60 * 24);
      gaps.push(gap);
    }
    const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;

    let frequency: 'monthly' | 'weekly' | 'unknown' = 'unknown';
    if (avgGap >= 25 && avgGap <= 35) frequency = 'monthly';
    else if (avgGap >= 5 && avgGap <= 9) frequency = 'weekly';

    if (frequency === 'unknown') return;

    const amounts = txs.map(t => t.amount);
    const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const isConsistent = amounts.every(a => Math.abs(a - avgAmount) / avgAmount < 0.1);

    if (!isConsistent) return;

    const lastCharge = sorted[sorted.length - 1].date;

    recurring.push({
      merchant,
      frequency,
      avgAmount: Math.round(avgAmount),
      occurrences: txs.length,
      lastCharge,
      nextExpected: calculateNextExpected(lastCharge, frequency),
    });
  });

  return recurring.sort((a, b) => b.avgAmount - a.avgAmount);
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const db = getDb();

  const txSnap = await db
    .collection('users').doc(userId)
    .collection('transactions')
    .orderBy('date', 'desc')
    .get();

  const transactions: Transaction[] = txSnap.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      merchant: data.merchant,
      amount: data.amount,
      date: typeof data.date === 'string' ? data.date : (data.date as { toDate?: () => Date }).toDate?.().toISOString() || new Date().toISOString(),
      categories: data.categories || [],
      source: data.source,
    };
  });

  const recurring = detectRecurringTransactions(transactions);
  const totalMonthlyRecurring = recurring
    .filter(r => r.frequency === 'monthly')
    .reduce((sum, r) => sum + r.avgAmount, 0);

  return NextResponse.json({
    recurring,
    totalMonthlyRecurring,
  });
}
