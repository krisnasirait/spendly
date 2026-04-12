# Spendly MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Spendly MVP — a Gen-Z friendly spending self-awareness tool that scans emails and surfaces reality-check insights.

**Architecture:** Next.js 16 App Router with TypeScript. NextAuth.js for Google OAuth. Firestore for data storage. Gmail API for email scanning. Tailwind CSS 4 for styling. Three-tab dashboard (Overview / Categories / History) with bottom navigation.

**Tech Stack:** Next.js 16, TypeScript, Tailwind CSS 4, NextAuth.js (Google provider), Firebase Firestore, Gmail API, Recharts.

---

## File Structure

```
spendly/
├── app/
│   ├── api/
│   │   ├── auth/[...nextauth]/route.ts      # NextAuth handler
│   │   ├── emails/scan/route.ts             # Trigger email scan
│   │   └── transactions/route.ts             # CRUD transactions
│   ├── dashboard/
│   │   └── page.tsx                         # Protected dashboard page
│   ├── loading/
│   │   └── page.tsx                         # Scan loading screen
│   ├── auth/
│   │   └── signin/page.tsx                  # Auth page (redirects immediately)
│   ├── layout.tsx                           # Root layout with providers
│   ├── page.tsx                             # Landing → redirect to /dashboard
│   └── globals.css
├── components/
│   ├── ui/
│   │   ├── Card.tsx
│   │   ├── BottomNav.tsx
│   │   └── InsightCard.tsx
│   ├── charts/
│   │   └── CategoryPie.tsx
│   └── dashboard/
│       ├── HeroStat.tsx
│       ├── TransactionList.tsx
│       └── CategoryBreakdown.tsx
├── lib/
│   ├── auth.ts                              # NextAuth config
│   ├── gmail.ts                            # Gmail API client
│   ├── firestore.ts                        # Firestore client
│   └── parsers/
│       ├── shopee.ts
│       ├── tokopedia.ts
│       └── traveloka.ts
├── types/
│   └── index.ts                            # TypeScript types
└── package.json
```

---

## Task 1: Project Setup — Dependencies

**Files:**
- Modify: `package.json`
- Create: `.env.local.example`

- [ ] **Step 1: Install core dependencies**

Run: `npm install next-auth firebase googleapis recharts`
Expected: No errors

- [ ] **Step 2: Install dev dependencies**

Run: `npm install --save-dev @types/google-api-nodejs`
Expected: No errors

- [ ] **Step 3: Create .env.local.example with required keys**

```
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_CLIENT_EMAIL=your_firebase_client_email
FIREBASE_PRIVATE_KEY=your_firebase_private_key
```

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json .env.local.example
git commit -m "feat: add core dependencies (next-auth, firebase, googleapis, recharts)"
```

---

## Task 2: TypeScript Types

**Files:**
- Create: `types/index.ts`

- [ ] **Step 1: Write types**

```typescript
export interface Transaction {
  id: string;
  userId: string;
  amount: number;
  merchant: string;
  date: Date;
  category: Category;
  source: 'shopee' | 'tokopedia' | 'traveloka';
  createdAt: Date;
}

export type Category = 'food' | 'shopping' | 'transport' | 'entertainment' | 'other';

export interface Insight {
  id: string;
  userId: string;
  type: 'spike' | 'trend' | 'category_overload' | 'pattern' | 'encouragement';
  text: string;
  severity: 'high' | 'medium' | 'low';
  createdAt: Date;
  expiresAt: Date;
}

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
  lastScanAt: Date | null;
}
```

- [ ] **Step 2: Commit**

```bash
git add types/index.ts
git commit -m "feat: add TypeScript types for Transaction, Insight, User"
```

---

## Task 3: NextAuth Configuration

**Files:**
- Create: `lib/auth.ts`
- Modify: `app/layout.tsx`
- Create: `app/api/auth/[...nextauth]/route.ts`

- [ ] **Step 1: Write NextAuth config**

```typescript
import NextAuth, { type NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async session({ session, token }) {
      if (session.user && token.sub) {
        (session.user as { id: string }).id = token.sub;
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
      }
      return token;
    },
  },
};
```

- [ ] **Step 2: Write NextAuth API route**

```typescript
import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth';

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
```

- [ ] **Step 3: Update root layout to wrap with SessionProvider**

```typescript
'use client';

