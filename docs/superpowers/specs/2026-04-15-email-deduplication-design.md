# Email Deduplication Design

**Date:** 2026-04-15
**Topic:** Prevent duplicate transactions when scanning emails

## Problem

Currently, the email scanning endpoint uses a composite key (`merchant|amount|date`) to detect duplicates. This approach:
- Loads ALL user transactions into memory (doesn't scale to thousands)
- Uses a heuristic that could incorrectly deduplicate legitimate separate purchases

## Solution

Track Gmail's unique `messageId` per transaction. Use O(1) Set lookup instead of loading all transactions.

## Data Model

Add `messageId?: string` to Transaction type - stores Gmail's unique message ID.

## Changes

### 1. Update Transaction type
**File:** `types/index.ts`
```ts
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

### 2. Update scan endpoint
**File:** `app/api/emails/scan/route.ts`

- Pass `messageId: email.id` when creating transactions
- Replace composite key logic with `existingMessageIds.has(email.id)` check
- Only select `messageId` field from Firestore (not full docs)

## Flow

1. Fetch all existing `messageId` values for user into a Set
2. For each email from Gmail:
   - If `email.id` exists in Set → skip as duplicate
   - Otherwise → parse and add to transactions
3. Save new transactions with their `messageId` values

## Benefits

- O(1) lookup instead of O(n) memory load
- Prevents re-processing even on full re-scan
- No risk of false positive deduplication
- Scales to unlimited transactions
