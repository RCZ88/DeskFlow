interface StyleDescriptionProps {
  value: string;
  onChange: (value: string) => void;
}

const EXAMPLES = [
  'Dark theme with pink accent on zinc background',
  'Warm tones, terracotta + cream, editorial feel',
  'Cyberpunk neon — magenta, cyan, deep purple base',
  'Minimal black/white with emerald accent for success states',
];

export function StyleDescription({ value, onChange }: StyleDescriptionProps) {
  return (
    <div className="p-4 bg-zinc-900/50 border border-zinc-800/50 rounded-lg">
      <h3 className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-3">
        Style Description
      </h3>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="Describe your design style — colors, mood, inspiration..."
        rows={3}
        className="w-full px-3 py-2 text-[11px] bg-zinc-950 border border-zinc-700/50 rounded text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-pink-500/50 resize-none"
      />
      {!value && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {EXAMPLES.map(ex => (
            <button
              key={ex}
              onClick={() => onChange(ex)}
              className="px-2 py-1 text-[8px] text-zinc-500 bg-zinc-800/50 hover:bg-zinc-800 hover:text-zinc-300 rounded transition-colors"
            >
              {ex}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
