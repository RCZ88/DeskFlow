export function AIEditDemo() {
  return (
    <div className="space-y-2 text-[11px]">
      <div className="p-2 rounded bg-zinc-800/40">
        <p className="text-[10px] text-zinc-500 mb-1">Selected text:</p>
        <p className="text-zinc-300 italic">"The transformer uses self-attention to look at all positions at once"</p>
      </div>
      <div className="flex gap-1">
        <span className="px-2 py-1 rounded bg-emerald-500/15 text-emerald-300 text-[10px]">Simpler</span>
        <span className="px-2 py-1 rounded bg-clay-500/15 text-clay-300 text-[10px]">Explain</span>
        <span className="px-2 py-1 rounded bg-amber-500/15 text-amber-300 text-[10px]">Edit</span>
        <span className="px-2 py-1 rounded bg-zinc-800/40 text-zinc-500 text-[10px]">Deeper</span>
      </div>
      <div className="p-2 rounded bg-emerald-500/5 border border-emerald-500/20">
        <p className="text-[10px] text-emerald-400 mb-1">Rewritten:</p>
        <p className="text-zinc-300">"Unlike RNNs that read one word at a time, transformers use self-attention to process every word simultaneously — each word can directly attend to every other word in the sequence."</p>
      </div>
    </div>
  );
}
