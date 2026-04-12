'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { TransactionList } from '@/components/dashboard/TransactionList';
import { TransactionSkeleton } from '@/components/ui/LoadingSkeleton';
import type { Transaction } from '@/types';

export default function HistoryPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/signin');
  }, [status, router]);

  useEffect(() => {
    if (session?.user) {
      fetch('/api/transactions')
        .then((res) => res.json())
        .then((data) => {
          setTransactions(data.transactions || []);
          setLoading(false);
        });
    }
  }, [session]);

  return (
    <main className="w-full max-w-7xl mx-auto px-4 md:px-8 pt-8 pb-28 relative">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 animate-slide-down">
        <div
          className="w-1 h-7 rounded-full"
          style={{ background: 'linear-gradient(180deg, #7c3aed, #ec4899)' }}
        />
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest mb-0.5" style={{ color: 'rgba(148,163,184,0.5)' }}>
            All Transactions
          </p>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
            History
          </h1>
        </div>
      </div>

      {status === 'loading' || loading ? (
        <div className="space-y-6">
          <TransactionSkeleton />
          <TransactionSkeleton />
        </div>
      ) : transactions.length > 0 ? (
        <TransactionList transactions={transactions} />
      ) : (
        <div
          className="rounded-2xl p-12 text-center animate-fade-in"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <div className="text-4xl mb-4">📜</div>
          <p className="font-semibold" style={{ color: 'var(--text-secondary)' }}>
            No transactions yet
          </p>
          <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
            Your spending history will appear here
          </p>
        </div>
      )}
    </main>
  );
}