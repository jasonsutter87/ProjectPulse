import { NextRequest, NextResponse } from 'next/server';
import { getStorage } from '@/lib/storage';
import { getUserId } from '@/lib/auth';

// GET /api/tags - List all tags
export async function GET() {
  try {
    const userId = await getUserId();
    const storage = getStorage();
    const tags = await storage.getTags(userId);
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
    const userId = await getUserId();
    const storage = getStorage();
    const body = await request.json();

    if (!body.name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    const tag = await storage.createTag(userId, body.name, body.color);
    return NextResponse.json(tag, { status: 201 });
  } catch (error: unknown) {
    console.error('Failed to create tag:', error);
    if (error instanceof Error && error.message.includes('UNIQUE')) {
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
