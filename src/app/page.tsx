import Link from 'next/link';
import { Board } from '@/components/board';
import { Button } from '@/components/ui/button';
import { FolderOpen } from 'lucide-react';

export default function Home() {
  return (
    <main className="min-h-screen p-6 bg-gray-50">
      <div className="max-w-[1600px] mx-auto">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">ProjectPulse</h1>
            <p className="text-gray-500 text-sm">Manage your projects and tasks</p>
          </div>
          <Link href="/projects">
            <Button variant="outline">
              <FolderOpen size={16} className="mr-2" />
              Projects
            </Button>
          </Link>
        </header>
        <Board />
      </div>
    </main>
  );
}
