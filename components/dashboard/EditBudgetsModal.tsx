import { useState } from 'react';
import type { Budget, Transaction } from '@/types';
import { getAverageMonthlySpend, CATEGORY_LABELS } from '@/lib/budget';

const fmt = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

interface EditBudgetsModalProps {
  budgets: Budget[];
  transactions: Transaction[];
  onClose: () => void;
  onSave: (budgets: Budget[]) => void;
}

export function EditBudgetsModal({ budgets, transactions, onClose, onSave }: EditBudgetsModalProps) {
  const categories = ['food', 'shopping', 'transport', 'entertainment', 'other'];
  const [localBudgets, setLocalBudgets] = useState<Budget[]>(() => {
    const existing = new Map(budgets.map(b => [b.category, b]));
    return categories.map(cat => {
      const existingBudget = existing.get(cat);
      if (existingBudget) return existingBudget;
      
      const suggested = getAverageMonthlySpend(transactions, cat);
      return {
        category: cat,
        amount: suggested,
        period: 'monthly' as const,
        suggestedAmount: suggested,
        isManual: false,
      };
    });
  });

  function handleAmountChange(category: string, value: string) {
    const num = parseInt(value.replace(/[^0-9]/g, ''), 10) || 0;
    setLocalBudgets(prev =>
      prev.map(b =>
        b.category === category
          ? { ...b, amount: num, isManual: num !== b.suggestedAmount }
          : b
      )
    );
  }

  function handleReset(category: string) {
    const suggested = getAverageMonthlySpend(transactions, category);
    setLocalBudgets(prev =>
      prev.map(b =>
        b.category === category
          ? { ...b, amount: suggested, suggestedAmount: suggested, isManual: false }
          : b
      )
    );
  }

  async function handleSave() {
    try {
      const res = await fetch('/api/budgets', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ budgets: localBudgets }),
      });
      if (res.ok) {
        onSave(localBudgets);
        onClose();
      }
    } catch (error) {
      console.error('Failed to save budgets:', error);
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
    }}
    onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: 'var(--bg-surface)', borderRadius: 16, width: '100%', maxWidth: 480,
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
      }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
          <h2 style={{ fontSize: 16, fontWeight: 700 }}>Edit Budgets</h2>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
            Set monthly spending limits for each category
          </p>
        </div>
        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {localBudgets.map(budget => (
            <div key={budget.category} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                  {CATEGORY_LABELS[budget.category] || budget.category}
                </label>
                {budget.suggestedAmount && budget.isManual && (
                  <button
                    onClick={() => handleReset(budget.category)}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: 'var(--accent)', fontSize: 11,
                    }}
                  >
                    Reset to suggested ({fmt(budget.suggestedAmount)})
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Rp</span>
                <input
                  type="text"
                  value={budget.amount.toLocaleString('id-ID')}
                  onChange={(e) => handleAmountChange(budget.category, e.target.value)}
                  style={{
                    flex: 1, padding: '10px 12px', borderRadius: 8,
                    border: '1.5px solid var(--border)', background: 'var(--bg-page)',
                    fontSize: 13, color: 'var(--text-primary)', outline: 'none',
                  }}
                />
              </div>
            </div>
          ))}
        </div>
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <button onClick={onClose} className="btn btn-ghost" style={{ fontSize: 13 }}>
            Cancel
          </button>
          <button onClick={handleSave} className="btn btn-primary" style={{ fontSize: 13 }}>
            Save Budgets
          </button>
        </div>
      </div>
    </div>
  );
}