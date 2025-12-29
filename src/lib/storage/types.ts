import { Project, Ticket, Tag, TicketWithTags, TicketStatus, TicketPriority } from '@/types';

export interface CreateProjectData {
  name: string;
  path: string;
  description?: string;
}

export interface UpdateProjectData {
  name?: string;
  path?: string;
  description?: string;
  is_active?: boolean;
}

export interface CreateTicketData {
  title: string;
  description?: string;
  project_id?: number | null;
  status?: TicketStatus;
  priority?: TicketPriority;
  start_date?: string | null;
  due_date?: string | null;
  tag_ids?: number[];
}

export interface UpdateTicketData {
  title?: string;
  description?: string;
  project_id?: number | null;
  status?: TicketStatus;
  priority?: TicketPriority;
  position?: number;
  start_date?: string | null;
  due_date?: string | null;
  tag_ids?: number[];
}

export interface TicketFilters {
  project_id?: number;
  status?: TicketStatus;
  tag_id?: number;
}

export interface Storage {
  // Projects - userId is null when auth is disabled (single-user mode)
  getProjects(userId: string | null, activeOnly?: boolean): Promise<Project[]>;
  getProject(userId: string | null, id: number): Promise<Project | null>;
  createProject(userId: string | null, data: CreateProjectData): Promise<Project>;
  updateProject(userId: string | null, id: number, data: UpdateProjectData): Promise<Project | null>;
  deleteProject(userId: string | null, id: number): Promise<boolean>;
  getProjectByPath(userId: string | null, path: string): Promise<Project | null>;

  // Tickets - filtered by user's projects
  getTickets(userId: string | null, filters?: TicketFilters): Promise<TicketWithTags[]>;
  getTicket(userId: string | null, id: number): Promise<TicketWithTags | null>;
  createTicket(userId: string | null, data: CreateTicketData): Promise<TicketWithTags>;
  updateTicket(userId: string | null, id: number, data: UpdateTicketData): Promise<TicketWithTags | null>;
  deleteTicket(userId: string | null, id: number): Promise<boolean>;
  reorderTicket(userId: string | null, ticketId: number, newStatus: TicketStatus, newPosition: number): Promise<boolean>;

  // Tags - per-user tags
  getTags(userId: string | null): Promise<Tag[]>;
  createTag(userId: string | null, name: string, color?: string): Promise<Tag>;
  deleteTag(userId: string | null, id: number): Promise<boolean>;
}
