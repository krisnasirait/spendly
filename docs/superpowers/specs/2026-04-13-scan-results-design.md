# Manual Scan Results Display — Spendly Settings

## Overview

After clicking "Scan Now" in the Settings page, users see both the raw emails found AND the parsed transactions — giving full transparency into what was scanned and how it was processed.

## Layout Change

The Manual Scan section expands after scanning to show results inline below the "Scan Now" button (toast notifications removed for scan results — replaced with inline display).

## Scan Results Display

### 1. Scan Summary (always visible at top of results)
- **Total emails found**: count
- **Emails parsed into transactions**: count
- **Breakdown by source**: list with counts (Shopee: 5, Tokopedia: 3, Traveloka: 2, BCA: 1)

### 2. Emails Found Section (collapsible, default expanded)
Each email card shows:
- Subject line
- From address
- Date
- Snippet/preview text
- Source badge (Shopee/Tokopedia/Traveloka/BCA) with brand colors

Source badge colors:
- Shopee: `#EE4D2D` (orange-red)
- Tokopedia: `#03AC0E` (green)
- Traveloka: `#0064D2` (blue)
- BCA: `#005BAC` (dark blue)

### 3. Parsed Transactions Section (collapsible, default expanded)
Table format matching dashboard recent transactions style:
| Date | Merchant | Source | Category | Amount |
|------|----------|--------|----------|--------|

- Source badges same as above
- Amount formatted as IDR currency
- Category shown as label (Food & Drinks, Shopping, Transport, Entertainment, Other)

## API Change

`POST /api/emails/scan` returns:
```json
{
  "scanned": 11,
  "parsed": 8,
  "bySource": { "shopee": 5, "tokopedia": 3, "traveloka": 2, "bca": 1 },
  "emails": [
    {
      "id": "msg-id",
      "subject": "Order Confirmation...",
      "from": "no-reply@shopee.co.id",
      "date": "2026-04-10",
      "snippet": "Your order has been confirmed...",
      "source": "shopee"
    }
  ],
  "transactions": [
    {
      "merchant": "Shopee",
      "amount": 150000,
      "date": "2026-04-10",
      "category": "shopping",
      "source": "shopee"
    }
  ]
}
```

### Source Detection
- `from:shopee` → source: "shopee"
- `from:tokopedia` → source: "tokopedia"
- `from:traveloka` → source: "traveloka"
- `from:bca` or `from:bca.co.id` → source: "bca"

## UI States

| State | Display |
|-------|---------|
| Before scan | "Scan Now" button only |
| Scanning | Button shows "Scanning...", results area shows skeleton |
| Scan complete | Summary + Emails + Transactions panels |
| Scan error | Error message with retry button |
| No emails found | "No transaction emails found" message |

## Files to Modify

- `app/api/emails/scan/route.ts` — Update response to include emails and transactions
- `app/dashboard/settings/page.tsx` — Update Manual Scan section to display results

## Files to Create (if needed)

- `components/dashboard/ScanResults.tsx` — Reusable scan results display component (optional — can inline in page)

## Component Inventory

| Component | States |
|-----------|--------|
| ScanSummary | default, empty (0 results) |
| EmailCard | default, hover |
| SourceBadge | shopee, tokopedia, traveloka, bca |
| CollapsibleSection | expanded, collapsed |
| TransactionRow | default, hover |
| ScanError | default with retry |

## Data Flow

```
User clicks "Scan Now"
  → POST /api/emails/scan
  → API returns { scanned, parsed, bySource, emails, transactions }
  → Page updates state with results
  → Results panel renders below button
```