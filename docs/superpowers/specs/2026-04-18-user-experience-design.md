# C1-C3: User Experience Improvements

## Overview

Three independent UX improvements: Onboarding Tour, Browser Notifications, and Smart Category Suggestions.

---

## C1: Onboarding Tour

### What
First-time user walkthrough explaining key features. Shows 4-5 tooltip overlays as user explores the app.

### Pages
- `/app/dashboard/onboarding/page.tsx` — New onboarding page for first-time users
- Or: Inline tour component that overlays existing pages

### Tour Steps
1. **Welcome** — "Track your spending automatically by scanning emails"
2. **Dashboard** — "See your spending overview and insights"
3. **Pending** — "Review transactions before they're added"
4. **Analytics** — "Understand your spending patterns"
5. **Scan** — "Click here to scan your emails"

### Implementation
- Store `hasSeenOnboarding: true` in user settings after completion
- Show onboarding modal on first visit if not seen
- "Skip" and "Next" buttons to navigate steps
- Progress indicator (dots or "3/5")

### Files
- Create: `components/onboarding/OnboardingTour.tsx`
- Modify: `app/dashboard/page.tsx` — Check and show onboarding on first visit
- Modify: `app/api/settings/route.ts` — Add hasSeenOnboarding field

---

## C2: Browser Notifications

### What
Browser push notifications for budget alerts and weekly summaries.

### Features
1. **Budget Alert** — "⚠️ Food budget exceeded by Rp 50,000!"
2. **Weekly Summary** — "📊 This week: Rp 500,000 spent (20% less than last week)"
3. **Recurring Reminder** — "🔔 Netflix charge expected tomorrow: Rp 159,000"

### Implementation
- Request notification permission on first enable
- Store notification preferences in user settings
- Use Service Worker for background notifications (or Web Push API)
- Show in-app toast as fallback

### UI: Notification Settings Toggle
In Settings page:
- Toggle: "Enable Notifications"
- Checkboxes for each notification type:
  - Budget alerts
  - Weekly summary (day/time picker)
  - Recurring reminders

### API Changes
- `GET /api/notifications/preferences` — Returns notification settings
- `PUT /api/notifications/preferences` — Updates notification settings

### Files
- Create: `app/api/notifications/preferences/route.ts`
- Modify: `app/dashboard/settings/page.tsx` — Add notification settings UI
- Create: `components/notifications/NotificationBell.tsx` — In-app notification bell

---

## C3: Smart Category Suggestions

### What
When adding transactions manually, suggest category based on merchant name history.

### Implementation
- Track merchant → category mappings in user data
- On add transaction form, when user types merchant name:
  - Look up past transactions with similar merchant
  - Show suggestion: "Based on past transactions, this is usually 'Food'"
- User can accept suggestion or pick different category

### API Changes
- `GET /api/merchants/suggest?merchant={name}` — Returns suggested category for merchant name

### Form Changes
In transaction add form:
- Add suggestion badge below merchant input
- "Usually: Food & Drinks" clickable to apply

### Files
- Create: `app/api/merchants/suggest/route.ts`
- Modify: Transaction add form (in EditTransactionPanel or separate add modal)

---

## Summary

| Feature | Files to Create/Modify |
|---------|------------------------|
| C1: Onboarding Tour | `components/onboarding/OnboardingTour.tsx`, `app/dashboard/page.tsx`, `app/api/settings/route.ts` |
| C2: Notifications | `app/api/notifications/preferences/route.ts`, `app/dashboard/settings/page.tsx`, `components/notifications/NotificationBell.tsx` |
| C3: Smart Suggestions | `app/api/merchants/suggest/route.ts`, Transaction add form |