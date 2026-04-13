# Dashboard Improvements Design

## Overview

Improve the dashboard with real data filtering, accurate statistics, and better interactivity.

## Changes

### 1. Quick Period Filters

Add filter buttons in the top bar: **Today**, **This Week**, **This Month**, **All Time**

Default: "This Month" selected. Filters apply to all dashboard data.

### 2. Real Period Filtering

When a period filter is selected:
- **Stats cards**: Recalculate based on transactions within the period
- **Money Flow chart**: Show data only for the selected period
- **Category donut**: Show breakdown only for the period
- **Recent transactions**: Show only transactions within the period

Period boundaries:
- **Today**: Transactions where `date === today`
- **This Week**: Monday of current week through today
- **This Month**: 1st of current month through today
- **All Time**: No filter, show everything

### 3. Real Month-over-Month Percentages

Change the `change` badge from fake values to real calculations:
- Compare current period vs previous equivalent period
- Example: If "This Month" selected, compare to "Last Month" same date range
- Formula: `((current - previous) / previous) * 100`
- Show up/down arrow and percentage
- If no previous data, show "—" instead

### 4. Top Merchant Stats

Add two new stat cards:
- **Biggest Transaction**: Largest single transaction amount with merchant name
- **Top Merchant**: Most frequently transacted merchant with transaction count

Both cards should be styled consistently with existing stat cards.

### 5. Spending by Source Breakdown

In the category section or below the donut chart, show spending by source:
```
Shopee      Rp 500rb  [██████░░░░] 35%
Tokopedia   Rp 300rb  [████░░░░░░] 21%
BCA         Rp 400rb  [██████░░░░] 28%
Traveloka   Rp 150rb  [██░░░░░░░░] 10%
AYO         Rp 100rb  [██░░░░░░░░]  7%
```
Simple horizontal bar list with source badge colors.

### 6. Clickable Recent Transactions

- Row becomes clickable (cursor: pointer)
- Click opens EditTransactionPanel slide-out
- Panel works identically to history page edit
- After save, dashboard updates optimistically

## Implementation Notes

- All period calculations happen in useMemo hooks for performance
- Use Transaction `date` field for all period filtering
- Import EditTransactionPanel from components
- Add state for selected period and editing transaction
