# Spendly — Product Design

**Self-awareness tool disguised as a finance app**

---

## 1. Concept & Vision

Spendly is a "self-awareness tool disguised as finance app." The goal isn't to show users data — it's to make them go "anjir gue boros banget ternyata." Clean Gen-Z-friendly UI with cheeky, relatable copy that makes spending awareness feel personal and slightly confrontational. No lectures, no judgment — just mirror-up moments that hit different.

---

## 2. Design Language

### Visual Style: Soft Minimal
- **Aesthetic:** Light, airy, clean — like a premium wellness app meets finance tool
- **Backgrounds:** Off-white / light gray (`#fafafa`, `#f5f5f5`), never stark white
- **Colors:** Muted pastels with one punchy accent for warnings/alerts
  - Primary: Soft indigo/lavender
  - Accent (warning/alert): Warm coral or amber
  - Category colors: Muted pastels (sage green, dusty rose, soft blue)
- **Typography:** Large, bold numbers for amounts. Clean sans-serif body text. Big but not aggressive.
- **Emoji-driven:** Emoji as category icons (🍔 Food, 🛍️ Shopping, 🚗 Transport). One emoji = one category.
- **Soft cards:** Rounded corners (16-24px), subtle shadows, no harsh borders

### Color Palette
- **Background:** `#fafafa` (light) / `#0f0f0f` (dark — future)
- **Card surface:** `#ffffff`
- **Primary text:** `#1a1a1a`
- **Secondary text:** `#6b6b6b`
- **Accent (insight/warning):** `#ff6b6b` (coral red) — used sparingly for impact
- **Category — Food:** `#fde68a` (warm yellow)
- **Category — Shopping:** `#fbcfe8` (dusty rose)
- **Category — Transport:** `#bae6fd` (soft blue)
- **Category — Entertainment:** `#d9f99d` (sage)
- **Category — Other:** `#e5e5e5` (neutral)

### Typography
- **Big Number:** 48-64px, font-weight 700
- **Section Heading:** 20-24px, font-weight 600
- **Body:** 16px, font-weight 400
- **Caption/Insight:** 14px, italic or semi-bold for personality

### Spacing & Layout
- **Cards:** 24px padding, 20px border-radius
- **Section gaps:** 32px between major sections
- **Card gaps:** 16px between cards

---

## 3. User Flow

```
User opens Spendly
    ↓
Immediate Google OAuth redirect
    ↓
Loading screen: "Ngintip email lo..." (animated scan icon)
    ↓
Dashboard loads (bottom tab nav)
    ↓
Scan completes → transactions fill in progressively
```

---

## 4. Navigation — Bottom Tabbed

Three tabs at bottom of screen:

1. **Overview** — Hero stat (total spent) + single daily hot take insight card
2. **Categories** — Category breakdown with pie chart + category cards
3. **History** — Recent transactions list (chronological)

Bottom nav: minimal icons + labels. Active state uses primary color.

---

## 5. Screen Specifications

### 5.1 Loading Screen
- Full-screen soft gradient (light lavender to off-white)
- Centered animated scan icon (pulsing email/search icon)
- Cheeky copy: "Ngintip email lo..." (loading text)
- Subtle progress indication

### 5.2 Overview Tab
- **Hero Stat Card**
  - Giant bold amount: "Rp 2.450.000"
  - Subtitle: "Spent this month"
  - Muted secondary text for date range

- **Daily Insight Card** (prominent)
  - Emoji + punchy one-liner: "😭 Dompet lo lagi nggak sehat"
  - Subtle coral accent border on left
  - Timestamp: "Updated hari ini"

### 5.3 Categories Tab
- **Pie Chart** — Donut chart showing category proportions. Muted pastel colors.
- **Category Cards** (stacked feed)
  - Emoji + Category name: "🍔 Food"
  - Amount: "Rp 800.000"
  - Percentage or trend indicator

### 5.4 History Tab
- **Transaction List**
  - Each item: merchant icon/emoji, merchant name, date, amount
  - Grouped by date (Today, Yesterday, This Week)
  - Subtle separators

### 5.5 Insight Feed (on Overview when scrolled)
- **Stacked Card Feed** — Full-width cards, stacked vertically
- Each card: icon + insight text + optional action button
- Cards vary in type: comparison, alert, encouragement
- Scrollable within overview

---

## 6. Reality Check System — Insights

### Insight Types
1. **Spending Spike** — "Lo udah habis Rp900rb buat jajan minggu ini 😭"
2. **Trend Alert** — "Belanja lo naik 40% dibanding minggu lalu"
3. **Category Overload** — "75% of spending this month is Food 🍔"
4. **Pattern Catch** — "Lo udah order Grab 15x bulan ini"
5. **Encouragement** — "Hari ini lo hemat! ✨"

### Generation Rules
- Run insight logic on each scan + daily batch
- Rank insights by severity/impact
- Daily "hot take" is the highest-impact insight for the day
- Feed shows top 5-7 recent insights

### UX Tone
- Sarcastic but not mean
- Relatable, not preachy
- Examples: "Ini bukan self-care, ini impulsive 😭", "Coba tahan 1 hari aja bisa nggak?"

---

## 7. Email Parsing — Structured Templates

