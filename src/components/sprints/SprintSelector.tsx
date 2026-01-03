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
import { SprintWithDetails } from '@/types';
import { Plus, Zap } from 'lucide-react';

interface SprintSelectorProps {
  phaseId: number | null;
  selectedSprintId: number | null;
  onSprintChange: (sprintId: number | null) => void;
  onCreateSprint?: () => void;
  showCreateButton?: boolean;
  className?: string;
}

export function SprintSelector({
  phaseId,
  selectedSprintId,
  onSprintChange,
  onCreateSprint,
  showCreateButton = true,
  className = '',
}: SprintSelectorProps) {
  const [sprints, setSprints] = useState<SprintWithDetails[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!phaseId) {
      setSprints([]);
      return;
    }

    const fetchSprints = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/sprints?phase_id=${phaseId}`);
        const data = await res.json();
        setSprints(data);
      } catch (error) {
        console.error('Failed to fetch sprints:', error);
        setSprints([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSprints();
  }, [phaseId]);

  if (!phaseId) {
    return null;
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Zap size={16} className="text-muted-foreground flex-shrink-0" />
      <Select
        value={selectedSprintId?.toString() || 'all'}
        onValueChange={(v) => onSprintChange(v === 'all' ? null : parseInt(v))}
        disabled={loading}
      >
        <SelectTrigger className="w-40 h-9 sm:h-10">
          <SelectValue placeholder={loading ? 'Loading...' : 'All Sprints'} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Sprints</SelectItem>
          {sprints.map((sprint) => (
            <SelectItem key={sprint.id} value={sprint.id.toString()}>
              <div className="flex items-center gap-2">
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{
                    backgroundColor:
                      sprint.status === 'active'
                        ? '#22c55e'
                        : sprint.status === 'completed'
                          ? '#3b82f6'
                          : '#6b7280',
                  }}
                />
                {sprint.name}
                {sprint.ticket_count > 0 && (
                  <span className="text-xs text-muted-foreground">
                    ({sprint.ticket_count})
                  </span>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {showCreateButton && onCreateSprint && (
        <Button variant="ghost" size="icon" onClick={onCreateSprint} className="h-9 w-9">
          <Plus size={16} />
        </Button>
      )}
    </div>
  );
}
