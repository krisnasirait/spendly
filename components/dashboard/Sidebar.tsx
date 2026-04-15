'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';

/* ─── SVG icon primitives ─── */
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
  analytics:    'M18 20V10M12 20V4M6 20v-6',
  settings:     'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z',
  help:         'M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01',
  logout:       'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
  sun:          'M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42 M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10z',
  moon:         'M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z',
};

const navMain = [
  { label: 'Dashboard',    href: '/dashboard',            icon: icons.dashboard },
  { label: 'Transactions', href: '/dashboard/history',    icon: icons.transactions },
  { label: 'Pending',      href: '/dashboard/pending',    icon: icons.pending },
  { label: 'Categories',   href: '/dashboard/categories', icon: icons.categories },
  { label: 'Analytics',    href: '/dashboard/analytics',  icon: icons.analytics },
  { label: 'Settings',     href: '/dashboard/settings',   icon: icons.settings },
];

export function Sidebar() {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === href : pathname.startsWith(href);

  return (
    <aside style={{
      width: 'var(--sidebar-w)',
      minWidth: 'var(--sidebar-w)',
      background: 'var(--bg-sidebar)',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      padding: '28px 16px 20px',
      gap: 0,
      position: 'sticky',
      top: 0,
      height: '100vh',
      overflowY: 'auto',
    }}>

      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 36, paddingLeft: 8 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: 'var(--accent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
            <path d="M12 6v6l4 2" />
          </svg>
        </div>
        <span style={{ fontWeight: 700, fontSize: 17, color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>
          Spendly
        </span>
      </div>

      {/* Main nav */}
      <nav style={{ flex: 1 }}>
        <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {navMain.map(({ label, href, icon }) => {
            const active = isActive(href);
            return (
              <li key={href}>
                <Link href={href} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 12px',
                  borderRadius: 12,
                  textDecoration: 'none',
                  fontWeight: active ? 600 : 500,
                  fontSize: 13.5,
                  color: active ? '#fff' : 'var(--text-secondary)',
                  background: active ? 'var(--accent)' : 'transparent',
                  transition: 'all 0.18s ease',
                }}>
                  <Icon d={icon} size={17} />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Bottom section */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Link href="/dashboard/help" style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 12px', borderRadius: 12, textDecoration: 'none',
          fontWeight: 500, fontSize: 13.5, color: 'var(--text-secondary)',
        }}>
          <Icon d={icons.help} size={17} />
          Help
        </Link>

        <button onClick={() => signOut({ callbackUrl: '/auth/signin' })} style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 12px', borderRadius: 12,
          fontWeight: 500, fontSize: 13.5,
          color: 'var(--text-secondary)',
          background: 'none', border: 'none', cursor: 'pointer',
          textAlign: 'left', width: '100%',
        }}>
          <Icon d={icons.logout} size={17} />
          Log out
        </button>

        {/* Theme toggle pill */}
        <div style={{
          display: 'flex',
          marginTop: 12,
          padding: '5px',
          background: 'var(--bg-page)',
          borderRadius: 'var(--radius-pill)',
          gap: 2,
        }}>
          <button style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 5, padding: '6px 10px', borderRadius: 'var(--radius-pill)',
            background: 'var(--bg-surface)', border: 'none', cursor: 'pointer',
            fontSize: 12, fontWeight: 500, color: 'var(--text-primary)',
            boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
          }}>
            <Icon d={icons.sun} size={13} /> Light
          </button>
          <button style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 5, padding: '6px 10px', borderRadius: 'var(--radius-pill)',
            background: 'transparent', border: 'none', cursor: 'pointer',
            fontSize: 12, fontWeight: 500, color: 'var(--text-muted)',
          }}>
            <Icon d={icons.moon} size={13} /> Dark
          </button>
        </div>
      </div>
    </aside>
  );
}
