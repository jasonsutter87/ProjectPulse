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
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  TicketWithTags,
  Tag,
  Project,
  TicketStatus,
  TicketPriority,
  BOARD_COLUMNS,
  PRIORITY_LABELS,
} from '@/types';
import { Trash2, Calendar } from 'lucide-react';

interface TicketModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticket?: TicketWithTags | null;
  tags: Tag[];
  projects: Project[];
  defaultStatus?: TicketStatus;
  onSave: (data: {
    title: string;
    description: string;
    project_id: number | null;
    status: TicketStatus;
    priority: TicketPriority;
    start_date: string | null;
    due_date: string | null;
    tag_ids: number[];
  }) => Promise<void>;
  onDelete?: (id: number) => Promise<void>;
}

export function TicketModal({
  open,
  onOpenChange,
  ticket,
  tags,
  projects,
  defaultStatus = 'backlog',
  onSave,
  onDelete,
}: TicketModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [projectId, setProjectId] = useState<string>('none');
  const [status, setStatus] = useState<TicketStatus>(defaultStatus);
  const [priority, setPriority] = useState<TicketPriority>(0);
  const [startDate, setStartDate] = useState<string>('');
  const [dueDate, setDueDate] = useState<string>('');
  const [selectedTags, setSelectedTags] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (ticket) {
      setTitle(ticket.title);
      setDescription(ticket.description || '');
      setProjectId(ticket.project_id?.toString() || 'none');
      setStatus(ticket.status);
      setPriority(ticket.priority);
      setStartDate(ticket.start_date || '');
      setDueDate(ticket.due_date || '');
      setSelectedTags(ticket.tags.map((t) => t.id));
    } else {
      setTitle('');
      setDescription('');
      setProjectId('none');
      setStatus(defaultStatus);
      setPriority(0);
      setStartDate('');
      setDueDate('');
      setSelectedTags([]);
    }
  }, [ticket, defaultStatus]);

  const toggleTag = (tagId: number) => {
    setSelectedTags((prev) =>
      prev.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : [...prev, tagId]
    );
  };

  const handleSave = async () => {
    if (!title.trim()) return;

    setSaving(true);
    try {
      await onSave({
        title: title.trim(),
        description: description.trim(),
        project_id: projectId === 'none' ? null : parseInt(projectId),
        status,
        priority,
        start_date: startDate || null,
        due_date: dueDate || null,
        tag_ids: selectedTags,
      });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!ticket || !onDelete) return;
    if (!confirm('Delete this ticket?')) return;

    setSaving(true);
    try {
      await onDelete(ticket.id);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] sm:max-h-[85vh] flex flex-col mx-2 sm:mx-auto">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-lg sm:text-xl">{ticket ? 'Edit Ticket' : 'New Ticket'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4 overflow-y-auto flex-1">
          <div>
            <label className="text-sm font-medium">Title</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs to be done?"
              className="mt-1"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Description</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add details..."
              className="mt-1"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="text-sm font-medium">Status</label>
              <Select value={status} onValueChange={(v) => setStatus(v as TicketStatus)}>
                <SelectTrigger className="mt-1 h-9 sm:h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BOARD_COLUMNS.map((col) => (
                    <SelectItem key={col.id} value={col.id}>
                      {col.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Priority</label>
              <Select
                value={priority.toString()}
                onValueChange={(v) => setPriority(parseInt(v) as TicketPriority)}
              >
                <SelectTrigger className="mt-1 h-9 sm:h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Project</label>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger className="mt-1 h-9 sm:h-10">
                <SelectValue placeholder="No project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No project</SelectItem>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id.toString()}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="text-sm font-medium">Start Date</label>
              <div className="relative mt-1">
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="pl-9 h-9 sm:h-10"
                />
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Due Date</label>
              <div className="relative mt-1">
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="pl-9 h-9 sm:h-10"
                />
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              </div>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Tags</label>
            <div className="flex flex-wrap gap-2 mt-2">
              {tags.map((tag) => (
                <Badge
                  key={tag.id}
                  variant={selectedTags.includes(tag.id) ? 'default' : 'outline'}
                  className="cursor-pointer"
                  style={
                    selectedTags.includes(tag.id)
                      ? { backgroundColor: tag.color }
                      : { borderColor: tag.color, color: tag.color }
                  }
                  onClick={() => toggleTag(tag.id)}
                >
                  {tag.name}
                </Badge>
              ))}
            </div>
          </div>

          {ticket && (
            <div className="text-xs text-gray-400 pt-2 border-t space-y-1">
              <p>Created: {new Date(ticket.created_at).toLocaleString()}</p>
              <p>Updated: {new Date(ticket.updated_at).toLocaleString()}</p>
            </div>
          )}
        </div>

        <DialogFooter className="flex justify-between flex-shrink-0">
          <div>
            {ticket && onDelete && (
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
            <Button onClick={handleSave} disabled={saving || !title.trim()}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
