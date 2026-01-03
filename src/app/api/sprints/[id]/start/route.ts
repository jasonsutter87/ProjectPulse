import { NextRequest, NextResponse } from 'next/server';
import { getStorageAsync } from '@/lib/storage';
import { getUserId } from '@/lib/auth';
import { AgentType, GateType } from '@/types';

type RouteParams = { params: Promise<{ id: string }> };

// Define the orchestrator pipeline
const AGENT_PIPELINE: { name: string; type: AgentType }[] = [
  { name: 'Tech Lead', type: 'tech_lead' },
  { name: 'API Architect', type: 'api_architect' },
  { name: 'Senior Developer', type: 'senior_dev' },
  { name: 'QA Engineer', type: 'qa' },
  { name: 'Purple Team', type: 'purple_team' },
  { name: 'Performance', type: 'performance' },
  { name: 'Docs Writer', type: 'docs_writer' },
  { name: 'Code Janitor', type: 'code_janitor' },
  { name: 'Red Team', type: 'red_team' },
  { name: 'Black Team', type: 'black_team' },
];

const QUALITY_GATES: { name: string; type: GateType; maxScore?: number }[] = [
  { name: 'Code Review', type: 'automated', maxScore: 100 },
  { name: 'Test Coverage', type: 'automated', maxScore: 100 },
  { name: 'Security Scan', type: 'automated', maxScore: 30 },
  { name: 'Performance Audit', type: 'automated', maxScore: 100 },
  { name: 'Documentation Check', type: 'automated', maxScore: 100 },
  { name: 'Final Approval', type: 'manual' },
];

// POST /api/sprints/:id/start - Start the sprint orchestrator
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const userId = await getUserId();
    const storage = await getStorageAsync();

    // Validate the sprint exists and user has access
    const sprint = await storage.getSprint(userId, parseInt(id));
    if (!sprint) {
      return NextResponse.json({ error: 'Sprint not found' }, { status: 404 });
    }

    // Can only start if orchestrator is idle or failed
    if (sprint.orchestrator_status !== 'idle' && sprint.orchestrator_status !== 'failed') {
      return NextResponse.json(
        { error: `Cannot start orchestrator in ${sprint.orchestrator_status} state` },
        { status: 400 }
      );
    }

    // Verify configuration
    if (!sprint.target_repo_path && !sprint.target_repo_url) {
      return NextResponse.json(
        { error: 'Sprint must be configured with a target repository before starting' },
        { status: 400 }
      );
    }

    // Generate sprint branch name
    const sprintBranch = `sprint/${sprint.id}-${sprint.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

    // Update sprint to initializing state
    await storage.updateSprint(userId, parseInt(id), {
      orchestrator_status: 'initializing',
      orchestrator_stage: 'Setting up sprint branch',
      orchestrator_progress: 0,
      orchestrator_error: null,
      sprint_branch: sprintBranch,
    });

    // Create agent runs for the pipeline
    for (const agent of AGENT_PIPELINE) {
      await storage.createAgentRun(userId, {
        sprint_id: parseInt(id),
        agent_name: agent.name,
        agent_type: agent.type,
      });
    }

    // Create quality gates
    for (const gate of QUALITY_GATES) {
      await storage.createQualityGate(userId, {
        sprint_id: parseInt(id),
        gate_name: gate.name,
        gate_type: gate.type,
        max_score: gate.maxScore,
      });
    }

    // Update to running state
    await storage.updateSprint(userId, parseInt(id), {
      orchestrator_status: 'running',
      orchestrator_stage: 'Tech Lead evaluation',
      orchestrator_progress: 5,
    });

    // Return the updated sprint with all details
    const updatedSprint = await storage.getSprint(userId, parseInt(id));

    return NextResponse.json({
      success: true,
      message: 'Sprint orchestrator started',
      sprint: updatedSprint,
    });
  } catch (error) {
    console.error('Failed to start sprint orchestrator:', error);
    return NextResponse.json(
      { error: 'Failed to start sprint orchestrator' },
      { status: 500 }
    );
  }
}