import { SessionProvider } from 'next-auth/react';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add lib/auth.ts app/api/auth/[...nextauth]/route.ts app/layout.tsx
git commit -m "feat: add NextAuth with Google OAuth provider"
```

---

## Task 4: Firestore Client

**Files:**
- Create: `lib/firestore.ts`

- [ ] **Step 1: Write Firestore client**

```typescript
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const app = !getApps().length
  ? initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    })
  : getApps()[0];

export const db = getFirestore(app);
```

- [ ] **Step 2: Commit**

```bash
git add lib/firestore.ts
git commit -m "feat: add Firestore client initialization"
```

---

## Task 5: Email Parsers (Structured Templates)

**Files:**
- Create: `lib/parsers/shopee.ts`
- Create: `lib/parsers/tokopedia.ts`
- Create: `lib/parsers/traveloka.ts`
- Create: `lib/parsers/index.ts`

- [ ] **Step 1: Write Shopee parser**

```typescript
import { Category, Transaction } from '@/types';

interface ShopeeEmail {
  subject: string;
  body: string;
  from: string;
}

export function parseShopeeEmail(email: ShopeeEmail): Partial<Transaction> | null {
  const amountMatch = email.body.match(/Rp[\s]?([\d,\.]+)/);
  const merchantMatch = email.body.match(/Toko:\s*(.+)/);
  const dateMatch = email.body.match(/(\d{1,2}\s+\w+\s+\d{4})/);

  if (!amountMatch) return null;

  return {
    amount: parseInt(amountMatch[1].replace(/[,\.]/g, ''), 10),
    merchant: merchantMatch ? merchantMatch[1].trim() : 'Shopee',
    date: dateMatch ? new Date(dateMatch[1]) : new Date(),
    category: 'shopping' as Category,
    source: 'shopee',
  };
}
```

- [ ] **Step 2: Write Tokopedia parser** (similar pattern)

```typescript
import { Category, Transaction } from '@/types';

interface TokopediaEmail {
  subject: string;
  body: string;
  from: string;
}

export function parseTokopediaEmail(email: TokopediaEmail): Partial<Transaction> | null {
  const amountMatch = email.body.match(/Rp[\s]?([\d,\.]+)/);
  const merchantMatch = email.body.match(/Penjual:\s*(.+)/);
  const dateMatch = email.body.match(/(\d{1,2}\s+\w+\s+\d{4})/);

  if (!amountMatch) return null;

  return {
    amount: parseInt(amountMatch[1].replace(/[,\.]/g, ''), 10),
    merchant: merchantMatch ? merchantMatch[1].trim() : 'Tokopedia',
    date: dateMatch ? new Date(dateMatch[1]) : new Date(),
    category: 'shopping' as Category,
    source: 'tokopedia',
  };
}
```

- [ ] **Step 3: Write Traveloka parser**

```typescript
import { Category, Transaction } from '@/types';

interface TravelokaEmail {
  subject: string;
  body: string;
  from: string;
}

export function parseTravelokaEmail(email: TravelokaEmail): Partial<Transaction> | null {
  const amountMatch = email.body.match(/Rp[\s]?([\d,\.]+)/);
  const merchantMatch = email.subject.match(/(Flight|Hotel|Activity)/);
  const dateMatch = email.body.match(/(\d{1,2}\s+\w+\s+\d{4})/);

  if (!amountMatch) return null;

  const category: Category = email.subject.toLowerCase().includes('hotel') 
    ? 'food' 
    : email.subject.toLowerCase().includes('flight')
    ? 'transport'
    : 'other';

  return {
    amount: parseInt(amountMatch[1].replace(/[,\.]/g, ''), 10),
    merchant: merchantMatch ? `Traveloka - ${merchantMatch[1]}` : 'Traveloka',
    date: dateMatch ? new Date(dateMatch[1]) : new Date(),
    category,
    source: 'traveloka',
  };
}
```

- [ ] **Step 4: Write parser index**

```typescript
import { parseShopeeEmail } from './shopee';
import { parseTokopediaEmail } from './tokopedia';
import { parseTravelokaEmail } from './traveloka';
import { Transaction } from '@/types';

