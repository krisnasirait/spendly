'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

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
                <span style={{ fontSize: 10, fontWeight: 500 }}>
                  {tab.label}
                  {tab.label === 'Pending' && pendingCount > 0 && (
                    <span style={{
                      display: 'inline-block',
                      background: 'var(--accent)',
                      color: '#fff',
                      fontSize: 8,
                      fontWeight: 700,
                      padding: '1px 4px',
                      borderRadius: 6,
                      marginLeft: 3,
                      minWidth: 14,
                      textAlign: 'center',
                    }}>
                      {pendingCount}
                    </span>
                  )}
                </span>
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
