import type { Transaction } from '@/types';

export const CATEGORY_LABELS: Record<string, string> = {
  food: 'Food & Drinks',
  shopping: 'Shopping',
  transport: 'Transport',
  entertainment: 'Entertainment',
  other: 'Other',
};

export function calculateCategorySpend(
  transactions: Transaction[],
  category: string,
  startDate: Date,
  endDate: Date
): number {
  return transactions
    .filter(tx => {
      const txDate = new Date(tx.date);
      return tx.category === category && txDate >= startDate && txDate < endDate;
    })
    .reduce((sum, tx) => sum + tx.amount, 0);
}

export function getAverageMonthlySpend(
  transactions: Transaction[],
  category: string
): number {
  const now = new Date();
  const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
  
  const categoryTxs = transactions.filter(tx => {
    const txDate = new Date(tx.date);
    return tx.category === category && txDate >= threeMonthsAgo;
  });
  
  if (categoryTxs.length === 0) return 0;
  
  const byMonth: Record<string, number> = {};
  categoryTxs.forEach(tx => {
    const d = new Date(tx.date);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    byMonth[key] = (byMonth[key] || 0) + tx.amount;
  });
  
  const months = Object.keys(byMonth).length;
  const total = Object.values(byMonth).reduce((a, b) => a + b, 0);
  
  return months > 0 ? Math.round(total / months) : 0;
}

export function getMerchantAverage(
  transactions: Transaction[],
  merchant: string
): number {
  const merchantTxs = transactions.filter(tx => tx.merchant === merchant);
  if (merchantTxs.length === 0) return 0;
  const total = merchantTxs.reduce((sum, tx) => sum + tx.amount, 0);
  return total / merchantTxs.length;
}

export function getWeeklyTotal(transactions: Transaction[], weekStart: Date): number {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);
  
  return transactions
    .filter(tx => {
      const txDate = new Date(tx.date);
      return txDate >= weekStart && txDate < weekEnd;
    })
    .reduce((sum, tx) => sum + tx.amount, 0);
}

export function getBudgetProgressColor(spent: number, budget: number): string {
  const pct = (spent / budget) * 100;
  if (pct > 100) return 'var(--danger)';
  if (pct >= 75) return 'var(--warning)';
  return 'var(--success)';
}

export function getBudgetProgressBg(spent: number, budget: number): string {
  const pct = (spent / budget) * 100;
  if (pct > 100) return '#FEE2E2';
  if (pct >= 75) return '#FEF3C7';
  return '#DCFCE7';
}
