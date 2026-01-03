import { NextRequest, NextResponse } from 'next/server';
import { getStorageAsync } from '@/lib/storage';
import { getUserId } from '@/lib/auth';

type RouteParams = { params: Promise<{ id: string }> };

// GET /api/sprints/:id/status - Get sprint orchestrator status
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const userId = await getUserId();
    const storage = await getStorageAsync();

    // Get the sprint with all details (includes agent_runs and quality_gates)
    const sprint = await storage.getSprint(userId, parseInt(id));
    if (!sprint) {
      return NextResponse.json({ error: 'Sprint not found' }, { status: 404 });
    }

    // Calculate summary stats
    const agentStats = {
      total: sprint.agent_runs.length,
      pending: sprint.agent_runs.filter((r) => r.status === 'pending').length,
      running: sprint.agent_runs.filter((r) => r.status === 'running').length,
      completed: sprint.agent_runs.filter((r) => r.status === 'completed').length,
      failed: sprint.agent_runs.filter((r) => r.status === 'failed').length,
      skipped: sprint.agent_runs.filter((r) => r.status === 'skipped').length,
    };

    const gateStats = {
      total: sprint.quality_gates.length,
      pending: sprint.quality_gates.filter((g) => g.status === 'pending').length,
      passed: sprint.quality_gates.filter((g) => g.status === 'passed').length,
      failed: sprint.quality_gates.filter((g) => g.status === 'failed').length,
      skipped: sprint.quality_gates.filter((g) => g.status === 'skipped').length,
    };

    return NextResponse.json({
      sprint: {
        id: sprint.id,
        name: sprint.name,
        status: sprint.status,
        goal: sprint.goal,
        target_repo_path: sprint.target_repo_path,
        target_repo_url: sprint.target_repo_url,
        base_branch: sprint.base_branch,
        sprint_branch: sprint.sprint_branch,
      },
      orchestrator: {
        status: sprint.orchestrator_status,
        stage: sprint.orchestrator_stage,
        progress: sprint.orchestrator_progress,
        error: sprint.orchestrator_error,
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
    console.error('Failed to get sprint status:', error);
    return NextResponse.json(
      { error: 'Failed to get sprint status' },
      { status: 500 }
    );
  }
}
