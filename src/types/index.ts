// Database types

export interface Project {
  id: number;
  user_id: string | null;
  name: string;
  path: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Tag {
  id: number;
  user_id: string | null;
  name: string;
  color: string;
}

export type TicketStatus = 'backlog' | 'in_progress' | 'review' | 'done';
export type TicketPriority = 0 | 1 | 2 | 3; // 0=low, 1=medium, 2=high, 3=urgent

export interface Ticket {
  id: number;
  project_id: number | null;
  phase_id: number | null;
  sprint_id: number | null;
  title: string;
  description: string | null;
  status: TicketStatus;
  priority: TicketPriority;
  position: number;
  start_date: string | null;
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

// Phase types
export type PhaseStatus = 'planning' | 'active' | 'completed' | 'archived';

export interface Phase {
  id: number;
  project_id: number;
  name: string;
  description: string | null;
  position: number;
  status: PhaseStatus;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface PhaseWithSprints extends Phase {
  sprints: Sprint[];
  ticket_count: number;
}

// Sprint types
export type SprintStatus = 'planning' | 'active' | 'completed' | 'archived';
export type OrchestratorStatus = 'idle' | 'initializing' | 'running' | 'paused' | 'completed' | 'failed';

// Orchestrator step tracking (matches sprint-phase.md workflow)
export type OrchestratorStep =
  | 'branch'        // 1. Create sprint branch
  | 'planning'      // 2. Tech Lead planning
  | 'parallel_dev'  // 3. API Architect, Senior Dev, QA, Purple Team
  | 'merge'         // 4. Merge all branches
  | 'performance'   // 5. Performance audit
  | 'docs'          // 6. Documentation
  | 'janitor'       // 7. Code cleanup
  | 'security'      // 8. Red Team + Black Team loop
  | 'final';        // 9. Final review & merge

// Checkpoint data structure for resumability
export interface OrchestratorCheckpoint {
  step: OrchestratorStep;
  substep: string | null;  // e.g., 'senior_dev' during parallel_dev
  context_tokens_used: number;
  last_agent_output: string | null;
  security_loop_count: number;
  red_team_score: number | null;
  blockers: string[];
}

export interface Sprint {
  id: number;
  phase_id: number;
  name: string;
  description: string | null;
  position: number;
  status: SprintStatus;
  goal: string | null;
  start_date: string | null;
  end_date: string | null;
  // Orchestrator config
  target_repo_path: string | null;
  target_repo_url: string | null;
  base_branch: string;
  sprint_branch: string | null;
  // Orchestrator state
  orchestrator_status: OrchestratorStatus;
  orchestrator_stage: string | null;
  orchestrator_progress: number;
  orchestrator_error: string | null;
  // Checkpoint for resumability
  current_step: OrchestratorStep | null;
  current_substep: string | null;
  checkpoint_data: string | null;  // JSON string of OrchestratorCheckpoint
  last_checkpoint_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SprintWithDetails extends Sprint {
  phase?: Phase;
  agent_runs: AgentRun[];
  quality_gates: QualityGate[];
  ticket_count: number;
}

// Agent run tracking
export type AgentType =
  | 'tech_lead'
  | 'api_architect'
  | 'senior_dev'
  | 'qa'
  | 'purple_team'
  | 'performance'
  | 'docs_writer'
  | 'code_janitor'
  | 'red_team'
  | 'black_team';

export type AgentRunStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';

export interface AgentRun {
  id: number;
  sprint_id: number;
  agent_name: string;
  agent_type: AgentType;
  status: AgentRunStatus;
  branch_name: string | null;
  started_at: string | null;
  completed_at: string | null;
  output_summary: string | null;
  error_message: string | null;
  created_at: string;
}

// Quality gates
export type GateType = 'automated' | 'manual';
export type GateStatus = 'pending' | 'passed' | 'failed' | 'skipped';

export interface QualityGate {
  id: number;
  sprint_id: number;
  gate_name: string;
  gate_type: GateType;
  status: GateStatus;
  score: number | null;
  max_score: number | null;
  passed_at: string | null;
  details: string | null;
  created_at: string;
}

// Extended ticket with relations
export interface TicketWithTags extends Ticket {
  tags: Tag[];
  project?: Project | null;
  phase?: Phase | null;
  sprint?: Sprint | null;
}

// API request/response types

export interface CreateTicketRequest {
  title: string;
  description?: string;
  project_id?: number;
  phase_id?: number;
  sprint_id?: number;
  status?: TicketStatus;
  priority?: TicketPriority;
  start_date?: string | null;
  due_date?: string | null;
  tag_ids?: number[];
}

export interface UpdateTicketRequest {
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

// Phase request types
export interface CreatePhaseRequest {
  project_id: number;
  name: string;
  description?: string;
  status?: PhaseStatus;
  start_date?: string;
  end_date?: string;
}

export interface UpdatePhaseRequest {
  name?: string;
  description?: string;
  status?: PhaseStatus;
  position?: number;
  start_date?: string | null;
  end_date?: string | null;
}

// Sprint request types
export interface CreateSprintRequest {
  phase_id: number;
  name: string;
  description?: string;
  goal?: string;
  status?: SprintStatus;
  start_date?: string;
  end_date?: string;
}

export interface UpdateSprintRequest {
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
  // Orchestrator state updates
  orchestrator_status?: OrchestratorStatus;
  orchestrator_stage?: string | null;
  orchestrator_progress?: number;
  orchestrator_error?: string | null;
  // Checkpoint updates
  current_step?: OrchestratorStep | null;
  current_substep?: string | null;
  checkpoint_data?: string | null;
  last_checkpoint_at?: string | null;
}

// Orchestrator request types
export interface ConfigureSprintOrchestratorRequest {
  target_repo_path?: string;
  target_repo_url?: string;
  base_branch?: string;
}

export interface CreateAgentRunRequest {
  sprint_id: number;
  agent_name: string;
  agent_type: AgentType;
  branch_name?: string;
}

export interface UpdateAgentRunRequest {
  status?: AgentRunStatus;
  started_at?: string;
  completed_at?: string;
  output_summary?: string;
  error_message?: string;
}

export interface CreateQualityGateRequest {
  sprint_id: number;
  gate_name: string;
  gate_type: GateType;
  max_score?: number;
}

export interface UpdateQualityGateRequest {
  status?: GateStatus;
  score?: number;
  passed_at?: string;
  details?: string;
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
