# Transaction Edit & Multi-Category Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add inline transaction editing via slide-out panel, support multiple categories per transaction, and allow users to manage categories from within the edit panel.

**Architecture:** Store user categories in `users/{userId}/categories/` Firestore collection. Default categories seeded on first scan. Transaction `category` field becomes `categories: string[]`. Slide-out panel fetched categories on open.

**Tech Stack:** Next.js App Router, Firestore, NextAuth, React state

---

## File Map

### New Files
- `app/api/categories/route.ts` - GET/POST/DELETE categories
- `components/EditTransactionPanel.tsx` - Slide-out edit panel

### Modified Files
- `types/index.ts` - Update Transaction and Category types
- `app/api/transactions/route.ts` - Add PATCH handler, update GET response
- `app/api/emails/scan/route.ts` - Seed default categories on first scan, return categories array
- `app/dashboard/history/page.tsx` - Add edit trigger, multi-category chips, edit panel integration
- `app/dashboard/page.tsx` - Update byCategory computation for multi-category
- `app/dashboard/categories/page.tsx` - Fetch from Firestore instead of hardcoded

---

## Task 1: Update Types

**Files:**
- Modify: `types/index.ts`

- [ ] **Step 1: Update Transaction and Category types**

```typescript
export interface Category {
  id: string;
  userId: string;
  name: string;
  createdAt: Date;
}

export interface Transaction {
  id: string;
  userId: string;
  amount: number;
  merchant: string;
  date: Date;
  categories: string[];  // was: category: Category
  source: 'shopee' | 'tokopedia' | 'traveloka' | 'bca';
  createdAt: Date;
}
```

- [ ] **Step 2: Commit**

```bash
git add types/index.ts
git commit -m "feat: update types for multi-category support"
```

---

## Task 2: Create Categories API

**Files:**
- Create: `app/api/categories/route.ts`

- [ ] **Step 1: Create categories API with GET, POST, DELETE handlers**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/firestore';

async function getUserId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  return (session.user as { id: string }).id;
}

export async function GET() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = getDb();
  const snap = await db.collection('users').doc(userId).collection('categories').get();
  const categories = snap.docs.map(d => ({ id: d.id, ...d.data(), createdAt: d.data().createdAt?.toDate?.()?.toISOString() ?? null }));
  return NextResponse.json({ categories });
}

export async function POST() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await new NextRequest('http://localhost').json().catch(() => ({}));
  // Actually read from the request properly below — fix:
  return NextResponse.json({ error: 'use request param' }, { status: 500 });
}
```

Wait — write it properly:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/firestore';

async function getUserId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  return (session.user as { id: string }).id;
}

export async function GET() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = getDb();
  const snap = await db.collection('users').doc(userId).collection('categories').get();
  const categories = snap.docs.map(d => {
    const data = d.data();
    return {
      id: d.id,
      name: data.name,
      createdAt: data.createdAt?.toDate?.()?.toISOString() ?? null,
    };
  });
  return NextResponse.json({ categories });
}

export async function POST(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { name } = body;

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }

  const normalized = name.trim().toLowerCase();
  const db = getDb();

  // Check duplicate
  const existing = await db.collection('users').doc(userId).collection('categories')
    .where('name', '==', normalized).get();
  if (!existing.empty) {
    return NextResponse.json({ error: 'Category already exists' }, { status: 409 });
  }

  const docRef = db.collection('users').doc(userId).collection('categories').doc();
  await docRef.set({ name: normalized, createdAt: new Date() });

  return NextResponse.json({ id: docRef.id, name: normalized, createdAt: new Date().toISOString() }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const db = getDb();

  // Check if category is in use
  const inUse = await db.collection('users').doc(userId).collection('transactions')
    .where('categories', 'array-contains', id).get();
  if (!inUse.empty) {
    return NextResponse.json({ error: 'Category is in use by transactions' }, { status: 409 });
  }

  await db.collection('users').doc(userId).collection('categories').doc(id).delete();
  return NextResponse.json({ success: true });
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/categories/route.ts
git commit -m "feat: add categories API (GET, POST, DELETE)"
```

---

## Task 3: Update Transactions API (Add PATCH)

**Files:**
- Modify: `app/api/transactions/route.ts`

- [ ] **Step 1: Add PATCH handler after DELETE handler (around line 81)**

