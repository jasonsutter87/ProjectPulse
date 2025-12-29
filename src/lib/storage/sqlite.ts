import { getDb } from '@/lib/db';
import { Project, Ticket, Tag, TicketWithTags, TicketStatus } from '@/types';
import {
  Storage,
  CreateProjectData,
  UpdateProjectData,
  CreateTicketData,
  UpdateTicketData,
  TicketFilters,
} from './types';

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

export class SQLiteStorage implements Storage {
  // Projects
  async getProjects(activeOnly = false): Promise<Project[]> {
    const db = getDb();
    let query = 'SELECT * FROM projects';
    if (activeOnly) query += ' WHERE is_active = 1';
    query += ' ORDER BY name ASC';
    return db.prepare(query).all() as Project[];
  }

  async getProject(id: number): Promise<Project | null> {
    const db = getDb();
    return (db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as Project) || null;
  }

  async getProjectByPath(path: string): Promise<Project | null> {
    const db = getDb();
    return (db.prepare('SELECT * FROM projects WHERE path = ?').get(path) as Project) || null;
  }

  async createProject(data: CreateProjectData): Promise<Project> {
    const db = getDb();
    const result = db.prepare(`
      INSERT INTO projects (name, path, description) VALUES (?, ?, ?)
    `).run(data.name, data.path, data.description || null);

    return db.prepare('SELECT * FROM projects WHERE id = ?').get(result.lastInsertRowid) as Project;
  }

  async updateProject(id: number, data: UpdateProjectData): Promise<Project | null> {
    const db = getDb();
    const existing = await this.getProject(id);
    if (!existing) return null;

    const updates: string[] = [];
    const values: (string | number | boolean)[] = [];

    if (data.name !== undefined) { updates.push('name = ?'); values.push(data.name); }
    if (data.path !== undefined) { updates.push('path = ?'); values.push(data.path); }
    if (data.description !== undefined) { updates.push('description = ?'); values.push(data.description); }
    if (data.is_active !== undefined) { updates.push('is_active = ?'); values.push(data.is_active ? 1 : 0); }

    if (updates.length === 0) return existing;

    updates.push("updated_at = datetime('now')");
    values.push(id);

    db.prepare(`UPDATE projects SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    return this.getProject(id);
  }

  async deleteProject(id: number): Promise<boolean> {
    const db = getDb();
    const result = db.prepare('DELETE FROM projects WHERE id = ?').run(id);
    return result.changes > 0;
  }

  // Tickets
  async getTickets(filters?: TicketFilters): Promise<TicketWithTags[]> {
    const db = getDb();

    let query = `
      SELECT DISTINCT t.*
      FROM tickets t
      LEFT JOIN ticket_tags tt ON t.id = tt.ticket_id
      WHERE 1=1
    `;
    const params: (string | number)[] = [];

    if (filters?.project_id) {
      query += ' AND t.project_id = ?';
      params.push(filters.project_id);
    }
    if (filters?.status) {
      query += ' AND t.status = ?';
      params.push(filters.status);
    }
    if (filters?.tag_id) {
      query += ' AND tt.tag_id = ?';
      params.push(filters.tag_id);
    }

    query += ' ORDER BY t.status, t.position ASC, t.created_at DESC';

    const tickets = db.prepare(query).all(...params) as Ticket[];

    return tickets.map((ticket) => {
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
  }

  async getTicket(id: number): Promise<TicketWithTags | null> {
    const db = getDb();
    return getTicketWithTags(db, id);
  }

  async createTicket(data: CreateTicketData): Promise<TicketWithTags> {
    const db = getDb();
    const status = data.status || 'backlog';

    const maxPos = db.prepare(`
      SELECT COALESCE(MAX(position), -1) as max_pos FROM tickets WHERE status = ?
    `).get(status) as { max_pos: number };

    const result = db.prepare(`
      INSERT INTO tickets (title, description, project_id, status, priority, position, due_date)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      data.title,
      data.description || null,
      data.project_id || null,
      status,
      data.priority || 0,
      maxPos.max_pos + 1,
      data.due_date || null
    );

    const ticketId = result.lastInsertRowid as number;

    if (data.tag_ids && data.tag_ids.length > 0) {
      const insertTag = db.prepare('INSERT INTO ticket_tags (ticket_id, tag_id) VALUES (?, ?)');
      for (const tagId of data.tag_ids) {
        insertTag.run(ticketId, tagId);
      }
    }

    return getTicketWithTags(db, ticketId)!;
  }

