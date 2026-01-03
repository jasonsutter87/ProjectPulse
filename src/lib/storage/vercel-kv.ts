import { kv } from '@vercel/kv';
import { Project, Tag, TicketWithTags, TicketStatus, TicketPriority } from '@/types';
import {
  Storage,
  CreateProjectData,
  UpdateProjectData,
  CreateTicketData,
  UpdateTicketData,
  TicketFilters,
} from './types';

// Data structures for KV storage
interface KVData {
  projects: Record<number, Project>;
  tickets: Record<number, TicketWithTags>;
  tags: Record<number, Tag>;
  counters: {
    projectId: number;
    ticketId: number;
    tagId: number;
  };
}

function getDataKey(userId: string | null): string {
  if (userId) {
    return `projectpulse:users:${userId}:data`;
  }
  return 'projectpulse:data';
}

function getDefaultData(userId: string | null): KVData {
  return {
    projects: {},
    tickets: {},
    tags: {
      1: { id: 1, user_id: userId, name: 'dev', color: '#3b82f6' },
      2: { id: 2, user_id: userId, name: 'marketing', color: '#8b5cf6' },
      3: { id: 3, user_id: userId, name: 'seo', color: '#10b981' },
      4: { id: 4, user_id: userId, name: 'go-live', color: '#f59e0b' },
      5: { id: 5, user_id: userId, name: 'bug', color: '#ef4444' },
      6: { id: 6, user_id: userId, name: 'feature', color: '#06b6d4' },
    },
    counters: { projectId: 0, ticketId: 0, tagId: 6 },
  };
}

export class VercelKVStorage implements Storage {
  private async getData(userId: string | null): Promise<KVData> {
    try {
      const dataKey = getDataKey(userId);
      const data = await kv.get<KVData>(dataKey);
      return data || getDefaultData(userId);
    } catch {
      return getDefaultData(userId);
    }
  }

  private async saveData(userId: string | null, data: KVData): Promise<void> {
    const dataKey = getDataKey(userId);
    await kv.set(dataKey, data);
  }

  // Projects
  async getProjects(userId: string | null, activeOnly = false): Promise<Project[]> {
    const data = await this.getData(userId);
    let projects = Object.values(data.projects);
    if (activeOnly) {
      projects = projects.filter((p) => p.is_active);
    }
    return projects.sort((a, b) => a.name.localeCompare(b.name));
  }

  async getProject(userId: string | null, id: number): Promise<Project | null> {
    const data = await this.getData(userId);
    return data.projects[id] || null;
  }

  async getProjectByPath(userId: string | null, path: string): Promise<Project | null> {
    const data = await this.getData(userId);
    return Object.values(data.projects).find((p) => p.path === path) || null;
  }

  async createProject(userId: string | null, input: CreateProjectData): Promise<Project> {
    const data = await this.getData(userId);
    const id = ++data.counters.projectId;
    const now = new Date().toISOString();

    const project: Project = {
      id,
      user_id: userId,
      name: input.name,
      path: input.path,
      description: input.description || null,
      is_active: true,
      created_at: now,
      updated_at: now,
    };

    data.projects[id] = project;
    await this.saveData(userId, data);
    return project;
  }

  async updateProject(userId: string | null, id: number, input: UpdateProjectData): Promise<Project | null> {
    const data = await this.getData(userId);
    const project = data.projects[id];
    if (!project) return null;

    if (input.name !== undefined) project.name = input.name;
    if (input.path !== undefined) project.path = input.path;
    if (input.description !== undefined) project.description = input.description;
    if (input.is_active !== undefined) project.is_active = input.is_active;
    project.updated_at = new Date().toISOString();

    data.projects[id] = project;
    await this.saveData(userId, data);
    return project;
  }

  async deleteProject(userId: string | null, id: number): Promise<boolean> {
    const data = await this.getData(userId);
    if (!data.projects[id]) return false;

    for (const ticketId of Object.keys(data.tickets)) {
      if (data.tickets[Number(ticketId)].project_id === id) {
        delete data.tickets[Number(ticketId)];
      }
    }

    delete data.projects[id];
    await this.saveData(userId, data);
    return true;
  }

  // Tickets
  async getTickets(userId: string | null, filters?: TicketFilters): Promise<TicketWithTags[]> {
    const data = await this.getData(userId);
    let tickets = Object.values(data.tickets);

    if (filters?.project_id) {
      tickets = tickets.filter((t) => t.project_id === filters.project_id);
    }
    if (filters?.status) {
      tickets = tickets.filter((t) => t.status === filters.status);
    }
    if (filters?.tag_id) {
      tickets = tickets.filter((t) => t.tags.some((tag) => tag.id === filters.tag_id));
    }

    tickets = tickets.map((t) => ({
      ...t,
      project: t.project_id ? data.projects[t.project_id] || null : null,
    }));

    return tickets.sort((a, b) => {
      if (a.status !== b.status) return a.status.localeCompare(b.status);
      return a.position - b.position;
    });
  }

