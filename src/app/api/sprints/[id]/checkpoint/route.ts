import { NextRequest, NextResponse } from 'next/server';
import { getStorageAsync } from '@/lib/storage';
import { getUserId, validateOrchestratorApiKey, isOrchestratorConfigured } from '@/lib/auth';
import { OrchestratorStep, OrchestratorCheckpoint } from '@/types';

type RouteParams = { params: Promise<{ id: string }> };

interface CheckpointRequest {
  step: OrchestratorStep;
  substep?: string | null;
  stage?: string;
  progress?: number;
  checkpoint_data: OrchestratorCheckpoint;
  // Optional: Update agent run status
  agent_update?: {
    agent_type: string;
    status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
    output_summary?: string;
    error_message?: string;
  };
  // Optional: Update quality gate
  gate_update?: {
    gate_name: string;
    status: 'pending' | 'passed' | 'failed' | 'skipped';
    score?: number;
    details?: string;
  };
}

// POST /api/sprints/:id/checkpoint - Save orchestrator checkpoint
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
    const body: CheckpointRequest = await request.json();

    // Get the sprint
    const sprint = await storage.getSprint(userId, parseInt(id));
    if (!sprint) {
      return NextResponse.json({ error: 'Sprint not found' }, { status: 404 });
    }

    // Can only checkpoint if running
    if (sprint.orchestrator_status !== 'running' && sprint.orchestrator_status !== 'initializing') {
      return NextResponse.json(
        { error: `Cannot checkpoint in ${sprint.orchestrator_status} state` },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    // Update sprint with checkpoint data
    await storage.updateSprint(userId, parseInt(id), {
      current_step: body.step,
      current_substep: body.substep || null,
      checkpoint_data: JSON.stringify(body.checkpoint_data),
      last_checkpoint_at: now,
      orchestrator_stage: body.stage || sprint.orchestrator_stage,
      orchestrator_progress: body.progress ?? sprint.orchestrator_progress,
    });

    // Update agent run if specified
    if (body.agent_update) {
      const agentRun = sprint.agent_runs.find(
        (r) => r.agent_type === body.agent_update!.agent_type
      );
      if (agentRun) {
        await storage.updateAgentRun(userId, agentRun.id, {
          status: body.agent_update.status,
          started_at: body.agent_update.status === 'running' ? now : undefined,
          completed_at: ['completed', 'failed', 'skipped'].includes(body.agent_update.status) ? now : undefined,
          output_summary: body.agent_update.output_summary,
          error_message: body.agent_update.error_message,
        });
      }
    }

    // Update quality gate if specified
    if (body.gate_update) {
      const gate = sprint.quality_gates.find(
        (g) => g.gate_name === body.gate_update!.gate_name
      );
      if (gate) {
        await storage.updateQualityGate(userId, gate.id, {
          status: body.gate_update.status,
          score: body.gate_update.score,
          passed_at: body.gate_update.status === 'passed' ? now : undefined,
          details: body.gate_update.details,
        });
      }
    }

    return NextResponse.json({
      success: true,
      checkpoint: {
        step: body.step,
        substep: body.substep,
        saved_at: now,
      },
    });
  } catch (error) {
    console.error('Failed to save checkpoint:', error);
    return NextResponse.json(
      { error: 'Failed to save checkpoint' },
      { status: 500 }
    );
  }
}

// GET /api/sprints/:id/checkpoint - Get current checkpoint state
export async function GET(request: NextRequest, { params }: RouteParams) {
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

    const sprint = await storage.getSprint(userId, parseInt(id));
    if (!sprint) {
      return NextResponse.json({ error: 'Sprint not found' }, { status: 404 });
    }

    let checkpoint: OrchestratorCheckpoint | null = null;
    if (sprint.checkpoint_data) {
      try {
        checkpoint = JSON.parse(sprint.checkpoint_data);
      } catch {
        // Corrupted checkpoint
      }
    }

    return NextResponse.json({
      has_checkpoint: !!checkpoint,
      current_step: sprint.current_step,
      current_substep: sprint.current_substep,
      last_checkpoint_at: sprint.last_checkpoint_at,
      checkpoint: checkpoint,
      orchestrator: {
        status: sprint.orchestrator_status,
        stage: sprint.orchestrator_stage,
        progress: sprint.orchestrator_progress,
        error: sprint.orchestrator_error,
      },
    });
  } catch (error) {
    console.error('Failed to get checkpoint:', error);
    return NextResponse.json(
      { error: 'Failed to get checkpoint' },
      { status: 500 }
    );
  }
}
