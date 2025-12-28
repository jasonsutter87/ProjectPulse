import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { Tag, CreateTagRequest } from '@/types';

// GET /api/tags - List all tags
export async function GET() {
  try {
    const db = getDb();
    const tags = db.prepare('SELECT * FROM tags ORDER BY name ASC').all() as Tag[];

    return NextResponse.json(tags);
  } catch (error) {
    console.error('Failed to fetch tags:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tags' },
      { status: 500 }
    );
  }
}

// POST /api/tags - Create a new tag
export async function POST(request: NextRequest) {
  try {
    const db = getDb();
    const body: CreateTagRequest = await request.json();

    if (!body.name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    const stmt = db.prepare(`
      INSERT INTO tags (name, color)
      VALUES (?, ?)
    `);

    const result = stmt.run(body.name.toLowerCase(), body.color || '#6b7280');

    const tag = db.prepare('SELECT * FROM tags WHERE id = ?').get(result.lastInsertRowid) as Tag;

    return NextResponse.json(tag, { status: 201 });
  } catch (error: unknown) {
    console.error('Failed to create tag:', error);
    if (error instanceof Error && error.message.includes('UNIQUE constraint')) {
      return NextResponse.json(
        { error: 'A tag with this name already exists' },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to create tag' },
      { status: 500 }
    );
  }
}
