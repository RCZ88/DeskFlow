import { useRef, useEffect, useCallback } from 'react';

const SVG_NS = 'http://www.w3.org/2000/svg';
const W = 1400;
const H = 800;

interface WarpDef {
  x: number;
  label: string;
  over: boolean;
}

const WARPS: WarpDef[] = [
  { x: 100, label: 'TIME', over: true },
  { x: 300, label: 'MONEY', over: false },
  { x: 500, label: 'FOCUS', over: true },
  { x: 700, label: 'LEARNING', over: false },
  { x: 900, label: 'CHAT', over: true },
  { x: 1100, label: 'TERMINAL', over: false },
  { x: 1300, label: 'TIMELINE', over: true },
];

function wavePath(y0: number, amp: number, freq: number, steps: number): string {
  let d = `M 0 ${y0.toFixed(1)}`;
  for (let i = 1; i <= steps; i++) {
    const x = (W / steps) * i;
    const y = y0 + amp * Math.sin((x / W) * Math.PI * freq);
    d += ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
  }
  return d;
}

interface LoomSVGProps {
  /** 0-1 scroll progress through the loom animation */
  progress?: number;
  /** Which warp to highlight (by label) */
  activeWarp?: string | null;
  /** Show reduced-motion static state */
  reduced?: boolean;
  className?: string;
}

export function LoomSVG({ progress = 0, activeWarp = null, reduced = false, className = '' }: LoomSVGProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const stateRef = useRef({
    weftBase: null as SVGPathElement | null,
    weftTop: null as SVGPathElement | null,
    dots: [] as { el: SVGCircleElement; progress: number }[],
    totalLen: 0,
    dAttr: '',
  });

  const setup = useCallback(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const weftY = 380;
    const amp = 26;
    const freq = 2.6;
    const dAttr = wavePath(weftY, amp, freq, 140);

    // Create weft paths
    const weftBase = svg.querySelector('#weftBase') as SVGPathElement;
    const weftTop = svg.querySelector('#weftTop') as SVGPathElement;
    weftBase.setAttribute('d', dAttr);
    weftTop.setAttribute('d', dAttr);

    const totalLen = weftBase.getTotalLength();
    [weftBase, weftTop].forEach(p => {
      p.style.strokeDasharray = String(totalLen);
      p.style.strokeDashoffset = reduced ? '0' : String(totalLen);
    });

    // Create warp lines + labels
    const warpGroup = svg.querySelector('#warpGroup');
    warpGroup!.innerHTML = '';
    WARPS.forEach(w => {
      const line = document.createElementNS(SVG_NS, 'line');
      line.setAttribute('x1', String(w.x));
      line.setAttribute('x2', String(w.x));
      line.setAttribute('y1', '40');
      line.setAttribute('y2', '720');
      line.classList.add('warp');
      line.dataset.label = w.label;
      warpGroup!.appendChild(line);

      const label = document.createElementNS(SVG_NS, 'text');
      label.setAttribute('x', String(w.x));
      label.setAttribute('y', '752');
      label.classList.add('warp-label');
      // NOTE: fill is set via the `.loom-svg .warp-label` CSS rule (index.css).
      // Do NOT set fill as an SVG presentation attribute with a var() — e.g.
      // label.setAttribute('fill', 'var(--color-text-secondary)'). var() is
      // invalid in a presentation attribute and is silently dropped, which would
      // leave the label to inherit the browser default (black) — invisible on the
      // #09090b background. The CSS rule is the single authority for label color.
      label.textContent = w.label;
      warpGroup!.appendChild(label);
    });

    // Create clip paths for over/under weave
    const bandHalf = 24;
    const overRects = WARPS.filter(w => w.over).map(w => ({ x: w.x - bandHalf, w: bandHalf * 2 }));
    const sorted = overRects.slice().sort((a, b) => a.x - b.x);
    let cursor = 0;
    const underRects: { x: number; w: number }[] = [];
    sorted.forEach(r => {
      if (r.x > cursor) underRects.push({ x: cursor, w: r.x - cursor });
      cursor = r.x + r.w;
    });
    if (cursor < W) underRects.push({ x: cursor, w: W - cursor });

    const fillClip = (id: string, rects: { x: number; w: number }[]) => {
      const clip = svg.querySelector(`#${id}`);
      clip!.innerHTML = '';
      rects.forEach(r => {
        const rect = document.createElementNS(SVG_NS, 'rect');
        rect.setAttribute('x', String(r.x));
        rect.setAttribute('y', '0');
        rect.setAttribute('width', String(r.w));
        rect.setAttribute('height', String(H));
        clip!.appendChild(rect);
      });
    };
    fillClip('clipOver', overRects);
    fillClip('clipUnder', underRects);

    // Create glow dots at crossings
    const dotGroup = svg.querySelector('#dotGroup');
    dotGroup!.innerHTML = '';
    const dots = WARPS.map(w => {
      const y = weftY + amp * Math.sin((w.x / W) * Math.PI * freq);
      const c = document.createElementNS(SVG_NS, 'circle');
      c.setAttribute('cx', String(w.x));
      c.setAttribute('cy', String(y));
      c.setAttribute('r', '5');
      c.classList.add('dot');
      c.style.opacity = reduced ? '0.9' : '0';
      dotGroup!.appendChild(c);
      return { el: c, progress: w.x / W };
    });

    stateRef.current = { weftBase, weftTop, dots, totalLen, dAttr };
  }, [reduced]);

  useEffect(() => {
    setup();
  }, [setup]);

  // Apply scroll progress
  useEffect(() => {
    const { weftBase, weftTop, dots, totalLen } = stateRef.current;
    if (!weftBase || !weftTop) return;

    const offset = totalLen * (1 - progress);
    weftBase.style.strokeDashoffset = String(offset);
    weftTop.style.strokeDashoffset = String(offset);

    dots.forEach(d => {
      d.el.style.opacity = String(
        Math.max(0, Math.min(1, (progress - d.progress + 0.05) * 12))
      );
    });
  }, [progress]);

  // Highlight active warp
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    svg.querySelectorAll('.warp').forEach(line => {
      const el = line as SVGLineElement;
      if (activeWarp && el.dataset.label === activeWarp) {
        el.setAttribute('stroke', '#fbbf24');
        el.setAttribute('opacity', '1');
        el.setAttribute('stroke-width', '3');
      } else {
        el.removeAttribute('stroke');
        el.setAttribute('opacity', activeWarp ? '0.4' : '0.9');
        el.setAttribute('stroke-width', '1.5');
      }
    });
  }, [activeWarp]);

  return (
    <svg
      ref={svgRef}
      className={`loom-svg ${className}`}
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-label="Seven vertical threads representing RHEO's subsystems, woven together by a single moving thread representing AI."
    >
      <defs>
        <clipPath id="clipOver" />
        <clipPath id="clipUnder" />
      </defs>
      <path id="weftBase" className="weft" clipPath="url(#clipUnder)" />
      <g id="warpGroup" />
      <path id="weftTop" className="weft" clipPath="url(#clipOver)" />
      <g id="dotGroup" />
    </svg>
  );
}

export { WARPS };
