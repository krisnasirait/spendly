# Gen-Z UI Revamp Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Revamp Spendly's UI to a light, playful Gen-Z aesthetic with vibrant gradients, rounded shapes, and bouncy interactions.

**Architecture:** CSS-first approach — update globals.css with new design tokens, then update components to use them. No backend changes needed.

**Tech Stack:** Next.js (React), CSS (globals.css + inline styles), no new dependencies.

---

## File Structure

| File | Changes |
|------|---------|
| `app/globals.css` | All design tokens (colors, fonts, radii, shadows, transitions) |
| `components/dashboard/Sidebar.tsx` | Dark indigo bg, gradient active nav |
| `app/dashboard/page.tsx` | Cards, buttons, tables with new styling |
| `components/dashboard/BudgetOverview.tsx` | Gradient top border on cards |
| `components/dashboard/BudgetProgress.tsx` | Colored progress bars, gradient styling |
| `components/EditBudgetsModal.tsx` | Rounded modal, gradient button |

---

## Tasks

### Task 1: Update globals.css Design Tokens

**Files:**
- Modify: `app/globals.css`

- [ ] **Step 1: Write new design tokens**

Replace the entire `:root` section and add font imports. New tokens:

```css
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@600;700;800&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap');

:root {
  /* Backgrounds */
  --bg-page:      #FAFBFF;
  --bg-surface:   #FFFFFF;
  --bg-sidebar:   #1E1B4B;

  /* Brand Gradient */
  --accent-start: #7C3AED;
  --accent-end:   #EC4899;
  --accent:       #7C3AED;
  --accent-light: #F3E8FF;

  /* Text */
  --text-primary:    #1E1B4B;
  --text-secondary:  #6B7280;
  --text-muted:      #9CA3AF;

  /* Semantic */
  --success:     #10B981;
  --success-bg:  #ECFDF5;
  --danger:      #EF4444;
  --danger-bg:   #FEF2F2;
  --warning:     #F59E0B;
  --warning-bg:  #FFFBEB;

  /* Borders & shadows */
  --border:         #E5E7EB;
  --border-subtle:  #F3F4F6;
  --shadow-card:    0 2px 8px rgba(124, 108, 248, 0.06);
  --shadow-hover:   0 12px 40px rgba(124, 108, 248, 0.15);

  /* Radii */
  --radius-sm:   8px;
  --radius-md:   12px;
  --radius-lg:   20px;
  --radius-xl:   24px;
  --radius-pill: 999px;

  /* Sidebar */
  --sidebar-w:   260px;

  /* Transitions */
  --transition-fast: 150ms ease;
  --transition-base: 200ms ease;
  --transition-bounce: 300ms cubic-bezier(0.34, 1.56, 0.64, 1);
}
```

- [ ] **Step 2: Update font-family in @theme**

```css
@theme inline {
  --color-accent:       var(--accent);
  --color-accent-light: var(--accent-light);
  --font-family-heading: 'Plus Jakarta Sans', system-ui, sans-serif;
  --font-family-sans:   'IBM Plex Sans', -apple-system, BlinkMacSystemFont, sans-serif;
}
```

- [ ] **Step 3: Update body font**

```css
body {
  font-family: var(--font-family-sans);
  /* ... existing properties ... */
}
```

- [ ] **Step 4: Update .card class with larger radius and hover effect**

```css
.card {
  background: var(--bg-surface);
  border-radius: var(--radius-lg);
  padding: 24px;
  box-shadow: var(--shadow-card);
  border: 1px solid var(--border);
  transition: box-shadow var(--transition-base), transform var(--transition-base);
}
.card:hover {
  box-shadow: var(--shadow-hover);
  transform: translateY(-2px) scale(1.02);
}
```

- [ ] **Step 5: Update .btn-primary with gradient**

```css
.btn-primary {
  background: linear-gradient(135deg, var(--accent-start) 0%, var(--accent-end) 100%);
  color: #fff;
}
.btn-primary:hover {
  box-shadow: 0 6px 20px rgba(124, 108, 248, 0.35);
  transform: translateY(-1px);
}
```

