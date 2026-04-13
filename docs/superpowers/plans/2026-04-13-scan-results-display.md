# Scan Results Display Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** After clicking "Scan Now", display both raw emails found and parsed transactions inline in the Settings page.

**Architecture:** Modify `POST /api/emails/scan` to return full email/transaction data. Update Settings page to display results in expandable sections with summary stats.

**Tech Stack:** Next.js App Router, React state, existing CSS custom properties.

---

## File Structure

```
app/api/emails/scan/route.ts        — Modify: return emails + transactions in response
app/dashboard/settings/page.tsx      — Modify: add scan results display state and UI
```

---

## Task 1: Update /api/emails/scan to Return Full Results

**Files:**
- Modify: `app/api/emails/scan/route.ts`

- [ ] **Step 1: Update the scan API response**

Replace the current POST handler to return detailed results:

```typescript
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const accessToken = (session as unknown as { accessToken: string }).accessToken;
  
  if (!accessToken) {
    return NextResponse.json({ error: 'No access token' }, { status: 400 });
  }

  const auth = createGmailClient(accessToken);
  const emails = await fetchTransactionEmails(auth);

  // Detect source from email 'from' header
  function detectSource(from: string): string {
    const lower = from.toLowerCase();
    if (lower.includes('shopee')) return 'shopee';
    if (lower.includes('tokopedia')) return 'tokopedia';
    if (lower.includes('traveloka')) return 'traveloka';
    if (lower.includes('bca')) return 'bca';
    return 'other';
  }

  const processedEmails = emails.map(email => {
    const source = detectSource(email.from);
    return {
      id: Math.random().toString(36).substr(2, 9), // placeholder - Gmail msg ID would be better
      subject: email.subject,
      from: email.from,
      date: email.date || new Date().toISOString(),
      snippet: email.body,
      source,
    };
  });

  const bySource: Record<string, number> = {};
  const transactions: (Partial<Transaction> & { userId: string; createdAt: Date })[] = [];
  
  for (const email of processedEmails) {
    bySource[email.source] = (bySource[email.source] || 0) + 1;
    const parsed = parseEmail(email);
    if (parsed) {
      transactions.push({
        ...parsed,
        userId,
        createdAt: new Date(),
      });
    }
  }

  const db = getDb();
  const batch = db.batch();
  const txRef = db.collection('users').doc(userId).collection('transactions');
  
  transactions.forEach((tx) => {
    const docRef = txRef.doc();
    batch.set(docRef, tx);
  });
  
  await batch.commit();

  await db.collection('users').doc(userId).set({
    lastScanAt: new Date(),
  }, { merge: true });

  return NextResponse.json({
    scanned: emails.length,
    parsed: transactions.length,
    bySource,
    emails: processedEmails,
    transactions: transactions.map(t => ({
      merchant: t.merchant,
      amount: t.amount,
      date: t.date,
      category: t.category,
      source: t.source,
    })),
  });
}
```

Note: The `email.date` field needs to be extracted from headers in `fetchTransactionEmails`. Check if `lib/gmail.ts` already extracts it — if not, update `lib/gmail.ts` to return `date` in the email object.

- [ ] **Step 2: Check gmail.ts date extraction**

Read `lib/gmail.ts` to see if `date` is already extracted from email headers.

```bash
cat lib/gmail.ts
```

If not present, update `fetchTransactionEmails` to extract date:
```typescript
const date = headers.find((h) => h.name === 'Date')?.value || '';
return { subject, from, body, date };
```

- [ ] **Step 3: Verify changes**

Run: `cat app/api/emails/scan/route.ts`

- [ ] **Step 4: Commit**

```bash
git add app/api/emails/scan/route.ts lib/gmail.ts
git commit -m "feat(scan): return emails and transactions in scan response"
```

---

## Task 2: Update Settings Page with Scan Results Display

**Files:**
- Modify: `app/dashboard/settings/page.tsx`

- [ ] **Step 1: Add scan results state and types**

