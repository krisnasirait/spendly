# Per-Category Budget Tracking Design

## Problem
Users want to set optional monthly budgets per category and see remaining daily budget based on their billing cycle.

## Solution
- Each category can have an optional monthly budget
- Category cards show spent vs budget when budget is set
- Clicking a category shows budget UI replacing drill-down table
- Budget UI shows: days left + daily budget remaining

## Data Model

### Firestore: `users/{userId}/categories/{categoryId}`
```typescript
{
  id: string;
  userId: string;
  name: string;
  budget?: number;  // optional monthly budget in IDR
  createdAt: Date;
}
```

## UI Changes

### Category Cards
When budget is set for a category, show mini progress bar under the card:
```
[Budget progress bar: spent/budget]
"Rp 800rb / 1.5jt"
```

### Budget UI (replaces drill-down table)
When category is selected with budget:
```
┌─────────────────────────────────────────┐
│ 🍜 Food & Drinks                    [×] │
│                                         │
│ Spent: Rp 1,200,000 of 1,500,000       │
│ [████████████░░░░░░░] 80%              │
│                                         │
│ 12 days remaining · Rp 25,000/day      │
└─────────────────────────────────────────┘
```

### Budget Edit Mode
Click edit icon to set/change budget:
```
┌─────────────────────────────────────────┐
│ 🍜 Food & Drinks                    [×] │
│                                         │
│ Set Monthly Budget:                     │
│ [Rp 1,500,000        ] [Save] [Cancel] │
└─────────────────────────────────────────┘
```

## Calculations

- **Days remaining**: Days from today until end of billing period
- **Daily budget**: (budget - spent) / days remaining
- **Budget progress**: spent / budget × 100%

## Files to Modify

1. **Settings API** (`app/api/settings/route.ts`) - No change needed
2. **Categories API** (`app/api/categories/route.ts`) - Already supports budget via PUT/POST with name + optional budget
3. **Categories Page** (`app/dashboard/categories/page.tsx`) - Main UI changes

## Budget UI State
```typescript
const [editingBudget, setEditingBudget] = useState<string | null>(null); // category key being edited
const [budgetInput, setBudgetInput] = useState('');
```

## Billing Period Context
Uses existing `billingStartDay` from settings to calculate billing period correctly.
