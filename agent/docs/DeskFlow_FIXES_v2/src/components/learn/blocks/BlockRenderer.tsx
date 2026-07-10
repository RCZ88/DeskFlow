// BlockRenderer — dispatches to typed block components
// Unknown types render a graceful "unsupported block" placeholder

import React from 'react';
import type { LdocBlock } from '../../shared/learn/types';
import { ProseBlock } from './ProseBlock';
import { MathBlock } from './MathBlock';
import { MermaidBlock } from './MermaidBlock';
import { CodeBlock } from './CodeBlock';
import { ImageBlock } from './ImageBlock';
import { VideoBlock } from './VideoBlock';
import { QuizBlock } from './QuizBlock';
import { CalloutBlock } from './CalloutBlock';
import { LayerBlock } from './LayerBlock';
import { WidgetHost } from '../WidgetHost';

interface BlockRendererProps {
  block: LdocBlock;
  onAsk?: (blockId: string, question: string) => void;
  onQuizSubmit?: (nodeId: string, blockId: string, response: string) => void;
  currentLevel?: string;
  nodeId?: string;
}

export function BlockRenderer({ block, onAsk, onQuizSubmit, currentLevel, nodeId }: BlockRendererProps) {
  const sharedProps = { block, onAsk };

  switch (block.type) {
    case 'prose':
      return <ProseBlock {...sharedProps} block={block} />;
    case 'math':
      return <MathBlock {...sharedProps} block={block} />;
    case 'mermaid':
      return <MermaidBlock {...sharedProps} block={block} />;
    case 'code':
      return <CodeBlock {...sharedProps} block={block} />;
    case 'image':
      return <ImageBlock {...sharedProps} block={block} />;
    case 'video':
      return <VideoBlock {...sharedProps} block={block} />;
    case 'quiz':
      if (!onQuizSubmit || !nodeId) return null;
      return <QuizBlock block={block} onSubmit={(response) => onQuizSubmit(nodeId, block.id, response)} />;
    case 'callout':
      return <CalloutBlock {...sharedProps} block={block} />;
    case 'layer':
      return <LayerBlock block={block} currentLevel={currentLevel} onAsk={onAsk} onQuizSubmit={onQuizSubmit} nodeId={nodeId} />;
    case 'widget':
      return <WidgetHost block={block} />;
    default:
      return <UnsupportedBlock block={block} />;
  }
}

function UnsupportedBlock({ block }: { block: any }) {
  return (
    <div className="my-4 p-4 rounded-xl border border-amber-500/20 bg-amber-500/5">
      <div className="text-amber-400 text-sm">⚠️ Unsupported block type: <code>{block.type}</code></div>
    </div>
  );
}
