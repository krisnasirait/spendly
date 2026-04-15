# Mobile-First Responsive Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add responsive mobile UI with bottom tab bar, pull-to-refresh, and slide-out menu.

**Architecture:** Create responsive hooks and components. Sidebar hides on mobile (<1024px), bottom tab bar appears. Dashboard uses conditional grid layouts. Pull-to-refresh triggers scan.

**Tech Stack:** Next.js (React), CSS media queries, no new dependencies.

---

## File Structure

| File | Changes |
|------|---------|
| `hooks/useDevice.ts` | Create — device detection hook (mobile/desktop) |
| `components/dashboard/BottomTabBar.tsx` | Create — bottom navigation with 5 tabs |
| `components/dashboard/MobileMenu.tsx` | Create — slide-out menu for More tab |
| `components/dashboard/PullToRefresh.tsx` | Create — pull-to-refresh wrapper |
| `app/dashboard/layout.tsx` | Create — wraps dashboard with mobile components |
| `app/globals.css` | Modify — responsive utilities |
| `app/dashboard/page.tsx` | Modify — responsive layout adjustments |

---

## Tasks

### Task 1: Create useDevice Hook

**Files:**
- Create: `hooks/useDevice.ts`

- [ ] **Step 1: Create device detection hook**

Create `hooks/useDevice.ts`:

```ts
'use client';

import { useState, useEffect } from 'react';

export type DeviceType = 'mobile' | 'tablet' | 'desktop';

export function useDevice() {
  const [device, setDevice] = useState<DeviceType>('desktop');
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => {
      const width = window.innerWidth;
      if (width < 640) {
        setDevice('mobile');
        setIsMobile(true);
      } else if (width < 1024) {
        setDevice('tablet');
        setIsMobile(true);
      } else {
        setDevice('desktop');
        setIsMobile(false);
      }
    };

    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  return { device, isMobile, isDesktop: device === 'desktop', isTablet: device === 'tablet' };
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build 2>&1 | tail -20`
Expected: Hook compiles without errors

- [ ] **Step 3: Commit**

```bash
git add hooks/useDevice.ts && git commit -m "feat: add useDevice hook for responsive detection"
```

---

### Task 2: Create BottomTabBar Component

**Files:**
- Create: `components/dashboard/BottomTabBar.tsx`

- [ ] **Step 1: Create BottomTabBar with 5 tabs**

Create `components/dashboard/BottomTabBar.tsx`:

```tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';

const Icon = ({ d, size = 22 }: { d: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

const icons = {
  home:    'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10',
  list:    'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
  clock:   'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z M12 6v6l4 2',
  plus:    'M12 5v14M5 12h14',
  menu:    'M3 12h18M3 6h18M3 18h18',
};

interface BottomTabBarProps {
  onAddClick: () => void;
  onMenuClick: () => void;
}

export function BottomTabBar({ onAddClick, onMenuClick }: BottomTabBarProps) {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === href : pathname.startsWith(href);

  const tabs = [
    { label: 'Home', icon: 'home', href: '/dashboard' },
    { label: 'History', icon: 'list', href: '/dashboard/history' },
    { label: '', icon: 'plus', isAdd: true },
    { label: 'Pending', icon: 'clock', href: '/dashboard/pending' },
    { label: 'More', icon: 'menu', onClick: onMenuClick },
  ];

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      height: 64,
      background: 'var(--bg-surface)',
      borderTop: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-around',
      paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      zIndex: 100,
    }}>
      {tabs.map((tab, i) => {
        if (tab.isAdd) {
          return (
            <button
              key="add"
              onClick={onAddClick}
              style={{
                width: 52,
                height: 52,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--accent-start) 0%, var(--accent-end) 100%)',
                color: '#fff',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 16px rgba(124, 108, 248, 0.4)',
                transform: 'translateY(-8px)',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-12px) scale(1.05)';
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(124, 108, 248, 0.5)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(-8px) scale(1)';
                e.currentTarget.style.boxShadow = '0 4px 16px rgba(124, 108, 248, 0.4)';
              }}
            >
              <Icon d={icons.plus} size={24} />
            </button>
          );
        }

        const active = tab.href ? isActive(tab.href) : false;

        return (
          <div key={tab.label || i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {tab.href ? (
              <Link href={tab.href} style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4,
                padding: '8px 16px',
                textDecoration: 'none',
                color: active ? 'var(--accent)' : 'var(--text-muted)',
              }}>
                <Icon d={icons[tab.icon as keyof typeof icons] as string} size={22} />
                <span style={{ fontSize: 10, fontWeight: 500 }}>{tab.label}</span>
              </Link>
            ) : (
              <button
                onClick={tab.onClick}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 4,
                  padding: '8px 16px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                }}
              >
                <Icon d={icons[tab.icon as keyof typeof icons] as string} size={22} />
                <span style={{ fontSize: 10, fontWeight: 500 }}>{tab.label}</span>
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build 2>&1 | tail -20`
Expected: BottomTabBar compiles without errors

