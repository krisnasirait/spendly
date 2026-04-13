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

  try {
    const snapshot = await db
      .collection('users')
      .doc(userId)
      .collection('categories')
      .orderBy('name', 'asc')
      .get();

    const categories = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({ categories });
  } catch (error) {
    console.error('GET /api/categories error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const db = getDb();

  try {
    const body = await req.json();
    const { name } = body;

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'name is required and must be a string' }, { status: 400 });
    }

    const normalizedName = name.toLowerCase().trim();

    if (normalizedName === '') {
      return NextResponse.json({ error: 'name cannot be empty after normalization' }, { status: 400 });
    }

    const existingSnapshot = await db
      .collection('users')
      .doc(userId)
      .collection('categories')
      .where('name', '==', normalizedName)
      .get();

    if (!existingSnapshot.empty) {
      return NextResponse.json({ error: 'Category already exists' }, { status: 409 });
    }

    const categoryRef = db.collection('users').doc(userId).collection('categories').doc();
    await categoryRef.set({
      userId,
      name: normalizedName,
      createdAt: new Date(),
    });

    return NextResponse.json({ id: categoryRef.id, userId, name: normalizedName }, { status: 201 });
  } catch (error) {
    console.error('POST /api/categories error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
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

  if (!id) {
    return NextResponse.json({ error: 'Category ID is required' }, { status: 400 });
  }

  try {
    const transactionsSnapshot = await db
      .collection('users')
      .doc(userId)
      .collection('transactions')
      .where('categories', 'array-contains', id)
      .get();

    if (!transactionsSnapshot.empty) {
      return NextResponse.json({ error: 'Category is in use by transactions' }, { status: 409 });
    }

    await db.collection('users').doc(userId).collection('categories').doc(id).delete();

    return NextResponse.json({ success: true, deleted: 1 });
  } catch (error) {
    console.error('DELETE /api/categories error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
