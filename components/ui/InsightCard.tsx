import type { Insight } from '@/types';

interface InsightCardProps {
  insight: Insight;
  index?: number;
}

const typeConfig: Record<
  Insight['type'],
  { emoji: string; label: string }
> = {
  spike:             { emoji: '🚨', label: 'Spending Spike' },
  trend:             { emoji: '📈', label: 'Trend' },
  category_overload: { emoji: '🍔', label: 'Category Alert' },
  pattern:           { emoji: '🔍', label: 'Pattern' },
  encouragement:     { emoji: '✨', label: 'Good News' },
};

const severityConfig: Record<
  Insight['severity'],
  { color: string; bg: string; label: string }
> = {
  high:   { color: '#f43f5e', bg: 'rgba(244,63,94,0.12)',  label: 'High' },
  medium: { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', label: 'Medium' },
  low:    { color: '#38bdf8', bg: 'rgba(56,189,248,0.12)', label: 'Low' },
};

export function InsightCard({ insight, index = 0 }: InsightCardProps) {
  const type = typeConfig[insight.type];
  const sev = severityConfig[insight.severity];

  return (
    <div
      className={`animate-slide-up delay-${(index % 5) * 100} rounded-2xl mb-3 overflow-hidden transition-all duration-200 hover:-translate-y-0.5`}
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: `1px solid ${sev.color}33`,
        boxShadow: `0 4px 24px ${sev.color}18`,
      }}
    >
      <div className="flex">
        {/* Left accent bar */}
        <div
          className="w-1 flex-shrink-0 rounded-l-2xl"
          style={{ background: `linear-gradient(180deg, ${sev.color}, ${sev.color}44)` }}
        />

        <div className="flex items-start gap-3 p-4 flex-1">
          {/* Icon bubble */}
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-lg"
            style={{ background: sev.bg }}
          >
            {type.emoji}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: sev.color }}>
                {type.label}
              </span>
              <span
                className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                style={{ background: sev.bg, color: sev.color }}
              >
                {sev.label}
              </span>
            </div>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>
              {insight.text}
            </p>
            <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
              {insight.createdAt.toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}