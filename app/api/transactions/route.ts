import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/firestore';
import type { Transaction } from '@/types';

export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const db = getDb();
  const snapshot = await db
    .collection('users')
    .doc(userId)
    .collection('transactions')
    .orderBy('date', 'desc')
    .get();

  const transactions: Transaction[] = snapshot.docs.map((doc) => {
    const data = doc.data() as Omit<Transaction, 'id' | 'userId'> & { date?: Date | string | { toDate?: () => Date } };
    let dateStr = '';
    if (data.date) {
      if (typeof data.date === 'string') {
        dateStr = data.date;
      } else if (typeof data.date === 'object') {
        if ('toDate' in data.date) {
          dateStr = (data.date as { toDate: () => Date }).toDate().toISOString();
        } else if ('seconds' in data.date) {
          const ts = data.date as { seconds: number; nanoseconds?: number };
          dateStr = new Date(ts.seconds * 1000).toISOString();
        } else if ((data.date as unknown) instanceof Date) {
          dateStr = (data.date as Date).toISOString();
        }
      }
    }
    return {
      id: doc.id,
      userId,
      merchant: data.merchant,
      amount: data.amount,
      categories: data.categories || [],
      source: data.source,
      date: dateStr,
      createdAt: typeof data.createdAt === 'string' ? data.createdAt : ((data.createdAt as unknown) instanceof Date ? (data.createdAt as Date).toISOString() : String(data.createdAt)),
    };
  });

  return NextResponse.json({ transactions });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const body = await req.json().catch(() => ({}));
  const { merchant, amount, date, categories, source } = body;

  if (!merchant || typeof merchant !== 'string' || merchant.trim() === '') {
    return NextResponse.json({ error: 'merchant is required' }, { status: 400 });
  }
  if (typeof amount !== 'number' || isNaN(amount) || amount <= 0) {
    return NextResponse.json({ error: 'amount must be a positive number' }, { status: 400 });
  }
  if (!date) {
    return NextResponse.json({ error: 'date is required' }, { status: 400 });
  }
  if (!categories || !Array.isArray(categories)) {
    return NextResponse.json({ error: 'categories must be an array' }, { status: 400 });
  }

  const db = getDb();
  const txRef = db.collection('users').doc(userId).collection('transactions').doc();
  
  await txRef.set({
    merchant: merchant.trim(),
    amount,
    date: new Date(date),
    categories,
    source: source || 'manual',
    userId,
    createdAt: new Date(),
  });

  return NextResponse.json({ id: txRef.id, success: true }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const db = getDb();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (id) {
    await db.collection('users').doc(userId).collection('transactions').doc(id).delete();
    return NextResponse.json({ success: true, deleted: 1 });
  }

  const body = await req.json().catch(() => ({}));
  const { ids } = body as { ids?: string[] };

  if (ids && ids.length > 0) {
    const batch = db.batch();
    ids.forEach((txId) => {
      batch.delete(db.collection('users').doc(userId).collection('transactions').doc(txId));
    });
    await batch.commit();
    return NextResponse.json({ success: true, deleted: ids.length });
  }

  return NextResponse.json({ error: 'No transaction ID or IDs provided' }, { status: 400 });
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const body = await req.json().catch(() => ({}));
  const { id, merchant, amount, date, categories } = body;

  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const updates: Record<string, unknown> = {};
  if (typeof merchant === 'string' && merchant.trim().length > 0) updates.merchant = merchant;
  if (typeof amount === 'number' && !isNaN(amount)) updates.amount = amount;
  if (date !== undefined) {
    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) return NextResponse.json({ error: 'invalid date' }, { status: 400 });
    updates.date = parsedDate;
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
  const docRef = db.collection('users').doc(userId).collection('transactions').doc(id);
  const docSnap = await docRef.get();
  if (!docSnap.exists) return NextResponse.json({ error: 'transaction not found' }, { status: 404 });

  await docRef.update(updates);

  return NextResponse.json({ success: true });
}