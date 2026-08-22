import { useRef, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { CurrentMode, Topology, ROUTE_MODE_MAP, PAGE_ACCENTS } from './types';
import { createClock } from './currentClock';
import { createTransitionState, startTransition, getTransitionProgress, isTransitionComplete } from './currentTransition';
import { buildEntities } from './currentEntities';
import {
  renderStream, renderNetwork, renderFlow, renderSignal,
  renderTrajectory, renderWorkflow, renderInflow, renderKnowledge,
  renderMechanical, renderPartition, renderCellular, renderRedaction,
  RenderContext,
} from './currentRenderer';

console.log('%c[RheoCurrent] v1.0 loaded — The Current', 'color: #fbbf24; font-weight: bold');

const RENDERERS: Record<CurrentMode, (rc: RenderContext) => void> = {
  stream: renderStream,
  network: renderNetwork,
  flow: renderFlow,
  signal: renderSignal,
  trajectory: renderTrajectory,
  workflow: renderWorkflow,
  inflow: renderInflow,
  knowledge: renderKnowledge,
  mechanical: renderMechanical,
  partition: renderPartition,
  cellular: renderCellular,
  redaction: renderRedaction,
};

function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

export function RheoCurrent() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const clock = useRef(createClock());
  const transition = useRef(createTransitionState());
  const currentTopology = useRef<Topology>({ mode: 'stream', entities: [], accent: '#10b981' });
  const rafId = useRef(0);
  const prevTimestamp = useRef(0);
  const reducedMotion = useRef(prefersReducedMotion());

  const location = useLocation();
  const pathname = location.pathname;

  const handleRouteChange = useCallback(() => {
    const mode = ROUTE_MODE_MAP[pathname] || 'stream';
    const accent = PAGE_ACCENTS[pathname] || '#10b981';
    const entities = buildEntities(mode, pathname);

    const newTopology: Topology = { mode, entities, accent };

    if (currentTopology.current.mode !== mode) {
      transition.current = startTransition(
        transition.current,
        { ...currentTopology.current },
        newTopology,
        performance.now()
      );
    }

    currentTopology.current = newTopology;
  }, [pathname]);

  useEffect(() => {
    handleRouteChange();
  }, [handleRouteChange]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const dpr = window.devicePixelRatio;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const frame = (timestamp: number) => {
      if (document.hidden) {
        prevTimestamp.current = timestamp;
        rafId.current = requestAnimationFrame(frame);
        return;
      }

      const delta = timestamp - prevTimestamp.current;
      prevTimestamp.current = timestamp;

      if (!reducedMotion.current) {
        clock.current.update(delta);
      }

      if (!isTransitionComplete(transition.current, timestamp)) {
        const progress = getTransitionProgress(transition.current, timestamp);
        transition.current = { ...transition.current, active: progress < 1 };
      }

      const w = window.innerWidth;
      const h = window.innerHeight;
      ctx.clearRect(0, 0, w, h);

      const currentPhase = clock.current.getCurrentPhase();
      const topo = currentTopology.current;

      let opacity = 0.15;
      if (transition.current.active) {
        const progress = getTransitionProgress(transition.current, timestamp);
        opacity = 0.15 * Math.min(1, progress * 2);
      }

      const rc: RenderContext = {
        ctx,
        width: w,
        height: h,
        currentPhase,
        accent: topo.accent,
        entities: topo.entities,
        opacity,
      };

      const renderer = RENDERERS[topo.mode];
      if (renderer) renderer(rc);

      rafId.current = requestAnimationFrame(frame);
    };

    rafId.current = requestAnimationFrame(frame);

    const onVisChange = () => {
      reducedMotion.current = prefersReducedMotion();
    };
    document.addEventListener('visibilitychange', onVisChange);

    return () => {
      cancelAnimationFrame(rafId.current);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVisChange);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-[0] pointer-events-none"
      aria-hidden="true"
    />
  );
}
