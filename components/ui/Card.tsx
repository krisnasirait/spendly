import { type ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  accent?: 'warning' | 'default';
}

export function Card({ children, className = '', accent = 'default' }: CardProps) {
  const accentStyles = accent === 'warning' 
    ? 'border-l-4 border-l-[#ff6b6b]' 
    : '';
  
  return (
    <div className={`bg-white rounded-xl shadow-sm p-6 ${accentStyles} ${className}`}>
      {children}
    </div>
  );
}