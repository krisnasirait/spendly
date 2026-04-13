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