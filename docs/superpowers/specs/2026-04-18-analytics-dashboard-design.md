# Enhanced Analytics Dashboard

## Overview

Add a new Analytics section with 6-month trend line chart and month-over-month comparison delta for deeper spending insights.

## Changes

### 1. New API Endpoint: `GET /api/analytics`

Returns analytics data for the dashboard:

```typescript
interface AnalyticsResponse {
  monthlyTrend: Array<{
    month: string;        // "Jan 2026"
    spend: number;
    income: number;
    txCount: number;
  }>;
  topMerchants: Array<{
    name: string;
    currentAmount: number;
    lastMonthAmount: number;
    deltaPercent: number;
  }>;
  velocity: {
    currentPace: number;    // daily average this month
    lastMonthPace: number;
    deltaPercent: number;
  };
  thisMonth: {
    total: number;
    vsLastMonth: number;    // percentage change
    trend: 'up' | 'down' | 'same';
  };
}
```

### 2. New Page: `/dashboard/analytics`

Full analytics page with:

**6-Month Trend Line Chart**
- Recharts `LineChart` with 6-month data
- Smooth curved line in accent color
- Filled area under line with gradient
- Hover tooltip showing exact amount and month
- Period selector: 3M / 6M / 1Y (switches data range)

**Month-over-Month Summary Card**
- Large "This Month" total: Rp 2.5M
- Delta badge: "+15%" or "-8%" with up/down arrow
- Trend indicator: "↑ Up from last month" or "↓ Down from last month"
- vs Last Month absolute difference

**Top Merchants Ranking**
- Top 5 merchants by total spend
- Each row: merchant name, amount, delta indicator (↑/↓ + %)
- Click to navigate to filtered transactions view

**Spending Velocity Banner**
- Shows daily spending pace
- Alert banner if spending 20%+ faster than last month
- "You're spending Rp 150k/day vs 120k/day last month"

### 3. Enhanced Money Flow Card (Dashboard)

- Add "View in Analytics" link/icon to drill down
- Keep existing bar chart + add subtle trend line overlay

### 4. Mobile Responsive

- Desktop: Chart + sidebar with summary cards
- Mobile: Stacked layout, chart on top, scrollable merchant list below
- Touch-friendly period selector buttons

## Data Computation

`monthlyTrend`: Aggregate transactions by month, last 6 months
`topMerchants`: Group by merchant, sort by current month amount, compare to last month
`velocity`: Sum current month spend / days elapsed = daily pace; same for last month

## Files to Create/Modify

1. `app/api/analytics/route.ts` — New API endpoint
2. `app/dashboard/analytics/page.tsx` — New analytics page
3. `app/dashboard/page.tsx` — Add "View in Analytics" link to Money Flow card
4. `app/layout.tsx` — Add analytics page to nav (optional, or via link only)