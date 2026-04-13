# Settings Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Settings page where users can manage their connected Google account, toggle email sources (Shopee/Tokopedia/Traveloka/BCA), set scan period, and trigger manual scans.

**Architecture:** Settings page under `/dashboard/settings`. Settings persisted to Firestore at `users/{userId}/settings`. Toggle components styled to match existing card/toggle pattern. Toast notifications for scan feedback.

**Tech Stack:** Next.js App Router, Firestore, NextAuth session, existing CSS custom properties.

---

## File Structure

```
app/dashboard/settings/page.tsx          — Settings page (creates)
app/api/settings/route.ts               — GET/PUT settings API (creates)
components/ui/Toggle.tsx               — Toggle switch component (creates)
components/ui/Toast.tsx                — Toast notification component (creates)
components/dashboard/SettingsSection.tsx — Section wrapper (creates)
lib/firestore.ts                       — add/update (modify)
lib/gmail.ts                           — No changes needed (query already parameterized)
```

---

## Task 1: Toast Component

**Files:**
- Create: `components/ui/Toast.tsx`

- [ ] **Step 1: Write Toast component**

```tsx
'use client';

import { useEffect, useState } from 'react';

export type ToastType = 'success' | 'error';

interface ToastProps {
  message: string;
  type: ToastType;
  onClose: () => void;
  duration?: number;
}

export function Toast({ message, type, onClose, duration = 4000 }: ToastProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 300);
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const bg = type === 'success' ? 'var(--success)' : 'var(--danger)';

  return (
    <div style={{
      position: 'fixed',
      bottom: 24,
      right: 24,
      zIndex: 9999,
      background: bg,
      color: '#fff',
      padding: '12px 20px',
      borderRadius: 12,
      fontSize: 13,
      fontWeight: 500,
      boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(10px)',
      transition: 'all 0.3s ease',
      maxWidth: 320,
    }}>
      {message}
    </div>
  );
}
```

- [ ] **Step 2: Verify file was created**

Run: `ls components/ui/Toast.tsx`

- [ ] **Step 3: Commit**

```bash
git add components/ui/Toast.tsx
git commit -m "feat(settings): add Toast component"
```

---

## Task 2: Toggle Component

**Files:**
- Create: `components/ui/Toggle.tsx`

- [ ] **Step 1: Write Toggle component**

```tsx
'use client';

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
}

export function Toggle({ checked, onChange, disabled, label }: ToggleProps) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1 }}>
      <div style={{ position: 'relative' }}>
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
          style={{ opacity: 0, position: 'absolute', width: 0, height: 0 }}
        />
        <div style={{
          width: 42,
          height: 24,
          borderRadius: 12,
          background: checked ? 'var(--accent)' : 'var(--border)',
          transition: 'background 0.2s ease',
          position: 'relative',
        }}>
          <div style={{
            width: 18,
            height: 18,
            borderRadius: '50%',
            background: '#fff',
            position: 'absolute',
            top: 3,
            left: checked ? 21 : 3,
            transition: 'left 0.2s ease',
            boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
          }} />
        </div>
      </div>
      {label && <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>{label}</span>}
    </label>
  );
}
```

- [ ] **Step 2: Verify file was created**

Run: `ls components/ui/Toggle.tsx`

- [ ] **Step 3: Commit**

```bash
git add components/ui/Toggle.tsx
git commit -m "feat(settings): add Toggle component"
```

---

## Task 3: SettingsSection Component

**Files:**
- Create: `components/dashboard/SettingsSection.tsx`

- [ ] **Step 1: Write SettingsSection wrapper**

```tsx
interface SettingsSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

export function SettingsSection({ title, description, children }: SettingsSectionProps) {
  return (
    <div className="card fade-up" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{title}</h2>
        {description && <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{description}</p>}
      </div>
      {children}
    </div>
  );
}
```

- [ ] **Step 2: Verify file was created**

Run: `ls components/dashboard/SettingsSection.tsx`

- [ ] **Step 3: Commit**

```bash
git add components/dashboard/SettingsSection.tsx
git commit -m "feat(settings): add SettingsSection component"
```

---

## Task 4: GET/PUT /api/settings

**Files:**
- Create: `app/api/settings/route.ts`

- [ ] **Step 1: Write GET handler**

```ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firestore';

export async function GET() {
  const session = await getServerSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.email;
  const docRef = doc(db, 'users', userId, 'settings', 'preferences');
  const snap = await getDoc(docRef);

  if (!snap.exists()) {
    return NextResponse.json({ sources: ['shopee', 'tokopedia', 'traveloka', 'bca'], scanPeriodDays: 30 });
  }

  return NextResponse.json(snap.data());
}
```

- [ ] **Step 2: Write PUT handler**

Add below GET in `app/api/settings/route.ts`:

```ts
export async function PUT(req: NextRequest) {
  const session = await getServerSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.email;
  const body = await req.json();
  const { sources, scanPeriodDays } = body;

  const docRef = doc(db, 'users', userId, 'settings', 'preferences');
  await import('firebase/firestore').then(({ setDoc }) => 
    setDoc(docRef, { sources, scanPeriodDays }, { merge: true })
  );

  return NextResponse.json({ success: true });
}
```

- [ ] **Step 3: Verify file was created**

Run: `ls app/api/settings/route.ts`

- [ ] **Step 4: Commit**

```bash
git add app/api/settings/route.ts
git commit -m "feat(settings): add GET/PUT /api/settings"
```

---

## Task 5: Settings Page

