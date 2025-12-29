import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import os from 'os';

interface DirectoryItem {
  name: string;
  path: string;
  isDirectory: boolean;
  hasChildren: boolean;
}

// GET /api/browse?path=/some/path - List directories
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    let dirPath = searchParams.get('path') || os.homedir();

    // Handle ~ for home directory
    if (dirPath.startsWith('~')) {
      dirPath = dirPath.replace('~', os.homedir());
    }

    // Resolve to absolute path
    dirPath = path.resolve(dirPath);

    if (!fs.existsSync(dirPath)) {
      return NextResponse.json({ error: 'Path does not exist' }, { status: 404 });
    }

    const stats = fs.statSync(dirPath);
    if (!stats.isDirectory()) {
      return NextResponse.json({ error: 'Path is not a directory' }, { status: 400 });
    }

    const entries = fs.readdirSync(dirPath, { withFileTypes: true });

    const items: DirectoryItem[] = entries
      .filter((entry) => {
        // Only show directories, skip hidden files except common ones
        if (!entry.isDirectory()) return false;
        if (entry.name.startsWith('.') && !['..'].includes(entry.name)) return false;
        // Skip system directories
        if (['node_modules', '__pycache__', '.git', 'build', 'dist', '.next'].includes(entry.name)) return false;
        return true;
      })
      .map((entry) => {
        const fullPath = path.join(dirPath, entry.name);
        let hasChildren = false;
        try {
          const subEntries = fs.readdirSync(fullPath, { withFileTypes: true });
          hasChildren = subEntries.some((e) => e.isDirectory() && !e.name.startsWith('.'));
        } catch {
          // Permission denied or other error
        }
        return {
          name: entry.name,
          path: fullPath,
          isDirectory: true,
          hasChildren,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    // Get parent directory
    const parentPath = path.dirname(dirPath);
    const canGoUp = parentPath !== dirPath;

    return NextResponse.json({
      current: dirPath,
      parent: canGoUp ? parentPath : null,
      items,
    });
  } catch (error: unknown) {
    console.error('Browse failed:', error);
    const message = error instanceof Error ? error.message : 'Browse failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
