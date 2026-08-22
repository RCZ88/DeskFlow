export function KnowledgeIntakeDemo() {
  return (
    <div className="space-y-3 text-[11px]">
      <div className="flex gap-1">
        <span className="px-2 py-1 rounded-md bg-clay-500/15 text-clay-300 text-[10px] font-medium">Survey</span>
        <span className="px-2 py-1 rounded-md bg-zinc-800/40 text-zinc-500 text-[10px]">Extract</span>
        <span className="px-2 py-1 rounded-md bg-zinc-800/40 text-zinc-500 text-[10px]">Topic Focus</span>
      </div>
      <div className="p-2 rounded bg-zinc-800/40 border border-zinc-700/30">
        <p className="text-clay-300 text-[10px] mb-1">AI:</p>
        <p className="text-zinc-300">What's the last project you built with React? How did you handle state management?</p>
      </div>
      <div className="p-2 rounded bg-clay-500/5 border border-clay-500/20">
        <p className="text-clay-400 text-[10px] mb-1">You:</p>
        <p className="text-zinc-300">I built a dashboard with Zustand for global state and local useState for form fields.</p>
      </div>
      <p className="text-[10px] text-zinc-600">3 modes: survey (Q&A), extract (paste chat), topic-focused extraction.</p>
    </div>
  );
}
