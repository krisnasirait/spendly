'use client';

import { useState, useEffect } from 'react';
import type { Transaction } from '@/types';
import { getCategoryColor } from '@/lib/category-colors';
import { useDevice } from '@/hooks/useDevice';

interface Category {
  id: string;
  name: string;
}

interface EditTransactionPanelProps {
  transaction: Transaction;
  onClose: () => void;
  onSave: (updated: Transaction) => void;
}

export default function EditTransactionPanel({ transaction, onClose, onSave }: EditTransactionPanelProps) {
  const { isMobile } = useDevice();
  const [merchant, setMerchant] = useState(transaction.merchant);
  const [amount, setAmount] = useState(transaction.amount);
  const [date, setDate] = useState(new Date(transaction.date).toISOString().split('T')[0]);
  const [category, setCategory] = useState<string>(transaction.category);
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [newCatInput, setNewCatInput] = useState('');
  const [suggestions, setSuggestions] = useState<Category[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const [categorySuggestion, setCategorySuggestion] = useState<string | null>(null);

  let merchantTimeout: NodeJS.Timeout | null = null;

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

  function selectCategory(name: string) {
    setCategory(name);
    setNewCatInput('');
    setSuggestions([]);
    setShowCreate(false);
  }

  function addCategory(name: string) {
    selectCategory(name);
  }

  function handleInputChange(value: string) {
    setNewCatInput(value);
    if (value.trim()) {
      const filtered = allCategories.filter(c =>
        c.name.toLowerCase().includes(value.toLowerCase())
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
      const res = await fetch('/api/transactions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: transaction.id, merchant, amount, date, category }),
      });
      if (res.ok) {
        onSave({ ...transaction, merchant, amount, date, category });
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
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 199,
        display: 'flex', justifyContent: 'flex-end',
      }} />
      <div style={{
        position: 'fixed',
        ...(isMobile
          ? { left: 0, right: 0, bottom: 0, top: 'auto', width: '100%', height: '85vh', borderRadius: '16px 16px 0 0' }
          : { right: 0, top: 0, bottom: 0, width: 400 }),
        background: 'var(--bg-surface)', zIndex: 200,
        display: 'flex', flexDirection: 'column',
        boxShadow: isMobile ? '0 -4px 24px rgba(0,0,0,0.1)' : '-4px 0 24px rgba(0,0,0,0.1)',
        overflow: isMobile ? 'hidden' : 'auto',
      }}>
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {isMobile && (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px', position: 'absolute', left: 0, right: 0, top: 0 }}>
              <div style={{ width: 36, height: 4, background: '#ddd', borderRadius: 2 }} />
            </div>
          )}
          <h2 style={{ fontSize: 16, fontWeight: 700, padding: isMobile ? '16px 0 0' : '0 0 8px' }}>Edit Transaction</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: 'var(--text-muted)' }}>×</button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflow: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Merchant */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Merchant</label>
            <input value={merchant} onChange={(e) => {
              const value = e.target.value;
              setMerchant(value);
              if (merchantTimeout) clearTimeout(merchantTimeout);
              if (value.length >= 3) {
                merchantTimeout = setTimeout(async () => {
                  try {
                    const res = await fetch(`/api/merchants/suggest?merchant=${encodeURIComponent(value)}`);
                    const data = await res.json();
                    if (data.suggestion && data.count >= 2) {
                      setCategorySuggestion(data.suggestion);
                    } else {
                      setCategorySuggestion(null);
                    }
                  } catch {
                    setCategorySuggestion(null);
                  }
                }, 300);
              } else {
                setCategorySuggestion(null);
              }
            }} style={{
              width: '100%', padding: '10px 14px', borderRadius: 10,
              border: '1.5px solid var(--border)', background: 'var(--bg-page)',
              fontSize: isMobile ? 15 : 14, color: 'var(--text-primary)', outline: 'none',
              height: isMobile ? 48 : 40,
            }} />
            {categorySuggestion && (
              <div style={{
                marginTop: 8,
                padding: '8px 12px',
                background: 'var(--accent-light)',
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
                <span style={{ fontSize: 12, color: 'var(--accent)' }}>
                  Based on history: {categorySuggestion}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setCategory(categorySuggestion);
                    setCategorySuggestion(null);
                  }}
                  style={{
                    fontSize: 11,
                    padding: '4px 8px',
                    borderRadius: 4,
                    border: 'none',
                    background: 'var(--accent)',
                    color: '#fff',
                    cursor: 'pointer',
                  }}
                >
                  Apply
                </button>
              </div>
            )}
          </div>

          {/* Amount */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Amount (IDR)</label>
            <input type="number" value={amount} onChange={e => setAmount(Number(e.target.value))} style={{
              width: '100%', padding: '10px 14px', borderRadius: 10,
              border: '1.5px solid var(--border)', background: 'var(--bg-page)',
              fontSize: isMobile ? 15 : 14, color: 'var(--text-primary)', outline: 'none',
              height: isMobile ? 48 : 40,
            }} />
          </div>

          {/* Date */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{
              width: '100%', padding: '10px 14px', borderRadius: 10,
              border: '1.5px solid var(--border)', background: 'var(--bg-page)',
              fontSize: isMobile ? 15 : 14, color: 'var(--text-primary)', outline: 'none',
              height: isMobile ? 48 : 40,
            }} />
          </div>

          {/* Category */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Category</label>

            {/* Current category chip */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: '4px 10px', borderRadius: 999, fontSize: 12, fontWeight: 500,
                background: `${getCategoryColor(category)}20`,
                color: getCategoryColor(category),
              }}>
                {category}
              </span>
            </div>

            {categoriesLoading && <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Loading categories…</div>}
            {categoriesError && <div style={{ fontSize: 13, color: '#EF4444' }}>{categoriesError}</div>}
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
                placeholder="Type to change category…"
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: 10,
                  border: '1.5px solid var(--border)', background: 'var(--bg-page)',
                  fontSize: isMobile ? 15 : 14, color: 'var(--text-primary)', outline: 'none',
                  height: isMobile ? 48 : 40,
                }}
              />
            )}

            {/* Suggestions */}
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

            {/* Create new option */}
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

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 10 }}>
          {saveError && (
            <div style={{ padding: '10px 14px', borderRadius: 8, background: '#FEE2E2', color: '#991B1B', fontSize: 13 }}>
              {saveError}
            </div>
          )}
          <div style={{ display: 'flex', gap: 10, flexDirection: isMobile ? 'column' : 'row' }}>
            <button onClick={onClose} className="btn btn-ghost" style={{ flex: isMobile ? 1 : 'none', height: isMobile ? 48 : 40, borderRadius: isMobile ? 12 : 8 }}>Cancel</button>
            <button onClick={handleSave} disabled={saving} className="btn btn-primary" style={{ flex: isMobile ? 1 : 'none', width: isMobile ? '100%' : 'auto', height: isMobile ? 48 : 40, borderRadius: isMobile ? 12 : 8 }}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
