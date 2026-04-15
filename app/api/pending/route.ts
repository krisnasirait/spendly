import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/firestore';

async function getUserId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  return (session.user as { id: string }).id;
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

    const pendingTransactions = snap.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        merchant: data.merchant,
        amount: data.amount,
        date: data.date instanceof Date ? data.date.toISOString() : (typeof data.date === 'string' ? data.date : String(data.date)),
        categories: data.categories || [],
        source: data.source,
        messageId: data.messageId,
        createdAt: typeof data.createdAt === 'string' ? data.createdAt : (data.createdAt instanceof Date ? data.createdAt.toISOString() : String(data.createdAt)),
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
