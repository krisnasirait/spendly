# Per-Category Budget Tracking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add optional per-category monthly budgets with remaining daily budget display on categories page.

**Architecture:** Single page modification to categories page. Budget data stored in Firestore categories collection. Uses existing billing period utility for calculations.

**Tech Stack:** Next.js, React, Firestore

---

## File Map

| File | Action |
|------|--------|
| `app/dashboard/categories/page.tsx` | Modify - Add budget UI to category cards |
| `app/api/categories/route.ts` | Check - Verify PATCH supports budget field |

---

### Task 1: Verify Categories API supports budget field

**Files:**
- Modify: `app/api/categories/route.ts`

- [ ] **Step 1: Check PATCH handler**

Read `app/api/categories/route.ts` PATCH handler. Verify it accepts `budget` field. If not, add it:

Find:
```typescript
const { name } = body;
```

Change to:
```typescript
const { name, budget } = body;
```

And add validation:
```typescript
if (budget !== undefined && (typeof budget !== 'number' || budget < 0)) {
  return NextResponse.json({ error: 'budget must be a non-negative number' }, { status: 400 });
}
```

And add to updates:
```typescript
if (budget !== undefined) updates.budget = budget;
```

- [ ] **Step 2: Commit**

```bash
git add app/api/categories/route.ts
git commit -m "feat(categories): add budget field to PATCH handler"
```

---

### Task 2: Add budget state and helper functions to Categories page

**Files:**
- Modify: `app/dashboard/categories/page.tsx`

- [ ] **Step 1: Add budget state**

Find:
```typescript
const [period, setPeriod] = useState<Period>('month');
const [billingStartDay, setBillingStartDay] = useState(1);
```

Add after:
```typescript
const [editingBudget, setEditingBudget] = useState<string | null>(null);
const [budgetInput, setBudgetInput] = useState('');
```

- [ ] **Step 2: Add budget helpers useMemo**

Add after `selectedTxs` useMemo:

```typescript
const categoryBudgetInfo = useMemo(() => {
  const now = new Date();
  const { start, end } = getBillingPeriod(now, billingStartDay);
  const daysRemaining = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  const info: Record<string, { budget: number; spent: number; daysLeft: number; dailyBudget: number }> = {};
  
  categoryData.forEach(c => {
    const catBudget = categories.find(cat => cat.name === c.key)?.budget;
    const catSpent = byCategory[c.key]?.total || 0;
    info[c.key] = {
      budget: catBudget || 0,
      spent: catSpent,
      daysLeft: daysRemaining,
      dailyBudget: catBudget && catBudget > catSpent && daysRemaining > 0
        ? Math.round((catBudget - catSpent) / daysRemaining)
        : 0,
    };
  });
  
  return info;
}, [categoryData, categories, byCategory, billingStartDay]);
```

- [ ] **Step 3: Add saveBudget function**

Add before the `if (status === 'loading')` block:

