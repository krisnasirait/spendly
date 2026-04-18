'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from 'recharts';

const fmt = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

const fmtShort = (n: number) => {
  if (n >= 1000000) return `Rp ${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `Rp ${(n / 1000).toFixed(0)}K`;
  return fmt(n);
};

interface AnalyticsData {
  monthlyTrend: Array<{ month: string; spend: number; txCount: number }>;
  topMerchants: Array<{
    name: string;
    currentAmount: number;
    lastMonthAmount: number;
    deltaPercent: number;
  }>;
  velocity: { currentPace: number; lastMonthPace: number; deltaPercent: number };
  thisMonth: { total: number; vsLastMonth: number; trend: 'up' | 'down' | 'same' };
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'3M' | '6M' | '1Y'>('6M');

  useEffect(() => {
    fetch('/api/analytics')
      .then(res => res.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  const filteredTrend = data?.monthlyTrend.slice(-(period === '1Y' ? 12 : period === '6M' ? 6 : 3)) || [];

  const deltaColor = (delta: number) =>
    delta > 0 ? '#EF4444' : delta < 0 ? '#10B981' : '#6B7280';

  return (
    <main style={{ padding: '32px', maxWidth: 1000 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>Analytics</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>Your spending trends and insights</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {(['3M', '6M', '1Y'] as const).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              style={{
                padding: '6px 14px',
                borderRadius: 8,
                border: '1.5px solid',
                borderColor: period === p ? 'var(--accent)' : 'var(--border)',
                background: period === p ? 'var(--accent)' : 'transparent',
                color: period === p ? '#fff' : 'var(--text-muted)',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="skeleton" style={{ height: 200, borderRadius: 12 }} />
          <div className="skeleton" style={{ height: 100, borderRadius: 12 }} />
        </div>
      ) : data ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* This Month Summary Card */}
          <div className="card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>This Month</p>
                <h2 style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)' }}>
                  {fmt(data.thisMonth.total)}
                </h2>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  padding: '6px 12px', borderRadius: 8,
                  background: data.thisMonth.trend === 'up' ? '#FEE2E2' : data.thisMonth.trend === 'down' ? '#D1FAE5' : '#F3F4F6',
                  color: deltaColor(data.thisMonth.vsLastMonth),
                  fontSize: 13, fontWeight: 700,
                }}>
                  {data.thisMonth.trend === 'up' ? '↑' : data.thisMonth.trend === 'down' ? '↓' : '→'}
                  {Math.abs(data.thisMonth.vsLastMonth).toFixed(0)}% vs last month
                </span>
              </div>
            </div>
          </div>

          {/* Velocity Banner */}
          {data.velocity.deltaPercent > 20 && (
            <div style={{
              padding: '16px 20px', borderRadius: 12,
              background: '#FEF3C7', border: '1px solid #F59E0B',
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <span style={{ fontSize: 20 }}>⚡</span>
              <p style={{ fontSize: 13, fontWeight: 500, color: '#92400E' }}>
                You're spending <strong>{fmtShort(data.velocity.currentPace)}/day</strong> —{' '}
                {Math.abs(data.velocity.deltaPercent).toFixed(0)}% faster than last month ({fmtShort(data.velocity.lastMonthPace)}/day)
              </p>
            </div>
          )}

          {/* Trend Chart */}
          <div className="card" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, color: 'var(--text-primary)' }}>
              Spending Trend
            </h3>
            {filteredTrend.length > 0 ? (
              <div style={{ height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={filteredTrend}>
                    <XAxis dataKey="month" axisLine={false} tickLine={false}
                      tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                    <YAxis hide />
                    <Tooltip
                      formatter={(value) => [fmt(value as number), 'Spend']}
                      labelStyle={{ color: 'var(--text-primary)' }}
                      contentStyle={{
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border)',
                        borderRadius: 8,
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="spend"
                      stroke="var(--accent)"
                      strokeWidth={2.5}
                      dot={{ fill: 'var(--accent)', strokeWidth: 0, r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                No transaction data for this period
              </div>
            )}
          </div>

          {/* Top Merchants */}
          {data.topMerchants.length > 0 && (
            <div className="card" style={{ padding: '24px' }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, color: 'var(--text-primary)' }}>
                Top Merchants
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {data.topMerchants.map((merchant, i) => (
                  <div key={merchant.name} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 14px', borderRadius: 10, background: 'var(--bg-page)',
                  }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', minWidth: 20 }}>
                      #{i + 1}
                    </span>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                        {merchant.name}
                      </p>
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', minWidth: 80, textAlign: 'right' }}>
                      {fmtShort(merchant.currentAmount)}
                    </span>
                    <span style={{
                      fontSize: 11, fontWeight: 600, minWidth: 50, textAlign: 'right',
                      color: deltaColor(merchant.deltaPercent),
                    }}>
                      {merchant.deltaPercent > 0 ? '↑' : merchant.deltaPercent < 0 ? '↓' : '→'}
                      {Math.abs(merchant.deltaPercent).toFixed(0)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : null}

      <div style={{ marginTop: 24 }}>
        <Link href="/dashboard" style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          color: 'var(--text-muted)', fontSize: 13,
        }}>
          ← Back to Dashboard
        </Link>
      </div>
    </main>
  );
}