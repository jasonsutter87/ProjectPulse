'use client';

import { useState, useEffect } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { PhaseWithSprints } from '@/types';
import { Plus, Layers } from 'lucide-react';

interface PhaseSelectorProps {
  projectId: number | null;
  selectedPhaseId: number | null;
  onPhaseChange: (phaseId: number | null) => void;
  onCreatePhase?: () => void;
  showCreateButton?: boolean;
  className?: string;
}

export function PhaseSelector({
  projectId,
  selectedPhaseId,
  onPhaseChange,
  onCreatePhase,
  showCreateButton = true,
  className = '',
}: PhaseSelectorProps) {
  const [phases, setPhases] = useState<PhaseWithSprints[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!projectId) {
      setPhases([]);
      return;
    }

    const fetchPhases = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/phases?project_id=${projectId}`);
        const data = await res.json();
        setPhases(data);
      } catch (error) {
        console.error('Failed to fetch phases:', error);
        setPhases([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPhases();
  }, [projectId]);

  if (!projectId) {
    return null;
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Layers size={16} className="text-muted-foreground flex-shrink-0" />
      <Select
        value={selectedPhaseId?.toString() || 'all'}
        onValueChange={(v) => onPhaseChange(v === 'all' ? null : parseInt(v))}
        disabled={loading}
      >
        <SelectTrigger className="w-40 h-9 sm:h-10">
          <SelectValue placeholder={loading ? 'Loading...' : 'All Phases'} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Phases</SelectItem>
          {phases.map((phase) => (
            <SelectItem key={phase.id} value={phase.id.toString()}>
              <div className="flex items-center gap-2">
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{
                    backgroundColor:
                      phase.status === 'active'
                        ? '#22c55e'
                        : phase.status === 'completed'
                          ? '#3b82f6'
                          : '#6b7280',
                  }}
                />
                {phase.name}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {showCreateButton && onCreatePhase && (
        <Button variant="ghost" size="icon" onClick={onCreatePhase} className="h-9 w-9">
          <Plus size={16} />
        </Button>
      )}
    </div>
  );
}