```typescript
async function saveBudget(categoryName: string, budget: number | null) {
  const category = categories.find(c => c.name === categoryName);
  if (!category) return;
  
  try {
    const res = await fetch(`/api/categories?id=${category.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ budget: budget ?? null }),
    });
    if (res.ok) {
      setCategories(prev => prev.map(c => c.id === category.id ? { ...c, budget: budget ?? undefined } : c));
    }
  } catch {} finally {
    setEditingBudget(null);
    setBudgetInput('');
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add app/dashboard/categories/page.tsx
git commit -m "feat(categories): add budget state and helper functions"
```

---

### Task 3: Update category cards with budget progress

**Files:**
- Modify: `app/dashboard/categories/page.tsx`

- [ ] **Step 1: Update category card rendering**

Find the category card rendering (inside `categoryData.map`). Update to show budget progress:

Find:
```typescript
<p style={{ fontSize: 11, color: active ? 'rgba(255,255,255,0.65)' : 'var(--text-muted)', marginTop: 5 }}>
  {pct.toFixed(1)}% of total
</p>
```

Change to:
```typescript
{info.budget > 0 ? (
  <>
    <p style={{ fontSize: 11, color: active ? 'rgba(255,255,255,0.65)' : 'var(--text-muted)', marginTop: 5 }}>
      {fmtShort(info.spent)} / {fmtShort(info.budget)}
    </p>
    <div style={{ marginTop: 4, height: 3, borderRadius: 999, background: active ? 'rgba(255,255,255,0.25)' : 'var(--border)' }}>
      <div style={{
        height: '100%', borderRadius: 999,
        width: `${Math.min(100, (info.spent / info.budget) * 100)}%`,
        background: info.spent > info.budget ? 'var(--danger)' : (active ? '#fff' : color),
      }} />
    </div>
  </>
) : (
  <p style={{ fontSize: 11, color: active ? 'rgba(255,255,255,0.65)' : 'var(--text-muted)', marginTop: 5 }}>
    {pct.toFixed(1)}% of total
  </p>
)}
```

**Note:** You need to extract `info` for each card. Make sure `const info = categoryBudgetInfo[key];` is available in the map callback.

- [ ] **Step 2: Commit**

```bash
git add app/dashboard/categories/page.tsx
git commit -m "feat(categories): show budget progress on category cards"
```

---

### Task 4: Replace drill-down with budget UI

**Files:**
- Modify: `app/dashboard/categories/page.tsx`

- [ ] **Step 1: Find and replace drill-down section**

Find the drill-down table section (starts around `selected && selectedTxs.length > 0`). Replace the entire section with:

```typescript
{selected && selectedTxs.length > 0 && (
  <div className="card fade-up" style={{ padding: 0, overflow: 'hidden' }}>
    <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div>
        <h2 style={{ fontSize: 15, fontWeight: 700 }}>
          {categoryData.find(c => c.key === selected)?.emoji}{' '}
          {categoryData.find(c => c.key === selected)?.label}
        </h2>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
          {selectedTxs.length} transactions · {fmt(selectedTxs.reduce((s, t) => s + t.amount, 0))}
        </p>
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        {editingBudget === selected ? (
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input
              type="number"
              placeholder="Budget (Rp)"
              value={budgetInput}
              onChange={e => setBudgetInput(e.target.value)}
              style={{
                padding: '6px 10px', borderRadius: 8,
                border: '1.5px solid var(--border)', background: 'var(--bg-page)',
                fontSize: 13, width: 120,
              }}
            />
            <button
              onClick={() => {
                const val = budgetInput.trim();
                saveBudget(selected, val ? Number(val) : null);
              }}
              className="btn btn-primary"
              style={{ padding: '6px 12px', fontSize: 12 }}
            >
              Save
            </button>
            <button
              onClick={() => { setEditingBudget(null); setBudgetInput(''); }}
              className="btn btn-ghost"
              style={{ padding: '6px 12px', fontSize: 12 }}
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => {
              const cat = categories.find(c => c.name === selected);
              setBudgetInput(cat?.budget?.toString() || '');
              setEditingBudget(selected);
            }}
            style={{
              background: 'var(--bg-page)', border: '1px solid var(--border)',
              borderRadius: 8, padding: '6px 12px', cursor: 'pointer',
              fontSize: 12, color: 'var(--text-secondary)',
            }}
          >
            {categoryBudgetInfo[selected]?.budget > 0 ? 'Edit Budget' : 'Set Budget'}
          </button>
        )}
        <button onClick={() => setSelected(null)} style={{
          background: 'var(--bg-page)', border: '1px solid var(--border)',
          borderRadius: 8, width: 28, height: 28, cursor: 'pointer',
          fontSize: 16, color: 'var(--text-muted)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>×</button>
      </div>
    </div>

    {editingBudget === selected ? null : (
      categoryBudgetInfo[selected]?.budget > 0 ? (
        <div style={{ padding: 24 }}>
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                Spent: {fmt(categoryBudgetInfo[selected].spent)} of {fmt(categoryBudgetInfo[selected].budget)}
              </span>
              <span style={{ fontSize: 13, fontWeight: 600 }}>
                {Math.round((categoryBudgetInfo[selected].spent / categoryBudgetInfo[selected].budget) * 100)}%
              </span>
            </div>
            <div style={{ height: 8, borderRadius: 999, background: 'var(--border)' }}>
              <div style={{
                height: '100%', borderRadius: 999,
                width: `${Math.min(100, (categoryBudgetInfo[selected].spent / categoryBudgetInfo[selected].budget) * 100)}%`,
                background: categoryBudgetInfo[selected].spent > categoryBudgetInfo[selected].budget ? 'var(--danger)' : 'var(--success)',
                transition: 'width 0.3s ease',
              }} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 24 }}>
            <div>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>Days remaining</p>
              <p style={{ fontSize: 18, fontWeight: 700 }}>{categoryBudgetInfo[selected].daysLeft}</p>
            </div>
            <div>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>Daily budget left</p>
              <p style={{ fontSize: 18, fontWeight: 700, color: categoryBudgetInfo[selected].dailyBudget < 0 ? 'var(--danger)' : 'var(--text-primary)' }}>
                {categoryBudgetInfo[selected].dailyBudget > 0 ? fmtShort(categoryBudgetInfo[selected].dailyBudget) : 'No budget'}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>
          <p style={{ fontSize: 13 }}>No budget set for this category</p>
          <p style={{ fontSize: 12, marginTop: 4 }}>Click "Set Budget" to track your spending</p>
        </div>
      )
    )}

    {editingBudget !== selected && (
      <div style={{ overflowX: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Merchant</th>
              <th>Source</th>
              <th style={{ textAlign: 'right' }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {selectedTxs.map((tx) => (
              <tr key={tx.id}>
                <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                  {new Date(tx.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                </td>
                <td style={{ fontWeight: 500 }}>{tx.merchant}</td>
                <td style={{ color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{tx.source}</td>
                <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--danger)' }}>
                  -{fmt(tx.amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </div>
)}
```

- [ ] **Step 2: Commit**

```bash
git add app/dashboard/categories/page.tsx
git commit -m "feat(categories): add budget UI replacing drill-down"
```

---

### Task 5: Verify build

**Files:**
- Verify: `app/dashboard/categories/page.tsx`

- [ ] **Step 1: Run TypeScript check**

```bash
npx tsc --noEmit
```

- [ ] **Step 2: Run build**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(categories): complete per-category budget tracking feature"
```

---

## Verification

- [ ] Go to Categories page
- [ ] Click a category → should show budget UI
- [ ] Click "Set Budget" → should show input
- [ ] Enter budget and Save → should update
- [ ] Verify days remaining and daily budget display correctly
- [ ] Verify budget progress bar shows correctly
