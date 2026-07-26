import { type FC, useEffect } from 'react';
import { BlockRenderer } from './BlockRenderer';
import type { ParsedResponse } from '../../services/wireFormat';
import { useNavigate } from 'react-router-dom';
import { navigateTo } from '../../lib/deepNav';

interface TypewriterTextProps {
  nodes: ParsedResponse['nodes'];
  refs?: ParsedResponse['refs'];
  onDone?: () => void;
  streaming?: boolean;
}

export const TypewriterText: FC<TypewriterTextProps> = ({ nodes, refs = {}, onDone, streaming = false }) => {
  const navigate = useNavigate();

  useEffect(() => {
    if (!streaming) onDone?.();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!nodes || nodes.length === 0) return null;

  if (!streaming) {
    return (
      <BlockRenderer
        nodes={nodes}
        refs={refs}
        onNavigate={(page, section, tab) => navigateTo({ route: page, section, tab }, navigate)}
      />
    );
  }

  function flattenText(n: any): string {
    if (!n) return '';
    if (typeof n === 'string') return n;
    if (Array.isArray(n)) return n.map(flattenText).join(' ');
    if (n.kind === 'group') return n.children?.map(flattenText).join(' ') ?? '';
    if (n.type === 'text' && n.fields?.body) return n.fields.body;
    return '';
  }

  const fullText = nodes.map(flattenText).join(' ').trim();

  return (
    <span className="text-sm text-zinc-100 whitespace-pre-wrap">
      {fullText}
      <span className="inline-block w-[2px] h-[1em] -mb-[2px] bg-pink-400 ml-0.5 align-baseline animate-caret" />
    </span>
  );
};
