# B2: Bulk Category Edit for Transaction History

## Overview

Add bulk category editing to the transaction history page. When users select multiple transactions, an action bar appears allowing them to change the category for all selected transactions at once.

## Changes

### 1. History Page (`app/dashboard/history/page.tsx`)

**Action Bar (appears when items are selected):**
- Fixed position bar above the transaction list
- Shows: "{count} selected" text
- Category dropdown select
- "Apply" button
- "Cancel/Deselect All" button
- Only visible when `selected.size > 0`

**Category Change Flow:**
1. User checks transactions via existing checkboxes
2. Action bar slides in with category dropdown
3. User selects new category from dropdown
4. User clicks "Apply"
5. API call to update all selected transactions
6. UI updates to reflect new categories
7. Selection clears

**UI Placement:**
- Action bar appears above the filter/search bar, or below the header
- Fixed/sticky positioning so it stays visible while scrolling

### 2. API Changes

**PATCH `/api/transactions`:**
- Already supports batch updates via array of IDs
- May need to enhance to support bulk category update endpoint

**Alternative: New endpoint `PATCH /api/transactions/bulk`**
```typescript
// Request
{ ids: string[], categories: string[] }

// Response
{ success: true, updated: number }
```

### 3. Data Flow

```typescript
// Component state (already exists)
const [selected, setSelected] = useState<Set<string>>(new Set());

// New: Bulk action state
const [bulkCategory, setBulkCategory] = useState('');
const [bulkApplying, setBulkApplying] = useState(false);

// Bulk apply function
async function applyBulkCategory() {
  if (selected.size === 0 || !bulkCategory) return;
  setBulkApplying(true);
  const ids = Array.from(selected);
  // Call API to update all selected transactions with bulkCategory
  // On success: update local state and clear selection
  setSelected(new Set());
  setBulkCategory('');
  setBulkApplying(false);
}
```

### 4. Action Bar UI

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
      onClick={applyBulkCategory}
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
      onClick={() => setSelected(new Set())}
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

## Files to Modify

1. `app/dashboard/history/page.tsx` — Add action bar, bulk apply logic, API call

## Responsive Behavior

- Desktop: Full-width action bar above list
- Mobile: Same sticky bar, slightly compressed but functional

## Implementation Notes

- Use existing PATCH endpoint or add new bulk endpoint
- Optimistically update local state after API success
- Handle errors gracefully (show toast on failure)
- Clear selection after successful apply