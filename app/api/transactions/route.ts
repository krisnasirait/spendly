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
      if (data.date instanceof Date) {
        dateStr = data.date.toISOString();
      } else if (typeof data.date === 'string') {
        dateStr = data.date;
      } else if (data.date && typeof data.date === 'object' && 'toDate' in data.date) {
        dateStr = (data.date as { toDate: () => Date }).toDate().toISOString();
      } else if (data.date && typeof data.date === 'object' && 'seconds' in data.date) {
        const ts = data.date as { seconds: number; nanoseconds?: number };
        dateStr = new Date(ts.seconds * 1000).toISOString();
      }
    }
    return {
      id: doc.id,
      userId,
      merchant: data.merchant,
      amount: data.amount,
      category: data.category,
      source: data.source,
      date: dateStr,
      createdAt: data.createdAt instanceof Date ? data.createdAt.toISOString() : data.createdAt,
    };
  });

  return NextResponse.json({ transactions });
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