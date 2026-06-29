// Shared types for the Lyceum "Learn" module — used by both main and renderer

export type MasteryLevel = 'L0' | 'L1' | 'L2' | 'L3' | 'L4' | 'L5';
export type BlockType = 'prose' | 'math' | 'mermaid' | 'code' | 'image' | 'video' | 'widget' | 'quiz' | 'callout' | 'layer';
export type QuizFormat = 'mcq' | 'numeric' | 'open';
export type LessonStatus = 'draft' | 'valid' | 'published';
export type EvidenceSource = 'tutor' | 'quiz' | 'self-report';
export type EvidenceOutcome = 'demonstrated' | 'partial' | 'wrong';
export type NodeType = 'lesson' | 'node';

export interface LdocDocument {
  doc: 'ldoc/1.0';
  lesson: LdocLesson;
  nodes: LdocNode[];
}

export interface LdocLesson {
  id: string;
  title: string;
  part: number;
  version: string;
  summary?: string;
  authored_by?: 'human' | 'ai' | 'hybrid';
}

export interface LdocNode {
  id: string;
  title: string;
  mastery_target: MasteryLevel;
  prereq?: string[];
  content_hash?: string;
  blocks: LdocBlock[];
  grounding: LdocGrounding;
}

export type LdocBlock =
  | ProseBlock
  | MathBlock
  | MermaidBlock
  | CodeBlock
  | ImageBlock
  | VideoBlock
  | WidgetBlock
  | QuizBlock
  | CalloutBlock
  | LayerBlock;

export interface BaseBlock {
  id: string;
  type: BlockType;
}

export interface ProseBlock extends BaseBlock {
  type: 'prose';
  md: string;
}

export interface MathBlock extends BaseBlock {
  type: 'math';
  tex: string;
  caption?: string;
}

export interface MermaidBlock extends BaseBlock {
  type: 'mermaid';
  src: string;
  caption?: string;
}

export interface CodeBlock extends BaseBlock {
  type: 'code';
  lang: string;
  src: string;
  runnable?: boolean;
  stage?: 1 | 2 | 3;
}

export interface ImageBlock extends BaseBlock {
  type: 'image';
  url: string;
  alt: string;
  source: string;
  license: string;
  caption?: string;
  fallback_url?: string;
}

export interface VideoBlock extends BaseBlock {
  type: 'video';
  provider: 'youtube' | 'vimeo' | 'file';
  ref: string;
  source: string;
  license: string;
  caption?: string;
}

export interface WidgetBlock extends BaseBlock {
  type: 'widget';
  kind: 'template' | 'html';
  template?: string;
  params?: Record<string, unknown>;
  html?: string;
  io_contract?: Record<string, unknown>;
  capabilities?: { network?: string[]; storage?: boolean };
  caption?: string;
}

export interface QuizBlock extends BaseBlock {
  type: 'quiz';
  format: QuizFormat;
  q: string;
  options?: string[];
  answer_key?: unknown;
  rubric?: Record<string, string>;
  level: MasteryLevel;
  grounding_ref?: string;
}

export interface CalloutBlock extends BaseBlock {
  type: 'callout';
  md: string;
  icon?: string;
  tone?: string;
}

export interface LayerBlock extends BaseBlock {
  type: 'layer';
  reveal_at: MasteryLevel;
  mode: 'deeper' | 'remedial';
  blocks: LdocBlock[];
}

export interface LdocGrounding {
  must_know: { claim: string; source_id: string }[];
  canonical_answers?: Record<string, string>;
  misconceptions?: { wrong: string; correct: string }[];
  scope: { includes: string; excludes?: string[] };
  rubric_ref?: string;
  escalate_if?: string[];
  sources: { id: string; url: string; title: string; kind?: string; license?: string; retrieved?: string }[];
}

// IPC request/response DTOs

export interface ImportResult {
  lessonId: string;
  nodes: { id: string; title: string }[];
  warnings: ValidationIssue[];
  validation: ValidationReport;
}

export interface ValidationReport {
  ok: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
}

export interface ValidationIssue {
  rule: string;
  nodeId?: string;
  blockId?: string;
  message: string;
}

export interface LessonSummary {
  id: string;
  title: string;
  part: number;
  version: string;
  status: LessonStatus;
  nodeCount: number;
  created_at: string;
  updated_at: string;
}

export interface LessonWithNodes {
  lesson: LdocLesson;
  nodes: RenderableNode[];
}

export interface RenderableNode {
  id: string;
  title: string;
  mastery_target: MasteryLevel;
  prereq?: string[];
  blocks: LdocBlock[];
  grounding: LdocGrounding;
  progress?: NodeProgress;
}

export interface NodeProgress {
  node_id: string;
  level: MasteryLevel;
  stability: number;
  last_seen?: string;
  due_at?: string;
  belief: Record<string, { alpha: number; beta: number }>;
}

export interface TutorAnswer {
  answer_md: string;
  used_source_ids: string[];
  used_fact_ids: string[];
  citations: { id: string; url: string; title: string }[];
  scope: string;
  assessment: { target_level: MasteryLevel; outcome: EvidenceOutcome; rationale: string; suggested_next: string };
  escalated: boolean;
  confidence: number;
}

export interface ProgressMap {
  [nodeId: string]: NodeProgress;
}

export interface NodeRef {
  id: string;
  title: string;
  lesson_id: string;
  due_at: string;
}

export interface GraphData {
  nodes: { id: string; title: string; mastery_target: MasteryLevel; part: number }[];
  edges: { from: string; to: string }[];
}

export interface MediaReport {
  url: string;
  status: number | null;
  ok: boolean;
}

export interface Result<T> {
  ok: true;
  data: T;
} | {
  ok: false;
  error: string;
}

// Mastery estimator types

export interface BetaBelief {
  alpha: number;
  beta: number;
}

export interface BeliefState {
  L0: BetaBelief;
  L1: BetaBelief;
  L2: BetaBelief;
  L3: BetaBelief;
  L4: BetaBelief;
  L5: BetaBelief;
}

export interface Evidence {
  node_id: string;
  ts: string;
  source: EvidenceSource;
  target_level: MasteryLevel;
  outcome: EvidenceOutcome;
  detail?: Record<string, unknown>;
}
