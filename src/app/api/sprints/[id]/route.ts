import { NextRequest, NextResponse } from 'next/server';
import { getStorageAsync } from '@/lib/storage';
import { getUserId } from '@/lib/auth';

type RouteParams = { params: Promise<{ id: string }> };

// GET /api/sprints/:id - Get a single sprint with details
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const userId = await getUserId();
    const storage = await getStorageAsync();

    const sprint = await storage.getSprint(userId, parseInt(id));

    if (!sprint) {
      return NextResponse.json({ error: 'Sprint not found' }, { status: 404 });
    }

    return NextResponse.json(sprint);
  } catch (error) {
    console.error('Failed to fetch sprint:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sprint' },
      { status: 500 }
    );
  }
}

// PATCH /api/sprints/:id - Update a sprint
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const userId = await getUserId();
    const storage = await getStorageAsync();
    const body = await request.json();

    const sprint = await storage.updateSprint(userId, parseInt(id), {
      name: body.name,
      description: body.description,
      goal: body.goal,
      status: body.status,
      position: body.position,
      start_date: body.start_date,
      end_date: body.end_date,
      target_repo_path: body.target_repo_path,
      target_repo_url: body.target_repo_url,
      base_branch: body.base_branch,
      sprint_branch: body.sprint_branch,
      orchestrator_status: body.orchestrator_status,
      orchestrator_stage: body.orchestrator_stage,
      orchestrator_progress: body.orchestrator_progress,
      orchestrator_error: body.orchestrator_error,
    });

    if (!sprint) {
      return NextResponse.json({ error: 'Sprint not found' }, { status: 404 });
    }

    return NextResponse.json(sprint);
  } catch (error) {
    console.error('Failed to update sprint:', error);
    return NextResponse.json(
      { error: 'Failed to update sprint' },
      { status: 500 }
    );
  }
}

// DELETE /api/sprints/:id - Delete a sprint
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const userId = await getUserId();
    const storage = await getStorageAsync();

    const deleted = await storage.deleteSprint(userId, parseInt(id));

    if (!deleted) {
      return NextResponse.json({ error: 'Sprint not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete sprint:', error);
    return NextResponse.json(
      { error: 'Failed to delete sprint' },
      { status: 500 }
    );
  }
}