Add these after the existing state declarations:
```typescript
interface ScanResults {
  scanned: number;
  parsed: number;
  bySource: Record<string, number>;
  emails: Array<{
    id: string;
    subject: string;
    from: string;
    date: string;
    snippet: string;
    source: string;
  }>;
  transactions: Array<{
    merchant: string;
    amount: number;
    date: string;
    category: string;
    source: string;
  }>;
}

const [scanResults, setScanResults] = useState<ScanResults | null>(null);
const [showResults, setShowResults] = useState(false);
const [emailsExpanded, setEmailsExpanded] = useState(true);
const [txExpanded, setTxExpanded] = useState(true);
```

- [ ] **Step 2: Update handleScan to store results**

Replace the handleScan function:
```typescript
async function handleScan() {
  setScanning(true);
  setShowResults(false);
  try {
    const res = await fetch('/api/emails/scan', { method: 'POST' });
    const data = await res.json();
    if (res.ok) {
      setScanResults(data);
      setShowResults(true);
    } else {
      setToast({ message: data.error || 'Scan failed', type: 'error' });
    }
  } catch {
    setToast({ message: 'Scan failed. Try again.', type: 'error' });
  }
  setScanning(false);
}
```

- [ ] **Step 3: Add source badge colors**

Add near the top of the file:
```typescript
const sourceColors: Record<string, { color: string; bg: string }> = {
  shopee:    { color: '#EE4D2D', bg: '#FFF0EE' },
  tokopedia: { color: '#03AC0E', bg: '#F0FFF1' },
  traveloka: { color: '#0064D2', bg: '#EBF4FF' },
  bca:       { color: '#005BAC', bg: '#EBF2FF' },
};
```

- [ ] **Step 4: Add ScanResultsPanel component inside SettingsPage**

Add before the return statement:
```typescript
function SourceBadge({ source }: { source: string }) {
  const colors = sourceColors[source] ?? { color: '#6B7280', bg: '#F3F4F6' };
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: 999,
      fontSize: 10,
      fontWeight: 600,
      background: colors.bg,
      color: colors.color,
    }}>
      {source.charAt(0).toUpperCase() + source.slice(1)}
    </span>
  );
}

function ScanResultsPanel({ results }: { results: ScanResults }) {
  const fmt = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);
  
  return (
    <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Summary */}
      <div style={{
        padding: '16px',
        borderRadius: 12,
        background: 'var(--bg-page)',
        border: '1px solid var(--border)',
      }}>
        <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Scan Complete</p>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Emails found</span>
            <p style={{ fontSize: 20, fontWeight: 700 }}>{results.scanned}</p>
          </div>
          <div>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Parsed</span>
            <p style={{ fontSize: 20, fontWeight: 700 }}>{results.parsed}</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
          {Object.entries(results.bySource).map(([src, count]) => (
            <span key={src} style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
              {src}: {count}
            </span>
          ))}
        </div>
      </div>

      {/* Emails */}
      {results.emails.length > 0 && (
        <div>
          <button
            onClick={() => setEmailsExpanded(!emailsExpanded)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              width: '100%', padding: '10px 0', background: 'none', border: 'none',
              cursor: 'pointer', color: 'var(--text-primary)', fontWeight: 600, fontSize: 13,
            }}
          >
            Emails Found ({results.emails.length})
            <span>{emailsExpanded ? '▲' : '▼'}</span>
          </button>
          {emailsExpanded && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 300, overflowY: 'auto' }}>
              {results.emails.map((email) => (
                <div key={email.id} style={{
                  padding: 12,
                  borderRadius: 10,
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border)',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                    <p style={{ fontSize: 12, fontWeight: 500, flex: 1 }}>{email.subject}</p>
                    <SourceBadge source={email.source} />
                  </div>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{email.from}</p>
                  <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>{email.snippet}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Transactions */}
      {results.transactions.length > 0 && (
        <div>
          <button
            onClick={() => setTxExpanded(!txExpanded)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              width: '100%', padding: '10px 0', background: 'none', border: 'none',
              cursor: 'pointer', color: 'var(--text-primary)', fontWeight: 600, fontSize: 13,
            }}
          >
            Parsed Transactions ({results.transactions.length})
            <span>{txExpanded ? '▲' : '▼'}</span>
          </button>
          {txExpanded && (
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table" style={{ marginTop: 8 }}>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Merchant</th>
                    <th>Source</th>
                    <th>Category</th>
                    <th style={{ textAlign: 'right' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {results.transactions.map((tx, i) => {
                    const badge = sourceColors[tx.source] ?? { color: '#6B7280', bg: '#F3F4F6' };
                    return (
                      <tr key={i}>
                        <td style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                          {new Date(tx.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                        </td>
                        <td style={{ fontSize: 12, fontWeight: 500 }}>{tx.merchant}</td>
                        <td>
                          <span style={{
                            display: 'inline-block', padding: '2px 8px', borderRadius: 999,
                            fontSize: 10, fontWeight: 600, background: badge.bg, color: badge.color,
                          }}>{tx.source}</span>
                        </td>
                        <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                          {tx.category.charAt(0).toUpperCase() + tx.category.slice(1)}
                        </td>
                        <td style={{ textAlign: 'right', fontSize: 12, fontWeight: 600, color: 'var(--danger)' }}>
                          -{fmt(tx.amount)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {results.emails.length === 0 && results.transactions.length === 0 && (
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, padding: 20 }}>
          No transaction emails found. Try adjusting your email sources.
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Update Manual Scan section to show results**

Find the Manual Scan section and update it:
```typescript
<SettingsSection
  title="Manual Scan"
  description="Manually trigger email scanning"
