# Billing Period Start Date Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `billingStartDay` setting (1-28) that controls how period filters calculate the billing month, from 5th to 4th of next month.

**Architecture:** Create shared billing period utility, update settings API to store billingStartDay, update settings page to allow editing, update dashboard to use billing period for filtering.

**Tech Stack:** Next.js, Firestore, React

---

## File Map

| File | Action |
|------|--------|
| `lib/billing-period.ts` | Create - shared billing period utilities |
| `app/api/settings/route.ts` | Modify - add billingStartDay field |
| `app/dashboard/settings/page.tsx` | Modify - add billing start day input |
| `app/dashboard/page.tsx` | Modify - use billing period for filtering |

---

### Task 1: Create billing period utility

**Files:**
- Create: `lib/billing-period.ts`

- [ ] **Step 1: Write billing period utility**

```typescript
export interface BillingPeriod {
  start: Date;
  end: Date;
}

export function getBillingPeriod(date: Date, startDay: number): BillingPeriod {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const day = date.getUTCDate();

  let start: Date;
  if (day >= startDay) {
    start = new Date(Date.UTC(year, month, startDay));
  } else {
    start = new Date(Date.UTC(year, month - 1, startDay));
  }

  const end = new Date(start);
  end.setUTCMonth(end.getUTCMonth() + 1);

  return { start, end };
}

export function isInBillingPeriod(txDate: Date, start: Date, end: Date): boolean {
  return txDate >= start && txDate < end;
}

export function getPreviousBillingPeriod(period: BillingPeriod): BillingPeriod {
  const duration = period.end.getTime() - period.start.getTime();
  return {
    start: new Date(period.start.getTime() - duration),
    end: new Date(period.end.getTime() - duration),
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/billing-period.ts
git commit -m "feat: add billing period utility functions"
```

---

### Task 2: Update Settings API

**Files:**
- Modify: `app/api/settings/route.ts`

- [ ] **Step 1: Update GET handler**

The GET handler already returns `snap.data()` which will include `billingStartDay` if it exists. No change needed if we use `merge: true` on PUT.

- [ ] **Step 2: Update PUT handler to accept billingStartDay**

Find this section in PUT:
```typescript
const { sources, scanPeriodDays } = body;
```

Change to:
```typescript
const { sources, scanPeriodDays, billingStartDay } = body;
```

Add validation after scanPeriodDays validation:
```typescript
if (billingStartDay !== undefined) {
  if (typeof billingStartDay !== 'number' || billingStartDay < 1 || billingStartDay > 28) {
    return NextResponse.json({ error: 'billingStartDay must be a number between 1 and 28' }, { status: 400 });
  }
  updates.billingStartDay = billingStartDay;
}
```

- [ ] **Step 3: Update default GET response**

In the GET handler, update default return:
```typescript
return NextResponse.json({ sources: ['shopee', 'tokopedia', 'travelova', 'bca', 'ayo'], scanPeriodDays: 30, billingStartDay: 1 });
```

- [ ] **Step 4: Commit**

```bash
git add app/api/settings/route.ts
git commit -m "feat(settings): add billingStartDay field to settings API"
```

---

### Task 3: Update Settings Page

**Files:**
- Modify: `app/dashboard/settings/page.tsx`

- [ ] **Step 1: Add billingStartDay to Settings interface**

Find:
```typescript
interface Settings {
  sources: string[];
  scanPeriodDays: number;
}
```

Change to:
```typescript
interface Settings {
  sources: string[];
  scanPeriodDays: number;
  billingStartDay: number;
}
```

- [ ] **Step 2: Update default state**

Find:
```typescript
const [settings, setSettings] = useState<Settings>({ sources: ['shopee', 'tokopedia', 'traveloka', 'bca', 'ayo'], scanPeriodDays: 30 });
```

Change to:
```typescript
const [settings, setSettings] = useState<Settings>({ sources: ['shopee', 'tokopedia', 'traveloka', 'bca', 'ayo'], scanPeriodDays: 30, billingStartDay: 1 });
```

- [ ] **Step 3: Add billing start day input**

Find the scanPeriodDays select (around line 531). Add billingStartDay input after it:
```tsx
<div>
  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
    Billing Start Day
  </label>
  <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>
    Day of month when your salary/salary cycle starts (1-28)
  </p>
  <input
    type="number"
    min={1}
    max={28}
    value={settings.billingStartDay}
    onChange={(e) => saveSettings({ ...settings, billingStartDay: Number(e.target.value) })}
    style={{
      width: '100%', padding: '10px 14px', borderRadius: 10,
      border: '1.5px solid var(--border)', background: 'var(--bg-page)',
      fontSize: 14, color: 'var(--text-primary)', outline: 'none',
    }}
  />
</div>
```

- [ ] **Step 4: Commit**

```bash
git add app/dashboard/settings/page.tsx
git commit -m "feat(settings): add billing start day input"
```

---

### Task 4: Update Dashboard Period Filtering

**Files:**
- Modify: `app/dashboard/page.tsx`

- [ ] **Step 1: Import billing period utility**

Find:
```typescript
import { getCategoryColor } from '@/lib/category-colors';
```

Add after:
```typescript
import { getBillingPeriod, isInBillingPeriod, getPreviousBillingPeriod } from '@/lib/billing-period';
```

- [ ] **Step 2: Add settings state**

Find:
```typescript
const [editingTx, setEditingTx] = useState<Transaction | null>(null);
```

Add after:
```typescript
const [billingStartDay, setBillingStartDay] = useState(1);
```

- [ ] **Step 3: Load billingStartDay from settings**

In the loadData function or useEffect after session check, fetch settings:
```typescript
useEffect(() => {
  if (session?.user) {
    loadData();
    fetch('/api/settings')
      .then(r => r.json())
      .then(data => {
        if (data.billingStartDay) setBillingStartDay(data.billingStartDay);
      })
      .catch(() => {});
  }
}, [session, loadData]);
```

- [ ] **Step 4: Update filtered useMemo**

Find the `filtered` useMemo. Replace the switch statement for period filtering:

Old code:
```typescript
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
```

New code:
```typescript
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
    weekEnd.setUTCDate(monEnd.getUTCDate() + 7);
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
```

**Note:** Fix the typo `monEnd` should be `monStart` in the week case.

- [ ] **Step 5: Update previousPeriodData useMemo**

Find the `previousPeriodData` useMemo. Replace with billing period comparison:

Old code:
```typescript
const previousPeriodData = useMemo(() => {
  const periodTxs = transactions.filter(t => {
    const txDate = new Date(t.date);
    txDate.setUTCHours(0, 0, 0, 0);
    switch (period) {
      case 'today':
        return txDate >= today;
      // ...
    }
  });
  // ...
}, [transactions, period]);
```

New code:
```typescript
const previousPeriodData = useMemo(() => {
  if (period === 'all') {
    return { total: 0, count: 0 };
  }
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
```

- [ ] **Step 6: Commit**

```bash
git add app/dashboard/page.tsx
git commit -m "feat(dashboard): use billing period for period filtering"
```

---

## Verification

- [ ] Run `npm run lint` - should pass with only warnings
- [ ] Run `npm run build` - should build successfully
- [ ] Test the flow:
  1. Go to Settings, set Billing Start Day to 5
  2. Go to Dashboard, verify "This Month" shows transactions from 5th to 4th of next month
  3. Verify month-over-month comparison uses billing periods
