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
  const [deleting, setDeleting] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);

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
    }
  }, [session]);

  const filtered = useMemo(() => {
    const now = new Date();
    let list = [...transactions];
    
    if (period !== 'all') {
      const { start, end } = getBillingPeriod(now, billingStartDay);
      list = list.filter(t => {
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
    }
    
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
  }, [transactions, search, filterCat, filterSource, sortKey, sortAsc, period, billingStartDay]);

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

        <div style={{ display: 'flex', gap: 4, background: 'var(--bg-page)', borderRadius: 'var(--radius-pill)', padding: 4 }}>
          {(['today', 'week', 'month', 'all'] as Period[]).map(p => (
            <button
              key={p}
              onClick={() => { setPeriod(p); setPage(1); }}
              style={{
                padding: '6px 12px', borderRadius: 'var(--radius-pill)', border: 'none',
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