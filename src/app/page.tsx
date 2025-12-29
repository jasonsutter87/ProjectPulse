import Link from 'next/link';
import { Board } from '@/components/board';
import { Button } from '@/components/ui/button';
import { FolderOpen } from 'lucide-react';

export default function Home() {
  return (
    <main className="min-h-screen p-3 sm:p-6 bg-gray-50">
      <div className="max-w-[1600px] mx-auto">
        <header className="mb-4 sm:mb-6 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">ProjectPulse</h1>
            <p className="text-gray-500 text-xs sm:text-sm hidden sm:block">Manage your projects and tasks</p>
          </div>
          <Link href="/projects">
            <Button variant="outline" size="sm" className="sm:h-10 sm:px-4">
              <FolderOpen size={16} className="sm:mr-2" />
              <span className="hidden sm:inline">Projects</span>
            </Button>
          </Link>
        </header>
        <Board />
      </div>
    </main>
  );
}
