import { NextRequest, NextResponse } from 'next/server';
import { getStorageAsync } from '@/lib/storage';
import { getUserId, validateOrchestratorApiKey, isOrchestratorConfigured } from '@/lib/auth';
import { OrchestratorCheckpoint } from '@/types';

type RouteParams = { params: Promise<{ id: string }> };

// POST /api/sprints/:id/resume - Resume sprint orchestrator from checkpoint
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    // Validate API key for orchestrator access
    const authHeader = request.headers.get('Authorization');
    if (!validateOrchestratorApiKey(authHeader)) {
      if (!isOrchestratorConfigured()) {
        return NextResponse.json(
          { error: 'Orchestrator not configured. Set ORCHESTRATOR_API_KEY env var.' },
          { status: 503 }
        );
      }
      return NextResponse.json(
        { error: 'Invalid or missing orchestrator API key' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const userId = await getUserId();
    const storage = await getStorageAsync();

    // Get the sprint with all details
    const sprint = await storage.getSprint(userId, parseInt(id));
    if (!sprint) {
      return NextResponse.json({ error: 'Sprint not found' }, { status: 404 });
    }

    // Can only resume if paused or failed
    if (sprint.orchestrator_status !== 'paused' && sprint.orchestrator_status !== 'failed') {
      return NextResponse.json(
        { error: `Cannot resume from ${sprint.orchestrator_status} state. Must be paused or failed.` },
        { status: 400 }
      );
    }

    // Must have checkpoint data to resume
    if (!sprint.current_step || !sprint.checkpoint_data) {
      return NextResponse.json(
        { error: 'No checkpoint data available. Sprint must be restarted.' },
        { status: 400 }
      );
    }

    // Parse checkpoint data
    let checkpoint: OrchestratorCheckpoint;
    try {
      checkpoint = JSON.parse(sprint.checkpoint_data);
    } catch {
      return NextResponse.json(
        { error: 'Corrupted checkpoint data. Sprint must be restarted.' },
        { status: 400 }
      );
    }

    // Update sprint to running state
    await storage.updateSprint(userId, parseInt(id), {
      orchestrator_status: 'running',
      orchestrator_stage: `Resuming from ${sprint.current_step}${sprint.current_substep ? `/${sprint.current_substep}` : ''}`,
      orchestrator_error: null,
    });

    // Get current agent and gate states
    const agentStats = {
      total: sprint.agent_runs.length,
      pending: sprint.agent_runs.filter((r) => r.status === 'pending').length,
      running: sprint.agent_runs.filter((r) => r.status === 'running').length,
      completed: sprint.agent_runs.filter((r) => r.status === 'completed').length,
      failed: sprint.agent_runs.filter((r) => r.status === 'failed').length,
    };

    const gateStats = {
      total: sprint.quality_gates.length,
      pending: sprint.quality_gates.filter((g) => g.status === 'pending').length,
      passed: sprint.quality_gates.filter((g) => g.status === 'passed').length,
      failed: sprint.quality_gates.filter((g) => g.status === 'failed').length,
    };

    return NextResponse.json({
      success: true,
      message: 'Sprint orchestrator resumed',
      resume_from: {
        step: sprint.current_step,
        substep: sprint.current_substep,
        checkpoint: checkpoint,
      },
      sprint: {
        id: sprint.id,
        name: sprint.name,
        target_repo_path: sprint.target_repo_path,
        target_repo_url: sprint.target_repo_url,
        base_branch: sprint.base_branch,
        sprint_branch: sprint.sprint_branch,
        orchestrator_progress: sprint.orchestrator_progress,
      },
      agents: {
        stats: agentStats,
        runs: sprint.agent_runs,
      },
      gates: {
        stats: gateStats,
        items: sprint.quality_gates,
      },
    });
  } catch (error) {
    console.error('Failed to resume sprint orchestrator:', error);
    return NextResponse.json(
      { error: 'Failed to resume sprint orchestrator' },
      { status: 500 }
    );
  }
}
