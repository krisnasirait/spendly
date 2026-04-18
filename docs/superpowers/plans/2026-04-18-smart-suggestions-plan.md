# C3: Smart Category Suggestions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Suggest category when adding transactions manually based on merchant name history.

**Architecture:** New API endpoint analyzes merchant→category mappings from transaction history; EditTransactionPanel shows suggestion when merchant is entered.

**Tech Stack:** Next.js App Router, React, Firestore

---

## File Structure

| File | Responsibility |
|------|----------------|
| `app/api/merchants/suggest/route.ts` | API - returns suggested category for merchant |
| `components/EditTransactionPanel.tsx` | Modify - add suggestion UI |

---

## Tasks

### Task 1: Create Merchant Suggest API

**Files:**
- Create: `app/api/merchants/suggest/route.ts`

- [ ] **Step 1: Create the API route**

Create `app/api/merchants/suggest/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/firestore';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const { searchParams } = new URL(req.url);
  const merchant = searchParams.get('merchant')?.trim();

  if (!merchant) {
    return NextResponse.json({ suggestion: null });
  }

  const db = getDb();

  const txSnap = await db
    .collection('users').doc(userId)
    .collection('transactions')
    .where('merchant', '==', merchant)
    .get();

  if (txSnap.empty) {
    return NextResponse.json({ suggestion: null });
  }

  const categoryCounts = new Map<string, number>();
  txSnap.docs.forEach(doc => {
    const categories = doc.data().categories || [];
    categories.forEach((cat: string) => {
      categoryCounts.set(cat, (categoryCounts.get(cat) || 0) + 1);
    });
  });

  let topCategory = '';
  let topCount = 0;
  categoryCounts.forEach((count, cat) => {
    if (count > topCount) {
      topCount = count;
      topCategory = cat;
    }
  });

  return NextResponse.json({
    suggestion: topCategory || null,
    count: topCount,
  });
}
```

- [ ] **Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add app/api/merchants/suggest/route.ts
git commit -m "feat: add merchant category suggest API"
```

---

### Task 2: Add Category Suggestion to EditTransactionPanel

**Files:**
- Modify: `components/EditTransactionPanel.tsx`

- [ ] **Step 1: Read EditTransactionPanel to understand structure**

Read `components/EditTransactionPanel.tsx` to find:
- Where merchant input is (around line 100-140)
- Where category selection is (around line 150-180)
- State declarations

- [ ] **Step 2: Add suggestion state and fetch**

Add state:
```typescript
const [categorySuggestion, setCategorySuggestion] = useState<string | null>(null);
```

Add debounced fetch for suggestions. Find the merchant input's onChange and add:

```typescript
onChange={(e) => {
  const value = e.target.value;
  setMerchant(value);
  if (value.length >= 3) {
    clearTimeout(merchantDebounce);
    merchantDebounce = setTimeout(async () => {
      try {
        const res = await fetch(`/api/merchants/suggest?merchant=${encodeURIComponent(value)}`);
        const data = await res.json();
        if (data.suggestion && data.count >= 2) {
          setCategorySuggestion(data.suggestion);
        } else {
          setCategorySuggestion(null);
        }
      } catch {
        setCategorySuggestion(null);
      }
    }, 300);
  } else {
    setCategorySuggestion(null);
  }
}}
```

Note: You'll need to add a ref at the top of the component:
```typescript
const merchantDebounceRef = { current: null as NodeJS.Timeout | null };
// Use merchantDebounceRef.current instead of a plain variable
```

Or simpler - just use a component-level variable:
```typescript
let merchantTimeout: NodeJS.Timeout | null = null;
```

Update merchant input onChange:
```typescript
onChange={(e) => {
  const value = e.target.value;
  setMerchant(value);
  if (merchantTimeout) clearTimeout(merchantTimeout);
  if (value.length >= 3) {
    merchantTimeout = setTimeout(async () => {
      try {
        const res = await fetch(`/api/merchants/suggest?merchant=${encodeURIComponent(value)}`);
        const data = await res.json();
        if (data.suggestion && data.count >= 2) {
          setCategorySuggestion(data.suggestion);
        } else {
          setCategorySuggestion(null);
        }
      } catch {
        setCategorySuggestion(null);
      }
    }, 300);
  } else {
    setCategorySuggestion(null);
  }
}}
```

- [ ] **Step 3: Add suggestion UI below merchant input**

Find where the merchant input ends (around line 130) and add after it:

```tsx
{categorySuggestion && (
  <div style={{
    marginTop: 8,
    padding: '8px 12px',
    background: 'var(--accent-light)',
    borderRadius: 8,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  }}>
    <span style={{ fontSize: 12, color: 'var(--accent)' }}>
      Based on history: {categorySuggestion}
    </span>
    <button
      type="button"
      onClick={() => {
        setCategories([categorySuggestion]);
        setCategorySuggestion(null);
      }}
      style={{
        fontSize: 11,
        padding: '4px 8px',
        borderRadius: 4,
        border: 'none',
        background: 'var(--accent)',
        color: '#fff',
        cursor: 'pointer',
      }}
    >
      Apply
    </button>
  </div>
)}
```

- [ ] **Step 4: Run type check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add components/EditTransactionPanel.tsx
git commit -m "feat: add category suggestion to transaction form"
```

---

## Verification

1. Navigate to `/dashboard/history`
2. Click "Add" or edit a transaction
3. Enter a merchant name that has been used before (at least 2 times with the same category)
4. After 3+ characters, a suggestion should appear: "Based on history: food"
5. Click "Apply" to use the suggested category