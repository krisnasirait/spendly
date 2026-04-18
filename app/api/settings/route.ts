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
    const docRef = db.collection('users').doc(userId).collection('settings').doc('preferences');
    const snap = await docRef.get();

    if (!snap.exists) {
      return NextResponse.json({ sources: ['shopee', 'tokopedia', 'traveloka', 'bca', 'ayo'], scanPeriodDays: 30, billingStartDay: 1, manualVerificationEnabled: false });
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
    const { sources, scanPeriodDays, billingStartDay, manualVerificationEnabled } = body;

    if (sources !== undefined && !Array.isArray(sources)) {
      return NextResponse.json({ error: 'sources must be an array' }, { status: 400 });
    }
    if (sources !== undefined && sources.length === 0) {
      return NextResponse.json({ error: 'At least one source must be selected' }, { status: 400 });
    }
    if (scanPeriodDays !== undefined && (typeof scanPeriodDays !== 'number' || ![7, 30, 90].includes(scanPeriodDays))) {
      return NextResponse.json({ error: 'scanPeriodDays must be 7, 30, or 90' }, { status: 400 });
    }
    if (billingStartDay !== undefined) {
      if (typeof billingStartDay !== 'number' || billingStartDay < 1 || billingStartDay > 31) {
        return NextResponse.json({ error: 'billingStartDay must be a number between 1 and 31' }, { status: 400 });
      }
    }
    if (manualVerificationEnabled !== undefined && typeof manualVerificationEnabled !== 'boolean') {
      return NextResponse.json({ error: 'manualVerificationEnabled must be a boolean' }, { status: 400 });
    }

    const updates: Record<string, unknown> = {};
    if (sources !== undefined) updates.sources = sources;
    if (scanPeriodDays !== undefined) updates.scanPeriodDays = scanPeriodDays;
    if (billingStartDay !== undefined) updates.billingStartDay = billingStartDay;
    if (manualVerificationEnabled !== undefined) updates.manualVerificationEnabled = manualVerificationEnabled;

    const db = getDb();
    const docRef = db.collection('users').doc(userId).collection('settings').doc('preferences');
    await docRef.set(updates, { merge: true });

    if (manualVerificationEnabled === false) {
      const pendingSnap = await db.collection('users').doc(userId).collection('pendingTransactions').get();
      if (!pendingSnap.empty) {
        const batch = db.batch();
        const txRef = db.collection('users').doc(userId).collection('transactions');
        let approvedCount = 0;
        
        for (const pendingDoc of pendingSnap.docs) {
          const data = pendingDoc.data();
          const newTxRef = txRef.doc();
          batch.set(newTxRef, {
            merchant: data.merchant,
            amount: data.amount,
            date: new Date(data.date),
            categories: data.categories,
            source: data.source,
            userId,
            createdAt: new Date(),
            messageId: data.messageId,
          });
          batch.delete(pendingDoc.ref);
          approvedCount++;
        }
        await batch.commit();
        console.log(`Auto-approved ${approvedCount} pending transactions`);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('PUT /api/settings error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}