- [ ] **Step 3: Commit**

```bash
git add components/dashboard/BottomTabBar.tsx && git commit -m "feat: add BottomTabBar component for mobile navigation"
```

---

### Task 3: Create MobileMenu Component

**Files:**
- Create: `components/dashboard/MobileMenu.tsx`

- [ ] **Step 1: Create slide-out menu component**

Create `components/dashboard/MobileMenu.tsx`:

```tsx
'use client';

import Link from 'next/link';
import { signOut } from 'next-auth/react';
import { usePathname } from 'next/navigation';

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

const Icon = ({ d, size = 20 }: { d: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

const icons = {
  categories: 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5',
  settings:   'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z',
  help:       'M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01',
  logout:     'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
  close:      'M18 6L6 18M6 6l12 12',
};

const menuItems = [
  { label: 'Categories', href: '/dashboard/categories', icon: 'categories' },
  { label: 'Settings', href: '/dashboard/settings', icon: 'settings' },
  { label: 'Help & Support', href: '/dashboard/help', icon: 'help' },
];

export function MobileMenu({ isOpen, onClose }: MobileMenuProps) {
  const pathname = usePathname();

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          zIndex: 200,
        }}
      />

      {/* Slide-out panel */}
      <div style={{
        position: 'fixed',
        top: 0,
        right: 0,
        bottom: 0,
        width: 280,
        background: 'var(--bg-surface)',
        zIndex: 201,
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '-4px 0 24px rgba(0, 0, 0, 0.1)',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '20px 20px',
          borderBottom: '1px solid var(--border)',
        }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Menu</span>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              padding: 8,
            }}
          >
            <Icon d={icons.close} />
          </button>
        </div>

        {/* Nav items */}
        <nav style={{ flex: 1, padding: '16px 0' }}>
          {menuItems.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  padding: '14px 20px',
                  textDecoration: 'none',
                  color: active ? 'var(--accent)' : 'var(--text-primary)',
                  background: active ? 'var(--accent-light)' : 'transparent',
                  fontWeight: active ? 600 : 500,
                }}
              >
                <Icon d={icons[item.icon as keyof typeof icons] as string} size={20} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Sign out */}
        <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border)' }}>
          <button
            onClick={() => signOut({ callbackUrl: '/auth/signin' })}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              padding: '14px 20px',
              width: '100%',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--danger)',
              fontWeight: 500,
              borderRadius: 10,
            }}
          >
            <Icon d={icons.logout} size={20} />
            Sign Out
          </button>
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build 2>&1 | tail -20`
Expected: MobileMenu compiles without errors

- [ ] **Step 3: Commit**

```bash
git add components/dashboard/MobileMenu.tsx && git commit -m "feat: add MobileMenu slide-out component"
```

---

### Task 4: Create PullToRefresh Component

