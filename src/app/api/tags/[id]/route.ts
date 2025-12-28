import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

type RouteParams = { params: Promise<{ id: string }> };

// DELETE /api/tags/:id - Delete a tag
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const db = getDb();

    const existing = db.prepare('SELECT * FROM tags WHERE id = ?').get(id);
    if (!existing) {
      return NextResponse.json({ error: 'Tag not found' }, { status: 404 });
    }

    // Ticket tags are automatically deleted via CASCADE
    db.prepare('DELETE FROM tags WHERE id = ?').run(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete tag:', error);
    return NextResponse.json(
      { error: 'Failed to delete tag' },
      { status: 500 }
    );
  }
}
