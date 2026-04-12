'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { HeroStat } from '@/components/dashboard/HeroStat';
import { InsightCard } from '@/components/ui/InsightCard';
import { HeroSkeleton, CardSkeleton } from '@/components/ui/LoadingSkeleton';
import type { Transaction, Insight } from '@/types';

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/signin');
  }, [status, router]);

  useEffect(() => {
    if (session?.user) {
      Promise.all([
        fetch('/api/transactions').then((r) => r.json()),
        fetch('/api/insights').then((r) => r.json()),
      ]).then(([txData, insightData]) => {
        setTransactions(txData.transactions || []);
        setInsights(insightData.insights || []);
        setLoading(false);
      });
    }
  }, [session]);

  if (status === 'loading' || loading) {
    return (
      <main className="w-full max-w-7xl mx-auto px-4 md:px-8 pt-8 pb-28">
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="flex-1">
            <div className="skeleton h-10 w-48 mb-6" /> {/* Header skeleton */}
            <HeroSkeleton />
          </div>
          <div className="w-full lg:w-[400px] xl:w-[450px]">
            <div className="skeleton h-6 w-32 mb-4" /> {/* Reality check label */}
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <CardSkeleton key={i} />)}
            </div>
          </div>
        </div>
      </main>
    );
  }

  const totalThisMonth = transactions
    .filter((tx) => {
      const now = new Date();
      return (
        tx.date.getMonth() === now.getMonth() &&
        tx.date.getFullYear() === now.getFullYear()
      );
    })
    .reduce((sum, tx) => sum + tx.amount, 0);

  const currentMonth = new Date().toLocaleDateString('id-ID', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <main className="w-full max-w-7xl mx-auto px-4 md:px-8 pt-8 pb-28 relative">
      {/* Background orb */}
      <div
        className="fixed top-0 left-1/2 -translate-x-1/2 pointer-events-none"
        style={{
          width: 'min(100vw, 800px)',
          height: 400,
          background: 'radial-gradient(ellipse, rgba(124,58,237,0.12) 0%, transparent 70%)',
          zIndex: 0,
        }}
      />

      <div className="relative z-10 flex flex-col lg:flex-row gap-8 lg:gap-12 w-full">
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center justify-between mb-6 animate-slide-down">
            <div>
              <p
                className="text-xs font-semibold uppercase tracking-widest"
                style={{ color: 'rgba(148,163,184,0.5)' }}
              >
                Spendly
              </p>
              <h1 className="text-xl md:text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                My Finances
              </h1>
            </div>
            {session?.user?.image && (
              <img
                src={session.user.image}
                alt={session.user.name ?? 'User'}
                className="w-10 h-10 md:w-12 md:h-12 rounded-full"
                style={{ outline: '2px solid rgba(139,92,246,0.4)' }}
              />
            )}
          </div>

          {/* Hero Stat */}
          <HeroStat
            amount={totalThisMonth}
            month={currentMonth}
            userName={session?.user?.name ?? undefined}
          />
        </div>

        {/* Insights Section */}
        <div className="w-full lg:w-[400px] xl:w-[450px]">
          <div className="mb-4 flex items-center gap-3">
            <div
              className="w-1 h-5 rounded-full"
              style={{ background: 'linear-gradient(180deg, #7c3aed, #ec4899)' }}
            />
            <h2 className="text-base md:text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
              Reality Check
            </h2>
          </div>

          {insights.length > 0 ? (
            insights.map((insight, i) => (
              <InsightCard key={insight.id} insight={insight} index={i} />
            ))
          ) : (
            <div
              className="rounded-2xl p-8 text-center animate-fade-in"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <div className="text-3xl mb-3">🔍</div>
              <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                No insights yet
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                Scan your emails to get started
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}