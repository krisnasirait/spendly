'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { useEffect, useState } from 'react';

const Icon = ({ d, size = 18 }: { d: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

const icons = {
  dashboard:    'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10',
  transactions: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
  pending:      'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z M12 6v6l4 2',
  categories:   'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5',
  history:      'M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0',
  settings:     'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z',
  help:         'M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01',
  logout:       'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
  wallet:       'M21 5H3a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h18a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2zM1 10h22',
};

const navMain = [
  { label: 'Dashboard',    href: '/dashboard',            icon: icons.dashboard },
  { label: 'Transactions', href: '/dashboard/history',   icon: icons.transactions },
  { label: 'Pending',      href: '/dashboard/pending',   icon: icons.pending },
  { label: 'Categories',   href: '/dashboard/categories', icon: icons.categories },
  { label: 'Settings',     href: '/dashboard/settings',  icon: icons.settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const handler = () => {
      fetch('/api/pending?action=count')
        .then(res => res.json())
        .then(data => setPendingCount(data.count || 0))
        .catch(() => {});
    };
    window.addEventListener('pending-count-refresh', handler);
    fetch('/api/pending?action=count')
      .then(res => res.json())
      .then(data => setPendingCount(data.count || 0))
      .catch(() => {});
    return () => window.removeEventListener('pending-count-refresh', handler);
  }, []);

  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === href : pathname.startsWith(href);

  return (
    <aside style={{
      width: 'var(--sidebar-w)',
      minWidth: 'var(--sidebar-w)',
      background: 'var(--bg-sidebar)',
      display: 'flex',
      flexDirection: 'column',
      padding: '24px 16px',
      gap: 0,
      position: 'sticky',
      top: 0,
      height: '100vh',
      overflowY: 'auto',
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32, paddingLeft: 8 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 12,
          background: 'linear-gradient(135deg, var(--accent-start) 0%, var(--accent-end) 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
          boxShadow: '0 4px 12px rgba(37, 99, 235, 0.4)',
        }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 5H3a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h18a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2z" />
            <path d="M1 10h22" />
          </svg>
        </div>
        <span style={{ fontWeight: 700, fontSize: 18, color: '#fff', letterSpacing: '-0.3px' }}>
          Spendly
        </span>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', marginBottom: 24 }} />

      {/* Main nav */}
      <nav style={{ flex: 1 }}>
        <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {navMain.map(({ label, href, icon }) => {
            const active = isActive(href);
            return (
              <li key={href}>
                <Link href={href} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '11px 14px',
                  borderRadius: 10,
                  textDecoration: 'none',
                  fontWeight: active ? 600 : 500,
                  fontSize: 13.5,
                  color: active ? '#fff' : 'rgba(255,255,255,0.6)',
                  background: active ? 'linear-gradient(135deg, var(--accent-start) 0%, var(--accent-end) 100%)' : 'transparent',
                  transition: 'all 0.15s ease',
                }}>
                  <Icon d={icon} size={18} />
                  <span>{label}</span>
                  {label === 'Pending' && pendingCount > 0 && (
                    <span style={{
                      marginLeft: 'auto',
                      background: 'var(--accent)',
                      color: '#fff',
                      fontSize: 10,
                      fontWeight: 700,
                      padding: '2px 6px',
                      borderRadius: 10,
                      minWidth: 18,
                      textAlign: 'center',
                    }}>
                      {pendingCount}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Bottom section */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {/* Divider */}
        <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', marginBottom: 16 }} />

        <Link href="/dashboard/help" style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '11px 14px', borderRadius: 10, textDecoration: 'none',
          fontWeight: 500, fontSize: 13.5, color: 'rgba(255,255,255,0.5)',
        }}>
          <Icon d={icons.help} size={18} />
          Help & Support
        </Link>

        <button onClick={() => signOut({ callbackUrl: '/auth/signin' })} style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '11px 14px', borderRadius: 10,
          fontWeight: 500, fontSize: 13.5,
          color: 'rgba(255,255,255,0.5)',
          background: 'none', border: 'none', cursor: 'pointer',
          textAlign: 'left', width: '100%',
          transition: 'color 0.15s ease',
        }}>
          <Icon d={icons.logout} size={18} />
          Sign Out
        </button>

        {/* User info */}
        <div style={{
          marginTop: 16,
          padding: '12px 14px',
          borderRadius: 10,
          background: 'rgba(255,255,255,0.05)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--accent-start) 0%, var(--accent-end) 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 600, fontSize: 14, color: '#fff',
          }}>
            U
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>User</p>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              user@example.com
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}