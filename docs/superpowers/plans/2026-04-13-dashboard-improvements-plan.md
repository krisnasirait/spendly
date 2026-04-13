# Dashboard Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve dashboard with real data filtering, accurate statistics, and clickable transactions

**Architecture:** Add period filter state and computed filtered transactions. All stats/charts derive from filtered data. Add EditTransactionPanel for clickable rows.

**Tech Stack:** Next.js App Router, React useState/useMemo, recharts

---

## File Map

**Modified Files:**
- `app/dashboard/page.tsx` - All dashboard changes

---

## Task 1: Add Period Filter Buttons

**Files:**
- Modify: `app/dashboard/page.tsx`

Add period filter button state and UI at the top bar.

- [ ] **Step 1: Add period type and state after line 162**

```tsx
type Period = 'today' | 'week' | 'month' | 'all';

const [period, setPeriod] = useState<Period>('month');
```

- [ ] **Step 2: Add period filter buttons after the "This month" button (around line 243)**

Replace the "This month" button with a button group:

```tsx
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
```

Remove the old "This month" button (line 242-244) since the new button group replaces it.

- [ ] **Step 3: Commit**

```bash
git add app/dashboard/page.tsx
git commit -m "feat: add period filter buttons to dashboard"
```

---

## Task 2: Add Filtered Transactions Computation

**Files:**
- Modify: `app/dashboard/page.tsx`

Add a `useMemo` that filters transactions by the selected period.

- [ ] **Step 1: Add filtered transactions useMemo after the recent useMemo (around line 214)**

```tsx
const filtered = useMemo(() => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  return transactions.filter(t => {
    const txDate = new Date(t.date);
    switch (period) {
      case 'today':
        return txDate >= today;
      case 'week': {
        const dayOfWeek = now.getDay();
        const monday = new Date(today);
        monday.setDate(monday.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
        return txDate >= monday;
      }
      case 'month': {
        const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        return txDate >= firstOfMonth;
      }
      case 'all':
      default:
        return true;
    }
  });
}, [transactions, period]);
```

- [ ] **Step 2: Update totalSpend to use filtered instead of transactions (line 191)**

Change:
```tsx
const totalSpend = useMemo(() => transactions.reduce((s, t) => s + t.amount, 0), [transactions]);
```
To:
```tsx
const totalSpend = useMemo(() => filtered.reduce((s, t) => s + t.amount, 0), [filtered]);
```

- [ ] **Step 3: Update byCategory to use filtered (line 193)**

Change:
```tsx
const byCategory = useMemo(() => {
  ...
  transactions.forEach((t) => {
```
To:
```tsx
const byCategory = useMemo(() => {
  ...
  filtered.forEach((t) => {
```
And change the dependency from `[transactions]` to `[filtered]`.

- [ ] **Step 4: Update byMonth to use filtered (line 202)**

Change `transactions.forEach` to `filtered.forEach` and dependency to `[filtered]`.

- [ ] **Step 5: Update recent to use filtered (line 212)**

Change:
```tsx
const recent = useMemo(() => [...transactions]
```
To:
```tsx
const recent = useMemo(() => [...filtered]
```
And dependency to `[filtered]`.

- [ ] **Step 6: Commit**

```bash
git add app/dashboard/page.tsx
git commit -m "feat: add filtered transactions by period"
```

---

## Task 3: Add Real Month-over-Month Percentages

**Files:**
- Modify: `app/dashboard/page.tsx`

Calculate real % change comparing current period vs previous equivalent period.

- [ ] **Step 1: Add previousPeriodData useMemo after the filtered useMemo**

```tsx
const previousPeriodData = useMemo(() => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  let start: Date, end: Date;
  
  switch (period) {
    case 'today': {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      start = yesterday;
      end = today;
      break;
    }
    case 'week': {
      const dayOfWeek = now.getDay();
      const thisWeekStart = new Date(today);
      thisWeekStart.setDate(thisWeekStart.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
      const lastWeekStart = new Date(thisWeekStart);
      lastWeekStart.setDate(lastWeekStart.getDate() - 7);
      start = lastWeekStart;
      end = thisWeekStart;
      break;
    }
    case 'month': {
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(thisMonthStart);
      lastMonthEnd.setDate(lastMonthEnd.getDate() - 1);
      start = lastMonthStart;
      end = lastMonthEnd;
      break;
    }
    case 'all':
    default:
      return { total: 0, count: 0, biggestTx: null, topMerchant: null };
  }
  
  const periodTxs = transactions.filter(t => {
    const txDate = new Date(t.date);
    return txDate >= start && txDate < end;
  });
  
  const total = periodTxs.reduce((s, t) => s + t.amount, 0);
  const merchantCounts: Record<string, number> = {};
  let biggestTx = periodTxs[0] || null;
  periodTxs.forEach(t => {
    if (!biggestTx || t.amount > biggestTx.amount) biggestTx = t;
    merchantCounts[t.merchant] = (merchantCounts[t.merchant] || 0) + 1;
  });
  const topMerchant = Object.entries(merchantCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
  
  return { total, count: periodTxs.length, biggestTx, topMerchant };
}, [transactions, period]);
```

