'use client';

import { useState, useEffect, useCallback } from 'react';
import { SprintWithDetails, AgentRun, QualityGate } from '@/types';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Rocket,
  Play,
  Pause,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  AlertTriangle,
  Bot,
  Shield,
  GitBranch,
} from 'lucide-react';
import { SprintAgentStatus } from './SprintAgentStatus';
import { SprintQualityGates } from './SprintQualityGates';

interface SprintProgressViewProps {
  sprint: SprintWithDetails;
  onRefresh: () => void;
}

interface OrchestratorStatus {
  sprint: {
    id: number;
    name: string;
    status: string;
    goal: string | null;
    target_repo_path: string | null;
    target_repo_url: string | null;
    base_branch: string | null;
    sprint_branch: string | null;
  };
  orchestrator: {
    status: string;
    stage: string | null;
    progress: number;
    error: string | null;
  };
  agents: {
    stats: {
      total: number;
      pending: number;
      running: number;
      completed: number;
      failed: number;
      skipped: number;
    };
    runs: AgentRun[];
  };
  gates: {
    stats: {
      total: number;
      pending: number;
      passed: number;
      failed: number;
      skipped: number;
    };
    items: QualityGate[];
  };
}

export function SprintProgressView({ sprint, onRefresh }: SprintProgressViewProps) {
  const [status, setStatus] = useState<OrchestratorStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [polling, setPolling] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/sprints/${sprint.id}/status`);
      if (!res.ok) {
        throw new Error('Failed to fetch status');
      }
      const data = await res.json();
      setStatus(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch status');
    } finally {
      setLoading(false);
    }
  }, [sprint.id]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Poll for updates when orchestrator is running
  useEffect(() => {
    if (status?.orchestrator.status === 'running' || status?.orchestrator.status === 'initializing') {
      setPolling(true);
      const interval = setInterval(fetchStatus, 3000);
      return () => {
        clearInterval(interval);
        setPolling(false);
      };
    }
    setPolling(false);
  }, [status?.orchestrator.status, fetchStatus]);

  const getStatusIcon = (orchestratorStatus: string) => {
    switch (orchestratorStatus) {
      case 'idle':
        return <Clock className="h-5 w-5 text-gray-500" />;
      case 'initializing':
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
      case 'running':
        return <Play className="h-5 w-5 text-green-500" />;
      case 'paused':
        return <Pause className="h-5 w-5 text-yellow-500" />;
      case 'completed':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusBadge = (orchestratorStatus: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      idle: 'secondary',
      initializing: 'default',
      running: 'default',
      paused: 'outline',
      completed: 'default',
      failed: 'destructive',
    };
    const colors: Record<string, string> = {
      idle: 'bg-gray-100 text-gray-700',
      initializing: 'bg-blue-100 text-blue-700',
      running: 'bg-green-100 text-green-700',
      paused: 'bg-yellow-100 text-yellow-700',
      completed: 'bg-green-100 text-green-700',
      failed: 'bg-red-100 text-red-700',
    };
    return (
      <Badge variant={variants[orchestratorStatus] || 'secondary'} className={colors[orchestratorStatus]}>
        {orchestratorStatus.charAt(0).toUpperCase() + orchestratorStatus.slice(1)}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
        <p className="text-sm text-red-500">{error}</p>
        <Button variant="outline" size="sm" className="mt-2" onClick={fetchStatus}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  if (!status) return null;

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Rocket className="h-6 w-6 text-primary" />
              <div>
                <CardTitle className="text-lg">Sprint Orchestrator</CardTitle>
                <CardDescription>{status.sprint.name}</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {polling && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Live
                </span>
              )}
              {getStatusBadge(status.orchestrator.status)}
              <Button variant="ghost" size="icon" onClick={fetchStatus}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {status.orchestrator.stage || 'Not started'}
              </span>
              <span className="font-medium">{status.orchestrator.progress}%</span>
            </div>
            <Progress value={status.orchestrator.progress} className="h-2" />
          </div>

          {/* Error Message */}
          {status.orchestrator.error && (
            <div className="mt-4 p-3 bg-red-50 dark:bg-red-950 rounded-md text-sm text-red-600 dark:text-red-400">
              <div className="flex items-start gap-2">
                <XCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>{status.orchestrator.error}</span>
              </div>
            </div>
          )}

          {/* Sprint Branch Info */}
          {status.sprint.sprint_branch && (
            <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
              <GitBranch className="h-4 w-4" />
              <code className="bg-muted px-2 py-0.5 rounded text-xs">
                {status.sprint.sprint_branch}
              </code>
              <span>from</span>
              <code className="bg-muted px-2 py-0.5 rounded text-xs">
                {status.sprint.base_branch || 'main'}
              </code>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <Bot className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">
                  {status.agents.stats.completed}/{status.agents.stats.total}
                </p>
                <p className="text-sm text-muted-foreground">Agents Complete</p>
              </div>
            </div>
            <div className="mt-3 flex gap-2 flex-wrap">
              {status.agents.stats.running > 0 && (
                <Badge variant="outline" className="bg-blue-50 text-blue-700">
                  {status.agents.stats.running} running
                </Badge>
              )}
              {status.agents.stats.failed > 0 && (
                <Badge variant="destructive">
                  {status.agents.stats.failed} failed
                </Badge>
              )}
              {status.agents.stats.pending > 0 && (
                <Badge variant="secondary">
                  {status.agents.stats.pending} pending
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <Shield className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">
                  {status.gates.stats.passed}/{status.gates.stats.total}
                </p>
                <p className="text-sm text-muted-foreground">Gates Passed</p>
              </div>
            </div>
            <div className="mt-3 flex gap-2 flex-wrap">
              {status.gates.stats.failed > 0 && (
                <Badge variant="destructive">
                  {status.gates.stats.failed} failed
                </Badge>
              )}
              {status.gates.stats.pending > 0 && (
                <Badge variant="secondary">
                  {status.gates.stats.pending} pending
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Agent Runs */}
      {status.agents.runs.length > 0 && (
        <SprintAgentStatus agents={status.agents.runs} />
      )}

      {/* Quality Gates */}
      {status.gates.items.length > 0 && (
        <SprintQualityGates gates={status.gates.items} />
      )}
    </div>
  );
}
