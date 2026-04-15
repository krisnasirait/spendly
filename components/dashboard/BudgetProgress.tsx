import { getBudgetProgressColor, getBudgetProgressBg, CATEGORY_LABELS } from '@/lib/budget';

const fmt = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

interface BudgetProgressProps {
  category: string;
  spent: number;
  budget: number;
  onEdit?: () => void;
}

const EditIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

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
      transition: 'border-color 0.15s ease',
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
                color: 'var(--text-muted)', padding: 4,
                display: 'flex', alignItems: 'center',
                borderRadius: 6,
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--accent)';
                e.currentTarget.style.background = 'var(--accent-light)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--text-muted)';
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <EditIcon />
            </button>
          )}
        </div>
      </div>
      <div style={{
        height: 10,
        background: 'var(--border)',
        borderRadius: 999,
        overflow: 'hidden',
      }}>
        <div style={{
          width: `${pct}%`,
          height: '100%',
          background: pct >= 90 
            ? 'linear-gradient(90deg, var(--danger), #F87171)'
            : pct >= 70 
            ? 'linear-gradient(90deg, var(--warning), #FBBF24)'
            : `linear-gradient(90deg, var(--accent-start), var(--accent-end))`,
          borderRadius: 999,
          transition: 'width 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
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
