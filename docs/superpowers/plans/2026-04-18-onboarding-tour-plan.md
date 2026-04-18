# C1: Onboarding Tour Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add first-time user onboarding tour with tooltip overlays explaining key features.

**Architecture:** OnboardingTour component that shows tooltip overlays; stores completion state in user settings; shows on dashboard if user hasn't seen it yet.

**Tech Stack:** Next.js App Router, React, CSS-in-JS (inline styles), localStorage fallback for settings

---

## File Structure

| File | Responsibility |
|------|----------------|
| `components/onboarding/OnboardingTour.tsx` | New - tooltip tour component with steps |
| `app/dashboard/page.tsx` | Modify - check and trigger onboarding |
| `app/api/settings/route.ts` | Modify - add hasSeenOnboarding field |

---

## Tasks

### Task 1: Create OnboardingTour Component

**Files:**
- Create: `components/onboarding/OnboardingTour.tsx`

- [ ] **Step 1: Create the OnboardingTour component**

Create `components/onboarding/OnboardingTour.tsx`:

```typescript
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface TourStep {
  target: string;
  title: string;
  description: string;
  position: 'top' | 'bottom' | 'left' | 'right';
}

const TOUR_STEPS: TourStep[] = [
  {
    target: '[data-tour="scan-button"]',
    title: 'Scan Your Emails',
    description: 'Click here to automatically import transactions from Shopee, Tokopedia, and more.',
    position: 'bottom',
  },
  {
    target: '[data-tour="pending"]',
    title: 'Review Transactions',
    description: 'Pending transactions need your review before being added to your history.',
    position: 'right',
  },
  {
    target: '[data-tour="analytics"]',
    title: 'Track Spending Patterns',
    description: 'See your spending trends, top merchants, and monthly comparisons.',
    position: 'left',
  },
  {
    target: '[data-tour="categories"]',
    title: 'Organize Categories',
    description: 'Set budgets for each category to stay on top of your spending.',
    position: 'right',
  },
];

interface OnboardingTourProps {
  onComplete: () => void;
}

export function OnboardingTour({ onComplete }: OnboardingTourProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const step = TOUR_STEPS[currentStep];
  const isLast = currentStep === TOUR_STEPS.length - 1;

  const handleNext = () => {
    if (isLast) {
      onComplete();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 1000,
      background: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <div style={{
        background: 'var(--bg-surface)',
        borderRadius: 16,
        padding: 24,
        maxWidth: 400,
        width: '90%',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
      }}>
        <div style={{ marginBottom: 16 }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>{step.title}</h3>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            {step.description}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 20 }}>
          <div style={{ display: 'flex', gap: 6 }}>
            {TOUR_STEPS.map((_, i) => (
              <div
                key={i}
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: i === currentStep ? 'var(--accent)' : 'var(--border)',
                }}
              />
            ))}
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handleSkip}
              style={{
                padding: '8px 16px',
                borderRadius: 8,
                border: '1px solid var(--border)',
                background: 'transparent',
                color: 'var(--text-muted)',
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              Skip
            </button>
            <button
              onClick={handleNext}
              style={{
                padding: '8px 16px',
                borderRadius: 8,
                border: 'none',
                background: 'var(--accent)',
                color: '#fff',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {isLast ? 'Get Started' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add components/onboarding/OnboardingTour.tsx
git commit -m "feat: add onboarding tour component"
```

---

### Task 2: Update Settings API for hasSeenOnboarding

**Files:**
- Modify: `app/api/settings/route.ts`

- [ ] **Step 1: Read current settings API**

Read `app/api/settings/route.ts` to understand current structure.

- [ ] **Step 2: Add hasSeenOnboarding to settings**

In the GET handler, add `hasSeenOnboarding` to the default return and to the response:

Find where the default settings are returned and add:
```typescript
return NextResponse.json({ sources: ['shopee', 'tokopedia', 'traveloka', 'bca', 'ayo', 'jago'], scanPeriodDays: 30, billingStartDay: 1, manualVerificationEnabled: false, hasSeenOnboarding: false });
```

In the PUT handler, add handling for `hasSeenOnboarding`:
```typescript
if (hasSeenOnboarding !== undefined) updates.hasSeenOnboarding = hasSeenOnboarding;
```

And add `hasSeenOnboarding` to the destructuring:
```typescript
const { sources, scanPeriodDays, billingStartDay, manualVerificationEnabled, hasSeenOnboarding } = body;
```

- [ ] **Step 3: Run type check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add app/api/settings/route.ts
git commit -m "feat: add hasSeenOnboarding to settings"
```

---

### Task 3: Integrate Onboarding into Dashboard

**Files:**
- Modify: `app/dashboard/page.tsx`

- [ ] **Step 1: Read dashboard page to understand structure**

Read `app/dashboard/page.tsx` lines 1-60 to understand state and useEffect.

- [ ] **Step 2: Add hasSeenOnboarding state and check**

Add state:
```typescript
const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);
const [showOnboarding, setShowOnboarding] = useState(false);
```

In the useEffect that loads settings (around line 100-120), add:
```typescript
if (data.hasSeenOnboarding !== undefined) {
  setHasSeenOnboarding(data.hasSeenOnboarding);
  if (!data.hasSeenOnboarding) {
    setShowOnboarding(true);
  }
}
```

Add save function:
```typescript
const completeOnboarding = async () => {
  await fetch('/api/settings', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ hasSeenOnboarding: true }),
  });
  setShowOnboarding(false);
  setHasSeenOnboarding(true);
};
```

- [ ] **Step 3: Add OnboardingTour to render**

Find where the main content starts (around line 180) and add before it:
```tsx
{showOnboarding && <OnboardingTour onComplete={completeOnboarding} />}
```

- [ ] **Step 4: Import the component**

Add to imports:
```typescript
import { OnboardingTour } from '@/components/onboarding/OnboardingTour';
```

- [ ] **Step 5: Run type check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add app/dashboard/page.tsx
git commit -m "feat: integrate onboarding tour in dashboard"
```

---

## Verification

1. Clear localStorage or set `hasSeenOnboarding: false` in settings
2. Navigate to `/dashboard`
3. Onboarding modal should appear with "Scan Your Emails" step
4. Click Next to cycle through steps
5. Click "Get Started" to complete and dismiss
6. Refresh page - onboarding should not appear again