```typescript
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const body = await req.json();
  const { id, merchant, amount, date, categories } = body;

  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const updates: Record<string, unknown> = {};
  if (merchant !== undefined) updates.merchant = merchant;
  if (amount !== undefined) updates.amount = amount;
  if (date !== undefined) updates.date = new Date(date);
  if (categories !== undefined) {
    if (!Array.isArray(categories)) return NextResponse.json({ error: 'categories must be array' }, { status: 400 });
    updates.categories = categories;
  }

  const db = getDb();
  await db.collection('users').doc(userId).collection('transactions').doc(id).update(updates);

  return NextResponse.json({ success: true });
}
```

- [ ] **Step 2: Update GET handler to return `categories` array instead of `category`**

In the GET handler, change line 40-46 to map `data.categories` instead of `data.category`. The existing code already handles date conversion. Just change the field mapping:

```typescript
// Change this line:
category: data.category,

// To:
categories: data.categories || [],
```

Also update the Transaction mapping at line 42 from `category: data.category` to `categories: data.categories || []`.

- [ ] **Step 3: Commit**

```bash
git add app/api/transactions/route.ts
git commit -m "feat: add PATCH transaction and support categories array"
```

---

## Task 4: Update Scan API to Seed Default Categories

**Files:**
- Modify: `app/api/emails/scan/route.ts`

- [ ] **Step 1: Add category seeding logic after db init, before the email loop**

After line 73 (`const db = getDb();`), add:

```typescript
// Seed default categories if none exist
const catsSnap = await db.collection('users').doc(userId).collection('categories').get();
if (catsSnap.empty) {
  const defaultCats = ['food', 'shopping', 'transport', 'entertainment', 'other'];
  const batch = db.batch();
  defaultCats.forEach(name => {
    const docRef = db.collection('users').doc(userId).collection('categories').doc();
    batch.set(docRef, { name, createdAt: new Date() });
  });
  await batch.commit();
}
```

Also update the transaction push to use `categories` array instead of `category` field. Change lines 60-66 from:
```typescript
transactions.push({
  ...parsed,
  source,
  userId,
  createdAt: new Date(),
  emailId: email.id,
});
```
to:
```typescript
transactions.push({
  ...parsed,
  source,
  userId,
  createdAt: new Date(),
  emailId: email.id,
  categories: [parsed.category || 'other'],
});
```
And change the response mapping at line 103-110 to return `categories` instead of `category`.

- [ ] **Step 2: Commit**

```bash
git add app/api/emails/scan/route.ts
git commit -m "feat: seed default categories on first scan and use categories array"
```

---

## Task 5: Create EditTransactionPanel Component

**Files:**
- Create: `components/EditTransactionPanel.tsx`

- [ ] **Step 1: Write the slide-out panel component**

