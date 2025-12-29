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

function getTicketWithTags(db: ReturnType<typeof getDb>, userId: string | null, ticketId: number): TicketWithTags | null {
  // Build query based on whether userId is provided
  let ticketQuery = 'SELECT t.* FROM tickets t';
  const params: (string | number)[] = [ticketId];

  if (userId !== null) {
    ticketQuery += ' JOIN projects p ON t.project_id = p.id WHERE t.id = ? AND p.user_id = ?';
    params.push(userId);
  } else {
    // In single-user mode, also include tickets without a project
    ticketQuery += ' LEFT JOIN projects p ON t.project_id = p.id WHERE t.id = ? AND (p.user_id IS NULL OR t.project_id IS NULL)';
  }

  const ticket = db.prepare(ticketQuery).get(...params) as Ticket | undefined;
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
  async getProjects(userId: string | null, activeOnly = false): Promise<Project[]> {
    const db = getDb();
    let query = 'SELECT * FROM projects WHERE 1=1';
    const params: (string | number)[] = [];

    if (userId !== null) {
      query += ' AND user_id = ?';
      params.push(userId);
    } else {
      query += ' AND user_id IS NULL';
    }

    if (activeOnly) {
      query += ' AND is_active = 1';
    }

    query += ' ORDER BY name ASC';
    return db.prepare(query).all(...params) as Project[];
  }

  async getProject(userId: string | null, id: number): Promise<Project | null> {
    const db = getDb();
    let query = 'SELECT * FROM projects WHERE id = ?';
    const params: (string | number)[] = [id];

    if (userId !== null) {
      query += ' AND user_id = ?';
      params.push(userId);
    } else {
      query += ' AND user_id IS NULL';
    }

    return (db.prepare(query).get(...params) as Project) || null;
  }

  async getProjectByPath(userId: string | null, path: string): Promise<Project | null> {
    const db = getDb();
    let query = 'SELECT * FROM projects WHERE path = ?';
    const params: (string)[] = [path];

    if (userId !== null) {
      query += ' AND user_id = ?';
      params.push(userId);
    } else {
      query += ' AND user_id IS NULL';
    }

    return (db.prepare(query).get(...params) as Project) || null;
  }

  async createProject(userId: string | null, data: CreateProjectData): Promise<Project> {
    const db = getDb();
    const result = db.prepare(`
      INSERT INTO projects (user_id, name, path, description) VALUES (?, ?, ?, ?)
    `).run(userId, data.name, data.path, data.description || null);

    return db.prepare('SELECT * FROM projects WHERE id = ?').get(result.lastInsertRowid) as Project;
  }

  async updateProject(userId: string | null, id: number, data: UpdateProjectData): Promise<Project | null> {
    const db = getDb();
    const existing = await this.getProject(userId, id);
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
    return this.getProject(userId, id);
  }

  async deleteProject(userId: string | null, id: number): Promise<boolean> {
    const db = getDb();
    // Ensure the project belongs to the user
    const existing = await this.getProject(userId, id);
    if (!existing) return false;

    const result = db.prepare('DELETE FROM projects WHERE id = ?').run(id);
    return result.changes > 0;
  }

  // Tickets
  async getTickets(userId: string | null, filters?: TicketFilters): Promise<TicketWithTags[]> {
    const db = getDb();

    let query = `
      SELECT DISTINCT t.*
      FROM tickets t
      LEFT JOIN ticket_tags tt ON t.id = tt.ticket_id
      LEFT JOIN projects p ON t.project_id = p.id
      WHERE 1=1
    `;
    const params: (string | number)[] = [];

    // Filter by user: tickets must belong to user's projects or have no project (in single-user mode)
    if (userId !== null) {
      query += ' AND (p.user_id = ? OR t.project_id IS NULL)';
      params.push(userId);
    } else {
      query += ' AND (p.user_id IS NULL OR t.project_id IS NULL)';
    }

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

  async getTicket(userId: string | null, id: number): Promise<TicketWithTags | null> {
    const db = getDb();
    return getTicketWithTags(db, userId, id);
  }

  async createTicket(userId: string | null, data: CreateTicketData): Promise<TicketWithTags> {
    const db = getDb();
    const status = data.status || 'backlog';

    // Verify project belongs to user if project_id is provided
    if (data.project_id && userId !== null) {
      const project = await this.getProject(userId, data.project_id);
      if (!project) {
        throw new Error('Project not found or access denied');
      }
    }

    const maxPos = db.prepare(`
      SELECT COALESCE(MAX(position), -1) as max_pos FROM tickets WHERE status = ?
    `).get(status) as { max_pos: number };

    const result = db.prepare(`
      INSERT INTO tickets (title, description, project_id, status, priority, position, start_date, due_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      data.title,
      data.description || null,
      data.project_id || null,
      status,
      data.priority || 0,
      maxPos.max_pos + 1,
      data.start_date || null,
      data.due_date || null
    );

    const ticketId = result.lastInsertRowid as number;

    if (data.tag_ids && data.tag_ids.length > 0) {
      const insertTag = db.prepare('INSERT INTO ticket_tags (ticket_id, tag_id) VALUES (?, ?)');
      for (const tagId of data.tag_ids) {
        insertTag.run(ticketId, tagId);
      }
    }

    return getTicketWithTags(db, userId, ticketId)!;
  }

  async updateTicket(userId: string | null, id: number, data: UpdateTicketData): Promise<TicketWithTags | null> {
    const db = getDb();
    const existing = await this.getTicket(userId, id);
    if (!existing) return null;

    // Verify new project belongs to user if changing project_id
    if (data.project_id !== undefined && data.project_id !== null && userId !== null) {
      const project = await this.getProject(userId, data.project_id);
      if (!project) {
        throw new Error('Project not found or access denied');
      }
    }

    const updates: string[] = [];
    const values: (string | number | null)[] = [];

    if (data.title !== undefined) { updates.push('title = ?'); values.push(data.title); }
    if (data.description !== undefined) { updates.push('description = ?'); values.push(data.description); }
    if (data.project_id !== undefined) { updates.push('project_id = ?'); values.push(data.project_id); }
    if (data.status !== undefined) { updates.push('status = ?'); values.push(data.status); }
    if (data.priority !== undefined) { updates.push('priority = ?'); values.push(data.priority); }
    if (data.position !== undefined) { updates.push('position = ?'); values.push(data.position); }
    if (data.start_date !== undefined) { updates.push('start_date = ?'); values.push(data.start_date); }
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

    return getTicketWithTags(db, userId, id);
  }

  async deleteTicket(userId: string | null, id: number): Promise<boolean> {
    const db = getDb();
    // Verify ticket belongs to user
    const existing = await this.getTicket(userId, id);
    if (!existing) return false;

    const result = db.prepare('DELETE FROM tickets WHERE id = ?').run(id);
    return result.changes > 0;
  }

  async reorderTicket(userId: string | null, ticketId: number, newStatus: TicketStatus, newPosition: number): Promise<boolean> {
    const db = getDb();

    // Verify ticket belongs to user
    const existing = await this.getTicket(userId, ticketId);
    if (!existing) return false;

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
  async getTags(userId: string | null): Promise<Tag[]> {
    const db = getDb();
    let query = 'SELECT * FROM tags WHERE 1=1';
    const params: (string)[] = [];

    if (userId !== null) {
      query += ' AND user_id = ?';
      params.push(userId);
    } else {
      query += ' AND user_id IS NULL';
    }

    query += ' ORDER BY name ASC';
    return db.prepare(query).all(...params) as Tag[];
  }

  async createTag(userId: string | null, name: string, color = '#6b7280'): Promise<Tag> {
    const db = getDb();
    const result = db.prepare('INSERT INTO tags (user_id, name, color) VALUES (?, ?, ?)').run(userId, name.toLowerCase(), color);
    return db.prepare('SELECT * FROM tags WHERE id = ?').get(result.lastInsertRowid) as Tag;
  }

  async deleteTag(userId: string | null, id: number): Promise<boolean> {
    const db = getDb();

    // Verify tag belongs to user
    let query = 'SELECT * FROM tags WHERE id = ?';
    const params: (string | number)[] = [id];

    if (userId !== null) {
      query += ' AND user_id = ?';
      params.push(userId);
    } else {
      query += ' AND user_id IS NULL';
    }

    const tag = db.prepare(query).get(...params);
    if (!tag) return false;

    const result = db.prepare('DELETE FROM tags WHERE id = ?').run(id);
    return result.changes > 0;
  }
}
