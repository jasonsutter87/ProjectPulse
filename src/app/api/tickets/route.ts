import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { Ticket, TicketWithTags, Tag, Project, CreateTicketRequest } from '@/types';

// GET /api/tickets - List all tickets with optional filters
export async function GET(request: NextRequest) {
  try {
    const db = getDb();
    const { searchParams } = new URL(request.url);

    const projectId = searchParams.get('project_id');
    const status = searchParams.get('status');
    const tagId = searchParams.get('tag_id');

    let query = `
      SELECT DISTINCT t.*
      FROM tickets t
      LEFT JOIN ticket_tags tt ON t.id = tt.ticket_id
      WHERE 1=1
    `;
    const params: (string | number)[] = [];

    if (projectId) {
      query += ' AND t.project_id = ?';
      params.push(parseInt(projectId));
    }

    if (status) {
      query += ' AND t.status = ?';
      params.push(status);
    }

    if (tagId) {
      query += ' AND tt.tag_id = ?';
      params.push(parseInt(tagId));
    }

    query += ' ORDER BY t.status, t.position ASC, t.created_at DESC';

    const tickets = db.prepare(query).all(...params) as Ticket[];

    // Fetch tags for each ticket
    const ticketsWithTags: TicketWithTags[] = tickets.map((ticket) => {
      const tags = db.prepare(`
        SELECT t.* FROM tags t
        JOIN ticket_tags tt ON t.id = tt.tag_id
        WHERE tt.ticket_id = ?
      `).all(ticket.id) as Tag[];

      let project: Project | null = null;
      if (ticket.project_id) {
        project = db.prepare('SELECT * FROM projects WHERE id = ?').get(ticket.project_id) as Project | null;
      }

      return { ...ticket, tags, project };
    });

    return NextResponse.json(ticketsWithTags);
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
    const db = getDb();
    const body: CreateTicketRequest = await request.json();

    if (!body.title) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }

    // Get the max position for the status column
    const status = body.status || 'backlog';
    const maxPos = db.prepare(`
      SELECT COALESCE(MAX(position), -1) as max_pos FROM tickets WHERE status = ?
    `).get(status) as { max_pos: number };

    const stmt = db.prepare(`
      INSERT INTO tickets (title, description, project_id, status, priority, position)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      body.title,
      body.description || null,
      body.project_id || null,
      status,
      body.priority || 0,
      maxPos.max_pos + 1
    );

    const ticketId = result.lastInsertRowid;

    // Add tags if provided
    if (body.tag_ids && body.tag_ids.length > 0) {
      const insertTag = db.prepare('INSERT INTO ticket_tags (ticket_id, tag_id) VALUES (?, ?)');
      for (const tagId of body.tag_ids) {
        insertTag.run(ticketId, tagId);
      }
    }

    // Fetch the created ticket with tags
    const ticket = db.prepare('SELECT * FROM tickets WHERE id = ?').get(ticketId) as Ticket;
    const tags = db.prepare(`
      SELECT t.* FROM tags t
      JOIN ticket_tags tt ON t.id = tt.tag_id
      WHERE tt.ticket_id = ?
    `).all(ticketId) as Tag[];

    let project: Project | null = null;
    if (ticket.project_id) {
      project = db.prepare('SELECT * FROM projects WHERE id = ?').get(ticket.project_id) as Project | null;
    }

    return NextResponse.json({ ...ticket, tags, project }, { status: 201 });
  } catch (error) {
    console.error('Failed to create ticket:', error);
    return NextResponse.json(
      { error: 'Failed to create ticket' },
      { status: 500 }
    );
  }
}
