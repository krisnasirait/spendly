'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useDevice } from '@/hooks/useDevice';
import type { PendingTransaction } from '@/types';
import { getCategoryColor } from '@/lib/category-colors';

type PendingTx = PendingTransaction & { id: string };

const fmt = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

const categoryLabel: Record<string, string> = {
  food: 'Food & Drinks', shopping: 'Shopping',
  transport: 'Transport', entertainment: 'Entertainment', other: 'Other',
};

const sourceBadge: Record<string, { label: string; color: string; bg: string }> = {
  shopee:    { label: 'Shopee',    color: '#EE4D2D', bg: '#FFF0EE' },
  tokopedia: { label: 'Tokopedia', color: '#03AC0E', bg: '#F0FFF1' },
  traveloka: { label: 'Traveloka', color: '#0064D2', bg: '#EBF4FF' },
  bca:       { label: 'BCA',       color: '#005BAC', bg: '#EBF2FF' },
  ayo:       { label: 'AYO',       color: '#FF6B00', bg: '#FFF4EE' },
};

interface Category {
  id: string;
  name: string;
}

function EditPendingPanel({ 
  transaction, 
  onClose, 
  onSave 
}: { 
  transaction: PendingTx; 
  onClose: () => void; 
  onSave: (updated: PendingTx) => void;
}) {
  const [merchant, setMerchant] = useState(transaction.merchant);
  const [amount, setAmount] = useState(transaction.amount);
  const [date, setDate] = useState(new Date(transaction.date).toISOString().split('T')[0]);
  const [categories, setCategories] = useState<string[]>(transaction.categories || []);
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [newCatInput, setNewCatInput] = useState('');
  const [suggestions, setSuggestions] = useState<Category[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    setCategoriesLoading(true);
    setCategoriesError(null);
    fetch('/api/categories')
      .then(r => {
        if (!r.ok) throw new Error('Failed to load categories');
        return r.json();
      })
      .then(data => setAllCategories(data.categories || []))
      .catch(err => setCategoriesError(err.message))
      .finally(() => setCategoriesLoading(false));
  }, []);

  function removeCategory(name: string) {
    setCategories(prev => prev.filter(c => c !== name));
  }

  function addCategory(name: string) {
    if (name && !categories.includes(name)) {
      const exists = allCategories.some(c => c.name.toLowerCase() === name.toLowerCase());
      if (!exists) {
        fetch('/api/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name }),
        }).then(async r => {
          if (r.ok) {
            const newCat = await r.json();
            if (newCat?.id) {
              setAllCategories(prev => [...prev, newCat]);
              setCategories(prev => [...prev, newCat.name]);
            }
          }
        }).catch(() => { setCreateError('Failed to create category'); });
      } else {
        const matched = allCategories.find(c => c.name.toLowerCase() === name.toLowerCase());
        if (matched) {
          setCategories(prev => [...prev, matched.name]);
        }
      }
    }
    setNewCatInput('');
    setSuggestions([]);
    setShowCreate(false);
  }

  function handleInputChange(value: string) {
    setNewCatInput(value);
    if (value.trim()) {
      const filtered = allCategories.filter(c =>
        c.name.toLowerCase().includes(value.toLowerCase()) &&
        !categories.includes(c.name)
      );
      setSuggestions(filtered);
      setShowCreate(filtered.length === 0 && value.trim().length > 0);
    } else {
      setSuggestions([]);
      setShowCreate(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(`/api/pending?id=${transaction.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ merchant, amount, date, categories }),
      });
      if (res.ok) {
        onSave({ ...transaction, merchant, amount, date, categories });
        onClose();
      } else {
        const data = await res.json().catch(() => ({}));
        setSaveError(data.error || 'Failed to save transaction');
      }
    } catch {
      setSaveError('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 40,
      }} />
      <div style={{
        position: 'fixed', right: 0, top: 0, bottom: 0, width: 400,
        background: 'var(--bg-surface)', zIndex: 50,
        boxShadow: '-4px 0 24px rgba(0,0,0,0.15)',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
      }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: 16, fontWeight: 700 }}>Edit Transaction</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: 'var(--text-muted)' }}>×</button>
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Merchant</label>
            <input value={merchant} onChange={e => setMerchant(e.target.value)} style={{
              width: '100%', padding: '10px 14px', borderRadius: 10,
              border: '1.5px solid var(--border)', background: 'var(--bg-page)',
              fontSize: 14, color: 'var(--text-primary)', outline: 'none',
            }} />
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Amount (IDR)</label>
            <input type="number" value={amount} onChange={e => setAmount(Number(e.target.value))} style={{
              width: '100%', padding: '10px 14px', borderRadius: 10,
              border: '1.5px solid var(--border)', background: 'var(--bg-page)',
              fontSize: 14, color: 'var(--text-primary)', outline: 'none',
            }} />
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{
              width: '100%', padding: '10px 14px', borderRadius: 10,
              border: '1.5px solid var(--border)', background: 'var(--bg-page)',
              fontSize: 14, color: 'var(--text-primary)', outline: 'none',
            }} />
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Categories</label>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
              {categories.map(cat => {
                const color = getCategoryColor(cat);
                return (
                  <span key={cat} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    padding: '4px 10px', borderRadius: 999, fontSize: 12, fontWeight: 500,
                    background: `${color}20`,
                    color: color,
                  }}>
                    {cat}
                    <button onClick={() => removeCategory(cat)} style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: 'inherit', fontSize: 14, lineHeight: 1, padding: 0,
                    }}>×</button>
                  </span>
                );
              })}
            </div>

            {categoriesLoading && <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Loading categories…</div>}
            {categoriesError && <div style={{ fontSize: 13, color: '#EF4444' }}>{categoriesError}</div>}
            {createError && <div style={{ fontSize: 13, color: '#EF4444' }}>{createError}</div>}
            {!categoriesLoading && !categoriesError && (
              <input
                value={newCatInput}
                onChange={e => handleInputChange(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && showCreate) {
                    e.preventDefault();
                    addCategory(newCatInput.trim());
                  }
                }}
                placeholder="Type to add category…"
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: 10,
                  border: '1.5px solid var(--border)', background: 'var(--bg-page)',
                  fontSize: 14, color: 'var(--text-primary)', outline: 'none',
                }}
              />
            )}

            {suggestions.length > 0 && (
              <div style={{
                marginTop: 6, borderRadius: 10, border: '1.5px solid var(--border)',
                background: 'var(--bg-surface)', overflow: 'hidden',
              }}>
                {suggestions.map(cat => (
                  <button key={cat.id} onClick={() => addCategory(cat.name)} style={{
                    width: '100%', padding: '10px 14px', background: 'none', border: 'none',
                    textAlign: 'left', cursor: 'pointer', fontSize: 13,
                    color: 'var(--text-primary)', borderBottom: '1px solid var(--border)',
                  }}>
                    {cat.name}
                  </button>
                ))}
              </div>
            )}

            {showCreate && (
              <button onClick={() => addCategory(newCatInput.trim())} style={{
                marginTop: 6, padding: '10px 14px', borderRadius: 10,
                border: '1.5px dashed var(--accent)', background: 'none',
                width: '100%', textAlign: 'left', cursor: 'pointer', fontSize: 13,
                color: 'var(--accent)',
              }}>
                + Create &quot;{newCatInput.trim()}&quot;
              </button>
            )}
          </div>
        </div>

        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {saveError && (
            <div style={{ padding: '10px 14px', borderRadius: 8, background: '#FEE2E2', color: '#991B1B', fontSize: 13 }}>
              {saveError}
            </div>
          )}
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={onClose} className="btn btn-ghost" style={{ flex: 1 }}>Cancel</button>
            <button onClick={handleSave} disabled={saving} className="btn btn-primary" style={{ flex: 1 }}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default function PendingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [transactions, setTransactions] = useState<PendingTx[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [editingTx, setEditingTx] = useState<PendingTx | null>(null);
  const { isMobile } = useDevice();

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/signin');
  }, [status, router]);

  useEffect(() => {
    if (session?.user) {
      fetch('/api/pending')
        .then((res) => res.json())
        .then((data) => {
          setTransactions(data.pendingTransactions || []);
          setLoading(false);
        });
    }
  }, [session]);

  async function handleAction(id: string, action: 'approve' | 'reject') {
    setActionLoading(id);
    try {
      const res = await fetch('/api/pending', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, id }),
      });
      if (res.ok) {
        setTransactions(prev => prev.filter(t => t.id !== id));
      } else {
        setActionError('Failed to complete action. Please try again.');
      }
    } catch {
      setActionError('Network error. Please try again.');
    } finally {
      setActionLoading(null);
    }
  }

  function handleSave(updated: PendingTx) {
    setTransactions(prev => prev.map(t => t.id === updated.id ? updated : t));
  }

  if (status === 'loading' || loading) {
    return (
      <main style={{ padding: isMobile ? '16px 16px 24px' : '32px 32px 48px' }}>
        <div className="skeleton" style={{ height: 36, width: 220, marginBottom: 24 }} />
        <div className="card">
          {[0,1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 44, marginBottom: 10 }} />)}
        </div>
      </main>
    );
  }

  return (
    <main style={{
      padding: isMobile ? '16px 16px 24px' : '32px 32px 48px',
      display: 'flex',
      flexDirection: 'column',
      gap: isMobile ? 16 : 24,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.5px' }}>Pending Transactions</h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
            {transactions.length} pending
          </p>
        </div>
      </div>

      {actionError && (
        <div style={{ padding: '12px 16px', borderRadius: 8, background: '#FEE2E2', color: '#991B1B', fontSize: 13 }}>
          {actionError}
        </div>
      )}

      {transactions.length === 0 ? (
        <div className="card fade-up" style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
          No pending transactions. All caught up!
        </div>
      ) : isMobile ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '8px 0' }}>
          {transactions.map((tx) => {
            const badge = sourceBadge[tx.source] ?? { label: tx.source, color: '#6B7280', bg: '#F3F4F6' };
            return (
              <div key={tx.id} style={{
                padding: 16,
                background: 'var(--bg-surface)',
                borderRadius: 12,
                border: '1px solid var(--border)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <span style={{
                        display: 'inline-block', padding: '2px 8px', borderRadius: 999,
                        fontSize: 10, fontWeight: 600, background: badge.bg, color: badge.color,
                      }}>{badge.label}</span>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {new Date(tx.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                    <div style={{ fontWeight: 600, fontSize: 15 }}>{tx.merchant}</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                      {tx.categories.map(cat => (
                        <span key={cat} style={{
                          display: 'inline-block', padding: '2px 8px', borderRadius: 999,
                          fontSize: 10, fontWeight: 500,
                          background: `${getCategoryColor(cat)}20`,
                          color: getCategoryColor(cat),
                        }}>
                          {categoryLabel[cat] ?? cat}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--danger)' }}>
                    -{fmt(tx.amount)}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => handleAction(tx.id, 'approve')}
                    disabled={actionLoading === tx.id}
                    style={{
                      flex: 1,
                      height: 48,
                      borderRadius: 8,
                      border: 'none',
                      background: 'var(--success, #22c55e)',
                      color: '#fff',
                      fontWeight: 600,
                      fontSize: 14,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                    }}
                  >
                    {actionLoading === tx.id ? 'Approving…' : '✓ Approve'}
                  </button>
                  <button
                    onClick={() => handleAction(tx.id, 'reject')}
                    disabled={actionLoading === tx.id}
                    style={{
                      flex: 1,
                      height: 48,
                      borderRadius: 8,
                      border: '1.5px solid var(--danger)',
                      background: 'transparent',
                      color: 'var(--danger)',
                      fontWeight: 600,
                      fontSize: 14,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                    }}
                  >
                    {actionLoading === tx.id ? 'Dismissing…' : '✗ Dismiss'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card fade-up" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Merchant</th>
                  <th>Source</th>
                  <th>Category</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                  <th style={{ width: 100 }}></th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => {
                  const badge = sourceBadge[tx.source] ?? { label: tx.source, color: '#6B7280', bg: '#F3F4F6' };
                  return (
                    <tr key={tx.id}>
                      <td style={{ color: 'var(--text-muted)', fontSize: 12, whiteSpace: 'nowrap' }}>
                        {new Date(tx.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td style={{ fontWeight: 500 }}>{tx.merchant}</td>
                      <td>
                        <span style={{
                          display: 'inline-block', padding: '3px 10px', borderRadius: 999,
                          fontSize: 11, fontWeight: 600, background: badge.bg, color: badge.color,
                        }}>{badge.label}</span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {tx.categories.map(cat => (
                            <span key={cat} style={{
                              display: 'inline-block', padding: '2px 8px', borderRadius: 999,
                              fontSize: 11, fontWeight: 500,
                              background: `${getCategoryColor(cat)}20`,
                              color: getCategoryColor(cat),
                            }}>
                              {categoryLabel[cat] ?? cat}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--danger)' }}>
                        -{fmt(tx.amount)}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => handleAction(tx.id, 'approve')}
                            disabled={actionLoading === tx.id}
                            style={{
                              background: 'none', border: 'none', cursor: 'pointer',
                              color: '#22C55E', fontSize: 16, padding: 4,
                              opacity: actionLoading === tx.id ? 0.5 : 1,
                            }}
                            title="Approve"
                          >
                            ✓
                          </button>
                          <button
                            onClick={() => setEditingTx(tx)}
                            style={{
                              background: 'none', border: 'none', cursor: 'pointer',
                              color: 'var(--text-muted)', fontSize: 14, padding: 4,
                            }}
                            title="Edit"
                          >
                            ✎
                          </button>
                          <button
                            onClick={() => handleAction(tx.id, 'reject')}
                            disabled={actionLoading === tx.id}
                            style={{
                              background: 'none', border: 'none', cursor: 'pointer',
                              color: '#EF4444', fontSize: 16, padding: 4,
                              opacity: actionLoading === tx.id ? 0.5 : 1,
                            }}
                            title="Reject"
                          >
                            ×
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {editingTx && (
        <EditPendingPanel
          transaction={editingTx}
          onClose={() => setEditingTx(null)}
          onSave={handleSave}
        />
      )}
    </main>
  );
}
