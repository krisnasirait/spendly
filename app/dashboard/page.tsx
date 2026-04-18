'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { useDevice } from '@/hooks/useDevice';
import type { Transaction, Insight, Budget } from '@/types';
import { BudgetOverview } from '@/components/dashboard/BudgetOverview';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import EditTransactionPanel from '@/components/EditTransactionPanel';
import AddTransactionPanel from '@/components/AddTransactionPanel';
import { OnboardingTour } from '@/components/onboarding/OnboardingTour';
import { getCategoryColor } from '@/lib/category-colors';
import { getBillingPeriod, isInBillingPeriod, getPreviousBillingPeriod } from '@/lib/billing-period';

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

const sourceBadge: Record<string, { label: string; color: string; bg: string }> = {
  shopee:    { label: 'Shopee',    color: '#EE4D2D', bg: '#FFF0EE' },
  tokopedia: { label: 'Tokopedia', color: '#03AC0E', bg: '#F0FFF1' },
  traveloka: { label: 'Traveloka', color: '#0064D2', bg: '#EBF4FF' },
  bca:       { label: 'BCA',       color: '#005BAC', bg: '#EBF2FF' },
  ayo:       { label: 'AYO',       color: '#FF6B00', bg: '#FFF4EE' },
};

const Ico = ({ d, size = 16, stroke = 'currentColor', strokeWidth = 1.8 }: {
  d: string; size?: number; stroke?: string; strokeWidth?: number;
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

const ScanIco = () => <Ico d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" size={16} stroke="#fff" />;
const TrendUpIco = () => <Ico d="M23 6l-9.5 9.5-5-5L1 18" size={14} stroke="var(--success)" />;
const TrendDownIco = () => <Ico d="M23 18l-9.5-9.5-5 5L1 6" size={14} stroke="var(--danger)" />;
const AlertIco = () => <Ico d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" size={18} stroke="var(--warning)" />;
const CheckCircleIco = () => <Ico d="M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4L12 14.01l-3-3" size={18} stroke="var(--success)" />;
const TrendingUpIco = () => <Ico d="M23 6l-9.5 9.5-5-5L1 18M17 6l4 4M7 17l4 4" size={16} />;
const CalendarIco = () => <Ico d="M8 2v3M16 2v3M3 8h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" size={15} />;

function StatCard({ label, value, change, isNeg, icon }: {
  label: string; value: string; change?: number; isNeg?: boolean; icon?: React.ReactNode;
}) {
  const positive = !isNeg && (change ?? 0) >= 0;
  return (
    <div className="card fade-up" style={{ 
      flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 12,
      padding: '20px 22px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Gradient accent line at top */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 3,
        background: 'linear-gradient(90deg, var(--accent-start), var(--accent-end))',
        borderRadius: '20px 20px 0 0',
      }} />
      <div style={{ paddingTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
        {icon && <div style={{ color: 'var(--accent)' }}>{icon}</div>}
      </div>
      <div>
        <p style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.5px', color: 'var(--text-primary)', lineHeight: 1.2 }}>
          {value}
        </p>
      </div>
      {change !== undefined && (
        <div style={{ 
          display: 'inline-flex', alignItems: 'center', gap: 4,
          padding: '4px 10px', borderRadius: 'var(--radius-pill)',
          background: positive ? 'var(--success-bg)' : 'var(--danger-bg)',
          width: 'fit-content',
        }}>
          {positive ? <TrendUpIco /> : <TrendDownIco />}
          <span style={{ fontSize: 12, fontWeight: 600, color: positive ? 'var(--success)' : 'var(--danger)' }}>
            {Math.abs(change).toFixed(1)}% vs last month
          </span>
        </div>
      )}
    </div>
  );
}

function InsightCard({ insight }: { insight: Insight }) {
  const severityStyles = {
    high:   { bg: '#FEF2F2', border: '#FCA5A5', color: '#DC2626', icon: <AlertIco /> },
    medium: { bg: '#FFFBEB', border: '#FDE68A', color: '#D97706', icon: <AlertIco /> },
    low:    { bg: '#ECFDF5', border: '#A7F3D0', color: '#059669', icon: <CheckCircleIco /> },
  }[insight.severity];

  const typeColors = {
    spike:           '#EC4899',
    budget_alert:    '#F59E0B',
    unusual_tx:      '#8B5CF6',
    encouragement:   '#10B981',
    trend:           '#7C3AED',
    category_overload: '#F59E0B',
    pattern:         '#7C3AED',
  }[insight.type] || '#7C3AED';

  return (
    <div style={{
      padding: '14px 16px',
      borderRadius: 14,
      background: severityStyles.bg,
      borderLeft: `4px solid ${typeColors}`,
      display: 'flex', 
      alignItems: 'flex-start', 
      gap: 12,
      transition: 'transform 0.15s ease, box-shadow 0.15s ease',
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = 'translateX(4px)';
      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = 'translateX(0)';
      e.currentTarget.style.boxShadow = 'none';
    }}>
      <div style={{ 
        flexShrink: 0, 
        paddingTop: 2,
        width: 32,
        height: 32,
        borderRadius: 10,
        background: `${typeColors}15`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <span style={{ color: typeColors }}>{severityStyles.icon}</span>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.5, marginBottom: 8 }}>{insight.text}</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ 
            fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
            color: typeColors,
            background: `${typeColors}15`,
            padding: '2px 8px',
            borderRadius: 999,
          }}>
            {insight.type.replace('_', ' ')}
          </span>
          <span style={{ 
            fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em',
            color: severityStyles.color,
          }}>
            {insight.severity}
          </span>
        </div>
      </div>
    </div>
  );
}

function SkeletonCards() {
  return (
    <div style={{ display: 'flex', gap: 16 }}>
      {[0,1,2,3].map(i => (
        <div key={i} className="card" style={{ flex: 1, height: 120 }}>
          <div className="skeleton" style={{ height: 12, width: '50%', marginBottom: 16 }} />
          <div className="skeleton" style={{ height: 28, width: '70%', marginBottom: 16 }} />
          <div className="skeleton" style={{ height: 20, width: '40%', borderRadius: 'var(--radius-pill)' }} />
        </div>
      ))}
    </div>
  );
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--bg-surface)', border: '1px solid var(--border)',
      borderRadius: 10, padding: '12px 16px', boxShadow: 'var(--shadow-hover)',
    }}>
      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8, fontWeight: 500 }}>{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
          {p.name}: {fmtShort(p.value)}
        </p>
      ))}
    </div>
  );
}

