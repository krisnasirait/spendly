# Email Deduplication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Track Gmail messageId per transaction to prevent duplicate processing on re-scan.

**Architecture:** Add `messageId` field to Transaction type and use O(1) Set lookup instead of composite key matching.

**Tech Stack:** TypeScript, Firestore, Next.js API routes

---

## File Structure

- Modify: `types/index.ts:1-11` - Add `messageId?: string` field
- Modify: `app/api/emails/scan/route.ts:83-110` - Replace deduplication logic

---

## Task 1: Update Transaction Type

**Files:**
- Modify: `types/index.ts:1-11`

- [ ] **Step 1: Add messageId field to Transaction interface**

```typescript
export interface Transaction {
  id: string;
  userId: string;
  amount: number;
  merchant: string;
  date: string;
  categories: string[];
  source: 'shopee' | 'tokopedia' | 'traveloka' | 'bca' | 'ayo';
  createdAt: string;
  messageId?: string;  // NEW: Gmail's unique message ID
}
```

- [ ] **Step 2: Commit**

```bash
git add types/index.ts
git commit -m "feat: add messageId field to Transaction type"
```

---

## Task 2: Update Deduplication Logic in Scan Endpoint

**Files:**
- Modify: `app/api/emails/scan/route.ts:83-110`

- [ ] **Step 1: Replace composite key deduplication with messageId check**

Find this code (lines 83-110):
```typescript
const existingSnap = await db
  .collection('users')
  .doc(userId)
  .collection('transactions')
  .select('merchant', 'amount', 'date')
  .get();

const existingKeys = new Set(
  existingSnap.docs.map(doc => {
    const d = doc.data() as { merchant: string; amount: number; date: string | Date };
    const dateStr = typeof d.date === 'string' ? d.date.substring(0, 10) : '';
    return `${d.merchant}|${d.amount}|${dateStr}`;
  })
);

const newTransactions: (typeof transactions[0])[] = [];
let duplicates = 0;

for (const tx of transactions) {
  const dateStr = tx.date?.substring(0, 10) || '';
  const key = `${tx.merchant}|${tx.amount}|${dateStr}`;
  if (existingKeys.has(key)) {
    duplicates++;
  } else {
    newTransactions.push(tx);
    existingKeys.add(key);
  }
}
```

Replace with:
```typescript
const existingSnap = await db
  .collection('users')
  .doc(userId)
  .collection('transactions')
  .select('messageId')
  .get();

const existingMessageIds = new Set(
  existingSnap.docs
    .map(doc => doc.data().messageId)
    .filter((id): id is string => typeof id === 'string')
);

const newTransactions: (typeof transactions[0])[] = [];
let duplicates = 0;

for (const tx of transactions) {
  if (existingMessageIds.has(tx.messageId!)) {
    duplicates++;
  } else {
    newTransactions.push(tx);
    existingMessageIds.add(tx.messageId!);
  }
}
```

- [ ] **Step 2: Add messageId when creating transactions**

Find this code (lines 69-74):
```typescript
if (parsed) {
  transactions.push({
    ...parsed,
    source,
    userId,
    createdAt: new Date().toISOString(),
  });
}
```

Replace with:
```typescript
if (parsed) {
  transactions.push({
    ...parsed,
    source,
    userId,
    createdAt: new Date().toISOString(),
    messageId: email.id,
  });
}
```

- [ ] **Step 3: Commit**

```bash
git add app/api/emails/scan/route.ts
git commit -m "feat: use messageId for email deduplication"
```

---

## Verification

- [ ] Run `npm run lint` to verify no linting errors
- [ ] Run `npm run build` to verify TypeScript compilation
