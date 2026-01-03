import { NextRequest, NextResponse } from 'next/server';
import { getStorageAsync } from '@/lib/storage';
import { getUserId } from '@/lib/auth';

// POST /api/phases/reorder - Reorder phases within a project
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId();
    const storage = await getStorageAsync();
    const body = await request.json();

    if (!body.project_id || !Array.isArray(body.phase_ids)) {
      return NextResponse.json(
        { error: 'project_id and phase_ids array are required' },
        { status: 400 }
      );
    }

    const success = await storage.reorderPhases(userId, body.project_id, body.phase_ids);

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to reorder phases' },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to reorder phases:', error);
    return NextResponse.json(
      { error: 'Failed to reorder phases' },
      { status: 500 }
    );
  }
}