```tsx
'use client';

import { useState, useEffect } from 'react';
import type { Transaction } from '@/types';

interface Category {
  id: string;
  name: string;
}

interface EditTransactionPanelProps {
  transaction: Transaction;
  onClose: () => void;
  onSave: (updated: Transaction) => void;
}

const categoryColors: Record<string, string> = {
  food: '#7C6CF8', shopping: '#A78BFA', transport: '#60A5FA',
  entertainment: '#F472B6', other: '#94A3B8',
};

export default function EditTransactionPanel({ transaction, onClose, onSave }: EditTransactionPanelProps) {
  const [merchant, setMerchant] = useState(transaction.merchant);
  const [amount, setAmount] = useState(transaction.amount);
  const [date, setDate] = useState(new Date(transaction.date).toISOString().split('T')[0]);
  const [categories, setCategories] = useState<string[]>(transaction.categories || []);
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [newCatInput, setNewCatInput] = useState('');
  const [suggestions, setSuggestions] = useState<Category[]>([]);
  const [saving, setSaving] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    fetch('/api/categories')
      .then(r => r.json())
      .then(data => setAllCategories(data.categories || []));
  }, []);

  function removeCategory(name: string) {
    setCategories(prev => prev.filter(c => c !== name));
  }

  function addCategory(name: string) {
    if (name && !categories.includes(name)) {
      setCategories(prev => [...prev, name]);
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
    setSaving(true);
    try {
      const res = await fetch('/api/transactions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: transaction.id, merchant, amount, date, categories }),
      });
      if (res.ok) {
        onSave({ ...transaction, merchant, amount, date: new Date(date), categories });
        onClose();
      }
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
          <h2 style={{ fontSize: 16, fontWeight: 700 }}>Edit Transaction</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: 'var(--text-muted)' }}>×</button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflow: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Merchant */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Merchant</label>
            <input value={merchant} onChange={e => setMerchant(e.target.value)} style={{
              width: '100%', padding: '10px 14px', borderRadius: 10,
              border: '1.5px solid var(--border)', background: 'var(--bg-page)',
              fontSize: 14, color: 'var(--text-primary)', outline: 'none',
            }} />
          </div>

          {/* Amount */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Amount (IDR)</label>
            <input type="number" value={amount} onChange={e => setAmount(Number(e.target.value))} style={{
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

            {/* Current category chips */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
              {categories.map(cat => (
                <span key={cat} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  padding: '4px 10px', borderRadius: 999, fontSize: 12, fontWeight: 500,
                  background: `${categoryColors[cat] || '#94A3B8'}20`,
                  color: categoryColors[cat] || '#94A3B8',
                }}>
                  {cat}
                  <button onClick={() => removeCategory(cat)} style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'inherit', fontSize: 14, lineHeight: 1, padding: 0,
                  }}>×</button>
                </span>
              ))}
            </div>

            {/* Add category input */}
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

            {/* Suggestions */}
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

            {/* Create new option */}
            {showCreate && (
              <button onClick={() => addCategory(newCatInput.trim())} style={{
                marginTop: 6, padding: '10px 14px', borderRadius: 10,
                border: '1.5px dashed var(--accent)', background: 'none',
                width: '100%', textAlign: 'left', cursor: 'pointer', fontSize: 13,
                color: 'var(--accent)',
              }}>
                + Create "{newCatInput.trim()}"
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', gap: 10 }}>
          <button onClick={onClose} className="btn btn-ghost" style={{ flex: 1 }}>Cancel</button>
          <button onClick={handleSave} disabled={saving} className="btn btn-primary" style={{ flex: 1 }}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/EditTransactionPanel.tsx
git commit -m "feat: add EditTransactionPanel slide-out component"
```

---

## Task 6: Update History Page

**Files:**
- Modify: `app/dashboard/history/page.tsx`

- [ ] **Step 1: Add state for edit panel and import the component**

Add to imports (line 6):
```tsx
import EditTransactionPanel from '@/components/EditTransactionPanel';
```

Add state after line 39:
```tsx
const [editingTx, setEditingTx] = useState<Transaction | null>(null);
```

- [ ] **Step 2: Update category display in table to show chips**

Change the category cell (lines 295-297) from:
```tsx
<td style={{ color: 'var(--text-secondary)' }}>
  {categoryLabel[tx.category] ?? tx.category}
</td>
```
To:
```tsx
<td>
  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
    {(tx.categories || [tx.category]).map(cat => (
      <span key={cat} style={{
        display: 'inline-block', padding: '2px 8px', borderRadius: 999,
        fontSize: 11, fontWeight: 500,
        background: `${categoryColors[cat] || '#94A3B8'}20`,
        color: categoryColors[cat] || '#94A3B8',
      }}>
        {categoryLabel[cat] ?? cat}
      </span>
    ))}
  </div>
</td>
```

Add `categoryColors` (line 28-31) to the file if not present.

Also update the `categoryLabel` reference in the filter select (line 230) to use `cat.name` from dynamic data.

- [ ] **Step 3: Make row clickable to open edit panel and add edit button**

Add click handler to row to call `setEditingTx(tx)`. Change the `<tr>` at line 276 to include `onClick`.

Add edit button column (before delete column):
```tsx
<td>
  <button onClick={() => setEditingTx(tx)} style={{
    background: 'none', border: 'none', cursor: 'pointer',
    color: 'var(--text-muted)', fontSize: 14, padding: 4,
  }} title="Edit">✎</button>
</td>
```

- [ ] **Step 4: Wire up edit panel with onSave handler**

Add before the final `return`:
```tsx
function handleSave(updated: Transaction) {
  setTransactions(prev => prev.map(t => t.id === updated.id ? updated : t));
}
```

Add panel rendering inside the return (before closing `</main>`):
```tsx
{editingTx && (
  <EditTransactionPanel
    transaction={editingTx}
    onClose={() => setEditingTx(null)}
    onSave={handleSave}
  />
)}
```

- [ ] **Step 5: Commit**

```bash
git add app/dashboard/history/page.tsx
git commit -m "feat: add edit panel to history page"
```

