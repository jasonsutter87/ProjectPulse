'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TicketWithTags, PRIORITY_COLORS, TicketPriority } from '@/types';
import { GripVertical, Calendar } from 'lucide-react';

interface TicketCardProps {
  ticket: TicketWithTags;
  onClick?: () => void;
}

function formatDueDate(dateStr: string): { text: string; isOverdue: boolean; isDueSoon: boolean } {
  const due = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);

  const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { text: `${Math.abs(diffDays)}d overdue`, isOverdue: true, isDueSoon: false };
  } else if (diffDays === 0) {
    return { text: 'Due today', isOverdue: false, isDueSoon: true };
  } else if (diffDays === 1) {
    return { text: 'Due tomorrow', isOverdue: false, isDueSoon: true };
  } else if (diffDays <= 7) {
    return { text: `Due in ${diffDays}d`, isOverdue: false, isDueSoon: true };
  } else {
    return { text: due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), isOverdue: false, isDueSoon: false };
  }
}

export function TicketCard({ ticket, onClick }: TicketCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: ticket.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const priorityColor = PRIORITY_COLORS[ticket.priority as TicketPriority];

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={`mb-2 cursor-pointer hover:shadow-md transition-shadow touch-manipulation ${
        isDragging ? 'shadow-lg' : ''
      }`}
      onClick={onClick}
    >
      <CardContent className="p-2.5 sm:p-3">
        <div className="flex items-start gap-2">
          <button
            {...attributes}
            {...listeners}
            className="mt-1 cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical size={16} />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {ticket.priority > 0 && (
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: priorityColor }}
                  title={`Priority: ${ticket.priority}`}
                />
              )}
              <span className="font-medium text-sm truncate">{ticket.title}</span>
            </div>
            {ticket.description && (
              <p className="text-xs text-gray-500 line-clamp-2 mb-2">
                {ticket.description}
              </p>
            )}
            <div className="flex flex-wrap gap-1">
              {ticket.tags.map((tag) => (
                <Badge
                  key={tag.id}
                  variant="secondary"
                  className="text-xs px-1.5 py-0"
                  style={{ backgroundColor: `${tag.color}20`, color: tag.color }}
                >
                  {tag.name}
                </Badge>
              ))}
            </div>
            <div className="flex items-center justify-between mt-2 text-xs text-gray-400">
              <div className="flex items-center gap-2">
                {ticket.project && (
                  <span className="truncate max-w-[100px]">{ticket.project.name}</span>
                )}
              </div>
              {ticket.due_date && (() => {
                const { text, isOverdue, isDueSoon } = formatDueDate(ticket.due_date);
                return (
                  <span className={`flex items-center gap-1 ${isOverdue ? 'text-red-500' : isDueSoon ? 'text-orange-500' : ''}`}>
                    <Calendar size={12} />
                    {text}
                  </span>
                );
              })()}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
