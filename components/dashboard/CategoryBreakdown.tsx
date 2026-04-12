import { CategoryPie } from '@/components/charts/CategoryPie';
import type { Category } from '@/types';

interface CategoryBreakdownProps {
  categories: { category: Category; amount: number }[];
}

const categoryConfig: Record<Category, { emoji: string; color: string; bg: string; label: string }> = {
  food:          { emoji: '🍔', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)',  label: 'Food & Drinks' },
  shopping:      { emoji: '🛍️', color: '#ec4899', bg: 'rgba(236,72,153,0.15)',  label: 'Shopping' },
  transport:     { emoji: '🚗', color: '#38bdf8', bg: 'rgba(56,189,248,0.15)',  label: 'Transport' },
  entertainment: { emoji: '🎮', color: '#a3e635', bg: 'rgba(163,230,53,0.15)', label: 'Entertainment' },
  other:         { emoji: '📦', color: '#94a3b8', bg: 'rgba(148,163,184,0.12)', label: 'Other' },
};

export function CategoryBreakdown({ categories }: CategoryBreakdownProps) {
  const total = categories.reduce((sum, c) => sum + c.amount, 0);

  return (
    <div className="flex flex-col lg:flex-row gap-6 lg:gap-12 animate-fade-in w-full">
      {/* Pie Chart */}
      <div
        className="rounded-2xl p-4 w-full lg:w-1/2 flex items-center justify-center min-h-[300px]"
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <CategoryPie data={categories} />
      </div>

      {/* Category Rows */}
      <div className="space-y-3 w-full lg:w-1/2">
        {categories.map(({ category, amount }, index) => {
          const cfg = categoryConfig[category];
          const pct = total > 0 ? (amount / total) * 100 : 0;
          const formatted = new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
          }).format(amount);

          return (
            <div
              key={category}
              className={`rounded-2xl p-4 animate-slide-up delay-${index * 100} transition-all duration-200 group hover:-translate-y-0.5`}
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: `1px solid rgba(255,255,255,0.07)`,
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  {/* Icon bubble */}
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                    style={{ background: cfg.bg }}
                  >
                    {cfg.emoji}
                  </div>
                  <div>
                    <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                      {cfg.label}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {pct.toFixed(1)}% of total
                    </p>
                  </div>
                </div>
                <span className="text-sm font-bold" style={{ color: cfg.color }}>
                  {formatted}
                </span>
              </div>

              {/* Progress bar */}
              <div
                className="h-1.5 rounded-full overflow-hidden"
                style={{ background: 'rgba(255,255,255,0.06)' }}
              >
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${pct}%`,
                    background: `linear-gradient(90deg, ${cfg.color}99, ${cfg.color})`,
                    boxShadow: `0 0 6px ${cfg.color}66`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
