'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import type { Transaction } from '@/types';
import EditTransactionPanel from '@/components/EditTransactionPanel';
import { getCategoryColor } from '@/lib/category-colors';
import { getBillingPeriod, isInBillingPeriod } from '@/lib/billing-period';

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

const ITEMS_PER_PAGE = 15;

type SortKey = 'date' | 'amount' | 'merchant';
interface DateRange {
  start: Date;
  end: Date;
}

const QUICK_RANGES: Array<{ label: string; getValue: () => DateRange | null }> = [
  {
    label: 'This Month',
    getValue: () => {
      const now = new Date();
      return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: now };
    },
  },
  {
    label: 'Last Month',
    getValue: () => {
      const now = new Date();
      return { start: new Date(now.getFullYear(), now.getMonth() - 1, 1), end: new Date(now.getFullYear(), now.getMonth(), 0) };
    },
  },
  {
    label: 'Last 3 Months',
    getValue: () => {
      const now = new Date();
      return { start: new Date(now.getFullYear(), now.getMonth() - 2, 1), end: now };
    },
  },
  { label: 'Custom', getValue: () => null },
];

export default function HistoryPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [filterSource, setFilterSource] = useState('');
  const [dateRange, setDateRange] = useState<DateRange>(() => {
  const now = new Date();
  return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: now };
});
  const [showCustom, setShowCustom] = useState(false);
  const [billingStartDay, setBillingStartDay] = useState(1);
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortAsc, setSortAsc] = useState(false);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkCategory, setBulkCategory] = useState('');
  const [bulkApplying, setBulkApplying] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [recurringMerchants, setRecurringMerchants] = useState<Map<string, { frequency: string; avgAmount: number }>>(new Map());

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/signin');
  }, [status, router]);

  useEffect(() => {
    if (session?.user) {
      fetch('/api/transactions')
        .then((res) => res.json())
        .then((data) => {
          setTransactions(data.transactions || []);
          setLoading(false);
        });
      fetch('/api/settings')
        .then(r => r.json())
        .then(data => {
          if (data.billingStartDay) setBillingStartDay(data.billingStartDay);
        })
        .catch(() => {});
      fetch('/api/recurring')
        .then(res => res.json())
        .then(data => {
          const map = new Map<string, { frequency: string; avgAmount: number }>();
          data.recurring.forEach((r: { merchant: string; frequency: string; avgAmount: number }) => {
            map.set(r.merchant, { frequency: r.frequency, avgAmount: r.avgAmount });
          });
          setRecurringMerchants(map);
        })
        .catch(() => {});
    }
  }, [session]);

  const filtered = useMemo(() => {
    const now = new Date();
    let list = [...transactions];
    
    list = list.filter(t => {
      const txDate = new Date(t.date);
      return txDate >= dateRange.start && txDate <= dateRange.end;
    });
    
    if (search) list = list.filter(t =>
      t.merchant.toLowerCase().includes(search.toLowerCase()));
    if (filterCat) list = list.filter(t => t.categories.includes(filterCat));
    if (filterSource) list = list.filter(t => t.source === filterSource);
    list.sort((a, b) => {
      let diff = 0;
      if (sortKey === 'date')     diff = new Date(a.date).getTime() - new Date(b.date).getTime();
      if (sortKey === 'amount')   diff = a.amount - b.amount;
      if (sortKey === 'merchant') diff = a.merchant.localeCompare(b.merchant);
      return sortAsc ? diff : -diff;
    });
    return list;
  }, [transactions, search, filterCat, filterSource, sortKey, sortAsc, dateRange]);

  const pages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paged = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);
  const totalSpend = filtered.reduce((s, t) => s + t.amount, 0);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(false); }
  }

  async function deleteTransaction(id: string) {
    if (!confirm('Delete this transaction?')) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/transactions?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setTransactions(prev => prev.filter(t => t.id !== id));
        setSelected(prev => { const next = new Set(prev); next.delete(id); return next; });
      }
    } finally {
      setDeleting(false);
    }
  }

  async function deleteSelected() {
    if (selected.size === 0) return;
    if (!confirm(`Delete ${selected.size} transaction(s)?`)) return;
    setDeleting(true);
    try {
      const res = await fetch('/api/transactions', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selected) }),
      });
      if (res.ok) {
        setTransactions(prev => prev.filter(t => !selected.has(t.id)));
        setSelected(new Set());
      }
    } finally {
      setDeleting(false);
    }
  }

  async function deleteAll() {
    if (transactions.length === 0) return;
    if (!confirm(`Delete all ${transactions.length} transactions? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      const res = await fetch('/api/transactions', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: transactions.map(t => t.id) }),
      });
      if (res.ok) {
        setTransactions([]);
        setSelected(new Set());
      }
    } finally {
      setDeleting(false);
    }
  }

  async function handleBulkCategoryChange() {
    if (selected.size === 0 || !bulkCategory) return;
    if (!confirm(`Change category to "${bulkCategory}" for ${selected.size} transaction(s)?`)) return;
    setBulkApplying(true);
    try {
      const ids = Array.from(selected);
      const errors: string[] = [];
      for (const id of ids) {
        const res = await fetch(`/api/transactions?id=${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, categories: [bulkCategory] }),
        });
        if (!res.ok) errors.push(id);
      }
      if (errors.length > 0) {
        throw new Error(`${errors.length} update(s) failed`);
      }
      setTransactions(prev =>
        prev.map(tx =>
          selected.has(tx.id) ? { ...tx, categories: [bulkCategory] } : tx
        )
      );
      setSelected(new Set());
      setBulkCategory('');
    } catch (error) {
      console.error('Bulk update failed:', error);
      alert(error instanceof Error ? error.message : 'Bulk update failed');
    } finally {
      setBulkApplying(false);
    }
  }

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selected.size === paged.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(paged.map(t => t.id)));
    }
  }

  const SortBtn = ({ col, label }: { col: SortKey; label: string }) => (
    <button onClick={() => toggleSort(col)} style={{
      background: 'none', border: 'none', cursor: 'pointer',
      display: 'flex', alignItems: 'center', gap: 3,
      color: sortKey === col ? 'var(--accent)' : 'inherit',
      fontWeight: 'inherit', fontSize: 'inherit', letterSpacing: 'inherit',
      textTransform: 'inherit',
    }}>
      {label} {sortKey === col ? (sortAsc ? '↑' : '↓') : ''}
    </button>
  );

  function handleSave(updated: Transaction) {
    setTransactions(prev => prev.map(t => t.id === updated.id ? updated : t));
  }

  if (status === 'loading' || loading) {
    return (
      <main style={{ padding: '32px 32px 48px' }}>
        <div className="skeleton" style={{ height: 36, width: 220, marginBottom: 24 }} />
        <div className="card">
          {[0,1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 44, marginBottom: 10 }} />)}
        </div>
      </main>
    );
  }

  return (
    <main style={{ padding: '32px 32px 48px', display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.5px' }}>Transaction History</h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
            {filtered.length} transactions · Total: {fmt(totalSpend)}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          {selected.size > 0 && (
            <button
              className="btn btn-ghost"
              onClick={deleteSelected}
              disabled={deleting}
              style={{ fontSize: 12, color: 'var(--danger)' }}
            >
              Delete ({selected.size})
            </button>
          )}
          {transactions.length > 0 && (
            <button
              className="btn btn-ghost"
              onClick={deleteAll}
              disabled={deleting}
              style={{ fontSize: 12, color: 'var(--danger)' }}
            >
              Delete All
            </button>
          )}
        </div>
      </div>

      {/* Filter bar */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          id="history-search"
          placeholder="Search merchant…"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          style={{
            flex: 1, minWidth: 180, padding: '10px 16px',
            borderRadius: 'var(--radius-pill)', border: '1.5px solid var(--border-subtle)',
            background: 'var(--bg-surface)', fontSize: 13, color: 'var(--text-primary)',
            outline: 'none',
          }}
        />

        <button
          onClick={() => {
            const headers = ['Date', 'Merchant', 'Amount', 'Category', 'Source'];
            const rows = filtered.map(tx => [
              new Date(tx.date).toLocaleDateString('id-ID'),
              `"${tx.merchant.replace(/"/g, '""')}"`,
              tx.amount.toString(),
              tx.categories.join('; '),
              tx.source,
            ]);
            const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            const fromStr = dateRange.start.toISOString().split('T')[0];
            const toStr = dateRange.end.toISOString().split('T')[0];
            link.download = `spendly-transactions-${fromStr}-${toStr}.csv`;
            link.click();
            URL.revokeObjectURL(url);
          }}
          style={{
            padding: '8px 16px',
            borderRadius: 8,
            border: '1.5px solid var(--border)',
            background: 'var(--bg-surface)',
            color: 'var(--text-primary)',
            fontSize: 13,
            fontWeight: 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Export CSV
        </button>

        <select id="history-filter-cat" value={filterCat} onChange={e => { setFilterCat(e.target.value); setPage(1); }}
          style={{
            padding: '10px 16px', borderRadius: 'var(--radius-pill)',
            border: '1.5px solid var(--border-subtle)', background: 'var(--bg-surface)',
            fontSize: 13, color: 'var(--text-secondary)', cursor: 'pointer', outline: 'none',
          }}>
          <option value="">All categories</option>
          {Object.entries(categoryLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>

        <select id="history-filter-source" value={filterSource} onChange={e => { setFilterSource(e.target.value); setPage(1); }}
          style={{
            padding: '10px 16px', borderRadius: 'var(--radius-pill)',
            border: '1.5px solid var(--border-subtle)', background: 'var(--bg-surface)',
            fontSize: 13, color: 'var(--text-secondary)', cursor: 'pointer', outline: 'none',
          }}>
          <option value="">All sources</option>
          {Object.keys(sourceBadge).map(k => <option key={k} value={k}>{sourceBadge[k].label}</option>)}
        </select>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <select
            value={QUICK_RANGES.findIndex(q => {
              const v = q.getValue();
              return v && v.start.getTime() === dateRange.start.getTime() && v.end.getTime() === dateRange.end.getTime();
            }) >= 0 ? QUICK_RANGES.findIndex(q => {
              const v = q.getValue();
              return v && v.start.getTime() === dateRange.start.getTime() && v.end.getTime() === dateRange.end.getTime();
            }) : -1}
            onChange={(e) => {
              const idx = Number(e.target.value);
              if (idx === -1) {
                setShowCustom(true);
              } else {
                const range = QUICK_RANGES[idx].getValue();
                if (range) setDateRange(range);
              }
            }}
            style={{
              padding: '8px 12px',
              borderRadius: 8,
              border: '1.5px solid var(--border)',
              background: 'var(--bg-surface)',
              color: 'var(--text-primary)',
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            <option value={0}>This Month</option>
            <option value={1}>Last Month</option>
            <option value={2}>Last 3 Months</option>
            <option value={-1}>Custom</option>
          </select>

          {showCustom && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                type="date"
                value={dateRange.start.toISOString().split('T')[0]}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: new Date(e.target.value) }))}
                style={{
                  padding: '8px 12px',
                  borderRadius: 8,
                  border: '1.5px solid var(--border)',
                  background: 'var(--bg-surface)',
                  color: 'var(--text-primary)',
                  fontSize: 13,
                }}
              />
              <span style={{ color: 'var(--text-muted)' }}>to</span>
              <input
                type="date"
                value={dateRange.end.toISOString().split('T')[0]}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: new Date(e.target.value) }))}
                style={{
                  padding: '8px 12px',
                  borderRadius: 8,
                  border: '1.5px solid var(--border)',
                  background: 'var(--bg-surface)',
                  color: 'var(--text-primary)',
                  fontSize: 13,
                }}
              />
              <button
                onClick={() => setShowCustom(false)}
                style={{
                  padding: '8px 12px',
                  borderRadius: 8,
                  border: 'none',
                  background: 'var(--accent)',
                  color: '#fff',
                  fontSize: 12,
                  cursor: 'pointer',
                }}
              >
                Apply
              </button>
            </div>
          )}
        </div>
      </div>

      {selected.size > 0 && (
        <div style={{
          position: 'sticky',
          top: 32,
          zIndex: 50,
          padding: '12px 16px',
          background: 'var(--accent)',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          borderRadius: '8px 8px 0 0',
        }}>
          <span style={{ fontWeight: 600, flex: 1 }}>
            {selected.size} selected
          </span>
          <select
            value={bulkCategory}
            onChange={(e) => setBulkCategory(e.target.value)}
            style={{
              padding: '6px 10px',
              borderRadius: 6,
              border: 'none',
              fontSize: 13,
              color: '#fff',
            }}
          >
            <option value="">Select category...</option>
            <option value="food">Food & Drinks</option>
            <option value="shopping">Shopping</option>
            <option value="transport">Transport</option>
            <option value="entertainment">Entertainment</option>
            <option value="other">Other</option>
          </select>
          <button
            onClick={handleBulkCategoryChange}
            disabled={!bulkCategory || bulkApplying}
            style={{
              padding: '6px 12px',
              borderRadius: 6,
              border: 'none',
              background: bulkCategory ? '#fff' : 'rgba(255,255,255,0.5)',
              color: bulkCategory ? 'var(--accent)' : 'rgba(255,255,255,0.7)',
              fontSize: 13,
              fontWeight: 600,
              cursor: bulkCategory ? 'pointer' : 'not-allowed',
            }}
          >
            {bulkApplying ? 'Applying...' : 'Apply'}
          </button>
          <button
            onClick={() => { setSelected(new Set()); setBulkCategory(''); }}
            style={{
              padding: '6px 12px',
              borderRadius: 6,
              border: '1px solid rgba(255,255,255,0.5)',
              background: 'transparent',
              color: '#fff',
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
        </div>
      )}

      {/* Table */}
      <div className="card fade-up" style={{ padding: 0, overflow: 'hidden' }}>
        {paged.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            No transactions match your filters.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 40 }}>
                    <input
                      type="checkbox"
                      checked={paged.length > 0 && selected.size === paged.length}
                      onChange={toggleSelectAll}
                      style={{ cursor: 'pointer', width: 16, height: 16 }}
                    />
                  </th>
                  <th><SortBtn col="date" label="Date" /></th>
                  <th><SortBtn col="merchant" label="Merchant" /></th>
                  <th>Source</th>
                  <th>Category</th>
                  <th style={{ textAlign: 'right' }}><SortBtn col="amount" label="Amount" /></th>
                  <th style={{ width: 40 }}></th>
                  <th style={{ width: 40 }}></th>
                </tr>
              </thead>
              <tbody>
                {paged.map((tx) => {
                  const badge = sourceBadge[tx.source] ?? { label: tx.source, color: '#6B7280', bg: '#F3F4F6' };
                  const isSelected = selected.has(tx.id);
                  return (
                    <tr key={tx.id} onClick={() => setEditingTx(tx)} style={{ background: isSelected ? 'var(--bg-page)' : undefined, cursor: 'pointer' }}>
                      <td onClick={() => toggleSelect(tx.id)} style={{ cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(tx.id)}
                          style={{ cursor: 'pointer', width: 16, height: 16 }}
                        />
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: 12, whiteSpace: 'nowrap' }}>
                        {new Date(tx.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td style={{ fontWeight: 500 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span>{tx.merchant}</span>
                          {recurringMerchants.has(tx.merchant) && (
                            <span style={{
                              fontSize: 10,
                              padding: '2px 6px',
                              borderRadius: 4,
                              background: 'var(--accent-light)',
                              color: 'var(--accent)',
                            }}>
                              🔄 {recurringMerchants.get(tx.merchant)?.frequency}
                            </span>
                          )}
                        </div>
                      </td>
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
                        <button onClick={() => setEditingTx(tx)} style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          color: 'var(--text-muted)', fontSize: 14, padding: 4,
                        }} title="Edit">✎</button>
                      </td>
                      <td>
                        <button
                          onClick={() => deleteTransaction(tx.id)}
                          disabled={deleting}
                          style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            color: 'var(--text-muted)', fontSize: 16, padding: 4,
                          }}
                          title="Delete"
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <button className="btn btn-ghost" disabled={page === 1}
            onClick={() => setPage(p => p - 1)}
            style={{ padding: '7px 14px', fontSize: 13, opacity: page === 1 ? 0.4 : 1 }}>
            ← Prev
          </button>
          {Array.from({ length: pages }, (_, i) => i + 1).map(p => (
            <button key={p}
              onClick={() => setPage(p)}
              style={{
                width: 34, height: 34, borderRadius: 8, border: 'none', cursor: 'pointer',
                fontWeight: 600, fontSize: 13,
                background: p === page ? 'var(--accent)' : 'var(--bg-surface)',
                color: p === page ? '#fff' : 'var(--text-secondary)',
                boxShadow: p === page ? 'var(--shadow-card)' : 'none',
              }}>{p}</button>
          ))}
          <button className="btn btn-ghost" disabled={page === pages}
            onClick={() => setPage(p => p + 1)}
            style={{ padding: '7px 14px', fontSize: 13, opacity: page === pages ? 0.4 : 1 }}>
            Next →
          </button>
        </div>
      )}
      {editingTx && (
        <EditTransactionPanel
          transaction={editingTx}
          onClose={() => setEditingTx(null)}
          onSave={handleSave}
        />
      )}
    </main>
  );
}