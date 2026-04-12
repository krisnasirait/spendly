'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { TransactionList } from '@/components/dashboard/TransactionList';
import type { Transaction } from '@/types';

export default function HistoryPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/signin');
  }, [status, router]);

  useEffect(() => {
    if (session?.user) {
      fetch('/api/transactions')
        .then((res) => res.json())
        .then((data) => setTransactions(data.transactions || []));
    }
  }, [session]);

  if (status === 'loading') return <div>Loading...</div>;

  return (
    <main className="max-w-md mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">History</h1>
      {transactions.length > 0 ? (
        <TransactionList transactions={transactions} />
      ) : (
        <p className="text-center text-gray-500 py-8">No transactions yet</p>
      )}
    </main>
  );
}