---

## Task 7: Update Dashboard Page for Multi-Category

**Files:**
- Modify: `app/dashboard/page.tsx`

- [ ] **Step 1: Update `byCategory` computation for multi-category**

Change lines 192-196 from:
```tsx
const byCategory = useMemo(() => {
  const map: Record<string, number> = {};
  transactions.forEach((t) => { map[t.category] = (map[t.category] ?? 0) + t.amount; });
  return Object.entries(map).map(([cat, total]) => ({ cat, total }));
}, [transactions]);
```
To:
```tsx
const byCategory = useMemo(() => {
  const map: Record<string, number> = {};
  transactions.forEach((t) => {
    const cats = t.categories || [t.category];
    cats.forEach(cat => { map[cat] = (map[cat] ?? 0) + t.amount; });
  });
  return Object.entries(map).map(([cat, total]) => ({ cat, total }));
}, [transactions]);
```

- [ ] **Step 2: Update recent transactions table category cell**

Change line 424-425 from:
```tsx
<td style={{ color: 'var(--text-secondary)' }}>
  {categoryLabel[tx.category] ?? tx.category}
</td>
```
To:
```tsx
<td>
  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
    {(tx.categories || [tx.category]).map(cat => (
      <span key={cat} style={{
        display: 'inline-block', padding: '2px 6px', borderRadius: 999,
        fontSize: 10, fontWeight: 500,
        background: `${categoryColors[cat] || '#94A3B8'}20`,
        color: categoryColors[cat] || '#94A3B8',
      }}>
        {categoryLabel[cat] ?? cat}
      </span>
    ))}
  </div>
</td>
```

- [ ] **Step 3: Add categoryColors to the file**

The `categoryColors` is already defined at line 28-31.

- [ ] **Step 4: Commit**

```bash
git add app/dashboard/page.tsx
git commit -m "feat: support multi-category in dashboard charts and recent transactions"
```

---

## Task 8: Update Categories Page for Dynamic Data

**Files:**
- Modify: `app/dashboard/categories/page.tsx`

- [ ] **Step 1: Add state and fetch for categories from Firestore**

After line 30, add:
```tsx
const [categories, setCategories] = useState<Category[]>([]);
```

Add fetch inside the session user effect (after line 46):
```tsx
fetch('/api/categories')
  .then(r => r.json())
  .then(data => setCategories(data.categories || []));
```

Update the `categories` const (line 18-24) to be derived dynamically:
```tsx
const categoryData = useMemo(() => {
  return categories.length > 0
    ? categories.map((c, i) => ({
        key: c.name,
        label: c.name.charAt(0).toUpperCase() + c.name.slice(1),
        emoji: emojis[i % emojis.length],
        color: colors[i % colors.length],
      }))
    : defaultCategories;
}, [categories]);

const emojis = ['🍜', '🛍️', '🚗', '🎬', '📦'];
const colors = ['#7C6CF8', '#A78BFA', '#60A5FA', '#F472B6', '#94A3B8'];
const defaultCategories = [
  { key: 'food', label: 'Food & Drinks', emoji: '🍜', color: '#7C6CF8' },
  { key: 'shopping', label: 'Shopping', emoji: '🛍️', color: '#A78BFA' },
  { key: 'transport', label: 'Transport', emoji: '🚗', color: '#60A5FA' },
  { key: 'entertainment', label: 'Entertainment', emoji: '🎬', color: '#F472B6' },
  { key: 'other', label: 'Other', emoji: '📦', color: '#94A3B8' },
];
```

Update references to `categories` in the JSX to use `categoryData`.

- [ ] **Step 2: Update `selectedTxs` filter to use `categories` array**

Change line 65 from:
```tsx
selected ? transactions.filter(t => t.category === selected)
```
To:
```tsx
selected ? transactions.filter(t => (t.categories || [t.category]).includes(selected))
```

- [ ] **Step 3: Commit**

```bash
git add app/dashboard/categories/page.tsx
git commit -m "feat: fetch categories from Firestore dynamically"
```

---

## Self-Review Checklist

- [ ] Spec coverage: All 7 spec requirements mapped to tasks
- [ ] No placeholders: All code is complete
- [ ] Type consistency: `categories: string[]` used consistently across API and UI
- [ ] Parser changes needed? Scan API creates `categories: [parsed.category || 'other']` which maintains backward compat
