import { Entity, CurrentMode } from './types';

export function buildEntities(mode: CurrentMode, pathname: string): Entity[] {
  switch (mode) {
    case 'stream':
      return buildStreamEntities();
    case 'network':
      return buildNetworkEntities();
    case 'flow':
      return buildFlowEntities();
    case 'signal':
      return buildSignalEntities();
    case 'trajectory':
      return buildTrajectoryEntities();
    case 'workflow':
      return buildWorkflowEntities();
    case 'inflow':
      return buildInflowEntities();
    case 'knowledge':
      return buildKnowledgeEntities();
    case 'mechanical':
      return buildMechanicalEntities();
    case 'partition':
      return buildPartitionEntities();
    case 'cellular':
      return buildCellularEntities();
    case 'redaction':
      return buildRedactionEntities();
    default:
      return buildStreamEntities();
  }
}

function buildStreamEntities(): Entity[] {
  return [
    { id: 'stream-main', type: 'stream', x: 0, y: 0.5, weight: 2 },
    { id: 'pulse', type: 'node', x: 0.5, y: 0.5, radius: 4, importance: 1 },
    { id: 'evt-1', type: 'node', x: 0.2, y: 0.4, radius: 2, importance: 0.6 },
    { id: 'evt-2', type: 'node', x: 0.35, y: 0.6, radius: 2, importance: 0.4 },
    { id: 'evt-3', type: 'node', x: 0.7, y: 0.35, radius: 3, importance: 0.8 },
    { id: 'evt-4', type: 'node', x: 0.85, y: 0.55, radius: 2, importance: 0.5 },
  ];
}

function buildNetworkEntities(): Entity[] {
  return [
    { id: 'self', type: 'node', x: 0.5, y: 0.5, radius: 6, importance: 1 },
    { id: 'person-1', type: 'node', x: 0.25, y: 0.3, radius: 4, importance: 0.8, label: 'Family' },
    { id: 'person-2', type: 'node', x: 0.75, y: 0.25, radius: 3, importance: 0.6, label: 'Friend' },
    { id: 'person-3', type: 'node', x: 0.3, y: 0.75, radius: 3, importance: 0.7 },
    { id: 'person-4', type: 'node', x: 0.7, y: 0.7, radius: 3, importance: 0.5 },
    { id: 'branch-1', type: 'branch', x: 0.375, y: 0.4, weight: 2 },
    { id: 'branch-2', type: 'branch', x: 0.625, y: 0.375, weight: 1.5 },
    { id: 'branch-3', type: 'branch', x: 0.4, y: 0.625, weight: 1.5 },
    { id: 'branch-4', type: 'branch', x: 0.6, y: 0.6, weight: 1 },
  ];
}

function buildFlowEntities(): Entity[] {
  return [
    { id: 'flow-main', type: 'stream', x: 0.5, y: 0.5, weight: 2 },
    { id: 'income-1', type: 'stream', x: 0.3, y: 0.15, weight: 1.5, label: 'Salary' },
    { id: 'income-2', type: 'stream', x: 0.7, y: 0.1, weight: 1, label: 'Freelance' },
    { id: 'expense-1', type: 'stream', x: 0.25, y: 0.85, weight: 1, label: 'Housing' },
    { id: 'expense-2', type: 'stream', x: 0.5, y: 0.9, weight: 1, label: 'Food' },
    { id: 'expense-3', type: 'stream', x: 0.75, y: 0.85, weight: 0.8, label: 'Transport' },
    { id: 'pulse', type: 'node', x: 0.5, y: 0.5, radius: 4, importance: 1 },
  ];
}

function buildSignalEntities(): Entity[] {
  return [
    { id: 'trace-1', type: 'signal', x: 0, y: 0.2, weight: 1 },
    { id: 'trace-2', type: 'signal', x: 0, y: 0.35, weight: 1 },
    { id: 'trace-3', type: 'signal', x: 0, y: 0.5, weight: 1.2 },
    { id: 'trace-4', type: 'signal', x: 0, y: 0.65, weight: 1 },
    { id: 'trace-5', type: 'signal', x: 0, y: 0.8, weight: 1 },
    { id: 'anomaly-1', type: 'milestone', x: 0.6, y: 0.35, radius: 3, importance: 0.8 },
    { id: 'anomaly-2', type: 'milestone', x: 0.8, y: 0.65, radius: 2, importance: 0.5 },
  ];
}

function buildTrajectoryEntities(): Entity[] {
  return [
    { id: 'start', type: 'node', x: 0.1, y: 0.5, radius: 3, importance: 0.6, label: 'Start' },
    { id: 'milestone-1', type: 'milestone', x: 0.35, y: 0.4, radius: 3, importance: 0.7, progress: 0.8 },
    { id: 'milestone-2', type: 'milestone', x: 0.6, y: 0.35, radius: 3, importance: 0.7, progress: 0.4 },
    { id: 'goal', type: 'node', x: 0.85, y: 0.3, radius: 5, importance: 1, label: 'Goal' },
    { id: 'path', type: 'branch', x: 0.475, y: 0.425, weight: 2 },
  ];
}

