# Settings Page Design — Spendly

## Overview

A simple Settings page that lets users manage their connected email account and configure which transaction email sources are scanned.

## Layout

Single-column layout with a floating card containing three sections.

## Sections

### 1. Connected Account
- Displays the Google OAuth account email (from `session.user.email`)
- "Disconnect" button that signs out and redirects to sign-in
- Shows last scan timestamp if available

### 2. Email Sources
Toggle switches for each source. Each toggle is a styled `<input type="checkbox">`.

| Source     | Gmail Query Filter |
|------------|-------------------|
| Shopee     | `from:shopee` |
| Tokopedia  | `from:tokopedia` |
| Traveloka  | `from:traveloka` |
| BCA        | `from:bca` |

Default: all enabled.

State persists to Firestore under `users/{userId}/settings/sources`.

### 3. Scan Settings
- **Scan period**: dropdown select — 7 days / 30 days (default) / 90 days
- Stored in Firestore `users/{userId}/settings/scanPeriodDays`

### 4. Manual Scan
- "Scan Now" button triggers `POST /api/emails/scan`
- Loading state while scanning
- Success/error toast notification on completion

## Component Inventory

| Component | States |
|-----------|--------|
| Toggle switch | on, off, disabled |
| Dropdown select | default, open, selected |
| Primary button | default, loading, disabled |
| Ghost button | default, hover |
| Toast notification | success, error |

## Data Flow

```
User toggles source → update Firestore (optimistic UI)
User changes scan period → update Firystore
User clicks "Scan Now" → POST /api/emails/scan → toast on response
```

## File Structure

```
app/dashboard/settings/page.tsx  — Settings page
components/dashboard/SettingsSection.tsx  — Reusable section wrapper
components/ui/Toggle.tsx  — Toggle switch component
components/ui/Toast.tsx  — Toast notification
```

## API

- `GET /api/settings` — returns `{ sources: string[], scanPeriodDays: number }`
- `PUT /api/settings` — body `{ sources?: string[], scanPeriodDays?: number }`
- `POST /api/emails/scan` — triggers email scan (existing)