# Jago Email Source Integration

## Overview

Add Jago (`noreply@jago.com`) as an email transaction source. Jago is a digital wallet where payments go to various merchants, so transactions default to pending queue for manual categorization.

## Changes

### 1. Types (`types/index.ts`)
- Add `'jago'` to `Transaction['source']` union
- Add `'jago'` to `PendingTransaction['source']` union

### 2. Parser (`lib/parsers/jago.ts`)
New file with:
- Amount extraction: `/Rp\s*([\d,\.]+)/` → parse to integer
- Merchant extraction: From "To" field (e.g., "Kantin Hall - Tebet")
- Date extraction: `/(\d{1,2}\s+\w+\s+\d{4})/`
- Returns `ParsedEmail` with `source: 'jago'`

### 3. Parser Router (`lib/parsers/index.ts`)
- Import `parseJagoEmail`
- Route when `from.includes('jago')`

### 4. Source Detection (`app/api/emails/scan/route.ts`)
- Update `detectSource()` to return `'jago'` for `jago.com` emails
- Route Jago transactions to `pendingTransactions` regardless of `manualVerificationEnabled` (since merchant needs user categorization)

## Category
Jago transactions default to `['other']` in parser, then user categorizes via pending queue.