### Supported Merchants (MVP)
- **Shopee** — Order confirmation emails
- **Tokopedia** — Order confirmation emails
- **Traveloka** — Booking confirmation emails

### Parsed Fields
- `amount` — total spend (IDR)
- `merchant` — shop/platform name
- `date` — transaction date
- `category` — mapped from merchant + keywords (Food, Shopping, Transport, etc.)

### Parser Architecture
```
Email Fetch (Gmail API)
    ↓
Merchant Detection (email subject/from)
    ↓
Merchant-Specific Template Parser
    ↓
Normalized Transaction Record
    ↓
Store in Firestore
```

### Categories (auto-assigned)
- 🍔 Food (Traveloka hotel/restaurant, Food delivery keywords)
- 🛍️ Shopping (Shopee, Tokopedia orders)
- 🚗 Transport (Traveloka flight, Grab, Gojek)
- 🎮 Entertainment (Game purchases, streaming)
- 📦 Other (uncategorized)

---

## 8. Technical Architecture

### Frontend
- **Framework:** Next.js 16 (App Router)
- **Styling:** Tailwind CSS 4
- **State:** React hooks + Context (no external state manager needed for MVP)
- **Charts:** Recharts or similar lightweight charting library

### Backend (Next.js API Routes)
- `POST /api/auth/google` — Google OAuth initiation
- `GET /api/auth/callback` — OAuth callback
- `GET /api/emails/scan` — Trigger email scan
- `GET /api/transactions` — Fetch user transactions from Firestore
- `GET /api/insights` — Generate + fetch insights

### Data Storage — Firestore
- **Collection:** `users` — user documents
  - `email`, `name`, `createdAt`, `lastScanAt`
- **Subcollection:** `users/{userId}/transactions`
  - `amount`, `merchant`, `date`, `category`, `source`, `createdAt`
- **Subcollection:** `users/{userId}/insights`
  - `type`, `text`, `severity`, `createdAt`, `expiresAt`

### Gmail Integration
- OAuth 2.0 with `gmail.readonly` scope
- Search queries: `from:shopee OR from:tokopedia OR from:traveloka newer_than:30d`
- Process emails in batch jobs (not real-time)

### Authentication
- NextAuth.js with Google provider
- Session stored in encrypted cookie
- Middleware protects `/api/*` and dashboard routes

---

## 9. File Structure

```
spendly/
├── app/
│   ├── api/
│   │   ├── auth/[...nextauth]/route.ts    # NextAuth handler
│   │   ├── emails/scan/route.ts           # Trigger scan
│   │   └── transactions/route.ts          # CRUD transactions
│   ├── dashboard/
│   │   └── page.tsx                       # Protected dashboard
│   ├── loading/
│   │   └── page.tsx                       # Scan loading screen
│   ├── auth/
│   │   └── signin/page.tsx                # Auth page
│   ├── layout.tsx
│   ├── page.tsx                           # Landing → redirect to auth
│   └── globals.css
├── components/
│   ├── ui/
│   │   ├── Card.tsx
│   │   ├── BottomNav.tsx
│   │   └── InsightCard.tsx
│   ├── charts/
│   │   └── CategoryPie.tsx
│   └── dashboard/
│       ├── HeroStat.tsx
│       ├── TransactionList.tsx
│       └── CategoryBreakdown.tsx
├── lib/
│   ├── auth.ts                            # NextAuth config
│   ├── gmail.ts                           # Gmail API client
│   ├── firestore.ts                       # Firestore client
│   └── parsers/
│       ├── shopee.ts
│       ├── tokopedia.ts
│       └── traveloka.ts
├── types/
│   └── index.ts                           # TypeScript types
├── docs/
│   └── superpowers/
│       └── specs/                         # Design specs here
└── package.json
```

---

## 10. MVP Scope (Week 1-3)

### In Scope
- ✅ Google OAuth (simple, fast)
- ✅ Gmail email scanning (3 merchants)
- ✅ Structured parsing (regex + templates)
- ✅ Dashboard with 3 tabs
- ✅ Category breakdown
- ✅ Transaction history
- ✅ Insight feed (stacked cards)
- ✅ Loading screen with cheeky copy
- ✅ Firestore data storage

### Out of Scope (Post-MVP)
- ❌ Bank API integration
- ❌ Mobile app
- ❌ ML-based category classification
- ❌ Dark mode
- ❌ Push notifications
- ❌ Multi-currency

---

## 11. Success Metrics

- User opens app ≥ 3x/week
- Reaction: "anjir gue boros banget ternyata"
- Insight click-through rate > 30%
- Scan completes in < 5 seconds

---

## 12. Design Decisions Summary

| Decision | Choice |
|----------|--------|
| Visual Style | Soft Minimal (light, airy, muted pastels) |
| Dashboard Layout | Tabbed (bottom nav: Overview / Categories / History) |
| Auth Flow | Immediate redirect to Google OAuth |
| Scan Experience | Loading screen with "Ngintip email lo..." + animated icon |
| Insight Style | Stacked card feed — multiple scannable insight cards |
| Database | Firestore |
| Email Parsing | Structured templates per merchant (Shopee, Tokopedia, Traveloka) |
| Backend | Next.js API routes + NextAuth |
| Deployment | Vercel |

---

*Spec status: DRAFT — awaiting user review*