import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/firestore';
import { setDoc } from 'firebase-admin/firestore';

async function getUserId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;
  return session.user.email as string;
}

export async function GET() {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const db = getDb();
    const docRef = db.collection('users').doc(userId).collection('settings').doc('preferences');
    const snap = await docRef.get();

    if (!snap.exists) {
      return NextResponse.json({ sources: ['shopee', 'tokopedia', 'traveloka', 'bca', 'ayo'], scanPeriodDays: 30 });
    }

    return NextResponse.json(snap.data());
  } catch (error) {
    console.error('GET /api/settings error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { sources, scanPeriodDays } = body;

    if (sources !== undefined && !Array.isArray(sources)) {
      return NextResponse.json({ error: 'sources must be an array' }, { status: 400 });
    }
    if (sources !== undefined && sources.length === 0) {
      return NextResponse.json({ error: 'At least one source must be selected' }, { status: 400 });
    }
    if (scanPeriodDays !== undefined && (typeof scanPeriodDays !== 'number' || ![7, 30, 90].includes(scanPeriodDays))) {
      return NextResponse.json({ error: 'scanPeriodDays must be 7, 30, or 90' }, { status: 400 });
    }

    const updates: Record<string, unknown> = {};
    if (sources !== undefined) updates.sources = sources;
    if (scanPeriodDays !== undefined) updates.scanPeriodDays = scanPeriodDays;

    const db = getDb();
    const docRef = db.collection('users').doc(userId).collection('settings').doc('preferences');
    await setDoc(docRef, updates, { merge: true });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('PUT /api/settings error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}