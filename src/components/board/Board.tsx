'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { Column } from './Column';
import { TicketCard } from './TicketCard';
import { TicketModal } from './TicketModal';
import { Button } from '@/components/ui/button';
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
  BOARD_COLUMNS,
  TicketPriority,
} from '@/types';
import { Plus, RefreshCw } from 'lucide-react';

export function Board() {
  const [tickets, setTickets] = useState<TicketWithTags[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTicket, setActiveTicket] = useState<TicketWithTags | null>(null);

  // Filters
  const [filterProject, setFilterProject] = useState<string>('all');
  const [filterTag, setFilterTag] = useState<string>('all');

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTicket, setEditingTicket] = useState<TicketWithTags | null>(null);
  const [newTicketStatus, setNewTicketStatus] = useState<TicketStatus>('backlog');

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [ticketsRes, tagsRes, projectsRes] = await Promise.all([
        fetch('/api/tickets'),
        fetch('/api/tags'),
        fetch('/api/projects'),
      ]);

      const [ticketsData, tagsData, projectsData] = await Promise.all([
        ticketsRes.json(),
        tagsRes.json(),
        projectsRes.json(),
      ]);

      setTickets(ticketsData);
      setTags(tagsData);
      setProjects(projectsData);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filter tickets
  const filteredTickets = tickets.filter((ticket) => {
    if (filterProject !== 'all' && ticket.project_id?.toString() !== filterProject) {
      return false;
    }
    if (filterTag !== 'all' && !ticket.tags.some((t) => t.id.toString() === filterTag)) {
      return false;
    }
    return true;
  });

  // Group tickets by status
  const ticketsByStatus = BOARD_COLUMNS.reduce(
    (acc, col) => {
      acc[col.id] = filteredTickets
        .filter((t) => t.status === col.id)
        .sort((a, b) => a.position - b.position);
      return acc;
    },
    {} as Record<TicketStatus, TicketWithTags[]>
  );

  const handleDragStart = (event: DragStartEvent) => {
    const ticket = tickets.find((t) => t.id === event.active.id);
    setActiveTicket(ticket || null);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeTicket = tickets.find((t) => t.id === active.id);
    if (!activeTicket) return;

    // Check if dropping over a column or another ticket
    const overId = over.id;
    let newStatus: TicketStatus;

    if (BOARD_COLUMNS.some((c) => c.id === overId)) {
      // Dropping directly on a column
      newStatus = overId as TicketStatus;
    } else {
      // Dropping on another ticket - get its status
      const overTicket = tickets.find((t) => t.id === overId);
      if (!overTicket) return;
      newStatus = overTicket.status;
    }

    if (activeTicket.status !== newStatus) {
      setTickets((prev) =>
        prev.map((t) =>
          t.id === activeTicket.id ? { ...t, status: newStatus } : t
        )
      );
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveTicket(null);
    const { active, over } = event;
    if (!over) return;

    const activeTicket = tickets.find((t) => t.id === active.id);
    if (!activeTicket) return;

    const overId = over.id;
    let newStatus: TicketStatus;
    let newPosition: number;

    if (BOARD_COLUMNS.some((c) => c.id === overId)) {
      // Dropped on empty column
      newStatus = overId as TicketStatus;
      newPosition = ticketsByStatus[newStatus].length;
    } else {
      // Dropped on another ticket
      const overTicket = tickets.find((t) => t.id === overId);
      if (!overTicket) return;
      newStatus = overTicket.status;

      const columnTickets = ticketsByStatus[newStatus];
      const oldIndex = columnTickets.findIndex((t) => t.id === active.id);
      const newIndex = columnTickets.findIndex((t) => t.id === overId);

      if (oldIndex !== -1 && newIndex !== -1) {
        // Reorder within same column
        const reordered = arrayMove(columnTickets, oldIndex, newIndex);
        setTickets((prev) => {
          const others = prev.filter((t) => t.status !== newStatus);
          return [
            ...others,
            ...reordered.map((t, i) => ({ ...t, position: i })),
          ];
        });
        newPosition = newIndex;
      } else {
        newPosition = newIndex !== -1 ? newIndex : columnTickets.length;
      }
    }

    // Persist to server
    try {
      await fetch('/api/tickets/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticket_id: activeTicket.id,
          new_status: newStatus,
          new_position: newPosition,
        }),
      });
    } catch (error) {
      console.error('Failed to reorder:', error);
      fetchData(); // Refresh on error
    }
  };

  const handleTicketClick = (ticket: TicketWithTags) => {
    setEditingTicket(ticket);
    setModalOpen(true);
  };

  const handleAddClick = (status: TicketStatus) => {
    setEditingTicket(null);
    setNewTicketStatus(status);
    setModalOpen(true);
  };

  const handleSaveTicket = async (data: {
    title: string;
    description: string;
    project_id: number | null;
    status: TicketStatus;
    priority: TicketPriority;
    due_date: string | null;
    tag_ids: number[];
  }) => {
    const url = editingTicket
      ? `/api/tickets/${editingTicket.id}`
      : '/api/tickets';
    const method = editingTicket ? 'PATCH' : 'POST';

    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    fetchData();
  };

  const handleDeleteTicket = async (id: number) => {
    await fetch(`/api/tickets/${id}`, { method: 'DELETE' });
    fetchData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="animate-spin" size={24} />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-3">
        <div className="flex items-center gap-2">
          <Button onClick={() => handleAddClick('backlog')} size="sm" className="sm:h-10 sm:px-4">
            <Plus size={16} className="mr-1" />
            <span className="hidden xs:inline">New Ticket</span>
            <span className="xs:hidden">Add</span>
          </Button>
          <Button variant="outline" size="icon" onClick={fetchData} className="h-9 w-9 sm:h-10 sm:w-10">
            <RefreshCw size={16} />
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          {/* Project Filter */}
          <Select value={filterProject} onValueChange={setFilterProject}>
            <SelectTrigger className="w-full sm:w-40 h-9 sm:h-10">
              <SelectValue placeholder="All Projects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id.toString()}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Tag Filter */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 -mx-1 px-1">
            <Badge
              variant={filterTag === 'all' ? 'default' : 'outline'}
              className="cursor-pointer flex-shrink-0"
              onClick={() => setFilterTag('all')}
            >
              All
            </Badge>
            {tags.map((tag) => (
              <Badge
                key={tag.id}
                variant={filterTag === tag.id.toString() ? 'default' : 'outline'}
                className="cursor-pointer flex-shrink-0"
                style={
                  filterTag === tag.id.toString()
                    ? { backgroundColor: tag.color }
                    : { borderColor: tag.color, color: tag.color }
                }
                onClick={() => setFilterTag(tag.id.toString())}
              >
                {tag.name}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      {/* Board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4 flex-1">
          {BOARD_COLUMNS.map((col) => (
            <Column
              key={col.id}
              id={col.id}
              title={col.title}
              tickets={ticketsByStatus[col.id]}
              onTicketClick={handleTicketClick}
              onAddClick={() => handleAddClick(col.id)}
            />
          ))}
        </div>

        <DragOverlay>
          {activeTicket && <TicketCard ticket={activeTicket} />}
        </DragOverlay>
      </DndContext>

      {/* Ticket Modal */}
      <TicketModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        ticket={editingTicket}
        tags={tags}
        projects={projects}
        defaultStatus={newTicketStatus}
        onSave={handleSaveTicket}
        onDelete={handleDeleteTicket}
      />
    </div>
  );
}