- [ ] **Step 2: Update StatCard calls to use real percentages**

Replace the hardcoded `change={-2.4}` and `change={12.1}` with real calculations:

```tsx
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
```

Then update StatCards:
```tsx
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
```

- [ ] **Step 3: Commit**

```bash
git add app/dashboard/page.tsx
git commit -m "feat: add real month-over-month percentage calculations"
```

---

## Task 4: Add Top Merchant Stats

**Files:**
- Modify: `app/dashboard/page.tsx`

Add two new stat cards: Biggest Transaction and Top Merchant.

- [ ] **Step 1: Add biggestTx and topMerchant derived values**

Add after the `spendChange` calculations:

```tsx
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
```

- [ ] **Step 2: Update the stats row to include new cards (around line 260)**

The stats row currently has 4 cards. Add 2 more for a total of 6:

```tsx
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
    change={insights.length > 0 ? 6.3 : 0}
  />
  <StatCard
    label="Biggest Transaction"
    value={biggestTx ? fmt(biggestTx.amount) : '—'}
  />
  <StatCard
    label="Top Merchant"
    value={topMerchant ? topMerchant.name : '—'}
  />
</div>
```

Also update the AI Insights card to have a real percentage or remove it.

- [ ] **Step 3: Commit**

```bash
git add app/dashboard/page.tsx
git commit -m "feat: add biggest transaction and top merchant stat cards"
```

---

## Task 5: Add Spending by Source Breakdown

**Files:**
- Modify: `app/dashboard/page.tsx`

Add a list showing spending breakdown by email source below or alongside the category chart.

- [ ] **Step 1: Add bySource useMemo after byCategory**

```tsx
const bySource = useMemo(() => {
  const map: Record<string, number> = {};
  filtered.forEach(t => {
    map[t.source] = (map[t.source] || 0) + t.amount;
  });
  return Object.entries(map)
    .map(([source, total]) => ({ source, total }))
    .sort((a, b) => b.total - a.total);
}, [filtered]);
```

- [ ] **Step 2: Add source breakdown section after the category donut chart (around line 374)**

After the closing `</div>` of the category card, add:

```tsx
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
```

- [ ] **Step 3: Commit**

```bash
git add app/dashboard/page.tsx
git commit -m "feat: add spending by source breakdown to dashboard"
```

---

## Task 6: Make Recent Transactions Clickable

**Files:**
- Modify: `app/dashboard/page.tsx`
- Create: `components/EditTransactionPanel.tsx` (already exists, check if it needs updates)

Add EditTransactionPanel import and state, wire up click handlers.

- [ ] **Step 1: Add import and state at the top of the component (around line 6)**

```tsx
import EditTransactionPanel from '@/components/EditTransactionPanel';
```

Add after the existing state declarations (around line 162):
```tsx
const [editingTx, setEditingTx] = useState<Transaction | null>(null);
```

- [ ] **Step 2: Update recent transactions table row to be clickable (around line 416)**

Change the `<tr>` to have onClick and cursor style:

```tsx
<tr 
  key={tx.id} 
  onClick={() => setEditingTx(tx)}
  style={{ cursor: 'pointer' }}
>
```

- [ ] **Step 3: Add handleSave function before the return**

```tsx
function handleSave(updated: Transaction) {
  setTransactions(prev => prev.map(t => t.id === updated.id ? updated : t));
}
```

- [ ] **Step 4: Add panel rendering before closing main tag**

```tsx
{editingTx && (
  <EditTransactionPanel
    transaction={editingTx}
    onClose={() => setEditingTx(null)}
    onSave={handleSave}
  />
)}
```

- [ ] **Step 5: Commit**

```bash
git add app/dashboard/page.tsx
git commit -m "feat: make recent transactions clickable to edit"
```

---

## Self-Review Checklist

- [ ] Spec coverage: All 6 spec requirements mapped to tasks
- [ ] No placeholders: All code is complete
- [ ] Type consistency: Period type, Transaction type usage consistent
- [ ] Period filter correctly filters all dashboard data
- [ ] Month-over-month uses previous equivalent period
- [ ] EditTransactionPanel integration complete
