# Manual Transaction Add Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add floating action button on dashboard that opens slide-out panel to manually add transactions with merchant, amount, date, and category.

**Architecture:** Create AddTransactionPanel component similar to EditTransactionPanel. Add POST endpoint to transactions API. Add FAB button to dashboard.

**Tech Stack:** Next.js, React, Firestore

---

## File Map

| File | Action |
|------|--------|
| `app/api/transactions/route.ts` | Modify - Add POST handler for manual creation |
| `components/AddTransactionPanel.tsx` | Create - Slide-out form panel |
| `app/dashboard/page.tsx` | Modify - Add FAB button and state |

---

### Task 1: Add POST handler to transactions API

**Files:**
- Modify: `app/api/transactions/route.ts`

- [ ] **Step 1: Read current API**

Read `app/api/transactions/route.ts` to understand current structure.

- [ ] **Step 2: Add POST handler**

Add after the GET handler:

```typescript
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const body = await req.json().catch(() => ({}));
  const { merchant, amount, date, categories, source } = body;

  if (!merchant || typeof merchant !== 'string' || merchant.trim() === '') {
    return NextResponse.json({ error: 'merchant is required' }, { status: 400 });
  }
  if (typeof amount !== 'number' || isNaN(amount) || amount <= 0) {
    return NextResponse.json({ error: 'amount must be a positive number' }, { status: 400 });
  }
  if (!date) {
    return NextResponse.json({ error: 'date is required' }, { status: 400 });
  }
  if (!categories || !Array.isArray(categories)) {
    return NextResponse.json({ error: 'categories must be an array' }, { status: 400 });
  }

  const db = getDb();
  const txRef = db.collection('users').doc(userId).collection('transactions').doc();
  
  await txRef.set({
    merchant: merchant.trim(),
    amount,
    date: new Date(date),
    categories,
    source: source || 'manual',
    userId,
    createdAt: new Date(),
  });

  return NextResponse.json({ id: txRef.id, success: true }, { status: 201 });
}
```

- [ ] **Step 3: TypeScript check**

Run `npx tsc --noEmit`

- [ ] **Step 4: Commit**

```bash
git add app/api/transactions/route.ts
git commit -m "feat(api): add POST handler for manual transaction creation"
```

---

### Task 2: Create AddTransactionPanel component

**Files:**
- Create: `components/AddTransactionPanel.tsx`

- [ ] **Step 1: Create component**

Create `components/AddTransactionPanel.tsx`:

