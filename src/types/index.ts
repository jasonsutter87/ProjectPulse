// Database types

export interface Project {
  id: number;
  name: string;
  path: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Tag {
  id: number;
  name: string;
  color: string;
}

export type TicketStatus = 'backlog' | 'in_progress' | 'review' | 'done';
export type TicketPriority = 0 | 1 | 2 | 3; // 0=low, 1=medium, 2=high, 3=urgent

export interface Ticket {
  id: number;
  project_id: number | null;
  title: string;
  description: string | null;
  status: TicketStatus;
  priority: TicketPriority;
  position: number;
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

// Extended ticket with relations
export interface TicketWithTags extends Ticket {
  tags: Tag[];
  project?: Project | null;
}

// API request/response types

export interface CreateTicketRequest {
  title: string;
  description?: string;
  project_id?: number;
  status?: TicketStatus;
  priority?: TicketPriority;
  due_date?: string | null;
  tag_ids?: number[];
}

export interface UpdateTicketRequest {
  title?: string;
  description?: string;
  project_id?: number | null;
  status?: TicketStatus;
  priority?: TicketPriority;
  position?: number;
  due_date?: string | null;
  tag_ids?: number[];
}

export interface CreateProjectRequest {
  name: string;
  path: string;
  description?: string;
}

export interface UpdateProjectRequest {
  name?: string;
  path?: string;
  description?: string;
  is_active?: boolean;
}

export interface CreateTagRequest {
  name: string;
  color?: string;
}

// Board column configuration
export const BOARD_COLUMNS: { id: TicketStatus; title: string }[] = [
  { id: 'backlog', title: 'Backlog' },
  { id: 'in_progress', title: 'In Progress' },
  { id: 'review', title: 'Review' },
  { id: 'done', title: 'Done' },
];

// Default tags
export const DEFAULT_TAGS: { name: string; color: string }[] = [
  { name: 'dev', color: '#3b82f6' },      // blue
  { name: 'marketing', color: '#8b5cf6' }, // purple
  { name: 'seo', color: '#10b981' },       // green
  { name: 'go-live', color: '#f59e0b' },   // amber
  { name: 'bug', color: '#ef4444' },       // red
  { name: 'feature', color: '#06b6d4' },   // cyan
];

// Priority labels
export const PRIORITY_LABELS: Record<TicketPriority, string> = {
  0: 'Low',
  1: 'Medium',
  2: 'High',
  3: 'Urgent',
};

export const PRIORITY_COLORS: Record<TicketPriority, string> = {
  0: '#6b7280', // gray
  1: '#3b82f6', // blue
  2: '#f59e0b', // amber
  3: '#ef4444', // red
};
