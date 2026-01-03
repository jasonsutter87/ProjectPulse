import { NextRequest, NextResponse } from 'next/server';
import { getStorageAsync } from '@/lib/storage';
import { getUserId } from '@/lib/auth';

// POST /api/sprints/reorder - Reorder sprints within a phase
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId();
    const storage = await getStorageAsync();
    const body = await request.json();

    if (!body.phase_id || !Array.isArray(body.sprint_ids)) {
      return NextResponse.json(
        { error: 'phase_id and sprint_ids array are required' },
        { status: 400 }
      );
    }

    const success = await storage.reorderSprints(userId, body.phase_id, body.sprint_ids);

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to reorder sprints' },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to reorder sprints:', error);
    return NextResponse.json(
      { error: 'Failed to reorder sprints' },
      { status: 500 }
    );
  }
}
