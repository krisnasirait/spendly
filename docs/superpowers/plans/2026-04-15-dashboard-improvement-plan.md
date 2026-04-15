# Dashboard Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add budget tracking with progress bars and enhanced AI insights with 4 alert types to the dashboard.

**Architecture:** Add budget types and API, create BudgetProgress/BudgetOverview components, enhance insights generation logic, integrate into dashboard page.

**Tech Stack:** TypeScript, Firestore, React, Recharts

---

## File Structure

- Modify: `types/index.ts:1-49` - Add Budget type
- Create: `lib/budget.ts` - Budget calculation utilities
- Create: `app/api/budgets/route.ts` - GET/PUT budgets API
- Modify: `app/api/insights/route.ts:1-58` - Enhance insight generation with 4 types
- Create: `components/dashboard/BudgetProgress.tsx` - Single category progress bar
- Create: `components/dashboard/BudgetOverview.tsx` - Budget section container
- Create: `components/dashboard/EditBudgetsModal.tsx` - Budget editing modal
- Modify: `app/dashboard/page.tsx:1-700` - Integrate budget overview, enhance insights

---

## Task 1: Add Budget Type

**Files:**
- Modify: `types/index.ts`

- [ ] **Step 1: Add Budget interface after Insight interface**

```typescript
export interface Budget {
  category: string;
  amount: number;
  period: 'monthly';
  suggestedAmount?: number;
  isManual: boolean;
}
```

- [ ] **Step 2: Add Insight type for new insight types**

In the existing Insight interface, update the `type` union:
```typescript
export interface Insight {
  id: string;
  userId: string;
  type: 'spike' | 'trend' | 'category_overload' | 'pattern' | 'encouragement' | 'budget_alert' | 'unusual_tx';
  text: string;
  severity: 'high' | 'medium' | 'low';
  createdAt: Date;
  expiresAt: Date;
}
```

- [ ] **Step 3: Commit**

```bash
git add types/index.ts
git commit -m "feat: add Budget type and extended Insight types"
```

---

## Task 2: Create Budget Utilities

**Files:**
- Create: `lib/budget.ts`

- [ ] **Step 1: Create budget calculation utilities**

```typescript
import type { Transaction, Budget } from '@/types';

export const CATEGORY_LABELS: Record<string, string> = {
  food: 'Food & Drinks',
  shopping: 'Shopping',
  transport: 'Transport',
  entertainment: 'Entertainment',
  other: 'Other',
};

export function calculateCategorySpend(
  transactions: Transaction[],
  category: string,
  startDate: Date,
  endDate: Date
): number {
  return transactions
    .filter(tx => {
      const txDate = new Date(tx.date);
      return tx.categories.includes(category) && txDate >= startDate && txDate < endDate;
    })
    .reduce((sum, tx) => sum + tx.amount, 0);
}

export function getAverageMonthlySpend(
  transactions: Transaction[],
  category: string
): number {
  const now = new Date();
  const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
  
  const categoryTxs = transactions.filter(tx => {
    const txDate = new Date(tx.date);
    return tx.categories.includes(category) && txDate >= threeMonthsAgo;
  });
  
  if (categoryTxs.length === 0) return 0;
  
  const byMonth: Record<string, number> = {};
  categoryTxs.forEach(tx => {
    const d = new Date(tx.date);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    byMonth[key] = (byMonth[key] || 0) + tx.amount;
  });
  
  const months = Object.keys(byMonth).length;
  const total = Object.values(byMonth).reduce((a, b) => a + b, 0);
  
  return months > 0 ? Math.round(total / months) : 0;
}

export function getMerchantAverage(
  transactions: Transaction[],
  merchant: string
): number {
  const merchantTxs = transactions.filter(tx => tx.merchant === merchant);
  if (merchantTxs.length === 0) return 0;
  const total = merchantTxs.reduce((sum, tx) => sum + tx.amount, 0);
  return total / merchantTxs.length;
}

export function getWeeklyTotal(transactions: Transaction[], weekStart: Date): number {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);
  
  return transactions
    .filter(tx => {
      const txDate = new Date(tx.date);
      return txDate >= weekStart && txDate < weekEnd;
    })
    .reduce((sum, tx) => sum + tx.amount, 0);
}

export function getBudgetProgressColor(spent: number, budget: number): string {
  const pct = (spent / budget) * 100;
  if (pct > 100) return 'var(--danger)';
  if (pct >= 75) return 'var(--warning)';
  return 'var(--success)';
}

export function getBudgetProgressBg(spent: number, budget: number): string {
  const pct = (spent / budget) * 100;
  if (pct > 100) return '#FEE2E2';
  if (pct >= 75) return '#FEF3C7';
  return '#DCFCE7';
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/budget.ts
git commit -m "feat: add budget calculation utilities"
```

