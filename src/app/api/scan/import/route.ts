import { NextRequest, NextResponse } from 'next/server';
import { scanProject, ScanResult } from '@/lib/scanner';
import { importScanResult } from '../route';

interface ImportRequest {
  path: string;
  max_depth?: number;
  include_subprojects?: boolean;
}

// POST /api/scan/import - Scan and import a project with todos
export async function POST(request: NextRequest) {
  try {
    const body: ImportRequest = await request.json();
    const { path: projectPath, max_depth = 1, include_subprojects = false } = body;

    if (!projectPath) {
      return NextResponse.json(
        { error: 'Path is required' },
        { status: 400 }
      );
    }

    // Scan the project
    const scanResult = scanProject(projectPath, max_depth);

    // Import main project
    const mainResult = await importScanResult(scanResult, true);

    const results = [mainResult];

    // Import subprojects if requested
    if (include_subprojects && scanResult.subprojects.length > 0) {
      for (const subproject of scanResult.subprojects) {
        const subResult = await importScanResult(subproject, true);
        results.push(subResult);
      }
    }

    const totalTickets = results.reduce((sum, r) => sum + r.tickets_created, 0);

    return NextResponse.json({
      success: true,
      projects_imported: results.length,
      tickets_created: totalTickets,
      details: results,
      scan: scanResult,
    });
  } catch (error: unknown) {
    console.error('Import failed:', error);
    const message = error instanceof Error ? error.message : 'Import failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
