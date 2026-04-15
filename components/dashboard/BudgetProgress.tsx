import { getBudgetProgressColor, getBudgetProgressBg, CATEGORY_LABELS } from '@/lib/budget';

const fmt = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

interface BudgetProgressProps {
  category: string;
  spent: number;
  budget: number;
  onEdit?: () => void;
}

export function BudgetProgress({ category, spent, budget, onEdit }: BudgetProgressProps) {
  const pct = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
  const color = getBudgetProgressColor(spent, budget);
  const bgColor = getBudgetProgressBg(spent, budget);
  const isOver = spent > budget;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
      padding: '12px 16px',
      background: bgColor,
      borderRadius: 10,
      border: `1px solid ${isOver ? 'var(--danger)' : 'transparent'}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
          {CATEGORY_LABELS[category] || category}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            {fmt(spent)} / {fmt(budget)}
          </span>
          {onEdit && (
            <button
              onClick={onEdit}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--text-muted)', fontSize: 12, padding: 2,
              }}
            >
              ✎
            </button>
          )}
        </div>
      </div>
      <div style={{
        height: 8,
        background: 'var(--border)',
        borderRadius: 999,
        overflow: 'hidden',
      }}>
        <div style={{
          width: `${pct}%`,
          height: '100%',
          background: color,
          borderRadius: 999,
          transition: 'width 0.3s ease',
        }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <span style={{ fontSize: 11, fontWeight: 600, color }}>
          {isOver ? `Over by ${fmt(spent - budget)}` : `${pct.toFixed(0)}% used`}
        </span>
      </div>
    </div>
  );
}
