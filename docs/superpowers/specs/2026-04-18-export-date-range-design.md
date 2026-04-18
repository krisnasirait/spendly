# B1: Export & Date Range for Transaction History

## Overview

Replace the period selector (today/week/month/all) with a date range picker and add CSV export functionality to the transaction history page.

## Changes

### 1. History Page (`app/dashboard/history/page.tsx`)

**Date Range Picker:**
- Replace `Period` type (`'today' | 'week' | 'month' | 'all'`) with date range state
- Quick options dropdown: "This Month", "Last Month", "Last 3 Months", "Custom"
- "Custom" opens a native `<input type="date">` range selector
- Shows current range as "DD MMM - DD MMM YYYY" in the UI

**Export CSV Button:**
- Button in page header: "Export CSV"
- Downloads filtered transactions as CSV file named `spendly-transactions-{fromDate}-{toDate}.csv`
- CSV columns: Date, Merchant, Amount, Category, Source

**Period State Change:**
- Old: `const [period, setPeriod] = useState<Period>('month')`
- New: `const [dateRange, setDateRange] = useState<{ start: Date; end: Date }>(...)`
- Replace `period !== 'all'` filter logic with date range comparison

### 2. Transactions API (`app/api/transactions/route.ts`)

**GET endpoint enhancements:**
- Accept `startDate` and `endDate` as optional query params
- If provided, filter transactions to that date range
- Date format: ISO string (YYYY-MM-DD)

### 3. Data Flow

```typescript
// Date range state
interface DateRange {
  start: Date;
  end: Date;
}

// Quick options
const QUICK_RANGES = [
  { label: 'This Month', getValue: () => { const now = new Date(); return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: now }; } },
  { label: 'Last Month', getValue: () => { const now = new Date(); return { start: new Date(now.getFullYear(), now.getMonth() - 1, 1), end: new Date(now.getFullYear(), now.getMonth(), 0) }; } },
  { label: 'Last 3 Months', getValue: () => { const now = new Date(); return { start: new Date(now.getFullYear(), now.getMonth() - 2, 1), end: now }; } },
  { label: 'Custom', getValue: () => null },
];

// CSV export function
function exportToCSV(transactions: Transaction[], filename: string) {
  const headers = ['Date', 'Merchant', 'Amount', 'Category', 'Source'];
  const rows = transactions.map(tx => [
    new Date(tx.date).toLocaleDateString('id-ID'),
    tx.merchant,
    tx.amount.toString(),
    tx.categories.join(', '),
    tx.source,
  ]);
  const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
  // trigger download
}
```

## Files to Modify

1. `app/dashboard/history/page.tsx` — Add date range picker, replace period selector, add export button
2. `app/api/transactions/route.ts` — Add date range filtering to GET endpoint (optional - can be client-side only)

## Responsive Behavior

- Desktop: Date range picker inline with header, Export button beside it
- Mobile: Date range picker stacked below header, Export button below

## Implementation Notes

- Use native HTML date inputs for simplicity (no external date picker library needed)
- CSV export is client-side only (no new API needed)
- Maintain backward compatibility: default to "This Month" if no range selected