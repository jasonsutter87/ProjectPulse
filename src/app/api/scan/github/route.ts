import { NextRequest, NextResponse } from 'next/server';
import { scanGitHubRepo, getGitHubProjectName } from '@/lib/github-scanner';
import { getStorageAsync } from '@/lib/storage';
import { getUserId } from '@/lib/auth';

// POST /api/scan/github - Scan a GitHub repository
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { repo_url, github_token } = body;

    if (!repo_url) {
      return NextResponse.json(
        { error: 'Repository URL is required' },
        { status: 400 }
      );
    }

    const result = await scanGitHubRepo(repo_url, github_token);

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error('GitHub scan failed:', error);
    const message = error instanceof Error ? error.message : 'Scan failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// Helper to import scan results as a project with tickets
interface ImportResult {
  project_id: number;
  project_name: string;
  tickets_created: number;
}

export async function importGitHubScanResult(
  userId: string | null,
  repoUrl: string,
  githubToken?: string
): Promise<ImportResult> {
  const storage = await getStorageAsync();

  // Scan the repo
  const result = await scanGitHubRepo(repoUrl, githubToken);

  // Check if project already exists
  let projectId = 0;
  const existing = await storage.getProjectByPath(userId, result.path);

  if (existing) {
    projectId = existing.id;
  } else {
    // Create project
    const project = await storage.createProject(userId, {
      name: result.name,
      path: result.path,
      description: result.tech_stacks.map((t) => t.name).join(', ') || undefined,
    });
    projectId = project.id;
  }

  // Get tags for mapping
  const tags = await storage.getTags(userId);
  const tagMap = new Map(tags.map((t) => [t.name, t.id]));

  let ticketsCreated = 0;

  // Create tickets for suggested todos
  for (const todo of result.suggested_todos) {
    const tagIds = todo.tags
      .map((tagName) => tagMap.get(tagName))
      .filter((id): id is number => id !== undefined);

    await storage.createTicket(userId, {
      title: todo.title,
      description: todo.description,
      project_id: projectId,
      status: 'backlog',
      priority: todo.priority as 0 | 1 | 2 | 3,
      tag_ids: tagIds,
    });

    ticketsCreated++;
  }

  return {
    project_id: projectId,
    project_name: result.name,
    tickets_created: ticketsCreated,
  };
}
