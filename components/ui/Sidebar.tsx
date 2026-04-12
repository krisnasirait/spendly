'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';

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

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <aside
      className="hidden md:flex flex-col w-64 h-screen fixed left-0 top-0 border-r"
      style={{
        background: 'rgba(8, 12, 24, 0.85)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderRightColor: 'rgba(255,255,255,0.08)',
        zIndex: 50,
      }}
    >
      <div className="p-6 flex items-center gap-3">
        {/* Logo mark */}
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-lg"
          style={{
            background: 'linear-gradient(135deg, rgba(124,58,237,0.35), rgba(236,72,153,0.25))',
            border: '1px solid rgba(139,92,246,0.4)',
          }}
        >
          💸
        </div>
        <h1
          className="text-2xl font-extrabold tracking-tight"
          style={{
            background: 'linear-gradient(135deg, #a78bfa, #f472b6)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          Spendly
        </h1>
      </div>

      <nav className="flex-1 px-4 py-4 space-y-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-4 py-3 px-4 rounded-2xl transition-all duration-200 group relative"
              style={{
                background: isActive
                  ? 'linear-gradient(135deg, rgba(124,58,237,0.15), rgba(236,72,153,0.05))'
                  : 'transparent',
                border: isActive ? '1px solid rgba(139,92,246,0.25)' : '1px solid transparent',
              }}
            >
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
                className="text-sm font-semibold tracking-wide transition-colors duration-200"
                style={{ color: isActive ? '#a78bfa' : 'rgba(148,163,184,0.6)' }}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 mt-auto border-t" style={{ borderTopColor: 'rgba(255,255,255,0.08)' }}>
        {session?.user ? (
          <div className="flex items-center gap-3 py-3 px-3 rounded-2xl" style={{ background: 'rgba(255,255,255,0.02)' }}>
            {session.user.image ? (
              <img src={session.user.image} alt={session.user.name || 'User'} className="w-10 h-10 rounded-full" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gray-800 flex justify-center items-center">
                User
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate text-[#f1f5f9]">{session.user.name}</p>
              <button 
                onClick={() => signOut()}
                className="text-xs text-[#ec4899] font-medium hover:underline focus:outline-none"
              >
                Sign Out
              </button>
            </div>
          </div>
        ) : (
          <div className="py-3 px-3 text-sm text-[#94a3b8]">
            Not signed in
          </div>
        )}
      </div>
    </aside>
  );
}
