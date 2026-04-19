# Mobile-First UX Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Differentiate mobile and desktop layouts throughout the app — stacked cards, bottom sheets, compact headers, larger touch targets — without changing desktop layouts.

**Architecture:** Each page/component uses `useDevice()` hook to detect mobile and applies responsive styles. Components receive `isMobile` prop to switch between side-panel (desktop) and bottom-sheet (mobile) form layouts.

**Tech Stack:** Next.js App Router, React, CSS-in-JS (inline styles), `useDevice()` hook

---

## File Structure

| File | Change |
|------|--------|
| `app/dashboard/page.tsx` | Modify — compact header, 2x2 stat grid, single-col charts |
| `app/dashboard/history/page.tsx` | Modify — stacked transaction cards |
| `app/dashboard/pending/page.tsx` | Modify — stacked pending cards with actions |
| `components/AddTransactionPanel.tsx` | Modify — bottom sheet on mobile |
| `components/EditTransactionPanel.tsx` | Modify — bottom sheet on mobile |
| `app/dashboard/settings/page.tsx` | Modify — stacked layout, larger inputs |
| `components/onboarding/OnboardingTour.tsx` | Modify — mobile-optimized steps |
| Skeleton components | Modify — match stacked card layout |

---

## Tasks

### Task 1: Dashboard Mobile Layout

**Files:**
- Modify: `app/dashboard/page.tsx:410-500` (header area)
- Modify: `app/dashboard/page.tsx:478-500` (stat cards)
- Modify: `app/dashboard/page.tsx:512-530` (content grid)

- [ ] **Step 1: Read current dashboard header area**

Read `app/dashboard/page.tsx` lines 410-475 to understand current header structure.

- [ ] **Step 2: Add isMobile hook call**

The `useDevice()` hook is already imported at line 216. Verify it's there:
```typescript
const { isMobile } = useDevice();
```
If not, add it.

- [ ] **Step 3: Replace pill-group period selector with dropdown on mobile**

Find the period selector div (around lines 432-461) and replace with:

```tsx
{isMobile ? (
  <select
    value={period}
    onChange={(e) => setPeriod(e.target.value as Period)}
    style={{
      padding: '8px 12px',
      borderRadius: 8,
      border: '1.5px solid var(--border)',
      background: 'var(--bg-surface)',
      color: 'var(--text-primary)',
      fontSize: 13,
      fontWeight: 500,
      cursor: 'pointer',
    }}
  >
    <option value="today">Today</option>
    <option value="week">Week</option>
    <option value="month">Month</option>
    <option value="all">All</option>
  </select>
) : (
  <div style={{
    display: 'flex', gap: 2,
    background: 'var(--bg-surface)',
    borderRadius: 'var(--radius-md)',
    padding: 4,
    border: '1px solid var(--border)',
  }}>
    {(['today', 'week', 'month', 'all'] as Period[]).map(p => (
      <button
        key={p}
        onClick={() => setPeriod(p)}
        style={{
          padding: '7px 14px',
          borderRadius: 8,
          border: 'none',
          fontSize: 12,
          fontWeight: 500,
          cursor: 'pointer',
          background: period === p ? 'var(--accent)' : 'transparent',
          color: period === p ? '#fff' : 'var(--text-secondary)',
          transition: 'all 0.15s ease',
        }}
      >
        {p === 'today' ? 'Today' : p === 'week' ? 'Week' : p === 'month' ? 'Month' : 'All'}
      </button>
    ))}
  </div>
)}
```

- [ ] **Step 4: Conditionally stack header elements on mobile**

Read lines 413-476. The header div currently has `display: flex; alignItems: flex-start; justifyContent: space-between`. On mobile, change to:
- greeting + subtitle stacks vertically on left
- period selector + scan button stacks or stays inline on right
- Or wrap: `flexDirection: 'column'` for left side

```tsx
<div style={{
  display: 'flex',
  flexDirection: isMobile ? 'column' : 'row',
  alignItems: isMobile ? 'stretch' : 'flex-start',
  justifyContent: 'space-between',
  gap: isMobile ? 12 : 24,
}}>
```

- [ ] **Step 5: Change stat cards to 2x2 grid on mobile**

Find the stat cards grid (around line 480):
```tsx
<div style={{
  display: 'grid',
  gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(auto-fit, minmax(160px, 1fr))',
  gap: 16,
}}>
```

- [ ] **Step 6: Change content grid to single column on mobile**

