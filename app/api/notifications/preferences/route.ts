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
    const docSnap = await db
      .collection('users').doc(userId)
      .collection('settings').doc('notificationPreferences')
      .get();

    const defaults = {
      enabled: false,
      budgetAlerts: true,
      weeklySummary: false,
      recurringReminders: true,
    };

    if (!docSnap.exists) {
      return NextResponse.json(defaults);
    }

    return NextResponse.json(docSnap.data());
  } catch (error) {
    console.error('GET /api/notifications/preferences error:', error);
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
    const { enabled, budgetAlerts, weeklySummary, recurringReminders } = body;

    const updates: Record<string, boolean> = {};
    if (typeof enabled === 'boolean') updates.enabled = enabled;
    if (typeof budgetAlerts === 'boolean') updates.budgetAlerts = budgetAlerts;
    if (typeof weeklySummary === 'boolean') updates.weeklySummary = weeklySummary;
    if (typeof recurringReminders === 'boolean') updates.recurringReminders = recurringReminders;

    const db = getDb();
    await db
      .collection('users').doc(userId)
      .collection('settings').doc('notificationPreferences')
      .set(updates, { merge: true });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('PUT /api/notifications/preferences error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