- [ ] **Step 6: Update .fade-up animation**

```css
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
}
.fade-up { animation: fadeUp 0.4s ease forwards; }
```

- [ ] **Step 7: Run build to verify**

Run: `npm run build 2>&1 | tail -30`
Expected: All pages compile without errors

---

### Task 2: Update Sidebar Component

**Files:**
- Modify: `components/dashboard/Sidebar.tsx`

- [ ] **Step 1: Update active nav item with gradient**

In the nav item style where `active` is true, update to use gradient background:

```jsx
// Find this line in the active nav item styles:
background: active ? 'rgba(37, 99, 235, 0.9)' : 'transparent',

// Replace with:
background: active 
  ? 'linear-gradient(135deg, var(--accent-start) 0%, var(--accent-end) 100%)' 
  : 'transparent',
```

- [ ] **Step 2: Update logo gradient**

Update the logo gradient to use new accent colors:

```jsx
// In the logo div style:
background: 'linear-gradient(135deg, var(--accent-start) 0%, var(--accent-end) 100%)',
```

- [ ] **Step 3: Update user avatar gradient**

```jsx
// In the user avatar div:
background: 'linear-gradient(135deg, var(--accent-start) 0%, var(--accent-end) 100%)',
```

- [ ] **Step 4: Verify build**

Run: `npm run build 2>&1 | tail -20`
Expected: Sidebar renders correctly

---

### Task 3: Update Dashboard Page

**Files:**
- Modify: `app/dashboard/page.tsx`

- [ ] **Step 1: Update header greeting**

Replace "Good morning" with Plus Jakarta Sans font style:

```jsx
<h1 style={{ 
  fontSize: 26, 
  fontWeight: 800, 
  letterSpacing: '-0.5px', 
  color: 'var(--text-primary)',
  fontFamily: 'var(--font-family-heading)',
  background: 'linear-gradient(135deg, var(--accent-start), var(--accent-end))',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
}}>
  Good morning, {firstName}
</h1>
```

- [ ] **Step 2: Update StatCard with gradient accent line**

In the StatCard component, add a gradient top border effect. Inside the card div:

```jsx
<div className="card fade-up" style={{ 
  flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 12,
  padding: '22px 24px',
  position: 'relative',
  overflow: 'hidden',
}}>
  {/* Gradient accent line at top */}
  <div style={{
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    background: 'linear-gradient(90deg, var(--accent-start), var(--accent-end))',
    borderRadius: '20px 20px 0 0',
  }} />
  {/* Rest of card content */}
  <div style={{ paddingTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
```

- [ ] **Step 3: Update scan button to use gradient**

Find the scan button and ensure it uses the gradient:

```jsx
<button
  id="scan-emails-btn"
  className="btn btn-primary"
  onClick={handleScan}
  disabled={scanning}
  style={{ 
    opacity: scanning ? 0.7 : 1,
    padding: '10px 22px',
  }}
>
  <ScanIco />
  {scanning ? 'Scanning…' : 'Scan Emails'}
</button>
```

- [ ] **Step 4: Update FAB button with gradient and glow**

Find the FAB button and update:

```jsx
<button
  onClick={() => setShowAddPanel(true)}
  style={{
    position: 'fixed',
    bottom: 28,
    right: 28,
    width: 54,
    height: 54,
    borderRadius: 16,
    background: 'linear-gradient(135deg, var(--accent-start) 0%, var(--accent-end) 100%)',
    color: '#fff',
    border: 'none',
    cursor: 'pointer',
    fontSize: 26,
    boxShadow: '0 6px 24px rgba(124, 108, 248, 0.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 30,
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
  }}
  onMouseEnter={(e) => {
    e.currentTarget.style.transform = 'scale(1.08) translateY(-2px)';
    e.currentTarget.style.boxShadow = '0 10px 32px rgba(124, 108, 248, 0.5)';
  }}
  onMouseLeave={(e) => {
    e.currentTarget.style.transform = 'scale(1) translateY(0)';
    e.currentTarget.style.boxShadow = '0 6px 24px rgba(124, 108, 248, 0.4)';
  }}
>
  +
</button>
```