Find the main content grid (around line 513):
```tsx
<div style={{
  display: 'grid',
  gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(300px, 1fr))',
  gap: 20,
}}>
```

- [ ] **Step 7: Reduce chart heights on mobile**

Find chart ResponsiveContainer elements. Add `height={isMobile ? 160 : 220}` prop.

- [ ] **Step 8: Reduce page padding on mobile**

Find the main element (around line 411):
```tsx
<main style={{
  padding: isMobile ? '16px 16px 24px' : '28px 32px 48px',
  display: 'flex',
  flexDirection: 'column',
  gap: isMobile ? 16 : 24,
}}>
```

- [ ] **Step 9: Run type check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 10: Commit**

```bash
git add app/dashboard/page.tsx
git commit -m "feat(mobile): compact header, 2x2 stat cards, single-col grid on mobile"
```

---

### Task 2: History — Stacked Transaction Cards

**Files:**
- Modify: `app/dashboard/history/page.tsx:538-648` (table → cards)

- [ ] **Step 1: Read the table rendering section**

Read `app/dashboard/history/page.tsx` lines 538-648 to understand current table structure.

- [ ] **Step 2: Replace table with stacked cards on mobile, keep table on desktop**

Find the entire `<div className="card fade-up" style={{ padding: 0, overflow: 'hidden' }}>` block (around line 539). Replace the rendering logic inside with:

```tsx
<div className="card fade-up" style={{ padding: 0, overflow: 'hidden' }}>
  {paged.length === 0 ? (
    <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
      No transactions match your filters.
    </div>
  ) : isMobile ? (
    /* Mobile: Stacked cards */
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '8px 0' }}>
      {paged.map((tx) => {
        const badge = sourceBadge[tx.source] ?? { label: tx.source, color: '#6B7280', bg: '#F3F4F6' };
        const isSelected = selected.has(tx.id);
        return (
          <div
            key={tx.id}
            onClick={() => setEditingTx(tx)}
            style={{
              padding: '14px 16px',
              background: isSelected ? 'var(--bg-page)' : 'var(--bg-surface)',
              borderLeft: isSelected ? '3px solid var(--accent)' : '3px solid transparent',
              cursor: 'pointer',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleSelect(tx.id)}
                  onClick={(e) => e.stopPropagation()}
                  style={{ cursor: 'pointer', width: 18, height: 18 }}
                />
                <span style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                  {new Date(tx.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                </span>
                {recurringMerchants.has(tx.merchant) && (
                  <span style={{
                    fontSize: 10, padding: '2px 6px', borderRadius: 4,
                    background: 'var(--accent-light)', color: 'var(--accent)',
                  }}>
                    🔄 {recurringMerchants.get(tx.merchant)?.frequency}
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteTransaction(tx.id); }}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--text-muted)', fontSize: 16, padding: 4,
                  }}
                  title="Delete"
                >
                  ×
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setEditingTx(tx); }}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--text-muted)', fontSize: 14, padding: 4,
                  }}
                  title="Edit"
                >
                  ✎
                </button>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>
                  {tx.merchant}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {tx.categories.map(cat => (
                    <span key={cat} style={{
                      display: 'inline-block', padding: '2px 8px', borderRadius: 999,
                      fontSize: 11, fontWeight: 500,
                      background: `${getCategoryColor(cat)}20`,
                      color: getCategoryColor(cat),
                    }}>
                      {categoryLabel[cat] ?? cat}
                    </span>
                  ))}
                  <span style={{
                    display: 'inline-block', padding: '2px 8px', borderRadius: 999,
                    fontSize: 11, fontWeight: 600, background: badge.bg, color: badge.color,
                  }}>
                    {badge.label}
                  </span>
                </div>
              </div>
              <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--danger)', textAlign: 'right' }}>
                -{fmt(tx.amount)}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  ) : (
    /* Desktop: Table */
    <div style={{ overflowX: 'auto' }}>
      <table className="data-table">
        <thead>
          <tr>
            <th style={{ width: 40 }}>
              <input
                type="checkbox"
                checked={paged.length > 0 && selected.size === paged.length}
                onChange={toggleSelectAll}
                style={{ cursor: 'pointer', width: 16, height: 16 }}
              />
            </th>
            <th><SortBtn col="date" label="Date" /></th>
            <th><SortBtn col="merchant" label="Merchant" /></th>
            <th>Source</th>
            <th>Category</th>
            <th style={{ textAlign: 'right' }}><SortBtn col="amount" label="Amount" /></th>
            <th style={{ width: 40 }}></th>
            <th style={{ width: 40 }}></th>
          </tr>
        </thead>
        <tbody>
          {paged.map((tx) => {
            const badge = sourceBadge[tx.source] ?? { label: tx.source, color: '#6B7280', bg: '#F3F4F6' };
            const isSelected = selected.has(tx.id);
            return (
              <tr key={tx.id} onClick={() => setEditingTx(tx)} style={{ background: isSelected ? 'var(--bg-page)' : undefined, cursor: 'pointer' }}>
                <td onClick={() => toggleSelect(tx.id)} style={{ cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelect(tx.id)}
                    style={{ cursor: 'pointer', width: 16, height: 16 }}
                  />
                </td>
                <td style={{ color: 'var(--text-muted)', fontSize: 12, whiteSpace: 'nowrap' }}>
                  {new Date(tx.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                </td>
                <td style={{ fontWeight: 500 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>{tx.merchant}</span>
                    {recurringMerchants.has(tx.merchant) && (
                      <span style={{
                        fontSize: 10, padding: '2px 6px', borderRadius: 4,
                        background: 'var(--accent-light)', color: 'var(--accent)',
                      }}>
                        🔄 {recurringMerchants.get(tx.merchant)?.frequency}
                      </span>
                    )}
                  </div>
                </td>
                <td>
                  <span style={{
                    display: 'inline-block', padding: '3px 10px', borderRadius: 999,
                    fontSize: 11, fontWeight: 600, background: badge.bg, color: badge.color,
                  }}>{badge.label}</span>
                </td>
                <td>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {tx.categories.map(cat => (
                      <span key={cat} style={{
                        display: 'inline-block', padding: '2px 8px', borderRadius: 999,
                        fontSize: 11, fontWeight: 500,
                        background: `${getCategoryColor(cat)}20`,
                        color: getCategoryColor(cat),
                      }}>
                        {categoryLabel[cat] ?? cat}
                      </span>
                    ))}
                  </div>
                </td>
                <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--danger)' }}>
                  -{fmt(tx.amount)}
                </td>
                <td>
                  <button onClick={() => setEditingTx(tx)} style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--text-muted)', fontSize: 14, padding: 4,
                  }} title="Edit">✎</button>
                </td>
                <td>
                  <button
                    onClick={() => deleteTransaction(tx.id)}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: 'var(--text-muted)', fontSize: 16, padding: 4,
                    }}
                    title="Delete"
                  >
                    ×
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  )}
</div>
```

