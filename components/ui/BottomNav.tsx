'use client';

import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/dashboard', label: 'Overview', emoji: '🏠' },
  { href: '/dashboard/categories', label: 'Categories', emoji: '📊' },
  { href: '/dashboard/history', label: 'History', emoji: '📜' },
];

export function BottomNav() {
  const pathname = usePathname();
  
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-2">
      <div className="flex justify-around max-w-md mx-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <a
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center py-2 px-4 rounded-lg transition-colors ${
                isActive ? 'text-indigo-600' : 'text-gray-400'
              }`}
            >
              <span className="text-xl">{item.emoji}</span>
              <span className="text-xs mt-1 font-medium">{item.label}</span>
            </a>
          );
        })}
      </div>
    </nav>
  );
}