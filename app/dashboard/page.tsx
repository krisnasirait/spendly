'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback, useMemo } from 'react';
import type { Transaction, Insight } from '@/types';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import EditTransactionPanel from '@/components/EditTransactionPanel';

/* ─── helpers ───────────────────────────────────────────────── */
const fmt = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

const fmtShort = (n: number) =>
  n >= 1_000_000
    ? `Rp ${(n / 1_000_000).toFixed(1)}jt`
    : n >= 1_000
    ? `Rp ${(n / 1_000).toFixed(0)}rb`
    : `Rp ${n}`;

const categoryLabel: Record<string, string> = {
  food: 'Food & Drinks', shopping: 'Shopping',
  transport: 'Transport', entertainment: 'Entertainment', other: 'Other',
};

const categoryColors: Record<string, string> = {
  food: '#7C6CF8', shopping: '#A78BFA', transport: '#C4B5FD',
  entertainment: '#DDD6FE', other: '#EDE9FE',
};

const sourceBadge: Record<string, { label: string; color: string; bg: string }> = {
  shopee:    { label: 'Shopee',    color: '#EE4D2D', bg: '#FFF0EE' },
  tokopedia: { label: 'Tokopedia', color: '#03AC0E', bg: '#F0FFF1' },
  traveloka: { label: 'Traveloka', color: '#0064D2', bg: '#EBF4FF' },
  bca:       { label: 'BCA',       color: '#005BAC', bg: '#EBF2FF' },
  ayo:       { label: 'AYO',       color: '#FF6B00', bg: '#FFF4EE' },
};

/* ─── icon primitives ─────────────────────────────────────────── */
const Ico = ({ d, size = 16, stroke = 'currentColor', strokeWidth = 1.8 }: {
  d: string; size?: number; stroke?: string; strokeWidth?: number;
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

const ArrowUp    = () => <Ico d="M7 17L17 7M7 7h10v10" size={14} />;
const ArrowUpTrend = () => <Ico d="M23 6l-9.5 9.5-5-5L1 18" size={12} stroke="var(--success)" />;
const ArrowDownTrend = () => <Ico d="M23 18l-9.5-9.5-5 5L1 6" size={12} stroke="var(--danger)" />;
const CalendarIco = () => <Ico d="M8 2v3M16 2v3M3 8h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" size={15} />;
const ScanIco = () => <Ico d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" size={15} stroke="#fff" />;

/* ─── sub-components ─────────────────────────────────────────── */

function StatCard({ label, value, change, isNeg }: {
  label: string; value: string; change?: number; isNeg?: boolean;
}) {
  const positive = !isNeg && (change ?? 0) >= 0;
  return (
    <div className="card fade-up" style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>{label}</span>
        <button style={{
          width: 30, height: 30, borderRadius: '50%', border: '1.5px solid var(--border-subtle)',
          background: 'transparent', cursor: 'pointer', display: 'flex',
          alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)',
        }}>
          <ArrowUp />
        </button>
      </div>
      <div>
        <p style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.8px', color: 'var(--text-primary)', lineHeight: 1 }}>
          {value}
        </p>
      </div>
      {change !== undefined && (
        <div className={`badge ${positive ? 'badge-success' : 'badge-danger'}`} style={{ width: 'fit-content' }}>
          {positive ? <ArrowUpTrend /> : <ArrowDownTrend />}
          {Math.abs(change).toFixed(1)}% vs last month
        </div>
      )}
    </div>
  );
}

function InsightCard({ insight }: { insight: Insight }) {
  const severityColor = {
    high: 'var(--danger)',
    medium: 'var(--warning)',
    low: 'var(--success)',
  }[insight.severity];

  const typeEmoji = {
    spike: '📈', trend: '📊', category_overload: '⚠️',
    pattern: '🔁', encouragement: '🎉',
  }[insight.type];

  return (
    <div style={{
      padding: '14px 16px', borderRadius: 12,
      background: 'var(--bg-page)',
      border: '1px solid var(--border)',
      display: 'flex', alignItems: 'flex-start', gap: 10,
    }}>
      <span style={{ fontSize: 18, flexShrink: 0 }}>{typeEmoji}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.5 }}>{insight.text}</p>
        <span style={{ fontSize: 11, color: severityColor, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {insight.severity}
        </span>
      </div>
    </div>
  );
}

/* ─── Skeleton ─── */
function SkeletonCards() {
  return (
    <div style={{ display: 'flex', gap: 16 }}>
      {[0,1,2,3].map(i => (
        <div key={i} className="card" style={{ flex: 1, height: 120 }}>
          <div className="skeleton" style={{ height: 14, width: '60%', marginBottom: 12 }} />
          <div className="skeleton" style={{ height: 28, width: '80%', marginBottom: 16 }} />
          <div className="skeleton" style={{ height: 22, width: '45%', borderRadius: 999 }} />
        </div>
      ))}
    </div>
  );
}

/* ─── custom tooltip for bar chart ─── */
function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--bg-surface)', border: '1px solid var(--border)',
      borderRadius: 12, padding: '10px 14px', boxShadow: 'var(--shadow-hover)',
    }}>
      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
          {p.name}: {fmtShort(p.value)}
        </p>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   PAGE
