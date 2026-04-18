# Export & Date Range Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add date range picker and CSV export to transaction history page.

**Architecture:** Client-side date range filtering replaces period presets; CSV export is client-side generation and download trigger. No new API endpoints needed.

**Tech Stack:** Next.js App Router, TypeScript, native HTML date inputs

---

## File Structure

| File | Responsibility |
|------|----------------|
| `app/dashboard/history/page.tsx` | Modify: replace period selector with date range picker, add export CSV button |

---

## Tasks

### Task 1: Add Date Range State & Quick Options to History Page

**Files:**
- Modify: `app/dashboard/history/page.tsx`

- [ ] **Step 1: Read current history page to understand state structure**

Read `app/dashboard/history/page.tsx` lines 27-50 to see the current `Period` type and state.

- [ ] **Step 2: Add DateRange interface and quick range options**

Find the line with `type Period = 'today' | 'week' | 'month' | 'all';` and replace it with:

```typescript
interface DateRange {
  start: Date;
  end: Date;
}

const QUICK_RANGES: Array<{ label: string; getValue: () => DateRange | null }> = [
  {
    label: 'This Month',
    getValue: () => {
      const now = new Date();
      return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: now };
    },
  },
  {
    label: 'Last Month',
    getValue: () => {
      const now = new Date();
      return { start: new Date(now.getFullYear(), now.getMonth() - 1, 1), end: new Date(now.getFullYear(), now.getMonth(), 0) };
    },
  },
  {
    label: 'Last 3 Months',
    getValue: () => {
      const now = new Date();
      return { start: new Date(now.getFullYear(), now.getMonth() - 2, 1), end: now };
    },
  },
  { label: 'Custom', getValue: () => null },
];
```

- [ ] **Step 3: Replace period state with dateRange state**

Find `const [period, setPeriod] = useState<Period>('month');` around line 40-41 and replace with:

```typescript
const [dateRange, setDateRange] = useState<DateRange>(() => {
  const now = new Date();
  return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: now };
});
const [showCustom, setShowCustom] = useState(false);
```

- [ ] **Step 4: Run type check**

Run: `npx tsc --noEmit`
Expected: No errors (or only pre-existing errors)

- [ ] **Step 5: Commit**

```bash
git add app/dashboard/history/page.tsx
git commit -m "feat: add date range state and quick options to history page"
```

---

### Task 2: Replace Period Selector with Date Range Picker UI

**Files:**
- Modify: `app/dashboard/history/page.tsx`

- [ ] **Step 1: Find the period selector UI section**

Find around line 140-160 where the period buttons are rendered (likely `today`, `week`, `month`, `all` buttons).

- [ ] **Step 2: Replace period buttons with quick range dropdown and custom option**

Find the section with period buttons and replace it with:

```tsx
<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
  <select
    value={QUICK_RANGES.findIndex(q => {
      const v = q.getValue();
      return v && v.start.getTime() === dateRange.start.getTime() && v.end.getTime() === dateRange.end.getTime();
    }) >= 0 ? QUICK_RANGES.findIndex(q => {
      const v = q.getValue();
      return v && v.start.getTime() === dateRange.start.getTime() && v.end.getTime() === dateRange.end.getTime();
    }) : -1}
    onChange={(e) => {
      const idx = Number(e.target.value);
      if (idx === -1) {
        setShowCustom(true);
      } else {
        const range = QUICK_RANGES[idx].getValue();
        if (range) setDateRange(range);
      }
    }}
    style={{
      padding: '8px 12px',
      borderRadius: 8,
      border: '1.5px solid var(--border)',
      background: 'var(--bg-surface)',
      color: 'var(--text-primary)',
      fontSize: 13,
      cursor: 'pointer',
    }}
  >
    <option value={0}>This Month</option>
    <option value={1}>Last Month</option>
    <option value={2}>Last 3 Months</option>
    <option value={-1}>Custom</option>
  </select>

  {showCustom && (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <input
        type="date"
        value={dateRange.start.toISOString().split('T')[0]}
        onChange={(e) => setDateRange(prev => ({ ...prev, start: new Date(e.target.value) }))}
        style={{
          padding: '8px 12px',
          borderRadius: 8,
          border: '1.5px solid var(--border)',
          background: 'var(--bg-surface)',
          color: 'var(--text-primary)',
          fontSize: 13,
        }}
      />
      <span style={{ color: 'var(--text-muted)' }}>to</span>
      <input
        type="date"
        value={dateRange.end.toISOString().split('T')[0]}
        onChange={(e) => setDateRange(prev => ({ ...prev, end: new Date(e.target.value) }))}
        style={{
          padding: '8px 12px',
          borderRadius: 8,
          border: '1.5px solid var(--border)',
          background: 'var(--bg-surface)',
          color: 'var(--text-primary)',
          fontSize: 13,
        }}
      />
      <button
        onClick={() => setShowCustom(false)}
        style={{
          padding: '8px 12px',
          borderRadius: 8,
          border: 'none',
          background: 'var(--accent)',
          color: '#fff',
          fontSize: 12,
          cursor: 'pointer',
        }}
      >
        Apply
      </button>
    </div>
  )}
</div>
```

