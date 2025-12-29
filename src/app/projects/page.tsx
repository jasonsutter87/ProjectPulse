'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Project } from '@/types';
import { ScanResult } from '@/lib/scanner';
import { ArrowLeft, FolderSearch, Plus, Trash2, RefreshCw, Check, X } from 'lucide-react';

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  // Scan modal state
  const [scanModalOpen, setScanModalOpen] = useState(false);
  const [scanPath, setScanPath] = useState('');
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ projects_imported: number; tickets_created: number } | null>(null);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/projects');
      const data = await res.json();
      setProjects(data);
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleScan = async () => {
    if (!scanPath.trim()) return;

    setScanning(true);
    setScanResult(null);
    setImportResult(null);

    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: scanPath.trim(), max_depth: 1 }),
      });

      if (!res.ok) {
        const error = await res.json();
        alert(error.error || 'Scan failed');
        return;
      }

      const result = await res.json();
      setScanResult(result);
    } catch (error) {
      console.error('Scan failed:', error);
      alert('Scan failed');
    } finally {
      setScanning(false);
    }
  };

  const handleImport = async (includeSubprojects: boolean = false) => {
    if (!scanPath.trim()) return;

    setImporting(true);
    try {
      const res = await fetch('/api/scan/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: scanPath.trim(),
          max_depth: 1,
          include_subprojects: includeSubprojects,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        alert(error.error || 'Import failed');
        return;
      }

      const result = await res.json();
      setImportResult(result);
      fetchProjects();
    } catch (error) {
      console.error('Import failed:', error);
      alert('Import failed');
    } finally {
      setImporting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this project and all its tickets?')) return;

    try {
      await fetch(`/api/projects/${id}`, { method: 'DELETE' });
      fetchProjects();
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  const closeScanModal = () => {
    setScanModalOpen(false);
    setScanPath('');
    setScanResult(null);
    setImportResult(null);
  };

  return (
    <main className="min-h-screen p-6 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <header className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft size={20} />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
              <p className="text-gray-500 text-sm">Manage your projects and scan new ones</p>
            </div>
          </div>
          <Button onClick={() => setScanModalOpen(true)}>
            <FolderSearch size={16} className="mr-2" />
            Scan Project
          </Button>
        </header>

        {loading ? (
          <div className="flex justify-center py-12">
            <RefreshCw className="animate-spin" size={24} />
          </div>
        ) : projects.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-500 mb-4">No projects yet.</p>
              <Button onClick={() => setScanModalOpen(true)}>
                <Plus size={16} className="mr-2" />
                Add Your First Project
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {projects.map((project) => (
              <Card key={project.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{project.name}</CardTitle>
                      <p className="text-sm text-gray-500 font-mono mt-1">{project.path}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {project.is_active ? (
                        <Badge variant="secondary" className="bg-green-100 text-green-700">
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-gray-100 text-gray-500">
                          Inactive
                        </Badge>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-500 hover:text-red-700"
                        onClick={() => handleDelete(project.id)}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                {project.description && (
                  <CardContent className="pt-0">
                    <p className="text-sm text-gray-600">{project.description}</p>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        )}

        {/* Scan Modal */}
        <Dialog open={scanModalOpen} onOpenChange={closeScanModal}>
          <DialogContent className="sm:max-w-xl max-h-[85vh] flex flex-col">
            <DialogHeader className="flex-shrink-0">
              <DialogTitle>Scan Project</DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4 overflow-y-auto flex-1">
              <div>
                <label className="text-sm font-medium">Project Path</label>
                <div className="flex gap-2 mt-1">
                  <Input
                    value={scanPath}
                    onChange={(e) => setScanPath(e.target.value)}
                    placeholder="/path/to/your/project"
                    className="font-mono"
                  />
                  <Button onClick={handleScan} disabled={scanning || !scanPath.trim()}>
                    {scanning ? <RefreshCw className="animate-spin" size={16} /> : 'Scan'}
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Enter the full path to your project directory
                </p>
              </div>

              {scanResult && (
                <div className="space-y-4 border-t pt-4">
                  <div>
                    <h4 className="font-medium">{scanResult.name}</h4>
                    <p className="text-sm text-gray-500 font-mono">{scanResult.path}</p>
                  </div>

                  {scanResult.tech_stacks.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-2">Tech Stack</p>
                      <div className="flex flex-wrap gap-1">
                        {scanResult.tech_stacks.map((tech, i) => (
                          <Badge key={i} variant="secondary">
                            {tech.name}
                            {tech.version && <span className="ml-1 opacity-60">{tech.version}</span>}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {scanResult.missing.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-2">Missing ({scanResult.missing.length})</p>
                      <div className="flex flex-wrap gap-1">
                        {scanResult.missing.map((item, i) => (
                          <Badge key={i} variant="outline" className="text-orange-600 border-orange-300">
                            <X size={12} className="mr-1" />
                            {item}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {scanResult.suggested_todos.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-2">
                        Suggested Todos ({scanResult.suggested_todos.length})
                      </p>
                      <div className="space-y-1 max-h-40 overflow-y-auto">
                        {scanResult.suggested_todos.map((todo, i) => (
                          <div key={i} className="text-sm p-2 bg-gray-50 rounded flex items-start gap-2">
                            <Check size={14} className="mt-0.5 text-green-600 flex-shrink-0" />
                            <span>{todo.title}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {scanResult.subprojects.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-2">
                        Subprojects ({scanResult.subprojects.length})
                      </p>
                      <div className="space-y-1">
                        {scanResult.subprojects.map((sub, i) => (
                          <div key={i} className="text-sm p-2 bg-blue-50 rounded">
                            <span className="font-medium">{sub.name}</span>
                            <span className="text-gray-500 ml-2">
                              {sub.tech_stacks.map((t) => t.name).join(', ')}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {importResult && (
                    <div className="p-3 bg-green-50 rounded-lg">
                      <p className="text-green-700 font-medium">
                        Import complete!
                      </p>
                      <p className="text-sm text-green-600">
                        {importResult.projects_imported} project(s) and {importResult.tickets_created} ticket(s) created.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <DialogFooter className="flex-shrink-0">
              <Button variant="outline" onClick={closeScanModal}>
                Close
              </Button>
              {scanResult && !importResult && (
                <>
                  <Button
                    onClick={() => handleImport(false)}
                    disabled={importing}
                  >
                    {importing ? 'Importing...' : 'Import Project'}
                  </Button>
                  {scanResult.subprojects.length > 0 && (
                    <Button
                      variant="secondary"
                      onClick={() => handleImport(true)}
                      disabled={importing}
                    >
                      Import All ({scanResult.subprojects.length + 1})
                    </Button>
                  )}
                </>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </main>
  );
}
