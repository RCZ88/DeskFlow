export function Closing() {
  return (
    <section className="relative min-h-[78vh] flex flex-col items-center justify-center text-center gap-6 px-24 py-16 overflow-hidden">
      {/* Grid pattern background */}
      <div
        className="absolute inset-0 opacity-50 pointer-events-none"
        style={{
          backgroundImage: `
            repeating-linear-gradient(90deg, rgba(251,191,36,0.09) 0 1.5px, transparent 1.5px 26px),
            repeating-linear-gradient(0deg, rgba(194,112,61,0.09) 0 1.5px, transparent 1.5px 26px)
          `,
        }}
      />
      <h2 className="relative text-[clamp(1.7rem,3.6vw,2.5rem)] font-extrabold max-w-[16ch] text-text">
        Fifteen tools. One thread.
      </h2>
      <p className="relative text-text-secondary max-w-[44ch]">
        Everything above ran locally, in one SQLite file, on this machine.
        Nothing you just watched ever left this screen.
      </p>
      <button className="relative mt-2 px-7 py-3.5 rounded-[10px] bg-amber text-[#1a1300] font-bold text-[0.95rem] border-none cursor-pointer hover:bg-gold transition-colors focus-visible:outline-2 focus-visible:outline-amber focus-visible:outline-offset-3">
        Download RHEO
      </button>
    </section>
  );
}
