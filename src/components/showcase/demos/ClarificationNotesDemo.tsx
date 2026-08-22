export function ClarificationNotesDemo() {
  return (
    <div className="space-y-2 text-[11px]">
      <div className="flex items-center gap-2 mb-2">
        <span className="px-2 py-1 rounded-md bg-amber-500/15 text-amber-300 text-[10px] font-medium">Clarifications</span>
        <span className="text-[10px] text-zinc-600">2 Q&A pairs</span>
      </div>
      <div className="p-2 rounded bg-zinc-800/40 border-l-2 border-amber-500/40">
        <p className="text-amber-400/80 text-[10px] font-medium">Q: Do you want Python or C++ examples?</p>
        <p className="text-zinc-300 mt-1">A: Python please, I'm more comfortable with it.</p>
      </div>
      <div className="p-2 rounded bg-zinc-800/40 border-l-2 border-amber-500/40">
        <p className="text-amber-400/80 text-[10px] font-medium">Q: How deep should the math derivations go?</p>
        <p className="text-zinc-300 mt-1">A: Intuition first, full derivations in layer-reveal blocks.</p>
      </div>
      <p className="text-[10px] text-zinc-600">Saved as tagged notes — filter by "Clarifications" in the notes panel.</p>
    </div>
  );
}
