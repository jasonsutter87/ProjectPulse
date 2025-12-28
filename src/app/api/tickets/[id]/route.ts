import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { Ticket, TicketWithTags, Tag, Project, UpdateTicketRequest } from '@/types';

type RouteParams = { params: Promise<{ id: string }> };

// Helper to get ticket with tags
function getTicketWithTags(db: ReturnType<typeof getDb>, ticketId: number): TicketWithTags | null {
  const ticket = db.prepare('SELECT * FROM tickets WHERE id = ?').get(ticketId) as Ticket | undefined;
  if (!ticket) return null;

  const tags = db.prepare(`
    SELECT t.* FROM tags t
    JOIN ticket_tags tt ON t.id = tt.tag_id
    WHERE tt.ticket_id = ?
  `).all(ticketId) as Tag[];

  let project: Project | null = null;
  if (ticket.project_id) {
    project = db.prepare('SELECT * FROM projects WHERE id = ?').get(ticket.project_id) as Project | null;
  }

  return { ...ticket, tags, project };
}

// GET /api/tickets/:id - Get a single ticket
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const db = getDb();

    const ticket = getTicketWithTags(db, parseInt(id));

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    return NextResponse.json(ticket);
  } catch (error) {
    console.error('Failed to fetch ticket:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ticket' },
      { status: 500 }
    );
  }
}

// PATCH /api/tickets/:id - Update a ticket
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const ticketId = parseInt(id);
    const db = getDb();
    const body: UpdateTicketRequest = await request.json();

    // Check if ticket exists
    const existing = db.prepare('SELECT * FROM tickets WHERE id = ?').get(ticketId) as Ticket | undefined;
    if (!existing) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    // Build dynamic update query
    const updates: string[] = [];
    const values: (string | number | null)[] = [];

    if (body.title !== undefined) {
      updates.push('title = ?');
      values.push(body.title);
    }
    if (body.description !== undefined) {
      updates.push('description = ?');
      values.push(body.description);
    }
    if (body.project_id !== undefined) {
      updates.push('project_id = ?');
      values.push(body.project_id);
    }
    if (body.status !== undefined) {
      updates.push('status = ?');
      values.push(body.status);
    }
    if (body.priority !== undefined) {
      updates.push('priority = ?');
      values.push(body.priority);
    }
    if (body.position !== undefined) {
      updates.push('position = ?');
      values.push(body.position);
    }

    if (updates.length > 0) {
      updates.push("updated_at = datetime('now')");
      values.push(ticketId);

      const stmt = db.prepare(`
        UPDATE tickets SET ${updates.join(', ')} WHERE id = ?
      `);
      stmt.run(...values);
    }

    // Update tags if provided
    if (body.tag_ids !== undefined) {
      // Remove existing tags
      db.prepare('DELETE FROM ticket_tags WHERE ticket_id = ?').run(ticketId);

      // Add new tags
      if (body.tag_ids.length > 0) {
        const insertTag = db.prepare('INSERT INTO ticket_tags (ticket_id, tag_id) VALUES (?, ?)');
        for (const tagId of body.tag_ids) {
          insertTag.run(ticketId, tagId);
        }
      }
    }

    const ticket = getTicketWithTags(db, ticketId);
    return NextResponse.json(ticket);
  } catch (error) {
    console.error('Failed to update ticket:', error);
    return NextResponse.json(
      { error: 'Failed to update ticket' },
      { status: 500 }
    );
  }
}

// DELETE /api/tickets/:id - Delete a ticket
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const db = getDb();

    const existing = db.prepare('SELECT * FROM tickets WHERE id = ?').get(id);
    if (!existing) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    // Tags are automatically deleted via CASCADE
    db.prepare('DELETE FROM tickets WHERE id = ?').run(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete ticket:', error);
    return NextResponse.json(
      { error: 'Failed to delete ticket' },
      { status: 500 }
    );
  }
}
