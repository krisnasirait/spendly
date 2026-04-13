'use client';

import { useId } from 'react';

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
  id?: string;
}

export function Toggle({ checked, onChange, disabled, label, id: idProp }: ToggleProps) {
  const generatedId = useId();
  const id = idProp ?? generatedId;

  return (
    <label
      htmlFor={id}
      style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1 }}
    >
      <div style={{ position: 'relative' }}>
        <input
          type="checkbox"
          id={id}
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
          aria-label={label}
          style={{ opacity: 0, position: 'absolute', width: 0, height: 0 }}
        />
        <div style={{
          width: 42,
          height: 24,
          borderRadius: 12,
          background: checked ? 'var(--accent)' : 'var(--border)',
          transition: 'background 0.2s ease',
          position: 'relative',
        }}>
          <div style={{
            width: 18,
            height: 18,
            borderRadius: '50%',
            background: '#fff',
            position: 'absolute',
            top: 3,
            left: checked ? 21 : 3,
            transition: 'left 0.2s ease',
            boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
          }} />
        </div>
      </div>
      {label && <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>{label}</span>}
    </label>
  );
}
