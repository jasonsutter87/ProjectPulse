import { NextRequest, NextResponse } from 'next/server';
import { getStorageAsync } from '@/lib/storage';
import { getUserId } from '@/lib/auth';

// GET /api/sprints?phase_id=X - List sprints for a phase
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId();
    const storage = await getStorageAsync();
    const { searchParams } = new URL(request.url);
    const phaseIdParam = searchParams.get('phase_id');

    if (!phaseIdParam) {
      return NextResponse.json(
        { error: 'phase_id is required' },
        { status: 400 }
      );
    }

    const phaseId = parseInt(phaseIdParam);
    if (isNaN(phaseId)) {
      return NextResponse.json(
        { error: 'Invalid phase_id' },
        { status: 400 }
      );
    }

    const sprints = await storage.getSprints(userId, phaseId);
    return NextResponse.json(sprints);
  } catch (error) {
    console.error('Failed to fetch sprints:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sprints' },
      { status: 500 }
    );
  }
}

// POST /api/sprints - Create a new sprint
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId();
    const storage = await getStorageAsync();
    const body = await request.json();

    if (!body.phase_id || !body.name) {
      return NextResponse.json(
        { error: 'phase_id and name are required' },
        { status: 400 }
      );
    }

    const sprint = await storage.createSprint(userId, {
      phase_id: body.phase_id,
      name: body.name,
      description: body.description,
      goal: body.goal,
      status: body.status,
      start_date: body.start_date,
      end_date: body.end_date,
    });

    return NextResponse.json(sprint, { status: 201 });
  } catch (error) {
    console.error('Failed to create sprint:', error);
    const message = error instanceof Error ? error.message : 'Failed to create sprint';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
