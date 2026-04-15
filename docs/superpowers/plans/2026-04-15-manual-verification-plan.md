# Manual Transaction Verification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add manual verification workflow for scanned transactions - save to pending, show review page, approve/reject/edit before committing to history.

**Architecture:** Add `manualVerificationEnabled` setting, create `pendingTransactions` collection, build pending review page with approve/edit/reject actions, auto-approve all pending when feature is disabled.

**Tech Stack:** TypeScript, Firestore, Next.js API routes, React

---

## File Structure

- Modify: `types/index.ts:1-11` - Add PendingTransaction type
- Modify: `app/api/settings/route.ts:1-73` - Add manualVerificationEnabled field, auto-approve on disable
- Modify: `app/api/emails/scan/route.ts:1-165` - Check setting, route to pending or transactions
- Create: `app/api/pending/route.ts` - GET pending, POST approve/reject
- Create: `app/api/pending/[id]/route.ts` - PATCH single pending
- Modify: `app/dashboard/settings/page.tsx:527-570` - Add toggle UI in Scan Settings
- Create: `app/dashboard/pending/page.tsx` - Pending transactions review page
- Modify: `components/dashboard/Sidebar.tsx` - Add Pending link

---

## Task 1: Add PendingTransaction Type

**Files:**
- Modify: `types/index.ts:1-11`

- [ ] **Step 1: Add PendingTransaction type after Transaction interface**

```typescript
export interface PendingTransaction {
  merchant: string;
  amount: number;
  date: string;
  categories: string[];
  source: 'shopee' | 'tokopedia' | 'traveloka' | 'bca' | 'ayo';
  messageId: string;
  createdAt: string;
  status: 'pending';
}
```

- [ ] **Step 2: Commit**

```bash
git add types/index.ts
git commit -m "feat: add PendingTransaction type"
```

---

## Task 2: Update Settings API - Add manualVerificationEnabled

**Files:**
- Modify: `app/api/settings/route.ts:1-73`

- [ ] **Step 1: Update GET default response to include manualVerificationEnabled: false**

Find line 24:
```typescript
return NextResponse.json({ sources: ['shopee', 'tokopedia', 'traveloka', 'bca', 'ayo'], scanPeriodDays: 30, billingStartDay: 1 });
```

Replace with:
```typescript
return NextResponse.json({ sources: ['shopee', 'tokopedia', 'traveloka', 'bca', 'ayo'], scanPeriodDays: 30, billingStartDay: 1, manualVerificationEnabled: false });
```

- [ ] **Step 2: Update PUT to handle manualVerificationEnabled**

Find line 42:
```typescript
const { sources, scanPeriodDays, billingStartDay } = body;
```

Replace with:
```typescript
const { sources, scanPeriodDays, billingStartDay, manualVerificationEnabled } = body;
```

- [ ] **Step 3: Add validation for manualVerificationEnabled and track old value**

Find lines 53-57:
```typescript
if (billingStartDay !== undefined) {
  if (typeof billingStartDay !== 'number' || billingStartDay < 1 || billingStartDay > 28) {
    return NextResponse.json({ error: 'billingStartDay must be a number between 1 and 28' }, { status: 400 });
  }
}
```

Add after that block:
```typescript
if (manualVerificationEnabled !== undefined && typeof manualVerificationEnabled !== 'boolean') {
  return NextResponse.json({ error: 'manualVerificationEnabled must be a boolean' }, { status: 400 });
}
```

- [ ] **Step 4: Add auto-approve logic when manualVerificationEnabled is set to false**

Find lines 59-62:
```typescript
const updates: Record<string, unknown> = {};
if (sources !== undefined) updates.sources = sources;
if (scanPeriodDays !== undefined) updates.scanPeriodDays = scanPeriodDays;
if (billingStartDay !== undefined) updates.billingStartDay = billingStartDay;
```

