'use client';

import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TicketCard } from './TicketCard';
import { TicketWithTags, TicketStatus } from '@/types';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ColumnProps {
  id: TicketStatus;
  title: string;
  tickets: TicketWithTags[];
  onTicketClick?: (ticket: TicketWithTags) => void;
  onAddClick?: () => void;
}

const COLUMN_COLORS: Record<TicketStatus, string> = {
  backlog: 'bg-gray-100',
  in_progress: 'bg-blue-50',
  review: 'bg-yellow-50',
  done: 'bg-green-50',
};

const HEADER_COLORS: Record<TicketStatus, string> = {
  backlog: 'bg-gray-200 text-gray-700',
  in_progress: 'bg-blue-200 text-blue-700',
  review: 'bg-yellow-200 text-yellow-700',
  done: 'bg-green-200 text-green-700',
};

export function Column({ id, title, tickets, onTicketClick, onAddClick }: ColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      className={`flex flex-col w-[280px] sm:w-72 flex-shrink-0 rounded-lg ${COLUMN_COLORS[id]} ${
        isOver ? 'ring-2 ring-blue-400' : ''
      }`}
    >
      <div
        className={`flex items-center justify-between px-2 sm:px-3 py-2 rounded-t-lg ${HEADER_COLORS[id]}`}
      >
        <div className="flex items-center gap-1.5 sm:gap-2">
          <h3 className="font-semibold text-xs sm:text-sm">{title}</h3>
          <span className="text-xs opacity-70">({tickets.length})</span>
        </div>
        {onAddClick && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={onAddClick}
          >
            <Plus size={14} />
          </Button>
        )}
      </div>
      <ScrollArea className="flex-1 p-1.5 sm:p-2" style={{ height: 'calc(100vh - 220px)' }}>
        <div ref={setNodeRef} className="min-h-[100px]">
          <SortableContext
            items={tickets.map((t) => t.id)}
            strategy={verticalListSortingStrategy}
          >
            {tickets.map((ticket) => (
              <TicketCard
                key={ticket.id}
                ticket={ticket}
                onClick={() => onTicketClick?.(ticket)}
              />
            ))}
          </SortableContext>
          {tickets.length === 0 && (
            <div className="text-center text-gray-400 text-sm py-8">
              Drop tickets here
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
