'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { Toast, ToastType } from '@/components/ui/Toast';
import { SettingsSection } from '@/components/dashboard/SettingsSection';
import { useDevice } from '@/hooks/useDevice';

const SOURCES = [
  { key: 'shopee',    label: 'Shopee',    query: 'from:shopee' },
  { key: 'tokopedia', label: 'Tokopedia', query: 'from:tokopedia' },
  { key: 'traveloka', label: 'Traveloka', query: 'from:traveloka' },
  { key: 'bca',       label: 'BCA',       query: 'from:bca' },
  { key: 'ayo',       label: 'AYO Indonesia', query: 'from:ayo' },
  { key: 'jago',      label: 'Jago',      query: 'from:jago' },
  { key: 'bni',       label: 'BNI',       query: 'from:bni' },
];

const PERIODS = [
  { value: 7,  label: 'Last 7 days' },
  { value: 30, label: 'Last 30 days' },
  { value: 90, label: 'Last 90 days' },
];

interface Settings {
  sources: string[];
  scanPeriodDays: number;
  billingStartDay: number;
  manualVerificationEnabled: boolean;
}

interface ScanResults {
  scanned: number;
  parsed: number;
  bySource: Record<string, number>;
  emails: Array<{
    id: string;
    subject: string;
    from: string;
    date: string;
    snippet: string;
    source: string;
  }>;
  transactions: Array<{
    id: string;
    merchant: string;
    amount: number;
    date: string;
    category: string;
    source: string;
  }>;
}

const sourceColors: Record<string, { color: string; bg: string }> = {
  shopee:    { color: '#EE4D2D', bg: '#FFF0EE' },
  tokopedia: { color: '#03AC0E', bg: '#F0FFF1' },
  traveloka: { color: '#0064D2', bg: '#EBF4FF' },
  bca:       { color: '#005BAC', bg: '#EBF2FF' },
  ayo:       { color: '#FF6B00', bg: '#FFF4EE' },
  jago:      { color: '#00A651', bg: '#E8F5ED' },
};

const fmtCurrency = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

function SourceBadge({ source }: { source: string }) {
  const colors = sourceColors[source] ?? { color: '#6B7280', bg: '#F3F4F6' };
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: 999,
      fontSize: 10,
      fontWeight: 600,
      background: colors.bg,
      color: colors.color,
    }}>
      {source.charAt(0).toUpperCase() + source.slice(1)}
    </span>
  );
}

