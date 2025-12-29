import { NextRequest, NextResponse } from 'next/server';
import { getStorage } from '@/lib/storage';

type RouteParams = { params: Promise<{ id: string }> };

// GET /api/projects/:id - Get a single project
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const storage = getStorage();

    const project = await storage.getProject(parseInt(id));

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    return NextResponse.json(project);
  } catch (error) {
    console.error('Failed to fetch project:', error);
    return NextResponse.json(
      { error: 'Failed to fetch project' },
      { status: 500 }
    );
  }
}

// PATCH /api/projects/:id - Update a project
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const storage = getStorage();
    const body = await request.json();

    const project = await storage.updateProject(parseInt(id), body);

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    return NextResponse.json(project);
  } catch (error) {
    console.error('Failed to update project:', error);
    return NextResponse.json(
      { error: 'Failed to update project' },
      { status: 500 }
    );
  }
}

// DELETE /api/projects/:id - Delete a project
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const storage = getStorage();

    const deleted = await storage.deleteProject(parseInt(id));

    if (!deleted) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete project:', error);
    return NextResponse.json(
      { error: 'Failed to delete project' },
      { status: 500 }
    );
  }
}
