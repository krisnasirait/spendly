# Spendly UI Redesign - Swiss Grid Design

**Date:** 2026-04-13
**Status:** Approved

## Overview

Redesign the Spendly dashboard using Swiss Grid design principles — clean, minimal, professional aesthetic suitable for a finance app where trust is paramount.

---

## Color Palette

| Role | Hex | Tailwind | Usage |
|------|-----|----------|-------|
| Background | `#FFFFFF` | white | Page background |
| Surface | `#F8FAFC` | slate-50 | Card backgrounds, subtle areas |
| Primary | `#1E293B` | slate-800 | Headings, important text |
| Secondary | `#64748B` | slate-500 | Body text, labels |
| Muted | `#94A3B8` | slate-400 | Captions, hints |
| Accent | `#2563EB` | blue-600 | CTAs, active states, links |
| Border | `#E2E8F0` | slate-200 | Card borders, dividers |
| Success | `#10B981` | emerald-500 | Positive amounts, income |
| Danger | `#EF4444` | red-500 | Negative amounts, expenses |

---

## Typography

**Font:** IBM Plex Sans

**Weights:** 400 (regular), 500 (medium), 600 (semibold), 700 (bold)

**Scale:**
- Hero: 28px / 700 / line-height 1.2
- Title: 20px / 600 / line-height 1.3
- Subtitle: 16px / 500 / line-height 1.4
- Body: 14px / 400 / line-height 1.5
- Caption: 12px / 400 / line-height 1.5

**Google Fonts Import:**
```css
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&display=swap');
```

---

## Layout

### Desktop (≥768px)
- Fixed left sidebar: 240px width, full height, white background, right border
- Content area: fluid, max-width 1200px, centered with 24px horizontal padding
- Section spacing: 24px between major sections

### Mobile (<768px)
- No sidebar
- Bottom navigation bar: fixed, 64px height, safe-area-bottom padding
- Content: full width with 16px horizontal padding
- Top padding: 16px (below status bar)

### Grid System
- Base unit: 4px
- Card padding: 16px
- Card gap: 16px
- Section gap: 24px
- Card border-radius: 12px

---

## Components

### Sidebar (Desktop)
- Width: 240px fixed
- Background: white
- Border-right: 1px solid #E2E8F0
- Logo area: 20px font, 600 weight, slate-800, 24px padding
- Nav items: 14px font, 500 weight, 12px vertical padding, 16px horizontal
- Active state: blue-600 text + blue-50 background + blue-600 left border (3px)
- Hover state: slate-100 background
- User section at bottom: avatar + name + sign out link

### Bottom Navigation (Mobile)
- Fixed at bottom, full width
- Background: white with top border (1px slate-200)
- 4 items: Overview, Categories, History, Settings
- Icon + label per item, centered
- Active: blue-600 color
- Inactive: slate-400 color
- Height: 64px + safe-area

### Cards
- Background: white
- Border: 1px solid #E2E8F0
- Border-radius: 12px
- Padding: 16px
- Shadow: none (flat design)
- Hover (if interactive): slate-50 background

### Buttons
- Primary: blue-600 background, white text, 40px height, 12px horizontal padding, 8px radius
- Secondary: white background, slate-700 text, 1px slate-200 border
- Hover: darken by 10%
- Disabled: 50% opacity
- Transition: 150ms

### Typography Styles
- Page title: 20px, 600 weight, slate-800
- Section heading: 14px, 600 weight, slate-800, uppercase, letter-spacing 0.05em
- Body text: 14px, 400 weight, slate-600
- Caption: 12px, 400 weight, slate-400

---

## Pages

### Dashboard (Overview)
- Header: "My Finances" title + scan emails button + user avatar
- Hero stat card: large amount display with month label
- "Reality Check" section heading
- Insight cards list (or empty state)
- Content max-width: 600px for readability

### Categories
- List of categories with transaction counts and totals
- Visual breakdown (pie chart or bars)

### History
- Chronological list of transactions
- Grouped by date
- Search/filter capability

---

## Implementation Order

1. Update `app/globals.css` with new CSS variables and font import
2. Update `components/ui/Sidebar.tsx` with Swiss Grid styling
3. Update `components/ui/BottomNav.tsx` for mobile
4. Update `app/dashboard/page.tsx` with new card-based layout
5. Update `components/dashboard/HeroStat.tsx` with new stat card style
6. Update `components/ui/InsightCard.tsx` with consistent card styling

---

## Anti-Patterns to Avoid

- No emojis as icons — use SVG only (Lucide, Heroicons)
- No gradients on large areas
- No heavy shadows or glassmorphism
- No rounded pill buttons — use 8px radius maximum
- Light mode only (no dark mode for now)