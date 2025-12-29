import { NextRequest, NextResponse } from 'next/server';
import { getStorage } from '@/lib/storage';
import { getUserId } from '@/lib/auth';

// GET /api/projects - List all projects
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId();
    const storage = getStorage();
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('active') === 'true';

    const projects = await storage.getProjects(userId, activeOnly);
    return NextResponse.json(projects);
  } catch (error) {
    console.error('Failed to fetch projects:', error);
    return NextResponse.json(
      { error: 'Failed to fetch projects' },
      { status: 500 }
    );
  }
}

// POST /api/projects - Create a new project
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId();
    const storage = getStorage();
    const body = await request.json();

    if (!body.name || !body.path) {
      return NextResponse.json(
        { error: 'Name and path are required' },
        { status: 400 }
      );
    }

    // Check if path already exists for this user
    const existing = await storage.getProjectByPath(userId, body.path);
    if (existing) {
      return NextResponse.json(
        { error: 'A project with this path already exists' },
        { status: 409 }
      );
    }

    const project = await storage.createProject(userId, {
      name: body.name,
      path: body.path,
      description: body.description,
    });

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    console.error('Failed to create project:', error);
    return NextResponse.json(
      { error: 'Failed to create project' },
      { status: 500 }
    );
  }
}
