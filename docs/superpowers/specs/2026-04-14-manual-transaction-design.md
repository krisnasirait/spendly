# Manual Transaction Add Design

## Problem
Users can only add transactions via email scanning. They need to manually add transactions that don't come from email (cash purchases, etc.).

## Solution
Add a floating action button (FAB) on the dashboard that opens a slide-out panel to quickly add transactions.

## UI

### Floating Action Button
- Bottom-right corner of Dashboard
- Fixed position, always visible
- Orange accent color with "+" icon
- Triggers slide-out Add Transaction panel

### Add Transaction Panel
Slide-out panel (same style as EditTransactionPanel) with fields:
- **Merchant** (text input, required)
- **Amount** (number input in IDR, required)
- **Date** (date picker, defaults to today)
- **Category** (text input with suggestions/autocomplete)
- **Source**: Always set to "manual"

## Data Flow
1. User clicks FAB
2. Panel slides in from right
3. User fills in merchant, amount, date, selects/creates category
4. On save, POST to `/api/transactions` with source = "manual"
5. Panel closes, dashboard refreshes to show new transaction

## API Changes

### POST /api/transactions
Add support for creating transactions directly (not just via email scan):

```typescript
// Request body
{
  merchant: string;
  amount: number;
  date: string;  // ISO date string
  categories: string[];
  source: 'manual';  // Always "manual" for manual entries
}
```

### Firestore: `users/{userId}/transactions/{txId}`
```typescript
{
  merchant: string;
  amount: number;
  date: Date;
  categories: string[];
  source: 'manual';
  createdAt: Date;
  userId: string;
}
```

## Files to Modify

1. **API** (`app/api/transactions/route.ts`) - Add POST handler for manual creation
2. **Dashboard** (`app/dashboard/page.tsx`) - Add FAB button
3. **New Component** (`components/AddTransactionPanel.tsx`) - Slide-out form panel
