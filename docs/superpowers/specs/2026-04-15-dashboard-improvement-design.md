# Dashboard Improvements Design

**Date:** 2026-04-15
**Topic:** Improve dashboard with budget tracking and enhanced AI insights

## Problem

The current dashboard has:
- Basic stat cards and charts
- Limited AI insights (only high spend warning)
- No budget tracking or category spending targets

Users need better visibility into budget compliance and smarter spending alerts.

## Solution

Add budget tracking with visual progress bars and enhance AI insights with 4 types of alerts.

---

## Feature 1: Budget Tracking

### Data Model

**Budget** stored in Firestore at `users/{userId}/settings/budgets`:
```typescript
interface Budget {
  category: string;  // 'food', 'shopping', etc.
  amount: number;    // budget amount in IDR
  period: 'monthly'; // only monthly for now
  suggestedAmount?: number; // auto-suggested from history
  isManual: boolean; // true if user edited, false if auto-suggested
}
```

### Auto-Suggestion Logic

When user has 3+ months of transaction history:
1. Calculate average monthly spend per category
2. Store as `suggestedAmount` with `isManual: false`
3. User can override with custom amount

### UI: BudgetProgress Component

**Location:** Below stat cards, above charts

**Visual:**
```
┌─────────────────────────────────────────────────────────────┐
│  Budget Overview                          [Edit Budgets]   │
├─────────────────────────────────────────────────────────────┤
│  Food & Drinks        ████████████░░░░░░░  Rp 1.35jt/2jt  │
│  Shopping             ████████████████████ Rp 3.2jt/2jt   │ ← Over budget (red)
│  Transport           ████░░░░░░░░░░░░░░░░  Rp 400rb/1.5jt  │
│  Entertainment       █████████░░░░░░░░░░░░░  Rp 500rb/1jt   │
│  Other               ░░░░░░░░░░░░░░░░░░░░░  No budget set  │
└─────────────────────────────────────────────────────────────┘
```

**Progress Bar Colors:**
- Green: < 75% used
- Yellow: 75-100% used
- Red: > 100% (over budget)

### Edit Budgets

**Trigger:** "Edit Budgets" button opens modal
**Modal Content:**
- List all categories with current budget
- Input fields to set custom amounts
- "Reset to suggested" option per category
- Save button

---

## Feature 2: Enhanced AI Insights

### Insight Types

| Type | Enum | Trigger | Severity |
|------|------|---------|----------|
| Budget Alert | `budget_alert` | Category spend > budget | high if over, medium if approaching |
| Unusual Tx | `unusual_tx` | Single transaction > 2x merchant average | high |
| Spike Alert | `spike` | Week total > 150% of 4-week average | high |
| Encouragement | `encouragement` | Category < 60% of budget mid-month | low |

### Insight Generation Logic

**1. Budget Alert:**
```typescript
// After filtering by period (month)
for (each category with budget) {
  const spent = sum(transactions for category)
  if (spent > budget.amount) {
    severity = spent > budget.amount * 1.5 ? 'high' : 'medium'
    text = "⚠️ {category} budget exceeded by {amount}"
  } else if (spent > budget.amount * 0.9) {
    severity = 'medium'
    text = "⚠️ {category} at {pct}% of budget"
  }
}
```

**2. Unusual Transaction:**
```typescript
// Per transaction in current period
const merchantAvg = avg(transactions for this merchant)
if (tx.amount > merchantAvg * 2) {
  severity = 'high'
  text = "📈 {merchant} charge {amount} ({ratio}x your usual)"
}
```

**3. Spike Alert:**
```typescript
const now = new Date()
const thisWeekTxs = transactions in [now - 7 days, now]
const thisWeekTotal = sum(thisWeekTxs)

const avgWeekly = avg(transactions in last 4 weeks) / 4
if (thisWeekTotal > avgWeekly * 1.5) {
  severity = 'high'
  text = "📈 Spending spike: {amount} this week vs {avg} avg"
}
```

**4. Encouragement:**
```typescript
// Check mid-month (around day 15)
const dayOfMonth = new Date().getDate()
if (dayOfMonth >= 10 && dayOfMonth <= 20) {
  for (each category with budget) {
    const pct = spent / budget.amount
    if (pct < 0.6) {
      severity = 'low'
      text = "🎉 {category} only {pct}% used - saving {amount}!"
    }
  }
}
```

---

## Layout Structure

### Dashboard Page Sections (top to bottom)

1. **Header bar:** Welcome message + period filter + Scan button
2. **Stat cards:** 6 cards (existing + maybe add "Budget Remaining")
3. **Budget Overview:** BudgetProgress bars for each category
4. **Charts row:** Money Flow | By Category (existing)
5. **Bottom row:** Recent Transactions | AI Insights

### New Components

- `BudgetProgress.tsx` - Single category budget bar
- `BudgetOverview.tsx` - Container with list of BudgetProgress
- `EditBudgetsModal.tsx` - Budget editing interface
- Enhanced `InsightCard.tsx` with type-based icons
- Updated `generateInsights()` in API

---

## API Changes

### GET /api/insights (updated)

Add to existing insights endpoint:
- Fetch user budgets from Firestore
- Pass budgets + transactions to `generateInsights()`
- Return enhanced insights array

### GET /api/budgets (new)

```typescript
// Returns user's budget settings
GET /api/budgets
Response: { budgets: Budget[] }
```

### PUT /api/budgets (new)

```typescript
// Update budgets
PUT /api/budgets
Body: { budgets: Budget[] }
```

---

## Edge Cases

1. **No budget set:** Show "Set budget" prompt instead of progress bar
2. **No transaction history:** Show "Need 3 months data" for auto-suggestion
3. **Over multiple budgets:** Show highest severity insight first
4. **Encouragement only shows mid-month:** Prevents spam at month start

---

## File Structure

- `components/dashboard/BudgetProgress.tsx` - Single progress bar
- `components/dashboard/BudgetOverview.tsx` - Budget section container
- `components/dashboard/EditBudgetsModal.tsx` - Budget editing modal
- `app/api/budgets/route.ts` - GET/PUT budgets
- `app/api/insights/route.ts` - Updated insight generation
- `app/dashboard/page.tsx` - Add BudgetOverview section
- `types/index.ts` - Add Budget type
- `lib/budget.ts` - Budget calculation utilities