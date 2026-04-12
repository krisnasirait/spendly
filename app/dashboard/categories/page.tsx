'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { CategoryBreakdown } from '@/components/dashboard/CategoryBreakdown';
import type { Transaction, Category } from '@/types';

export default function CategoriesPage() {
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

  const categories = (['food', 'shopping', 'transport', 'entertainment', 'other'] as Category[])
    .map((category) => ({
      category,
      amount: transactions
        .filter((tx) => tx.category === category)
        .reduce((sum, tx) => sum + tx.amount, 0),
    }))
    .filter((c) => c.amount > 0);

  return (
    <main className="max-w-md mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Categories</h1>
      {categories.length > 0 ? (
        <CategoryBreakdown categories={categories} />
      ) : (
        <p className="text-center text-gray-500 py-8">No data yet</p>
      )}
    </main>
  );
}