'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { HeroStat } from '@/components/dashboard/HeroStat';
import { InsightCard } from '@/components/ui/InsightCard';
import { Card } from '@/components/ui/Card';
import type { Transaction, Insight } from '@/types';

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/signin');
  }, [status, router]);

  useEffect(() => {
    if (session?.user) {
      fetch('/api/transactions')
        .then((res) => res.json())
        .then((data) => setTransactions(data.transactions || []));
      fetch('/api/insights')
        .then((res) => res.json())
        .then((data) => setInsights(data.insights || []));
    }
  }, [session]);

  if (status === 'loading') return <div>Loading...</div>;

  const totalThisMonth = transactions
    .filter((tx) => {
      const now = new Date();
      return tx.date.getMonth() === now.getMonth() && tx.date.getFullYear() === now.getFullYear();
    })
    .reduce((sum, tx) => sum + tx.amount, 0);

  const currentMonth = new Date().toLocaleDateString('id-ID', { month: 'long' });

  return (
    <main className="max-w-md mx-auto px-4 py-8">
      <HeroStat amount={totalThisMonth} month={currentMonth} />
      
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Reality Check</h2>
      {insights.length > 0 ? (
        insights.map((insight) => <InsightCard key={insight.id} insight={insight} />)
      ) : (
        <Card className="text-center py-8">
          <p className="text-gray-500">Belum ada insight. Scan email dulu ya!</p>
        </Card>
      )}
    </main>
  );
}