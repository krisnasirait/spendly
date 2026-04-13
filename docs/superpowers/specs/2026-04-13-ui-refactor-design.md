# Spendly UI Refactor — Minimal Light with HeroUI v3

**Date:** 2026-04-13
**Status:** Approved

## Concept & Vision

A clean, minimal expense tracker that feels light and effortless. Using HeroUI v3 as the component foundation with custom indigo accent theming. HeroUI handles all component needs — Card, Badge, Avatar, Progress, etc. — with minimal custom styling needed. The personality is calm, focused, and trustworthy.

---

## Design Language

### Aesthetic Direction
Clean white surfaces. Precise borders. One accent color. Typography does the heavy lifting.

### Color Palette

| Token | Value | Usage |
|-------|-------|-------|
| bg-base | `#FFFFFF` | Page background |
| bg-surface | `#FFFFFF` | Cards (same as background, differentiated by shadow) |
| border-subtle | `#E5E7EB` | Card borders, dividers |
| border-active | `#4F46E5` | Active nav, selected states |
| accent | `#4F46E5` | Indigo — buttons, active states, links |
| text-primary | `#111827` | Headings, primary content |
| text-secondary | `#6B7280` | Body text, descriptions |
| text-muted | `#9CA3AF` | Captions, timestamps |

### Category Colors (muted for light theme)

| Category | Color |
|----------|-------|
| food | `#F59E0B` (amber) |
| shopping | `#EC4899` (pink) |
| transport | `#0EA5E9` (sky) |
| entertainment | `#84CC16` (lime) |
| other | `#9CA3AF` (gray) |

### Typography
- Font: System stack (`-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`)
- Hero amount: 32px bold
- Section headers: 14px semibold uppercase, letter-spacing 0.05em
- Body: 14px regular
- Captions: 12px regular

### Spatial System
- Base unit: 4px
- Card padding: 16px
- Section gap: 24px
- Border-radius: 12px (cards), 8px (buttons/inputs), 9999px (pills)

### Motion Philosophy
Minimal. Only functional transitions:
- Page content: fade-in 200ms
- Hover states: 150ms ease
- No bouncing, floating, or pulsing animations

---

## Layout Structure

### Desktop (≥768px)
```
┌──────────────────────────────────────────────────────┐
│ [Sidebar 240px]  │  [Main Content - fluid]          │
│                  │                                   │
│  Logo            │  Dashboard page:                  │
│  ─────────────   │    - Page header (user, title)   │
│  Nav items       │    - Hero stat (total spent)      │
│                  │    - Insights section             │
│                  │                                   │
│                  │  Categories page:                  │
│                  │    - Page header                  │
│                  │    - Category breakdown           │
│                  │                                   │
│                  │  History page:                    │
│                  │    - Page header                  │
│                  │    - Transaction list              │
│                  │                                   │
│  [User info]     │                                   │
└──────────────────────────────────────────────────────┘
```

### Mobile (<768px)
```
┌────────────────────────────┐
│  [Content - scrollable]    │
│                            │
│  Page header               │
│  Hero stat                 │
│  Insights / Transactions   │
│                            │
│  [Bottom Nav - fixed 64px] │
└────────────────────────────┘
```

### Responsive Strategy
- Single column on mobile, no sidebar
- Bottom nav on mobile, side nav on desktop
- Cards stack vertically on mobile
- Sidebar collapses gracefully; bottom nav only shows on mobile

---

## Components

### 1. Sidebar (Desktop only)
- Width: 240px, full height, fixed left
- White background with 1px right border (#E5E7EB)
- Logo: Simple text "Spendly" in bold, no gradient/emoji
- Nav items: Icon + label, 44px height, rounded corners on hover
- Active state: Light indigo background (#EEF2FF), indigo text, left border indicator
- User section at bottom: Avatar circle + name + sign out link

### 2. Bottom Nav (Mobile only)
- Fixed bottom, 64px height, white background, 1px top border
- 3 items: Overview, Categories, History — evenly spaced
- Active: Indigo icon + text, no background pill
- Inactive: Gray icon + text

### 3. Hero Stat Card
- White card with 1px border (#E5E7EB) and subtle shadow
- 4px top border in indigo for accent
- Content centered: greeting, month label, large amount
- No decorative orbs or gradients

### 4. Insight Card
- White card, 1px border, subtle shadow
- Colored left border (4px) based on severity: red=high, amber=medium, sky=low
- Icon in colored circle (no emoji)
- Title + description + date

### 5. Transaction Row
- Clean row layout: [Source circle] [Merchant + category] [Amount]
- Source shown as 40px circle with initial letter, colored background
- Category as simple text tag (no background/border, just muted text)
- Hover: Light gray background (#F9FAFB)

### 6. Category Card
- White card with border
- Icon circle on left (no emoji — use simple geometric or initials)
- Category name + percentage
- Progress bar below (4px height, rounded)

### 7. Page Header
- Title (h1, bold) on left
- User avatar circle on right (40px)
- Bottom border separates from content

---

## Component States

| Component | Default | Hover | Active |
|-----------|---------|-------|--------|
| Nav item | Gray text | Light gray bg | Indigo text, light indigo bg |
| Card | White, border | Slightly darker border | — |
| Transaction row | White bg | #F9FAFB | — |
| Button (if any) | Indigo bg, white text | Darker indigo | Scale down slightly |

---

## Technical Approach

- **Framework:** Next.js (existing)
- **Styling:** Tailwind CSS (existing)
- **No new dependencies needed**
- CSS variables will be simplified — remove purple/pink gradients, keep only what's needed
- Animations: Remove keyframes for shimmer, float, pulse; keep simple fade-in

---

## Files to Modify

1. `app/globals.css` — Simplify CSS variables, remove purple/pink tokens, add indigo-based tokens
2. `components/ui/Sidebar.tsx` — Strip gradient text, emoji logo, glassmorphism
3. `components/ui/BottomNav.tsx` — Remove purple active states
4. `components/dashboard/HeroStat.tsx` — White card, indigo accent, no orbs
5. `components/ui/InsightCard.tsx` — Use simple icons instead of emoji
6. `components/dashboard/TransactionList.tsx` — Clean rows, source initials circle
7. `components/dashboard/CategoryBreakdown.tsx` — Clean cards, simple icons
8. `app/dashboard/page.tsx` — Remove background orb, adjust layout
9. `app/dashboard/layout.tsx` — Ensure proper spacing