- [ ] **Step 5: Verify build**

Run: `npm run build 2>&1 | tail -20`
Expected: Dashboard compiles without errors

---

### Task 4: Update BudgetOverview Component

**Files:**
- Modify: `components/dashboard/BudgetOverview.tsx`

- [ ] **Step 1: Add gradient top border to the container card**

```jsx
<div className="card fade-up" style={{ 
  padding: '22px 24px',
  position: 'relative',
  overflow: 'hidden',
}}>
  {/* Gradient accent line */}
  <div style={{
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    background: 'linear-gradient(90deg, var(--accent-start), var(--accent-end))',
    borderRadius: '20px 20px 0 0',
  }} />
```

Also update the content wrapper to have `paddingTop: 12`:

```jsx
<div style={{ paddingTop: 12 }}>
  {/* existing content */}
</div>
```

- [ ] **Step 2: Update "Edit Budgets" button**

```jsx
<button
  onClick={() => setShowEditModal(true)}
  className="btn btn-primary"
  style={{ fontSize: 12, padding: '7px 14px' }}
>
  Edit Budgets
</button>
```

- [ ] **Step 3: Verify build**

Run: `npm run build 2>&1 | tail -20`
Expected: BudgetOverview compiles without errors

---

### Task 5: Update BudgetProgress Component

**Files:**
- Modify: `components/dashboard/BudgetProgress.tsx`

- [ ] **Step 1: Update progress bar to use gradient based on category**

The progress bar background should reflect category color. Use a CSS class or inline gradient:

```jsx
// Update the progress bar container style
<div style={{
  height: 10,  // slightly thicker
  background: 'var(--border)',
  borderRadius: 999,
  overflow: 'hidden',
}}>
  <div style={{
    width: `${pct}%`,
    height: '100%',
    background: pct >= 90 
      ? 'linear-gradient(90deg, var(--danger), #F87171)'
      : pct >= 70 
      ? 'linear-gradient(90deg, var(--warning), #FBBF24)'
      : `linear-gradient(90deg, var(--accent-start), var(--accent-end))`,
    borderRadius: 999,
    transition: 'width 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
  }} />
</div>
```

- [ ] **Step 2: Update edit icon button to use accent color on hover**

```jsx
<button
  onClick={onEdit}
  style={{
    background: 'none', border: 'none', cursor: 'pointer',
    color: 'var(--text-muted)', padding: 4,
    display: 'flex', alignItems: 'center',
    borderRadius: 6,
    transition: 'all 0.15s ease',
  }}
  onMouseEnter={(e) => {
    e.currentTarget.style.color = 'var(--accent)';
    e.currentTarget.style.background = 'var(--accent-light)';
  }}
  onMouseLeave={(e) => {
    e.currentTarget.style.color = 'var(--text-muted)';
    e.currentTarget.style.background = 'transparent';
  }}
>
  <EditIcon />
</button>
```

- [ ] **Step 3: Verify build**

Run: `npm run build 2>&1 | tail -20`
Expected: BudgetProgress compiles without errors

---

### Task 6: Update InsightCard Component

**Files:**
- Modify: `app/dashboard/page.tsx` (InsightCard function inside)

- [ ] **Step 1: Update InsightCard to use colored left border and icon styling**

Replace the InsightCard function:

```jsx
function InsightCard({ insight }: { insight: Insight }) {
  const severityStyles = {
    high:   { bg: '#FEF2F2', border: '#FCA5A5', color: '#DC2626', icon: <AlertIco /> },
    medium: { bg: '#FFFBEB', border: '#FDE68A', color: '#D97706', icon: <AlertIco /> },
    low:    { bg: '#ECFDF5', border: '#A7F3D0', color: '#059669', icon: <CheckCircleIco /> },
  }[insight.severity];

  const typeColors = {
    spike:           '#EC4899',
    budget_alert:    '#F59E0B',
    unusual_tx:      '#8B5CF6',
    encouragement:   '#10B981',
    trend:           '#7C3AED',
    category_overload: '#F59E0B',
    pattern:         '#7C3AED',
  }[insight.type] || '#7C3AED';

  return (
    <div style={{
      padding: '14px 16px',
      borderRadius: 14,
      background: severityStyles.bg,
      borderLeft: `4px solid ${typeColors}`,
      display: 'flex', 
      alignItems: 'flex-start', 
      gap: 12,
      transition: 'transform 0.15s ease, box-shadow 0.15s ease',
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = 'translateX(4px)';
      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = 'translateX(0)';
      e.currentTarget.style.boxShadow = 'none';
    }}>
      <div style={{ 
        flexShrink: 0, 
        paddingTop: 2,
        width: 32,
        height: 32,
        borderRadius: 10,
        background: `${typeColors}15`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <span style={{ color: typeColors }}>{severityStyles.icon}</span>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.5, marginBottom: 8 }}>{insight.text}</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ 
            fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
            color: typeColors,
            background: `${typeColors}15`,
            padding: '2px 8px',
            borderRadius: 999,
          }}>
            {insight.type.replace('_', ' ')}
          </span>
          <span style={{ 
            fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em',
            color: severityStyles.color,
          }}>
            {insight.severity}
          </span>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build 2>&1 | tail -20`
Expected: InsightCard renders correctly

---

### Task 7: Update EditBudgetsModal

**Files:**
- Modify: `components/dashboard/EditBudgetsModal.tsx`

- [ ] **Step 1: Update modal to use gradient header and rounded corners**

```jsx
// Update the modal container
<div style={{
  background: 'var(--bg-surface)', 
  borderRadius: 24,  // larger radius
  width: '100%', 
  maxWidth: 500,
  boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
  overflow: 'hidden',
}}>
  {/* Gradient header */}
  <div style={{ 
    padding: '20px 24px', 
    background: 'linear-gradient(135deg, var(--accent-start) 0%, var(--accent-end) 100%)',
  }}>
    <h2 style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>Edit Budgets</h2>
    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 }}>
      Set monthly spending limits for each category
    </p>
  </div>
```

- [ ] **Step 2: Update "Save Budgets" button to gradient**

```jsx
<button onClick={handleSave} style={{
  background: 'linear-gradient(135deg, var(--accent-start) 0%, var(--accent-end) 100%)',
  color: '#fff',
  border: 'none',
  padding: '10px 20px',
  borderRadius: 10,
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'all 0.15s ease',
}}>
  Save Budgets
</button>
```

- [ ] **Step 3: Verify build**

Run: `npm run build 2>&1 | tail -20`
Expected: EditBudgetsModal renders correctly

---

### Task 8: Final Verification

- [ ] **Step 1: Run full build**

Run: `npm run build 2>&1`
Expected: All pages compile successfully

- [ ] **Step 2: Test locally (if dev server available)**

Run: `npm run dev` (in background if needed)
Expected: App loads at http://localhost:3000

- [ ] **Step 3: Commit changes**

```bash
git add -A && git commit -m "feat: apply gen-z UI revamp - light & playful design"
```

Expected: Clean commit with all UI changes

---

## Verification Checklist

After implementation, verify:
- [ ] Background is cool white (#FAFBFF)
- [ ] Cards have large rounded corners (20px)
- [ ] Primary buttons have violet-to-pink gradient
- [ ] Active nav items have gradient background
- [ ] Cards lift and scale on hover
- [ ] FAB has gradient with colored glow
- [ ] Insight cards have colored left border
- [ ] Budget progress bars use gradient colors based on percentage
- [ ] Headings use gradient text effect on greeting
- [ ] All builds pass without errors