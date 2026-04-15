import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/firestore';
import type { Budget } from '@/types';

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
    const budgetsRef = db.collection('users').doc(userId).collection('budgets');
    const snap = await budgetsRef.get();

    const budgets: Budget[] = snap.docs.map(doc => ({
      category: doc.id,
      amount: doc.data().amount || 0,
      period: 'monthly' as const,
      suggestedAmount: doc.data().suggestedAmount,
      isManual: doc.data().isManual || false,
    }));

    return NextResponse.json({ budgets });
  } catch (error) {
    console.error('GET /api/budgets error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { budgets } = body as { budgets: Budget[] };

    if (!Array.isArray(budgets)) {
      return NextResponse.json({ error: 'budgets must be an array' }, { status: 400 });
    }

    const db = getDb();
    const batch = db.batch();
    const budgetsRef = db.collection('users').doc(userId).collection('budgets');

    budgets.forEach(budget => {
      const docRef = budgetsRef.doc(budget.category);
      batch.set(docRef, {
        amount: budget.amount,
        period: 'monthly',
        suggestedAmount: budget.suggestedAmount,
        isManual: budget.isManual,
      }, { merge: true });
    });

    await batch.commit();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('PUT /api/budgets error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
