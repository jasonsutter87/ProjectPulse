import { getStore } from '@netlify/blobs';
import {
  Project,
  Tag,
  TicketWithTags,
  TicketStatus,
  TicketPriority,
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

// Data structures for blob storage
interface BlobData {
  projects: Record<number, Project>;
  tickets: Record<number, TicketWithTags>;
  tags: Record<number, Tag>;
  phases: Record<number, Phase>;
  sprints: Record<number, Sprint>;
  agentRuns: Record<number, AgentRun>;
  qualityGates: Record<number, QualityGate>;
  counters: {
    projectId: number;
    ticketId: number;
    tagId: number;
    phaseId: number;
    sprintId: number;
    agentRunId: number;
    qualityGateId: number;
  };
}

const STORE_NAME = 'projectpulse';

function getDataKey(userId: string | null): string {
  // Each user gets their own data key for isolation
  if (userId) {
    return `users/${userId}/data`;
  }
  // Single-user mode (auth disabled) uses the root data key
  return 'data';
}

function getDefaultData(userId: string | null): BlobData {
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
    phases: {},
    sprints: {},
    agentRuns: {},
    qualityGates: {},
    counters: {
      projectId: 0,
      ticketId: 0,
      tagId: 6,
      phaseId: 0,
      sprintId: 0,
      agentRunId: 0,
      qualityGateId: 0,
    },
  };
}

export class BlobStorage implements Storage {
  private async getData(userId: string | null): Promise<BlobData> {
    try {
      const store = getStore(STORE_NAME);
      const dataKey = getDataKey(userId);
      const data = await store.get(dataKey, { type: 'json' });
      return (data as BlobData) || getDefaultData(userId);
    } catch {
      return getDefaultData(userId);
    }
  }