function ScanResultsPanel({ results, onViewAll }: { results: ScanResults; onViewAll: () => void }) {
  const [emailsExpanded, setEmailsExpanded] = useState(true);
  const [txExpanded, setTxExpanded] = useState(true);
  const emailMap = Object.fromEntries(results.emails.map(e => [e.id, e]));

  return (
    <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{
        padding: '16px',
        borderRadius: 12,
        background: 'var(--bg-page)',
        border: '1px solid var(--border)',
      }}>
        <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Scan Complete</p>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Emails found</span>
            <p style={{ fontSize: 20, fontWeight: 700 }}>{results.scanned}</p>
          </div>
          <div>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Parsed</span>
            <p style={{ fontSize: 20, fontWeight: 700 }}>{results.parsed}</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
          {Object.entries(results.bySource).map(([src, count]) => (
            <span key={src} style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
              {src}: {count}
            </span>
          ))}
        </div>
      </div>

      {results.emails.length > 0 && (
        <div>
          <button
            onClick={() => setEmailsExpanded(!emailsExpanded)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              width: '100%', padding: '10px 0', background: 'none', border: 'none',
              cursor: 'pointer', color: 'var(--text-primary)', fontWeight: 600, fontSize: 13,
            }}
          >
            Emails Found ({results.emails.length})
            <span>{emailsExpanded ? '▲' : '▼'}</span>
          </button>
          {emailsExpanded && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 300, overflowY: 'auto' }}>
              {results.emails.length > 10 && (
                <button
                  onClick={onViewAll}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 8,
                    border: '1px solid var(--border)',
                    background: 'var(--bg-surface)',
                    color: 'var(--accent)',
                    fontSize: 12,
                    fontWeight: 500,
                    cursor: 'pointer',
                    alignSelf: 'center',
                  }}
                >
                  View all {results.emails.length} emails
                </button>
              )}
              {results.emails.slice(0, 10).map((email) => (
                <div key={email.id} style={{
                  padding: 12,
                  borderRadius: 10,
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border)',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                    <p style={{ fontSize: 12, fontWeight: 500, flex: 1 }}>{email.subject}</p>
                    <SourceBadge source={email.source} />
                  </div>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{email.from}</p>
                  <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>{email.snippet}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {results.transactions.length > 0 && (
        <div>
          <button
            onClick={() => setTxExpanded(!txExpanded)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              width: '100%', padding: '10px 0', background: 'none', border: 'none',
              cursor: 'pointer', color: 'var(--text-primary)', fontWeight: 600, fontSize: 13,
            }}
          >
            Parsed Transactions ({results.transactions.length})
            <span>{txExpanded ? '▲' : '▼'}</span>
          </button>
          {txExpanded && (
            <div style={{ overflowX: 'auto' }}>
              {results.transactions.length > 10 && (
                <button
                  onClick={onViewAll}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 8,
                    border: '1px solid var(--border)',
                    background: 'var(--bg-surface)',
                    color: 'var(--accent)',
                    fontSize: 12,
                    fontWeight: 500,
                    cursor: 'pointer',
                    marginBottom: 12,
                  }}
                >
                  View all {results.transactions.length} transactions
                </button>
              )}
              <table className="data-table" style={{ marginTop: 8 }}>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Merchant</th>
                    <th>Source</th>
                    <th>Category</th>
                    <th>From Email</th>
                    <th style={{ textAlign: 'right' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {results.transactions.map((tx, i) => {
                    const badge = sourceColors[tx.source] ?? { color: '#6B7280', bg: '#F3F4F6' };
                    const sourceEmail = emailMap[tx.id];
                    return (
                      <tr key={i}>
                        <td style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                          {new Date(tx.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                        </td>
                        <td style={{ fontSize: 12, fontWeight: 500 }}>{tx.merchant}</td>
                        <td>
                          <span style={{
                            display: 'inline-block', padding: '2px 8px', borderRadius: 999,
                            fontSize: 10, fontWeight: 600, background: badge.bg, color: badge.color,
                          }}>{tx.source}</span>
                        </td>
                        <td style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                          {tx.category.charAt(0).toUpperCase() + tx.category.slice(1)}
                        </td>
                        <td style={{ fontSize: 10, color: 'var(--text-muted)', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                          title={sourceEmail?.subject || ''}
                        >
                          {sourceEmail?.subject || tx.id}
                        </td>
                        <td style={{ textAlign: 'right', fontSize: 12, fontWeight: 600, color: 'var(--danger)' }}>
                          -{fmtCurrency(tx.amount)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {results.emails.length === 0 && results.transactions.length === 0 && (
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, padding: 20 }}>
          No transaction emails found. Try adjusting your email sources.
        </p>
      )}
    </div>
  );
}

function ScanResultsModal({ results, onClose }: { results: ScanResults; onClose: () => void }) {
  const emailMap = Object.fromEntries(results.emails.map(e => [e.id, e]));

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9998,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          background: 'var(--bg-surface)',
          borderRadius: 16,
          width: '100%',
          maxWidth: 900,
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        }}
      >
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Scan Results</h2>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
              {results.scanned} emails found, {results.parsed} parsed into transactions
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 32, height: 32, borderRadius: '50%',
              border: '1px solid var(--border)',
              background: 'var(--bg-page)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-muted)',
              fontSize: 16,
            }}
          >
            ×
          </button>
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: 'var(--text-primary)' }}>
              Emails ({results.emails.length})
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 300, overflowY: 'auto' }}>
              {results.emails.map((email) => (
                <div key={email.id} style={{
                  padding: 14,
                  borderRadius: 10,
                  background: 'var(--bg-page)',
                  border: '1px solid var(--border)',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                    <p style={{ fontSize: 13, fontWeight: 500, flex: 1, color: 'var(--text-primary)' }}>{email.subject}</p>
                    <SourceBadge source={email.source} />
                  </div>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{email.from}</p>
                  <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>{email.snippet}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: 'var(--text-primary)' }}>
              Parsed Transactions ({results.transactions.length})
            </h3>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Merchant</th>
                    <th>Source</th>
                    <th>Category</th>
                    <th>From Email</th>
                    <th style={{ textAlign: 'right' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {results.transactions.map((tx, i) => {
                    const badge = sourceColors[tx.source] ?? { color: '#6B7280', bg: '#F3F4F6' };
                    const sourceEmail = emailMap[tx.id];
                    return (
                      <tr key={i}>
                        <td style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                          {new Date(tx.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                        </td>
                        <td style={{ fontSize: 12, fontWeight: 500 }}>{tx.merchant}</td>
                        <td>
                          <span style={{
                            display: 'inline-block', padding: '2px 8px', borderRadius: 999,
                            fontSize: 10, fontWeight: 600, background: badge.bg, color: badge.color,
                          }}>{tx.source}</span>
                        </td>
                        <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                          {tx.category.charAt(0).toUpperCase() + tx.category.slice(1)}
                        </td>
                        <td style={{ fontSize: 11, color: 'var(--text-muted)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                          title={sourceEmail?.subject || ''}
                        >
                          {sourceEmail?.subject || tx.id}
                        </td>
                        <td style={{ textAlign: 'right', fontSize: 12, fontWeight: 600, color: 'var(--danger)' }}>
                          -{fmtCurrency(tx.amount)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [settings, setSettings] = useState<Settings>({ sources: ['shopee', 'tokopedia', 'traveloka', 'bca', 'ayo', 'jago'], scanPeriodDays: 30, billingStartDay: 1, manualVerificationEnabled: false });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [scanResults, setScanResults] = useState<ScanResults | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [showFullResults, setShowFullResults] = useState(false);
  const [notificationPrefs, setNotificationPrefs] = useState<{
    enabled: boolean;
    budgetAlerts: boolean;
    weeklySummary: boolean;
    recurringReminders: boolean;
  } | null>(null);
  const { isMobile } = useDevice();

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/signin');
  }, [status, router]);

  const loadSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/settings');
      if (!res.ok) throw new Error('Failed to load settings');
      const data = await res.json();
      setSettings(data);
    } catch (error) {
      console.error('Failed to load settings:', error);
      setToast({ message: 'Failed to load settings', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (session?.user) loadSettings();
  }, [session, loadSettings]);

  useEffect(() => {
    fetch('/api/notifications/preferences')
      .then(res => res.json())
      .then(data => setNotificationPrefs(data))
      .catch((err) => {
        console.error('Failed to load notification preferences:', err);
      });
  }, []);

  useEffect(() => {
    if (!showFullResults) return;
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowFullResults(false); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [showFullResults]);

  async function saveSettings(newSettings: Settings) {
    setSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings),
      });
      if (!res.ok) throw new Error('Failed to save');
      setSettings(newSettings);
    } catch (error) {
      console.error('Failed to save settings:', error);
      setToast({ message: 'Failed to save settings', type: 'error' });
    } finally {
      setSaving(false);
    }
  }

  async function handleScan() {
    setScanning(true);
    setShowResults(false);
    try {
      const res = await fetch('/api/emails/scan', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setScanResults(data);
        setShowResults(true);
      } else {
        setToast({ message: data.error || 'Scan failed', type: 'error' });
      }
    } catch {
      setToast({ message: 'Scan failed. Try again.', type: 'error' });
    }
    setScanning(false);
  }

  if (status === 'loading' || loading) {
    return <main style={{ padding: '32px' }}><div className="skeleton" style={{ height: 200 }} /></main>;
  }

  const userEmail = session?.user?.email;
  const avatarInitial = userEmail ? userEmail[0]?.toUpperCase() : '?';

  return (
    <main style={{
      padding: isMobile ? '16px 16px 24px' : '32px',
      maxWidth: isMobile ? '100%' : 640,
      display: 'flex',
      flexDirection: 'column',
      gap: isMobile ? 20 : 24,
    }}>
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
              {avatarInitial}
            </div>
            <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>{userEmail ?? ''}</span>
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
        <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', flexWrap: 'wrap', gap: 8 }}>
          {SOURCES.map(({ key, label, query }) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{label}</p>
                <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{query}</p>
              </div>
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
            fontSize: isMobile ? 15 : 14,
            cursor: 'pointer',
            width: '100%',
            maxWidth: 200,
            height: isMobile ? 48 : 40,
          }}
        >
          {PERIODS.map(({ value, label }) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        <div style={{ marginTop: 16 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
            Billing Start Day
          </label>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>
            Day of month when your salary cycle starts (1-28)
          </p>
          <input
            type="number"
            min={1}
            max={31}
            value={settings.billingStartDay}
            onChange={(e) => saveSettings({ ...settings, billingStartDay: Number(e.target.value) })}
            style={{
              width: '100%', padding: '10px 14px', borderRadius: 10,
              border: '1.5px solid var(--border)', background: 'var(--bg-page)',
              fontSize: isMobile ? 15 : 14, color: 'var(--text-primary)', outline: 'none',
              height: isMobile ? 48 : 40,
            }}
          />
        </div>
        <div style={{
          marginTop: 20,
          padding: '16px',
          borderRadius: 12,
          background: 'var(--bg-page)',
          border: '1px solid var(--border)',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                Enable Manual Verification
              </p>
              <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                When enabled, scanned transactions go to pending page for review before adding to history.
              </p>
            </div>
            <button
              onClick={() => saveSettings({ ...settings, manualVerificationEnabled: !settings.manualVerificationEnabled })}
              style={{
                width: isMobile ? 56 : 48,
                height: isMobile ? 48 : 26,
                borderRadius: isMobile ? 14 : 13,
                background: settings.manualVerificationEnabled ? 'var(--accent)' : 'var(--border)',
                border: 'none',
                cursor: 'pointer',
                position: 'relative',
                transition: 'background 0.2s',
                flexShrink: 0,
              }}
            >
              <div style={{
                width: isMobile ? 26 : 22,
                height: isMobile ? 26 : 22,
                borderRadius: '50%',
                background: '#fff',
                position: 'absolute',
                top: isMobile ? 11 : 2,
                left: settings.manualVerificationEnabled ? (isMobile ? 28 : 24) : (isMobile ? 2 : 2),
                transition: 'left 0.2s',
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
              }} />
            </button>
          </div>
        </div>
      </SettingsSection>

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
                  console.warn('Browser does not support notifications');
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
                width: isMobile ? 52 : 44,
                height: isMobile ? 48 : 24,
                borderRadius: isMobile ? 14 : 12,
                border: 'none',
                background: notificationPrefs?.enabled ? 'var(--accent)' : 'var(--border)',
                cursor: 'pointer',
                position: 'relative',
                transition: 'background 0.2s',
              }}
            >
              <div style={{
                width: isMobile ? 24 : 20,
                height: isMobile ? 24 : 20,
                borderRadius: '50%',
                background: '#fff',
                position: 'absolute',
                top: isMobile ? 12 : 2,
                left: notificationPrefs?.enabled ? (isMobile ? 26 : 22) : (isMobile ? 2 : 2),
                transition: 'left 0.2s',
              }} />
            </button>
          </div>

          {notificationPrefs?.enabled && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(['budgetAlerts', 'weeklySummary', 'recurringReminders'] as const).map(key => (
                <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={notificationPrefs[key] as boolean}
                    onChange={async () => {
                      const newVal = !notificationPrefs[key];
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
        {scanning && <div className="skeleton" style={{ height: 100, marginTop: 16 }} />}
        {!scanning && showResults && scanResults && (
          <ScanResultsPanel results={scanResults} onViewAll={() => setShowFullResults(true)} />
        )}
      </SettingsSection>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      {showFullResults && scanResults && (
        <ScanResultsModal results={scanResults} onClose={() => setShowFullResults(false)} />
      )}
    </main>
  );
}