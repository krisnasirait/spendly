import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/firestore';
import type { Insight } from '@/types';

const INSIGHT_TEMPLATES = {
  spike: [
    'Lo udah habis {amount} buat jajan minggu ini 😭',
    'Dompet lo lagi nggak sehat',
  ],
  trend: [
    'Belanja lo naik {percent}% dibanding minggu lalu',
    'Hari ini lo hemat! ✨',
  ],
  category_overload: [
    '{percent}% of spending this month is {category} 🍔',
  ],
  pattern: [
    'Lo udah order Grab 15x bulan ini',
  ],
  encouragement: [
    'Hari ini lo hemat! ✨',
  ],
};

function generateInsights(transactions: any[]): Partial<Insight>[] {
  const insights: Partial<Insight>[] = [];
  
  const now = new Date();
  const thisWeek = transactions.filter((tx) => {
    const diff = now.getTime() - tx.date.getTime();
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
  
  const snapshot = await db
    .collection('users')
    .doc(userId)
    .collection('transactions')
    .orderBy('date', 'desc')
    .get();

  const transactions = snapshot.docs.map((doc) => ({
    id: doc.id,
    userId,
    ...(doc.data() as any),
  }));

  const insights = generateInsights(transactions);

  return NextResponse.json({ insights });
}