---

## Task 3: Create Budgets API

**Files:**
- Create: `app/api/budgets/route.ts`

- [ ] **Step 1: Create the budgets API**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/firestore';
import type { Budget } from '@/types';

async function getUserId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  return (session.user as { id: string }).id;
}

export async function GET() {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const db = getDb();
    const budgetsRef = db.collection('users').doc(userId).collection('budgets');
    const snap = await budgetsRef.get();

    const budgets: Budget[] = snap.docs.map(doc => ({
      category: doc.id,
      amount: doc.data().amount || 0,
      period: 'monthly' as const,
      suggestedAmount: doc.data().suggestedAmount,
      isManual: doc.data().isManual || false,
    }));

    return NextResponse.json({ budgets });
  } catch (error) {
    console.error('GET /api/budgets error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { budgets } = body as { budgets: Budget[] };

    if (!Array.isArray(budgets)) {
      return NextResponse.json({ error: 'budgets must be an array' }, { status: 400 });
    }

    const db = getDb();
    const batch = db.batch();
    const budgetsRef = db.collection('users').doc(userId).collection('budgets');

    budgets.forEach(budget => {
      const docRef = budgetsRef.doc(budget.category);
      batch.set(docRef, {
        amount: budget.amount,
        period: 'monthly',
        suggestedAmount: budget.suggestedAmount,
        isManual: budget.isManual,
      }, { merge: true });
    });

    await batch.commit();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('PUT /api/budgets error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/budgets/route.ts
git commit -m "feat: add budgets API endpoint"
```

---

## Task 4: Create BudgetProgress Component

**Files:**
- Create: `components/dashboard/BudgetProgress.tsx`

- [ ] **Step 1: Create BudgetProgress component**

```typescript
import { getBudgetProgressColor, getBudgetProgressBg, CATEGORY_LABELS } from '@/lib/budget';

const fmt = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

interface BudgetProgressProps {
  category: string;
  spent: number;
  budget: number;
  onEdit?: () => void;
}

export function BudgetProgress({ category, spent, budget, onEdit }: BudgetProgressProps) {
  const pct = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
  const color = getBudgetProgressColor(spent, budget);
  const bgColor = getBudgetProgressBg(spent, budget);
  const isOver = spent > budget;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
      padding: '12px 16px',
      background: bgColor,
      borderRadius: 10,
      border: `1px solid ${isOver ? 'var(--danger)' : 'transparent'}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
          {CATEGORY_LABELS[category] || category}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            {fmt(spent)} / {fmt(budget)}
          </span>
          {onEdit && (
            <button
              onClick={onEdit}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--text-muted)', fontSize: 12, padding: 2,
              }}
            >
              ✎
            </button>
          )}
        </div>
      </div>
      <div style={{
        height: 8,
        background: 'var(--border)',
        borderRadius: 999,
        overflow: 'hidden',
      }}>
        <div style={{
          width: `${pct}%`,
          height: '100%',
          background: color,
          borderRadius: 999,
          transition: 'width 0.3s ease',
        }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <span style={{ fontSize: 11, fontWeight: 600, color }}>
          {isOver ? `Over by ${fmt(spent - budget)}` : `${pct.toFixed(0)}% used`}
        </span>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/dashboard/BudgetProgress.tsx
git commit -m "feat: add BudgetProgress component"
```

---

## Task 5: Create BudgetOverview Component

**Files:**
- Create: `components/dashboard/BudgetOverview.tsx`

- [ ] **Step 1: Create BudgetOverview component**

```typescript
import { useState } from 'react';
import type { Budget, Transaction } from '@/types';
import { BudgetProgress } from './BudgetProgress';
import { EditBudgetsModal } from './EditBudgetsModal';
import { getBillingPeriod } from '@/lib/billing-period';

interface BudgetOverviewProps {
  budgets: Budget[];
  transactions: Transaction[];
  onUpdateBudgets: (budgets: Budget[]) => void;
}

export function BudgetOverview({ budgets, transactions, onUpdateBudgets }: BudgetOverviewProps) {
  const [showEditModal, setShowEditModal] = useState(false);

  const { start, end } = getBillingPeriod(new Date(), 1);
  const budgetMap = new Map(budgets.map(b => [b.category, b]));

  const categories = ['food', 'shopping', 'transport', 'entertainment', 'other'];

  return (
    <div className="card fade-up" style={{ padding: '20px 24px' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
      }}>
        <div>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
            Budget Overview
          </h2>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
            This month's spending vs budget
          </p>
        </div>
        <button
          onClick={() => setShowEditModal(true)}
          className="btn btn-ghost"
          style={{ fontSize: 12, padding: '6px 12px' }}
        >
          Edit Budgets
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {categories.map(category => {
          const budget = budgetMap.get(category);
          if (!budget || budget.amount === 0) return null;

          const spent = transactions
            .filter(tx => {
              const txDate = new Date(tx.date);
              return tx.categories.includes(category) && txDate >= start && txDate < end;
            })
            .reduce((sum, tx) => sum + tx.amount, 0);

          return (
            <BudgetProgress
              key={category}
              category={category}
              spent={spent}
              budget={budget.amount}
              onEdit={() => setShowEditModal(true)}
            />
          );
        })}
      </div>

      {budgets.filter(b => b.amount > 0).length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '24px 0',
          color: 'var(--text-muted)',
          fontSize: 13,
        }}>
          No budgets set. Click "Edit Budgets" to set your spending targets.
        </div>
      )}

      {showEditModal && (
        <EditBudgetsModal
          budgets={budgets}
          transactions={transactions}
          onClose={() => setShowEditModal(false)}
          onSave={onUpdateBudgets}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/dashboard/BudgetOverview.tsx
git commit -m "feat: add BudgetOverview component"
```

---

## Task 6: Create EditBudgetsModal Component

**Files:**
- Create: `components/dashboard/EditBudgetsModal.tsx`

- [ ] **Step 1: Create EditBudgetsModal component**

```typescript
import { useState } from 'react';
import type { Budget, Transaction } from '@/types';
import { getAverageMonthlySpend, CATEGORY_LABELS } from '@/lib/budget';

const fmt = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

interface EditBudgetsModalProps {
  budgets: Budget[];
  transactions: Transaction[];
  onClose: () => void;
  onSave: (budgets: Budget[]) => void;
}

export function EditBudgetsModal({ budgets, transactions, onClose, onSave }: EditBudgetsModalProps) {
  const categories = ['food', 'shopping', 'transport', 'entertainment', 'other'];
  const [localBudgets, setLocalBudgets] = useState<Budget[]>(() => {
    const existing = new Map(budgets.map(b => [b.category, b]));
    return categories.map(cat => {
      const existingBudget = existing.get(cat);
      if (existingBudget) return existingBudget;
      
      const suggested = getAverageMonthlySpend(transactions, cat);
      return {
        category: cat,
        amount: suggested,
        period: 'monthly' as const,
        suggestedAmount: suggested,
        isManual: false,
      };
    });
  });

  function handleAmountChange(category: string, value: string) {
    const num = parseInt(value.replace(/[^0-9]/g, ''), 10) || 0;
    setLocalBudgets(prev =>
      prev.map(b =>
        b.category === category
          ? { ...b, amount: num, isManual: num !== b.suggestedAmount }
          : b
      )
    );
  }

  function handleReset(category: string) {
    const suggested = getAverageMonthlySpend(transactions, category);
    setLocalBudgets(prev =>
      prev.map(b =>
        b.category === category
          ? { ...b, amount: suggested, suggestedAmount: suggested, isManual: false }
          : b
      )
    );
  }

  async function handleSave() {
    try {
      const res = await fetch('/api/budgets', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ budgets: localBudgets }),
      });
      if (res.ok) {
        onSave(localBudgets);
        onClose();
      }
    } catch (error) {
      console.error('Failed to save budgets:', error);
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
    }}
    onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: 'var(--bg-surface)', borderRadius: 16, width: '100%', maxWidth: 480,
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
      }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
          <h2 style={{ fontSize: 16, fontWeight: 700 }}>Edit Budgets</h2>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
            Set monthly spending limits for each category
          </p>
        </div>
        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {localBudgets.map(budget => (
            <div key={budget.category} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                  {CATEGORY_LABELS[budget.category] || budget.category}
                </label>
                {budget.suggestedAmount && budget.isManual && (
                  <button
                    onClick={() => handleReset(budget.category)}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: 'var(--accent)', fontSize: 11,
                    }}
                  >
                    Reset to suggested ({fmt(budget.suggestedAmount)})
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Rp</span>
                <input
                  type="text"
                  value={budget.amount.toLocaleString('id-ID')}
                  onChange={(e) => handleAmountChange(budget.category, e.target.value)}
                  style={{
                    flex: 1, padding: '10px 12px', borderRadius: 8,
                    border: '1.5px solid var(--border)', background: 'var(--bg-page)',
                    fontSize: 13, color: 'var(--text-primary)', outline: 'none',
                  }}
                />
              </div>
            </div>
          ))}
        </div>
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <button onClick={onClose} className="btn btn-ghost" style={{ fontSize: 13 }}>
            Cancel
          </button>
          <button onClick={handleSave} className="btn btn-primary" style={{ fontSize: 13 }}>
            Save Budgets
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/dashboard/EditBudgetsModal.tsx
git commit -m "feat: add EditBudgetsModal component"
```

---

## Task 7: Enhance Insights API

**Files:**
- Modify: `app/api/insights/route.ts:1-58`

- [ ] **Step 1: Update generateInsights function with 4 new insight types**

Replace the existing `generateInsights` function with:

```typescript
function generateInsights(transactions: Transaction[], budgets: Budget[]): Partial<Insight>[] {
  const insights: Partial<Insight>[] = [];
  const now = new Date();
  
  const thisWeekStart = new Date(now);
  thisWeekStart.setDate(now.getDate() - now.getDay());
  thisWeekStart.setHours(0, 0, 0, 0);
  
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const thisMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  
  const last4WeeksStart = new Date(thisWeekStart);
  last4WeeksStart.setDate(last4WeeksStart.getDate() - 28);

  // 1. Budget Alert
  const budgetMap = new Map(budgets.map(b => [b.category, b]));
  const monthTxs = transactions.filter(tx => {
    const txDate = new Date(tx.date);
    return txDate >= thisMonthStart && txDate <= thisMonthEnd;
  });

  for (const [category, budget] of budgetMap) {
    if (budget.amount <= 0) continue;
    
    const spent = monthTxs
      .filter(tx => tx.categories.includes(category))
      .reduce((sum, tx) => sum + tx.amount, 0);
    
    const pct = (spent / budget.amount) * 100;
    
    if (spent > budget.amount) {
      insights.push({
        type: 'budget_alert',
        text: `⚠️ ${category} budget exceeded by Rp${((spent - budget.amount) / 1000).toFixed(0)}rb`,
        severity: pct > 150 ? 'high' : 'medium',
        createdAt: new Date(),
        expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
      });
    } else if (pct >= 90) {
      insights.push({
        type: 'budget_alert',
        text: `⚠️ ${category} at ${pct.toFixed(0)}% of budget`,
        severity: 'medium',
        createdAt: new Date(),
        expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
      });
    }
  }

  // 2. Unusual Transaction
  const merchantAvgs = new Map<string, number[]>();
  transactions.forEach(tx => {
    if (!merchantAvgs.has(tx.merchant)) merchantAvgs.set(tx.merchant, []);
    merchantAvgs.get(tx.merchant)!.push(tx.amount);
  });
  
  const merchantAvgMap = new Map<string, number>();
  merchantAvgs.forEach((amounts, merchant) => {
    if (amounts.length >= 3) {
      merchantAvgMap.set(merchant, amounts.reduce((a, b) => a + b, 0) / amounts.length);
    }
  });

  monthTxs.forEach(tx => {
    const avg = merchantAvgMap.get(tx.merchant);
    if (avg && tx.amount > avg * 2) {
      insights.push({
        type: 'unusual_tx',
        text: `📈 ${tx.merchant} charge ${fmt(tx.amount)} (${(tx.amount / avg).toFixed(1)}x your usual)`,
        severity: 'high',
        createdAt: new Date(),
        expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
      });
    }
  });

  // 3. Spike Alert
  const thisWeekTotal = transactions
    .filter(tx => {
      const txDate = new Date(tx.date);
      return txDate >= thisWeekStart && txDate <= now;
    })
    .reduce((sum, tx) => sum + tx.amount, 0);

  const avgWeekly = transactions
    .filter(tx => {
      const txDate = new Date(tx.date);
      return txDate >= last4WeeksStart && txDate < thisWeekStart;
    })
    .reduce((sum, tx) => sum + tx.amount, 0) / 4;

  if (avgWeekly > 0 && thisWeekTotal > avgWeekly * 1.5) {
    insights.push({
      type: 'spike',
      text: `📈 Spending spike: ${fmt(thisWeekTotal)} this week vs ${fmt(avgWeekly)} avg`,
      severity: 'high',
      createdAt: new Date(),
      expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
    });
  }

  // 4. Encouragement
  const dayOfMonth = now.getDate();
  if (dayOfMonth >= 10 && dayOfMonth <= 20) {
    for (const [category, budget] of budgetMap) {
      if (budget.amount <= 0) continue;
      
      const spent = monthTxs
        .filter(tx => tx.categories.includes(category))
        .reduce((sum, tx) => sum + tx.amount, 0);
      
      const pct = (spent / budget.amount) * 100;
      
      if (pct < 60) {
        insights.push({
          type: 'encouragement',
          text: `🎉 ${category} only ${pct.toFixed(0)}% used - saving ${fmt(budget.amount - spent)}!`,
          severity: 'low',
          createdAt: new Date(),
          expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
        });
      }
    }
  }

  return insights;
}
```

- [ ] **Step 2: Update GET handler to fetch budgets**

Replace the GET handler to fetch budgets:

```typescript
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const db = getDb();

  const [txSnap, budgetSnap] = await Promise.all([
    db.collection('users').doc(userId).collection('transactions').orderBy('date', 'desc').get(),
    db.collection('users').doc(userId).collection('budgets').get(),
  ]);

  const transactions: Transaction[] = txSnap.docs.map((doc) => {
    const data = doc.data() as Omit<Transaction, 'id' | 'userId'>;
    return { id: doc.id, userId, ...data };
  });

  const budgets: Budget[] = budgetSnap.docs.map(doc => ({
    category: doc.id,
    amount: doc.data().amount || 0,
    period: 'monthly' as const,
    suggestedAmount: doc.data().suggestedAmount,
    isManual: doc.data().isManual || false,
  }));

  const insights = generateInsights(transactions, budgets);

  return NextResponse.json({ insights });
}
```

- [ ] **Step 3: Add Budget import**

Add Budget to the import from types:
```typescript
import type { Insight, Transaction, Budget } from '@/types';
```

- [ ] **Step 4: Add fmt helper function**

Add at top of file:
```typescript
const fmt = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);
```

- [ ] **Step 5: Commit**

```bash
git add app/api/insights/route.ts
git commit -m "feat: enhance insights with 4 new alert types and budget awareness"
```

---

## Task 8: Integrate into Dashboard Page

**Files:**
- Modify: `app/dashboard/page.tsx:1-700`

- [ ] **Step 1: Add imports**

Add after existing imports:
```typescript
import { BudgetOverview } from '@/components/dashboard/BudgetOverview';
import { getBillingPeriod } from '@/lib/billing-period';
import type { Budget } from '@/types';
```

- [ ] **Step 2: Add budgets state**

Find line with `const [billingStartDay, setBillingStartDay] = useState(1);` and add after:
```typescript
const [budgets, setBudgets] = useState<Budget[]>([]);
```

- [ ] **Step 3: Fetch budgets in loadData**

Find the loadData function and add budgets fetch:
```typescript
const loadData = useCallback(async () => {
  setLoading(true);
  const [txData, insightData, budgetData] = await Promise.all([
    fetch('/api/transactions').then((r) => r.json()),
    fetch('/api/insights').then((r) => r.json()),
    fetch('/api/budgets').then((r) => r.json()),
  ]);
  setTransactions(txData.transactions || []);
  setInsights(insightData.insights || []);
  setBudgets(budgetData.budgets || []);
  setLoading(false);
}, []);
```

- [ ] **Step 4: Add onUpdateBudgets handler**

Add after handleAdd function:
```typescript
function handleUpdateBudgets(newBudgets: Budget[]) {
  setBudgets(newBudgets);
}
```

- [ ] **Step 5: Add BudgetOverview section**

Find the stat cards section ending around line 422, and add after the closing `</div>` of stat cards, before the charts row:

```typescript
{/* ── Budget Overview ── */}
{budgets.filter(b => b.amount > 0).length > 0 && (
  <BudgetOverview
    budgets={budgets}
    transactions={transactions}
    onUpdateBudgets={handleUpdateBudgets}
  />
)}
```

- [ ] **Step 6: Commit**

```bash
git add app/dashboard/page.tsx
git commit -m "feat: integrate budget tracking into dashboard"
```

---

## Verification

- [ ] Run `npm run lint` to verify no linting errors
- [ ] Run `npm run build` to verify TypeScript compilation