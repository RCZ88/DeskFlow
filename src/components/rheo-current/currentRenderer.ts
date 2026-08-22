import { Entity } from './types';

export interface RenderContext {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  currentPhase: number;
  accent: string;
  entities: Entity[];
  opacity: number;
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ];
}

function withAlpha(hex: string, alpha: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}

export function renderStream(rc: RenderContext) {
  const { ctx, width, height, currentPhase, accent, entities, opacity } = rc;
  ctx.globalAlpha = opacity;

  const stream = entities.find(e => e.type === 'stream');
  const pulse = entities.find(e => e.id === 'pulse');
  const nodes = entities.filter(e => e.type === 'node' && e.id !== 'pulse');

  const sy = stream ? stream.y * height : height * 0.5;

  ctx.beginPath();
  ctx.strokeStyle = withAlpha(accent, 0.4);
  ctx.lineWidth = 1.5;
  ctx.moveTo(0, sy);
  for (let x = 0; x <= width; x += 4) {
    const nx = x / width;
    const wave = Math.sin(nx * 6 + currentPhase * Math.PI * 2) * 6;
    ctx.lineTo(x, sy + wave);
  }
  ctx.stroke();

  if (pulse) {
    const px = pulse.x * width;
    const py = sy + Math.sin(pulse.x * 6 + currentPhase * Math.PI * 2) * 6;
    ctx.beginPath();
    ctx.arc(px, py, 4, 0, Math.PI * 2);
    ctx.fillStyle = accent;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(px, py, 10, 0, Math.PI * 2);
    ctx.strokeStyle = withAlpha(accent, 0.2);
    ctx.lineWidth = 0.5;
    ctx.stroke();
  }

  for (const node of nodes) {
    const nx = node.x * width;
    const ny = sy + Math.sin(node.x * 6 + currentPhase * Math.PI * 2) * 6
      + (node.importance || 0.5) * 20 * (node.y > 0.5 ? 1 : -1);

    ctx.beginPath();
    ctx.moveTo(nx, sy + Math.sin(node.x * 6 + currentPhase * Math.PI * 2) * 6);
    ctx.lineTo(nx, ny);
    ctx.strokeStyle = withAlpha(accent, 0.12);
    ctx.lineWidth = 0.5;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(nx, ny, node.radius || 2, 0, Math.PI * 2);
    ctx.fillStyle = withAlpha(accent, 0.5 * (node.importance || 0.5));
    ctx.fill();
  }

  ctx.globalAlpha = 1;
}

export function renderNetwork(rc: RenderContext) {
  const { ctx, width, height, currentPhase, accent, entities, opacity } = rc;
  ctx.globalAlpha = opacity;

  const nodes = entities.filter(e => e.type === 'node');
  const branches = entities.filter(e => e.type === 'branch');

  for (const branch of branches) {
    const fromNode = nodes.find(n =>
      Math.abs(n.x - branch.x) < 0.2 && Math.abs(n.y - branch.y) < 0.2
    );
    if (!fromNode) continue;

    ctx.beginPath();
    ctx.moveTo(fromNode.x * width, fromNode.y * height);
    ctx.lineTo(branch.x * width, branch.y * height);
    ctx.strokeStyle = withAlpha(accent, 0.15);
    ctx.lineWidth = branch.weight || 1;
    ctx.stroke();
  }

  for (const node of nodes) {
    const nx = node.x * width;
    const ny = node.y * height;
    const breathe = Math.sin(currentPhase * Math.PI * 2 + node.x * 3) * 1.5;
    const r = (node.radius || 3) + breathe;

    ctx.beginPath();
    ctx.arc(nx, ny, r, 0, Math.PI * 2);
    ctx.fillStyle = withAlpha(accent, 0.35 * (node.importance || 0.5));
    ctx.fill();

    if ((node.importance || 0) > 0.7) {
      ctx.beginPath();
      ctx.arc(nx, ny, r + 5, 0, Math.PI * 2);
      ctx.strokeStyle = withAlpha(accent, 0.1);
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }
  }

  ctx.globalAlpha = 1;
}

