import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { TicketStatus } from '@/types';

interface ReorderRequest {
  ticket_id: number;
  new_status: TicketStatus;
  new_position: number;
}

// POST /api/tickets/reorder - Reorder a ticket (drag & drop)
export async function POST(request: NextRequest) {
  try {
    const db = getDb();
    const body: ReorderRequest = await request.json();

    const { ticket_id, new_status, new_position } = body;

    if (!ticket_id || !new_status || new_position === undefined) {
      return NextResponse.json(
        { error: 'ticket_id, new_status, and new_position are required' },
        { status: 400 }
      );
    }

    // Get current ticket
    const ticket = db.prepare('SELECT * FROM tickets WHERE id = ?').get(ticket_id) as {
      id: number;
      status: TicketStatus;
      position: number;
    } | undefined;

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    const oldStatus = ticket.status;
    const oldPosition = ticket.position;

    // Use a transaction for consistency
    const reorder = db.transaction(() => {
      if (oldStatus === new_status) {
        // Same column - just reorder
        if (oldPosition < new_position) {
          // Moving down: shift tickets between old and new position up
          db.prepare(`
            UPDATE tickets
            SET position = position - 1
            WHERE status = ? AND position > ? AND position <= ?
          `).run(new_status, oldPosition, new_position);
        } else if (oldPosition > new_position) {
          // Moving up: shift tickets between new and old position down
          db.prepare(`
            UPDATE tickets
            SET position = position + 1
            WHERE status = ? AND position >= ? AND position < ?
          `).run(new_status, new_position, oldPosition);
        }
      } else {
        // Different column
        // Shift tickets in old column up
        db.prepare(`
          UPDATE tickets
          SET position = position - 1
          WHERE status = ? AND position > ?
        `).run(oldStatus, oldPosition);

        // Shift tickets in new column down
        db.prepare(`
          UPDATE tickets
          SET position = position + 1
          WHERE status = ? AND position >= ?
        `).run(new_status, new_position);
      }

      // Update the ticket itself
      db.prepare(`
        UPDATE tickets
        SET status = ?, position = ?, updated_at = datetime('now')
        WHERE id = ?
      `).run(new_status, new_position, ticket_id);
    });

    reorder();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to reorder ticket:', error);
    return NextResponse.json(
      { error: 'Failed to reorder ticket' },
      { status: 500 }
    );
  }
}
