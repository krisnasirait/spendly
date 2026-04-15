'use client';

import { useState } from 'react';
import { useDevice } from '@/hooks/useDevice';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { BottomTabBar } from '@/components/dashboard/BottomTabBar';
import { MobileMenu } from '@/components/dashboard/MobileMenu';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isMobile } = useDevice();
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar — desktop only */}
      {!isMobile && <Sidebar />}

      {/* Main content */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        paddingBottom: isMobile ? 80 : 0,
      }}>
        {children}
      </div>

      {/* Bottom tab bar — mobile only */}
      {isMobile && (
        <BottomTabBar
          onAddClick={() => {}}
          onMenuClick={() => setShowMobileMenu(true)}
        />
      )}

      {/* Mobile menu */}
      <MobileMenu
        isOpen={showMobileMenu}
        onClose={() => setShowMobileMenu(false)}
      />
    </div>
  );
}
