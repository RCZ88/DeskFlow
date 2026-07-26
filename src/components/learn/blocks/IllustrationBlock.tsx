import React, { useState } from 'react';
import { Loader2, ImageIcon, RefreshCw, AlertCircle } from 'lucide-react';

const api = (window as any).deskflowAPI;

interface Props {
  meta: {
    prompt: string;
    concept?: string;
    image_path?: string;
    generated: boolean;
    annotations?: string[];
    error?: string;
  };
  nodeId?: string;
  onGenerated?: (imagePath: string) => void;
}

export function IllustrationBlock({ meta, nodeId, onGenerated }: Props) {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(meta.error || null);
  const [imagePath, setImagePath] = useState<string | null>(meta.image_path || null);

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const result = await api.learnGenerateIllustration({
        prompt: meta.prompt,
        nodeId,
      });
      if (result.ok && result.data?.imagePath) {
        setImagePath(result.data.imagePath);
        onGenerated?.(result.data.imagePath);
      } else {
        setError(result.error || 'Generation failed');
      }
    } catch (e: any) {
      setError(e.message || 'Failed to generate illustration');
    }
    setGenerating(false);
  };

  return (
    <div className="rounded-xl border border-white/10 bg-[#1c1917]/40 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <ImageIcon className="w-4 h-4 text-amber-400" />
          <span className="text-sm font-medium text-zinc-200">Illustration</span>
          {meta.concept && (
            <span className="text-[10px] text-zinc-500 ml-1">— {meta.concept}</span>
          )}
        </div>
        {!meta.generated && !generating && (
          <button
            onClick={handleGenerate}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-500/15 text-amber-300 border border-amber-500/20 hover:bg-amber-500/25 transition-all"
          >
            <ImageIcon className="w-3 h-3" />
            Generate
          </button>
        )}
        {meta.generated && !generating && (
          <button
            onClick={handleGenerate}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] text-zinc-500 hover:text-zinc-300 transition-all"
          >
            <RefreshCw className="w-3 h-3" />
            Regenerate
          </button>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {generating ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Loader2 className="w-6 h-6 text-amber-400 animate-spin" />
            <p className="text-xs text-zinc-500">Generating illustration...</p>
            <p className="text-[10px] text-zinc-600 max-w-xs text-center">{meta.prompt}</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <AlertCircle className="w-6 h-6 text-red-400" />
            <p className="text-xs text-red-400">{error}</p>
            <button
              onClick={handleGenerate}
              className="text-[11px] text-zinc-500 hover:text-zinc-300 transition"
            >
              Try again
            </button>
          </div>
        ) : imagePath ? (
          <div className="relative">
            <img
              src={`file://${imagePath}`}
              alt={meta.concept || 'Illustration'}
              className="w-full rounded-lg"
              style={{ background: '#FFFFFF' }}
            />
            {meta.annotations && meta.annotations.length > 0 && (
              <div className="flex gap-2 mt-2 justify-center">
                {meta.annotations.map((ann, i) => (
                  <span key={i} className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    {ann}
                  </span>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <ImageIcon className="w-8 h-8 text-zinc-700" />
            <p className="text-xs text-zinc-600">Click "Generate" to create this illustration</p>
            <p className="text-[10px] text-zinc-700 max-w-sm text-center italic">{meta.prompt}</p>
          </div>
        )}
      </div>
    </div>
  );
}
