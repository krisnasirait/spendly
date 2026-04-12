'use client';

import { signIn } from 'next-auth/react';
import { useEffect } from 'react';

export default function SignIn() {
  useEffect(() => {
    signIn('google', { callbackUrl: '/dashboard' });
  }, []);

  return (
    <main
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{ background: 'var(--bg-base)' }}
    >
      {/* Ambient orbs */}
      <div
        className="absolute pointer-events-none"
        style={{
          width: 500,
          height: 500,
          top: -100,
          left: -150,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(124,58,237,0.25) 0%, transparent 65%)',
          filter: 'blur(60px)',
        }}
      />
      <div
        className="absolute pointer-events-none"
        style={{
          width: 400,
          height: 400,
          bottom: -80,
          right: -100,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(236,72,153,0.2) 0%, transparent 65%)',
          filter: 'blur(60px)',
        }}
      />
      <div
        className="absolute pointer-events-none"
        style={{
          width: 300,
          height: 300,
          top: '40%',
          right: '10%',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(56,189,248,0.1) 0%, transparent 65%)',
          filter: 'blur(80px)',
        }}
      />

      {/* Card */}
      <div
        className="relative z-10 flex flex-col items-center gap-6 px-8 py-10 rounded-3xl w-[320px] animate-scale-in"
        style={{
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(139,92,246,0.3)',
          backdropFilter: 'blur(24px)',
          boxShadow: '0 24px 80px rgba(124,58,237,0.2)',
        }}
      >
        {/* Logo mark */}
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl animate-float"
          style={{
            background: 'linear-gradient(135deg, rgba(124,58,237,0.35), rgba(236,72,153,0.25))',
            border: '1px solid rgba(139,92,246,0.4)',
            boxShadow: '0 8px 32px rgba(124,58,237,0.3)',
          }}
        >
          💸
        </div>

        {/* Wordmark */}
        <div className="text-center">
          <h1
            className="text-3xl font-extrabold tracking-tight"
            style={{
              background: 'linear-gradient(135deg, #a78bfa, #f472b6)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Spendly
          </h1>
          <p className="text-xs mt-1 font-medium" style={{ color: 'rgba(148,163,184,0.6)' }}>
            Know where your money goes
          </p>
        </div>

        {/* Spinner */}
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-8 h-8 rounded-full border-2 border-t-transparent"
            style={{
              borderColor: 'rgba(139,92,246,0.3)',
              borderTopColor: '#a78bfa',
              animation: 'spin 0.8s linear infinite',
            }}
          />
          <p className="text-xs font-medium" style={{ color: 'rgba(148,163,184,0.6)' }}>
            Redirecting to Google…
          </p>
        </div>

        {/* Divider */}
        <div
          className="w-full h-px"
          style={{ background: 'rgba(255,255,255,0.06)' }}
        />

        {/* Footer note */}
        <p className="text-[10px] text-center leading-relaxed" style={{ color: 'rgba(148,163,184,0.4)' }}>
          Spendly reads your purchase emails to track spending — nothing is stored without your permission.
        </p>
      </div>
    </main>
  );
}