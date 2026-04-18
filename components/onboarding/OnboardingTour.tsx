'use client';

import { useState, useEffect } from 'react';

interface TourStep {
  title: string;
  description: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    title: 'Track Spending Automatically',
    description: 'Spendly reads your emails to automatically import transactions from Shopee, Tokopedia, Traveloka, and more.',
  },
  {
    title: 'Review Pending Transactions',
    description: 'Pending transactions need your review before being added to your history.',
  },
  {
    title: 'See Spending Insights',
    description: 'Track your spending patterns, top merchants, and monthly comparisons in Analytics.',
  },
  {
    title: 'Set Category Budgets',
    description: 'Set budgets for each category to stay on top of your spending goals.',
  },
];

interface OnboardingTourProps {
  onComplete: () => void;
}

export function OnboardingTour({ onComplete }: OnboardingTourProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const step = TOUR_STEPS[currentStep];
  const isLast = currentStep === TOUR_STEPS.length - 1;

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onComplete();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onComplete]);

  const handleNext = () => {
    if (isLast) {
      onComplete();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 1000,
      background: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <div 
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-title"
        style={{
          background: 'var(--bg-surface)',
          borderRadius: 16,
          padding: 24,
          maxWidth: 400,
          width: '90%',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        }}
      >
        <div style={{ marginBottom: 16 }}>
          <h3 id="onboarding-title" style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>{step.title}</h3>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            {step.description}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 20 }}>
          <div style={{ display: 'flex', gap: 6 }}>
            {TOUR_STEPS.map((_, i) => (
              <div
                key={i}
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: i === currentStep ? 'var(--accent)' : 'var(--border)',
                }}
              />
            ))}
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handleSkip}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-page)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              style={{
                padding: '8px 16px',
                borderRadius: 8,
                border: '1px solid var(--border)',
                background: 'transparent',
                color: 'var(--text-muted)',
                fontSize: 13,
                cursor: 'pointer',
                transition: 'background 0.15s',
              }}
            >
              Skip
            </button>
            <button
              onClick={handleNext}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.9')}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
              style={{
                padding: '8px 16px',
                borderRadius: 8,
                border: 'none',
                background: 'var(--accent)',
                color: '#fff',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'opacity 0.15s',
              }}
            >
              {isLast ? 'Get Started' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}