import { Board } from '@/components/board';

export default function Home() {
  return (
    <main className="min-h-screen p-6 bg-gray-50">
      <div className="max-w-[1600px] mx-auto">
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">ProjectPulse</h1>
          <p className="text-gray-500 text-sm">Manage your projects and tasks</p>
        </header>
        <Board />
      </div>
    </main>
  );
}
