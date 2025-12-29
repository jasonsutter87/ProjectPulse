import { NextRequest, NextResponse } from 'next/server';
import { getStorage } from '@/lib/storage';
import { TicketStatus } from '@/types';

interface ReorderRequest {
  ticket_id: number;
  new_status: TicketStatus;
  new_position: number;
}

// POST /api/tickets/reorder - Reorder a ticket (drag & drop)
export async function POST(request: NextRequest) {
  try {
    const storage = getStorage();
    const body: ReorderRequest = await request.json();

    const { ticket_id, new_status, new_position } = body;

    if (!ticket_id || !new_status || new_position === undefined) {
      return NextResponse.json(
        { error: 'ticket_id, new_status, and new_position are required' },
        { status: 400 }
      );
    }

    const success = await storage.reorderTicket(ticket_id, new_status, new_position);

    if (!success) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to reorder ticket:', error);
    return NextResponse.json(
      { error: 'Failed to reorder ticket' },
      { status: 500 }
    );
  }
}