- [ ] **Step 3: Add useDevice import if not present**

Check top of file. Add if missing:
```typescript
import { useDevice } from '@/hooks/useDevice';
```

- [ ] **Step 4: Add isMobile inside the component function**

Add after other state declarations:
```typescript
const { isMobile } = useDevice();
```

- [ ] **Step 5: Reduce page padding on mobile**

Find main element (around line 277) and update padding:
```tsx
<main style={{
  padding: isMobile ? '16px 16px 24px' : '32px 32px 48px',
  display: 'flex',
  flexDirection: 'column',
  gap: isMobile ? 16 : 24,
}}>
```

- [ ] **Step 6: Stack filter bar on mobile**

Find the filter bar container (around line 312). On mobile, change flex direction to column:
```tsx
<div style={{
  display: 'flex',
  flexDirection: isMobile ? 'column' : 'row',
  gap: 10,
  flexWrap: 'wrap',
  alignItems: 'center',
}}>
```

- [ ] **Step 7: Run type check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 8: Commit**

```bash
git add app/dashboard/history/page.tsx
git commit -m "feat(mobile): stacked transaction cards on history page"
```

---

### Task 3: Pending Transactions — Stacked Cards with Actions

**Files:**
- Modify: `app/dashboard/pending/page.tsx`

- [ ] **Step 1: Read the pending page structure**

Read `app/dashboard/pending/page.tsx` to understand current pending card rendering (around lines 140-200).

- [ ] **Step 2: Add useDevice import and hook**

Check imports and add if missing:
```typescript
import { useDevice } from '@/hooks/useDevice';
```

Inside the component function:
```typescript
const { isMobile } = useDevice();
```

- [ ] **Step 3: Find and read the pending card rendering**

Read lines 140-200 to see how pending cards are rendered.

- [ ] **Step 4: Replace with stacked cards on mobile with approve/dismiss buttons**

Find the section that renders pending transactions (inside the main grid/card). Replace the rendering logic with conditional:

