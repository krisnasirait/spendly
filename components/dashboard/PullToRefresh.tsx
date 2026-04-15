'use client';

import { useState, useRef, useCallback } from 'react';

interface PullToRefreshProps {
  children: React.ReactNode;
  onRefresh: () => Promise<void>;
  threshold?: number;
}

export function PullToRefresh({ children, onRefresh, threshold = 80 }: PullToRefreshProps) {
  const [pulling, setPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(0);
  const isAtTop = useRef(true);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (window.scrollY === 0) {
      startY.current = e.touches[0].clientY;
      isAtTop.current = true;
    } else {
      isAtTop.current = false;
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isAtTop.current || refreshing) return;
    
    const currentY = e.touches[0].clientY;
    const distance = Math.max(0, currentY - startY.current);
    
    if (distance > 0) {
      setPulling(true);
      setPullDistance(Math.min(distance, threshold * 1.5));
    }
  }, [refreshing, threshold]);

  const handleTouchEnd = useCallback(async () => {
    if (pullDistance >= threshold && !refreshing) {
      setRefreshing(true);
      setPulling(false);
      await onRefresh();
      setRefreshing(false);
    }
    setPullDistance(0);
    setPulling(false);
  }, [pullDistance, threshold, refreshing, onRefresh]);

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ touchAction: 'pan-y' }}
    >
      {/* Pull indicator */}
      <div style={{
        height: pulling || refreshing ? 60 : 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        transition: refreshing ? 'none' : 'height 0.2s ease',
      }}>
        {refreshing ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 20,
              height: 20,
              border: '2px solid var(--border)',
              borderTopColor: 'var(--accent)',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }} />
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Scanning...</span>
          </div>
        ) : (
          <div style={{
            transform: `translateY(${pullDistance * 0.3}px)`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 8,
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth={2}>
              <path d="M12 5v14M5 12l7-7 7 7" transform={pullDistance >= threshold ? 'rotate(180 12 12)' : ''} />
            </svg>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {pullDistance >= threshold ? 'Release to scan' : 'Pull to refresh'}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{ transform: pulling ? `translateY(${pullDistance * 0.5}px)` : '' }}>
        {children}
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
