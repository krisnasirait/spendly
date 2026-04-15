import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/firestore';
import type { Insight, Transaction, Budget } from '@/types';

const fmt = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

function generateInsights(transactions: Transaction[], budgets: Budget[]): Partial<Insight>[] {
  const insights: Partial<Insight>[] = [];
  const now = new Date();
  
  const thisWeekStart = new Date(now);
  thisWeekStart.setDate(now.getDate() - now.getDay());
  thisWeekStart.setHours(0, 0, 0, 0);
  
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const thisMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  
  const last4WeeksStart = new Date(thisWeekStart);
  last4WeeksStart.setDate(last4WeeksStart.getDate() - 28);

  // 1. Budget Alert
  const budgetMap = new Map(budgets.map(b => [b.category, b]));
  const monthTxs = transactions.filter(tx => {
    const txDate = new Date(tx.date);
    return txDate >= thisMonthStart && txDate <= thisMonthEnd;
  });

  for (const [category, budget] of budgetMap) {
    if (budget.amount <= 0) continue;
    
    const spent = monthTxs
      .filter(tx => tx.categories.includes(category))
      .reduce((sum, tx) => sum + tx.amount, 0);
    
    const pct = (spent / budget.amount) * 100;
    
    if (spent > budget.amount) {
      insights.push({
        type: 'budget_alert',
        text: `⚠️ ${category} budget exceeded by ${fmt(spent - budget.amount)}`,
        severity: pct > 150 ? 'high' : 'medium',
        createdAt: new Date(),
        expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
      });
    } else if (pct >= 90) {
      insights.push({
        type: 'budget_alert',
        text: `⚠️ ${category} at ${pct.toFixed(0)}% of budget`,
        severity: 'medium',
        createdAt: new Date(),
        expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
      });
    }
  }

  // 2. Unusual Transaction
  const merchantAvgs = new Map<string, number[]>();
  transactions.forEach(tx => {
    if (!merchantAvgs.has(tx.merchant)) merchantAvgs.set(tx.merchant, []);
    merchantAvgs.get(tx.merchant)!.push(tx.amount);
  });
  
  const merchantAvgMap = new Map<string, number>();
  merchantAvgs.forEach((amounts, merchant) => {
    if (amounts.length >= 3) {
      merchantAvgMap.set(merchant, amounts.reduce((a, b) => a + b, 0) / amounts.length);
    }
  });

  monthTxs.forEach(tx => {
    const avg = merchantAvgMap.get(tx.merchant);
    if (avg && tx.amount > avg * 2) {
      insights.push({
        type: 'unusual_tx',
        text: `📈 ${tx.merchant} charge ${fmt(tx.amount)} (${(tx.amount / avg).toFixed(1)}x your usual)`,
        severity: 'high',
        createdAt: new Date(),
        expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
      });
    }
  });

  // 3. Spike Alert
  const thisWeekTotal = transactions
    .filter(tx => {
      const txDate = new Date(tx.date);
      return txDate >= thisWeekStart && txDate <= now;
    })
    .reduce((sum, tx) => sum + tx.amount, 0);

  const avgWeekly = transactions
    .filter(tx => {
      const txDate = new Date(tx.date);
      return txDate >= last4WeeksStart && txDate < thisWeekStart;
    })
    .reduce((sum, tx) => sum + tx.amount, 0) / 4;

  if (avgWeekly > 0 && thisWeekTotal > avgWeekly * 1.5) {
    insights.push({
      type: 'spike',
      text: `📈 Spending spike: ${fmt(thisWeekTotal)} this week vs ${fmt(avgWeekly)} avg`,
      severity: 'high',
      createdAt: new Date(),
      expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
    });
  }

  // 4. Encouragement
  const dayOfMonth = now.getDate();
  if (dayOfMonth >= 10 && dayOfMonth <= 20) {
    for (const [category, budget] of budgetMap) {
      if (budget.amount <= 0) continue;
      
      const spent = monthTxs
        .filter(tx => tx.categories.includes(category))
        .reduce((sum, tx) => sum + tx.amount, 0);
      
      const pct = (spent / budget.amount) * 100;
      
      if (pct < 60) {
        insights.push({
          type: 'encouragement',
          text: `🎉 ${category} only ${pct.toFixed(0)}% used - saving ${fmt(budget.amount - spent)}!`,
          severity: 'low',
          createdAt: new Date(),
          expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
        });
      }
    }
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

  const [txSnap, budgetSnap] = await Promise.all([
    db.collection('users').doc(userId).collection('transactions').orderBy('date', 'desc').get(),
    db.collection('users').doc(userId).collection('budgets').get(),
  ]);

  const transactions: Transaction[] = txSnap.docs.map((doc) => {
    const data = doc.data() as Omit<Transaction, 'id' | 'userId'>;
    return { id: doc.id, userId, ...data };
  });

  const budgets: Budget[] = budgetSnap.docs.map(doc => ({
    category: doc.id,
    amount: doc.data().amount || 0,
    period: 'monthly' as const,
    suggestedAmount: doc.data().suggestedAmount,
    isManual: doc.data().isManual || false,
  }));

  const insights = generateInsights(transactions, budgets);

  return NextResponse.json({ insights });
}
