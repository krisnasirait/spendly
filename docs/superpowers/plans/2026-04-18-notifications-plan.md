# C2: Browser Notifications Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add browser push notification settings and in-app notification bell with budget alerts and weekly summaries.

**Architecture:** Notification preferences stored in user settings; in-app bell icon shows notification count and dropdown; notification trigger logic runs on relevant events.

**Tech Stack:** Next.js App Router, React, Web Notifications API, Firestore

---

## File Structure

| File | Responsibility |
|------|----------------|
| `app/api/notifications/preferences/route.ts` | API for notification settings |
| `components/notifications/NotificationBell.tsx` | In-app notification bell component |
| `app/dashboard/settings/page.tsx` | Modify - add notification settings UI |

---

## Tasks

### Task 1: Create Notification Preferences API

**Files:**
- Create: `app/api/notifications/preferences/route.ts`

- [ ] **Step 1: Create the API route**

Create `app/api/notifications/preferences/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/firestore';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const db = getDb();

  const docSnap = await db
    .collection('users').doc(userId)
    .collection('settings').doc('notificationPreferences')
    .get();

  const defaults = {
    enabled: false,
    budgetAlerts: true,
    weeklySummary: false,
    recurringReminders: true,
  };

  if (!docSnap.exists) {
    return NextResponse.json(defaults);
  }

  return NextResponse.json(docSnap.data());
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const body = await req.json().catch(() => ({}));

  const { enabled, budgetAlerts, weeklySummary, recurringReminders } = body;

  const updates: Record<string, boolean> = {};
  if (typeof enabled === 'boolean') updates.enabled = enabled;
  if (typeof budgetAlerts === 'boolean') updates.budgetAlerts = budgetAlerts;
  if (typeof weeklySummary === 'boolean') updates.weeklySummary = weeklySummary;
  if (typeof recurringReminders === 'boolean') updates.recurringReminders = recurringReminders;

  const db = getDb();
  await db
    .collection('users').doc(userId)
    .collection('settings').doc('notificationPreferences')
    .set(updates, { merge: true });

  return NextResponse.json({ success: true });
}
```

- [ ] **Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add app/api/notifications/preferences/route.ts
git commit -m "feat: add notification preferences API"
```

---

### Task 2: Create NotificationBell Component

**Files:**
- Create: `components/notifications/NotificationBell.tsx`

- [ ] **Step 1: Create the NotificationBell component**

Create `components/notifications/NotificationBell.tsx`:

```typescript
'use client';

import { useState, useEffect } from 'react';

interface NotificationPreferences {
  enabled: boolean;
  budgetAlerts: boolean;
  weeklySummary: boolean;
  recurringReminders: boolean;
}

interface Notification {
  id: string;
  type: 'budget_alert' | 'weekly_summary' | 'recurring_reminder';
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
}

export function NotificationBell() {
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    fetch('/api/notifications/preferences')
      .then(res => res.json())
      .then(data => setPrefs(data))
      .catch(() => {});
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleToggle = async (key: keyof NotificationPreferences) => {
    if (!prefs) return;
    const newPrefs = { ...prefs, [key]: !prefs[key] };
    await fetch('/api/notifications/preferences', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newPrefs),
    });
    setPrefs(newPrefs);
  };

  if (!prefs?.enabled) return null;

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        style={{
          width: 36,
          height: 36,
          borderRadius: '50%',
          border: '1px solid var(--border)',
          background: 'var(--bg-surface)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute',
            top: -4,
            right: -4,
            width: 16,
            height: 16,
            borderRadius: '50%',
            background: 'var(--accent)',
            color: '#fff',
            fontSize: 10,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            {unreadCount}
          </span>
        )}
      </button>

      {showDropdown && (
        <div style={{
          position: 'absolute',
          top: '100%',
          right: 0,
          marginTop: 8,
          width: 280,
          background: 'var(--bg-surface)',
          borderRadius: 12,
          border: '1px solid var(--border)',
          boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
          padding: 16,
          zIndex: 100,
        }}>
          <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Notification Settings</h4>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={prefs.budgetAlerts}
                onChange={() => handleToggle('budgetAlerts')}
                style={{ width: 16, height: 16 }}
              />
              <span style={{ fontSize: 13 }}>Budget Alerts</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={prefs.weeklySummary}
                onChange={() => handleToggle('weeklySummary')}
                style={{ width: 16, height: 16 }}
              />
              <span style={{ fontSize: 13 }}>Weekly Summary</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={prefs.recurringReminders}
                onChange={() => handleToggle('recurringReminders')}
                style={{ width: 16, height: 16 }}
              />
              <span style={{ fontSize: 13 }}>Recurring Reminders</span>
            </label>
          </div>

          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 12 }}>
            Notifications are sent to your browser when enabled.
          </p>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add components/notifications/NotificationBell.tsx
