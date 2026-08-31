export function OpenSource() {
  return (
    <section className="relative min-h-[60vh] flex flex-col items-center justify-center bg-bg px-8 py-24">
      <div className="max-w-[800px] text-center">
        <span className="block text-[0.7rem] tracking-[0.15em] text-amber uppercase font-mono mb-4">
          OPEN SOURCE
        </span>
        <h2 className="text-[clamp(2rem,4vw,3rem)] font-extrabold tracking-tight text-text mb-6">
          Trust, not terms.
        </h2>
        <p className="text-text-secondary max-w-[48ch] mx-auto mb-10 text-lg">
          RHEO is MIT licensed. Your data is standard SQLite.
          If we disappear tomorrow, your data and your workflow live on.
        </p>

        {/* Badges */}
        <div className="flex flex-wrap items-center justify-center gap-4 mb-10">
          <span className="inline-flex items-center gap-2 bg-surface border border-raised rounded-lg px-4 py-2 text-sm font-mono text-text">
            <span className="w-2 h-2 rounded-full bg-amber" />
            MIT License
          </span>
          <span className="inline-flex items-center gap-2 bg-surface border border-raised rounded-lg px-4 py-2 text-sm font-mono text-text">
            <span className="w-2 h-2 rounded-full bg-teal" />
            100% Local
          </span>
          <span className="inline-flex items-center gap-2 bg-surface border border-raised rounded-lg px-4 py-2 text-sm font-mono text-text">
            <span className="w-2 h-2 rounded-full bg-coral" />
            Zero Telemetry
          </span>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-8 max-w-[600px] mx-auto">
          <div>
            <div className="text-3xl font-extrabold text-amber mb-1">15+</div>
            <div className="text-text-muted text-sm font-mono">Subsystems</div>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-amber mb-1">1</div>
            <div className="text-text-muted text-sm font-mono">SQLite File</div>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-amber mb-1">0</div>
            <div className="text-text-muted text-sm font-mono">Cloud Servers</div>
          </div>
        </div>
      </div>
    </section>
  );
}
