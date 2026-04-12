import type { Transaction } from '@/types';

interface TransactionListProps {
  transactions: Transaction[];
}

const sourceConfig: Record<string, { emoji: string; color: string; bg: string; label: string }> = {
  shopee:    { emoji: '🛒', color: '#f97316', bg: 'rgba(249,115,22,0.15)',  label: 'Shopee' },
  tokopedia: { emoji: '🏪', color: '#22c55e', bg: 'rgba(34,197,94,0.15)',   label: 'Tokopedia' },
  traveloka: { emoji: '✈️', color: '#38bdf8', bg: 'rgba(56,189,248,0.15)', label: 'Traveloka' },
  bca:       { emoji: '🏦', color: '#818cf8', bg: 'rgba(129,140,248,0.15)', label: 'BCA' },
};

const defaultSource = { emoji: '📦', color: '#94a3b8', bg: 'rgba(148,163,184,0.12)', label: 'Other' };

const categoryColors: Record<string, string> = {
  food:          '#f59e0b',
  shopping:      '#ec4899',
  transport:     '#38bdf8',
  entertainment: '#a3e635',
  other:         '#94a3b8',
};

function formatDate(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return 'This Week';
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long' });
}

export function TransactionList({ transactions }: TransactionListProps) {
  const grouped = transactions.reduce((acc, tx) => {
    const key = formatDate(tx.date);
    if (!acc[key]) acc[key] = [];
    acc[key].push(tx);
    return acc;
  }, {} as Record<string, Transaction[]>);

  return (
    <div className="space-y-6 animate-fade-in">
      {Object.entries(grouped).map(([label, txs]) => (
        <div key={label}>
          {/* Date group label */}
          <div className="flex items-center gap-3 mb-3">
            <span
              className="text-xs font-bold uppercase tracking-widest"
              style={{ color: 'rgba(148,163,184,0.5)' }}
            >
              {label}
            </span>
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
          </div>

          <div className="space-y-2">
            {txs.map((tx, i) => {
              const src = sourceConfig[tx.source] ?? defaultSource;
              const catColor = categoryColors[tx.category] ?? '#94a3b8';

              const formatted = new Intl.NumberFormat('id-ID', {
                style: 'currency',
                currency: 'IDR',
                minimumFractionDigits: 0,
              }).format(tx.amount);

              return (
                <div
                  key={tx.id}
                  className={`rounded-2xl p-4 flex items-center gap-3 animate-slide-up transition-all duration-200 hover:-translate-y-0.5 group`}
                  style={{
                    animationDelay: `${i * 60}ms`,
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.07)',
                    cursor: 'default',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLDivElement).style.borderColor = `${src.color}44`;
                    (e.currentTarget as HTMLDivElement).style.boxShadow = `0 4px 20px ${src.color}18`;
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.07)';
                    (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
                  }}
                >
                  {/* Source icon bubble */}
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                    style={{ background: src.bg }}
                  >
                    {src.emoji}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-sm font-semibold truncate"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {tx.merchant}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span
                        className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                        style={{
                          background: `${catColor}22`,
                          color: catColor,
                        }}
                      >
                        {tx.category}
                      </span>
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {tx.date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                      </span>
                    </div>
                  </div>

                  {/* Amount */}
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                      {formatted}
                    </p>
                    <p className="text-[10px] mt-0.5" style={{ color: src.color }}>
                      {src.label}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
