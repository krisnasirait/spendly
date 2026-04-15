# Manual Transaction Verification Design

**Date:** 2026-04-15
**Topic:** Manual transaction verification before saving to history

## Problem

Currently, scanned transactions are immediately saved to the user's transaction history. Users have no opportunity to review, edit, or reject parsed transactions before they appear in their history.

## Solution

Add a setting to enable manual verification. When enabled, scanned transactions go to a "pending" state where users can review, edit, and approve/reject before they enter the main history.

---

## Data Model

### Settings (`users/{userId}/settings/preferences`)

Add field:
```ts
manualVerificationEnabled: boolean;  // default: false
```

### PendingTransaction (`users/{userId}/pendingTransactions/{docId}`)

```ts
interface PendingTransaction {
  merchant: string;
  amount: number;
  date: string;  // ISO date string
  categories: string[];
  source: 'shopee' | 'tokopedia' | 'traveloka' | 'bca' | 'ayo';
  messageId: string;  // Gmail message ID for deduplication
  createdAt: string;  // ISO timestamp when added to pending
  status: 'pending';
}
```

---

## Modified Scan Flow

**File:** `app/api/emails/scan/route.ts`

1. Fetch user's settings from Firestore
2. Check `manualVerificationEnabled`:
   - **false (disabled)**: Save directly to `transactions` collection (current behavior)
   - **true (enabled)**: Save to `pendingTransactions` collection instead
3. When saving to pending, include `messageId` for deduplication

---

## Settings Page

**File:** `app/dashboard/settings/page.tsx`

Add to Scan Settings section:
```
┌─────────────────────────────────────────────┐
│ Enable Manual Verification                   │
│ [ Toggle Switch ]                            │
│                                              │
│ When enabled, scanned transactions go to     │
│ pending page for review before adding to     │
│ history.                                     │
└─────────────────────────────────────────────┘
```

Toggle behavior:
- On toggle change → save settings immediately
- When toggled **OFF**: system auto-approves all pending transactions (moves to `transactions`), then deletes pending documents

---

## Pending Transactions Page

**File:** `app/dashboard/pending/page.tsx`

### Header
- Title: "Pending Transactions"
- Badge showing count: "Pending (3)"
- Empty state if no pending transactions

### Layout (table)

| Date | Merchant | Source | Category | Amount | Actions |
|------|----------|--------|----------|--------|---------|

### Columns

**Date:** Formatted date (e.g., "13 Apr 2026")
**Merchant:** Transaction merchant name
**Source:** Badge with source color (Shopee, Tokopedia, etc.)
**Category:** Category tag
**Amount:** Currency formatted (e.g., "Rp 42.000")
**Actions:**
- Confirm button (green checkmark)
- Edit button (pencil icon)
- Reject button (X icon, red)

### Row Interactions

- **Confirm**: Moves transaction to confirmed history, removes from pending
- **Edit**: Opens modal with editable fields
- **Reject**: Confirmation dialog, then deletes from pending

### Edit Modal

Fields:
- Merchant (text input)
- Amount (number input with Rp formatting)
- Date (date picker)
- Categories (multi-select chips)

Modal buttons: Cancel | Save

### Confirm Action

1. Create new document in `transactions` collection with all transaction fields
2. Delete document from `pendingTransactions`
3. Update UI to remove from list

### Reject Action

1. Show confirmation: "Reject this transaction? It will be permanently deleted."
2. If confirmed → delete from `pendingTransactions`
3. Update UI to remove from list

### Toggle OFF (Auto-Approve)

When user disables manual verification:
1. Fetch all pending transactions
2. For each pending tx:
   - Create identical document in `transactions` collection
   - Delete from `pendingTransactions`
3. Show toast: "X pending transactions have been approved"

---

## API Endpoints

### GET /api/pending

**Request:** None (uses session)
**Response:**
```json
{
  "pendingTransactions": [
    {
      "id": "docId",
      "merchant": "Grab* A-97BNE...",
      "amount": 42000,
      "date": "2026-04-13T11:20:17.000Z",
      "categories": ["transport"],
      "source": "bca",
      "messageId": "gmail-msg-id",
      "createdAt": "2026-04-15T17:11:00.000Z"
    }
  ]
}
```

### POST /api/pending/approve

**Request:**
```json
{ "id": "pendingDocId" }
```
**Response:** `{ "success": true, "transactionId": "newTxId" }`

**Logic:**
1. Fetch pending doc
2. Create new doc in `transactions` with same fields + new ID
3. Delete pending doc

### POST /api/pending/reject

**Request:**
```json
{ "id": "pendingDocId" }
```
**Response:** `{ "success": true }`

**Logic:**
1. Delete pending doc from Firestore

### PATCH /api/pending/{id}

**Request:**
```json
{
  "id": "pendingDocId",
  "merchant": "Updated Merchant",
  "amount": 50000,
  "date": "2026-04-14",
  "categories": ["food", "transport"]
}
```
**Response:** `{ "success": true }`

**Logic:**
1. Update only provided fields on pending doc

### POST /api/settings (modified)

When `manualVerificationEnabled` is set to `false`:
1. Fetch all pending transactions
2. Batch create in `transactions`
3. Batch delete from `pendingTransactions`
4. Return success with count

---

## Navigation

Update sidebar to include:
```
Dashboard
History
Pending Transactions  ← NEW (only show if manualVerificationEnabled is true, or if pending count > 0)
Settings
```

---

## Edge Cases

1. **Empty pending**: Show empty state with message "No pending transactions. When you scan emails, new transactions will appear here for review."
2. **Edit same merchant/amount/date**: Treated as duplicate, only one approved
3. **Concurrent edit**: Last write wins
4. **Toggle off during pending view**: UI updates, all items auto-approved

---

## File Structure

- `app/dashboard/pending/page.tsx` - New pending transactions page
- `app/api/pending/route.ts` - GET pending, POST approve/reject
- `app/api/pending/[id]/route.ts` - PATCH single pending
- `app/api/settings/route.ts` - Add manualVerificationEnabled field, handle auto-approve
- `app/dashboard/settings/page.tsx` - Add toggle UI
- `types/index.ts` - Add PendingTransaction type