Replace with:
```typescript
const updates: Record<string, unknown> = {};
if (sources !== undefined) updates.sources = sources;
if (scanPeriodDays !== undefined) updates.scanPeriodDays = scanPeriodDays;
if (billingStartDay !== undefined) updates.billingStartDay = billingStartDay;
if (manualVerificationEnabled !== undefined) updates.manualVerificationEnabled = manualVerificationEnabled;

if (manualVerificationEnabled === false) {
  const pendingSnap = await db.collection('users').doc(userId).collection('pendingTransactions').get();
  if (!pendingSnap.empty) {
    const batch = db.batch();
    const txRef = db.collection('users').doc(userId).collection('transactions');
    let approvedCount = 0;
    
    for (const pendingDoc of pendingSnap.docs) {
      const data = pendingDoc.data();
      const newTxRef = txRef.doc();
      batch.set(newTxRef, {
        merchant: data.merchant,
        amount: data.amount,
        date: new Date(data.date),
        categories: data.categories,
        source: data.source,
        userId,
        createdAt: new Date(),
        messageId: data.messageId,
      });
      batch.delete(pendingDoc.ref);
      approvedCount++;
    }
    await batch.commit();
    console.log(`Auto-approved ${approvedCount} pending transactions`);
  }
}
```

- [ ] **Step 5: Commit**

```bash
git add app/api/settings/route.ts
git commit -m "feat: add manualVerificationEnabled setting with auto-approve on disable"
```

---

## Task 3: Update Scan API - Route to Pending or Transactions

**Files:**
- Modify: `app/api/emails/scan/route.ts:1-165`

- [ ] **Step 1: Import getDb and get settings at start of try block**

Find line 47:
```typescript
try {
  const auth = createGmailClient(accessToken);
  const emails = await fetchTransactionEmails(auth);
```

Replace with:
```typescript
try {
  const db = getDb();
  const settingsSnap = await db.collection('users').doc(userId).collection('settings').doc('preferences').get();
  const manualVerificationEnabled = settingsSnap.data()?.manualVerificationEnabled ?? false;
  
  const auth = createGmailClient(accessToken);
  const emails = await fetchTransactionEmails(auth);
```

- [ ] **Step 2: Update the saving logic - check manualVerificationEnabled**

Find lines 120-140:
```typescript
const txRef = db.collection('users').doc(userId).collection('transactions');
    
const BATCH_SIZE = 500;
const txIds: string[] = [];
for (let i = 0; i < newTransactions.length; i += BATCH_SIZE) {
  const chunk = newTransactions.slice(i, i + BATCH_SIZE);
  const batch = db.batch();
  chunk.forEach((tx) => {
    const docRef = txRef.doc();
    txIds.push(docRef.id);
    batch.set(docRef, tx);
  });
  await batch.commit();
}
```

Replace with:
```typescript
const BATCH_SIZE = 500;
const txIds: string[] = [];

if (manualVerificationEnabled) {
  const pendingRef = db.collection('users').doc(userId).collection('pendingTransactions');
  for (let i = 0; i < newTransactions.length; i += BATCH_SIZE) {
    const chunk = newTransactions.slice(i, i + BATCH_SIZE);
    const batch = db.batch();
    chunk.forEach((tx) => {
      const docRef = pendingRef.doc();
      txIds.push(docRef.id);
      batch.set(docRef, tx);
    });
    await batch.commit();
  }
} else {
  const txRef = db.collection('users').doc(userId).collection('transactions');
  for (let i = 0; i < newTransactions.length; i += BATCH_SIZE) {
    const chunk = newTransactions.slice(i, i + BATCH_SIZE);
    const batch = db.batch();
    chunk.forEach((tx) => {
      const docRef = txRef.doc();
      txIds.push(docRef.id);
      batch.set(docRef, tx);
    });
    await batch.commit();
  }
}
```

- [ ] **Step 3: Remove duplicate db declaration earlier in file**

Find line 81:
```typescript
const db = getDb();
```

Remove this line since we moved it earlier in the try block.

- [ ] **Step 4: Commit**

```bash
git add app/api/emails/scan/route.ts
git commit -m "feat: route scanned transactions to pending if manual verification enabled"
```

---

## Task 4: Create Pending API - GET, POST approve/reject

**Files:**
- Create: `app/api/pending/route.ts`

- [ ] **Step 1: Create the API file**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/firestore';

async function getUserId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;
  return session.user.email as string;
}

