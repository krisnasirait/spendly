import { Card } from '@/components/ui/Card';
import type { Transaction } from '@/types';

interface TransactionListProps {
  transactions: Transaction[];
}

const emojiMap: Record<string, string> = {
  shopee: '🛒',
  tokopedia: '🏪',
  traveloka: '✈️',
  bca: '🏦',
};

function formatDate(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return 'This Week';
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}

export function TransactionList({ transactions }: TransactionListProps) {
  const grouped = transactions.reduce((acc, tx) => {
    const key = formatDate(tx.date);
    if (!acc[key]) acc[key] = [];
    acc[key].push(tx);
    return acc;
  }, {} as Record<string, Transaction[]>);

  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([label, txs]) => (
        <div key={label}>
          <h3 className="text-sm font-semibold text-gray-400 uppercase mb-3">{label}</h3>
          <div className="space-y-2">
            {txs.map((tx) => {
              const formatted = new Intl.NumberFormat('id-ID', {
                style: 'currency',
                currency: 'IDR',
                minimumFractionDigits: 0,
              }).format(tx.amount);
              
              return (
                <Card key={tx.id} className="flex items-center justify-between py-4">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{emojiMap[tx.source] || '📦'}</span>
                    <div>
                      <p className="font-medium text-gray-900">{tx.merchant}</p>
                      <p className="text-sm text-gray-400">{tx.date.toLocaleDateString('id-ID')}</p>
                    </div>
                  </div>
                  <span className="font-semibold text-gray-900">{formatted}</span>
                </Card>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
