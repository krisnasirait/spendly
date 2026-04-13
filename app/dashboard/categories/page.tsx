'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import type { Transaction, Category } from '@/types';
import { getBillingPeriod, isInBillingPeriod } from '@/lib/billing-period';

type Period = 'today' | 'week' | 'month' | 'all';

const fmt = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

const fmtShort = (n: number) =>
  n >= 1_000_000
    ? `Rp ${(n / 1_000_000).toFixed(1)}jt`
    : n >= 1_000
    ? `Rp ${(n / 1_000).toFixed(0)}rb`
    : `Rp ${n}`;

export default function CategoriesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [txError, setTxError] = useState(false);
  const [catError, setCatError] = useState(false);
  const categoryData = useMemo(() => {
    const emojis = ['🍜', '🛍️', '🚗', '🎬', '📦', '💄', '🏠', '💊', '✏️', '🎁'];
    const colors = ['#7C6CF8', '#A78BFA', '#60A5FA', '#F472B6', '#94A3B8', '#FB7185', '#FBBF24', '#34D399', '#60A5FA', '#A78BFA'];
    if (categories.length === 0) {
      return [
        { key: 'food', label: 'Food & Drinks', emoji: '🍜', color: '#7C6CF8' },
        { key: 'shopping', label: 'Shopping', emoji: '🛍️', color: '#A78BFA' },
        { key: 'transport', label: 'Transport', emoji: '🚗', color: '#60A5FA' },
        { key: 'entertainment', label: 'Entertainment', emoji: '🎬', color: '#F472B6' },
        { key: 'other', label: 'Other', emoji: '📦', color: '#94A3B8' },
      ];
    }
    return categories.map((c, i) => ({
      key: c.name,
      label: c.name.charAt(0).toUpperCase() + c.name.slice(1),
      emoji: emojis[i % emojis.length],
      color: colors[i % colors.length],
    }));
  }, [categories]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [period, setPeriod] = useState<Period>('month');
  const [billingStartDay, setBillingStartDay] = useState(1);
  const [editingBudget, setEditingBudget] = useState<string | null>(null);
  const [budgetInput, setBudgetInput] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/signin');
  }, [status, router]);

  useEffect(() => {
    if (session?.user) {
      Promise.all([
        fetch('/api/transactions')
          .then(r => { if (!r.ok) throw new Error('transactions'); return r.json(); })
          .then(d => { setTransactions(d.transactions || []); })
          .catch(() => setTxError(true)),
        fetch('/api/categories')
          .then(r => { if (!r.ok) throw new Error('categories'); return r.json(); })
          .then(d => { setCategories(d.categories || []); })
          .catch(() => setCatError(true)),
        fetch('/api/settings')
          .then(r => r.ok ? r.json() : null)
          .then(d => { if (d?.billingStartDay) setBillingStartDay(d.billingStartDay); })
          .catch(() => {}),
      ]).catch(() => {}).finally(() => setLoading(false));
    }
  }, [session]);

  useEffect(() => {
    function onFocus() {
      if (session?.user && !loading) {
        Promise.all([
          fetch('/api/transactions')
            .then(r => r.ok ? r.json() : null)
            .then(d => { if (d) setTransactions(d.transactions || []); }),
          fetch('/api/categories')
            .then(r => r.ok ? r.json() : null)
            .then(d => { if (d) setCategories(d.categories || []); }),
        ]).catch(() => {});
      }
    }
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [session, loading]);

  const filteredTransactions = useMemo(() => {
    if (period === 'all') return transactions;
    const now = new Date();
    const { start, end } = getBillingPeriod(now, billingStartDay);
    return transactions.filter(t => {
      const txDate = new Date(t.date);
      switch (period) {
        case 'today': {
          const periodStart = getBillingPeriod(now, billingStartDay).start;
          return txDate >= periodStart && txDate <= now;
        }
        case 'week': {
          const periodStart = getBillingPeriod(now, billingStartDay).start;
          const weekStart = new Date(periodStart);
          const dayOfWeek = weekStart.getUTCDay();
          const monStart = new Date(weekStart);
          monStart.setUTCDate(monStart.getUTCDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
          const weekEnd = new Date(monStart);
          weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);
          return txDate >= monStart && txDate < weekEnd;
        }
        case 'month':
          return isInBillingPeriod(txDate, start, end);
        default:
          return true;
      }
    });
  }, [transactions, period, billingStartDay]);

  const byCategory = useMemo(() => {
    const map: Record<string, { total: number; count: number }> = {};
    categoryData.forEach(c => { map[c.key] = { total: 0, count: 0 }; });
    filteredTransactions.forEach((t) => {
      t.categories.forEach(cat => {
        if (map[cat]) {
          map[cat].total += t.amount;
          map[cat].count += 1;
        }
      });
    });
    return map;
  }, [filteredTransactions, categoryData]);

  const totalAll = Object.values(byCategory).reduce((s, v) => s + v.total, 0);

  const selectedTxs = useMemo(() =>
    selected ? filteredTransactions.filter(t => t.categories.includes(selected))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    : [],
    [selected, filteredTransactions]
  );

  const categoryBudgetInfo = useMemo(() => {
    const now = new Date();
    const { start, end } = getBillingPeriod(now, billingStartDay);
    const daysRemaining = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    const info: Record<string, { budget: number; spent: number; daysLeft: number; dailyBudget: number }> = {};
    
    categoryData.forEach(c => {
      const catBudget = categories.find(cat => cat.name === c.key)?.budget;
      const catSpent = byCategory[c.key]?.total || 0;
      info[c.key] = {
        budget: catBudget || 0,
        spent: catSpent,
        daysLeft: daysRemaining,
        dailyBudget: catBudget && catBudget > catSpent && daysRemaining > 0
          ? Math.round((catBudget - catSpent) / daysRemaining)
          : 0,
      };
    });
    
    return info;
  }, [categoryData, categories, byCategory, billingStartDay]);

  async function saveBudget(categoryName: string, budget: number | null) {
    const category = categories.find(c => c.name === categoryName);
    if (!category) return;
    
    try {
      const res = await fetch(`/api/categories?id=${category.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ budget: budget ?? null }),
      });
      if (res.ok) {
        setCategories(prev => prev.map(c => c.id === category.id ? { ...c, budget: budget ?? undefined } : c));
      }
    } catch {} finally {
      setEditingBudget(null);
      setBudgetInput('');
    }
  }

  if (status === 'loading' || loading) {
    return (
      <main style={{ padding: '32px 32px 48px' }}>
        <div className="skeleton" style={{ height: 36, width: 200, marginBottom: 24 }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
          {[0,1,2,3,4].map(i => <div key={i} className="card skeleton" style={{ height: 140 }} />)}
        </div>
      </main>
    );
  }

  return (
    <main style={{ padding: '32px 32px 48px', display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.5px' }}>Spending by Category</h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
            Click a category to drill down into its transactions.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 4, background: 'var(--bg-page)', borderRadius: 'var(--radius-pill)', padding: 4 }}>
          {(['today', 'week', 'month', 'all'] as Period[]).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              style={{
                padding: '6px 14px', borderRadius: 'var(--radius-pill)', border: 'none',
                fontSize: 12, fontWeight: 600, cursor: 'pointer',
                background: period === p ? 'var(--accent)' : 'transparent',
                color: period === p ? '#fff' : 'var(--text-secondary)',
              }}
            >
              {p === 'today' ? 'Today' : p === 'week' ? 'Week' : p === 'month' ? 'Month' : 'All'}
            </button>
          ))}
        </div>
      </div>

      {txError && (
        <div className="card" style={{ padding: 16, background: 'var(--danger-bg)', color: 'var(--danger)', fontSize: 13 }}>
          Failed to load transactions. Please try again.
        </div>
      )}
      {catError && (
        <div className="card" style={{ padding: 16, background: 'var(--danger-bg)', color: 'var(--danger)', fontSize: 13 }}>
          Failed to load categories. Please try again.
        </div>
      )}

      {/* Category grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
        gap: 16,
      }}>
        {categoryData.map(({ key, label, emoji, color }) => {
          const stats = byCategory[key];
          const info = categoryBudgetInfo[key];
          const pct = totalAll > 0 ? (stats.total / totalAll) * 100 : 0;
          const active = selected === key;

          return (
            <button
              key={key}
              id={`cat-card-${key}`}
              onClick={() => setSelected(active ? null : key)}
              style={{
                background: active ? color : 'var(--bg-surface)',
                border: active ? `2px solid ${color}` : '1.5px solid var(--border)',
                borderRadius: 'var(--radius-lg)',
                padding: '20px 20px 18px',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s ease',
                boxShadow: active ? `0 6px 24px ${color}33` : 'var(--shadow-card)',
                transform: active ? 'translateY(-2px)' : 'none',
              }}
            >
              <div style={{
                fontSize: 28, marginBottom: 12,
                width: 48, height: 48, borderRadius: 14,
                background: active ? 'rgba(255,255,255,0.2)' : `${color}18`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {emoji}
              </div>
              <p style={{ fontSize: 13, fontWeight: 600, color: active ? '#fff' : 'var(--text-primary)', marginBottom: 2 }}>
                {label}
              </p>
              <p style={{ fontSize: 11, color: active ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)', marginBottom: 12 }}>
                {stats.count} transaction{stats.count !== 1 ? 's' : ''}
              </p>
              <p style={{ fontSize: 18, fontWeight: 700, color: active ? '#fff' : 'var(--text-primary)', marginBottom: 10, letterSpacing: '-0.5px' }}>
                {fmtShort(stats.total)}
              </p>

              {/* Progress bar */}
              <div style={{ height: 4, borderRadius: 999, background: active ? 'rgba(255,255,255,0.25)' : 'var(--border)' }}>
                <div style={{
                  height: '100%', borderRadius: 999,
                  width: `${pct.toFixed(1)}%`,
                  background: active ? '#fff' : color,
                  transition: 'width 0.6s ease',
                }} />
              </div>
              {info.budget > 0 ? (
                <>
                  <p style={{ fontSize: 11, color: active ? 'rgba(255,255,255,0.65)' : 'var(--text-muted)', marginTop: 5 }}>
                    {fmtShort(info.spent)} / {fmtShort(info.budget)}
                  </p>
                  <div style={{ marginTop: 4, height: 3, borderRadius: 999, background: active ? 'rgba(255,255,255,0.25)' : 'var(--border)' }}>
                    <div style={{
                      height: '100%', borderRadius: 999,
                      width: `${Math.min(100, (info.spent / info.budget) * 100)}%`,
                      background: info.spent > info.budget ? 'var(--danger)' : (active ? '#fff' : color),
                    }} />
                  </div>
                </>
              ) : (
                <p style={{ fontSize: 11, color: active ? 'rgba(255,255,255,0.65)' : 'var(--text-muted)', marginTop: 5 }}>
                  {pct.toFixed(1)}% of total
                </p>
              )}
            </button>
          );
        })}
      </div>

      {selected && selectedTxs.length > 0 && (
        <div className="card fade-up" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h2 style={{ fontSize: 15, fontWeight: 700 }}>
                {categoryData.find(c => c.key === selected)?.emoji}{' '}
                {categoryData.find(c => c.key === selected)?.label}
              </h2>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                {selectedTxs.length} transactions · {fmt(selectedTxs.reduce((s, t) => s + t.amount, 0))}
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {editingBudget === selected ? (
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <input
                    type="number"
                    placeholder="Budget (Rp)"
                    value={budgetInput}
                    onChange={e => setBudgetInput(e.target.value)}
                    style={{
                      padding: '6px 10px', borderRadius: 8,
                      border: '1.5px solid var(--border)', background: 'var(--bg-page)',
                      fontSize: 13, width: 120,
                    }}
                  />
                  <button
                    onClick={() => {
                      const val = budgetInput.trim();
                      saveBudget(selected, val ? Number(val) : null);
                    }}
                    className="btn btn-primary"
                    style={{ padding: '6px 12px', fontSize: 12 }}
                  >
                    Save
                  </button>
                  <button
                    onClick={() => { setEditingBudget(null); setBudgetInput(''); }}
                    className="btn btn-ghost"
                    style={{ padding: '6px 12px', fontSize: 12 }}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    const cat = categories.find(c => c.name === selected);
                    setBudgetInput(cat?.budget?.toString() || '');
                    setEditingBudget(selected);
                  }}
                  style={{
                    background: 'var(--bg-page)', border: '1px solid var(--border)',
                    borderRadius: 8, padding: '6px 12px', cursor: 'pointer',
                    fontSize: 12, color: 'var(--text-secondary)',
                  }}
                >
                  {categoryBudgetInfo[selected]?.budget > 0 ? 'Edit Budget' : 'Set Budget'}
                </button>
              )}
              <button onClick={() => setSelected(null)} style={{
                background: 'var(--bg-page)', border: '1px solid var(--border)',
                borderRadius: 8, width: 28, height: 28, cursor: 'pointer',
                fontSize: 16, color: 'var(--text-muted)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>×</button>
            </div>
          </div>

          {editingBudget === selected ? null : (
            categoryBudgetInfo[selected]?.budget > 0 ? (
              <div style={{ padding: 24 }}>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                      Spent: {fmt(categoryBudgetInfo[selected].spent)} of {fmt(categoryBudgetInfo[selected].budget)}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>
                      {Math.round((categoryBudgetInfo[selected].spent / categoryBudgetInfo[selected].budget) * 100)}%
                    </span>
                  </div>
                  <div style={{ height: 8, borderRadius: 999, background: 'var(--border)' }}>
                    <div style={{
                      height: '100%', borderRadius: 999,
                      width: `${Math.min(100, (categoryBudgetInfo[selected].spent / categoryBudgetInfo[selected].budget) * 100)}%`,
                      background: categoryBudgetInfo[selected].spent > categoryBudgetInfo[selected].budget ? 'var(--danger)' : 'var(--success)',
                      transition: 'width 0.3s ease',
                    }} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 24 }}>
                  <div>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>Days remaining</p>
                    <p style={{ fontSize: 18, fontWeight: 700 }}>{categoryBudgetInfo[selected].daysLeft}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>Daily budget left</p>
                    <p style={{ fontSize: 18, fontWeight: 700, color: categoryBudgetInfo[selected].dailyBudget < 0 ? 'var(--danger)' : 'var(--text-primary)' }}>
                      {categoryBudgetInfo[selected].dailyBudget > 0 ? fmtShort(categoryBudgetInfo[selected].dailyBudget) : 'No budget'}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>
                <p style={{ fontSize: 13 }}>No budget set for this category</p>
                <p style={{ fontSize: 12, marginTop: 4 }}>Click &quot;Set Budget&quot; to track your spending</p>
              </div>
            )
          )}

          {editingBudget !== selected && (
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Merchant</th>
                    <th>Source</th>
                    <th style={{ textAlign: 'right' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedTxs.map((tx) => (
                    <tr key={tx.id}>
                      <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                        {new Date(tx.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td style={{ fontWeight: 500 }}>{tx.merchant}</td>
                      <td style={{ color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{tx.source}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--danger)' }}>
                        -{fmt(tx.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {transactions.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)', fontSize: 13 }}>
          <p style={{ fontSize: 32, marginBottom: 12 }}>🛒</p>
          <p>No transactions yet. Go to Dashboard and scan your emails to get started!</p>
        </div>
      )}
    </main>
  );
}