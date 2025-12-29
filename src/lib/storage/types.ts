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
  due_date?: string | null;
  tag_ids?: number[];
}

export interface TicketFilters {
  project_id?: number;
  status?: TicketStatus;
  tag_id?: number;
}

export interface Storage {
  // Projects
  getProjects(activeOnly?: boolean): Promise<Project[]>;
  getProject(id: number): Promise<Project | null>;
  createProject(data: CreateProjectData): Promise<Project>;
  updateProject(id: number, data: UpdateProjectData): Promise<Project | null>;
  deleteProject(id: number): Promise<boolean>;
  getProjectByPath(path: string): Promise<Project | null>;

  // Tickets
  getTickets(filters?: TicketFilters): Promise<TicketWithTags[]>;
  getTicket(id: number): Promise<TicketWithTags | null>;
  createTicket(data: CreateTicketData): Promise<TicketWithTags>;
  updateTicket(id: number, data: UpdateTicketData): Promise<TicketWithTags | null>;
  deleteTicket(id: number): Promise<boolean>;
  reorderTicket(ticketId: number, newStatus: TicketStatus, newPosition: number): Promise<boolean>;

  // Tags
  getTags(): Promise<Tag[]>;
  createTag(name: string, color?: string): Promise<Tag>;
  deleteTag(id: number): Promise<boolean>;
}
