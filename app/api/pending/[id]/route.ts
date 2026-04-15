import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/firestore';

async function getUserId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  return (session.user as { id: string }).id;
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

    const body = await req.json().catch(() => ({}));
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