- [ ] **Step 3: Run type check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add app/dashboard/history/page.tsx
git commit -m "feat: replace period selector with date range picker UI"
```

---

### Task 3: Update Filter Logic to Use Date Range

**Files:**
- Modify: `app/dashboard/history/page.tsx`

- [ ] **Step 1: Find the filter logic that uses period**

Find the `filtered` useMemo around line 70-100. Look for the switch/case on period.

- [ ] **Step 2: Replace period filter with date range filter**

Replace the period-based filtering with date range filtering:

Find:
```typescript
if (period !== 'all') {
  const { start, end } = getBillingPeriod(now, billingStartDay);
  list = list.filter(t => {
    const txDate = new Date(t.date);
    switch (period) {
      case 'today': {
        const periodStart = getBillingPeriod(now, billingStartDay).start;
        return txDate >= periodStart && txDate <= now;
      }
      case 'week': {
        const periodStart = getBillingPeriod(now, billingStartDay).start;
        const weekStart = new Date(periodStart);
        const dayOfWeek = weekStart.getUTCDay();
        const monStart = new Date(weekStart);
        monStart.setUTCDate(monStart.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
        const weekEnd = new Date(monStart);
        weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);
        return txDate >= monStart && txDate < weekEnd;
      }
      case 'month': {
        const { start, end } = getBillingPeriod(now, billingStartDay);
        return txDate >= start && txDate <= end;
      }
      default:
        return true;
    }
  });
}
```

Replace with:
```typescript
list = list.filter(t => {
  const txDate = new Date(t.date);
  return txDate >= dateRange.start && txDate <= dateRange.end;
});
```

- [ ] **Step 3: Run type check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add app/dashboard/history/page.tsx
git commit -m "feat: update filter logic to use date range instead of period presets"
```

---

### Task 4: Add CSV Export Functionality

**Files:**
- Modify: `app/dashboard/history/page.tsx`

- [ ] **Step 1: Find the header section of the history page**

Find where the page title and search/filter UI is rendered (around line 110-140).

- [ ] **Step 2: Add export button to header**

Find a good spot in the header area and add:

```tsx
<button
  onClick={() => {
    const headers = ['Date', 'Merchant', 'Amount', 'Category', 'Source'];
    const rows = filtered.map(tx => [
      new Date(tx.date).toLocaleDateString('id-ID'),
      `"${tx.merchant.replace(/"/g, '""')}"`,
      tx.amount.toString(),
      tx.categories.join('; '),
      tx.source,
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const fromStr = dateRange.start.toISOString().split('T')[0];
    const toStr = dateRange.end.toISOString().split('T')[0];
    link.download = `spendly-transactions-${fromStr}-${toStr}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }}
  style={{
    padding: '8px 16px',
    borderRadius: 8,
    border: '1.5px solid var(--border)',
    background: 'var(--bg-surface)',
    color: 'var(--text-primary)',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  }}
>
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
  Export CSV
</button>
```

- [ ] **Step 3: Add the export function (if not using inline)**

The export is inline in the onClick. No separate function needed.

- [ ] **Step 4: Run type check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add app/dashboard/history/page.tsx
git commit -m "feat: add CSV export button to history page"
```

---

## Verification

1. Navigate to `/dashboard/history`
2. The period selector should be replaced with a dropdown + custom date inputs
3. Select "This Month", "Last Month", "Last 3 Months" — the list should filter accordingly
4. Select "Custom" — should show date inputs to set start/end
5. Click "Export CSV" — should download a CSV file with correct transactions
6. TypeScript should compile without errors: `npx tsc --noEmit`