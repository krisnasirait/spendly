# Transaction Deduplication Design

## Problem
When scanning emails, transactions are duplicated if the same email is scanned multiple times or if similar transactions exist.

## Solution
Before inserting new transactions, query existing ones and filter duplicates based on:
- **Same merchant**
- **Same amount**
- **Same date** (YYYY-MM-DD string comparison)

## Implementation

### Step 1: Fetch existing transactions
After parsing emails but before batch insert, fetch current user's transactions:
```typescript
const existingSnap = await db
  .collection('users')
  .doc(userId)
  .collection('transactions')
  .select('merchant', 'amount', 'date')
  .get();
```

### Step 2: Build dedup set
Create a Set of `merchant|amount|date` strings from existing transactions:
```typescript
const existingKeys = new Set(
  existingSnap.docs.map(doc => {
    const d = doc.data();
    const dateStr = typeof d.date === 'string' ? d.date.substring(0, 10) : '';
    return `${d.merchant}|${d.amount}|${dateStr}`;
  })
);
```

### Step 3: Filter new transactions
Only push transactions whose key is not in the existing set:
```typescript
if (!existingKeys.has(`${tx.merchant}|${tx.amount}|${tx.date.substring(0, 10)}`)) {
  newTransactions.push(tx);
}
```

### Step 4: Return stats
Include `duplicates: number` in the response so UI can show how many were skipped.

## Changes
- `app/api/emails/scan/route.ts` - Add dedup logic