**Files:**
- Create: `components/dashboard/PullToRefresh.tsx`

- [ ] **Step 1: Create pull-to-refresh wrapper**

Create `components/dashboard/PullToRefresh.tsx`:

```tsx
'use client';

import { useState, useRef, useCallback } from 'react';

interface PullToRefreshProps {
  children: React.ReactNode;
  onRefresh: () => Promise<void>;
  threshold?: number;
}

export function PullToRefresh({ children, onRefresh, threshold = 80 }: PullToRefreshProps) {
  const [pulling, setPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(0);
  const isAtTop = useRef(true);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (window.scrollY === 0) {
      startY.current = e.touches[0].clientY;
      isAtTop.current = true;
    } else {
      isAtTop.current = false;
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isAtTop.current || refreshing) return;
    
    const currentY = e.touches[0].clientY;
    const distance = Math.max(0, currentY - startY.current);
    
    if (distance > 0) {
      setPulling(true);
      setPullDistance(Math.min(distance, threshold * 1.5));
    }
  }, [refreshing, threshold]);

  const handleTouchEnd = useCallback(async () => {
    if (pullDistance >= threshold && !refreshing) {
      setRefreshing(true);
      setPulling(false);
      await onRefresh();
      setRefreshing(false);
    }
    setPullDistance(0);
    setPulling(false);
  }, [pullDistance, threshold, refreshing, onRefresh]);

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ touchAction: 'pan-y' }}
    >
      {/* Pull indicator */}
      <div style={{
        height: pulling || refreshing ? 60 : 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        transition: refreshing ? 'none' : 'height 0.2s ease',
      }}>
        {refreshing ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 20,
              height: 20,
              border: '2px solid var(--border)',
              borderTopColor: 'var(--accent)',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }} />
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Scanning...</span>
          </div>
        ) : (
          <div style={{
            transform: `translateY(${pullDistance * 0.3}px)`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 8,
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth={2}>
              <path d="M12 5v14M5 12l7-7 7 7" transform={pullDistance >= threshold ? 'rotate(180 12 12)' : ''} />
            </svg>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {pullDistance >= threshold ? 'Release to scan' : 'Pull to refresh'}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{ transform: pulling ? `translateY(${pullDistance * 0.5}px)` : '' }}>
        {children}
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build 2>&1 | tail -20`
Expected: PullToRefresh compiles without errors

- [ ] **Step 3: Commit**

```bash
git add components/dashboard/PullToRefresh.tsx && git commit -m "feat: add PullToRefresh component"
```

---

### Task 5: Create Dashboard Layout with Responsive Structure

**Files:**
- Create: `app/dashboard/layout.tsx`

- [ ] **Step 1: Create dashboard layout that wraps mobile components**

Create `app/dashboard/layout.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { useDevice } from '@/hooks/useDevice';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { BottomTabBar } from '@/components/dashboard/BottomTabBar';
import { MobileMenu } from '@/components/dashboard/MobileMenu';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isMobile } = useDevice();
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showAddPanel, setShowAddPanel] = useState(false);

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar — desktop only */}
      {!isMobile && <Sidebar />}

      {/* Main content */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        paddingBottom: isMobile ? 80 : 0, // space for bottom tabs
      }}>
        {children}
      </div>

      {/* Bottom tab bar — mobile only */}
      {isMobile && (
        <BottomTabBar
          onAddClick={() => setShowAddPanel(true)}
          onMenuClick={() => setShowMobileMenu(true)}
        />
      )}

      {/* Mobile menu */}
      <MobileMenu
        isOpen={showMobileMenu}
        onClose={() => setShowMobileMenu(false)}
      />
    </div>
  );
}
```

Note: This layout will be used by all dashboard pages. But we need to handle the Add panel state at page level. Let me adjust the approach:

Actually, the Add panel needs to be in the individual pages since they handle the onAdd callback. The layout should only provide the navigation shell. Let me update the plan to reflect this.

