'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';

const navItems = [
  {
    href: '/dashboard',
    label: 'Overview',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </svg>
    ),
  },
  {
    href: '/dashboard/categories',
    label: 'Categories',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 12a9 9 0 1 1-9-9 9 9 0 0 1 9 9z" />
        <path d="M12 3v9l4 4" />
      </svg>
    ),
  },
  {
    href: '/dashboard/history',
    label: 'History',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 8v4l3 3" />
        <path d="M3.05 11a9 9 0 1 1 .5 4M3 16v-5h5" />
      </svg>
    ),
  },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50"
      style={{
        background: 'rgba(8, 12, 24, 0.85)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderTop: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <div className="flex justify-around items-center max-w-md mx-auto px-2 py-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center gap-1 py-2 px-5 rounded-2xl transition-all duration-200 group relative"
              style={{
                background: isActive
                  ? 'linear-gradient(135deg, rgba(124,58,237,0.25), rgba(236,72,153,0.15))'
                  : 'transparent',
                border: isActive ? '1px solid rgba(139,92,246,0.35)' : '1px solid transparent',
              }}
            >
              {/* Glow pip for active */}
              {isActive && (
                <span
                  className="absolute -top-px left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-full"
                  style={{ background: 'linear-gradient(90deg, #7c3aed, #ec4899)' }}
                />
              )}
              <span
                className="transition-all duration-200"
                style={{
                  color: isActive ? '#a78bfa' : 'rgba(148,163,184,0.7)',
                  transform: isActive ? 'scale(1.1)' : 'scale(1)',
                }}
              >
                {item.icon}
              </span>
              <span
                className="text-[10px] font-semibold tracking-wide transition-colors duration-200"
                style={{ color: isActive ? '#a78bfa' : 'rgba(148,163,184,0.6)' }}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}