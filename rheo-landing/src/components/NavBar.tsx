import { useState, useEffect } from 'react';
import { Menu, X, Download } from 'lucide-react';
import { MagneticButton } from './MagneticButton';

const NAV_LINKS = [
  { label: 'Features', target: 'threads' },
  { label: 'Store', target: 'store' },
  { label: 'Open Source', target: 'open-source' },
];

function scrollToId(id: string) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

export function NavBar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Glass morphism on scroll
  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 48);
    window.addEventListener('scroll', update, { passive: true });
    update();
    return () => window.removeEventListener('scroll', update);
  }, []);

  // Lock body scroll when the mobile drawer is open
  useEffect(() => {
    document.body.style.overflowY = open ? 'hidden' : '';
    return () => {
      document.body.style.overflowY = '';
    };
  }, [open]);

  return (
    <>
      <nav
        className={`sticky top-0 z-50 w-full transition-all duration-300 ${
          scrolled
            ? 'border-b border-white/5 bg-[rgba(24,24,27,0.60)] backdrop-blur-xl'
            : 'border-b border-transparent bg-transparent'
        }`}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          {/* Left: logo */}
          <button
            onClick={scrollToTop}
            className="font-mono text-lg font-extrabold tracking-tight text-text transition-opacity hover:opacity-80"
            aria-label="RHEO — back to top"
          >
            RHEO
          </button>

          {/* Center: desktop links */}
          <div className="hidden items-center gap-8 md:flex">
            {NAV_LINKS.map((link) => (
              <button
                key={link.target}
                onClick={() => scrollToId(link.target)}
                className="text-sm font-medium text-text-secondary transition-colors hover:text-text"
              >
                {link.label}
              </button>
            ))}
          </div>

          {/* Right: download + mobile hamburger */}
          <div className="flex items-center gap-3">
            <MagneticButton
              onClick={() => scrollToId('footer')}
              className="hidden items-center gap-1.5 rounded-[10px] bg-amber px-4 py-2 text-sm font-bold text-[#1a1300] transition-colors hover:bg-gold md:inline-flex"
            >
              <Download size={15} />
              Download
            </MagneticButton>
            <button
              onClick={() => setOpen(true)}
              className="inline-flex items-center justify-center rounded-lg p-2 text-text transition-colors hover:bg-white/5 md:hidden"
              aria-label="Open menu"
            >
              <Menu size={22} />
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile slide-out drawer */}
      <div
        className={`fixed inset-0 z-[60] md:hidden ${open ? '' : 'pointer-events-none'}`}
        aria-hidden={!open}
      >
        {/* Backdrop */}
        <div
          onClick={() => setOpen(false)}
          className={`absolute inset-0 bg-black/60 transition-opacity duration-300 ${
            open ? 'opacity-100' : 'opacity-0'
          }`}
        />
        {/* Drawer panel */}
        <div
          className={`absolute right-0 top-0 h-full w-[78%] max-w-[320px] border-l border-white/10 bg-[rgba(24,24,27,0.96)] backdrop-blur-xl transition-transform duration-300 ease-out ${
            open ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <div className="flex h-16 items-center justify-between border-b border-white/10 px-6">
            <span className="font-mono text-lg font-extrabold tracking-tight text-text">RHEO</span>
            <button
              onClick={() => setOpen(false)}
              className="inline-flex items-center justify-center rounded-lg p-2 text-text transition-colors hover:bg-white/5"
              aria-label="Close menu"
            >
              <X size={22} />
            </button>
          </div>
          <div className="flex flex-col gap-1 px-4 py-6">
            {NAV_LINKS.map((link) => (
              <button
                key={link.target}
                onClick={() => {
                  setOpen(false);
                  scrollToId(link.target);
                }}
                className="rounded-lg px-4 py-3 text-left text-base font-medium text-text-secondary transition-colors hover:bg-white/5 hover:text-text"
              >
                {link.label}
              </button>
            ))}
            <MagneticButton
              onClick={() => {
                setOpen(false);
                scrollToId('footer');
              }}
              className="mt-3 inline-flex items-center justify-center gap-1.5 rounded-[10px] bg-amber px-4 py-3 text-sm font-bold text-[#1a1300] transition-colors hover:bg-gold"
            >
              <Download size={15} />
              Download
            </MagneticButton>
          </div>
        </div>
      </div>
    </>
  );
}
