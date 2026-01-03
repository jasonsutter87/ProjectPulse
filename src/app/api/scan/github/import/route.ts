import { NextRequest, NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth';
import { importGitHubScanResult } from '../route';
import { scanGitHubRepo } from '@/lib/github-scanner';

// POST /api/scan/github/import - Scan and import a GitHub repository
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId();
    const body = await request.json();
    const { repo_url, github_token } = body;

    if (!repo_url) {
      return NextResponse.json(
        { error: 'Repository URL is required' },
        { status: 400 }
      );
    }

    // Import the repo
    const importResult = await importGitHubScanResult(userId, repo_url, github_token);

    // Also return the scan results for display
    const scanResult = await scanGitHubRepo(repo_url, github_token);

    return NextResponse.json({
      success: true,
      project_id: importResult.project_id,
      project_name: importResult.project_name,
      tickets_created: importResult.tickets_created,
      scan: scanResult,
    });
  } catch (error: unknown) {
    console.error('GitHub import failed:', error);
    const message = error instanceof Error ? error.message : 'Import failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