  private async saveData(userId: string | null, data: BlobData): Promise<void> {
    const store = getStore(STORE_NAME);
    const dataKey = getDataKey(userId);
    await store.setJSON(dataKey, data);
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

    // Delete associated tickets
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
    if (filters?.phase_id) {
      tickets = tickets.filter((t) => t.phase_id === filters.phase_id);
    }
    if (filters?.sprint_id) {
      tickets = tickets.filter((t) => t.sprint_id === filters.sprint_id);
    }
    if (filters?.status) {
      tickets = tickets.filter((t) => t.status === filters.status);
    }
    if (filters?.tag_id) {
      tickets = tickets.filter((t) => t.tags.some((tag) => tag.id === filters.tag_id));
    }

    // Add related data
    tickets = tickets.map((t) => ({
      ...t,
      project: t.project_id ? data.projects[t.project_id] || null : null,
      phase: t.phase_id ? data.phases[t.phase_id] || null : null,
      sprint: t.sprint_id ? data.sprints[t.sprint_id] || null : null,
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
      phase: ticket.phase_id ? data.phases[ticket.phase_id] || null : null,
      sprint: ticket.sprint_id ? data.sprints[ticket.sprint_id] || null : null,
    };
  }

  async createTicket(userId: string | null, input: CreateTicketData): Promise<TicketWithTags> {
    const data = await this.getData(userId);
    const id = ++data.counters.ticketId;
    const now = new Date().toISOString();
    const status = input.status || 'backlog';

    // Verify project belongs to user if project_id is provided
    if (input.project_id && !data.projects[input.project_id]) {
      throw new Error('Project not found or access denied');
    }

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
      phase_id: input.phase_id || null,
      sprint_id: input.sprint_id || null,
      status: status as TicketStatus,
      priority: (input.priority || 0) as TicketPriority,
      position,
      start_date: input.start_date || null,
      due_date: input.due_date || null,
      created_at: now,
      updated_at: now,
      tags,
      project: input.project_id ? data.projects[input.project_id] || null : null,
      phase: input.phase_id ? data.phases[input.phase_id] || null : null,
      sprint: input.sprint_id ? data.sprints[input.sprint_id] || null : null,
    };

    data.tickets[id] = ticket;
    await this.saveData(userId, data);
    return ticket;
  }

  async updateTicket(userId: string | null, id: number, input: UpdateTicketData): Promise<TicketWithTags | null> {
    const data = await this.getData(userId);
    const ticket = data.tickets[id];
    if (!ticket) return null;

    // Verify new project belongs to user if changing project_id
    if (input.project_id !== undefined && input.project_id !== null && !data.projects[input.project_id]) {
      throw new Error('Project not found or access denied');
    }

    if (input.title !== undefined) ticket.title = input.title;
    if (input.description !== undefined) ticket.description = input.description;
    if (input.project_id !== undefined) ticket.project_id = input.project_id;
    if (input.phase_id !== undefined) ticket.phase_id = input.phase_id;
    if (input.sprint_id !== undefined) ticket.sprint_id = input.sprint_id;
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
    ticket.phase = ticket.phase_id ? data.phases[ticket.phase_id] || null : null;
    ticket.sprint = ticket.sprint_id ? data.sprints[ticket.sprint_id] || null : null;

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

    // Remove tag from all tickets
    for (const ticket of Object.values(data.tickets)) {
      ticket.tags = ticket.tags.filter((t) => t.id !== id);
    }

    delete data.tags[id];
    await this.saveData(userId, data);
    return true;
  }

  // Phases
  async getPhases(userId: string | null, projectId: number): Promise<PhaseWithSprints[]> {
    const data = await this.getData(userId);

    // Verify project access
    if (!data.projects[projectId]) {
      return [];
    }

    const phases = Object.values(data.phases)
      .filter((p) => p.project_id === projectId)
      .sort((a, b) => a.position - b.position);

    return phases.map((phase) => {
      const sprints = Object.values(data.sprints)
        .filter((s) => s.phase_id === phase.id)
        .sort((a, b) => a.position - b.position);
      const ticketCount = Object.values(data.tickets).filter((t) => t.phase_id === phase.id).length;

      return {
        ...phase,
        sprints,
        ticket_count: ticketCount,
      };
    });
  }

  async getPhase(userId: string | null, id: number): Promise<PhaseWithSprints | null> {
    const data = await this.getData(userId);
    const phase = data.phases[id];
    if (!phase) return null;

    // Verify project access
    if (!data.projects[phase.project_id]) {
      return null;
    }

    const sprints = Object.values(data.sprints)
      .filter((s) => s.phase_id === phase.id)
      .sort((a, b) => a.position - b.position);
    const ticketCount = Object.values(data.tickets).filter((t) => t.phase_id === phase.id).length;

    return {
      ...phase,
      sprints,
      ticket_count: ticketCount,
    };
  }

  async createPhase(userId: string | null, input: CreatePhaseData): Promise<Phase> {
    const data = await this.getData(userId);

    // Verify project access
    if (!data.projects[input.project_id]) {
      throw new Error('Project not found or access denied');
    }

    const id = ++data.counters.phaseId;
    const now = new Date().toISOString();

    // Get next position
    const existingPhases = Object.values(data.phases).filter((p) => p.project_id === input.project_id);
    const position = existingPhases.length;

    const phase: Phase = {
      id,
      project_id: input.project_id,
      name: input.name,
      description: input.description || null,
      position,
      status: input.status || 'planning',
      start_date: input.start_date || null,
      end_date: input.end_date || null,
      created_at: now,
      updated_at: now,
    };

    data.phases[id] = phase;
    await this.saveData(userId, data);
    return phase;
  }

  async updatePhase(userId: string | null, id: number, input: UpdatePhaseData): Promise<Phase | null> {
    const data = await this.getData(userId);
    const phase = data.phases[id];
    if (!phase) return null;

    // Verify project access
    if (!data.projects[phase.project_id]) {
      return null;
    }

    if (input.name !== undefined) phase.name = input.name;
    if (input.description !== undefined) phase.description = input.description;
    if (input.status !== undefined) phase.status = input.status;
    if (input.position !== undefined) phase.position = input.position;
    if (input.start_date !== undefined) phase.start_date = input.start_date;
    if (input.end_date !== undefined) phase.end_date = input.end_date;
    phase.updated_at = new Date().toISOString();

    data.phases[id] = phase;
    await this.saveData(userId, data);
    return phase;
  }

  async deletePhase(userId: string | null, id: number): Promise<boolean> {
    const data = await this.getData(userId);
    const phase = data.phases[id];
    if (!phase) return false;

    // Verify project access
    if (!data.projects[phase.project_id]) {
      return false;
    }

    // Delete associated sprints and their agent runs/quality gates
    for (const sprint of Object.values(data.sprints)) {
      if (sprint.phase_id === id) {
        // Delete agent runs
        for (const runId of Object.keys(data.agentRuns)) {
          if (data.agentRuns[Number(runId)].sprint_id === sprint.id) {
            delete data.agentRuns[Number(runId)];
          }
        }
        // Delete quality gates
        for (const gateId of Object.keys(data.qualityGates)) {
          if (data.qualityGates[Number(gateId)].sprint_id === sprint.id) {
            delete data.qualityGates[Number(gateId)];
          }
        }
        delete data.sprints[sprint.id];
      }
    }

    // Update tickets to remove phase reference
    for (const ticket of Object.values(data.tickets)) {
      if (ticket.phase_id === id) {
        ticket.phase_id = null;
        ticket.sprint_id = null;
      }
    }

    delete data.phases[id];
    await this.saveData(userId, data);
    return true;
  }

  async reorderPhases(userId: string | null, projectId: number, phaseIds: number[]): Promise<boolean> {
    const data = await this.getData(userId);

    // Verify project access
    if (!data.projects[projectId]) {
      return false;
    }

    phaseIds.forEach((phaseId, index) => {
      const phase = data.phases[phaseId];
      if (phase && phase.project_id === projectId) {
        phase.position = index;
        phase.updated_at = new Date().toISOString();
      }
    });

    await this.saveData(userId, data);
    return true;
  }

  // Sprints
  async getSprints(userId: string | null, phaseId: number): Promise<SprintWithDetails[]> {
    const data = await this.getData(userId);
    const phase = data.phases[phaseId];
    if (!phase) return [];

    // Verify project access
    if (!data.projects[phase.project_id]) {
      return [];
    }

    const sprints = Object.values(data.sprints)
      .filter((s) => s.phase_id === phaseId)
      .sort((a, b) => a.position - b.position);

    return sprints.map((sprint) => {
      const agentRuns = Object.values(data.agentRuns)
        .filter((r) => r.sprint_id === sprint.id)
        .sort((a, b) => a.id - b.id);
      const qualityGates = Object.values(data.qualityGates)
        .filter((g) => g.sprint_id === sprint.id)
        .sort((a, b) => a.id - b.id);
      const ticketCount = Object.values(data.tickets).filter((t) => t.sprint_id === sprint.id).length;

      return {
        ...sprint,
        phase,
        agent_runs: agentRuns,
        quality_gates: qualityGates,
        ticket_count: ticketCount,
      };
    });
  }

  async getSprint(userId: string | null, id: number): Promise<SprintWithDetails | null> {
    const data = await this.getData(userId);
    const sprint = data.sprints[id];
    if (!sprint) return null;

    const phase = data.phases[sprint.phase_id];
    if (!phase) return null;

    // Verify project access
    if (!data.projects[phase.project_id]) {
      return null;
    }

    const agentRuns = Object.values(data.agentRuns)
      .filter((r) => r.sprint_id === sprint.id)
      .sort((a, b) => a.id - b.id);
    const qualityGates = Object.values(data.qualityGates)
      .filter((g) => g.sprint_id === sprint.id)
      .sort((a, b) => a.id - b.id);
    const ticketCount = Object.values(data.tickets).filter((t) => t.sprint_id === sprint.id).length;

    return {
      ...sprint,
      phase,
      agent_runs: agentRuns,
      quality_gates: qualityGates,
      ticket_count: ticketCount,
    };
  }

  async createSprint(userId: string | null, input: CreateSprintData): Promise<Sprint> {
    const data = await this.getData(userId);
    const phase = data.phases[input.phase_id];
    if (!phase) {
      throw new Error('Phase not found');
    }

    // Verify project access
    if (!data.projects[phase.project_id]) {
      throw new Error('Project not found or access denied');
    }

    const id = ++data.counters.sprintId;
    const now = new Date().toISOString();

    // Get next position
    const existingSprints = Object.values(data.sprints).filter((s) => s.phase_id === input.phase_id);
    const position = existingSprints.length;

    const sprint: Sprint = {
      id,
      phase_id: input.phase_id,
      name: input.name,
      description: input.description || null,
      position,
      status: input.status || 'planning',
      goal: input.goal || null,
      start_date: input.start_date || null,
      end_date: input.end_date || null,
      target_repo_path: null,
      target_repo_url: null,
      base_branch: 'main',
      sprint_branch: null,
      orchestrator_status: 'idle',
      orchestrator_stage: null,
      orchestrator_progress: 0,
      orchestrator_error: null,
      // Checkpoint fields
      current_step: null,
      current_substep: null,
      checkpoint_data: null,
      last_checkpoint_at: null,
      created_at: now,
      updated_at: now,
    };

    data.sprints[id] = sprint;
    await this.saveData(userId, data);
    return sprint;
  }

  async updateSprint(userId: string | null, id: number, input: UpdateSprintData): Promise<Sprint | null> {
    const data = await this.getData(userId);
    const sprint = data.sprints[id];
    if (!sprint) return null;

    const phase = data.phases[sprint.phase_id];
    if (!phase) return null;

    // Verify project access
    if (!data.projects[phase.project_id]) {
      return null;
    }

    if (input.name !== undefined) sprint.name = input.name;
    if (input.description !== undefined) sprint.description = input.description;
    if (input.goal !== undefined) sprint.goal = input.goal;
    if (input.status !== undefined) sprint.status = input.status;
    if (input.position !== undefined) sprint.position = input.position;
    if (input.start_date !== undefined) sprint.start_date = input.start_date;
    if (input.end_date !== undefined) sprint.end_date = input.end_date;
    if (input.target_repo_path !== undefined) sprint.target_repo_path = input.target_repo_path;
    if (input.target_repo_url !== undefined) sprint.target_repo_url = input.target_repo_url;
    if (input.base_branch !== undefined) sprint.base_branch = input.base_branch;
    if (input.sprint_branch !== undefined) sprint.sprint_branch = input.sprint_branch;
    if (input.orchestrator_status !== undefined) sprint.orchestrator_status = input.orchestrator_status;
    if (input.orchestrator_stage !== undefined) sprint.orchestrator_stage = input.orchestrator_stage;
    if (input.orchestrator_progress !== undefined) sprint.orchestrator_progress = input.orchestrator_progress;
    if (input.orchestrator_error !== undefined) sprint.orchestrator_error = input.orchestrator_error;
    // Checkpoint fields for resumability
    if (input.current_step !== undefined) sprint.current_step = input.current_step;
    if (input.current_substep !== undefined) sprint.current_substep = input.current_substep;
    if (input.checkpoint_data !== undefined) sprint.checkpoint_data = input.checkpoint_data;
    if (input.last_checkpoint_at !== undefined) sprint.last_checkpoint_at = input.last_checkpoint_at;
    sprint.updated_at = new Date().toISOString();

    data.sprints[id] = sprint;
    await this.saveData(userId, data);
    return sprint;
  }

  async deleteSprint(userId: string | null, id: number): Promise<boolean> {
    const data = await this.getData(userId);
    const sprint = data.sprints[id];
    if (!sprint) return false;

    const phase = data.phases[sprint.phase_id];
    if (!phase) return false;

    // Verify project access
    if (!data.projects[phase.project_id]) {
      return false;
    }

    // Delete associated agent runs and quality gates
    for (const runId of Object.keys(data.agentRuns)) {
      if (data.agentRuns[Number(runId)].sprint_id === id) {
        delete data.agentRuns[Number(runId)];
      }
    }
    for (const gateId of Object.keys(data.qualityGates)) {
      if (data.qualityGates[Number(gateId)].sprint_id === id) {
        delete data.qualityGates[Number(gateId)];
      }
    }

    // Update tickets to remove sprint reference
    for (const ticket of Object.values(data.tickets)) {
      if (ticket.sprint_id === id) {
        ticket.sprint_id = null;
      }
    }

    delete data.sprints[id];
    await this.saveData(userId, data);
    return true;
  }

  async reorderSprints(userId: string | null, phaseId: number, sprintIds: number[]): Promise<boolean> {
    const data = await this.getData(userId);
    const phase = data.phases[phaseId];
    if (!phase) return false;

    // Verify project access
    if (!data.projects[phase.project_id]) {
      return false;
    }

    sprintIds.forEach((sprintId, index) => {
      const sprint = data.sprints[sprintId];
      if (sprint && sprint.phase_id === phaseId) {
        sprint.position = index;
        sprint.updated_at = new Date().toISOString();
      }
    });

    await this.saveData(userId, data);
    return true;
  }

  // Agent Runs
  async getAgentRuns(userId: string | null, sprintId: number): Promise<AgentRun[]> {
    const data = await this.getData(userId);
    const sprint = data.sprints[sprintId];
    if (!sprint) return [];

    const phase = data.phases[sprint.phase_id];
    if (!phase) return [];

    // Verify project access
    if (!data.projects[phase.project_id]) {
      return [];
    }

    return Object.values(data.agentRuns)
      .filter((r) => r.sprint_id === sprintId)
      .sort((a, b) => a.id - b.id);
  }

  async createAgentRun(userId: string | null, input: CreateAgentRunData): Promise<AgentRun> {
    const data = await this.getData(userId);
    const sprint = data.sprints[input.sprint_id];
    if (!sprint) {
      throw new Error('Sprint not found');
    }

    const phase = data.phases[sprint.phase_id];
    if (!phase) {
      throw new Error('Phase not found');
    }

    // Verify project access
    if (!data.projects[phase.project_id]) {
      throw new Error('Project not found or access denied');
    }

    const id = ++data.counters.agentRunId;
    const now = new Date().toISOString();

    const agentRun: AgentRun = {
      id,
      sprint_id: input.sprint_id,
      agent_name: input.agent_name,
      agent_type: input.agent_type,
      status: 'pending',
      branch_name: input.branch_name || null,
      started_at: null,
      completed_at: null,
      output_summary: null,
      error_message: null,
      created_at: now,
    };

    data.agentRuns[id] = agentRun;
    await this.saveData(userId, data);
    return agentRun;
  }

  async updateAgentRun(userId: string | null, id: number, input: UpdateAgentRunData): Promise<AgentRun | null> {
    const data = await this.getData(userId);
    const agentRun = data.agentRuns[id];
    if (!agentRun) return null;

    const sprint = data.sprints[agentRun.sprint_id];
    if (!sprint) return null;

    const phase = data.phases[sprint.phase_id];
    if (!phase) return null;

    // Verify project access
    if (!data.projects[phase.project_id]) {
      return null;
    }

    if (input.status !== undefined) agentRun.status = input.status;
    if (input.branch_name !== undefined) agentRun.branch_name = input.branch_name;
    if (input.started_at !== undefined) agentRun.started_at = input.started_at;
    if (input.completed_at !== undefined) agentRun.completed_at = input.completed_at;
    if (input.output_summary !== undefined) agentRun.output_summary = input.output_summary;
    if (input.error_message !== undefined) agentRun.error_message = input.error_message;

    data.agentRuns[id] = agentRun;
    await this.saveData(userId, data);
    return agentRun;
  }

  // Quality Gates
  async getQualityGates(userId: string | null, sprintId: number): Promise<QualityGate[]> {
    const data = await this.getData(userId);
    const sprint = data.sprints[sprintId];
    if (!sprint) return [];

    const phase = data.phases[sprint.phase_id];
    if (!phase) return [];

    // Verify project access
    if (!data.projects[phase.project_id]) {
      return [];
    }

    return Object.values(data.qualityGates)
      .filter((g) => g.sprint_id === sprintId)
      .sort((a, b) => a.id - b.id);
  }

  async createQualityGate(userId: string | null, input: CreateQualityGateData): Promise<QualityGate> {
    const data = await this.getData(userId);
    const sprint = data.sprints[input.sprint_id];
    if (!sprint) {
      throw new Error('Sprint not found');
    }

    const phase = data.phases[sprint.phase_id];
    if (!phase) {
      throw new Error('Phase not found');
    }

    // Verify project access
    if (!data.projects[phase.project_id]) {
      throw new Error('Project not found or access denied');
    }

    const id = ++data.counters.qualityGateId;
    const now = new Date().toISOString();

    const qualityGate: QualityGate = {
      id,
      sprint_id: input.sprint_id,
      gate_name: input.gate_name,
      gate_type: input.gate_type,
      status: 'pending',
      score: null,
      max_score: input.max_score || null,
      passed_at: null,
      details: null,
      created_at: now,
    };

    data.qualityGates[id] = qualityGate;
    await this.saveData(userId, data);
    return qualityGate;
  }

  async updateQualityGate(userId: string | null, id: number, input: UpdateQualityGateData): Promise<QualityGate | null> {
    const data = await this.getData(userId);
    const qualityGate = data.qualityGates[id];
    if (!qualityGate) return null;

    const sprint = data.sprints[qualityGate.sprint_id];
    if (!sprint) return null;

    const phase = data.phases[sprint.phase_id];
    if (!phase) return null;

    // Verify project access
    if (!data.projects[phase.project_id]) {
      return null;
    }

    if (input.status !== undefined) qualityGate.status = input.status;
    if (input.score !== undefined) qualityGate.score = input.score;
    if (input.passed_at !== undefined) qualityGate.passed_at = input.passed_at;
    if (input.details !== undefined) qualityGate.details = input.details;

    data.qualityGates[id] = qualityGate;
    await this.saveData(userId, data);
    return qualityGate;
  }
}
