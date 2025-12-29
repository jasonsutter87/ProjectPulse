import { NextRequest, NextResponse } from 'next/server';
import { getStorage } from '@/lib/storage';
import { getUserId } from '@/lib/auth';

type RouteParams = { params: Promise<{ id: string }> };

// DELETE /api/tags/:id - Delete a tag
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const userId = await getUserId();
    const storage = getStorage();

    const deleted = await storage.deleteTag(userId, parseInt(id));

    if (!deleted) {
      return NextResponse.json({ error: 'Tag not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete tag:', error);
    return NextResponse.json(
      { error: 'Failed to delete tag' },
      { status: 500 }
    );
  }
}
