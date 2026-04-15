'use client';

import { useState, useEffect } from 'react';

export type DeviceType = 'mobile' | 'tablet' | 'desktop';

export function useDevice() {
  const [device, setDevice] = useState<DeviceType>('desktop');
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => {
      const width = window.innerWidth;
      if (width < 640) {
        setDevice('mobile');
        setIsMobile(true);
      } else if (width < 1024) {
        setDevice('tablet');
        setIsMobile(true);
      } else {
        setDevice('desktop');
        setIsMobile(false);
      }
    };

    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  return { device, isMobile, isDesktop: device === 'desktop', isTablet: device === 'tablet' };
}