```tsx
{isMobile ? (
  /* Mobile: Stacked cards with approve/dismiss */
  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '8px 0' }}>
    {pending.map((tx) => (
      <div key={tx.id} style={{
        padding: 16,
        background: 'var(--bg-surface)',
        borderRadius: 12,
        border: '1px solid var(--border)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {new Date(tx.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
              </span>
            </div>
            <div style={{ fontWeight: 600, fontSize: 15 }}>{tx.merchant}</div>
          </div>
          <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--danger)' }}>
            -{fmt(tx.amount)}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => handleApprove(tx.id)}
            disabled={approving === tx.id}
            style={{
              flex: 1,
              height: 48,
              borderRadius: 8,
              border: 'none',
              background: 'var(--success, #22c55e)',
              color: '#fff',
              fontWeight: 600,
              fontSize: 14,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            {approving === tx.id ? 'Approving…' : '✓ Approve'}
          </button>
          <button
            onClick={() => handleDismiss(tx.id)}
            disabled={dismissing === tx.id}
            style={{
              flex: 1,
              height: 48,
              borderRadius: 8,
              border: '1.5px solid var(--danger)',
              background: 'transparent',
              color: 'var(--danger)',
              fontWeight: 600,
              fontSize: 14,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            {dismissing === tx.id ? 'Dismissing…' : '✗ Dismiss'}
          </button>
        </div>
      </div>
    ))}
  </div>
) : (
  /* Desktop: Existing row layout */
  <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
    /* existing desktop table/card code — keep as-is */
  </div>
)}
```

Note: If the desktop version uses a table structure, replace the entire card section with this conditional. The desktop code should be preserved inside the `:isMobile` block's else branch.

- [ ] **Step 5: Reduce page padding on mobile**

Update main element padding:
```tsx
<main style={{
  padding: isMobile ? '16px 16px 24px' : '32px 32px 48px',
  display: 'flex',
  flexDirection: 'column',
  gap: isMobile ? 16 : 24,
}}>
```

- [ ] **Step 6: Run type check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 7: Commit**

```bash
git add app/dashboard/pending/page.tsx
git commit -m "feat(mobile): stacked pending cards with large approve/dismiss buttons"
```

---

### Task 4: AddTransactionPanel — Bottom Sheet on Mobile

**Files:**
- Modify: `components/AddTransactionPanel.tsx`

- [ ] **Step 1: Read the component**

Read `components/AddTransactionPanel.tsx` to understand its current structure (fixed side panel).

- [ ] **Step 2: Add useDevice import and hook**

```typescript
import { useDevice } from '@/hooks/useDevice';
```

Inside the component:
```typescript
const { isMobile } = useDevice();
```

- [ ] **Step 3: Read the outer container style**

Find the outer container div (around line 140). Currently:
```tsx
<div style={{
  position: 'fixed', right: 0, top: 0, bottom: 0, width: 400,
  background: 'var(--bg-surface)', zIndex: 200,
  display: 'flex', flexDirection: 'column',
  boxShadow: '-4px 0 24px rgba(0,0,0,0.1)',
}}>
```

- [ ] **Step 4: Replace with conditional bottom sheet on mobile, side panel on desktop**

Replace the outer container div style with:

```tsx
<div style={{
  position: 'fixed',
  ...(isMobile
    ? { left: 0, right: 0, bottom: 0, top: 'auto', width: '100%', height: '85vh', borderRadius: '16px 16px 0 0' }
    : { right: 0, top: 0, bottom: 0, width: 400 }),
  background: 'var(--bg-surface)',
  zIndex: 200,
  display: 'flex',
  flexDirection: 'column',
  boxShadow: isMobile ? '0 -4px 24px rgba(0,0,0,0.1)' : '-4px 0 24px rgba(0,0,0,0.1)',
  overflow: isMobile ? 'hidden' : 'auto',
}}>
```

- [ ] **Step 5: Add drag handle for mobile at the top**

Find the header area inside the panel (around line 148) and add drag handle before the h2:

```tsx
{isMobile && (
  <div style={{
    display: 'flex',
    justifyContent: 'center',
    padding: '12px 0 4px',
  }}>
    <div style={{
      width: 36,
      height: 4,
      background: '#ddd',
      borderRadius: 2,
    }} />
  </div>
)}
<h2 style={{ fontSize: 16, fontWeight: 700, padding: isMobile ? '0 16px 8px' : '0 0 8px' }}>
  Add Transaction
</h2>
```

- [ ] **Step 6: Make form inputs taller on mobile (48px height)**