export function renderFlow(rc: RenderContext) {
  const { ctx, width, height, accent, entities, opacity } = rc;
  ctx.globalAlpha = opacity;

  const mainFlow = entities.find(e => e.id === 'flow-main');
  const pulse = entities.find(e => e.id === 'pulse');
  const incomeStreams = entities.filter(e => e.id.startsWith('income'));
  const expenseStreams = entities.filter(e => e.id.startsWith('expense'));

  if (mainFlow) {
    const my = mainFlow.y * height;
    ctx.beginPath();
    ctx.moveTo(0, my);
    ctx.bezierCurveTo(width * 0.3, my - 10, width * 0.7, my + 10, width, my);
    ctx.strokeStyle = withAlpha(accent, 0.35);
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  for (const s of incomeStreams) {
    const sy = s.y * height;
    const ey = mainFlow ? mainFlow.y * height : height / 2;
    ctx.beginPath();
    ctx.moveTo(s.x * width, sy);
    ctx.bezierCurveTo(s.x * width, sy + 40, width * 0.5, ey - 20, width * 0.5, ey);
    ctx.strokeStyle = withAlpha('#22c55e', 0.2);
    ctx.lineWidth = s.weight || 1;
    ctx.stroke();
  }

  for (const s of expenseStreams) {
    const sy = mainFlow ? mainFlow.y * height : height / 2;
    const ey = s.y * height;
    ctx.beginPath();
    ctx.moveTo(width * 0.5, sy);
    ctx.bezierCurveTo(width * 0.5, sy + 20, s.x * width, ey - 40, s.x * width, ey);
    ctx.strokeStyle = withAlpha('#ef4444', 0.2);
    ctx.lineWidth = s.weight || 1;
    ctx.stroke();
  }

  if (pulse) {
    ctx.beginPath();
    ctx.arc(pulse.x * width, pulse.y * height, pulse.radius || 4, 0, Math.PI * 2);
    ctx.fillStyle = accent;
    ctx.fill();
  }

  ctx.globalAlpha = 1;
}

export function renderSignal(rc: RenderContext) {
  const { ctx, width, height, currentPhase, accent, entities, opacity } = rc;
  ctx.globalAlpha = opacity;

  const traces = entities.filter(e => e.type === 'signal');
  const anomalies = entities.filter(e => e.type === 'milestone');

  for (const trace of traces) {
    const ty = trace.y * height;
    ctx.beginPath();
    ctx.strokeStyle = withAlpha(accent, 0.2);
    ctx.lineWidth = 0.8;
    for (let x = 0; x <= width; x += 3) {
      const sample = Math.sin((x + currentPhase * width * 0.5) * 0.02 + trace.y * 10) * 3
        + Math.sin((x + currentPhase * width * 0.3) * 0.008 + trace.y * 5) * 2;
      if (x === 0) ctx.moveTo(x, ty + sample);
      else ctx.lineTo(x, ty + sample);
    }
    ctx.stroke();
  }

  for (const anomaly of anomalies) {
    const ax = anomaly.x * width;
    const ay = anomaly.y * height;
    ctx.beginPath();
    ctx.arc(ax, ay, anomaly.radius || 3, 0, Math.PI * 2);
    ctx.fillStyle = withAlpha(accent, 0.5);
    ctx.fill();
  }

  ctx.globalAlpha = 1;
}

export function renderTrajectory(rc: RenderContext) {
  const { ctx, width, height, currentPhase, accent, entities, opacity } = rc;
  ctx.globalAlpha = opacity;

  const start = entities.find(e => e.id === 'start');
  const goal = entities.find(e => e.id === 'goal');
  const milestones = entities.filter(e => e.type === 'milestone');
  const branches = entities.filter(e => e.type === 'branch');

  if (start && goal) {
    ctx.beginPath();
    ctx.moveTo(start.x * width, start.y * height);
    for (const branch of branches) {
      ctx.lineTo(branch.x * width, branch.y * height);
    }
    ctx.lineTo(goal.x * width, goal.y * height);
    ctx.strokeStyle = withAlpha(accent, 0.25);
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  for (const ms of milestones) {
    const mx = ms.x * width;
    const my = ms.y * height;
    ctx.beginPath();
    ctx.arc(mx, my, ms.radius || 3, 0, Math.PI * 2);
    ctx.fillStyle = withAlpha(accent, 0.4 * (ms.progress || 0.5));
    ctx.fill();
  }

  if (goal) {
    const gx = goal.x * width;
    const gy = goal.y * height;
    const pulse = Math.sin(currentPhase * Math.PI * 2) * 2;
    ctx.beginPath();
    ctx.arc(gx, gy, (goal.radius || 5) + pulse, 0, Math.PI * 2);
    ctx.strokeStyle = withAlpha(accent, 0.3);
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  ctx.globalAlpha = 1;
}

export function renderWorkflow(rc: RenderContext) {
  const { ctx, width, height, accent, entities, opacity } = rc;
  ctx.globalAlpha = opacity;

  const nodes = entities.filter(e => e.type === 'node');
  const branches = entities.filter(e => e.type === 'branch');

  for (const branch of branches) {
    const fromNode = nodes.find(n =>
      Math.abs(n.x - branch.x) < 0.3 && Math.abs(n.y - branch.y) < 0.3
    );
    if (fromNode) {
      ctx.beginPath();
      ctx.moveTo(fromNode.x * width, fromNode.y * height);
      ctx.lineTo(branch.x * width, branch.y * height);
      ctx.strokeStyle = withAlpha(accent, 0.15);
      ctx.lineWidth = branch.weight || 1;
      ctx.stroke();
    }
  }

  for (const node of nodes) {
    ctx.beginPath();
    ctx.arc(node.x * width, node.y * height, node.radius || 3, 0, Math.PI * 2);
    ctx.fillStyle = withAlpha(accent, 0.4);
    ctx.fill();
  }

  ctx.globalAlpha = 1;
}

export function renderInflow(rc: RenderContext) {
  const { ctx, width, height, currentPhase, accent, entities, opacity } = rc;
  ctx.globalAlpha = opacity;

  const main = entities.find(e => e.id === 'main');
  const inStreams = entities.filter(e => e.id.startsWith('in-'));
  const pulse = entities.find(e => e.id === 'pulse');

  for (const s of inStreams) {
    const sy = s.y * height;
    const ey = main ? main.y * height : height / 2;
    const flow = Math.sin(currentPhase * Math.PI * 2 + s.x * 5) * 5;
    ctx.beginPath();
    ctx.moveTo(s.x * width, sy);
    ctx.bezierCurveTo(s.x * width + flow, sy + 30, width * 0.5, ey - 20, width * 0.5, ey);
    ctx.strokeStyle = withAlpha(accent, 0.15);
    ctx.lineWidth = s.weight || 1;
    ctx.stroke();
  }

  if (main) {
    const my = main.y * height;
    ctx.beginPath();
    ctx.moveTo(0, my);
    ctx.lineTo(width, my);
    ctx.strokeStyle = withAlpha(accent, 0.25);
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  if (pulse) {
    ctx.beginPath();
    ctx.arc(pulse.x * width, pulse.y * height, pulse.radius || 4, 0, Math.PI * 2);
    ctx.fillStyle = accent;
    ctx.fill();
  }

  ctx.globalAlpha = 1;
}

export function renderKnowledge(rc: RenderContext) {
  const { ctx, width, height, accent, entities, opacity } = rc;
  ctx.globalAlpha = opacity;

  const nodes = entities.filter(e => e.type === 'node');
  const branches = entities.filter(e => e.type === 'branch');

  for (const branch of branches) {
    const fromNode = nodes.find(n =>
      Math.abs(n.x - branch.x) < 0.25 && Math.abs(n.y - branch.y) < 0.25
    );
    if (!fromNode) continue;
    ctx.beginPath();
    ctx.moveTo(fromNode.x * width, fromNode.y * height);
    ctx.lineTo(branch.x * width, branch.y * height);
    ctx.strokeStyle = withAlpha(accent, 0.15);
    ctx.lineWidth = branch.weight || 1;
    ctx.stroke();
  }

  for (const node of nodes) {
    const nx = node.x * width;
    const ny = node.y * height;
    ctx.beginPath();
    ctx.arc(nx, ny, node.radius || 3, 0, Math.PI * 2);
    ctx.fillStyle = withAlpha(accent, 0.35 * (node.importance || 0.5));
    ctx.fill();
  }

  ctx.globalAlpha = 1;
}

export function renderMechanical(rc: RenderContext) {
  const { ctx, width, height, currentPhase, accent, entities, opacity } = rc;
  ctx.globalAlpha = opacity;

  const gears = entities.filter(e => e.type === 'gear');

  for (const gear of gears) {
    const gx = gear.x * width;
    const gy = gear.y * height;
    const r = (gear.radius || 5) * Math.min(width, height) * 0.01;
    const teeth = (gear.metadata?.teeth as number) || 20;
    const speed = (gear.metadata?.speed as number) || 1;
    const rot = currentPhase * Math.PI * 2 * speed;

    ctx.save();
    ctx.translate(gx, gy);
    ctx.rotate(rot);
    ctx.beginPath();
    for (let i = 0; i < teeth * 2; i++) {
      const rr = i % 2 ? r : r * 1.09;
      const a = (i * Math.PI) / teeth;
      if (i === 0) ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
      else ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    ctx.closePath();
    ctx.strokeStyle = withAlpha(accent, 0.25);
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.18, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  ctx.globalAlpha = 1;
}

export function renderPartition(rc: RenderContext) {
  const { ctx, width, height, accent, entities, opacity } = rc;
  ctx.globalAlpha = opacity;

  const seeds = entities.filter(e => e.type === 'node');

  for (const seed of seeds) {
    ctx.beginPath();
    ctx.arc(seed.x * width, seed.y * height, 2, 0, Math.PI * 2);
    ctx.fillStyle = withAlpha(accent, 0.35);
    ctx.fill();
  }

  for (let i = 0; i < seeds.length; i++) {
    for (let j = i + 1; j < seeds.length; j++) {
      const dx = (seeds[j].x - seeds[i].x) * width;
      const dy = (seeds[j].y - seeds[i].y) * height;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < width * 0.35) {
        const mx = ((seeds[i].x + seeds[j].x) / 2) * width;
        const my = ((seeds[i].y + seeds[j].y) / 2) * height;
        ctx.beginPath();
        ctx.arc(mx, my, dist * 0.3, 0, Math.PI * 2);
        ctx.strokeStyle = withAlpha(accent, 0.06);
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }
    }
  }

  ctx.globalAlpha = 1;
}

export function renderCellular(rc: RenderContext) {
  const { ctx, width, height, currentPhase, accent, entities, opacity } = rc;
  ctx.globalAlpha = opacity;

  const cellSize = Math.min(width, height) / 10;

  for (const cell of entities) {
    const cx = cell.x * width;
    const cy = cell.y * height;
    const alive = cell.metadata?.alive as boolean;
    const pulse = Math.sin(currentPhase * Math.PI * 2 + cell.x * 3 + cell.y * 5) > 0.3;

    if (alive || pulse) {
      ctx.fillStyle = withAlpha(accent, 0.25);
      ctx.fillRect(cx - cellSize / 2, cy - cellSize / 2, cellSize - 1, cellSize - 1);
    }
  }

  ctx.globalAlpha = 1;
}

export function renderRedaction(rc: RenderContext) {
  const { ctx, width, height, currentPhase, accent, entities, opacity } = rc;
  ctx.globalAlpha = opacity;

  const bars = entities.filter(e => e.type === 'stream');
  const zones = entities.filter(e => e.type === 'mask');

  for (const zone of zones) {
    const zx = zone.x * width;
    const zy = zone.y * height;
    const zr = (zone.radius || 5) * Math.min(width, height) * 0.01;
    ctx.beginPath();
    ctx.arc(zx, zy, zr, 0, Math.PI * 2);
    ctx.fillStyle = withAlpha(accent, 0.06);
    ctx.fill();
    ctx.strokeStyle = withAlpha(accent, 0.1);
    ctx.lineWidth = 0.5;
    ctx.stroke();
  }

  for (const bar of bars) {
    const by = bar.y * height;
    const sweep = ((currentPhase * 3 + bar.y) % 1) * width;
    ctx.fillStyle = withAlpha(accent, 0.12);
    ctx.fillRect(sweep - 30, by - 2, 60, 4);
  }

  ctx.globalAlpha = 1;
}
