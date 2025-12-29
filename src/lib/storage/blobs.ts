import { getStore } from '@netlify/blobs';
import { Project, Tag, TicketWithTags, TicketStatus, TicketPriority } from '@/types';
import {
  Storage,
  CreateProjectData,
  UpdateProjectData,
  CreateTicketData,
  UpdateTicketData,
  TicketFilters,
} from './types';

// Data structures for blob storage
interface BlobData {
  projects: Record<number, Project>;
  tickets: Record<number, TicketWithTags>;
  tags: Record<number, Tag>;
  counters: {
    projectId: number;
    ticketId: number;
    tagId: number;
  };
}

const STORE_NAME = 'projectpulse';
const DATA_KEY = 'data';

const DEFAULT_DATA: BlobData = {
  projects: {},
  tickets: {},
  tags: {
    1: { id: 1, name: 'dev', color: '#3b82f6' },
    2: { id: 2, name: 'marketing', color: '#8b5cf6' },
    3: { id: 3, name: 'seo', color: '#10b981' },
    4: { id: 4, name: 'go-live', color: '#f59e0b' },
    5: { id: 5, name: 'bug', color: '#ef4444' },
    6: { id: 6, name: 'feature', color: '#06b6d4' },
  },
  counters: { projectId: 0, ticketId: 0, tagId: 6 },
};

export class BlobStorage implements Storage {
  private async getData(): Promise<BlobData> {
    try {
      const store = getStore(STORE_NAME);
      const data = await store.get(DATA_KEY, { type: 'json' });
      return (data as BlobData) || { ...DEFAULT_DATA };
    } catch {
      return { ...DEFAULT_DATA };
    }
  }

  private async saveData(data: BlobData): Promise<void> {
    const store = getStore(STORE_NAME);
    await store.setJSON(DATA_KEY, data);
  }

  // Projects
  async getProjects(activeOnly = false): Promise<Project[]> {
    const data = await this.getData();
    let projects = Object.values(data.projects);
    if (activeOnly) {
      projects = projects.filter((p) => p.is_active);
    }
    return projects.sort((a, b) => a.name.localeCompare(b.name));
  }

  async getProject(id: number): Promise<Project | null> {
    const data = await this.getData();
    return data.projects[id] || null;
  }

  async getProjectByPath(path: string): Promise<Project | null> {
    const data = await this.getData();
    return Object.values(data.projects).find((p) => p.path === path) || null;
  }

  async createProject(input: CreateProjectData): Promise<Project> {
    const data = await this.getData();
    const id = ++data.counters.projectId;
    const now = new Date().toISOString();

    const project: Project = {
      id,
      name: input.name,
      path: input.path,
      description: input.description || null,
      is_active: true,
      created_at: now,
      updated_at: now,
    };

    data.projects[id] = project;
    await this.saveData(data);
    return project;
  }

  async updateProject(id: number, input: UpdateProjectData): Promise<Project | null> {
    const data = await this.getData();
    const project = data.projects[id];
    if (!project) return null;

    if (input.name !== undefined) project.name = input.name;
    if (input.path !== undefined) project.path = input.path;
    if (input.description !== undefined) project.description = input.description;
    if (input.is_active !== undefined) project.is_active = input.is_active;
    project.updated_at = new Date().toISOString();

    data.projects[id] = project;
    await this.saveData(data);
    return project;
  }

  async deleteProject(id: number): Promise<boolean> {
    const data = await this.getData();
    if (!data.projects[id]) return false;

    // Delete associated tickets
    for (const ticketId of Object.keys(data.tickets)) {
      if (data.tickets[Number(ticketId)].project_id === id) {
        delete data.tickets[Number(ticketId)];
      }
    }

    delete data.projects[id];
    await this.saveData(data);
    return true;
  }

  // Tickets
  async getTickets(filters?: TicketFilters): Promise<TicketWithTags[]> {
    const data = await this.getData();
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

    // Add project data
    tickets = tickets.map((t) => ({
      ...t,
      project: t.project_id ? data.projects[t.project_id] || null : null,
    }));

    return tickets.sort((a, b) => {
      if (a.status !== b.status) return a.status.localeCompare(b.status);
      return a.position - b.position;
    });
  }

  async getTicket(id: number): Promise<TicketWithTags | null> {
    const data = await this.getData();
    const ticket = data.tickets[id];
    if (!ticket) return null;

    return {
      ...ticket,
      project: ticket.project_id ? data.projects[ticket.project_id] || null : null,
    };
  }

  async createTicket(input: CreateTicketData): Promise<TicketWithTags> {
    const data = await this.getData();
    const id = ++data.counters.ticketId;
    const now = new Date().toISOString();
    const status = input.status || 'backlog';

    // Calculate position
    const sameStatusTickets = Object.values(data.tickets).filter((t) => t.status === status);
    const position = sameStatusTickets.length;

    // Get tag objects
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
      created_at: now,
      updated_at: now,
      tags,
      project: input.project_id ? data.projects[input.project_id] || null : null,
    };

    data.tickets[id] = ticket;
    await this.saveData(data);
    return ticket;
  }

  async updateTicket(id: number, input: UpdateTicketData): Promise<TicketWithTags | null> {
    const data = await this.getData();
    const ticket = data.tickets[id];
    if (!ticket) return null;

    if (input.title !== undefined) ticket.title = input.title;
    if (input.description !== undefined) ticket.description = input.description;
    if (input.project_id !== undefined) ticket.project_id = input.project_id;
    if (input.status !== undefined) ticket.status = input.status;
    if (input.priority !== undefined) ticket.priority = input.priority;
    if (input.position !== undefined) ticket.position = input.position;
    if (input.tag_ids !== undefined) {
      ticket.tags = input.tag_ids.map((tagId) => data.tags[tagId]).filter(Boolean);
    }

    ticket.updated_at = new Date().toISOString();
    ticket.project = ticket.project_id ? data.projects[ticket.project_id] || null : null;

    data.tickets[id] = ticket;
    await this.saveData(data);
    return ticket;
  }

  async deleteTicket(id: number): Promise<boolean> {
    const data = await this.getData();
    if (!data.tickets[id]) return false;

    delete data.tickets[id];
    await this.saveData(data);
    return true;
  }

  async reorderTicket(ticketId: number, newStatus: TicketStatus, newPosition: number): Promise<boolean> {
    const data = await this.getData();
    const ticket = data.tickets[ticketId];
    if (!ticket) return false;

    const oldStatus = ticket.status;
    const oldPosition = ticket.position;

    // Update positions of other tickets
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

    await this.saveData(data);
    return true;
  }

  // Tags
  async getTags(): Promise<Tag[]> {
    const data = await this.getData();
    return Object.values(data.tags).sort((a, b) => a.name.localeCompare(b.name));
  }

  async createTag(name: string, color = '#6b7280'): Promise<Tag> {
    const data = await this.getData();
    const id = ++data.counters.tagId;

    const tag: Tag = { id, name: name.toLowerCase(), color };
    data.tags[id] = tag;
    await this.saveData(data);
    return tag;
  }

  async deleteTag(id: number): Promise<boolean> {
    const data = await this.getData();
    if (!data.tags[id]) return false;

    // Remove tag from all tickets
    for (const ticket of Object.values(data.tickets)) {
      ticket.tags = ticket.tags.filter((t) => t.id !== id);
    }

    delete data.tags[id];
    await this.saveData(data);
    return true;
  }
}