══════════════════════════════════════════════════════════════ */
export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  type Period = 'today' | 'week' | 'month' | 'all';
  const [period, setPeriod] = useState<Period>('month');
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [txData, insightData] = await Promise.all([
      fetch('/api/transactions').then((r) => r.json()),
      fetch('/api/insights').then((r) => r.json()),
    ]);
    setTransactions(txData.transactions || []);
    setInsights(insightData.insights || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/signin');
  }, [status, router]);

  useEffect(() => {
    if (session?.user) loadData();
  }, [session, loadData]);

  async function handleScan() {
    setScanning(true);
    await fetch('/api/emails/scan', { method: 'POST' });
    await loadData();
    setScanning(false);
  }

  function handleSave(updated: Transaction) {
    setTransactions(prev => prev.map(t => t.id === updated.id ? updated : t));
  }

  /* ── derived stats ── */
  const totalSpend = useMemo(() => filtered.reduce((s, t) => s + t.amount, 0), [filtered]);

  const byCategory = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach((t) => {
      const cats = t.categories || [t.category];
      cats.forEach(cat => { map[cat] = (map[cat] ?? 0) + t.amount; });
    });
    return Object.entries(map).map(([cat, total]) => ({ cat, total }));
  }, [filtered]);

  const byMonth = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach((t) => {
      const d = new Date(t.date);
      const key = d.toLocaleString('default', { month: 'short' });
      map[key] = (map[key] ?? 0) + t.amount;
    });
    return Object.entries(map).map(([month, spend]) => ({ month, spend, income: Math.round(spend * 1.45) }));
  }, [filtered]);

  const filtered = useMemo(() => {
    const now = new Date();
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    return transactions.filter(t => {
      const txDate = new Date(t.date);
      txDate.setUTCHours(0, 0, 0, 0);

      switch (period) {
        case 'today':
          return txDate >= today;
        case 'week': {
          const dayOfWeek = now.getUTCDay();
          const thisWeekStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
          thisWeekStart.setUTCDate(thisWeekStart.getUTCDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
          return txDate >= thisWeekStart;
        }
        case 'month': {
          const firstOfMonthUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
          return txDate >= firstOfMonthUtc;
        }
        case 'all':
        default:
          return true;
      }
    });
  }, [transactions, period]);

  const previousPeriodData = useMemo(() => {
    const now = new Date();

    let start: Date, end: Date;

    switch (period) {
      case 'today': {
        const todayUtc = new Date();
        todayUtc.setUTCHours(0, 0, 0, 0);
        const yesterdayUtc = new Date(todayUtc);
        yesterdayUtc.setUTCDate(yesterdayUtc.getUTCDate() - 1);
        start = yesterdayUtc;
        end = todayUtc;
        break;
      }
      case 'week': {
        const dayOfWeek = now.getUTCDay();
        const thisWeekStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
        thisWeekStart.setUTCDate(thisWeekStart.getUTCDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
        const lastWeekStart = new Date(thisWeekStart);
        lastWeekStart.setUTCDate(lastWeekStart.getUTCDate() - 7);
        start = lastWeekStart;
        end = thisWeekStart;
        break;
      }
      case 'month': {
        const lastMonthStartUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
        const lastMonthEndUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
        start = lastMonthStartUtc;
        end = lastMonthEndUtc;
        break;
      }
      case 'all':
      default:
        return { total: 0, count: 0 };
    }

    const periodTxs = transactions.filter(t => {
      const txDate = new Date(t.date);
      txDate.setUTCHours(0, 0, 0, 0);
      return txDate >= start && txDate < end;
    });

    const total = periodTxs.reduce((s, t) => s + t.amount, 0);
    const count = periodTxs.length;

    return { total, count };
  }, [transactions, period]);

  const currentTotal = totalSpend;
  const previousTotal = previousPeriodData.total;
  const spendChange = previousTotal > 0 
    ? ((currentTotal - previousTotal) / previousTotal) * 100 
    : null;

  const currentCount = filtered.length;
  const previousCount = previousPeriodData.count;
  const countChange = previousCount > 0 
    ? ((currentCount - previousCount) / previousCount) * 100 
    : null;

  const biggestTx = useMemo(() => {
    if (filtered.length === 0) return null;
    return filtered.reduce((max, t) => t.amount > max.amount ? t : max, filtered[0]);
  }, [filtered]);

  const merchantCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    filtered.forEach(t => { counts[t.merchant] = (counts[t.merchant] || 0) + 1; });
    return counts;
  }, [filtered]);

  const topMerchant = useMemo(() => {
    const entries = Object.entries(merchantCounts).sort((a, b) => b[1] - a[1]);
    return entries[0] ? { name: entries[0][0], count: entries[0][1] } : null;
  }, [merchantCounts]);

  const bySource = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach(t => {
      map[t.source] = (map[t.source] || 0) + t.amount;
    });
    return Object.entries(map)
      .map(([source, total]) => ({ source, total }))
      .sort((a, b) => b.total - a.total);
  }, [filtered]);

  const recent = useMemo(() => [...filtered]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 8), [filtered]);

  if (status === 'loading') {
    return (
      <main style={{ padding: '36px 32px' }}>
        <SkeletonCards />
      </main>
    );
  }

  const firstName = session?.user?.name?.split(' ')[0] ?? 'there';
  const todayStr = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <main style={{ padding: '32px 32px 48px', display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* ── Top bar ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.5px', color: 'var(--text-primary)' }}>
            Welcome back, {firstName}!
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
            Here's what's happening with your spending.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: 4 }}>
            {(['today', 'week', 'month', 'all'] as Period[]).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                style={{
                  padding: '7px 14px',
                  borderRadius: 8,
                  border: 'none',
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: 'pointer',
                  background: period === p ? 'var(--accent)' : 'var(--bg-surface)',
                  color: period === p ? '#fff' : 'var(--text-secondary)',
                }}
              >
                {p === 'today' ? 'Today' : p === 'week' ? 'This Week' : p === 'month' ? 'This Month' : 'All Time'}
              </button>
            ))}
          </div>
          <button
            id="scan-emails-btn"
            className="btn btn-primary"
            onClick={handleScan}
            disabled={scanning}
            style={{ opacity: scanning ? 0.7 : 1 }}
          >
            <ScanIco />
            {scanning ? 'Scanning…' : 'Scan Emails'}
          </button>
        </div>
      </div>

      {/* ── Stat cards ── */}
      {loading ? <SkeletonCards /> : (
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <StatCard
            label="Total Spend"
            value={fmt(currentTotal)}
            change={spendChange !== null ? spendChange : undefined}
            isNeg
          />
          <StatCard
            label="Transactions"
            value={String(currentCount)}
            change={countChange !== null ? countChange : undefined}
          />
          <StatCard
            label="Top Category"
            value={byCategory.sort((a, b) => b.total - a.total)[0]
              ? categoryLabel[byCategory.sort((a, b) => b.total - a.total)[0].cat]
              : '—'}
          />
          <StatCard
            label="AI Insights"
            value={String(insights.length)}
          />
          <StatCard
            label="Biggest Transaction"
            value={biggestTx ? `${biggestTx.merchant}: ${fmt(biggestTx.amount)}` : '—'}
          />
          <StatCard
            label="Top Merchant"
            value={topMerchant ? `${topMerchant.name} (${topMerchant.count})` : '—'}
          />
        </div>
      )}

      {/* ── Charts row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20 }}>

        {/* Money flow bar chart */}
        <div className="card fade-up" style={{ padding: '24px 20px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>Money Flow</h2>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Monthly spending pattern</p>
            </div>
            <div style={{ display: 'flex', gap: 16, alignItems: 'center', fontSize: 12, color: 'var(--text-muted)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', display: 'inline-block' }} />
                Spend
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-light)', display: 'inline-block' }} />
                Income
              </span>
            </div>
          </div>

          {loading ? (
            <div className="skeleton" style={{ height: 200, borderRadius: 12 }} />
          ) : byMonth.length === 0 ? (
            <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              No transaction data yet — click Scan Emails to start.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={byMonth} barCategoryGap="35%" barGap={4}>
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                <YAxis hide />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--bg-page)', radius: 6 }} />
                <Bar dataKey="income" name="Income" fill="var(--accent-light)" radius={[6, 6, 0, 0]} />
                <Bar dataKey="spend"  name="Spend"  fill="var(--accent)"       radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Spending by category donut */}
        <div className="card fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>By Category</h2>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Spend breakdown</p>
            </div>
            <button style={{
              width: 30, height: 30, borderRadius: '50%', border: '1.5px solid var(--border-subtle)',
              background: 'transparent', cursor: 'pointer', display: 'flex',
              alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)',
            }}><ArrowUp /></button>
          </div>

          {loading ? (
            <div className="skeleton" style={{ height: 180 }} />
          ) : byCategory.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              No data yet
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={byCategory} dataKey="total" nameKey="cat" cx="50%" cy="50%"
                    innerRadius={50} outerRadius={72} paddingAngle={3}>
                    {byCategory.map((entry) => (
                      <Cell key={entry.cat} fill={categoryColors[entry.cat] ?? '#C4B5FD'} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => fmtShort(Number(v))} />
                </PieChart>
              </ResponsiveContainer>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {byCategory.map(({ cat, total }) => (
                  <li key={cat} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                    <span style={{
                      width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                      background: categoryColors[cat] ?? '#C4B5FD',
                    }} />
                    <span style={{ flex: 1, color: 'var(--text-secondary)' }}>{categoryLabel[cat]}</span>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{fmtShort(total)}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        {bySource.length > 0 && (
          <div className="card fade-up" style={{ padding: '20px 24px' }}>
            <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 16 }}>
              By Source
            </h3>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {bySource.map(({ source, total }) => {
                const badge = sourceBadge[source] ?? { label: source, color: '#6B7280', bg: '#F3F4F6' };
                const pct = currentTotal > 0 ? (total / currentTotal) * 100 : 0;
                return (
                  <li key={source} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{
                      display: 'inline-block', padding: '2px 8px', borderRadius: 999,
                      fontSize: 10, fontWeight: 600, background: badge.bg, color: badge.color,
                    }}>{badge.label}</span>
                    <div style={{ flex: 1, height: 6, background: 'var(--border)', borderRadius: 999 }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: badge.color, borderRadius: 999 }} />
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 500, minWidth: 60, textAlign: 'right' }}>
                      {fmtShort(total)}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>

      {/* ── Bottom row: Transactions + Insights ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20 }}>

        {/* Recent transactions */}
        <div className="card fade-up" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h2 style={{ fontSize: 15, fontWeight: 700 }}>Recent Transactions</h2>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Latest activity</p>
            </div>
            <a href="/dashboard/history" className="btn btn-ghost" style={{ fontSize: 12, padding: '7px 14px' }}>
              See all →
            </a>
          </div>

          {loading ? (
            <div style={{ padding: '0 24px 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[0,1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 44 }} />)}
            </div>
          ) : recent.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              No transactions found. Try scanning your emails!
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Merchant</th>
                    <th>Source</th>
                    <th>Category</th>
                    <th style={{ textAlign: 'right' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((tx) => {
                    const badge = sourceBadge[tx.source] ?? { label: tx.source, color: '#6B7280', bg: '#F3F4F6' };
                    return (
                      <tr key={tx.id} onClick={() => setEditingTx(tx)} style={{ cursor: 'pointer' }}>
                        <td style={{ color: 'var(--text-muted)', fontSize: 12, whiteSpace: 'nowrap' }}>
                          {new Date(tx.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                        </td>
                        <td style={{ fontWeight: 500 }}>{tx.merchant}</td>
                        <td>
                          <span style={{
                            display: 'inline-block', padding: '3px 10px', borderRadius: 999,
                            fontSize: 11, fontWeight: 600,
                            background: badge.bg, color: badge.color,
                          }}>{badge.label}</span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                            {(tx.categories || [tx.category]).map(cat => (
                              <span key={cat} style={{
                                display: 'inline-block', padding: '2px 6px', borderRadius: 999,
                                fontSize: 10, fontWeight: 500,
                                background: `${categoryColors[cat] || '#94A3B8'}20`,
                                color: categoryColors[cat] || '#94A3B8',
                              }}>
                                {categoryLabel[cat] ?? cat}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--danger)' }}>
                          -{fmt(tx.amount)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* AI Insights */}
        <div className="card fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700 }}>AI Insights</h2>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Smart spending analysis</p>
          </div>

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[0,1,2].map(i => <div key={i} className="skeleton" style={{ height: 64 }} />)}
            </div>
          ) : insights.length === 0 ? (
            <div style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', gap: 10, color: 'var(--text-muted)', fontSize: 13,
              textAlign: 'center', padding: '20px 0',
            }}>
              <span style={{ fontSize: 32 }}>🤖</span>
              <p>Scan your emails to generate AI-powered insights about your spending habits.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'auto', maxHeight: 320 }}>
              {insights.map((ins) => <InsightCard key={ins.id} insight={ins} />)}
            </div>
          )}

          {!loading && insights.length > 0 && (
            <button
              className="btn btn-ghost"
              onClick={handleScan}
              disabled={scanning}
              style={{ width: '100%', justifyContent: 'center', opacity: scanning ? 0.7 : 1 }}
            >
              {scanning ? 'Scanning…' : '↻ Refresh insights'}
            </button>
          )}
        </div>
      </div>

      {editingTx && (
        <EditTransactionPanel
          transaction={editingTx}
          onClose={() => setEditingTx(null)}
          onSave={handleSave}
        />
      )}
    </main>
  );
}