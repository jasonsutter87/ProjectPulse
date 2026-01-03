import { NextRequest, NextResponse } from 'next/server';
import { getStorageAsync } from '@/lib/storage';
import { getUserId } from '@/lib/auth';

// GET /api/phases?project_id=X - List phases for a project
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId();
    const storage = await getStorageAsync();
    const { searchParams } = new URL(request.url);
    const projectIdParam = searchParams.get('project_id');

    if (!projectIdParam) {
      return NextResponse.json(
        { error: 'project_id is required' },
        { status: 400 }
      );
    }

    const projectId = parseInt(projectIdParam);
    if (isNaN(projectId)) {
      return NextResponse.json(
        { error: 'Invalid project_id' },
        { status: 400 }
      );
    }

    const phases = await storage.getPhases(userId, projectId);
    return NextResponse.json(phases);
  } catch (error) {
    console.error('Failed to fetch phases:', error);
    return NextResponse.json(
      { error: 'Failed to fetch phases' },
      { status: 500 }
    );
  }
}

// POST /api/phases - Create a new phase
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId();
    const storage = await getStorageAsync();
    const body = await request.json();

    if (!body.project_id || !body.name) {
      return NextResponse.json(
        { error: 'project_id and name are required' },
        { status: 400 }
      );
    }

    const phase = await storage.createPhase(userId, {
      project_id: body.project_id,
      name: body.name,
      description: body.description,
      status: body.status,
      start_date: body.start_date,
      end_date: body.end_date,
    });

    return NextResponse.json(phase, { status: 201 });
  } catch (error) {
    console.error('Failed to create phase:', error);
    const message = error instanceof Error ? error.message : 'Failed to create phase';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
