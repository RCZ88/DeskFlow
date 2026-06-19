export function AuroraBackground({ intense }: { intense?: boolean }) {
  return (
    <div
      className={`fixed inset-0 pointer-events-none -z-10 ${
        intense ? 'opacity-60' : 'opacity-30'
      }`}
      aria-hidden="true"
    >
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 60% 50% at 15% 20%, rgba(16,185,129,0.18), transparent 60%),
            radial-gradient(ellipse 40% 40% at 80% 30%, rgba(20,184,166,0.14), transparent 50%),
            radial-gradient(ellipse 50% 30% at 50% 80%, rgba(5,150,105,0.10), transparent 50%)
          `,
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
          backgroundSize: '256px 256px',
        }}
      />
    </div>
  );
}