  async getTicket(userId: string | null, id: number): Promise<TicketWithTags | null> {
    const data = await this.getData(userId);
    const ticket = data.tickets[id];
    if (!ticket) return null;

    return {
      ...ticket,
      project: ticket.project_id ? data.projects[ticket.project_id] || null : null,
    };
  }

  async createTicket(userId: string | null, input: CreateTicketData): Promise<TicketWithTags> {
    const data = await this.getData(userId);
    const id = ++data.counters.ticketId;
    const now = new Date().toISOString();
    const status = input.status || 'backlog';

    if (input.project_id && !data.projects[input.project_id]) {
      throw new Error('Project not found or access denied');
    }

    const sameStatusTickets = Object.values(data.tickets).filter((t) => t.status === status);
    const position = sameStatusTickets.length;

    const tags: Tag[] = (input.tag_ids || [])
      .map((tagId) => data.tags[tagId])
      .filter(Boolean);

    const ticket: TicketWithTags = {
      id,
      title: input.title,
      description: input.description || null,
      project_id: input.project_id || null,
      status: status as TicketStatus,
      priority: (input.priority || 0) as TicketPriority,
      position,
      start_date: input.start_date || null,
      due_date: input.due_date || null,
      created_at: now,
      updated_at: now,
      tags,
      project: input.project_id ? data.projects[input.project_id] || null : null,
    };

    data.tickets[id] = ticket;
    await this.saveData(userId, data);
    return ticket;
  }

  async updateTicket(userId: string | null, id: number, input: UpdateTicketData): Promise<TicketWithTags | null> {
    const data = await this.getData(userId);
    const ticket = data.tickets[id];
    if (!ticket) return null;

    if (input.project_id !== undefined && input.project_id !== null && !data.projects[input.project_id]) {
      throw new Error('Project not found or access denied');
    }

    if (input.title !== undefined) ticket.title = input.title;
    if (input.description !== undefined) ticket.description = input.description;
    if (input.project_id !== undefined) ticket.project_id = input.project_id;
    if (input.status !== undefined) ticket.status = input.status;
    if (input.priority !== undefined) ticket.priority = input.priority;
    if (input.position !== undefined) ticket.position = input.position;
    if (input.start_date !== undefined) ticket.start_date = input.start_date;
    if (input.due_date !== undefined) ticket.due_date = input.due_date;
    if (input.tag_ids !== undefined) {
      ticket.tags = input.tag_ids.map((tagId) => data.tags[tagId]).filter(Boolean);
    }

    ticket.updated_at = new Date().toISOString();
    ticket.project = ticket.project_id ? data.projects[ticket.project_id] || null : null;

    data.tickets[id] = ticket;
    await this.saveData(userId, data);
    return ticket;
  }

  async deleteTicket(userId: string | null, id: number): Promise<boolean> {
    const data = await this.getData(userId);
    if (!data.tickets[id]) return false;

    delete data.tickets[id];
    await this.saveData(userId, data);
    return true;
  }

  async reorderTicket(userId: string | null, ticketId: number, newStatus: TicketStatus, newPosition: number): Promise<boolean> {
    const data = await this.getData(userId);
    const ticket = data.tickets[ticketId];
    if (!ticket) return false;

    const oldStatus = ticket.status;
    const oldPosition = ticket.position;

    for (const t of Object.values(data.tickets)) {
      if (t.id === ticketId) continue;

      if (oldStatus === newStatus) {
        if (oldPosition < newPosition && t.status === newStatus && t.position > oldPosition && t.position <= newPosition) {
          t.position--;
        } else if (oldPosition > newPosition && t.status === newStatus && t.position >= newPosition && t.position < oldPosition) {
          t.position++;
        }
      } else {
        if (t.status === oldStatus && t.position > oldPosition) {
          t.position--;
        }
        if (t.status === newStatus && t.position >= newPosition) {
          t.position++;
        }
      }
    }

    ticket.status = newStatus;
    ticket.position = newPosition;
    ticket.updated_at = new Date().toISOString();

    await this.saveData(userId, data);
    return true;
  }

  // Tags
  async getTags(userId: string | null): Promise<Tag[]> {
    const data = await this.getData(userId);
    return Object.values(data.tags).sort((a, b) => a.name.localeCompare(b.name));
  }

  async createTag(userId: string | null, name: string, color = '#6b7280'): Promise<Tag> {
    const data = await this.getData(userId);
    const id = ++data.counters.tagId;

    const tag: Tag = { id, user_id: userId, name: name.toLowerCase(), color };
    data.tags[id] = tag;
    await this.saveData(userId, data);
    return tag;
  }

  async deleteTag(userId: string | null, id: number): Promise<boolean> {
    const data = await this.getData(userId);
    if (!data.tags[id]) return false;

    for (const ticket of Object.values(data.tickets)) {
      ticket.tags = ticket.tags.filter((t) => t.id !== id);
    }

    delete data.tags[id];
    await this.saveData(userId, data);
    return true;
  }
}
