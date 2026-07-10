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
import { ChartBlock } from './ChartBlock';
import { TableBlock } from './TableBlock';
import { FlowBlock } from './FlowBlock';
import { FinChartBlock } from './FinChartBlock';
import { SvgBlock } from './SvgBlock';
import { TutorBlock } from './TutorBlock';
import { ProposalBlock } from './ProposalBlock';
import { ConversationBlock } from './ConversationBlock';
import { NotesBlock } from './NotesBlock';

interface BlockRendererProps {
  block: LdocBlock;
  onAsk?: (blockId: string, question: string) => void;
  onQuizSubmit?: (nodeId: string, blockId: string, response: string) => void;
  currentLevel?: string;
  nodeId?: string;
  onApproveProposal?: (blockId: string) => void;
  onRejectProposal?: (blockId: string, reason?: string) => void;
  onAddMessage?: (blockId: string, text: string) => void;
  onResolveConversation?: (blockId: string) => void;
  onAddNote?: (blockId: string, text: string) => void;
  onDeleteNote?: (noteId: string) => void;
  onTogglePin?: (noteId: string) => void;
}

const VISUAL_TYPES = new Set(['mermaid', 'chart', 'flow', 'finchart', 'table', 'image', 'widget', 'svg', 'math', 'code', 'video']);

export function BlockRenderer({ block, onAsk, onQuizSubmit, currentLevel, nodeId, onApproveProposal, onRejectProposal, onAddMessage, onResolveConversation, onAddNote, onDeleteNote, onTogglePin }: BlockRendererProps) {
  const sharedProps = { block, onAsk };
  const isVisual = VISUAL_TYPES.has(block.type);
  const wrapper = isVisual ? 'max-w-4xl w-full mx-auto' : 'max-w-[68ch] mx-auto';

  const content = (() => {
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
      case 'chart':
        return <ChartBlock {...sharedProps} block={block} />;
      case 'table':
        return <TableBlock {...sharedProps} block={block} />;
      case 'flow':
        return <FlowBlock {...sharedProps} block={block} />;
      case 'finchart':
        return <FinChartBlock {...sharedProps} block={block} />;
      case 'svg':
        return <SvgBlock {...sharedProps} block={block} />;
      case 'tutor':
        if (!nodeId) return null;
        return <TutorBlock block={block} nodeId={nodeId} onAsk={onAsk || (() => {})} />;
      case 'proposal':
        return <ProposalBlock block={block} onApprove={onApproveProposal} onReject={onRejectProposal} />;
      case 'conversation':
        if (!nodeId) return null;
        return <ConversationBlock block={block} nodeId={nodeId} onAddMessage={onAddMessage || (() => {})} onResolve={onResolveConversation} />;
      case 'notes':
        if (!nodeId) return null;
        return <NotesBlock block={block} nodeId={nodeId} onAddNote={onAddNote} onDeleteNote={onDeleteNote} onTogglePin={onTogglePin} />;
      default:
        return <UnsupportedBlock block={block} />;
    }
  })();

  if (isVisual) {
    return <div className={wrapper}>{content}</div>;
  }
  return content;
}

function UnsupportedBlock({ block }: { block: any }) {
  return (
    <div className="my-4 p-4 rounded-xl border border-amber-500/20 bg-amber-500/5">
      <div className="text-amber-400 text-sm">⚠️ Unsupported block type: <code>{block.type}</code></div>
    </div>
  );
}
