# Bulk Category Edit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add bulk category editing to transaction history - when users select multiple transactions, they can change all their categories at once.

**Architecture:** Single-page modification in history page; uses existing PATCH API to update multiple transactions. Action bar appears when items are selected.

**Tech Stack:** Next.js App Router, TypeScript, existing Firestore API

---

## File Structure

| File | Responsibility |
|------|----------------|
| `app/dashboard/history/page.tsx` | Modify: add action bar, bulk apply function, API call |

---

## Tasks

### Task 1: Add Bulk Action State and Functions

**Files:**
- Modify: `app/dashboard/history/page.tsx`

- [ ] **Step 1: Read current state management section**

Read `app/dashboard/history/page.tsx` lines 40-55 to see the current state declarations.

- [ ] **Step 2: Add bulk category state**

Find where `selected` state is declared (around line 45) and add nearby:

```typescript
const [bulkCategory, setBulkCategory] = useState('');
const [bulkApplying, setBulkApplying] = useState(false);
```

- [ ] **Step 3: Add bulk apply function**

Find where `handleDelete` or similar functions are defined (around line 160-200). Add the bulk apply function:

```typescript
async function handleBulkCategoryChange() {
  if (selected.size === 0 || !bulkCategory) return;
  setBulkApplying(true);
  try {
    const ids = Array.from(selected);
    for (const id of ids) {
      await fetch(`/api/transactions?id=${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, categories: [bulkCategory] }),
      });
    }
    setTransactions(prev =>
      prev.map(tx =>
        selected.has(tx.id) ? { ...tx, categories: [bulkCategory] } : tx
      )
    );
    setSelected(new Set());
    setBulkCategory('');
  } catch (error) {
    console.error('Bulk update failed:', error);
  } finally {
    setBulkApplying(false);
  }
}
```

- [ ] **Step 4: Run type check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add app/dashboard/history/page.tsx
git commit -m "feat: add bulk category state and handler to history page"
```

---

### Task 2: Add Bulk Action Bar UI

**Files:**
- Modify: `app/dashboard/history/page.tsx`

- [ ] **Step 1: Find where to insert the action bar**

Find where the transaction list is rendered (around lines 340-380). The action bar should appear above the list but below the header/filter area.

- [ ] **Step 2: Add the action bar UI**

Insert this JSX before the transaction list rendering:

```tsx
{selected.size > 0 && (
  <div style={{
    position: 'sticky',
    top: 0,
    zIndex: 50,
    padding: '12px 16px',
    background: 'var(--accent)',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    borderRadius: '8px 8px 0 0',
    marginTop: 16,
  }}>
    <span style={{ fontWeight: 600, flex: 1 }}>
      {selected.size} selected
    </span>
    <select
      value={bulkCategory}
      onChange={(e) => setBulkCategory(e.target.value)}
      style={{
        padding: '6px 10px',
        borderRadius: 6,
        border: 'none',
        fontSize: 13,
        color: 'var(--text-primary)',
      }}
    >
      <option value="">Select category...</option>
      <option value="food">Food & Drinks</option>
      <option value="shopping">Shopping</option>
      <option value="transport">Transport</option>
      <option value="entertainment">Entertainment</option>
      <option value="other">Other</option>
    </select>
    <button
      onClick={handleBulkCategoryChange}
      disabled={!bulkCategory || bulkApplying}
      style={{
        padding: '6px 12px',
        borderRadius: 6,
        border: 'none',
        background: bulkCategory ? '#fff' : 'rgba(255,255,255,0.5)',
        color: bulkCategory ? 'var(--accent)' : 'rgba(255,255,255,0.7)',
        fontSize: 13,
        fontWeight: 600,
        cursor: bulkCategory ? 'pointer' : 'not-allowed',
      }}
    >
      {bulkApplying ? 'Applying...' : 'Apply'}
    </button>
    <button
      onClick={() => { setSelected(new Set()); setBulkCategory(''); }}
      style={{
        padding: '6px 12px',
        borderRadius: 6,
        border: '1px solid rgba(255,255,255,0.5)',
        background: 'transparent',
        color: '#fff',
        fontSize: 13,
        cursor: 'pointer',
      }}
    >
      Cancel
    </button>
  </div>
)}
```

- [ ] **Step 3: Run type check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add app/dashboard/history/page.tsx
git commit -m "feat: add bulk category action bar to history page"
```

---

## Verification

1. Navigate to `/dashboard/history`
2. Check 2-5 transactions using the checkboxes
3. Action bar should appear at top showing "N selected" with category dropdown
4. Select a category and click "Apply"
5. All selected transactions should update to the new category
6. Selection should clear after applying
7. TypeScript should compile without errors: `npx tsc --noEmit`