Actually, let's keep it simple - the layout just provides navigation. The Add panel stays in individual pages.

- [ ] **Step 2: Verify build**

Run: `npm run build 2>&1 | tail -20`
Expected: Layout compiles without errors

- [ ] **Step 3: Commit**

```bash
git add app/dashboard/layout.tsx && git commit -m "feat: add responsive dashboard layout with mobile nav"
```

---

### Task 6: Update Dashboard Page with Responsive Adjustments

**Files:**
- Modify: `app/dashboard/page.tsx`

- [ ] **Step 1: Add responsive stat cards grid**

Read `app/dashboard/page.tsx`. Find the stat cards section (around line 453). The current code is:

```jsx
<div style={{ display: 'flex', gap: 16 }}>
  <StatCard ... />
  <StatCard ... />
  <StatCard ... />
  <StatCard ... />
</div>
```

Replace with:
```jsx
<div style={{
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
  gap: 16,
}}>
  <StatCard label="Total Spend" value={fmt(currentTotal)} ... />
  <StatCard label="Transactions" value={String(currentCount)} ... />
  <StatCard label="Top Category" value={topCategory ? (categoryLabel[topCategory.cat] || ...) : '—'} />
  <StatCard label="AI Insights" value={String(insights.length)} />
</div>
```

**Step 2: Add responsive grid for main content (around line 486)**

Find:
```jsx
<div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20 }}>
```

Replace with:
```jsx
<div style={{
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
  gap: 20,
}}>
```

**Step 3: Wrap content with PullToRefresh and add mobile-specific class**

Find the `<main>` tag at line 386 and its content. Wrap the content inside with PullToRefresh if mobile:

Actually, let's add the PullToRefresh wrapper at the page level in a separate step. For now, just do the grid adjustments.

- [ ] **Step 4: Verify build**

Run: `npm run build 2>&1 | tail -20`
Expected: Dashboard compiles without errors

- [ ] **Step 5: Commit**

```bash
git add app/dashboard/page.tsx && git commit -m "feat: update dashboard page with responsive grid"
```

---

### Task 7: Add CSS Responsive Utilities

**Files:**
- Modify: `app/globals.css`

- [ ] **Step 1: Add responsive utilities to globals.css**

Add at the end of `globals.css`:

```css
/* ─── Responsive Utilities ─── */
@media (max-width: 639px) {
  .hide-mobile { display: none !important; }
  
  .stat-grid {
    grid-template-columns: 1fr 1fr !important;
  }
  
  .charts-grid {
    grid-template-columns: 1fr !important;
  }
  
  .main-content {
    padding: 16px 16px 80px !important;
  }
}

@media (min-width: 640px) {
  .hide-desktop { display: none !important; }
}

@media (min-width: 1024px) {
  .hide-desktop-only { display: none !important; }
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build 2>&1 | tail -20`
Expected: Build passes

- [ ] **Step 3: Commit**

```bash
git add app/globals.css && git commit -m "feat: add responsive CSS utilities"
```

---

### Task 8: Final Verification

- [ ] **Step 1: Run full build**

Run: `npm run build 2>&1`
Expected: All pages compile successfully

- [ ] **Step 2: Verify components exist**

Run: `ls -la components/dashboard/` to verify new files

- [ ] **Step 3: Commit all remaining changes**

```bash
git add -A && git commit -m "feat: implement mobile-first responsive UI"
```

---

## Verification Checklist

After implementation, verify:
- [ ] Sidebar hidden on mobile (<1024px)
- [ ] BottomTabBar visible on mobile
- [ ] BottomTabBar hidden on desktop
- [ ] MobileMenu opens when More tab clicked
- [ ] PullToRefresh shows indicator and triggers scan
- [ ] Stat cards become 2×2 grid on mobile
- [ ] Charts stack vertically on mobile
- [ ] No horizontal scroll on mobile
- [ ] All builds pass without errors