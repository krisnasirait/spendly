# Billing Period Start Date Design

## Problem
Transactions are currently filtered by calendar month, but users want to track spending based on their salary cycle (e.g., 5th of each month to 4th of next month).

## Solution
Add a `billingStartDay` setting (1-28) that controls how "This Month", "This Week", and "Today" periods are calculated.

## Settings
- **Field**: `billingStartDay` (number, 1-28, default: 1)
- **Storage**: User settings in Firestore
- **Location**: Settings page

## Billing Period Calculation

```typescript
function getBillingPeriod(date: Date, startDay: number): { start: Date; end: Date } {
  // If startDay=5, billing month is 5th to 4th of next month
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  
  // Calculate start of current billing period
  const start = new Date(Date.UTC(year, month, startDay));
  if (date.getUTCDate() < startDay) {
    // We're in the previous billing period
    start.setUTCMonth(start.getUTCMonth() - 1);
  }
  
  // Calculate end (start of next billing period)
  const end = new Date(start);
  end.setUTCMonth(end.getUTCMonth() + 1);
  
  return { start, end };
}
```

## Period Filter Changes

| Period | Old Behavior | New Behavior |
|--------|-------------|--------------|
| Today | Calendar day | Transactions on/between billingStartDay of current cycle and today |
| This Week | Mon-Sun of calendar week | Mon-Sun within current billing month |
| This Month | Calendar month | billingStartDay to (billingStartDay - 1) of next month |
| All Time | No filter | No filter |

## Month-over-Month Comparison
Compares current billing period vs previous billing period (not calendar months).

## Files to Modify

1. **Settings API** (`app/api/settings/route.ts`)
   - Add `billingStartDay` to GET/PUT handlers
   - Validate range 1-28

2. **Settings Page** (`app/dashboard/settings/page.tsx`)
   - Add billingStartDay input (number, 1-28)
   - Load and save with other settings

3. **Dashboard** (`app/dashboard/page.tsx`)
   - Create shared billing period utility
   - Update `filtered` useMemo to use billing period
   - Update `previousPeriodData` to compare billing periods

4. **Shared Utility** (new: `lib/billing-period.ts`)
   - `getBillingPeriod(date, startDay)`
   - `isInBillingPeriod(txDate, start, end)`

## Default Behavior
- `billingStartDay: 1` means billing cycle starts on 1st (same as calendar month for backward compatibility)
