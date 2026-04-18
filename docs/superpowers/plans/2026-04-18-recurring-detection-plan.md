# Recurring Transaction Detection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Analyze transactions to detect recurring payments, display badges in history list and a summary card in Analytics.

**Architecture:** New API endpoint computes recurring transactions from all user transactions; Analytics and History pages fetch/use this data independently.

**Tech Stack:** Next.js App Router, TypeScript, Firebase/Firestore

---

## File Structure

| File | Responsibility |
|------|----------------|
| `app/api/recurring/route.ts` | New API - detects and returns recurring transactions |
| `app/dashboard/analytics/page.tsx` | Modify - add Recurring Summary card |
| `app/dashboard/history/page.tsx` | Modify - add recurring badges to transaction rows |

---

## Tasks

### Task 1: Create Recurring Transactions API

**Files:**
- Create: `app/api/recurring/route.ts`

- [ ] **Step 1: Create the API route file**

Create `app/api/recurring/route.ts` with this content:

```typescript
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/firestore';

interface Transaction {
  id: string;
  merchant: string;
  amount: number;
  date: string;
  categories: string[];
  source: string;
}

interface RecurringTransaction {
  merchant: string;
  frequency: 'monthly' | 'weekly' | 'unknown';
  avgAmount: number;
  occurrences: number;
  lastCharge: string;
  nextExpected: string;
}

function calculateNextExpected(lastCharge: string, frequency: 'monthly' | 'weekly'): string {
  const last = new Date(lastCharge);
  if (frequency === 'monthly') {
    last.setMonth(last.getMonth() + 1);
  } else {
    last.setDate(last.getDate() + 7);
  }
  return last.toISOString();
}

function detectRecurringTransactions(transactions: Transaction[]): RecurringTransaction[] {
  const merchantTxs = new Map<string, Transaction[]>();

  transactions.forEach(tx => {
    if (!merchantTxs.has(tx.merchant)) merchantTxs.set(tx.merchant, []);
    merchantTxs.get(tx.merchant)!.push(tx);
  });

  const recurring: RecurringTransaction[] = [];

  merchantTxs.forEach((txs, merchant) => {
    if (txs.length < 3) return;

    const sorted = [...txs].sort((a, b) =>
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    const gaps: number[] = [];
    for (let i = 1; i < sorted.length; i++) {
      const gap = (new Date(sorted[i].date).getTime() - new Date(sorted[i - 1].date).getTime()) / (1000 * 60 * 60 * 24);
      gaps.push(gap);
    }
    const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;

    let frequency: 'monthly' | 'weekly' | 'unknown' = 'unknown';
    if (avgGap >= 25 && avgGap <= 35) frequency = 'monthly';
    else if (avgGap >= 5 && avgGap <= 9) frequency = 'weekly';

    if (frequency === 'unknown') return;

    const amounts = txs.map(t => t.amount);
    const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const isConsistent = amounts.every(a => Math.abs(a - avgAmount) / avgAmount < 0.1);

    if (!isConsistent) return;

    const lastCharge = sorted[sorted.length - 1].date;

    recurring.push({
      merchant,
      frequency,
      avgAmount: Math.round(avgAmount),
      occurrences: txs.length,
      lastCharge,
      nextExpected: calculateNextExpected(lastCharge, frequency),
    });
  });

  return recurring.sort((a, b) => b.avgAmount - a.avgAmount);
}

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

  const transactions: Transaction[] = txSnap.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      merchant: data.merchant,
      amount: data.amount,
      date: typeof data.date === 'string' ? data.date : (data.date as { toDate?: () => Date }).toDate?.().toISOString() || new Date().toISOString(),
      categories: data.categories || [],
      source: data.source,
    };
  });

  const recurring = detectRecurringTransactions(transactions);
  const totalMonthlyRecurring = recurring
    .filter(r => r.frequency === 'monthly')
    .reduce((sum, r) => sum + r.avgAmount, 0);

  return NextResponse.json({
    recurring,
    totalMonthlyRecurring,
  });
}
```

