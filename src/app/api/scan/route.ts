import { NextRequest, NextResponse } from 'next/server';
import { scanProject, getProjectName, ScanResult } from '@/lib/scanner';
import { getStorage } from '@/lib/storage';

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
  const storage = getStorage();

  let projectId = 0;

  if (createProject) {
    // Check if project already exists
    const existing = await storage.getProjectByPath(result.path);

    if (existing) {
      projectId = existing.id;
    } else {
      // Create project
      const projectName = getProjectName(result.path);
      const techDescription = result.tech_stacks.map((t) => t.name).join(', ');

      const project = await storage.createProject({
        name: projectName,
        path: result.path,
        description: techDescription || undefined,
      });

      projectId = project.id;
    }
  }

  // Get tags for mapping
  const tags = await storage.getTags();
  const tagMap = new Map(tags.map((t) => [t.name, t.id]));

  let ticketsCreated = 0;

  // Create tickets for suggested todos
  for (const todo of result.suggested_todos) {
    // Get tag IDs for this todo
    const tagIds = todo.tags
      .map((tagName) => tagMap.get(tagName))
      .filter((id): id is number => id !== undefined);

    await storage.createTicket({
      title: todo.title,
      description: todo.description,
      project_id: projectId || null,
      status: 'backlog',
      priority: todo.priority as 0 | 1 | 2 | 3,
      tag_ids: tagIds,
    });

    ticketsCreated++;
  }

  return {
    project_id: projectId,
    project_name: getProjectName(result.path),
    tickets_created: ticketsCreated,
  };
}
