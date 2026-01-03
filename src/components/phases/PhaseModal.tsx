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
import { PhaseWithSprints, PhaseStatus } from '@/types';
import { Trash2, Calendar } from 'lucide-react';

const PHASE_STATUSES: { value: PhaseStatus; label: string }[] = [
  { value: 'planning', label: 'Planning' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
  { value: 'archived', label: 'Archived' },
];

interface PhaseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: number;
  phase?: PhaseWithSprints | null;
  onSave: (data: {
    project_id: number;
    name: string;
    description: string;
    status: PhaseStatus;
    start_date: string | null;
    end_date: string | null;
  }) => Promise<void>;
  onDelete?: (id: number) => Promise<void>;
}

export function PhaseModal({
  open,
  onOpenChange,
  projectId,
  phase,
  onSave,
  onDelete,
}: PhaseModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<PhaseStatus>('planning');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (phase) {
      setName(phase.name);
      setDescription(phase.description || '');
      setStatus(phase.status);
      setStartDate(phase.start_date || '');
      setEndDate(phase.end_date || '');
    } else {
      setName('');
      setDescription('');
      setStatus('planning');
      setStartDate('');
      setEndDate('');
    }
  }, [phase]);

  const handleSave = async () => {
    if (!name.trim()) return;

    setSaving(true);
    try {
      await onSave({
        project_id: projectId,
        name: name.trim(),
        description: description.trim(),
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
    if (!phase || !onDelete) return;
    if (!confirm('Delete this phase and all its sprints?')) return;

    setSaving(true);
    try {
      await onDelete(phase.id);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{phase ? 'Edit Phase' : 'New Phase'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <label className="text-sm font-medium">Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Development, QA, Release"
              className="mt-1"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Description</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this phase about?"
              className="mt-1"
              rows={2}
            />
          </div>

          <div>
            <label className="text-sm font-medium">Status</label>
            <Select value={status} onValueChange={(v) => setStatus(v as PhaseStatus)}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PHASE_STATUSES.map((s) => (
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

          {phase && (
            <div className="text-xs text-gray-400 pt-2 border-t">
              <p>{phase.sprints.length} sprint(s) · {phase.ticket_count} ticket(s)</p>
            </div>
          )}
        </div>

        <DialogFooter className="flex justify-between">
          <div>
            {phase && onDelete && (
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
