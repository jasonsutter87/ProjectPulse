'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TicketWithTags, PRIORITY_COLORS, TicketPriority } from '@/types';
import { GripVertical } from 'lucide-react';

interface TicketCardProps {
  ticket: TicketWithTags;
  onClick?: () => void;
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
      className={`mb-2 cursor-pointer hover:shadow-md transition-shadow ${
        isDragging ? 'shadow-lg' : ''
      }`}
      onClick={onClick}
    >
      <CardContent className="p-3">
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
            {ticket.project && (
              <p className="text-xs text-gray-400 mt-2 truncate">
                {ticket.project.name}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
