'use client';

import { QualityGate } from '@/types';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Shield,
  CheckCircle2,
  XCircle,
  Clock,
  SkipForward,
  Code,
  TestTube,
  Lock,
  Gauge,
  FileText,
  UserCheck,
} from 'lucide-react';

interface SprintQualityGatesProps {
  gates: QualityGate[];
}

const GATE_ICONS: Record<string, React.ElementType> = {
  'Code Review': Code,
  'Test Coverage': TestTube,
  'Security Scan': Lock,
  'Performance Audit': Gauge,
  'Documentation Check': FileText,
  'Final Approval': UserCheck,
};

export function SprintQualityGates({ gates }: SprintQualityGatesProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-gray-400" />;
      case 'passed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'skipped':
        return <SkipForward className="h-4 w-4 text-gray-400" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'border-gray-200 dark:border-gray-700';
      case 'passed':
        return 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950';
      case 'failed':
        return 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950';
      case 'skipped':
        return 'border-gray-200 dark:border-gray-700 opacity-50';
      default:
        return 'border-gray-200 dark:border-gray-700';
    }
  };

  const getScoreColor = (score: number | null, maxScore: number | null) => {
    if (score === null || maxScore === null) return 'text-gray-500';
    const percentage = (score / maxScore) * 100;
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getProgressColor = (score: number | null, maxScore: number | null) => {
    if (score === null || maxScore === null) return '';
    const percentage = (score / maxScore) * 100;
    if (percentage >= 80) return '[&>div]:bg-green-500';
    if (percentage >= 60) return '[&>div]:bg-yellow-500';
    return '[&>div]:bg-red-500';
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Quality Gates
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3">
          {gates.map((gate) => {
            const IconComponent = GATE_ICONS[gate.gate_name] || Shield;
            const hasScore = gate.max_score !== null;
            const scorePercentage = hasScore && gate.score !== null
              ? Math.round((gate.score / gate.max_score!) * 100)
              : null;

            return (
              <div
                key={gate.id}
                className={`p-3 rounded-lg border ${getStatusColor(gate.status)}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <IconComponent className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{gate.gate_name}</span>
                        <Badge variant="outline" className="text-xs">
                          {gate.gate_type}
                        </Badge>
                      </div>

                      {/* Score Display */}
                      {hasScore && gate.status !== 'pending' && (
                        <div className="mt-2 space-y-1">
                          <div className="flex items-center gap-2">
                            <Progress
                              value={scorePercentage || 0}
                              className={`h-2 w-24 ${getProgressColor(gate.score, gate.max_score)}`}
                            />
                            <span className={`text-sm font-medium ${getScoreColor(gate.score, gate.max_score)}`}>
                              {gate.score}/{gate.max_score}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Details */}
                      {gate.details && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {gate.details}
                        </p>
                      )}
                    </div>
                  </div>

                  {getStatusIcon(gate.status)}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
