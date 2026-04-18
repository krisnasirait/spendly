# Analytics Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a new Analytics page with 6-month trend line chart, month-over-month comparison, top merchants ranking, and spending velocity indicators.

**Architecture:** Single new API endpoint aggregates transaction data; new analytics page renders Recharts line chart with summary cards; dashboard Money Flow card gets "View in Analytics" drill-down link.

**Tech Stack:** Next.js App Router, Recharts, Firebase/Firestore, TypeScript

---

## File Structure

| File | Responsibility |
|------|----------------|
| `app/api/analytics/route.ts` | New API - returns monthlyTrend, topMerchants, velocity, thisMonth |
| `app/dashboard/analytics/page.tsx` | New analytics page with line chart and summary cards |
| `app/dashboard/page.tsx` | Add "View in Analytics" link to Money Flow card |

---

## Tasks

### Task 1: Create Analytics API Endpoint

**Files:**
- Create: `app/api/analytics/route.ts`

- [ ] **Step 1: Create the API route file**

```typescript
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/firestore';

const fmt = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const db = getDb();

  const txSnap = await db
    .collection('users').doc(userId)
    .collection('transactions')
    .orderBy('date', 'desc')
    .get();

  interface Transaction {
    id: string;
    merchant: string;
    amount: number;
    date: string;
    categories: string[];
    source: string;
  }

  const transactions: Transaction[] = txSnap.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      merchant: data.merchant,
      amount: data.amount,
      date: data.date instanceof Date ? data.date.toISOString() : String(data.date),
      categories: data.categories || [],
      source: data.source,
    };
  });

  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

  // monthlyTrend: last 6 months
  const monthlyTrend: Array<{ month: string; spend: number; income: number; txCount: number }> = [];
  for (let i = 5; i >= 0; i--) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
    const monthStr = monthDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

    const monthTxs = transactions.filter(tx => {
      const txDate = new Date(tx.date);
      return txDate >= monthDate && txDate <= monthEnd;
    });

    const spend = monthTxs.reduce((sum, tx) => sum + tx.amount, 0);
    monthlyTrend.push({ month: monthStr, spend, income: 0, txCount: monthTxs.length });
  }

  // thisMonth vs lastMonth
  const thisMonthTxs = transactions.filter(tx => {
    const txDate = new Date(tx.date);
    return txDate >= thisMonthStart;
  });
  const lastMonthTxs = transactions.filter(tx => {
    const txDate = new Date(tx.date);
    return txDate >= lastMonthStart && txDate <= lastMonthEnd;
  });

  const thisMonthTotal = thisMonthTxs.reduce((sum, tx) => sum + tx.amount, 0);
  const lastMonthTotal = lastMonthTxs.reduce((sum, tx) => sum + tx.amount, 0);
  const vsLastMonth = lastMonthTotal > 0 ? ((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100 : 0;
  const trend: 'up' | 'down' | 'same' = vsLastMonth > 2 ? 'up' : vsLastMonth < -2 ? 'down' : 'same';

  // topMerchants
  const merchantMap = new Map<string, number>();
  thisMonthTxs.forEach(tx => {
    merchantMap.set(tx.merchant, (merchantMap.get(tx.merchant) || 0) + tx.amount);
  });
  const lastMonthMerchantMap = new Map<string, number>();
  lastMonthTxs.forEach(tx => {
    lastMonthMerchantMap.set(tx.merchant, (lastMonthMerchantMap.get(tx.merchant) || 0) + tx.amount);
  });

  const topMerchants = Array.from(merchantMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, currentAmount]) => {
      const lastMonthAmount = lastMonthMerchantMap.get(name) || 0;
      const deltaPercent = lastMonthAmount > 0 ? ((currentAmount - lastMonthAmount) / lastMonthAmount) * 100 : 0;
      return { name, currentAmount, lastMonthAmount, deltaPercent };
    });

  // velocity
  const dayOfMonth = now.getDate();
  const currentPace = dayOfMonth > 0 ? thisMonthTotal / dayOfMonth : 0;
  const lastMonthDays = lastMonthEnd.getDate();
  const lastMonthPace = lastMonthTotal / lastMonthDays;
  const velocityDelta = lastMonthPace > 0 ? ((currentPace - lastMonthPace) / lastMonthPace) * 100 : 0;

  return NextResponse.json({
    monthlyTrend,
    topMerchants,
    velocity: {
      currentPace,
      lastMonthPace,
      deltaPercent: velocityDelta,
    },
    thisMonth: {
      total: thisMonthTotal,
      vsLastMonth,
      trend,
    },
  });
}
```

- [ ] **Step 2: Test the endpoint**

Run: `curl -s http://localhost:3000/api/analytics -H "Cookie: ..."` (requires authenticated session)
Expected: JSON with `monthlyTrend`, `topMerchants`, `velocity`, `thisMonth` fields

- [ ] **Step 3: Commit**

```bash
git add app/api/analytics/route.ts
git commit -m "feat: add analytics API endpoint"
```

---

### Task 2: Create Analytics Page

**Files:**
- Create: `app/dashboard/analytics/page.tsx`

- [ ] **Step 1: Create the analytics page**

```typescript
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

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
                      formatter={(value: number) => [fmt(value), 'Spend']}
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
```

Note: Add `import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from 'recharts';` at the top.

- [ ] **Step 2: Add missing import**

Add to top of file:
```typescript
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from 'recharts';
```

- [ ] **Step 3: Test the page**

Run: `npm run dev` → Navigate to `http://localhost:3000/dashboard/analytics`
Expected: Analytics page with chart, summary card, and top merchants

- [ ] **Step 4: Commit**

```bash
git add app/dashboard/analytics/page.tsx
git commit -m "feat: add analytics dashboard page"
```

---

### Task 3: Add "View in Analytics" Link to Dashboard

**Files:**
- Modify: `app/dashboard/page.tsx`

- [ ] **Step 1: Find Money Flow card header section**

Locate around line 492-506 in dashboard/page.tsx where Money Flow card header is.

- [ ] **Step 2: Add "View in Analytics" link to Money Flow card header**

In the Money Flow card header div, add a link after the description:

```tsx
<p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Monthly spending overview</p>
```

Add below it:
```tsx
<Link href="/dashboard/analytics" style={{
  fontSize: 11, color: 'var(--accent)', fontWeight: 500,
  marginTop: 4, display: 'inline-block',
}}>
  View in Analytics →
</Link>
```

- [ ] **Step 3: Commit**

```bash
git add app/dashboard/page.tsx
git commit -m "feat: add View in Analytics link to Money Flow card"
```

---

## Verification

1. Navigate to `/dashboard/analytics` — should show 6-month line chart, this-month summary, top merchants
2. Period selector (3M/6M/1Y) should filter the chart data
3. Velocity banner should appear if spending 20%+ faster than last month
4. On dashboard, "View in Analytics" link should navigate to analytics page
5. TypeScript should compile without errors: `npx tsc --noEmit`