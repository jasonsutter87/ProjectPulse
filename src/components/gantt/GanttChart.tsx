'use client';

import { useState, useMemo } from 'react';
import { TicketWithTags, Project, TicketStatus } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

interface GanttChartProps {
  tickets: TicketWithTags[];
  projects: Project[];
  onTicketClick?: (ticket: TicketWithTags) => void;
}

const STATUS_COLORS: Record<TicketStatus, string> = {
  backlog: '#9ca3af',
  in_progress: '#3b82f6',
  review: '#f59e0b',
  done: '#22c55e',
};

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function startOfWeek(date: Date): Date {
  const result = new Date(date);
  const day = result.getDay();
  result.setDate(result.getDate() - day);
  result.setHours(0, 0, 0, 0);
  return result;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getDaysBetween(start: Date, end: Date): number {
  return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

export function GanttChart({ tickets, projects, onTicketClick }: GanttChartProps) {
  const [weeksToShow] = useState(8);
  const [startDate, setStartDate] = useState(() => startOfWeek(new Date()));
  const [groupBy, setGroupBy] = useState<'project' | 'status'>('project');

  const endDate = useMemo(() => addDays(startDate, weeksToShow * 7), [startDate, weeksToShow]);

  // Filter tickets that have due dates
  const ticketsWithDates = useMemo(() =>
    tickets.filter(t => t.due_date),
    [tickets]
  );

  // Generate day columns
  const days = useMemo(() => {
    const result: Date[] = [];
    let current = new Date(startDate);
    while (current < endDate) {
      result.push(new Date(current));
      current = addDays(current, 1);
    }
    return result;
  }, [startDate, endDate]);

  // Group tickets
  const groupedTickets = useMemo(() => {
    const groups: Record<string, { name: string; color: string; tickets: TicketWithTags[] }> = {};

    if (groupBy === 'project') {
      // Add "No Project" group
      groups['none'] = { name: 'No Project', color: '#6b7280', tickets: [] };

      // Add project groups
      projects.forEach(p => {
        groups[p.id.toString()] = { name: p.name, color: '#3b82f6', tickets: [] };
      });

      ticketsWithDates.forEach(ticket => {
        const key = ticket.project_id?.toString() || 'none';
        if (groups[key]) {
          groups[key].tickets.push(ticket);
        }
      });
    } else {
      // Group by status
      groups['backlog'] = { name: 'Backlog', color: STATUS_COLORS.backlog, tickets: [] };
      groups['in_progress'] = { name: 'In Progress', color: STATUS_COLORS.in_progress, tickets: [] };
      groups['review'] = { name: 'Review', color: STATUS_COLORS.review, tickets: [] };
      groups['done'] = { name: 'Done', color: STATUS_COLORS.done, tickets: [] };

      ticketsWithDates.forEach(ticket => {
        if (groups[ticket.status]) {
          groups[ticket.status].tickets.push(ticket);
        }
      });
    }

    // Filter out empty groups
    return Object.entries(groups).filter(([_, g]) => g.tickets.length > 0);
  }, [ticketsWithDates, projects, groupBy]);

  const navigateWeeks = (direction: number) => {
    setStartDate(prev => addDays(prev, direction * 7));
  };

  const goToToday = () => {
    setStartDate(startOfWeek(new Date()));
  };

  const getTicketPosition = (ticket: TicketWithTags) => {
    if (!ticket.due_date) return null;

    const dueDate = new Date(ticket.due_date);
    const dayIndex = getDaysBetween(startDate, dueDate);

    // If due date is outside visible range, don't show
    if (dayIndex < 0 || dayIndex >= days.length) return null;

    // Position as percentage
    const left = (dayIndex / days.length) * 100;

    return { left: `${left}%`, dayIndex };
  };

  const isToday = (date: Date): boolean => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isWeekend = (date: Date): boolean => {
    const day = date.getDay();
    return day === 0 || day === 6;
  };

  if (ticketsWithDates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-500">
        <Calendar size={48} className="mb-4 opacity-50" />
        <p className="text-lg font-medium">No tickets with due dates</p>
        <p className="text-sm">Add due dates to your tickets to see them on the timeline</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => navigateWeeks(-1)}>
            <ChevronLeft size={16} />
          </Button>
          <Button variant="outline" size="sm" onClick={goToToday}>
            Today
          </Button>
          <Button variant="outline" size="icon" onClick={() => navigateWeeks(1)}>
            <ChevronRight size={16} />
          </Button>
          <span className="text-sm text-gray-600 ml-2">
            {formatDate(startDate)} - {formatDate(addDays(endDate, -1))}
          </span>
        </div>

        <Select value={groupBy} onValueChange={(v) => setGroupBy(v as 'project' | 'status')}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="project">Group by Project</SelectItem>
            <SelectItem value="status">Group by Status</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Gantt Chart */}
      <div className="flex-1 overflow-auto border rounded-lg bg-white">
        {/* Header - Days */}
        <div className="sticky top-0 z-10 flex border-b bg-gray-50">
          <div className="w-48 sm:w-64 flex-shrink-0 border-r p-2 font-medium text-sm bg-gray-50">
            Task
          </div>
          <div className="flex-1 flex">
            {days.map((day, i) => (
              <div
                key={i}
                className={`flex-1 min-w-[30px] text-center text-xs py-2 border-r ${
                  isToday(day) ? 'bg-blue-100 font-bold' : isWeekend(day) ? 'bg-gray-100' : ''
                }`}
              >
                <div className="hidden sm:block">{day.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                <div>{day.getDate()}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Rows */}
        {groupedTickets.map(([groupKey, group]) => (
          <div key={groupKey}>
            {/* Group Header */}
            <div className="flex border-b bg-gray-50">
              <div className="w-48 sm:w-64 flex-shrink-0 border-r p-2">
                <span className="font-medium text-sm" style={{ color: group.color }}>
                  {group.name}
                </span>
                <span className="text-xs text-gray-400 ml-2">({group.tickets.length})</span>
              </div>
              <div className="flex-1 relative">
                {days.map((day, i) => (
                  <div
                    key={i}
                    className={`absolute top-0 bottom-0 border-r ${
                      isToday(day) ? 'bg-blue-50' : isWeekend(day) ? 'bg-gray-50' : ''
                    }`}
                    style={{ left: `${(i / days.length) * 100}%`, width: `${100 / days.length}%` }}
                  />
                ))}
              </div>
            </div>

            {/* Tickets */}
            {group.tickets.map(ticket => {
              const pos = getTicketPosition(ticket);
              if (!pos) return null;

              const isOverdue = new Date(ticket.due_date!) < new Date() && ticket.status !== 'done';

              return (
                <div key={ticket.id} className="flex border-b hover:bg-gray-50">
                  <div
                    className="w-48 sm:w-64 flex-shrink-0 border-r p-2 cursor-pointer hover:bg-gray-100 truncate"
                    onClick={() => onTicketClick?.(ticket)}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: STATUS_COLORS[ticket.status] }}
                      />
                      <span className="text-sm truncate">{ticket.title}</span>
                    </div>
                  </div>
                  <div className="flex-1 relative h-10">
                    {/* Background grid */}
                    {days.map((day, i) => (
                      <div
                        key={i}
                        className={`absolute top-0 bottom-0 border-r ${
                          isToday(day) ? 'bg-blue-50' : isWeekend(day) ? 'bg-gray-50' : ''
                        }`}
                        style={{ left: `${(i / days.length) * 100}%`, width: `${100 / days.length}%` }}
                      />
                    ))}
                    {/* Ticket marker */}
                    <div
                      className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 cursor-pointer z-10 ${
                        isOverdue ? 'animate-pulse' : ''
                      }`}
                      style={{ left: pos.left }}
                      onClick={() => onTicketClick?.(ticket)}
                      title={`${ticket.title} - Due: ${new Date(ticket.due_date!).toLocaleDateString()}`}
                    >
                      <div
                        className={`w-4 h-4 sm:w-5 sm:h-5 rounded-full border-2 border-white shadow-md ${
                          isOverdue ? 'ring-2 ring-red-400' : ''
                        }`}
                        style={{ backgroundColor: STATUS_COLORS[ticket.status] }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mt-3 text-xs text-gray-600">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: STATUS_COLORS.backlog }} />
          <span>Backlog</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: STATUS_COLORS.in_progress }} />
          <span>In Progress</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: STATUS_COLORS.review }} />
          <span>Review</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: STATUS_COLORS.done }} />
          <span>Done</span>
        </div>
      </div>
    </div>
  );
}