export interface ParsedEmail {
  amount: number;
  merchant: string;
  date: Date;
  category: Transaction['category'];
  source: Transaction['source'];
}

export function parseEmail(email: { subject: string; body: string; from: string }): ParsedEmail | null {
  const from = email.from.toLowerCase();
  
  if (from.includes('shopee')) {
    return parseShopeeEmail(email) as ParsedEmail | null;
  }
  if (from.includes('tokopedia')) {
    return parseTokopediaEmail(email) as ParsedEmail | null;
  }
  if (from.includes('traveloka')) {
    return parseTravelokaEmail(email) as ParsedEmail | null;
  }
  
  return null;
}
```

- [ ] **Step 5: Commit**

```bash
git add lib/parsers/shopee.ts lib/parsers/tokopedia.ts lib/parsers/traveloka.ts lib/parsers/index.ts
git commit -m "feat: add email parsers for Shopee, Tokopedia, Traveloka"
```

---

## Task 6: Gmail API Client

**Files:**
- Create: `lib/gmail.ts`

- [ ] **Step 1: Write Gmail client**

```typescript
import { google, Auth } from 'googleapis';

export function createGmailClient(accessToken: string): Auth.OAuth2Client {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.NEXTAUTH_URL
  );
  oauth2Client.setCredentials({ access_token: accessToken });
  return oauth2Client;
}

export async function fetchTransactionEmails(auth: Auth.OAuth2Client) {
  const gmail = google.gmail({ version: 'v1', auth });
  
  const query = 'from:shopee OR from:tokopedia OR from:traveloka newer_than:30d';
  
  const response = await gmail.users.messages.list({
    userId: 'me',
    q: query,
    maxResults: 50,
  });

  const messages = response.data.messages || [];
  
  const emails = await Promise.all(
    messages.map(async (msg) => {
      const data = await gmail.users.messages.get({
        userId: 'me',
        id: msg.id!,
        format: 'full',
      });
      
      const headers = data.data.payload?.headers || [];
      const subject = headers.find((h) => h.name === 'Subject')?.value || '';
      const from = headers.find((h) => h.name === 'From')?.value || '';
      const body = data.data.snippet || '';
      
      return { subject, from, body };
    })
  );

  return emails;
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/gmail.ts
git commit -m "feat: add Gmail API client for fetching transaction emails"
```

---

## Task 7: UI Components — Card, BottomNav, InsightCard

**Files:**
- Create: `components/ui/Card.tsx`
- Create: `components/ui/BottomNav.tsx`
- Create: `components/ui/InsightCard.tsx`

- [ ] **Step 1: Write Card component**

```typescript
import { type ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  accent?: 'warning' | 'default';
}

export function Card({ children, className = '', accent = 'default' }: CardProps) {
  const accentStyles = accent === 'warning' 
    ? 'border-l-4 border-l-[#ff6b6b]' 
    : '';
  
  return (
    <div className={`bg-white rounded-xl shadow-sm p-6 ${accentStyles} ${className}`}>
      {children}
    </div>
  );
}
```

- [ ] **Step 2: Write BottomNav component**

```typescript
'use client';

import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/dashboard', label: 'Overview', emoji: '🏠' },
  { href: '/dashboard/categories', label: 'Categories', emoji: '📊' },
  { href: '/dashboard/history', label: 'History', emoji: '📜' },
];

