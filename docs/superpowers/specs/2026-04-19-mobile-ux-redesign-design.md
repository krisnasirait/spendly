# Mobile-First UX Redesign — Design Spec

## Context

The Spendly app is currently desktop-first with responsive adjustments. Mobile users face poor UX: squished 4-column stat grids, overflowing pill selectors, tiny table rows, and forms that slide in as side panels. This spec defines a hybrid mobile-first approach for key pages.

**Scope:** Dashboard, History, Pending, Settings, Onboarding Tour — mobile layouts only. Desktop remains unchanged unless explicitly noted.

---

## Decisions Made

| Decision | Choice |
|----------|--------|
| Overall approach | Hybrid — mobile-first for key pages, responsive refinement for others |
| Dashboard header | Compact — greeting + period dropdown + scan button (one row) |
| Stat cards | 2x2 grid on mobile |
| Transaction list (history) | Stacked cards on mobile |
| Pending transactions | Stacked cards with full-width approve/dismiss buttons |
| Add/Edit form | Bottom sheet on mobile |
| Bottom tab bar | Keep current (Home, History, +, Pending, More) |
| Settings | Mobile-first redesign (stacked fields, larger inputs/toggles) |
| Loading skeletons | Mobile-optimized skeletons |
| Onboarding tour | Mobile-optimized (larger buttons, full-screen steps) |

---

## Pages

### 1. Dashboard (`/dashboard`)

#### Mobile Header
- **Greeting**: Single line — `{greeting}, {firstName}` in gradient text
- **Period selector**: Replaced pill group with dropdown (`<select>`) showing "Today / Week / Month / All"
- **Scan button**: Icon + text, right-aligned
- **Layout**: One row — `{greeting} {dropdown} {scan}` or two rows if needed
- **Padding**: `padding: 16px 16px 24px` on mobile (was `28px 32px 48px`)

#### Stat Cards
- **Mobile**: `grid-template-columns: 1fr 1fr` (2x2 grid)
- **Card style**: Full padding, larger font values, labels in muted color
- **Desktop**: `minmax(160px, 1fr)` auto-fit grid (unchanged)

#### Content Grid
- **Mobile**: Single column stack
- **Charts**: Full width, vertically stacked
- **Desktop**: `minmax(300px, 1fr)` two-column grid (unchanged)

#### Charts
- **Mobile**: `ResponsiveContainer width="100%"` — already set, verify no overflow
- **Height**: Reduce chart heights slightly on mobile (160px vs 220px)

---

### 2. History (`/dashboard/history`)

#### Transaction List — Mobile: Stacked Cards
Each transaction rendered as a full-width card:

```
┌──────────────────────────────────┐
│ [checkbox]  19 Apr 2026          │
│ Gojek                          ✎ │
│ Rp 25.000    [Transport]         │
└──────────────────────────────────┘
```

- **Card padding**: `16px`
- **Merchant**: `font-weight: 600, font-size: 15px`
- **Amount**: `font-weight: 700, font-size: 15px, color: var(--danger)`
- **Date**: `font-size: 12px, color: var(--text-muted)`
- **Category badge**: Pill badge with background color
- **Edit button**: Top-right of card, `✎` icon, `24x24px` tap target
- **Checkbox**: Left of card, `20x20px`
- **Row gap between cards**: `8px`

#### Desktop: Table
- Remains as-is (horizontal scroll for columns)

#### Header Controls (Mobile)
- **Search**: Full width, `min-width` removed
- **Filter bar**: Stack vertically on mobile — date range above, filters below
- **Export CSV**: Full-width button on mobile
- **Pagination**: Compact, larger tap targets (34px buttons)

---

### 3. Pending Transactions (`/dashboard/pending`)

#### Mobile: Stacked Cards with Actions

```
┌──────────────────────────────────┐
│ ⏳ 19 Apr 2026                   │
│ Gojek                            │
│ Rp 25.000                        │
│ [  Approve ✓  ]  [  Dismiss ✗  ] │
└──────────────────────────────────┘
```

- **Card padding**: `16px`
- **Approve button**: Full width (50%), green background, `48px` height (thumb-friendly)
- **Dismiss button**: Full width (50%), red outline, `48px` height
- **Buttons on same row**: `display: flex; gap: 8px`
- **Icon in pending badge**: `⏳` prefix

#### Desktop
- Remains as compact row with icon buttons

---

### 4. AddTransactionPanel & EditTransactionPanel

#### Mobile: Bottom Sheet
- **Entry animation**: Slides up from bottom
- **Height**: 80% of viewport (`80vh`)
- **Drag handle**: `32px` wide, `4px` tall, centered, `#ddd` color at top
- **Close button**: Top-right `✕`
- **Form fields**: Full width, `48px` input height (touch-friendly)
- **Category selector**: Native `<select>` or custom dropdown with `min-height: 48px`
- **Save button**: Full width, `48px` height, accent gradient background
- **Overlay**: Semi-transparent backdrop `rgba(0,0,0,0.5)`

#### Desktop
- Side panel from right (400px wide) — unchanged

#### Implementation
- Add `isMobile` prop to both panels
- Use `position: fixed; bottom: 0; left: 0; right: 0; height: 80vh` on mobile
- Use `position: fixed; right: 0; top: 0; bottom: 0; width: 400px` on desktop
- Add backdrop click to dismiss

---

### 5. Settings (`/dashboard/settings`)

#### Mobile-First Redesign
- **Padding**: `16px` (was `32px`)
- **Section spacing**: `24px` gap between sections
- **Toggle switches**: `min-height: 48px` tap target
- **Input fields**: `48px` height, `16px` font size
- **Email source cards**: Stack vertically on mobile (was 2-column grid)
- **Danger zone (Delete Account)**: Full-width red button, larger tap target

---

### 6. Loading Skeletons

- **Mobile skeleton cards**: Match stacked card layout (not table rows)
- **Skeleton padding**: `16px`
- **Skeleton height**: Match real content height (larger on mobile)
- **Animation**: Pulse animation `1.5s` ease-in-out infinite

---

### 7. Onboarding Tour

- **Step container**: Full-screen on mobile
- **Navigation buttons**: `48px` height, full-width "Next" button
- **Skip button**: Top-right, `24px` tap target minimum
- **Progress dots**: `12px` diameter, `8px` gap
- **Step illustrations**: Full-width on mobile

---

## Implementation Notes

### CSS Strategy
Use `useDevice()` hook — already available in codebase:

```typescript
const { isMobile } = useDevice();
```

Apply responsive styles inline or via CSS variables:

```typescript
style={{
  padding: isMobile ? '16px 16px 24px' : '28px 32px 48px',
  gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(auto-fit, minmax(160px, 1fr))',
}}
```

For components rendered across pages (AddTransactionPanel, EditTransactionPanel), pass `isMobile` prop from the parent page.

### Breakpoint
- Mobile: `< 640px` (already defined in `useDevice.ts`)
- Desktop: `≥ 640px`

### Files to Modify
- `app/dashboard/page.tsx` — header, stat cards, content grid
- `app/dashboard/history/page.tsx` — transaction cards, filter bar
- `app/dashboard/pending/page.tsx` — pending cards, action buttons
- `components/AddTransactionPanel.tsx` — bottom sheet on mobile
- `components/EditTransactionPanel.tsx` — bottom sheet on mobile
- `app/dashboard/settings/page.tsx` — stacked layout
- Loading skeleton components — match new card layouts
- `components/onboarding/OnboardingTour.tsx` — mobile-optimized steps

---

## Out of Scope
- Analytics page (responsive refinement only — already has `maxWidth: 1000`)
- Desktop layout changes
- New features
