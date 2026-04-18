import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/firestore';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const { searchParams } = new URL(req.url);
  const merchant = searchParams.get('merchant')?.trim();

  if (!merchant) {
    return NextResponse.json({ suggestion: null });
  }

  const db = getDb();

  const txSnap = await db
    .collection('users').doc(userId)
    .collection('transactions')
    .where('merchant', '==', merchant)
    .get();

  if (txSnap.empty) {
    return NextResponse.json({ suggestion: null });
  }

  const categoryCounts = new Map<string, number>();
  txSnap.docs.forEach(doc => {
    const categories = doc.data().categories || [];
    categories.forEach((cat: string) => {
      categoryCounts.set(cat, (categoryCounts.get(cat) || 0) + 1);
    });
  });

  let topCategory = '';
  let topCount = 0;
  categoryCounts.forEach((count, cat) => {
    if (count > topCount) {
      topCount = count;
      topCategory = cat;
    }
  });

  return NextResponse.json({
    suggestion: topCategory || null,
    count: topCount,
  });
}