git commit -m "feat: add notification bell component"
```

---

### Task 3: Add Notification Settings to Settings Page

**Files:**
- Modify: `app/dashboard/settings/page.tsx`

- [ ] **Step 1: Read settings page to find where to add section**

Read `app/dashboard/settings/page.tsx` to find the SettingsSection pattern around lines 510-540.

- [ ] **Step 2: Add Notification Settings section**

Find a good location (after Scan Settings section) and add:

```tsx
<SettingsSection
  title="Notifications"
  description="Manage your browser notification preferences"
>
  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div>
        <p style={{ fontSize: 13, fontWeight: 500 }}>Enable Notifications</p>
        <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>Receive alerts in your browser</p>
      </div>
      <button
        onClick={async () => {
          if (!('Notification' in window)) {
            alert('Your browser does not support notifications');
            return;
          }
          const permission = await Notification.requestPermission();
          if (permission === 'granted') {
            const newEnabled = !notificationPrefs?.enabled;
            await fetch('/api/notifications/preferences', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ enabled: newEnabled }),
            });
            setNotificationPrefs(prev => prev ? { ...prev, enabled: newEnabled } : null);
          }
        }}
        style={{
          width: 44,
          height: 24,
          borderRadius: 12,
          border: 'none',
          background: notificationPrefs?.enabled ? 'var(--accent)' : 'var(--border)',
          cursor: 'pointer',
          position: 'relative',
          transition: 'background 0.2s',
        }}
      >
        <div style={{
          width: 20,
          height: 20,
          borderRadius: '50%',
          background: '#fff',
          position: 'absolute',
          top: 2,
          left: notificationPrefs?.enabled ? 22 : 2,
          transition: 'left 0.2s',
        }} />
      </button>
    </div>

    {notificationPrefs?.enabled && (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {['budgetAlerts', 'weeklySummary', 'recurringReminders'].map(key => (
          <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={notificationPrefs[key as keyof typeof notificationPrefs] as boolean}
              onChange={async () => {
                const newVal = !notificationPrefs[key as keyof typeof notificationPrefs];
                await fetch('/api/notifications/preferences', {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ [key]: newVal }),
                });
                setNotificationPrefs(prev => prev ? { ...prev, [key]: newVal } : null);
              }}
              style={{ width: 16, height: 16 }}
            />
            <span style={{ fontSize: 13 }}>
              {key === 'budgetAlerts' ? 'Budget Alerts' :
               key === 'weeklySummary' ? 'Weekly Summary' :
               'Recurring Reminders'}
            </span>
          </label>
        ))}
      </div>
    )}
  </div>
</SettingsSection>
```

- [ ] **Step 3: Add state and fetch for notification preferences**

Add state:
```typescript
const [notificationPrefs, setNotificationPrefs] = useState<{
  enabled: boolean;
  budgetAlerts: boolean;
  weeklySummary: boolean;
  recurringReminders: boolean;
} | null>(null);
```

Add to useEffect that loads settings:
```typescript
fetch('/api/notifications/preferences')
  .then(res => res.json())
  .then(data => setNotificationPrefs(data))
  .catch(() => {});
```

- [ ] **Step 4: Run type check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add app/dashboard/settings/page.tsx
git commit -m "feat: add notification settings to settings page"
```

---

## Verification

1. Navigate to `/dashboard/settings`
2. Scroll to "Notifications" section
3. Toggle "Enable Notifications" - browser should ask for permission
4. When enabled, check/uncheck individual notification types
5. NotificationBell should appear in dashboard header when enabled