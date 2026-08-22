// Lyceum Learn — Non-AI Visual Asset Catalog (Task B)
// Curated sources for visualizations/illustrations/animations without AI image generation

console.log('%c[VisualCatalog] v1.0 loaded', 'color: #fbbf24; font-weight: bold');

export interface VisualAsset {
  id: string;
  type: 'diagram' | 'chart' | 'code-visual' | 'embed' | 'stock' | 'animation' | 'timeline';
  title: string;
  description: string;
  snippet: string;
  tags: string[];
}

export const VISUAL_CATALOG: VisualAsset[] = [
  // Diagrams (Mermaid — already native)
  {
    id: 'mermaid-flow',
    type: 'diagram',
    title: 'Flow Diagram',
    description: 'State machines, data pipelines, decision trees',
    snippet: '```mermaid\ngraph TD\n  A[Input] --> B{Decision}\n  B -->|Yes| C[Output]\n  B -->|No| D[Error]\n```',
    tags: ['mermaid', 'flow', 'pipeline', 'state'],
  },
  {
    id: 'mermaid-sequence',
    type: 'diagram',
    title: 'Sequence Diagram',
    description: 'API calls, request/response flows, temporal ordering',
    snippet: '```mermaid\nsequenceDiagram\n  participant C as Client\n  participant S as Server\n  C->>S: GET /api\n  S-->>C: 200 OK\n```',
    tags: ['mermaid', 'sequence', 'api', 'temporal'],
  },
  {
    id: 'mermaid-sankey',
    type: 'diagram',
    title: 'Sankey Flow',
    description: 'Energy/data/resource flow between stages',
    snippet: '```mermaid\nsankey-beta\nsource,target,value\nInput,Process,100\nProcess,Output,80\nProcess, Waste,20\n```',
    tags: ['mermaid', 'sankey', 'flow', 'energy'],
  },
  {
    id: 'mermaid-class',
    type: 'diagram',
    title: 'Class / ER Diagram',
    description: 'Object relationships, database schemas',
    snippet: '```mermaid\nclassDiagram\n  class User {\n    +String name\n    +login()\n  }\n  User --> Post : writes\n```',
    tags: ['mermaid', 'class', 'er', 'schema'],
  },

  // Charts (Vega-Lite)
  {
    id: 'vega-bar',
    type: 'chart',
    title: 'Bar Chart',
    description: 'Categorical comparisons, frequency distributions',
    snippet: '::: chart\n{"$schema":"https://vega.github.io/schema/vega-lite/v5.json","mark":"bar","data":{"values":[{"x":"A","y":10},{"x":"B","y":20}]},"encoding":{"x":{"field":"x","type":"nominal"},"y":{"field":"y","type":"quantitative"}}}\n:::',
    tags: ['vega', 'bar', 'comparison', 'frequency'],
  },
  {
    id: 'vega-scatter',
    type: 'chart',
    title: 'Scatter Plot',
    description: 'Correlations, profiling data, latency distributions',
    snippet: '::: chart\n{"$schema":"https://vega.github.io/schema/vega-lite/v5.json","mark":"point","data":{"values":[{"x":1,"y":2},{"x":3,"y":4}]},"encoding":{"x":{"field":"x","type":"quantitative"},"y":{"field":"y","type":"quantitative"}}}\n:::',
    tags: ['vega', 'scatter', 'correlation', 'profiling'],
  },
  {
    id: 'vega-line',
    type: 'chart',
    title: 'Line Chart',
    description: 'Trends over time, time-series data',
    snippet: '::: chart\n{"$schema":"https://vega.github.io/schema/vega-lite/v5.json","mark":"line","data":{"values":[{"x":1,"y":10},{"x":2,"y":25},{"x":3,"y":18}]},"encoding":{"x":{"field":"x","type":"quantitative"},"y":{"field":"y","type":"quantitative"}}}\n:::',
    tags: ['vega', 'line', 'trend', 'time-series'],
  },

  // Code-driven visuals
  {
    id: 'svg-block',
    type: 'code-visual',
    title: 'SVG Diagram',
    description: 'Custom vector diagrams, architecture layouts',
    snippet: '::: svg\n<svg viewBox="0 0 400 200"><rect x="10" y="10" width="100" height="80" fill="#22d3ee" rx="8"/><text x="60" y="55" fill="white" text-anchor="middle" font-size="12">Module A</text></svg>\n:::',
    tags: ['svg', 'vector', 'architecture', 'custom'],
  },
  {
    id: 'code-block',
    type: 'code-visual',
    title: 'Annotated Code',
    description: 'Line-by-line syntax breakdown with interactive annotations',
    snippet: '```c\nint x = 42;    // @decl Variable declaration\nint *p = &x;   // @ptr Pointer stores address\n*p = 100;       // @deref Dereference writes value\n```\n\n- @decl: Creates a named integer variable on the stack\n- @ptr: Pointer variable stores the memory address of x\n- @deref: Writes 100 to the memory location p points to',
    tags: ['code', 'annotated', 'syntax', 'interactive'],
  },

  // Timelines / concept maps (native viz blocks)
  {
    id: 'viz-timeline',
    type: 'timeline',
    title: 'Timeline',
    description: 'Historical events, version history, project milestones',
    snippet: '::: viz_timeline\n{"events":[{"date":"2020","title":"v1.0","desc":"Initial release"},{"date":"2022","title":"v2.0","desc":"Major rewrite"}]}\n:::',
    tags: ['timeline', 'history', 'milestones'],
  },
  {
    id: 'viz-concept-map',
    type: 'timeline',
    title: 'Concept Map',
    description: 'Knowledge relationships, prerequisite graphs',
    snippet: '::: viz_concept_map\n{"nodes":[{"id":"a","label":"Basics"},{"id":"b","label":"Advanced"}],"edges":[{"from":"a","to":"b","label":"leads to"}]}\n:::',
    tags: ['concept', 'map', 'knowledge', 'prerequisites'],
  },

  // Embeddable widgets
  {
    id: 'widget-html',
    type: 'embed',
    title: 'HTML Widget',
    description: 'Interactive demos, calculators, playgrounds',
    snippet: '::: widget\n<iframe src="https://example.com/playground" width="100%" height="300" frameborder="0"></iframe>\n:::',
    tags: ['widget', 'iframe', 'interactive', 'playground'],
  },

  // Stock imagery (Unsplash)
  {
    id: 'stock-image',
    type: 'stock',
    title: 'Stock Photo',
    description: 'Contextual imagery from Unsplash with auto-attribution',
    snippet: '::: image\nhttps://images.unsplash.com/photo-xxx?w=800\nPhoto by Author on Unsplash\n:::',
    tags: ['stock', 'photo', 'unsplash', 'image'],
  },

  // Animations (CSS/Magic UI)
  {
    id: 'animation-typing',
    type: 'animation',
    title: 'Typing Animation',
    description: 'Terminal-style typing effect for code展示',
    snippet: '<div class="animate-typing overflow-hidden whitespace-nowrap border-r-2 border-amber-400 pr-2 text-amber-300 font-mono">const greeting = "Hello World";</div>',
    tags: ['animation', 'typing', 'terminal', 'code'],
  },
];

export function searchVisualAssets(query: string): VisualAsset[] {
  const q = query.toLowerCase();
  return VISUAL_CATALOG.filter(a =>
    a.title.toLowerCase().includes(q) ||
    a.description.toLowerCase().includes(q) ||
    a.tags.some(t => t.includes(q))
  );
}

export function getVisualAssetsByType(type: VisualAsset['type']): VisualAsset[] {
  return VISUAL_CATALOG.filter(a => a.type === type);
}
