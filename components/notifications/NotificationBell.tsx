'use client';

import { useState, useEffect } from 'react';

interface NotificationPreferences {
  enabled: boolean;
  budgetAlerts: boolean;
  weeklySummary: boolean;
  recurringReminders: boolean;
}

export function NotificationBell() {
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    fetch('/api/notifications/preferences')
      .then(res => res.json())
      .then(data => setPrefs(data))
      .catch(() => {});
  }, []);

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
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
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
