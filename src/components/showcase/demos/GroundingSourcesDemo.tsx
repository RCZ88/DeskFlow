export function GroundingSourcesDemo() {
  return (
    <div className="space-y-2 text-[11px]">
      <div className="flex items-center justify-between p-2 rounded bg-zinc-800/40">
        <div>
          <p className="text-zinc-200 font-medium">Attention Is All You Need</p>
          <p className="text-zinc-500 font-mono text-[10px]">arxiv.org/abs/1706.03762</p>
        </div>
        <span className="text-[9px] px-1.5 py-0.5 rounded bg-clay-500/15 text-clay-400">paper</span>
      </div>
      <div className="flex items-center justify-between p-2 rounded bg-zinc-800/40">
        <div>
          <p className="text-zinc-200 font-medium">PyTorch Documentation</p>
          <p className="text-zinc-500 font-mono text-[10px]">pytorch.org/docs/stable/nn.html</p>
        </div>
        <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400">docs</span>
      </div>
      <p className="text-[10px] text-zinc-600">Click Sources in the reader toolbar to manage per-node references.</p>
    </div>
  );
}
