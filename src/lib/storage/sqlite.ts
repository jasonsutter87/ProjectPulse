import { getDb } from '@/lib/db';
import {
  Project,
  Ticket,
  Tag,
  TicketWithTags,
  TicketStatus,
  Phase,
  PhaseWithSprints,
  Sprint,
  SprintWithDetails,
  AgentRun,
  QualityGate,
} from '@/types';
import {
  Storage,
  CreateProjectData,
  UpdateProjectData,
  CreateTicketData,
  UpdateTicketData,
  TicketFilters,
  CreatePhaseData,
  UpdatePhaseData,
  CreateSprintData,
  UpdateSprintData,
  CreateAgentRunData,
  UpdateAgentRunData,
  CreateQualityGateData,
  UpdateQualityGateData,
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
    if (filters?.phase_id) {
      query += ' AND t.phase_id = ?';
      params.push(filters.phase_id);
    }
    if (filters?.sprint_id) {
      query += ' AND t.sprint_id = ?';
      params.push(filters.sprint_id);
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
      INSERT INTO tickets (title, description, project_id, phase_id, sprint_id, status, priority, position, start_date, due_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      data.title,
      data.description || null,
      data.project_id || null,
      data.phase_id || null,
      data.sprint_id || null,
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
    if (data.phase_id !== undefined) { updates.push('phase_id = ?'); values.push(data.phase_id); }
    if (data.sprint_id !== undefined) { updates.push('sprint_id = ?'); values.push(data.sprint_id); }
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

  // Phases
  async getPhases(userId: string | null, projectId: number): Promise<PhaseWithSprints[]> {
    const db = getDb();

    // Verify project belongs to user
    const project = await this.getProject(userId, projectId);
    if (!project) return [];

    const phases = db.prepare(`
      SELECT * FROM phases WHERE project_id = ? ORDER BY position ASC, created_at ASC
    `).all(projectId) as Phase[];

    return phases.map((phase) => {
      const sprints = db.prepare(`
        SELECT * FROM sprints WHERE phase_id = ? ORDER BY position ASC, created_at ASC
      `).all(phase.id) as Sprint[];

      const ticketCount = db.prepare(`
        SELECT COUNT(*) as count FROM tickets WHERE phase_id = ?
      `).get(phase.id) as { count: number };

      return { ...phase, sprints, ticket_count: ticketCount.count };
    });
  }

  async getPhase(userId: string | null, id: number): Promise<PhaseWithSprints | null> {
    const db = getDb();

    const phase = db.prepare('SELECT * FROM phases WHERE id = ?').get(id) as Phase | undefined;
    if (!phase) return null;

    // Verify project belongs to user
    const project = await this.getProject(userId, phase.project_id);
    if (!project) return null;

    const sprints = db.prepare(`
      SELECT * FROM sprints WHERE phase_id = ? ORDER BY position ASC, created_at ASC
    `).all(id) as Sprint[];

    const ticketCount = db.prepare(`
      SELECT COUNT(*) as count FROM tickets WHERE phase_id = ?
    `).get(id) as { count: number };

    return { ...phase, sprints, ticket_count: ticketCount.count };
  }

  async createPhase(userId: string | null, data: CreatePhaseData): Promise<Phase> {
    const db = getDb();

    // Verify project belongs to user
    const project = await this.getProject(userId, data.project_id);
    if (!project) {
      throw new Error('Project not found or access denied');
    }

    const maxPos = db.prepare(`
      SELECT COALESCE(MAX(position), -1) as max_pos FROM phases WHERE project_id = ?
    `).get(data.project_id) as { max_pos: number };

    const result = db.prepare(`
      INSERT INTO phases (project_id, name, description, position, status, start_date, end_date)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      data.project_id,
      data.name,
      data.description || null,
      maxPos.max_pos + 1,
      data.status || 'planning',
      data.start_date || null,
      data.end_date || null
    );

    return db.prepare('SELECT * FROM phases WHERE id = ?').get(result.lastInsertRowid) as Phase;
  }

  async updatePhase(userId: string | null, id: number, data: UpdatePhaseData): Promise<Phase | null> {
    const db = getDb();

    const existing = await this.getPhase(userId, id);
    if (!existing) return null;

    const updates: string[] = [];
    const values: (string | number | null)[] = [];

    if (data.name !== undefined) { updates.push('name = ?'); values.push(data.name); }
    if (data.description !== undefined) { updates.push('description = ?'); values.push(data.description); }
    if (data.status !== undefined) { updates.push('status = ?'); values.push(data.status); }
    if (data.position !== undefined) { updates.push('position = ?'); values.push(data.position); }
    if (data.start_date !== undefined) { updates.push('start_date = ?'); values.push(data.start_date); }
    if (data.end_date !== undefined) { updates.push('end_date = ?'); values.push(data.end_date); }

    if (updates.length === 0) return existing;

    updates.push("updated_at = datetime('now')");
    values.push(id);

    db.prepare(`UPDATE phases SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    return db.prepare('SELECT * FROM phases WHERE id = ?').get(id) as Phase;
  }

  async deletePhase(userId: string | null, id: number): Promise<boolean> {
    const db = getDb();

    const existing = await this.getPhase(userId, id);
    if (!existing) return false;

    const result = db.prepare('DELETE FROM phases WHERE id = ?').run(id);
    return result.changes > 0;
  }

  async reorderPhases(userId: string | null, projectId: number, phaseIds: number[]): Promise<boolean> {
    const db = getDb();

    // Verify project belongs to user
    const project = await this.getProject(userId, projectId);
    if (!project) return false;

    const reorder = db.transaction(() => {
      phaseIds.forEach((phaseId, index) => {
        db.prepare('UPDATE phases SET position = ? WHERE id = ? AND project_id = ?').run(index, phaseId, projectId);
      });
    });

    reorder();
    return true;
  }

  // Sprints
  async getSprints(userId: string | null, phaseId: number): Promise<SprintWithDetails[]> {
    const db = getDb();

    // Verify phase belongs to user's project
    const phase = await this.getPhase(userId, phaseId);
    if (!phase) return [];

    const sprints = db.prepare(`
      SELECT * FROM sprints WHERE phase_id = ? ORDER BY position ASC, created_at ASC
    `).all(phaseId) as Sprint[];

    return sprints.map((sprint) => {
      const agentRuns = db.prepare(`
        SELECT * FROM sprint_agent_runs WHERE sprint_id = ? ORDER BY created_at ASC
      `).all(sprint.id) as AgentRun[];

      const qualityGates = db.prepare(`
        SELECT * FROM sprint_quality_gates WHERE sprint_id = ? ORDER BY created_at ASC
      `).all(sprint.id) as QualityGate[];

      const ticketCount = db.prepare(`
        SELECT COUNT(*) as count FROM tickets WHERE sprint_id = ?
      `).get(sprint.id) as { count: number };

      return { ...sprint, phase, agent_runs: agentRuns, quality_gates: qualityGates, ticket_count: ticketCount.count };
    });
  }

  async getSprint(userId: string | null, id: number): Promise<SprintWithDetails | null> {
    const db = getDb();

    const sprint = db.prepare('SELECT * FROM sprints WHERE id = ?').get(id) as Sprint | undefined;
    if (!sprint) return null;

    // Verify phase belongs to user's project
    const phase = await this.getPhase(userId, sprint.phase_id);
    if (!phase) return null;

    const agentRuns = db.prepare(`
      SELECT * FROM sprint_agent_runs WHERE sprint_id = ? ORDER BY created_at ASC
    `).all(id) as AgentRun[];

    const qualityGates = db.prepare(`
      SELECT * FROM sprint_quality_gates WHERE sprint_id = ? ORDER BY created_at ASC
    `).all(id) as QualityGate[];

    const ticketCount = db.prepare(`
      SELECT COUNT(*) as count FROM tickets WHERE sprint_id = ?
    `).get(id) as { count: number };

    return { ...sprint, phase, agent_runs: agentRuns, quality_gates: qualityGates, ticket_count: ticketCount.count };
  }

  async createSprint(userId: string | null, data: CreateSprintData): Promise<Sprint> {
    const db = getDb();

    // Verify phase belongs to user's project
    const phase = await this.getPhase(userId, data.phase_id);
    if (!phase) {
      throw new Error('Phase not found or access denied');
    }

    const maxPos = db.prepare(`
      SELECT COALESCE(MAX(position), -1) as max_pos FROM sprints WHERE phase_id = ?
    `).get(data.phase_id) as { max_pos: number };

    const result = db.prepare(`
      INSERT INTO sprints (phase_id, name, description, goal, position, status, start_date, end_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      data.phase_id,
      data.name,
      data.description || null,
      data.goal || null,
      maxPos.max_pos + 1,
      data.status || 'planning',
      data.start_date || null,
      data.end_date || null
    );

    return db.prepare('SELECT * FROM sprints WHERE id = ?').get(result.lastInsertRowid) as Sprint;
  }

  async updateSprint(userId: string | null, id: number, data: UpdateSprintData): Promise<Sprint | null> {
    const db = getDb();

    const existing = await this.getSprint(userId, id);
    if (!existing) return null;

    const updates: string[] = [];
    const values: (string | number | null)[] = [];

    if (data.name !== undefined) { updates.push('name = ?'); values.push(data.name); }
    if (data.description !== undefined) { updates.push('description = ?'); values.push(data.description); }
    if (data.goal !== undefined) { updates.push('goal = ?'); values.push(data.goal); }
    if (data.status !== undefined) { updates.push('status = ?'); values.push(data.status); }
    if (data.position !== undefined) { updates.push('position = ?'); values.push(data.position); }
    if (data.start_date !== undefined) { updates.push('start_date = ?'); values.push(data.start_date); }
    if (data.end_date !== undefined) { updates.push('end_date = ?'); values.push(data.end_date); }
    if (data.target_repo_path !== undefined) { updates.push('target_repo_path = ?'); values.push(data.target_repo_path); }
    if (data.target_repo_url !== undefined) { updates.push('target_repo_url = ?'); values.push(data.target_repo_url); }
    if (data.base_branch !== undefined) { updates.push('base_branch = ?'); values.push(data.base_branch); }
    if (data.sprint_branch !== undefined) { updates.push('sprint_branch = ?'); values.push(data.sprint_branch); }
    if (data.orchestrator_status !== undefined) { updates.push('orchestrator_status = ?'); values.push(data.orchestrator_status); }
    if (data.orchestrator_stage !== undefined) { updates.push('orchestrator_stage = ?'); values.push(data.orchestrator_stage); }
    if (data.orchestrator_progress !== undefined) { updates.push('orchestrator_progress = ?'); values.push(data.orchestrator_progress); }
    if (data.orchestrator_error !== undefined) { updates.push('orchestrator_error = ?'); values.push(data.orchestrator_error); }
    // Checkpoint fields for resumability
    if (data.current_step !== undefined) { updates.push('current_step = ?'); values.push(data.current_step); }
    if (data.current_substep !== undefined) { updates.push('current_substep = ?'); values.push(data.current_substep); }
    if (data.checkpoint_data !== undefined) { updates.push('checkpoint_data = ?'); values.push(data.checkpoint_data); }
    if (data.last_checkpoint_at !== undefined) { updates.push('last_checkpoint_at = ?'); values.push(data.last_checkpoint_at); }

    if (updates.length === 0) return existing;

    updates.push("updated_at = datetime('now')");
    values.push(id);

    db.prepare(`UPDATE sprints SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    return db.prepare('SELECT * FROM sprints WHERE id = ?').get(id) as Sprint;
  }

  async deleteSprint(userId: string | null, id: number): Promise<boolean> {
    const db = getDb();

    const existing = await this.getSprint(userId, id);
    if (!existing) return false;

    const result = db.prepare('DELETE FROM sprints WHERE id = ?').run(id);
    return result.changes > 0;
  }

  async reorderSprints(userId: string | null, phaseId: number, sprintIds: number[]): Promise<boolean> {
    const db = getDb();

    // Verify phase belongs to user's project
    const phase = await this.getPhase(userId, phaseId);
    if (!phase) return false;

    const reorder = db.transaction(() => {
      sprintIds.forEach((sprintId, index) => {
        db.prepare('UPDATE sprints SET position = ? WHERE id = ? AND phase_id = ?').run(index, sprintId, phaseId);
      });
    });

    reorder();
    return true;
  }

  // Agent Runs
  async getAgentRuns(userId: string | null, sprintId: number): Promise<AgentRun[]> {
    const db = getDb();

    // Verify sprint belongs to user's project
    const sprint = await this.getSprint(userId, sprintId);
    if (!sprint) return [];

    return db.prepare(`
      SELECT * FROM sprint_agent_runs WHERE sprint_id = ? ORDER BY created_at ASC
    `).all(sprintId) as AgentRun[];
  }

  async createAgentRun(userId: string | null, data: CreateAgentRunData): Promise<AgentRun> {
    const db = getDb();

    // Verify sprint belongs to user's project
    const sprint = await this.getSprint(userId, data.sprint_id);
    if (!sprint) {
      throw new Error('Sprint not found or access denied');
    }

    const result = db.prepare(`
      INSERT INTO sprint_agent_runs (sprint_id, agent_name, agent_type, branch_name)
      VALUES (?, ?, ?, ?)
    `).run(data.sprint_id, data.agent_name, data.agent_type, data.branch_name || null);

    return db.prepare('SELECT * FROM sprint_agent_runs WHERE id = ?').get(result.lastInsertRowid) as AgentRun;
  }

  async updateAgentRun(userId: string | null, id: number, data: UpdateAgentRunData): Promise<AgentRun | null> {
    const db = getDb();

    const run = db.prepare('SELECT * FROM sprint_agent_runs WHERE id = ?').get(id) as AgentRun | undefined;
    if (!run) return null;

    // Verify sprint belongs to user's project
    const sprint = await this.getSprint(userId, run.sprint_id);
    if (!sprint) return null;

    const updates: string[] = [];
    const values: (string | number | null)[] = [];

    if (data.status !== undefined) { updates.push('status = ?'); values.push(data.status); }
    if (data.branch_name !== undefined) { updates.push('branch_name = ?'); values.push(data.branch_name); }
    if (data.started_at !== undefined) { updates.push('started_at = ?'); values.push(data.started_at); }
    if (data.completed_at !== undefined) { updates.push('completed_at = ?'); values.push(data.completed_at); }
    if (data.output_summary !== undefined) { updates.push('output_summary = ?'); values.push(data.output_summary); }
    if (data.error_message !== undefined) { updates.push('error_message = ?'); values.push(data.error_message); }

    if (updates.length === 0) return run;

    values.push(id);
    db.prepare(`UPDATE sprint_agent_runs SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    return db.prepare('SELECT * FROM sprint_agent_runs WHERE id = ?').get(id) as AgentRun;
  }

  // Quality Gates
  async getQualityGates(userId: string | null, sprintId: number): Promise<QualityGate[]> {
    const db = getDb();

    // Verify sprint belongs to user's project
    const sprint = await this.getSprint(userId, sprintId);
    if (!sprint) return [];

    return db.prepare(`
      SELECT * FROM sprint_quality_gates WHERE sprint_id = ? ORDER BY created_at ASC
    `).all(sprintId) as QualityGate[];
  }

  async createQualityGate(userId: string | null, data: CreateQualityGateData): Promise<QualityGate> {
    const db = getDb();

    // Verify sprint belongs to user's project
    const sprint = await this.getSprint(userId, data.sprint_id);
    if (!sprint) {
      throw new Error('Sprint not found or access denied');
    }

    const result = db.prepare(`
      INSERT INTO sprint_quality_gates (sprint_id, gate_name, gate_type, max_score)
      VALUES (?, ?, ?, ?)
    `).run(data.sprint_id, data.gate_name, data.gate_type, data.max_score || null);

    return db.prepare('SELECT * FROM sprint_quality_gates WHERE id = ?').get(result.lastInsertRowid) as QualityGate;
  }

  async updateQualityGate(userId: string | null, id: number, data: UpdateQualityGateData): Promise<QualityGate | null> {
    const db = getDb();

    const gate = db.prepare('SELECT * FROM sprint_quality_gates WHERE id = ?').get(id) as QualityGate | undefined;
    if (!gate) return null;

    // Verify sprint belongs to user's project
    const sprint = await this.getSprint(userId, gate.sprint_id);
    if (!sprint) return null;

    const updates: string[] = [];
    const values: (string | number | null)[] = [];

    if (data.status !== undefined) { updates.push('status = ?'); values.push(data.status); }
    if (data.score !== undefined) { updates.push('score = ?'); values.push(data.score); }
    if (data.passed_at !== undefined) { updates.push('passed_at = ?'); values.push(data.passed_at); }
    if (data.details !== undefined) { updates.push('details = ?'); values.push(data.details); }

    if (updates.length === 0) return gate;

    values.push(id);
    db.prepare(`UPDATE sprint_quality_gates SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    return db.prepare('SELECT * FROM sprint_quality_gates WHERE id = ?').get(id) as QualityGate;
  }
}
