import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { Project, CreateProjectRequest } from '@/types';

// GET /api/projects - List all projects
export async function GET(request: NextRequest) {
  try {
    const db = getDb();
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('active') === 'true';

    let query = 'SELECT * FROM projects';
    if (activeOnly) {
      query += ' WHERE is_active = 1';
    }
    query += ' ORDER BY name ASC';

    const projects = db.prepare(query).all() as Project[];

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
    const db = getDb();
    const body: CreateProjectRequest = await request.json();

    if (!body.name || !body.path) {
      return NextResponse.json(
        { error: 'Name and path are required' },
        { status: 400 }
      );
    }

    const stmt = db.prepare(`
      INSERT INTO projects (name, path, description)
      VALUES (?, ?, ?)
    `);

    const result = stmt.run(body.name, body.path, body.description || null);

    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(result.lastInsertRowid) as Project;

    return NextResponse.json(project, { status: 201 });
  } catch (error: unknown) {
    console.error('Failed to create project:', error);
    if (error instanceof Error && error.message.includes('UNIQUE constraint')) {
      return NextResponse.json(
        { error: 'A project with this path already exists' },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to create project' },
      { status: 500 }
    );
  }
}