Find all `<input>` and `<select>` elements inside the form. Add conditional style:

```tsx
style={{
  ...existing styles,
  height: isMobile ? 48 : 40,
  fontSize: isMobile ? 15 : 14,
}}
```

- [ ] **Step 7: Make the save button full-width and taller on mobile**

Find the save button (around line 265):

```tsx
<button
  type="button"
  onClick={handleSave}
  disabled={saving}
  style={{
    ...existing styles,
    width: isMobile ? '100%' : 'auto',
    height: isMobile ? 48 : 40,
    borderRadius: isMobile ? 12 : 8,
  }}
>
```

- [ ] **Step 8: Add backdrop click to close on mobile**

Find the backdrop div (around line 138) and update it to close on click for mobile:

```tsx
<div
  onClick={onClose}
  style={{
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.5)',
    zIndex: 199,
    display: 'flex',
    justifyContent: 'flex-end',
  }}
/>
```

- [ ] **Step 9: Run type check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 10: Commit**

```bash
git add components/AddTransactionPanel.tsx
git commit -m "feat(mobile): bottom sheet for add transaction on mobile"
```

---

### Task 5: EditTransactionPanel — Bottom Sheet on Mobile

**Files:**
- Modify: `components/EditTransactionPanel.tsx`

- [ ] **Step 1: Read the component**

Read `components/EditTransactionPanel.tsx`.

- [ ] **Step 2: Add useDevice import and hook**

```typescript
import { useDevice } from '@/hooks/useDevice';
```

Inside the component:
```typescript
const { isMobile } = useDevice();
```

- [ ] **Step 3: Apply the same changes as Task 4 to this file**

Follow Task 4 steps 3-8 for `EditTransactionPanel.tsx`:
- Conditional container style (bottom sheet vs side panel)
- Drag handle for mobile
- Taller inputs on mobile (48px)
- Full-width save button on mobile
- Backdrop click to close on mobile

The structure is similar to AddTransactionPanel — look for the outer fixed div and header.

- [ ] **Step 4: Run type check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add components/EditTransactionPanel.tsx
git commit -m "feat(mobile): bottom sheet for edit transaction on mobile"
```

---

### Task 6: Settings — Mobile-First Redesign

**Files:**
- Modify: `app/dashboard/settings/page.tsx`

- [ ] **Step 1: Read settings page to understand sections**

Read `app/dashboard/settings/page.tsx` lines 490-600 to see current structure.

- [ ] **Step 2: Add useDevice import and hook**

```typescript
import { useDevice } from '@/hooks/useDevice';
```

Inside component:
```typescript
const { isMobile } = useDevice();
```

- [ ] **Step 3: Reduce page padding on mobile**

Find main element (around line 498):
```tsx
<main style={{
  padding: isMobile ? '16px 16px 24px' : '32px',
  maxWidth: isMobile ? '100%' : 640,
  display: 'flex',
  flexDirection: 'column',
  gap: isMobile ? 20 : 24,
}}>
```

- [ ] **Step 4: Stack email source cards on mobile**

Find the email source cards section. On mobile, use `flexDirection: 'column'` instead of grid. Each source card should be full width on mobile.

```tsx
<div style={{
  display: 'flex',
  flexDirection: isMobile ? 'column' : 'row',
  flexWrap: 'wrap',
  gap: 8,
}}>
```

- [ ] **Step 5: Increase input/toggle heights on mobile**

Find all inputs and toggles. Add:
```tsx
style={{
  ...existing,
  height: isMobile ? 48 : 40,
  fontSize: isMobile ? 15 : 14,
}}
```

- [ ] **Step 6: Make danger zone button full-width on mobile**

Find the Delete Account button:
```tsx
<button
  style={{
    ...existing,
    width: isMobile ? '100%' : 'auto',
    height: isMobile ? 48 : 40,
    borderRadius: isMobile ? 12 : 8,
  }}
