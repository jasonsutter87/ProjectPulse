import { NextRequest, NextResponse } from 'next/server';
import { getStorage } from '@/lib/storage';
import { TicketStatus } from '@/types';

// GET /api/tickets - List all tickets with optional filters
export async function GET(request: NextRequest) {
  try {
    const storage = getStorage();
    const { searchParams } = new URL(request.url);

    const projectId = searchParams.get('project_id');
    const status = searchParams.get('status');
    const tagId = searchParams.get('tag_id');

    const tickets = await storage.getTickets({
      project_id: projectId ? parseInt(projectId) : undefined,
      status: status as TicketStatus | undefined,
      tag_id: tagId ? parseInt(tagId) : undefined,
    });

    return NextResponse.json(tickets);
  } catch (error) {
    console.error('Failed to fetch tickets:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tickets' },
      { status: 500 }
    );
  }
}

// POST /api/tickets - Create a new ticket
export async function POST(request: NextRequest) {
  try {
    const storage = getStorage();
    const body = await request.json();

    if (!body.title) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }

    const ticket = await storage.createTicket({
      title: body.title,
      description: body.description,
      project_id: body.project_id,
      status: body.status,
      priority: body.priority,
      start_date: body.start_date,
      due_date: body.due_date,
      tag_ids: body.tag_ids,
    });

    return NextResponse.json(ticket, { status: 201 });
  } catch (error) {
    console.error('Failed to create ticket:', error);
    return NextResponse.json(
      { error: 'Failed to create ticket' },
      { status: 500 }
    );
  }
}
