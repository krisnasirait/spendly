# B3: Recurring Transaction Detection

## Overview

Analyze transaction history to detect recurring payments (subscriptions, regular bills) and display them with badges in the history list and a summary section in Analytics.

## Detection Algorithm

**Criteria for recurring transaction:**
- Same merchant appears at least 3 times
- Transactions are within ±5 days of each other (suggesting monthly cadence)
- Amount is within ±10% of the average for that merchant

**Output for each recurring transaction:**
```typescript
interface RecurringTransaction {
  merchant: string;
  frequency: 'monthly' | 'weekly' | 'unknown';
  avgAmount: number;
  occurrences: number;
  lastCharge: string;      // date
  nextExpected: string;     // date (predicted)
  isConfirmed: boolean;     // user has acknowledged this as recurring
}
```

## Changes

### 1. New API: `GET /api/recurring`

Returns detected recurring transactions:

```typescript
// Response
{
  recurring: RecurringTransaction[];
  totalMonthlyRecurring: number;
}
```

### 2. Analytics Page (`app/dashboard/analytics/page.tsx`)

**Add Recurring Summary Card:**
- Total monthly recurring amount (sum of all detected monthly subscriptions)
- List of top recurring transactions with merchant, amount, frequency
- "No recurring transactions detected" state

```tsx
{/* Recurring Summary Card */}
<div className="card" style={{ padding: '24px' }}>
  <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>
    Recurring Payments
  </h3>
  <div style={{ marginBottom: 16 }}>
    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
      Monthly Total
    </p>
    <p style={{ fontSize: 24, fontWeight: 800 }}>
      {fmt(totalMonthlyRecurring)}
    </p>
  </div>
  {recurring.length > 0 ? (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {recurring.slice(0, 5).map(r => (
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
          <p style={{ fontSize: 13, fontWeight: 600 }}>{fmt(r.avgAmount)}</p>
        </div>
      ))}
    </div>
  ) : (
    <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
      No recurring payments detected yet
    </p>
  )}
</div>
```

### 3. History Page (`app/dashboard/history/page.tsx`)

**Add Recurring Badge:**
- When rendering transaction rows, check if the merchant is in the recurring list
- Display a small badge: "🔄 Monthly" or "🔄 Weekly" next to the merchant name
- Badge appears only for recurring transactions (matched by exact merchant name)

**Badge styling:**
```tsx
{isRecurring && (
  <span style={{
    fontSize: 10,
    padding: '2px 6px',
    borderRadius: 4,
    background: 'var(--accent-light)',
    color: 'var(--accent)',
    marginLeft: 8,
  }}>
    🔄 {frequency}
  </span>
)}
```

### 4. Detection Algorithm (in API)

```typescript
function detectRecurringTransactions(transactions: Transaction[]): RecurringTransaction[] {
  const merchantTxs = new Map<string, Transaction[]>();

  transactions.forEach(tx => {
    if (!merchantTxs.has(tx.merchant)) merchantTxs.set(tx.merchant, []);
    merchantTxs.get(tx.merchant)!.push(tx);
  });

  const recurring: RecurringTransaction[] = [];

  merchantTxs.forEach((txs, merchant) => {
    if (txs.length < 3) return;

    // Sort by date
    const sorted = txs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Calculate average days between transactions
    const gaps: number[] = [];
    for (let i = 1; i < sorted.length; i++) {
      const gap = (new Date(sorted[i].date).getTime() - new Date(sorted[i-1].date).getTime()) / (1000 * 60 * 60 * 24);
      gaps.push(gap);
    }
    const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;

    // Determine frequency
    let frequency: 'monthly' | 'weekly' | 'unknown' = 'unknown';
    if (avgGap >= 25 && avgGap <= 35) frequency = 'monthly';
    else if (avgGap >= 5 && avgGap <= 9) frequency = 'weekly';

    if (frequency === 'unknown') return;

    // Check amount consistency
    const amounts = txs.map(t => t.amount);
    const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const isConsistent = amounts.every(a => Math.abs(a - avgAmount) / avgAmount < 0.1);

    if (!isConsistent) return;

    recurring.push({
      merchant,
      frequency,
      avgAmount,
      occurrences: txs.length,
      lastCharge: sorted[sorted.length - 1].date,
      nextExpected: calculateNextExpected(sorted[sorted.length - 1].date, frequency),
      isConfirmed: false,
    });
  });

  return recurring.sort((a, b) => b.avgAmount - a.avgAmount);
}
```

## Files to Create/Modify

1. Create: `app/api/recurring/route.ts` — New API endpoint
2. Modify: `app/dashboard/analytics/page.tsx` — Add Recurring Summary Card
3. Modify: `app/dashboard/history/page.tsx` — Add recurring badges to transaction rows

## Responsive Behavior

- Desktop: Full recurring summary card in Analytics
- Mobile: Same card, scrollable list if many recurring transactions