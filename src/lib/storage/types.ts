import {
  Project,
  Tag,
  TicketWithTags,
  TicketStatus,
  TicketPriority,
  Phase,
  PhaseWithSprints,
  PhaseStatus,
  Sprint,
  SprintWithDetails,
  SprintStatus,
  OrchestratorStatus,
  AgentRun,
  AgentType,
  AgentRunStatus,
  QualityGate,
  GateType,
  GateStatus,
} from '@/types';

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
  phase_id?: number | null;
  sprint_id?: number | null;
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
  phase_id?: number | null;
  sprint_id?: number | null;
  status?: TicketStatus;
  priority?: TicketPriority;
  position?: number;
  start_date?: string | null;
  due_date?: string | null;
  tag_ids?: number[];
}

export interface TicketFilters {
  project_id?: number;
  phase_id?: number;
  sprint_id?: number;
  status?: TicketStatus;
  tag_id?: number;
}

// Phase data interfaces
export interface CreatePhaseData {
  project_id: number;
  name: string;
  description?: string;
  status?: PhaseStatus;
  start_date?: string;
  end_date?: string;
}

export interface UpdatePhaseData {
  name?: string;
  description?: string;
  status?: PhaseStatus;
  position?: number;
  start_date?: string | null;
  end_date?: string | null;
}

// Sprint data interfaces
export interface CreateSprintData {
  phase_id: number;
  name: string;
  description?: string;
  goal?: string;
  status?: SprintStatus;
  start_date?: string;
  end_date?: string;
}

export interface UpdateSprintData {
  name?: string;
  description?: string;
  goal?: string;
  status?: SprintStatus;
  position?: number;
  start_date?: string | null;
  end_date?: string | null;
  target_repo_path?: string | null;
  target_repo_url?: string | null;
  base_branch?: string;
  sprint_branch?: string | null;
  orchestrator_status?: OrchestratorStatus;
  orchestrator_stage?: string | null;
  orchestrator_progress?: number;
  orchestrator_error?: string | null;
}

// Agent run data interfaces
export interface CreateAgentRunData {
  sprint_id: number;
  agent_name: string;
  agent_type: AgentType;
  branch_name?: string;
}

export interface UpdateAgentRunData {
  status?: AgentRunStatus;
  branch_name?: string;
  started_at?: string;
  completed_at?: string;
  output_summary?: string;
  error_message?: string;
}

// Quality gate data interfaces
export interface CreateQualityGateData {
  sprint_id: number;
  gate_name: string;
  gate_type: GateType;
  max_score?: number;
}

export interface UpdateQualityGateData {
  status?: GateStatus;
  score?: number;
  passed_at?: string;
  details?: string;
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

  // Phases
  getPhases(userId: string | null, projectId: number): Promise<PhaseWithSprints[]>;
  getPhase(userId: string | null, id: number): Promise<PhaseWithSprints | null>;
  createPhase(userId: string | null, data: CreatePhaseData): Promise<Phase>;
  updatePhase(userId: string | null, id: number, data: UpdatePhaseData): Promise<Phase | null>;
  deletePhase(userId: string | null, id: number): Promise<boolean>;
  reorderPhases(userId: string | null, projectId: number, phaseIds: number[]): Promise<boolean>;

  // Sprints
  getSprints(userId: string | null, phaseId: number): Promise<SprintWithDetails[]>;
  getSprint(userId: string | null, id: number): Promise<SprintWithDetails | null>;
  createSprint(userId: string | null, data: CreateSprintData): Promise<Sprint>;
  updateSprint(userId: string | null, id: number, data: UpdateSprintData): Promise<Sprint | null>;
  deleteSprint(userId: string | null, id: number): Promise<boolean>;
  reorderSprints(userId: string | null, phaseId: number, sprintIds: number[]): Promise<boolean>;

  // Agent Runs
  getAgentRuns(userId: string | null, sprintId: number): Promise<AgentRun[]>;
  createAgentRun(userId: string | null, data: CreateAgentRunData): Promise<AgentRun>;
  updateAgentRun(userId: string | null, id: number, data: UpdateAgentRunData): Promise<AgentRun | null>;

  // Quality Gates
  getQualityGates(userId: string | null, sprintId: number): Promise<QualityGate[]>;
  createQualityGate(userId: string | null, data: CreateQualityGateData): Promise<QualityGate>;
  updateQualityGate(userId: string | null, id: number, data: UpdateQualityGateData): Promise<QualityGate | null>;
}
