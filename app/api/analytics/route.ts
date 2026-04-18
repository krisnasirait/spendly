import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/firestore';

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

  interface Transaction {
    id: string;
    merchant: string;
    amount: number;
    date: string;
    categories: string[];
    source: string;
  }

  const transactions: Transaction[] = txSnap.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      merchant: data.merchant,
      amount: data.amount,
      date: data.date instanceof Date ? data.date.toISOString() : String(data.date),
      categories: data.categories || [],
      source: data.source,
    };
  });

  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

  // monthlyTrend: last 6 months
  const monthlyTrend: Array<{ month: string; spend: number; income: number; txCount: number }> = [];
  for (let i = 5; i >= 0; i--) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
    const monthStr = monthDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

    const monthTxs = transactions.filter(tx => {
      const txDate = new Date(tx.date);
      return txDate >= monthDate && txDate <= monthEnd;
    });

    const spend = monthTxs.reduce((sum, tx) => sum + tx.amount, 0);
    monthlyTrend.push({ month: monthStr, spend, income: 0, txCount: monthTxs.length });
  }

  // thisMonth vs lastMonth
  const thisMonthTxs = transactions.filter(tx => {
    const txDate = new Date(tx.date);
    return txDate >= thisMonthStart;
  });
  const lastMonthTxs = transactions.filter(tx => {
    const txDate = new Date(tx.date);
    return txDate >= lastMonthStart && txDate <= lastMonthEnd;
  });

  const thisMonthTotal = thisMonthTxs.reduce((sum, tx) => sum + tx.amount, 0);
  const lastMonthTotal = lastMonthTxs.reduce((sum, tx) => sum + tx.amount, 0);
  const vsLastMonth = lastMonthTotal > 0 ? ((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100 : 0;
  const trend: 'up' | 'down' | 'same' = vsLastMonth > 2 ? 'up' : vsLastMonth < -2 ? 'down' : 'same';

  // topMerchants
  const merchantMap = new Map<string, number>();
  thisMonthTxs.forEach(tx => {
    merchantMap.set(tx.merchant, (merchantMap.get(tx.merchant) || 0) + tx.amount);
  });
  const lastMonthMerchantMap = new Map<string, number>();
  lastMonthTxs.forEach(tx => {
    lastMonthMerchantMap.set(tx.merchant, (lastMonthMerchantMap.get(tx.merchant) || 0) + tx.amount);
  });

  const topMerchants = Array.from(merchantMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, currentAmount]) => {
      const lastMonthAmount = lastMonthMerchantMap.get(name) || 0;
      const deltaPercent = lastMonthAmount > 0 ? ((currentAmount - lastMonthAmount) / lastMonthAmount) * 100 : 0;
      return { name, currentAmount, lastMonthAmount, deltaPercent };
    });

  // velocity
  const dayOfMonth = now.getDate();
  const currentPace = dayOfMonth > 0 ? thisMonthTotal / dayOfMonth : 0;
  const lastMonthDays = lastMonthEnd.getDate();
  const lastMonthPace = lastMonthTotal / lastMonthDays;
  const velocityDelta = lastMonthPace > 0 ? ((currentPace - lastMonthPace) / lastMonthPace) * 100 : 0;

  return NextResponse.json({
    monthlyTrend,
    topMerchants,
    velocity: {
      currentPace,
      lastMonthPace,
      deltaPercent: velocityDelta,
    },
    thisMonth: {
      total: thisMonthTotal,
      vsLastMonth,
      trend,
    },
  });
}
