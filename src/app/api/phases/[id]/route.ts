import { NextRequest, NextResponse } from 'next/server';
import { getStorageAsync } from '@/lib/storage';
import { getUserId } from '@/lib/auth';

type RouteParams = { params: Promise<{ id: string }> };

// GET /api/phases/:id - Get a single phase
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const userId = await getUserId();
    const storage = await getStorageAsync();

    const phase = await storage.getPhase(userId, parseInt(id));

    if (!phase) {
      return NextResponse.json({ error: 'Phase not found' }, { status: 404 });
    }

    return NextResponse.json(phase);
  } catch (error) {
    console.error('Failed to fetch phase:', error);
    return NextResponse.json(
      { error: 'Failed to fetch phase' },
      { status: 500 }
    );
  }
}

// PATCH /api/phases/:id - Update a phase
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const userId = await getUserId();
    const storage = await getStorageAsync();
    const body = await request.json();

    const phase = await storage.updatePhase(userId, parseInt(id), {
      name: body.name,
      description: body.description,
      status: body.status,
      position: body.position,
      start_date: body.start_date,
      end_date: body.end_date,
    });

    if (!phase) {
      return NextResponse.json({ error: 'Phase not found' }, { status: 404 });
    }

    return NextResponse.json(phase);
  } catch (error) {
    console.error('Failed to update phase:', error);
    return NextResponse.json(
      { error: 'Failed to update phase' },
      { status: 500 }
    );
  }
}

// DELETE /api/phases/:id - Delete a phase
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const userId = await getUserId();
    const storage = await getStorageAsync();

    const deleted = await storage.deletePhase(userId, parseInt(id));

    if (!deleted) {
      return NextResponse.json({ error: 'Phase not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete phase:', error);
    return NextResponse.json(
      { error: 'Failed to delete phase' },
      { status: 500 }
    );
  }
}
