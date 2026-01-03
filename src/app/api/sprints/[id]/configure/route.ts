import { NextRequest, NextResponse } from 'next/server';
import { getStorageAsync } from '@/lib/storage';
import { getUserId } from '@/lib/auth';

type RouteParams = { params: Promise<{ id: string }> };

// POST /api/sprints/:id/configure - Configure sprint orchestrator settings
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const userId = await getUserId();
    const storage = await getStorageAsync();
    const body = await request.json();

    // Validate the sprint exists and user has access
    const sprint = await storage.getSprint(userId, parseInt(id));
    if (!sprint) {
      return NextResponse.json({ error: 'Sprint not found' }, { status: 404 });
    }

    // Can only configure if orchestrator is idle or failed
    if (sprint.orchestrator_status !== 'idle' && sprint.orchestrator_status !== 'failed') {
      return NextResponse.json(
        { error: 'Cannot configure while orchestrator is running' },
        { status: 400 }
      );
    }

    // Update sprint with orchestrator config
    const updated = await storage.updateSprint(userId, parseInt(id), {
      target_repo_path: body.target_repo_path,
      target_repo_url: body.target_repo_url,
      base_branch: body.base_branch || 'main',
      // Reset orchestrator state when reconfiguring
      orchestrator_status: 'idle',
      orchestrator_stage: null,
      orchestrator_progress: 0,
      orchestrator_error: null,
    });

    if (!updated) {
      return NextResponse.json({ error: 'Failed to update sprint' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      sprint: await storage.getSprint(userId, parseInt(id)),
    });
  } catch (error) {
    console.error('Failed to configure sprint:', error);
    return NextResponse.json(
      { error: 'Failed to configure sprint' },
      { status: 500 }
    );
  }
}
