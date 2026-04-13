'use client';

import { useEffect, useState } from 'react';

export type ToastType = 'success' | 'error';

interface ToastProps {
  message: string;
  type: ToastType;
  onClose: () => void;
  duration?: number;
}

export function Toast({ message, type, onClose, duration = 4000 }: ToastProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 300);
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const bg = type === 'success' ? 'var(--success)' : 'var(--danger)';

  return (
    <div style={{
      position: 'fixed',
      bottom: 24,
      right: 24,
      zIndex: 9999,
      background: bg,
      color: '#fff',
      padding: '12px 20px',
      borderRadius: 12,
      fontSize: 13,
      fontWeight: 500,
      boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(10px)',
      transition: 'all 0.3s ease',
      maxWidth: 320,
    }}>
      {message}
    </div>
  );
}