type Period = 'today' | 'week' | 'month' | 'all';

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { isMobile } = useDevice();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [period, setPeriod] = useState<Period>('month');
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [billingStartDay, setBillingStartDay] = useState(1);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [txData, insightData, budgetData] = await Promise.all([
      fetch('/api/transactions').then((r) => r.json()),
      fetch('/api/insights').then((r) => r.json()),
      fetch('/api/budgets').then((r) => r.json()),
    ]);
    setTransactions(txData.transactions || []);
    setInsights(insightData.insights || []);
    setBudgets(budgetData.budgets || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/signin');
  }, [status, router]);

  useEffect(() => {
    if (session?.user) loadData();
  }, [session, loadData]);

  useEffect(() => {
    if (session?.user) {
      fetch('/api/settings')
        .then(r => r.json())
        .then(data => {
          if (data.billingStartDay) setBillingStartDay(data.billingStartDay);
          if (data.hasSeenOnboarding !== undefined) {
            setHasSeenOnboarding(data.hasSeenOnboarding);
            if (!data.hasSeenOnboarding) {
              setShowOnboarding(true);
            }
          }
        })
        .catch(() => {});
    }
  }, [session]);

  async function handleScan() {
    setScanning(true);
    await fetch('/api/emails/scan', { method: 'POST' });
    await loadData();
    window.dispatchEvent(new Event('pending-count-refresh'));
    setScanning(false);
  }

  const completeOnboarding = async () => {
    await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hasSeenOnboarding: true }),
    });
    setShowOnboarding(false);
    setHasSeenOnboarding(true);
  };

  function handleSave(updated: Transaction) {
    setTransactions(prev => prev.map(t => t.id === updated.id ? updated : t));
  }

  function handleAdd(newTx: Omit<Transaction, 'userId' | 'createdAt'>) {
    setTransactions(prev => [{
      ...newTx,
      userId: (session?.user as { id?: string })?.id || '',
      createdAt: new Date().toISOString(),
    }, ...prev]);
  }

  function handleUpdateBudgets(newBudgets: Budget[]) {
    setBudgets(newBudgets);
  }

  const filtered = useMemo(() => {
    const now = new Date();
    return transactions.filter(t => {
      const txDate = new Date(t.date);
      switch (period) {
        case 'today': {
          const { start: periodStart } = getBillingPeriod(now, billingStartDay);
          return txDate >= periodStart && txDate <= now;
        }
        case 'week': {
          const { start: periodStart } = getBillingPeriod(now, billingStartDay);
          const weekStart = new Date(periodStart);
          const dayOfWeek = weekStart.getUTCDay();
          const monStart = new Date(weekStart);
          monStart.setUTCDate(monStart.getUTCDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
          const weekEnd = new Date(monStart);
          weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);
          return txDate >= monStart && txDate < weekEnd;
        }
        case 'month': {
          const { start: periodStart, end: periodEnd } = getBillingPeriod(now, billingStartDay);
          return txDate >= periodStart && txDate < periodEnd;
        }
        case 'all':
        default:
          return true;
      }
    });
  }, [transactions, period, billingStartDay]);

  const totalSpend = useMemo(() => filtered.reduce((s, t) => s + t.amount, 0), [filtered]);

  const byCategory = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach((t) => {
      t.categories.forEach(cat => { map[cat] = (map[cat] ?? 0) + t.amount; });
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

  const previousPeriodData = useMemo(() => {
    if (period === 'all') return { total: 0, count: 0 };
    const now = new Date();
    const { start, end } = getBillingPeriod(now, billingStartDay);
    const prev = getPreviousBillingPeriod({ start, end });
    const periodTxs = transactions.filter(t => {
      const txDate = new Date(t.date);
      return isInBillingPeriod(txDate, prev.start, prev.end);
    });
    const total = periodTxs.reduce((s, t) => s + t.amount, 0);
    const count = periodTxs.length;
    return { total, count };
  }, [transactions, period, billingStartDay]);

  const currentTotal = totalSpend;
  const previousTotal = previousPeriodData.total;
  const spendChange = previousTotal > 0 ? ((currentTotal - previousTotal) / previousTotal) * 100 : null;

  const currentCount = filtered.length;
  const previousCount = previousPeriodData.count;
  const countChange = previousCount > 0 ? ((currentCount - previousCount) / previousCount) * 100 : null;

  const biggestTx = useMemo(() => {
    if (filtered.length === 0) return null;
    return filtered.reduce((max, t) => t.amount > max.amount ? t : max, filtered[0]);
  }, [filtered]);

  const topCategory = useMemo(() => {
    if (byCategory.length === 0) return null;
    return byCategory.reduce((max, c) => c.total > max.total ? c : max, byCategory[0]);
  }, [byCategory]);

  const recent = useMemo(() => [...filtered]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 8), [filtered]);

  const bySource = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach(t => {
      map[t.source] = (map[t.source] || 0) + t.amount;
    });
    return Object.entries(map)
      .map(([source, total]) => ({ source, total }))
      .sort((a, b) => b.total - a.total);
  }, [filtered]);

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
    <>
      {showOnboarding && <OnboardingTour onComplete={completeOnboarding} />}
    <main style={{ padding: '28px 32px 48px', display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24 }}>
        <div>
          <h1 style={{ 
            fontSize: 26, 
            fontWeight: 800, 
            letterSpacing: '-0.5px', 
            fontFamily: 'var(--font-family-heading)',
            background: 'linear-gradient(135deg, var(--accent-start), var(--accent-end))',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>
            Good morning, {firstName}
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
            {todayStr} — track your spending with ease
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ 
            display: 'flex', gap: 2,
            background: 'var(--bg-surface)',
            borderRadius: 'var(--radius-md)',
            padding: 4,
            border: '1px solid var(--border)',
          }}>
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
                  background: period === p ? 'var(--accent)' : 'transparent',
                  color: period === p ? '#fff' : 'var(--text-secondary)',
                  transition: 'all 0.15s ease',
                }}
              >
                {p === 'today' ? 'Today' : p === 'week' ? 'Week' : p === 'month' ? 'Month' : 'All'}
              </button>
            ))}
          </div>
          <button
            id="scan-emails-btn"
            className="btn btn-primary"
            onClick={handleScan}
            disabled={scanning}
            style={{ 
              opacity: scanning ? 0.7 : 1,
              padding: '9px 20px',
            }}
          >
            <ScanIco />
            {scanning ? 'Scanning…' : 'Scan Emails'}
          </button>
        </div>
      </div>

      {/* Stat cards */}
      {loading ? <SkeletonCards /> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, }}>
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
            value={topCategory ? (categoryLabel[topCategory.cat] || topCategory.cat) : '—'}
          />
          <StatCard
            label="AI Insights"
            value={String(insights.length)}
          />
        </div>
      )}

      {/* Budget Overview */}
      {budgets.filter(b => b.amount > 0).length > 0 && (
        <BudgetOverview
          budgets={budgets}
          transactions={transactions}
          onUpdateBudgets={handleUpdateBudgets}
        />
      )}

      {/* Main content grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20, }}>
        {/* Charts column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Money flow chart */}
          <div className="card fade-up" style={{ padding: '22px 24px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div>
                <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>Money Flow</h2>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Monthly spending overview</p>
                <Link href="/dashboard/analytics" style={{
                  fontSize: 11, color: 'var(--accent)', fontWeight: 500,
                  marginTop: 4, display: 'inline-block',
                }}>
                  View in Analytics →
                </Link>
              </div>
              <div style={{ display: 'flex', gap: 16, alignItems: 'center', fontSize: 12, color: 'var(--text-muted)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--accent)', display: 'inline-block' }} />
                  Spend
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--accent-light)', display: 'inline-block' }} />
                  Income
                </span>
              </div>
            </div>
            {loading ? (
              <div className="skeleton" style={{ height: 180, borderRadius: 10 }} />
            ) : byMonth.length === 0 ? (
              <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                No transaction data yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={byMonth} barCategoryGap="30%" barGap={4}>
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                  <YAxis hide />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--bg-page)', radius: 4 }} />
                  <Bar dataKey="income" name="Income" fill="var(--accent-light)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="spend"  name="Spend"  fill="var(--accent)"       radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* By Source section */}
          {bySource.length > 0 && (
            <div className="card fade-up" style={{ padding: '20px 24px' }}>
              <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                By Source
              </h3>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 12 }}>
                {bySource.map(({ source, total }) => {
                  const badge = sourceBadge[source] ?? { label: source, color: '#6B7280', bg: '#F3F4F6' };
                  const pct = currentTotal > 0 ? (total / currentTotal) * 100 : 0;
                  return (
                    <li key={source} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{
                        display: 'inline-block', padding: '4px 10px', borderRadius: 6,
                        fontSize: 11, fontWeight: 600, background: badge.bg, color: badge.color,
                      }}>{badge.label}</span>
                      <div style={{ flex: 1, height: 6, background: 'var(--border)', borderRadius: 999 }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: badge.color, borderRadius: 999, transition: 'width 0.3s ease' }} />
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 600, minWidth: 70, textAlign: 'right', color: 'var(--text-primary)' }}>
                        {fmtShort(total)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>

        {/* Right column: Category breakdown + Insights */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Category donut */}
          <div className="card fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '20px 22px' }}>
            <div>
              <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>By Category</h2>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Spend breakdown</p>
            </div>
            {loading ? (
              <div className="skeleton" style={{ height: 140 }} />
            ) : byCategory.length === 0 ? (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13, padding: 20 }}>
                No data yet
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={140}>
                  <PieChart>
                    <Pie data={byCategory} dataKey="total" nameKey="cat" cx="50%" cy="50%"
                      innerRadius={42} outerRadius={62} paddingAngle={3}>
                      {byCategory.map((entry) => (
                        <Cell key={entry.cat} fill={getCategoryColor(entry.cat)} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => fmtShort(Number(v))} />
                  </PieChart>
                </ResponsiveContainer>
                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {byCategory.slice(0, 5).map(({ cat, total }) => (
                    <li key={cat} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                      <span style={{
                        width: 8, height: 8, borderRadius: 2, flexShrink: 0,
                        background: getCategoryColor(cat),
                      }} />
                      <span style={{ flex: 1, color: 'var(--text-secondary)' }}>{categoryLabel[cat] || cat}</span>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{fmtShort(total)}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>

          {/* AI Insights */}
          <div className="card fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '20px 22px', flex: 1 }}>
            <div>
              <h2 style={{ fontSize: 14, fontWeight: 700 }}>AI Insights</h2>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Smart spending analysis</p>
            </div>
            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[0,1,2].map(i => <div key={i} className="skeleton" style={{ height: 70 }} />)}
              </div>
            ) : insights.length === 0 ? (
              <div style={{
                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', gap: 10, color: 'var(--text-muted)', fontSize: 13,
                textAlign: 'center', padding: '20px 0',
              }}>
                <div style={{ 
                  width: 48, height: 48, borderRadius: '50%', 
                  background: 'var(--accent-light)', 
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth={2}>
                    <path d="M12 2a10 10 0 1 0 10 10H12V2z" />
                    <path d="M12 2a10 10 0 0 1 10 10" strokeDasharray="4 2" />
                  </svg>
                </div>
                <p>Scan your emails to generate AI-powered insights about your spending.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'auto', maxHeight: 280 }}>
                {insights.map((ins) => <InsightCard key={ins.id} insight={ins} />)}
              </div>
            )}
            {!loading && insights.length > 0 && (
              <button
                className="btn btn-ghost"
                onClick={handleScan}
                disabled={scanning}
                style={{ width: '100%', justifyContent: 'center', fontSize: 12 }}
              >
                {scanning ? 'Scanning…' : 'Refresh insights'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Recent transactions */}
      <div className="card fade-up" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700 }}>Recent Transactions</h2>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Latest spending activity</p>
          </div>
          <a href="/dashboard/history" style={{ 
            fontSize: 12, fontWeight: 600, color: 'var(--accent)', 
            textDecoration: 'none', cursor: 'pointer',
          }}>
            View all →
          </a>
        </div>
        {loading ? (
          <div style={{ padding: '0 24px 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[0,1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 48 }} />)}
          </div>
        ) : recent.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            No transactions yet — scan your emails to get started
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
                          display: 'inline-block', padding: '4px 10px', borderRadius: 6,
                          fontSize: 11, fontWeight: 600,
                          background: badge.bg, color: badge.color,
                        }}>{badge.label}</span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {tx.categories.map(cat => (
                            <span key={cat} style={{
                              display: 'inline-block', padding: '2px 8px', borderRadius: 4,
                              fontSize: 11, fontWeight: 500,
                              background: `${getCategoryColor(cat)}15`,
                              color: getCategoryColor(cat),
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

      {/* FAB */}
      {!isMobile && (
      <button
        onClick={() => setShowAddPanel(true)}
        style={{
          position: 'fixed',
          bottom: 28,
          right: 28,
          width: 54,
          height: 54,
          borderRadius: 16,
          background: 'linear-gradient(135deg, var(--accent-start) 0%, var(--accent-end) 100%)',
          color: '#fff',
          border: 'none',
          cursor: 'pointer',
          fontSize: 26,
          boxShadow: '0 6px 24px rgba(124, 108, 248, 0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 30,
          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.08) translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 10px 32px rgba(124, 108, 248, 0.5)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1) translateY(0)';
          e.currentTarget.style.boxShadow = '0 6px 24px rgba(124, 108, 248, 0.4)';
        }}
      >
        +
      </button>
      )}

      {showAddPanel && (
        <AddTransactionPanel
          onClose={() => setShowAddPanel(false)}
          onAdd={handleAdd}
        />
      )}

      {editingTx && (
        <EditTransactionPanel
          transaction={editingTx}
          onClose={() => setEditingTx(null)}
          onSave={handleSave}
        />
      )}
    </main>
    </>
  );
}