  async updateTicket(id: number, data: UpdateTicketData): Promise<TicketWithTags | null> {
    const db = getDb();
    const existing = await this.getTicket(id);
    if (!existing) return null;

    const updates: string[] = [];
    const values: (string | number | null)[] = [];

    if (data.title !== undefined) { updates.push('title = ?'); values.push(data.title); }
    if (data.description !== undefined) { updates.push('description = ?'); values.push(data.description); }
    if (data.project_id !== undefined) { updates.push('project_id = ?'); values.push(data.project_id); }
    if (data.status !== undefined) { updates.push('status = ?'); values.push(data.status); }
    if (data.priority !== undefined) { updates.push('priority = ?'); values.push(data.priority); }
    if (data.position !== undefined) { updates.push('position = ?'); values.push(data.position); }
    if (data.due_date !== undefined) { updates.push('due_date = ?'); values.push(data.due_date); }

    if (updates.length > 0) {
      updates.push("updated_at = datetime('now')");
      values.push(id);
      db.prepare(`UPDATE tickets SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    }

    if (data.tag_ids !== undefined) {
      db.prepare('DELETE FROM ticket_tags WHERE ticket_id = ?').run(id);
      if (data.tag_ids.length > 0) {
        const insertTag = db.prepare('INSERT INTO ticket_tags (ticket_id, tag_id) VALUES (?, ?)');
        for (const tagId of data.tag_ids) {
          insertTag.run(id, tagId);
        }
      }
    }

    return getTicketWithTags(db, id);
  }

  async deleteTicket(id: number): Promise<boolean> {
    const db = getDb();
    const result = db.prepare('DELETE FROM tickets WHERE id = ?').run(id);
    return result.changes > 0;
  }

  async reorderTicket(ticketId: number, newStatus: TicketStatus, newPosition: number): Promise<boolean> {
    const db = getDb();

    const ticket = db.prepare('SELECT * FROM tickets WHERE id = ?').get(ticketId) as {
      id: number;
      status: TicketStatus;
      position: number;
    } | undefined;

    if (!ticket) return false;

    const oldStatus = ticket.status;
    const oldPosition = ticket.position;

    const reorder = db.transaction(() => {
      if (oldStatus === newStatus) {
        if (oldPosition < newPosition) {
          db.prepare(`
            UPDATE tickets SET position = position - 1
            WHERE status = ? AND position > ? AND position <= ?
          `).run(newStatus, oldPosition, newPosition);
        } else if (oldPosition > newPosition) {
          db.prepare(`
            UPDATE tickets SET position = position + 1
            WHERE status = ? AND position >= ? AND position < ?
          `).run(newStatus, newPosition, oldPosition);
        }
      } else {
        db.prepare(`
          UPDATE tickets SET position = position - 1
          WHERE status = ? AND position > ?
        `).run(oldStatus, oldPosition);

        db.prepare(`
          UPDATE tickets SET position = position + 1
          WHERE status = ? AND position >= ?
        `).run(newStatus, newPosition);
      }

      db.prepare(`
        UPDATE tickets SET status = ?, position = ?, updated_at = datetime('now')
        WHERE id = ?
      `).run(newStatus, newPosition, ticketId);
    });

    reorder();
    return true;
  }

  // Tags
  async getTags(): Promise<Tag[]> {
    const db = getDb();
    return db.prepare('SELECT * FROM tags ORDER BY name ASC').all() as Tag[];
  }

  async createTag(name: string, color = '#6b7280'): Promise<Tag> {
    const db = getDb();
    const result = db.prepare('INSERT INTO tags (name, color) VALUES (?, ?)').run(name.toLowerCase(), color);
    return db.prepare('SELECT * FROM tags WHERE id = ?').get(result.lastInsertRowid) as Tag;
  }

  async deleteTag(id: number): Promise<boolean> {
    const db = getDb();
    const result = db.prepare('DELETE FROM tags WHERE id = ?').run(id);
    return result.changes > 0;
  }
}
