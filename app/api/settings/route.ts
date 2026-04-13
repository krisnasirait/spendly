import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/firestore';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const db = getDb();
  const docRef = db.collection('users').doc(userId).collection('settings').doc('preferences');
  const snap = await docRef.get();

  if (!snap.exists) {
    return NextResponse.json({ sources: ['shopee', 'tokopedia', 'traveloka', 'bca'], scanPeriodDays: 30 });
  }

  return NextResponse.json(snap.data());
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const body = await req.json();
  const { sources, scanPeriodDays } = body;

  const db = getDb();
  const docRef = db.collection('users').doc(userId).collection('settings').doc('preferences');
  await docRef.set({ sources, scanPeriodDays }, { merge: true });

  return NextResponse.json({ success: true });
}
