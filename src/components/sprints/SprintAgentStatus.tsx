'use client';

import { AgentRun } from '@/types';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Bot,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  SkipForward,
  User,
  Code,
  TestTube,
  Shield,
  Gauge,
  FileText,
  Trash2,
  AlertTriangle,
  Skull,
} from 'lucide-react';

interface SprintAgentStatusProps {
  agents: AgentRun[];
}

const AGENT_ICONS: Record<string, React.ElementType> = {
  tech_lead: User,
  api_architect: Code,
  senior_dev: Code,
  qa: TestTube,
  purple_team: Shield,
  performance: Gauge,
  docs_writer: FileText,
  code_janitor: Trash2,
  red_team: AlertTriangle,
  black_team: Skull,
};

const AGENT_COLORS: Record<string, string> = {
  tech_lead: 'text-purple-500',
  api_architect: 'text-blue-500',
  senior_dev: 'text-blue-600',
  qa: 'text-green-500',
  purple_team: 'text-violet-500',
  performance: 'text-orange-500',
  docs_writer: 'text-cyan-500',
  code_janitor: 'text-gray-500',
  red_team: 'text-red-500',
  black_team: 'text-gray-900 dark:text-gray-100',
};

export function SprintAgentStatus({ agents }: SprintAgentStatusProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-gray-400" />;
      case 'running':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'skipped':
        return <SkipForward className="h-4 w-4 text-gray-400" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
      running: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
      completed: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
      failed: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
      skipped: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500',
    };
    return (
      <Badge variant="secondary" className={styles[status] || styles.pending}>
        {status}
      </Badge>
    );
  };

  const formatDuration = (startedAt: string | null, completedAt: string | null) => {
    if (!startedAt) return null;
    const start = new Date(startedAt);
    const end = completedAt ? new Date(completedAt) : new Date();
    const diffMs = end.getTime() - start.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return `${diffSec}s`;
    const diffMin = Math.floor(diffSec / 60);
    const remainingSec = diffSec % 60;
    return `${diffMin}m ${remainingSec}s`;
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Bot className="h-5 w-5" />
          Agent Pipeline
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          {agents.map((agent, index) => {
            const IconComponent = AGENT_ICONS[agent.agent_type] || Bot;
            const iconColor = AGENT_COLORS[agent.agent_type] || 'text-gray-500';
            const isLast = index === agents.length - 1;

            return (
              <div key={agent.id} className="relative">
                {/* Connection Line */}
                {!isLast && (
                  <div className="absolute left-4 top-10 bottom-0 w-px bg-border" />
                )}

                <div className={`flex items-start gap-3 p-2 rounded-lg transition-colors ${
                  agent.status === 'running' ? 'bg-blue-50 dark:bg-blue-950' : ''
                }`}>
                  {/* Agent Icon */}
                  <div className={`p-2 rounded-full bg-muted ${iconColor}`}>
                    <IconComponent className="h-4 w-4" />
                  </div>

                  {/* Agent Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{agent.agent_name}</span>
                        {getStatusBadge(agent.status)}
                      </div>
                      {getStatusIcon(agent.status)}
                    </div>

                    {/* Branch info if running/completed */}
                    {agent.branch_name && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Branch: <code className="bg-muted px-1 rounded">{agent.branch_name}</code>
                      </p>
                    )}

                    {/* Duration */}
                    {agent.started_at && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {agent.status === 'running' ? 'Running for' : 'Duration'}: {formatDuration(agent.started_at, agent.completed_at)}
                      </p>
                    )}

                    {/* Output summary */}
                    {agent.output_summary && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {agent.output_summary}
                      </p>
                    )}

                    {/* Error message */}
                    {agent.error_message && (
                      <p className="text-xs text-red-500 mt-1">
                        Error: {agent.error_message}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
