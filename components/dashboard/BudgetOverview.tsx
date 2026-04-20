import { useState } from 'react';
import type { Budget, Transaction } from '@/types';
import { BudgetProgress } from './BudgetProgress';
import { EditBudgetsModal } from './EditBudgetsModal';
import { getBillingPeriod } from '@/lib/billing-period';

interface BudgetOverviewProps {
  budgets: Budget[];
  transactions: Transaction[];
  onUpdateBudgets: (budgets: Budget[]) => void;
}

export function BudgetOverview({ budgets, transactions, onUpdateBudgets }: BudgetOverviewProps) {
  const [showEditModal, setShowEditModal] = useState(false);

  const { start, end } = getBillingPeriod(new Date(), 1);
  const budgetMap = new Map(budgets.map(b => [b.category, b]));

  const categories = ['food', 'shopping', 'transport', 'entertainment', 'other'];

  return (
    <div className="card fade-up" style={{ 
      padding: '22px 24px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Gradient accent line */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 3,
        background: 'linear-gradient(90deg, var(--accent-start), var(--accent-end))',
        borderRadius: '20px 20px 0 0',
      }} />
      <div style={{ paddingTop: 12 }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16,
        }}>
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
              Budget Overview
            </h2>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
              This month's spending vs budget
            </p>
          </div>
          <button
            onClick={() => setShowEditModal(true)}
            className="btn btn-primary"
            style={{ fontSize: 12, padding: '7px 14px' }}
          >
            Edit Budgets
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {categories.map(category => {
            const budget = budgetMap.get(category);
            if (!budget || budget.amount === 0) return null;

            const spent = transactions
              .filter(tx => {
                const txDate = new Date(tx.date);
                return tx.category === category && txDate >= start && txDate < end;
              })
              .reduce((sum, tx) => sum + tx.amount, 0);

            return (
              <BudgetProgress
                key={category}
                category={category}
                spent={spent}
                budget={budget.amount}
                onEdit={() => setShowEditModal(true)}
              />
            );
          })}
        </div>

        {budgets.filter(b => b.amount > 0).length === 0 && (
          <div style={{
            textAlign: 'center',
            padding: '24px 0',
            color: 'var(--text-muted)',
            fontSize: 13,
          }}>
            No budgets set. Click "Edit Budgets" to set your spending targets.
          </div>
        )}

        {showEditModal && (
          <EditBudgetsModal
            budgets={budgets}
            transactions={transactions}
            onClose={() => setShowEditModal(false)}
            onSave={onUpdateBudgets}
          />
        )}
      </div>
    </div>
  );
}