>
```

- [ ] **Step 7: Run type check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 8: Commit**

```bash
git add app/dashboard/settings/page.tsx
git commit -m "feat(mobile): settings page mobile-first redesign"
```

---

### Task 7: Loading Skeletons — Mobile Optimized

**Files:**
- Modify: All pages with skeleton loaders (dashboard, history, pending, settings)

- [ ] **Step 1: Find all skeleton usages**

Search for skeleton usage across pages:
- `app/dashboard/page.tsx` — SkeletonCards component
- `app/dashboard/history/page.tsx` — skeleton in loading state
- `app/dashboard/pending/page.tsx` — skeleton in loading state

- [ ] **Step 2: Update dashboard SkeletonCards for mobile**

Read the SkeletonCards section in `page.tsx`. Replace with mobile-optimized version:

```tsx
function SkeletonCards() {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
      gap: 16,
    }}>
      {[0, 1, 2, 3].map(i => (
        <div key={i} className="skeleton" style={{
          height: isMobile ? 80 : 88,
          borderRadius: 12,
        }} />
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Update history skeleton for mobile**

Read the skeleton loading state in `app/dashboard/history/page.tsx` (around line 265). For mobile, replace the table-row skeletons with card skeletons:

```tsx
{isMobile ? (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
    {[0, 1, 2, 3, 4].map(i => (
      <div key={i} className="skeleton" style={{ height: 80, borderRadius: 12 }} />
    ))}
  </div>
) : (
  <div className="card">
    {[0, 1, 2, 3, 4].map(i => (
      <div key={i} className="skeleton" style={{ height: 44, marginBottom: 10 }} />
    ))}
  </div>
)}
```

- [ ] **Step 4: Apply same pattern to pending page skeleton**

Read pending page skeleton (around line 145) and apply same mobile/desktop conditional.

- [ ] **Step 5: Run type check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add app/dashboard/page.tsx app/dashboard/history/page.tsx app/dashboard/pending/page.tsx
git commit -m "feat(mobile): skeleton loaders optimized for mobile"
```

---

### Task 8: Onboarding Tour — Mobile Optimized

**Files:**
- Modify: `components/onboarding/OnboardingTour.tsx`

- [ ] **Step 1: Read the OnboardingTour component**

Read `components/onboarding/OnboardingTour.tsx` to understand current structure.

- [ ] **Step 2: Add useDevice import and hook**

```typescript
import { useDevice } from '@/hooks/useDevice';
```

Inside the component:
```typescript
const { isMobile } = useDevice();
```

- [ ] **Step 3: Make navigation buttons full-width and taller on mobile**

Find the Next/Back buttons (usually near the bottom of the component). Apply:

```tsx
<button
  onClick={onNext}
  style={{
    ...existing,
    width: isMobile ? '100%' : 'auto',
    height: isMobile ? 48 : 40,
    padding: isMobile ? '0 24px' : '0 20px',
    fontSize: isMobile ? 16 : 14,
    borderRadius: isMobile ? 12 : 8,
  }}
>
```

- [ ] **Step 4: Make skip button larger tap target on mobile**

Find the Skip button (usually top-right). Apply:
```tsx
style={{
  ...existing,
  padding: isMobile ? '12px 16px' : '8px 12px',
  fontSize: isMobile ? 14 : 12,
}}
```

- [ ] **Step 5: Adjust container/padding for mobile**

Find the main container. On mobile, reduce padding:
```tsx
style={{
  ...existing,
  padding: isMobile ? '24px 20px' : '32px',
  maxWidth: isMobile ? '100%' : 480,
}}
```

- [ ] **Step 6: Make progress dots larger on mobile**

Find progress dots:
```tsx
<div style={{
  display: 'flex',
  gap: isMobile ? 10 : 8,
  justifyContent: 'center',
}}>
  {steps.map((_, i) => (
    <div
      key={i}
      style={{
        width: isMobile ? 12 : 8,
        height: isMobile ? 12 : 8,
        borderRadius: '50%',
        background: i === currentStep ? 'var(--accent)' : '#ddd',
        transition: 'background 0.2s',
      }}
    />
  ))}
</div>
```

- [ ] **Step 7: Run type check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 8: Commit**

```bash
git add components/onboarding/OnboardingTour.tsx
git commit -m "feat(mobile): onboarding tour mobile-optimized"
```

---

## Verification

After all tasks:

1. Run `npx tsc --noEmit` — no errors
2. Start dev server `npm run dev`
3. Open Chrome DevTools → toggle device toolbar → iPhone 12 or similar
4. Test each page:
   - Dashboard: greeting shows, period dropdown works, 2x2 stat cards, stacked charts
   - History: stacked cards, larger text and touch targets
   - Pending: stacked cards with approve/dismiss buttons
   - Add transaction: bottom sheet slides up
   - Edit transaction: bottom sheet slides up
   - Settings: stacked layout, larger inputs
   - Skeleton loading: card-shaped skeletons on mobile
   - Onboarding: full-width buttons, larger dots
5. Switch to desktop view — verify desktop layouts unchanged
