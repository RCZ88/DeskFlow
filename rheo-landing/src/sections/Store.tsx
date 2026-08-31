import { useState } from 'react';

const MODULES = [
  { name: 'AI Chat', price: '$9.99', desc: 'Multi-provider AI assistant', color: '#3b82f6' },
  { name: 'Content Studio', price: '$14.99', desc: 'Full content creation pipeline', color: '#a855f7' },
  { name: 'Focus Sessions', price: '$6.99', desc: 'Timer with app blocking', color: '#14b8a6' },
  { name: 'Lyceum Learn', price: '$9.99', desc: 'Hierarchical lesson system', color: '#fb7185' },
  { name: 'Gold & Finance', price: '$6.99', desc: 'Wallet & expense tracking', color: '#fbbf24' },
  { name: 'River of Years', price: '$6.99', desc: 'Life phase visualization', color: '#14b8a6' },
  { name: 'Terminal Workspace', price: '$12.99', desc: 'Multi-pane terminal + AI', color: '#3b82f6' },
  { name: 'Context Brain', price: '$14.99', desc: 'Bitemporal knowledge graph', color: '#a855f7' },
];

const BUNDLES = [
  { name: 'Productivity Pack', price: '$19.99', features: ['AI Chat', 'Focus Sessions', 'Terminal'], color: '#fbbf24' },
  { name: 'Knowledge Pack', price: '$24.99', features: ['Lyceum Learn', 'Context Brain', 'Content Studio'], color: '#a855f7' },
  { name: 'Life Pack', price: '$16.99', features: ['Gold & Finance', 'River of Years', 'Focus Sessions'], color: '#14b8a6' },
];

export function Store() {
  const [adminMode, setAdminMode] = useState(false);

  return (
    <section className="relative min-h-screen bg-bg py-24 px-8">
      <div className="max-w-[1200px] mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <span className="block text-[0.7rem] tracking-[0.15em] text-amber uppercase font-mono mb-4">
            BUILD YOUR RHEO
          </span>
          <h2 className="text-[clamp(2rem,4vw,3rem)] font-extrabold tracking-tight text-text mb-4">
            Every feature is a module.<br />Pick what you need.
          </h2>
          <p className="text-text-secondary max-w-[44ch] mx-auto mb-8">
            Start with the core. Add modules as you grow.
            Or unlock everything at once.
          </p>

          {/* Admin toggle */}
          <div className="inline-flex items-center gap-3 bg-surface border border-raised rounded-full px-5 py-2.5">
            <span className="text-sm text-text-secondary font-mono">🔓 Admin Account</span>
            <button
              onClick={() => setAdminMode(!adminMode)}
              className={`relative w-11 h-6 rounded-full transition-colors duration-300 border-none cursor-pointer ${
                adminMode ? 'bg-amber' : 'bg-raised'
              }`}
              aria-label="Toggle admin mode to unlock all features"
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-text rounded-full transition-transform duration-300 ${
                  adminMode ? 'translate-x-5' : ''
                }`}
              />
            </button>
          </div>
        </div>

        {/* Module grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          {MODULES.map((mod) => (
            <div
              key={mod.name}
              className="group relative bg-surface border border-raised rounded-xl p-5 hover:border-amber/30 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-amber/5"
            >
              {/* Color accent bar */}
              <div
                className="absolute top-0 left-0 right-0 h-[2px] rounded-t-xl"
                style={{ backgroundColor: mod.color }}
              />
              <h3 className="text-text font-semibold text-sm mb-1">{mod.name}</h3>
              <p className="text-text-muted text-xs mb-4">{mod.desc}</p>
              <div className="flex items-center justify-between">
                <PriceTag price={mod.price} flipped={adminMode} />
                <span className="text-[0.65rem] font-mono text-text-muted">
                  {adminMode ? 'Installed' : 'Add to RHEO'}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Bundles */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {BUNDLES.map((bundle) => (
            <div
              key={bundle.name}
              className="relative bg-surface border border-raised rounded-xl p-6 hover:border-amber/30 transition-all duration-300"
            >
              <div
                className="absolute top-0 left-0 right-0 h-[2px] rounded-t-xl"
                style={{ backgroundColor: bundle.color }}
              />
              <h3 className="text-text font-semibold mb-2">{bundle.name}</h3>
              <p className="text-text-muted text-xs mb-3">
                {bundle.features.join(' · ')}
              </p>
              <PriceTag price={bundle.price} flipped={adminMode} large />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PriceTag({ price, flipped, large }: { price: string; flipped: boolean; large?: boolean }) {
  return (
    <div
      className={`relative ${large ? 'text-xl' : 'text-base'} font-bold font-mono transition-all duration-500`}
      style={{ perspective: '400px' }}
    >
      <div
        className="transition-all duration-500"
        style={{
          transform: flipped ? 'rotateX(180deg)' : 'rotateX(0)',
          opacity: flipped ? 0 : 1,
          position: flipped ? 'absolute' : 'relative',
        }}
      >
        <span className="text-amber">{price}</span>
        <span className="text-text-muted text-[0.6rem] ml-1">/mo</span>
      </div>
      {flipped && (
        <div
          className="text-amber relative"
          style={{
            transform: 'rotateX(0)',
          }}
        >
          Included
        </div>
      )}
    </div>
  );
}
