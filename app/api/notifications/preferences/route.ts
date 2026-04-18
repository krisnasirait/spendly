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
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const body = await req.json().catch(() => ({}));

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
}
