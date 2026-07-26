export type BlockType = 
  | 'prose' | 'math' | 'mermaid' | 'code' | 'image' | 'video' | 'widget'
  | 'quiz' | 'callout' | 'layer' | 'chart' | 'table' | 'flow' | 'finchart'
  | 'svg' | 'tutor' | 'proposal' | 'conversation' | 'notes'
  | 'viz_heatmap' | 'viz_graph' | 'viz_timeline' | 'viz_concept_map'
  | 'flashcard' | 'flashcard_occlusion' | 'layer_reveal' | 'whiteboard'
  | 'quiz_mcq_image' | 'comparison' | 'code_playground' | 'formula_explorer';

export type MasteryLevel = 'L0' | 'L1' | 'L2' | 'L3' | 'L4' | 'L5';
export type CardType = 'basic' | 'reverse' | 'cloze' | 'image_occlusion';
export type CardRating = 1 | 2 | 3 | 4;

export interface HeatmapBlockData {
  type: 'viz_heatmap';
  id: string;
  meta: {
    data_source?: string;
    date_range?: string;
    color_scale?: string;
    cell_size?: number;
  };
}

export interface GraphNode {
  id: string;
  label: string;
  mastery_level?: MasteryLevel;
  part?: number;
  type?: string;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  type?: string;
}

export interface KnowledgeGraphBlockData {
  type: 'viz_graph';
  id: string;
  meta: {
    graph_type?: string;
    layout?: string;
    nodes_source?: string;
    nodes?: GraphNode[];
    edges?: GraphEdge[];
    highlight_mastery?: boolean;
  };
}

export interface FlashcardMedia {
  image?: string;
  audio?: string;
  svg?: string;
}

export interface FlashcardBlockData {
  type: 'flashcard' | 'flashcard_occlusion';
  id: string;
  meta: {
    deck_id: string;
    card_type: CardType;
    front: string;
    back: string;
    front_media?: FlashcardMedia;
    back_media?: FlashcardMedia;
    tags?: string[];
    occlusions?: Array<{ x: number; y: number; width: number; height: number; label: string }>;
    due?: string;
    stability?: number;
    difficulty?: number;
    reps?: number;
    lapses?: number;
  };
}

export interface ConceptMapNode {
  id: string;
  label: string;
  description?: string;
  mastery_target?: MasteryLevel;
  misconception?: string;
  children?: ConceptMapNode[];
  collapsed?: boolean;
}

export interface ConceptMapBlockData {
  type: 'viz_concept_map';
  id: string;
  meta: {
    root: ConceptMapNode;
    max_depth?: number;
    color_by_mastery?: boolean;
    collapsible?: boolean;
    layout?: string;
  };
}

export interface RevealStep {
  id: string;
  label: string;
  content: string;
  hint?: string;
  mastery_unlock?: MasteryLevel;
}

export interface LayerRevealBlockData {
  type: 'layer_reveal';
  id: string;
  meta: {
    title: string;
    steps: RevealStep[];
    reveal_mode: 'sequential' | 'free' | 'mastery_gated';
    default_unlocked?: number;
    show_progress?: boolean;
    allow_backtrack?: boolean;
  };
}

export interface TimelineEvent {
  date: string;
  type: string;
  node_id?: string;
  node_title?: string;
  from_level?: MasteryLevel;
  to_level?: MasteryLevel;
  score?: number;
  description?: string;
}

export interface MasteryTimelineBlockData {
  type: 'viz_timeline';
  id: string;
  meta: {
    node_id?: string;
    lesson_id?: string;
    date_range?: string;
    show_events?: boolean;
    show_target_line?: boolean;
    target_level?: MasteryLevel;
    height?: number;
  };
}

export interface WhiteboardBlockData {
  type: 'whiteboard';
  id: string;
  meta: {
    initial_data?: string;
    read_only?: boolean;
    allow_export?: boolean;
    width?: string;
    height?: string;
  };
}
