'use client';

import { useState, useEffect } from 'react';
import { getCategoryColor } from '@/lib/category-colors';
import type { Transaction } from '@/types';

interface AddTransactionPanelProps {
  onClose: () => void;
  onAdd: (transaction: Omit<Transaction, 'userId' | 'createdAt'> & { source?: string }) => void;
}

interface Category {
  id: string;
  name: string;
}

export default function AddTransactionPanel({ onClose, onAdd }: AddTransactionPanelProps) {
  const [merchant, setMerchant] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [categories, setCategories] = useState<string[]>([]);
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [newCatInput, setNewCatInput] = useState('');
  const [suggestions, setSuggestions] = useState<Category[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/categories')
      .then(r => r.json())
      .then(data => setAllCategories(data.categories || []))
      .catch(() => {});
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
        }).catch(() => {});
      } else {
        const matched = allCategories.find(c => c.name.toLowerCase() === name.toLowerCase());
        if (matched) setCategories(prev => [...prev, matched.name]);
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
    if (!merchant.trim()) {
      setError('Merchant is required');
      return;
    }
    if (!amount || Number(amount) <= 0) {
      setError('Amount must be greater than 0');
      return;
    }
    if (categories.length === 0) {
      setError('At least one category is required');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merchant: merchant.trim(),
          amount: Number(amount),
          date,
          categories,
          source: 'manual',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        onAdd({
          id: data.id,
          merchant: merchant.trim(),
          amount: Number(amount),
          date,
          categories,
          source: 'manual' as Transaction['source'],
        });
        onClose();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Failed to add transaction');
      }
    } catch {
      setError('Network error. Please try again.');
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
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: 16, fontWeight: 700 }}>Add Transaction</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: 'var(--text-muted)' }}>×</button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflow: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Merchant */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Merchant</label>
            <input value={merchant} onChange={e => setMerchant(e.target.value)} placeholder="e.g., Warung Kopi" style={{
              width: '100%', padding: '10px 14px', borderRadius: 10,
              border: '1.5px solid var(--border)', background: 'var(--bg-page)',
              fontSize: 14, color: 'var(--text-primary)', outline: 'none',
            }} />
          </div>

          {/* Amount */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Amount (IDR)</label>
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="e.g., 50000" style={{
              width: '100%', padding: '10px 14px', borderRadius: 10,
              border: '1.5px solid var(--border)', background: 'var(--bg-page)',
              fontSize: 14, color: 'var(--text-primary)', outline: 'none',
            }} />
          </div>

          {/* Date */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{
              width: '100%', padding: '10px 14px', borderRadius: 10,
              border: '1.5px solid var(--border)', background: 'var(--bg-page)',
              fontSize: 14, color: 'var(--text-primary)', outline: 'none',
            }} />
          </div>

          {/* Categories */}
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

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {error && (
            <div style={{ padding: '10px 14px', borderRadius: 8, background: '#FEE2E2', color: '#991B1B', fontSize: 13 }}>
              {error}
            </div>
          )}
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={onClose} className="btn btn-ghost" style={{ flex: 1 }}>Cancel</button>
            <button onClick={handleSave} disabled={saving} className="btn btn-primary" style={{ flex: 1 }}>
              {saving ? 'Adding…' : 'Add Transaction'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