>
  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
    <button
      className="btn btn-primary"
      onClick={handleScan}
      disabled={scanning}
      style={{ opacity: scanning ? 0.7 : 1 }}
    >
      {scanning ? 'Scanning…' : 'Scan Now'}
    </button>
    {showResults && scanResults && <ScanResultsPanel results={scanResults} />}
  </div>
  {showResults && scanResults && <ScanResultsPanel results={scanResults} />}
</SettingsSection>
```

Wait — `ScanResultsPanel` should be rendered ONCE. Fix: remove the duplicate and keep only one.

Actually update the Manual Scan section like this:
```typescript
<SettingsSection
  title="Manual Scan"
  description="Manually trigger email scanning"
>
  <button
    className="btn btn-primary"
    onClick={handleScan}
    disabled={scanning}
    style={{ opacity: scanning ? 0.7 : 1, alignSelf: 'flex-start' }}
  >
    {scanning ? 'Scanning…' : 'Scan Now'}
  </button>
  {scanning && <div className="skeleton" style={{ height: 100, marginTop: 16 }} />}
  {!scanning && showResults && scanResults && (
    <ScanResultsPanel results={scanResults} />
  )}
</SettingsSection>
```

- [ ] **Step 6: Verify the changes compile**

Run: `npm run build` or at least type-check

- [ ] **Step 7: Commit**

```bash
git add app/dashboard/settings/page.tsx lib/gmail.ts
git commit -m "feat(settings): display scan results with emails and transactions"
```

---

## Self-Review Checklist

1. **Spec coverage:**
   - Scan Summary (total, parsed, bySource) ✓
   - Emails Found (subject, from, snippet, source badge) ✓
   - Parsed Transactions (table with merchant, amount, date, category, source) ✓
   - Collapsible sections ✓
   - Loading skeleton ✓
   - Empty state ✓

2. **Placeholder scan:** No TBD/TODO found.

3. **Type consistency:**
   - `scanResults.emails[].source` is `string` — matches API
   - `scanResults.transactions[].amount` is `number` — matches API
   - `fmt` currency formatter uses `id-ID` locale — matches existing dashboard pattern

---

**Plan complete and saved to `docs/superpowers/plans/2026-04-13-scan-results-display.md`.**

Two execution options:

1. **Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration
2. **Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?