- [ ] **Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add app/api/recurring/route.ts
git commit -m "feat: add recurring transactions API"
```

---

### Task 2: Add Recurring Summary Card to Analytics Page

**Files:**
- Modify: `app/dashboard/analytics/page.tsx`

- [ ] **Step 1: Read analytics page to find where to add the card**

Read `app/dashboard/analytics/page.tsx` to find where the Top Merchants card is rendered (around line 160+). The Recurring Summary card should be added below or beside Top Merchants.

- [ ] **Step 2: Add state for recurring data**

Find where `useEffect` fetches data (around line 30). Add `recurring` and `totalMonthlyRecurring` to the state interface and fetch.

First, update the interface:
```typescript
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
  recurring: Array<{ merchant: string; frequency: string; avgAmount: number; occurrences: number }>;
  totalMonthlyRecurring: number;
}
```

Add to the useEffect fetch:
```typescript
fetch('/api/analytics')
  .then(res => res.json())
  .then(data => {
    setData(data);
  })
  .catch(() => setData(null))
  .finally(() => setLoading(false));
```

Add a second fetch for recurring:
```typescript
fetch('/api/recurring')
  .then(res => res.json())
  .then(data => {
    setData(prev => prev ? { ...prev, recurring: data.recurring, totalMonthlyRecurring: data.totalMonthlyRecurring } : null);
  })
  .catch(() => {});
```

- [ ] **Step 3: Add Recurring Summary card JSX**

Find where Top Merchants card ends (around line 194) and add the Recurring card after it:

```tsx
{/* Recurring Summary Card */}
<div className="card" style={{ padding: '24px' }}>
  <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>
    Recurring Payments
  </h3>
  {data?.recurring && data.recurring.length > 0 ? (
    <>
      <div style={{ marginBottom: 16 }}>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
          Monthly Total
        </p>
        <p style={{ fontSize: 24, fontWeight: 800 }}>
          {fmt(data.totalMonthlyRecurring)}
        </p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {data.recurring.slice(0, 5).map(r => (
          <div key={r.merchant} style={{
            display: 'flex', justifyContent: 'space-between',
            padding: '8px 0', borderBottom: '1px solid var(--border)',
          }}>
            <div>
              <p style={{ fontSize: 13, fontWeight: 500 }}>{r.merchant}</p>
              <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                {r.frequency} · {r.occurrences}x
              </p>
            </div>
            <p style={{ fontSize: 13, fontWeight: 600 }}>{fmtShort(r.avgAmount)}</p>
          </div>
        ))}
      </div>
    </>
  ) : (
    <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
      No recurring payments detected yet
    </p>
  )}
</div>
```

- [ ] **Step 4: Run type check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add app/dashboard/analytics/page.tsx
git commit -m "feat: add recurring summary card to analytics page"
```

---

### Task 3: Add Recurring Badges to History List

**Files:**
- Modify: `app/dashboard/history/page.tsx`

- [ ] **Step 1: Add recurring state and fetch**

Find where other state is declared (around line 45) and add:

```typescript
const [recurringMerchants, setRecurringMerchants] = useState<Map<string, { frequency: string; avgAmount: number }>>(new Map());
```

Add to the useEffect that fetches data:
```typescript
fetch('/api/recurring')
  .then(res => res.json())
  .then(data => {
    const map = new Map<string, { frequency: string; avgAmount: number }>();
    data.recurring.forEach((r: { merchant: string; frequency: string; avgAmount: number }) => {
      map.set(r.merchant, { frequency: r.frequency, avgAmount: r.avgAmount });
    });
    setRecurringMerchants(map);
  })
  .catch(() => {});
```

- [ ] **Step 2: Add badge rendering**

Find where the merchant name is rendered in a transaction row (around line 380). Look for `<p style={{ fontSize: 13, fontWeight: 500 }}>{tx.merchant}</p>`.

Replace with:
```tsx
<div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
  <p style={{ fontSize: 13, fontWeight: 500 }}>{tx.merchant}</p>
  {recurringMerchants.has(tx.merchant) && (
    <span style={{
      fontSize: 10,
      padding: '2px 6px',
      borderRadius: 4,
      background: 'var(--accent-light)',
      color: 'var(--accent)',
    }}>
      🔄 {recurringMerchants.get(tx.merchant)?.frequency}
    </span>
  )}
</div>
```

- [ ] **Step 3: Run type check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add app/dashboard/history/page.tsx
git commit -m "feat: add recurring badges to history list"
```

---

## Verification

1. Navigate to `/dashboard/analytics` - should show "Recurring Payments" card with monthly total
2. Navigate to `/dashboard/history` - recurring transactions should show "🔄 monthly" badge next to merchant
3. TypeScript should compile without errors: `npx tsc --noEmit`