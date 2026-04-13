'use client';

import { signIn } from 'next-auth/react';
import { useEffect } from 'react';

export default function SignIn() {
  useEffect(() => {
    signIn('google', { callbackUrl: '/dashboard' });
  }, []);

  return (
    <main style={{
      minHeight: '100vh',
      background: 'var(--bg-page)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    }}>
      <div style={{
        background: 'var(--bg-surface)',
        borderRadius: 'var(--radius-xl)',
        padding: '48px 40px',
        width: '100%',
        maxWidth: 380,
        boxShadow: 'var(--shadow-hover)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 0,
      }}>
        {/* Logo */}
        <div style={{
          width: 56, height: 56, borderRadius: 16,
          background: 'var(--accent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 16,
        }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
            <path d="M12 6v6l4 2" />
          </svg>
        </div>

        <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.5px', marginBottom: 6 }}>
          Spendly
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 36, textAlign: 'center' }}>
          Know where your money goes
        </p>

        {/* Spinner */}
        <div style={{ marginBottom: 16 }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            border: '3px solid var(--accent-light)',
            borderTopColor: 'var(--accent)',
            animation: 'spin 0.8s linear infinite',
          }} />
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 36 }}>
          Redirecting to Google…
        </p>

        <div style={{ width: '100%', height: 1, background: 'var(--border)', marginBottom: 20 }} />

        <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.7, maxWidth: 280 }}>
          Spendly reads your purchase emails to track spending — nothing is stored without your permission.
        </p>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </main>
  );
}