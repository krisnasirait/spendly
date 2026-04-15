# Spendly Mobile-First Responsive Design

**Date:** 2026-04-16
**Status:** Approved

---

## Concept & Vision

Spendly gets a proper responsive treatment that feels native on mobile. The app uses a sidebar on desktop and bottom tab bar on mobile, with pull-to-refresh for email scanning. The experience should feel natural whether you're on a phone or desktop — not a scaled-down desktop.

---

## Responsive Breakpoints

| Breakpoint | Width | Layout |
|------------|-------|--------|
| Mobile | < 640px | Single column, bottom tabs, stacked cards |
| Tablet | 640-1023px | 2-column grid, bottom tabs |
| Desktop | ≥ 1024px | 3-column grid + sidebar |

---

## Navigation

### Desktop (≥1024px)

Fixed 260px sidebar on left with dark indigo background (`#1E1B4B`):
- Logo at top with gradient accent
- Full nav: Dashboard, Transactions, Pending, Categories, Settings, Help, Sign Out
- User profile at bottom
- FAB for Add Transaction (bottom right)

### Mobile (< 640px)

**Bottom Tab Bar:**
- Height: 64px (+ safe area inset for iPhone notch)
- Background: White with `border-top: 1px solid var(--border)`
- 5 tabs:
  | Tab | Icon | Behavior |
  |-----|------|----------|
  | Dashboard | home | Navigate to /dashboard |
  | Transactions | list | Navigate to /dashboard/history |
  | Pending | clock | Navigate to /dashboard/pending |
  | [ADD] | plus | Open AddTransaction panel (center, prominent, 52px circle, gradient bg) |
  | More | hamburger | Open slide-out menu |

**Slide-out Menu (from "More"):**
- Categories, Settings, Help, Sign Out
- Dark overlay background
- Slides in from right
- Tap outside to close

---

## Mobile UI Adjustments

### Stat Cards

**Desktop:** 4-column horizontal row
**Mobile:** 
- Option A: Horizontal scroll (snap)
- Option B: 2×2 grid
- Chosen: **2×2 grid** — cleaner, no scroll needed

### Charts

- Full width on mobile
- Reduced height (160px instead of 180px)
- Touch-friendly tooltips

### Tables → Cards

Transactions table becomes stacked cards on mobile:
```
┌────────────────────────────┐
│ Shopee          -Rp150.000 │
│ Food & Drinks   Apr 15     │
└────────────────────────────┘
```

### Pull-to-Refresh

- **Trigger:** Pull down 80px threshold
- **Indicator:** Spinner + "Release to scan" text
- **Action:** POST /api/emails/scan
- **Feedback:** Haptic on trigger (if available)
- **Reset:** Auto-reset after scan completes

---

## Component: BottomTabBar

```tsx
// Location: components/dashboard/BottomTabBar.tsx

interface TabItem {
  label: string;
  icon: 'home' | 'list' | 'clock' | 'add' | 'menu';
  href?: string;
  onClick?: () => void;
}

const TABS: TabItem[] = [
  { label: 'Home', icon: 'home', href: '/dashboard' },
  { label: 'Transactions', icon: 'list', href: '/dashboard/history' },
  { label: 'Add', icon: 'add' }, // Special center button
  { label: 'Pending', icon: 'clock', href: '/dashboard/pending' },
  { label: 'More', icon: 'menu' }, // Opens slide-out
];
```

**Styling:**
- Add button: 52px circle, gradient bg, elevated shadow, centered
- Active: Icon + label in `var(--accent)`
- Inactive: Icon + label in `var(--text-muted)`
- Font size: 10px for labels

---

## Component: MobileHeader

```tsx
// Location: components/dashboard/MobileHeader.tsx

// Shown only on mobile
// - Hamburger menu (opens slide-out)
// - App name "Spendly"
// - Pull-to-refresh indicator
```

---

## Pull-to-Refresh Implementation

Use a simple custom implementation or a library like `pull-to-refresh-react`:

1. Track `touchStart` and `touchMove` Y positions
2. Calculate pull distance
3. Show indicator when > 40px
4. Trigger scan when > 80px and velocity positive
5. Disable scroll while refreshing

---

## CSS Responsive Utilities

Add to `globals.css`:

```css
/* Mobile-first: hide sidebar, show bottom tabs */
@media (max-width: 1023px) {
  .sidebar { display: none; }
  .bottom-tabs { display: flex; }
}

/* Desktop: show sidebar, hide bottom tabs */
@media (min-width: 1024px) {
  .sidebar { display: flex; }
  .bottom-tabs { display: none; }
}

/* Mobile adjustments */
@media (max-width: 639px) {
  .stat-cards-grid { grid-template-columns: 1fr 1fr; }
  .charts-grid { grid-template-columns: 1fr; }
}
```

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `components/dashboard/BottomTabBar.tsx` | Create |
| `components/dashboard/MobileMenu.tsx` | Create |
| `components/dashboard/PullToRefresh.tsx` | Create |
| `app/dashboard/page.tsx` | Modify — add responsive logic |
| `components/dashboard/Sidebar.tsx` | Modify — hide on mobile |
| `app/globals.css` | Modify — add responsive utilities |

---

## Implementation Order

1. Create `useDevice` hook for device detection
2. Create `BottomTabBar` component
3. Create `MobileMenu` (slide-out) component
4. Create `PullToRefresh` component
5. Update `Sidebar` to hide on mobile
6. Update `globals.css` with responsive utilities
7. Update `DashboardPage` to use mobile components
8. Test on actual mobile device

---

## Device Detection

Use `useEffect` with `window.innerWidth` and `window.matchMedia`:

```tsx
function useDevice() {
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  
  return isMobile;
}
```

Or use `next/navigation` with user-agent detection server-side for initial render.

---

## Success Criteria

- [ ] Desktop: Sidebar visible, no bottom tabs
- [ ] Mobile (< 640px): Bottom tabs visible, no sidebar, stacked layout
- [ ] Tablet (640-1023px): Bottom tabs, 2-column grid
- [ ] Pull-to-refresh triggers scan on mobile
- [ ] Add button prominent in center of bottom tabs
- [ ] "More" tab opens slide-out with Categories, Settings, Help, Sign Out
- [ ] All navigation works on both mobile and desktop
- [ ] No horizontal scroll on mobile