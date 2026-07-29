import { useNavigate } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[60vh] p-8 text-center">
      <div className="max-w-md">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="w-8 h-8 text-amber-400" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Page not found</h1>
        <p className="text-zinc-400 text-sm mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>

        <div className="flex flex-col gap-3">
          <button
            onClick={() => navigate('/')}
            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors"
          >
            Go to Dashboard
          </button>

          <div className="flex flex-wrap justify-center gap-2">
            <button
              onClick={() => navigate('/activity')}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors text-sm"
            >
              Activity
            </button>
            <button
              onClick={() => navigate('/terminal')}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors text-sm"
            >
              Terminal
            </button>
            <button
              onClick={() => navigate('/ide')}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors text-sm"
            >
              IDE
            </button>
            <button
              onClick={() => navigate('/settings')}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors text-sm"
            >
              Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
