'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SprintWithDetails, SprintStatus } from '@/types';
import { Trash2, Calendar, Target } from 'lucide-react';

const SPRINT_STATUSES: { value: SprintStatus; label: string }[] = [
  { value: 'planning', label: 'Planning' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
  { value: 'archived', label: 'Archived' },
];

interface SprintModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  phaseId: number;
  sprint?: SprintWithDetails | null;
  onSave: (data: {
    phase_id: number;
    name: string;
    description: string;
    goal: string;
    status: SprintStatus;
    start_date: string | null;
    end_date: string | null;
  }) => Promise<void>;
  onDelete?: (id: number) => Promise<void>;
}

export function SprintModal({
  open,
  onOpenChange,
  phaseId,
  sprint,
  onSave,
  onDelete,
}: SprintModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [goal, setGoal] = useState('');
  const [status, setStatus] = useState<SprintStatus>('planning');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (sprint) {
      setName(sprint.name);
      setDescription(sprint.description || '');
      setGoal(sprint.goal || '');
      setStatus(sprint.status);
      setStartDate(sprint.start_date || '');
      setEndDate(sprint.end_date || '');
    } else {
      setName('');
      setDescription('');
      setGoal('');
      setStatus('planning');
      setStartDate('');
      setEndDate('');
    }
  }, [sprint]);

  const handleSave = async () => {
    if (!name.trim()) return;

    setSaving(true);
    try {
      await onSave({
        phase_id: phaseId,
        name: name.trim(),
        description: description.trim(),
        goal: goal.trim(),
        status,
        start_date: startDate || null,
        end_date: endDate || null,
      });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!sprint || !onDelete) return;
    if (!confirm('Delete this sprint and unlink all its tickets?')) return;

    setSaving(true);
    try {
      await onDelete(sprint.id);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{sprint ? 'Edit Sprint' : 'New Sprint'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <label className="text-sm font-medium">Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Sprint 1, User Auth Sprint"
              className="mt-1"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Goal</label>
            <div className="relative mt-1">
              <Input
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder="What should this sprint achieve?"
                className="pl-9"
              />
              <Target className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Description</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Additional details..."
              className="mt-1"
              rows={2}
            />
          </div>

          <div>
            <label className="text-sm font-medium">Status</label>
            <Select value={status} onValueChange={(v) => setStatus(v as SprintStatus)}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SPRINT_STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Start Date</label>
              <div className="relative mt-1">
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="pl-9"
                />
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">End Date</label>
              <div className="relative mt-1">
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="pl-9"
                />
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              </div>
            </div>
          </div>

          {sprint && (
            <div className="text-xs text-gray-400 pt-2 border-t space-y-1">
              <p>{sprint.ticket_count} ticket(s)</p>
              {sprint.orchestrator_status !== 'idle' && (
                <p>Orchestrator: {sprint.orchestrator_status}</p>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="flex justify-between">
          <div>
            {sprint && onDelete && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={saving}
              >
                <Trash2 size={14} className="mr-1" />
                Delete
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving || !name.trim()}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
