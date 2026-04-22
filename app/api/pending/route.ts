import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/firestore';
import { Timestamp } from 'firebase-admin/firestore';

async function getUserId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  return (session.user as { id: string }).id;
}

export async function GET(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  if (searchParams.get('action') === 'count') {
    const db = getDb();
    const snap = await db
      .collection('users')
      .doc(userId)
      .collection('pendingTransactions')
      .count()
      .get();
    return NextResponse.json({ count: snap.data().count });
  }

  try {
    const db = getDb();
    function toISOString(value: unknown): string {
      if (value instanceof Date) return value.toISOString();
      if (typeof value === 'string') return value;
      return String(value);
    }

    const snap = await db
      .collection('users')
      .doc(userId)
      .collection('pendingTransactions')
      .orderBy('createdAt', 'desc')
      .get();

    const pendingTransactions = snap.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        merchant: data.merchant,
        amount: data.amount,
        date: toISOString(data.date),
        categories: data.categories || [],
        source: data.source,
        messageId: data.messageId,
        createdAt: toISOString(data.createdAt),
        status: 'pending' as const,
      };
    });

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
    const body = await req.json().catch(() => ({}));
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

      const dateValue = data!.date instanceof Timestamp
        ? data!.date.toDate()
        : (data!.date instanceof Date ? data!.date : new Date(data!.date as string));

      // Spread everything from the pending doc, then override the fields that change on approval.
      // Strip undefined values so Firestore never receives them.
      const txData = Object.fromEntries(
        Object.entries({
          ...data,
          date: dateValue,
          userId,
          createdAt: new Date(),
        }).filter(([, v]) => v !== undefined)
      );

      await txRef.set(txData);
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

export async function PATCH(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  try {
    const body = await req.json();
    const { merchant, amount, date, categories } = body;

    const db = getDb();
    const pendingRef = db.collection('users').doc(userId).collection('pendingTransactions').doc(id);
    const pendingSnap = await pendingRef.get();

    if (!pendingSnap.exists) {
      return NextResponse.json({ error: 'pending transaction not found' }, { status: 404 });
    }

    const updates: Record<string, unknown> = {};
    if (merchant !== undefined) updates.merchant = merchant;
    if (amount !== undefined) updates.amount = amount;
    if (date !== undefined) updates.date = new Date(date);
    if (categories !== undefined) updates.categories = categories;

    await pendingRef.set(updates, { merge: true });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('PATCH /api/pending error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