**Files:**
- Create: `app/dashboard/settings/page.tsx`

- [ ] **Step 1: Write Settings page**

```tsx
'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { Toggle } from '@/components/ui/Toggle';
import { Toast, ToastType } from '@/components/ui/Toast';
import { SettingsSection } from '@/components/dashboard/SettingsSection';

const SOURCES = [
  { key: 'shopee',    label: 'Shopee',    query: 'from:shopee' },
  { key: 'tokopedia', label: 'Tokopedia', query: 'from:tokopedia' },
  { key: 'traveloka', label: 'Traveloka', query: 'from:traveloka' },
  { key: 'bca',       label: 'BCA',       query: 'from:bca' },
];

const PERIODS = [
  { value: 7,  label: 'Last 7 days' },
  { value: 30, label: 'Last 30 days' },
  { value: 90, label: 'Last 90 days' },
];

interface Settings {
  sources: string[];
  scanPeriodDays: number;
}

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [settings, setSettings] = useState<Settings>({ sources: ['shopee', 'tokopedia', 'traveloka', 'bca'], scanPeriodDays: 30 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/signin');
  }, [status, router]);

  const loadSettings = useCallback(async () => {
    const res = await fetch('/api/settings');
    const data = await res.json();
    setSettings(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (session?.user) loadSettings();
  }, [session, loadSettings]);

  async function saveSettings(newSettings: Settings) {
    setSaving(true);
    await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newSettings),
    });
    setSettings(newSettings);
    setSaving(false);
  }

  function toggleSource(key: string) {
    const newSources = settings.sources.includes(key)
      ? settings.sources.filter((s) => s !== key)
      : [...settings.sources, key];
    saveSettings({ ...settings, sources: newSources });
  }

  async function handleScan() {
    setScanning(true);
    try {
      const res = await fetch('/api/emails/scan', { method: 'POST' });
      if (res.ok) {
        setToast({ message: 'Scan complete!', type: 'success' });
      } else {
        setToast({ message: 'Scan failed. Try again.', type: 'error' });
      }
    } catch {
      setToast({ message: 'Scan failed. Try again.', type: 'error' });
    }
    setScanning(false);
  }

  if (status === 'loading' || loading) {
    return <main style={{ padding: '32px' }}><div className="skeleton" style={{ height: 200 }} /></main>;
  }

  const userEmail = session?.user?.email ?? '';

  return (
    <main style={{ padding: '32px', maxWidth: 640, display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>Settings</h1>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>Manage your account and email sources</p>
      </div>

      <SettingsSection
        title="Connected Account"
        description="Google account used for scanning transaction emails"
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontWeight: 700, fontSize: 14,
            }}>
              {userEmail[0]?.toUpperCase()}
            </div>
            <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>{userEmail}</span>
          </div>
          <button
            className="btn btn-ghost"
            style={{ fontSize: 12, color: 'var(--danger)' }}
            onClick={() => signOut({ callbackUrl: '/auth/signin' })}
          >
            Disconnect
          </button>
        </div>
      </SettingsSection>

      <SettingsSection
        title="Email Sources"
        description="Choose which merchants to scan for transactions"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {SOURCES.map(({ key, label }) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{label}</p>
                <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{SOURCES.find(s => s.key === key)?.query}</p>
              </div>
              <Toggle
                checked={settings.sources.includes(key)}
                onChange={() => toggleSource(key)}
                disabled={saving}
              />
            </div>
          ))}
        </div>
      </SettingsSection>

      <SettingsSection
        title="Scan Settings"
        description="How far back to look for transaction emails"
      >
        <select
          value={settings.scanPeriodDays}
          onChange={(e) => saveSettings({ ...settings, scanPeriodDays: Number(e.target.value) })}
          style={{
            padding: '10px 14px',
            borderRadius: 10,
            border: '1.5px solid var(--border)',
            background: 'var(--bg-surface)',
            color: 'var(--text-primary)',
            fontSize: 13,
            cursor: 'pointer',
            width: '100%',
            maxWidth: 200,
          }}
        >
          {PERIODS.map(({ value, label }) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </SettingsSection>

      <SettingsSection
        title="Manual Scan"
        description="Manually trigger email scanning"
      >
        <button
          className="btn btn-primary"
          onClick={handleScan}
          disabled={scanning}
          style={{ opacity: scanning ? 0.7 : 1, alignSelf: 'flex-start' }}
        >
          {scanning ? 'Scanning…' : 'Scan Now'}
        </button>
      </SettingsSection>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </main>
  );
}
```

- [ ] **Step 2: Verify file was created**

Run: `ls app/dashboard/settings/page.tsx`

- [ ] **Step 3: Commit**

```bash
git add app/dashboard/settings/page.tsx
git commit -m "feat(settings): add settings page"
```

---

## Self-Review Checklist

1. **Spec coverage:**
   - Connected Account section with email display and Disconnect button ✓
   - Email Sources toggles (Shopee/Tokopedia/Traveloka/BCA) ✓
   - Scan period dropdown ✓
   - Manual Scan button ✓
   - Toast notifications ✓

2. **Placeholder scan:** No TBD/TODO found.

3. **Type consistency:**
   - `settings.sources` is `string[]` — matches GET/PUT
   - `settings.scanPeriodDays` is `number` — matches GET/PUT
   - Firestore doc path `users/{userId}/settings/preferences` — consistent across GET/PUT

---

**Plan complete and saved to `docs/superpowers/plans/2026-04-13-settings-page.md`.**

Two execution options:

1. **Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration
2. **Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?