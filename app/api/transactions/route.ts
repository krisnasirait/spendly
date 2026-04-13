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

  const transactions: Transaction[] = snapshot.docs.map((doc) => ({
    id: doc.id,
    userId,
    ...(doc.data() as Omit<Transaction, 'id' | 'userId'>),
  }));

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