function buildWorkflowEntities(): Entity[] {
  return [
    { id: 'start', type: 'node', x: 0.1, y: 0.5, radius: 3, importance: 0.6 },
    { id: 'branch-point', type: 'branch', x: 0.45, y: 0.5, weight: 2 },
    { id: 'done', type: 'node', x: 0.8, y: 0.25, radius: 4, importance: 0.8, label: 'Done' },
    { id: 'review', type: 'node', x: 0.8, y: 0.75, radius: 3, importance: 0.6, label: 'Review' },
    { id: 'path-done', type: 'branch', x: 0.625, y: 0.375, weight: 1.5 },
    { id: 'path-review', type: 'branch', x: 0.625, y: 0.625, weight: 1 },
  ];
}

function buildInflowEntities(): Entity[] {
  return [
    { id: 'main', type: 'stream', x: 0.5, y: 0.5, weight: 2 },
    { id: 'in-1', type: 'stream', x: 0.2, y: 0.1, weight: 1, label: 'Article' },
    { id: 'in-2', type: 'stream', x: 0.5, y: 0.05, weight: 1, label: 'Message' },
    { id: 'in-3', type: 'stream', x: 0.8, y: 0.1, weight: 1, label: 'Feed' },
    { id: 'pulse', type: 'node', x: 0.5, y: 0.5, radius: 4, importance: 1 },
  ];
}

function buildKnowledgeEntities(): Entity[] {
  return [
    { id: 'root', type: 'node', x: 0.15, y: 0.5, radius: 4, importance: 1, label: 'Understanding' },
    { id: 'concept-a', type: 'node', x: 0.5, y: 0.2, radius: 3, importance: 0.7, label: 'Concept A' },
    { id: 'concept-b', type: 'node', x: 0.5, y: 0.5, radius: 3, importance: 0.8, label: 'Concept B' },
    { id: 'concept-c', type: 'node', x: 0.5, y: 0.8, radius: 3, importance: 0.6, label: 'Concept C' },
    { id: 'detail-1', type: 'node', x: 0.8, y: 0.15, radius: 2, importance: 0.4 },
    { id: 'detail-2', type: 'node', x: 0.8, y: 0.5, radius: 2, importance: 0.5 },
    { id: 'branch-root', type: 'branch', x: 0.325, y: 0.5, weight: 2 },
    { id: 'branch-a', type: 'branch', x: 0.65, y: 0.35, weight: 1 },
    { id: 'branch-b', type: 'branch', x: 0.65, y: 0.5, weight: 1.5 },
    { id: 'branch-c', type: 'branch', x: 0.65, y: 0.65, weight: 1 },
  ];
}

function buildMechanicalEntities(): Entity[] {
  return [
    { id: 'gear-large', type: 'gear', x: 0.45, y: 0.5, radius: 8, importance: 1, metadata: { teeth: 28, speed: 1 } },
    { id: 'gear-small', type: 'gear', x: 0.65, y: 0.5, radius: 5, importance: 0.7, metadata: { teeth: 20, speed: -1.4 } },
    { id: 'arm-1', type: 'branch', x: 0.45, y: 0.5, weight: 1 },
    { id: 'arm-2', type: 'branch', x: 0.65, y: 0.5, weight: 0.8 },
  ];
}

function buildPartitionEntities(): Entity[] {
  return [
    { id: 'seed-1', type: 'node', x: 0.2, y: 0.2, radius: 2, importance: 0.6 },
    { id: 'seed-2', type: 'node', x: 0.5, y: 0.15, radius: 2, importance: 0.5 },
    { id: 'seed-3', type: 'node', x: 0.8, y: 0.25, radius: 2, importance: 0.7 },
    { id: 'seed-4', type: 'node', x: 0.15, y: 0.55, radius: 2, importance: 0.4 },
    { id: 'seed-5', type: 'node', x: 0.5, y: 0.5, radius: 3, importance: 0.8 },
    { id: 'seed-6', type: 'node', x: 0.85, y: 0.6, radius: 2, importance: 0.5 },
    { id: 'seed-7', type: 'node', x: 0.3, y: 0.85, radius: 2, importance: 0.3 },
    { id: 'seed-8', type: 'node', x: 0.7, y: 0.8, radius: 2, importance: 0.6 },
  ];
}

function buildCellularEntities(): Entity[] {
  const cells: Entity[] = [];
  const gridSize = 8;
  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize; x++) {
      cells.push({
        id: `cell-${x}-${y}`,
        type: 'cell',
        x: (x + 0.5) / gridSize,
        y: (y + 0.5) / gridSize,
        radius: 0.5 / gridSize,
        importance: Math.random() > 0.7 ? 0.8 : 0.3,
        metadata: { alive: Math.random() > 0.6 },
      });
    }
  }
  return cells;
}

function buildRedactionEntities(): Entity[] {
  return [
    { id: 'zone-1', type: 'mask', x: 0.15, y: 0.3, radius: 6, importance: 0.8 },
    { id: 'zone-2', type: 'mask', x: 0.5, y: 0.5, radius: 8, importance: 0.6 },
    { id: 'zone-3', type: 'mask', x: 0.8, y: 0.4, radius: 5, importance: 0.7 },
    { id: 'bar-1', type: 'stream', x: 0, y: 0.25, weight: 1 },
    { id: 'bar-2', type: 'stream', x: 0, y: 0.5, weight: 1.2 },
    { id: 'bar-3', type: 'stream', x: 0, y: 0.75, weight: 0.8 },
  ];
}
