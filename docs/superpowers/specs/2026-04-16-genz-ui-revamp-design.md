# Spendly UI Revamp — Light & Playful Gen-Z Design

**Date:** 2026-04-16
**Status:** Approved

---

## Concept & Vision

Spendly is getting a vibrant, lighthearted redesign that feels fresh and approachable for a Gen-Z audience. The app keeps its professional fintech roots (tracking spending, parsing emails, budgets) but wraps it in a playful, colorful shell. Think "finance app that doesn't feel like banking" — warm gradients, bubbly animations, and friendly micro-copy.

---

## Design Language

### Color Palette

| Token | Hex | Usage |
|-------|-----|-------|
| `--bg-page` | `#FAFBFF` | Page background (cool white) |
| `--bg-surface` | `#FFFFFF` | Cards and panels |
| `--accent-start` | `#7C3AED` | Gradient start (violet) |
| `--accent-end` | `#EC4899` | Gradient end (pink) |
| `--accent` | `#7C3AED` | Primary accent (violet) |
| `--accent-light` | `#F3E8FF` | Light accent background |
| `--text-primary` | `#1E1B4B` | Dark indigo text |
| `--text-secondary` | `#6B7280` | Muted gray |
| `--text-muted` | `#9CA3AF` | Subtle gray |
| `--success` | `#10B981` | Green (Emerald) |
| `--success-bg` | `#ECFDF5` | Light green bg |
| `--danger` | `#EF4444` | Red |
| `--danger-bg` | `#FEF2F2` | Light red bg |
| `--warning` | `#F59E0B` | Amber |
| `--warning-bg` | `#FFFBEB` | Light amber bg |
| `--border` | `#E5E7EB` | Subtle border |

### Gradient Accent

Primary CTA buttons and decorative elements use:
```css
background: linear-gradient(135deg, #7C3AED 0%, #EC4899 100%);
```

### Typography

- **Body:** IBM Plex Sans (400, 500, 600, 700)
- **Headings:** Plus Jakarta Sans (600, 700, 800) — via Google Fonts
- **Fallback:** system-ui, sans-serif

CSS import in globals.css:
```css
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@600;700;800&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap');
```

### Border Radius

| Element | Radius |
|---------|--------|
| Cards | `20px` |
| Buttons | `12px` |
| Badges | `999px` (pill) |
| Inputs | `10px` |
| Modals | `20px` |

### Shadows

- **Card default:** `0 2px 8px rgba(124, 108, 248, 0.06)`
- **Card hover:** `0 12px 40px rgba(124, 108, 248, 0.15), transform: scale(1.02)`
- **Button hover:** `0 6px 20px rgba(124, 108, 248, 0.35)`

### Spacing

Maintain existing spacing scale. Cards use `24px` padding.

---

## Component Changes

### Sidebar

- Background: Dark indigo `#1E1B4B` (creates contrast with light page)
- Active nav: Gradient pill background (`linear-gradient(135deg, #7C3AED, #EC4899)`)
- Nav items: White text, `border-radius: 12px`, hover shows subtle gradient bg
- Logo: Gradient accent square

### Stat Cards

- Background: White with gradient top border (3px gradient line at top)
- Label: Uppercase, small, muted gray
- Value: Large, bold, indigo
- Change badge: Colored pill (green for positive, red for negative)
- Hover: Lift + slight scale

### Buttons

**Primary:**
- Gradient fill: `linear-gradient(135deg, #7C3AED, #EC4899)`
- White text, bold
- Hover: Shadow grows, slight lift

**Ghost:**
- White background, gray border
- Hover: Light accent background wash

### Cards

- White background, large rounded corners (20px)
- Subtle border
- Hover: Lift with shadow + scale(1.02)
- Top accent line: 3px gradient for featured cards

### Table

- Header: Light gradient background
- Rows: White background, bottom border
- Hover: Accent color wash (very light purple)

### Badges

- Source badges: Solid vibrant background matching source brand color
- Category badges: Colored pills with matching text color
- Status badges: Semantic colors on light backgrounds

### Insight Cards

- Colored left border based on severity
- Light background matching severity
- Icon on left, text on right

### FAB (Floating Action Button)

- Gradient background
- White plus icon
- Shadow with colored glow
- Hover: Scale up slightly, glow intensifies

---

## Interaction Patterns

### Hover States

- Cards: `transform: translateY(-2px) scale(1.02)`, shadow grows
- Buttons: Shadow grows, slight lift
- Nav items: Gradient background fades in
- Table rows: Light purple wash

### Animations

- `fade-up` animation: opacity + translateY
- Duration: 200-300ms, ease-out
- Staggered card entry on page load

### Transitions

- All interactive elements: 150-200ms ease
- Colors, shadows, transforms all transition

---

## Pages to Update

1. **globals.css** — Colors, gradients, typography, border radii, shadows, transitions
2. **Sidebar** — Dark indigo bg, gradient active nav
3. **Dashboard page** — Cards, buttons, tables with new styling
4. **BudgetOverview** — Gradient top border on cards
5. **BudgetProgress** — Colored progress bars
6. **InsightCard** — Colored left border, icon styling

---

## Implementation Notes

- Replace IBM Plex Sans font family with Plus Jakarta Sans for headings
- Add gradient CSS variable and utility classes
- Update `--accent` reference to new violet color
- Keep functional logic same — only visual changes