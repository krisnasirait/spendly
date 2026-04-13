import React from 'react';

interface SettingsSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

export function SettingsSection({ title, description, children }: SettingsSectionProps) {
  return (
    <div className="card fade-up" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{title}</h2>
        {description && <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{description}</p>}
      </div>
      {children}
    </div>
  );
}