export async function GET() {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const db = getDb();
    const snap = await db
      .collection('users')
      .doc(userId)
      .collection('pendingTransactions')
      .orderBy('createdAt', 'desc')
      .get();

    const pendingTransactions = snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({ pendingTransactions });
  } catch (error) {
    console.error('GET /api/pending error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { action, id } = body;

    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'action must be approve or reject' }, { status: 400 });
    }
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const db = getDb();
    const pendingRef = db.collection('users').doc(userId).collection('pendingTransactions').doc(id);
    const pendingSnap = await pendingRef.get();

    if (!pendingSnap.exists) {
      return NextResponse.json({ error: 'pending transaction not found' }, { status: 404 });
    }

    const data = pendingSnap.data();

    if (action === 'approve') {
      const txRef = db.collection('users').doc(userId).collection('transactions').doc();
      await txRef.set({
        merchant: data!.merchant,
        amount: data!.amount,
        date: new Date(data!.date),
        categories: data!.categories,
        source: data!.source,
        userId,
        createdAt: new Date(),
        messageId: data!.messageId,
      });
      await pendingRef.delete();
      return NextResponse.json({ success: true, transactionId: txRef.id });
    } else {
      await pendingRef.delete();
      return NextResponse.json({ success: true });
    }
  } catch (error) {
    console.error('POST /api/pending error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/pending/route.ts
git commit -m "feat: add pending transactions API - GET list, POST approve/reject"
```

---

## Task 5: Create Pending API - PATCH single pending

**Files:**
- Create: `app/api/pending/[id]/route.ts`

- [ ] **Step 1: Create the API file**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/firestore';

async function getUserId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;
  return session.user.email as string;
}

export async function PATCH(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const body = await req.json();
    const { merchant, amount, date, categories } = body;

    const updates: Record<string, unknown> = {};
    if (typeof merchant === 'string' && merchant.trim().length > 0) {
      updates.merchant = merchant.trim();
    }
    if (typeof amount === 'number' && !isNaN(amount) && amount > 0) {
      updates.amount = amount;
    }
    if (date !== undefined) {
      const parsedDate = new Date(date);
      if (isNaN(parsedDate.getTime())) {
        return NextResponse.json({ error: 'invalid date' }, { status: 400 });
      }
      updates.date = parsedDate.toISOString();
    }
    if (categories !== undefined) {
      if (!Array.isArray(categories) || !categories.every(c => typeof c === 'string')) {
        return NextResponse.json({ error: 'categories must be array of strings' }, { status: 400 });
      }
      updates.categories = categories;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'no valid fields to update' }, { status: 400 });
    }

    const db = getDb();
    const docRef = db.collection('users').doc(userId).collection('pendingTransactions').doc(id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return NextResponse.json({ error: 'pending transaction not found' }, { status: 404 });
    }

    await docRef.update(updates);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('PATCH /api/pending/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/pending/[id]/route.ts
git commit -m "feat: add PATCH endpoint for pending transaction edits"
```

---

## Task 6: Update Settings Page - Add Toggle UI

**Files:**
- Modify: `app/dashboard/settings/page.tsx:527-570`

- [ ] **Step 1: Add to interface**

Find line 23-27:
```typescript
interface Settings {
  sources: string[];
  scanPeriodDays: number;
  billingStartDay: number;
}
```

Replace with:
```typescript
interface Settings {
  sources: string[];
  scanPeriodDays: number;
  billingStartDay: number;
  manualVerificationEnabled: boolean;
}
```

- [ ] **Step 2: Update default state**

Find line 398:
```typescript
const [settings, setSettings] = useState<Settings>({ sources: ['shopee', 'tokopedia', 'traveloka', 'bca', 'ayo'], scanPeriodDays: 30, billingStartDay: 1 });
```

Replace with:
```typescript
const [settings, setSettings] = useState<Settings>({ sources: ['shopee', 'tokopedia', 'traveloka', 'bca', 'ayo'], scanPeriodDays: 30, billingStartDay: 1, manualVerificationEnabled: false });
```

- [ ] **Step 3: Add toggle component in Scan Settings section after billing start day input**

Find the closing `</div>` after the billing start day input (around line 569), add before the closing `</SettingsSection>`:

```typescript
        <div style={{
          marginTop: 20,
          padding: '16px',
          borderRadius: 12,
          background: 'var(--bg-page)',
          border: '1px solid var(--border)',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                Enable Manual Verification
              </p>
              <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                When enabled, scanned transactions go to pending page for review before adding to history.
              </p>
            </div>
            <button
              onClick={() => saveSettings({ ...settings, manualVerificationEnabled: !settings.manualVerificationEnabled })}
              style={{
                width: 48,
                height: 26,
                borderRadius: 13,
                background: settings.manualVerificationEnabled ? 'var(--accent)' : 'var(--border)',
                border: 'none',
                cursor: 'pointer',
                position: 'relative',
                transition: 'background 0.2s',
                flexShrink: 0,
              }}
            >
              <div style={{
                width: 22,
                height: 22,
                borderRadius: '50%',
                background: '#fff',
                position: 'absolute',
                top: 2,
                left: settings.manualVerificationEnabled ? 24 : 2,
                transition: 'left 0.2s',
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
              }} />
            </button>
          </div>
        </div>
```

- [ ] **Step 4: Commit**

```bash
git add app/dashboard/settings/page.tsx
git commit -m "feat: add manual verification toggle to settings page"
```

---

## Task 7: Create Pending Transactions Page

**Files:**
- Create: `app/dashboard/pending/page.tsx`

- [ ] **Step 1: Create the pending transactions page**

```typescript
'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { PendingTransaction } from '@/types';
import { getCategoryColor } from '@/lib/category-colors';

const fmt = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

const sourceBadge: Record<string, { label: string; color: string; bg: string }> = {
  shopee:    { label: 'Shopee',    color: '#EE4D2D', bg: '#FFF0EE' },
  tokopedia: { label: 'Tokopedia', color: '#03AC0E', bg: '#F0FFF1' },
  traveloka: { label: 'Traveloka', color: '#0064D2', bg: '#EBF4FF' },
  bca:       { label: 'BCA',       color: '#005BAC', bg: '#EBF2FF' },
  ayo:       { label: 'AYO',       color: '#FF6B00', bg: '#FFF4EE' },
};

const CATEGORIES = ['food', 'shopping', 'transport', 'entertainment', 'other'];
const categoryLabel: Record<string, string> = {
  food: 'Food & Drinks', shopping: 'Shopping',
  transport: 'Transport', entertainment: 'Entertainment', other: 'Other',
};

interface EditModalProps {
  transaction: PendingTransaction;
  onClose: () => void;
  onSave: (updated: PendingTransaction) => void;
}

function EditModal({ transaction, onClose, onSave }: EditModalProps) {
  const [merchant, setMerchant] = useState(transaction.merchant);
  const [amount, setAmount] = useState(transaction.amount);
  const [date, setDate] = useState(new Date(transaction.date).toISOString().split('T')[0]);
  const [categories, setCategories] = useState<string[]>(transaction.categories);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/pending?id=${transaction.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ merchant, amount, date, categories }),
      });
      if (res.ok) {
        onSave({ ...transaction, merchant, amount, date: new Date(date).toISOString(), categories });
        onClose();
      }
    } finally {
      setSaving(false);
    }
  }

  function toggleCategory(cat: string) {
    setCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
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
          <h2 style={{ fontSize: 16, fontWeight: 700 }}>Edit Transaction</h2>
        </div>
        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
              Merchant
            </label>
            <input
              type="text"
              value={merchant}
              onChange={(e) => setMerchant(e.target.value)}
              style={{
                width: '100%', padding: '10px 14px', borderRadius: 10,
                border: '1.5px solid var(--border)', background: 'var(--bg-page)',
                fontSize: 13, color: 'var(--text-primary)', outline: 'none',
              }}
            />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
              Amount (Rp)
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              style={{
                width: '100%', padding: '10px 14px', borderRadius: 10,
                border: '1.5px solid var(--border)', background: 'var(--bg-page)',
                fontSize: 13, color: 'var(--text-primary)', outline: 'none',
              }}
            />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
              Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              style={{
                width: '100%', padding: '10px 14px', borderRadius: 10,
                border: '1.5px solid var(--border)', background: 'var(--bg-page)',
                fontSize: 13, color: 'var(--text-primary)', outline: 'none',
              }}
            />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
              Categories
            </label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => toggleCategory(cat)}
                  style={{
                    padding: '6px 12px', borderRadius: 999, border: '1.5px solid',
                    borderColor: categories.includes(cat) ? getCategoryColor(cat) : 'var(--border)',
                    background: categories.includes(cat) ? `${getCategoryColor(cat)}20` : 'transparent',
                    color: categories.includes(cat) ? getCategoryColor(cat) : 'var(--text-secondary)',
                    fontSize: 12, fontWeight: 500, cursor: 'pointer',
                  }}
                >
                  {categoryLabel[cat]}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <button
            onClick={onClose}
            className="btn btn-ghost"
            style={{ fontSize: 13 }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn btn-primary"
            style={{ fontSize: 13, opacity: saving ? 0.7 : 1 }}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PendingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [pending, setPending] = useState<PendingTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTx, setEditingTx] = useState<PendingTransaction | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/signin');
  }, [status, router]);

  useEffect(() => {
    if (session?.user) {
      fetch('/api/pending')
        .then((res) => res.json())
        .then((data) => {
          setPending(data.pendingTransactions || []);
          setLoading(false);
        });
    }
  }, [session]);

  async function handleApprove(id: string) {
    const res = await fetch('/api/pending', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'approve', id }),
    });
    if (res.ok) {
      setPending((prev) => prev.filter((t) => t.id !== id));
    }
  }

  async function handleReject(id: string) {
    if (!confirm('Reject this transaction? It will be permanently deleted.')) return;
    const res = await fetch('/api/pending', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reject', id }),
    });
    if (res.ok) {
      setPending((prev) => prev.filter((t) => t.id !== id));
    }
  }

  if (status === 'loading' || loading) {
    return (
      <main style={{ padding: '32px' }}>
        <div className="skeleton" style={{ height: 36, width: 220, marginBottom: 24 }} />
        <div className="card">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton" style={{ height: 44, marginBottom: 10 }} />
          ))}
        </div>
      </main>
    );
  }

  return (
    <main style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.5px' }}>
          Pending Transactions
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
          Review and confirm transactions before they appear in your history.
        </p>
      </div>

      {pending.length === 0 ? (
        <div className="card" style={{ padding: 48, textAlign: 'center' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
            No pending transactions. When you scan emails, new transactions will appear here for review.
          </p>
        </div>
      ) : (
        <div className="card fade-up" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Merchant</th>
                <th>Source</th>
                <th>Category</th>
                <th style={{ textAlign: 'right' }}>Amount</th>
                <th style={{ width: 120 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pending.map((tx) => {
                const badge = sourceBadge[tx.source] ?? { label: tx.source, color: '#6B7280', bg: '#F3F4F6' };
                return (
                  <tr key={tx.id}>
                    <td style={{ color: 'var(--text-muted)', fontSize: 12, whiteSpace: 'nowrap' }}>
                      {new Date(tx.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td style={{ fontWeight: 500, fontSize: 13 }}>{tx.merchant}</td>
                    <td>
                      <span style={{
                        display: 'inline-block', padding: '3px 10px', borderRadius: 999,
                        fontSize: 11, fontWeight: 600, background: badge.bg, color: badge.color,
                      }}>
                        {badge.label}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {tx.categories.map((cat) => (
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
                    <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--danger)', fontSize: 13 }}>
                      -{fmt(tx.amount)}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button
                          onClick={() => handleApprove(tx.id)}
                          title="Approve"
                          style={{
                            width: 32, height: 32, borderRadius: 8, border: 'none',
                            background: '#10B981', color: '#fff', cursor: 'pointer',
                            fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}
                        >
                          ✓
                        </button>
                        <button
                          onClick={() => setEditingTx(tx)}
                          title="Edit"
                          style={{
                            width: 32, height: 32, borderRadius: 8, border: '1px solid var(--border)',
                            background: 'var(--bg-surface)', color: 'var(--text-secondary)', cursor: 'pointer',
                            fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}
                        >
                          ✎
                        </button>
                        <button
                          onClick={() => handleReject(tx.id)}
                          title="Reject"
                          style={{
                            width: 32, height: 32, borderRadius: 8, border: 'none',
                            background: 'var(--danger)', color: '#fff', cursor: 'pointer',
                            fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}
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
      )}

      {editingTx && (
        <EditModal
          transaction={editingTx}
          onClose={() => setEditingTx(null)}
          onSave={(updated) => {
            setPending((prev) => prev.map((t) => t.id === updated.id ? updated : t));
          }}
        />
      )}
    </main>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/dashboard/pending/page.tsx
git commit -m "feat: add pending transactions review page"
```

---

## Task 8: Update Sidebar - Add Pending Link

**Files:**
- Modify: `components/dashboard/Sidebar.tsx`

- [ ] **Step 1: Read the sidebar file first**

Check the sidebar component structure to understand where to add the pending link.

- [ ] **Step 2: Add Pending Transactions to nav items**

Add a new nav item for pending transactions. The exact location depends on your sidebar structure - typically it would be added after History link.

```typescript
{ name: 'Pending', href: '/dashboard/pending', icon: '⏳' }
```

- [ ] **Step 3: Commit**

```bash
git add components/dashboard/Sidebar.tsx
git commit -m "feat: add pending transactions link to sidebar"
```

---

## Verification

- [ ] Run `npm run lint` to verify no linting errors
- [ ] Run `npm run build` to verify TypeScript compilation