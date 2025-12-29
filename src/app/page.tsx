'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Board } from '@/components/board';
import { GanttChart } from '@/components/gantt';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { FolderOpen, LayoutGrid, GanttChartSquare } from 'lucide-react';
import { TicketWithTags, Project, Tag, TicketStatus, TicketPriority } from '@/types';
import { TicketModal } from '@/components/board/TicketModal';
import { useEffect, useCallback } from 'react';

type ViewMode = 'board' | 'gantt';

export default function Home() {
  const [view, setView] = useState<ViewMode>('board');
  const [tickets, setTickets] = useState<TicketWithTags[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal state for Gantt view
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTicket, setEditingTicket] = useState<TicketWithTags | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [ticketsRes, projectsRes, tagsRes] = await Promise.all([
        fetch('/api/tickets'),
        fetch('/api/projects'),
        fetch('/api/tags'),
      ]);

      const [ticketsData, projectsData, tagsData] = await Promise.all([
        ticketsRes.json(),
        projectsRes.json(),
        tagsRes.json(),
      ]);

      setTickets(ticketsData);
      setProjects(projectsData);
      setTags(tagsData);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleTicketClick = (ticket: TicketWithTags) => {
    setEditingTicket(ticket);
    setModalOpen(true);
  };

  const handleSaveTicket = async (data: {
    title: string;
    description: string;
    project_id: number | null;
    status: TicketStatus;
    priority: TicketPriority;
    start_date: string | null;
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

  return (
    <main className="min-h-screen p-3 sm:p-6 bg-gray-50">
      <div className="max-w-[1600px] mx-auto h-[calc(100vh-24px)] sm:h-[calc(100vh-48px)] flex flex-col">
        <header className="mb-4 sm:mb-6 flex items-center justify-between gap-2 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">ProjectPulse</h1>
              <p className="text-gray-500 text-xs sm:text-sm hidden sm:block">Manage your projects and tasks</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Toggle */}
            <ToggleGroup type="single" value={view} onValueChange={(v) => v && setView(v as ViewMode)}>
              <ToggleGroupItem value="board" aria-label="Board view" className="px-2 sm:px-3">
                <LayoutGrid size={16} className="sm:mr-1" />
                <span className="hidden sm:inline text-sm">Board</span>
              </ToggleGroupItem>
              <ToggleGroupItem value="gantt" aria-label="Timeline view" className="px-2 sm:px-3">
                <GanttChartSquare size={16} className="sm:mr-1" />
                <span className="hidden sm:inline text-sm">Timeline</span>
              </ToggleGroupItem>
            </ToggleGroup>

            <Link href="/projects">
              <Button variant="outline" size="sm" className="sm:h-10 sm:px-4">
                <FolderOpen size={16} className="sm:mr-2" />
                <span className="hidden sm:inline">Projects</span>
              </Button>
            </Link>
          </div>
        </header>

        <div className="flex-1 overflow-hidden">
          {view === 'board' ? (
            <Board />
          ) : (
            <>
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
                </div>
              ) : (
                <GanttChart
                  tickets={tickets}
                  projects={projects}
                  onTicketClick={handleTicketClick}
                />
              )}
            </>
          )}
        </div>

        {/* Ticket Modal for Gantt view */}
        {view === 'gantt' && (
          <TicketModal
            open={modalOpen}
            onOpenChange={setModalOpen}
            ticket={editingTicket}
            tags={tags}
            projects={projects}
            onSave={handleSaveTicket}
            onDelete={handleDeleteTicket}
          />
        )}
      </div>
    </main>
  );
}
