import { type ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  variant?: 'glass' | 'solid' | 'highlight' | 'gradient';
  glow?: boolean;
  hover?: boolean;
}

export function Card({
  children,
  className = '',
  variant = 'glass',
  glow = false,
  hover = false,
}: CardProps) {
  const base = 'rounded-2xl transition-all duration-200';

  const variants: Record<string, string> = {
    glass:
      'glass' + (hover ? ' glass-hover' : ''),
    solid:
      'bg-[var(--bg-elevated)] border border-[var(--border-subtle)] ' + (hover ? 'hover:border-[rgba(139,92,246,0.3)] hover:-translate-y-0.5 cursor-pointer' : ''),
    highlight:
      'bg-[var(--bg-glass)] border border-[rgba(139,92,246,0.4)] shadow-[0_0_20px_rgba(124,58,237,0.15)]',
    gradient:
      'gradient-bg border-0',
  };

  const glowStyle = glow
    ? 'shadow-[0_0_30px_rgba(124,58,237,0.25)]'
    : '';

  return (
    <div className={`${base} ${variants[variant]} ${glowStyle} p-5 ${className}`}>
      {children}
    </div>
  );
}