export function BottomNav() {
  const pathname = usePathname();
  
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-2">
      <div className="flex justify-around max-w-md mx-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <a
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center py-2 px-4 rounded-lg transition-colors ${
                isActive ? 'text-indigo-600' : 'text-gray-400'
              }`}
            >
              <span className="text-xl">{item.emoji}</span>
              <span className="text-xs mt-1 font-medium">{item.label}</span>
            </a>
          );
        })}
      </div>
    </nav>
  );
}
```

- [ ] **Step 3: Write InsightCard component**

```typescript
import { Card } from './Card';
import type { Insight } from '@/types';

interface InsightCardProps {
  insight: Insight;
}

const emojiMap: Record<Insight['type'], string> = {
  spike: '🚨',
  trend: '📈',
  category_overload: '🍔',
  pattern: '🔍',
  encouragement: '✨',
};

export function InsightCard({ insight }: InsightCardProps) {
  const emoji = emojiMap[insight.type];
  
  return (
    <Card accent="warning" className="mb-4">
      <div className="flex items-start gap-3">
        <span className="text-2xl">{emoji}</span>
        <div>
          <p className="text-gray-900 font-medium leading-relaxed">{insight.text}</p>
          <p className="text-xs text-gray-400 mt-2">
            {insight.createdAt.toLocaleDateString('id-ID', { 
              day: 'numeric', 
              month: 'short' 
            })}
          </p>
        </div>
      </div>
    </Card>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add components/ui/Card.tsx components/ui/BottomNav.tsx components/ui/InsightCard.tsx
git commit -m "feat: add UI components (Card, BottomNav, InsightCard)"
```

---

## Task 8: Dashboard Components

**Files:**
- Create: `components/dashboard/HeroStat.tsx`
- Create: `components/dashboard/TransactionList.tsx`
- Create: `components/dashboard/CategoryBreakdown.tsx`
- Create: `components/charts/CategoryPie.tsx`

- [ ] **Step 1: Write HeroStat component**

```typescript
import { Card } from '@/components/ui/Card';

interface HeroStatProps {
  amount: number;
  month: string;
}

export function HeroStat({ amount, month }: HeroStatProps) {
  const formatted = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount);

  return (
    <Card className="text-center mb-6">
      <p className="text-5xl font-bold text-gray-900 tracking-tight">
        {formatted}
      </p>
      <p className="text-gray-500 mt-2">Spent this {month}</p>
    </Card>
  );
}
```

- [ ] **Step 2: Write CategoryPie component**

```typescript
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import type { Category } from '@/types';

interface CategoryData {
  category: Category;
  amount: number;
  emoji: string;
}

const colorMap: Record<Category, string> = {
  food: '#fde68a',
  shopping: '#fbcfe8',
  transport: '#bae6fd',
  entertainment: '#d9f99d',
  other: '#e5e5e5',
};

const emojiMap: Record<Category, string> = {
  food: '🍔',
  shopping: '🛍️',
  transport: '🚗',
  entertainment: '🎮',
  other: '📦',
};

interface CategoryPieProps {
  data: CategoryData[];
}

export function CategoryPie({ data }: CategoryPieProps) {
  const chartData = data.map((item) => ({
    name: `${emojiMap[item.category]} ${item.category}`,
    value: item.amount,
    fill: colorMap[item.category],
  }));

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={90}
            paddingAngle={2}
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number) =>
              new Intl.NumberFormat('id-ID', {
                style: 'currency',
                currency: 'IDR',
                minimumFractionDigits: 0,
              }).format(value)
            }
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
```

- [ ] **Step 3: Write CategoryBreakdown component**

```typescript
import { Card } from '@/components/ui/Card';
import { CategoryPie } from '@/components/charts/CategoryPie';
import type { Category } from '@/types';

interface CategoryBreakdownProps {
  categories: { category: Category; amount: number }[];
}

const emojiMap: Record<Category, string> = {
  food: '🍔',
  shopping: '🛍️',
  transport: '🚗',
  entertainment: '🎮',
  other: '📦',
};

export function CategoryBreakdown({ categories }: CategoryBreakdownProps) {
  return (
    <div className="space-y-4">
      <CategoryPie data={categories} />
      <div className="space-y-3">
        {categories.map(({ category, amount }) => {
          const formatted = new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
          }).format(amount);
          
          return (
            <Card key={category} className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <span className="text-xl">{emojiMap[category]}</span>
                <span className="font-medium capitalize">{category}</span>
              </div>
              <span className="font-semibold text-gray-900">{formatted}</span>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Write TransactionList component**

```typescript
import { Card } from '@/components/ui/Card';
import type { Transaction } from '@/types';

interface TransactionListProps {
  transactions: Transaction[];
}

const emojiMap: Record<string, string> = {
  shopee: '🛒',
  tokopedia: '🏪',
  traveloka: '✈️',
};

function formatDate(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return 'This Week';
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}

export function TransactionList({ transactions }: TransactionListProps) {
  const grouped = transactions.reduce((acc, tx) => {
    const key = formatDate(tx.date);
    if (!acc[key]) acc[key] = [];
    acc[key].push(tx);
    return acc;
  }, {} as Record<string, Transaction[]>);

  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([label, txs]) => (
        <div key={label}>
          <h3 className="text-sm font-semibold text-gray-400 uppercase mb-3">{label}</h3>
          <div className="space-y-2">
            {txs.map((tx) => {
              const formatted = new Intl.NumberFormat('id-ID', {
                style: 'currency',
                currency: 'IDR',
                minimumFractionDigits: 0,
              }).format(tx.amount);
              
              return (
                <Card key={tx.id} className="flex items-center justify-between py-4">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{emojiMap[tx.source] || '📦'}</span>
                    <div>
                      <p className="font-medium text-gray-900">{tx.merchant}</p>
                      <p className="text-sm text-gray-400">{tx.date.toLocaleDateString('id-ID')}</p>
                    </div>
                  </div>
                  <span className="font-semibold text-gray-900">{formatted}</span>
                </Card>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add components/dashboard/HeroStat.tsx components/dashboard/TransactionList.tsx components/dashboard/CategoryBreakdown.tsx components/charts/CategoryPie.tsx
git commit -m "feat: add dashboard components (HeroStat, TransactionList, CategoryBreakdown, CategoryPie)"
```

---

## Task 9: Loading Screen

**Files:**
- Create: `app/loading/page.tsx`

- [ ] **Step 1: Write loading screen**

```typescript
export default function Loading() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-indigo-50 to-white flex flex-col items-center justify-center px-4">
      <div className="text-center">
        <div className="relative w-24 h-24 mx-auto mb-8">
          <div className="absolute inset-0 border-4 border-indigo-200 rounded-full animate-ping opacity-25"></div>
          <div className="absolute inset-0 border-4 border-indigo-600 rounded-full animate-pulse"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-3xl">📧</span>
          </div>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Ngintip email lo...
        </h1>
        <p className="text-gray-500">Sabar ya, bentar lagi keliatan 😂</p>
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/loading/page.tsx
git commit -m "feat: add loading screen with cheeky copy"
```

---

## Task 10: Auth Signin Page

**Files:**
- Create: `app/auth/signin/page.tsx`

- [ ] **Step 1: Write signin page**

```typescript
'use client';

import { signIn } from 'next-auth/react';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SignIn() {
  const router = useRouter();

  useEffect(() => {
    signIn('google', { callbackUrl: '/dashboard' });
  }, [router]);

  return (
    <main className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-500">Redirecting to Google...</p>
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/auth/signin/page.tsx
git commit -m "feat: add immediate redirect signin page"
```

---

## Task 11: Dashboard Pages (3 tabs)

**Files:**
- Modify: `app/dashboard/page.tsx`
- Create: `app/dashboard/categories/page.tsx`
- Create: `app/dashboard/history/page.tsx`
- Create: `app/dashboard/layout.tsx`

- [ ] **Step 1: Write dashboard layout (wraps all tabs with BottomNav)**

```typescript
import { BottomNav } from '@/components/ui/BottomNav';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#fafafa] pb-20">
      {children}
      <BottomNav />
    </div>
  );
}
```

- [ ] **Step 2: Write Overview page**

```typescript
'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { HeroStat } from '@/components/dashboard/HeroStat';
import { InsightCard } from '@/components/ui/InsightCard';
import { Card } from '@/components/ui/Card';
import type { Transaction, Insight } from '@/types';

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/signin');
  }, [status, router]);

  useEffect(() => {
    if (session?.user) {
      fetch('/api/transactions')
        .then((res) => res.json())
        .then((data) => setTransactions(data.transactions || []));
      fetch('/api/insights')
        .then((res) => res.json())
        .then((data) => setInsights(data.insights || []));
    }
  }, [session]);

  if (status === 'loading') return <div>Loading...</div>;

  const totalThisMonth = transactions
    .filter((tx) => {
      const now = new Date();
      return tx.date.getMonth() === now.getMonth() && tx.date.getFullYear() === now.getFullYear();
    })
    .reduce((sum, tx) => sum + tx.amount, 0);

  const currentMonth = new Date().toLocaleDateString('id-ID', { month: 'long' });

  return (
    <main className="max-w-md mx-auto px-4 py-8">
      <HeroStat amount={totalThisMonth} month={currentMonth} />
      
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Reality Check</h2>
      {insights.length > 0 ? (
        insights.map((insight) => <InsightCard key={insight.id} insight={insight} />)
      ) : (
        <Card className="text-center py-8">
          <p className="text-gray-500">Belum ada insight. Scan email dulu ya!</p>
        </Card>
      )}
    </main>
  );
}
```

- [ ] **Step 3: Write Categories page**

```typescript
'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { CategoryBreakdown } from '@/components/dashboard/CategoryBreakdown';
import type { Transaction, Category } from '@/types';

export default function CategoriesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/signin');
  }, [status, router]);

  useEffect(() => {
    if (session?.user) {
      fetch('/api/transactions')
        .then((res) => res.json())
        .then((data) => setTransactions(data.transactions || []));
    }
  }, [session]);

  if (status === 'loading') return <div>Loading...</div>;

  const categories = (['food', 'shopping', 'transport', 'entertainment', 'other'] as Category[])
    .map((category) => ({
      category,
      amount: transactions
        .filter((tx) => tx.category === category)
        .reduce((sum, tx) => sum + tx.amount, 0),
    }))
    .filter((c) => c.amount > 0);

  return (
    <main className="max-w-md mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Categories</h1>
      {categories.length > 0 ? (
        <CategoryBreakdown categories={categories} />
      ) : (
        <p className="text-center text-gray-500 py-8">No data yet</p>
      )}
    </main>
  );
}
```

- [ ] **Step 4: Write History page**

```typescript
'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { TransactionList } from '@/components/dashboard/TransactionList';
import type { Transaction } from '@/types';

export default function HistoryPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/signin');
  }, [status, router]);

  useEffect(() => {
    if (session?.user) {
      fetch('/api/transactions')
        .then((res) => res.json())
        .then((data) => setTransactions(data.transactions || []));
    }
  }, [session]);

  if (status === 'loading') return <div>Loading...</div>;

  return (
    <main className="max-w-md mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">History</h1>
      {transactions.length > 0 ? (
        <TransactionList transactions={transactions} />
      ) : (
        <p className="text-center text-gray-500 py-8">No transactions yet</p>
      )}
    </main>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add app/dashboard/layout.tsx app/dashboard/page.tsx app/dashboard/categories/page.tsx app/dashboard/history/page.tsx
git commit -m "feat: add dashboard pages with bottom tab navigation"
```

---

## Task 12: API Routes

**Files:**
- Create: `app/api/transactions/route.ts`
- Create: `app/api/emails/scan/route.ts`
- Create: `app/api/insights/route.ts`

- [ ] **Step 1: Write transactions API route**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/firestore';
import type { Transaction } from '@/types';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const snapshot = await db
    .collection('users')
    .doc(userId)
    .collection('transactions')
    .orderBy('date', 'desc')
    .get();

  const transactions: Transaction[] = snapshot.docs.map((doc) => ({
    id: doc.id,
    userId,
    ...(doc.data() as Omit<Transaction, 'id' | 'userId'>),
  }));

  return NextResponse.json({ transactions });
}
```

- [ ] **Step 2: Write email scan API route**

```typescript
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/firestore';
import { createGmailClient, fetchTransactionEmails } from '@/lib/gmail';
import { parseEmail } from '@/lib/parsers';
import type { Transaction } from '@/types';

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const accessToken = (session as { accessToken: string }).accessToken;
  
  if (!accessToken) {
    return NextResponse.json({ error: 'No access token' }, { status: 400 });
  }

  const auth = createGmailClient(accessToken);
  const emails = await fetchTransactionEmails(auth);

  const transactions: Partial<Transaction>[] = [];
  for (const email of emails) {
    const parsed = parseEmail(email);
    if (parsed) {
      transactions.push({
        ...parsed,
        userId,
        createdAt: new Date(),
      });
    }
  }

  const batch = db.batch();
  const txRef = db.collection('users').doc(userId).collection('transactions');
  
  transactions.forEach((tx) => {
    const docRef = txRef.doc();
    batch.set(docRef, tx);
  });
  
  await batch.commit();

  await db.collection('users').doc(userId).update({
    lastScanAt: new Date(),
  });

  return NextResponse.json({ scanned: transactions.length });
}
```

- [ ] **Step 3: Write insights API route**

```typescript
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/firestore';
import type { Insight } from '@/types';

const INSIGHT_TEMPLATES = {
  spike: [
    'Lo udah habis {amount} buat jajan minggu ini 😭',
    'Dompet lo lagi nggak sehat',
  ],
  trend: [
    'Belanja lo naik {percent}% dibanding minggu lalu',
    'Hari ini lo hemat! ✨',
  ],
  category_overload: [
    '{percent}% of spending this month is {category} 🍔',
  ],
  pattern: [
    'Lo udah order Grab 15x bulan ini',
  ],
  encouragement: [
    'Hari ini lo hemat! ✨',
  ],
};

function generateInsights(transactions: any[]): Partial<Insight>[] {
  const insights: Partial<Insight>[] = [];
  
  const now = new Date();
  const thisWeek = transactions.filter((tx) => {
    const diff = now.getTime() - tx.date.getTime();
    return diff < 7 * 24 * 60 * 60 * 1000;
  });
  
  const totalThisWeek = thisWeek.reduce((sum, tx) => sum + tx.amount, 0);
  if (totalThisWeek > 500000) {
    insights.push({
      type: 'spike',
      text: `Lo udah habis Rp${(totalThisWeek / 1000).toFixed(0)}rb buat jajan minggu ini 😭`,
      severity: 'high',
      createdAt: new Date(),
      expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
    });
  }
  
  return insights;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  
  const snapshot = await db
    .collection('users')
    .doc(userId)
    .collection('transactions')
    .orderBy('date', 'desc')
    .get();

  const transactions = snapshot.docs.map((doc) => ({
    id: doc.id,
    userId,
    ...(doc.data() as any),
  }));

  const insights = generateInsights(transactions);

  return NextResponse.json({ insights });
}
```

- [ ] **Step 4: Commit**

```bash
git add app/api/transactions/route.ts app/api/emails/scan/route.ts app/api/insights/route.ts
git commit -m "feat: add API routes for transactions, email scan, and insights"
```

---

## Task 13: Root Page Redirect

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Write root page redirect**

```typescript
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export default async function Home() {
  const session = await getServerSession(authOptions);
  
  if (session) {
    redirect('/dashboard');
  } else {
    redirect('/auth/signin');
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/page.tsx
git commit -m "feat: add root page redirect logic"
```

---

## Task 14: Auth Middleware

**Files:**
- Create: `middleware.ts`

- [ ] **Step 1: Write middleware**

```typescript
export { default } from 'next-auth/middleware';

export const config = {
  matcher: ['/dashboard/:path*'],
};
```

- [ ] **Step 2: Commit**

```bash
git add middleware.ts
git commit -m "feat: add auth middleware to protect dashboard routes"
```

---

## Verification

After completing all tasks, run:

```bash
npm run build
```

Expected: Build completes without errors

---

*Plan status: READY FOR EXECUTION*