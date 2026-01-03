'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SprintWithDetails } from '@/types';
import { FolderGit2, GitBranch, Globe, Rocket, Copy, Check, Terminal } from 'lucide-react';

interface SprintConfigModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sprint: SprintWithDetails;
  onConfigured: () => void;
}

export function SprintConfigModal({
  open,
  onOpenChange,
  sprint,
  onConfigured,
}: SprintConfigModalProps) {
  const [repoType, setRepoType] = useState<'local' | 'remote'>('local');
  const [localPath, setLocalPath] = useState('');
  const [remoteUrl, setRemoteUrl] = useState('');
  const [baseBranch, setBaseBranch] = useState('main');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCommand, setShowCommand] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (sprint) {
      if (sprint.target_repo_url) {
        setRepoType('remote');
        setRemoteUrl(sprint.target_repo_url);
      } else if (sprint.target_repo_path) {
        setRepoType('local');
        setLocalPath(sprint.target_repo_path);
      }
      setBaseBranch(sprint.base_branch || 'main');
    }
  }, [sprint]);

  const handleConfigure = async () => {
    setError(null);
    setSaving(true);

    try {
      const res = await fetch(`/api/sprints/${sprint.id}/configure`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target_repo_path: repoType === 'local' ? localPath : null,
          target_repo_url: repoType === 'remote' ? remoteUrl : null,
          base_branch: baseBranch,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to configure sprint');
      }

      onConfigured();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to configure sprint');
    } finally {
      setSaving(false);
    }
  };

  const handleShowCommand = async () => {
    setError(null);

    // First save config if needed
    if (!sprint.target_repo_path && !sprint.target_repo_url) {
      await handleConfigure();
    }

    setShowCommand(true);
    setCopied(false);
  };

  const command = `@sprint-orchestrator start --sprint-id=${sprint.id}`;
  const resumeCommand = `@sprint-orchestrator resume --sprint-id=${sprint.id}`;

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const isConfigured = repoType === 'local' ? !!localPath : !!remoteUrl;
  const canStart = isConfigured && sprint.orchestrator_status === 'idle';

  return (
    <Dialog open={open} onOpenChange={(open) => {
      if (!open) setShowCommand(false);
      onOpenChange(open);
    }}>
      <DialogContent className="sm:max-w-lg">
        {!showCommand ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Rocket size={20} />
                Configure Sprint Orchestrator
              </DialogTitle>
              <DialogDescription>
                Set up the target repository for &quot;{sprint.name}&quot;
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {error && (
                <div className="text-sm text-red-500 bg-red-50 dark:bg-red-950 p-3 rounded-md">
                  {error}
                </div>
              )}

              <div>
                <label className="text-sm font-medium">Repository Type</label>
                <Select value={repoType} onValueChange={(v) => setRepoType(v as 'local' | 'remote')}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="local">
                      <div className="flex items-center gap-2">
                        <FolderGit2 size={14} />
                        Local Path
                      </div>
                    </SelectItem>
                    <SelectItem value="remote">
                      <div className="flex items-center gap-2">
                        <Globe size={14} />
                        Remote URL
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {repoType === 'local' ? (
                <div>
                  <label className="text-sm font-medium">Local Repository Path</label>
                  <div className="relative mt-1">
                    <Input
                      value={localPath}
                      onChange={(e) => setLocalPath(e.target.value)}
                      placeholder="/path/to/your/project"
                      className="pl-9"
                    />
                    <FolderGit2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Absolute path to the git repository on your local machine
                  </p>
                </div>
              ) : (
                <div>
                  <label className="text-sm font-medium">Remote Repository URL</label>
                  <div className="relative mt-1">
                    <Input
                      value={remoteUrl}
                      onChange={(e) => setRemoteUrl(e.target.value)}
                      placeholder="https://github.com/user/repo.git"
                      className="pl-9"
                    />
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    HTTPS or SSH URL for cloning the repository
                  </p>
                </div>
              )}

              <div>
                <label className="text-sm font-medium">Base Branch</label>
                <div className="relative mt-1">
                  <Input
                    value={baseBranch}
                    onChange={(e) => setBaseBranch(e.target.value)}
                    placeholder="main"
                    className="pl-9"
                  />
                  <GitBranch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Branch to create the sprint branch from (usually main or develop)
                </p>
              </div>

              {sprint.sprint_branch && (
                <div className="text-sm bg-muted p-3 rounded-md">
                  <p className="font-medium">Sprint Branch</p>
                  <code className="text-xs">{sprint.sprint_branch}</code>
                </div>
              )}
            </div>

            <DialogFooter className="flex flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                variant="secondary"
                onClick={handleConfigure}
                disabled={saving || !isConfigured}
              >
                {saving ? 'Saving...' : 'Save Configuration'}
              </Button>
              <Button
                onClick={handleShowCommand}
                disabled={!canStart}
                className="bg-green-600 hover:bg-green-700"
              >
                <Rocket size={16} className="mr-2" />
                Start Orchestrator
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Terminal size={20} />
                Run in Claude Code
              </DialogTitle>
              <DialogDescription>
                Copy and paste this command into Claude Code CLI
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium text-green-600">Start Sprint</label>
                <div className="mt-2 flex items-center gap-2">
                  <code className="flex-1 bg-gray-900 text-green-400 p-3 rounded-md text-sm font-mono">
                    {command}
                  </code>
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => handleCopy(command)}
                    className="shrink-0"
                  >
                    {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                  </Button>
                </div>
              </div>

              <div className="border-t pt-4">
                <label className="text-sm font-medium text-muted-foreground">Resume (if interrupted)</label>
                <div className="mt-2 flex items-center gap-2">
                  <code className="flex-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 p-3 rounded-md text-sm font-mono">
                    {resumeCommand}
                  </code>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleCopy(resumeCommand)}
                    className="shrink-0"
                  >
                    <Copy size={16} />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Use this if context runs out or the orchestrator pauses
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCommand(false)}>
                Back
              </Button>
              <Button onClick={() => onOpenChange(false)}>
                Done
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
