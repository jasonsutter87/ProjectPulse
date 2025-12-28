import { NextRequest, NextResponse } from 'next/server';
import { scanProject, getProjectName, ScanResult } from '@/lib/scanner';
import { getDb } from '@/lib/db';

// POST /api/scan - Scan a directory and return results
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { path: projectPath, max_depth = 1 } = body;

    if (!projectPath) {
      return NextResponse.json(
        { error: 'Path is required' },
        { status: 400 }
      );
    }

    const result = scanProject(projectPath, max_depth);

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error('Scan failed:', error);
    const message = error instanceof Error ? error.message : 'Scan failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// Helper to create todos from scan result
interface ImportResult {
  project_id: number;
  project_name: string;
  tickets_created: number;
}

export async function importScanResult(
  result: ScanResult,
  createProject: boolean = true
): Promise<ImportResult> {
  const db = getDb();

  let projectId: number;

  if (createProject) {
    // Check if project already exists
    const existing = db.prepare('SELECT id FROM projects WHERE path = ?').get(result.path) as { id: number } | undefined;

    if (existing) {
      projectId = existing.id;
    } else {
      // Create project
      const projectName = getProjectName(result.path);
      const techDescription = result.tech_stacks.map((t) => t.name).join(', ');

      const insertResult = db.prepare(`
        INSERT INTO projects (name, path, description)
        VALUES (?, ?, ?)
      `).run(projectName, result.path, techDescription || null);

      projectId = insertResult.lastInsertRowid as number;
    }
  } else {
    projectId = 0;
  }

  // Get tag IDs
  const tagMap = new Map<string, number>();
  const tags = db.prepare('SELECT id, name FROM tags').all() as { id: number; name: string }[];
  for (const tag of tags) {
    tagMap.set(tag.name, tag.id);
  }

  let ticketsCreated = 0;

  // Create tickets for suggested todos
  for (const todo of result.suggested_todos) {
    // Check if similar ticket already exists
    const existing = db.prepare(`
      SELECT id FROM tickets WHERE title = ? AND project_id = ?
    `).get(todo.title, projectId || null);

    if (!existing) {
      const maxPos = db.prepare(`
        SELECT COALESCE(MAX(position), -1) as max_pos FROM tickets WHERE status = 'backlog'
      `).get() as { max_pos: number };

      const ticketResult = db.prepare(`
        INSERT INTO tickets (title, description, project_id, status, priority, position)
        VALUES (?, ?, ?, 'backlog', ?, ?)
      `).run(
        todo.title,
        todo.description,
        projectId || null,
        todo.priority,
        maxPos.max_pos + 1
      );

      const ticketId = ticketResult.lastInsertRowid as number;

      // Add tags
      for (const tagName of todo.tags) {
        const tagId = tagMap.get(tagName);
        if (tagId) {
          db.prepare('INSERT OR IGNORE INTO ticket_tags (ticket_id, tag_id) VALUES (?, ?)').run(
            ticketId,
            tagId
          );
        }
      }

      ticketsCreated++;
    }
  }

  return {
    project_id: projectId,
    project_name: getProjectName(result.path),
    tickets_created: ticketsCreated,
  };
}