```tsx
'use client';

import { useState, useEffect } from 'react';
import { getCategoryColor } from '@/lib/category-colors';

interface AddTransactionPanelProps {
  onClose: () => void;
  onAdd: (transaction: {
    id: string;
    merchant: string;
    amount: number;
    date: string;
    categories: string[];
    source: string;
  }) => void;
}

interface Category {
  id: string;
  name: string;
}

export default function AddTransactionPanel({ onClose, onAdd }: AddTransactionPanelProps) {
  const [merchant, setMerchant] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [categories, setCategories] = useState<string[]>([]);
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [newCatInput, setNewCatInput] = useState('');
  const [suggestions, setSuggestions] = useState<Category[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/categories')
      .then(r => r.json())
      .then(data => setAllCategories(data.categories || []))
      .catch(() => {});
  }, []);

  function removeCategory(name: string) {
    setCategories(prev => prev.filter(c => c !== name));
  }

  function addCategory(name: string) {
    if (name && !categories.includes(name)) {
      const exists = allCategories.some(c => c.name.toLowerCase() === name.toLowerCase());
      if (!exists) {
        fetch('/api/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name }),
        }).then(async r => {
          if (r.ok) {
            const newCat = await r.json();
            if (newCat?.id) {
              setAllCategories(prev => [...prev, newCat]);
              setCategories(prev => [...prev, newCat.name]);
            }
          }
        }).catch(() => {});
      } else {
        const matched = allCategories.find(c => c.name.toLowerCase() === name.toLowerCase());
        if (matched) setCategories(prev => [...prev, matched.name]);
      }
    }
    setNewCatInput('');
    setSuggestions([]);
    setShowCreate(false);
  }

  function handleInputChange(value: string) {
    setNewCatInput(value);
    if (value.trim()) {
      const filtered = allCategories.filter(c =>
        c.name.toLowerCase().includes(value.toLowerCase()) &&
        !categories.includes(c.name)
      );
      setSuggestions(filtered);
      setShowCreate(filtered.length === 0 && value.trim().length > 0);
    } else {
      setSuggestions([]);
      setShowCreate(false);
    }
  }

  async function handleSave() {
    if (!merchant.trim()) {
      setError('Merchant is required');
      return;
    }
    if (!amount || Number(amount) <= 0) {
      setError('Amount must be greater than 0');
      return;
    }
    if (categories.length === 0) {
      setError('At least one category is required');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merchant: merchant.trim(),
          amount: Number(amount),
          date,
          categories,
          source: 'manual',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        onAdd({
          id: data.id,
          merchant: merchant.trim(),
          amount: Number(amount),
          date,
          categories,
          source: 'manual',
        });
        onClose();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Failed to add transaction');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 40,
      }} />
      <div style={{
        position: 'fixed', right: 0, top: 0, bottom: 0, width: 400,
        background: 'var(--bg-surface)', zIndex: 50,
        boxShadow: '-4px 0 24px rgba(0,0,0,0.15)',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: 16, fontWeight: 700 }}>Add Transaction</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: 'var(--text-muted)' }}>×</button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflow: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Merchant */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Merchant</label>
            <input value={merchant} onChange={e => setMerchant(e.target.value)} placeholder="e.g., Warung Kopi" style={{
              width: '100%', padding: '10px 14px', borderRadius: 10,
              border: '1.5px solid var(--border)', background: 'var(--bg-page)',
              fontSize: 14, color: 'var(--text-primary)', outline: 'none',
            }} />
          </div>

          {/* Amount */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Amount (IDR)</label>
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="e.g., 50000" style={{
              width: '100%', padding: '10px 14px', borderRadius: 10,
              border: '1.5px solid var(--border)', background: 'var(--bg-page)',
              fontSize: 14, color: 'var(--text-primary)', outline: 'none',
            }} />
          </div>

          {/* Date */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{
              width: '100%', padding: '10px 14px', borderRadius: 10,
              border: '1.5px solid var(--border)', background: 'var(--bg-page)',
              fontSize: 14, color: 'var(--text-primary)', outline: 'none',
            }} />
          </div>

          {/* Categories */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Categories</label>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
              {categories.map(cat => {
                const color = getCategoryColor(cat);
                return (
                  <span key={cat} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    padding: '4px 10px', borderRadius: 999, fontSize: 12, fontWeight: 500,
                    background: `${color}20`,
                    color: color,
                  }}>
                    {cat}
                    <button onClick={() => removeCategory(cat)} style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: 'inherit', fontSize: 14, lineHeight: 1, padding: 0,
                    }}>×</button>
                  </span>
                );
              })}
            </div>

            <input
              value={newCatInput}
              onChange={e => handleInputChange(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && showCreate) {
                  e.preventDefault();
                  addCategory(newCatInput.trim());
                }
              }}
              placeholder="Type to add category…"
              style={{
                width: '100%', padding: '10px 14px', borderRadius: 10,
                border: '1.5px solid var(--border)', background: 'var(--bg-page)',
                fontSize: 14, color: 'var(--text-primary)', outline: 'none',
              }}
            />

            {suggestions.length > 0 && (
              <div style={{
                marginTop: 6, borderRadius: 10, border: '1.5px solid var(--border)',
                background: 'var(--bg-surface)', overflow: 'hidden',
              }}>
                {suggestions.map(cat => (
                  <button key={cat.id} onClick={() => addCategory(cat.name)} style={{
                    width: '100%', padding: '10px 14px', background: 'none', border: 'none',
                    textAlign: 'left', cursor: 'pointer', fontSize: 13,
                    color: 'var(--text-primary)', borderBottom: '1px solid var(--border)',
                  }}>
                    {cat.name}
                  </button>
                ))}
              </div>
            )}

            {showCreate && (
              <button onClick={() => addCategory(newCatInput.trim())} style={{
                marginTop: 6, padding: '10px 14px', borderRadius: 10,
                border: '1.5px dashed var(--accent)', background: 'none',
                width: '100%', textAlign: 'left', cursor: 'pointer', fontSize: 13,
                color: 'var(--accent)',
              }}>
                + Create &quot;{newCatInput.trim()}&quot;
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {error && (
            <div style={{ padding: '10px 14px', borderRadius: 8, background: '#FEE2E2', color: '#991B1B', fontSize: 13 }}>
              {error}
            </div>
          )}
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={onClose} className="btn btn-ghost" style={{ flex: 1 }}>Cancel</button>
            <button onClick={handleSave} disabled={saving} className="btn btn-primary" style={{ flex: 1 }}>
              {saving ? 'Adding…' : 'Add Transaction'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/AddTransactionPanel.tsx
git commit -m "feat: add AddTransactionPanel component"
```

---

### Task 3: Add FAB and panel integration to Dashboard

**Files:**
- Modify: `app/dashboard/page.tsx`

- [ ] **Step 1: Import component**

Find imports and add:
```typescript
import AddTransactionPanel from '@/components/AddTransactionPanel';
```

- [ ] **Step 2: Add state**

Find:
```typescript
const [editingTx, setEditingTx] = useState<Transaction | null>(null);
```

Add after:
```typescript
const [showAddPanel, setShowAddPanel] = useState(false);
```

- [ ] **Step 3: Add handleAdd function**

Find `handleSave` function and add after it:
```typescript
function handleAdd(newTx: Transaction) {
  setTransactions(prev => [newTx, ...prev]);
}
```

- [ ] **Step 4: Add FAB button**

Find the return statement, around the end where the EditTransactionPanel is rendered. Add FAB button BEFORE the panel:

```tsx
{/* FAB */}
<button
  onClick={() => setShowAddPanel(true)}
  style={{
    position: 'fixed',
    bottom: 32,
    right: 32,
    width: 56,
    height: 56,
    borderRadius: '50%',
    background: 'var(--accent)',
    color: '#fff',
    border: 'none',
    cursor: 'pointer',
    fontSize: 28,
    boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 30,
  }}
>
  +
</button>

{showAddPanel && (
  <AddTransactionPanel
    onClose={() => setShowAddPanel(false)}
    onAdd={handleAdd}
  />
)}
```

- [ ] **Step 5: TypeScript check**

Run `npx tsc --noEmit`

- [ ] **Step 6: Commit**

```bash
git add app/dashboard/page.tsx
git commit -m "feat(dashboard): add FAB and manual transaction add"
```

---

### Task 4: Verify build

**Files:**
- Verify: Full project

- [ ] **Step 1: TypeScript check**

```bash
npx tsc --noEmit
```

- [ ] **Step 2: Build**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: complete manual transaction add feature"
```

---

## Verification

- [ ] Go to Dashboard
- [ ] Click orange FAB button in bottom-right
- [ ] Add Transaction panel should slide in from right
- [ ] Fill in merchant, amount, date, category
- [ ] Click Add Transaction
- [ ] Panel closes, new transaction appears in recent transactions
