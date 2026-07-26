import React, { useState } from 'react';
import type { CodeBlock } from '../../../shared/learn/types';

interface Props {
  block: CodeBlock;
  onAsk?: (blockId: string, question: string) => void;
}

export function CodeBlock({ block, onAsk }: Props) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(block.src);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  // Simple syntax highlighting via Prism
  const highlighted = highlightCode(block.src, block.lang);

  return (
    <div className="my-4 rounded-xl border border-zinc-700/40 overflow-hidden group relative" data-block-id={block.id}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-zinc-800/60 border-b border-zinc-700/40">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-zinc-400">{block.lang}</span>
          {block.stage && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
              block.stage === 1 ? 'bg-blue-500/15 text-blue-400' :
              block.stage === 2 ? 'bg-amber-500/15 text-amber-400' :
              'bg-emerald-500/15 text-emerald-400'
            }`}>
              Stage {block.stage}
            </span>
          )}
          {block.runnable && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-500/15 text-green-400 font-medium">
              ▶ Runnable
            </span>
          )}
        </div>
        <button
          onClick={handleCopy}
          className="text-xs text-zinc-500 hover:text-zinc-300 transition"
        >
          {copied ? '✓ Copied' : 'Copy'}
        </button>
      </div>
      {/* Code */}
      <pre className="p-4 bg-zinc-900/50 overflow-x-auto text-sm font-mono leading-relaxed">
        <code dangerouslySetInnerHTML={{ __html: highlighted }} />
      </pre>
      {onAsk && (
        <button
          onClick={() => onAsk(block.id, `Explain this ${block.lang} code`)}
          className="absolute -right-6 top-2 opacity-0 group-hover:opacity-100 transition-opacity text-zinc-500 hover:text-zinc-300 text-xs"
          title="Ask about this"
        >
          💡
        </button>
      )}
    </div>
  );
}

function highlightCode(code: string, lang: string): string {
  // Escape HTML first
  let escaped = code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Very basic keyword highlighting for common languages
  const keywords: Record<string, string[]> = {
    python: ['def', 'class', 'import', 'from', 'return', 'if', 'else', 'elif', 'for', 'while', 'try', 'except', 'with', 'as', 'True', 'False', 'None', 'self', 'print', 'lambda', 'yield', 'async', 'await'],
    javascript: ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'class', 'import', 'export', 'default', 'async', 'await', 'try', 'catch', 'new', 'this', 'true', 'false', 'null', 'undefined'],
    typescript: ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'class', 'import', 'export', 'default', 'async', 'await', 'try', 'catch', 'new', 'this', 'true', 'false', 'null', 'undefined', 'interface', 'type', 'enum', 'extends', 'implements'],
  };

  const langKeywords = keywords[lang] || keywords['javascript'] || [];
  const keywordRegex = new RegExp(`\\b(${langKeywords.join('|')})\\b`, 'g');
  escaped = escaped.replace(keywordRegex, '<span class="text-purple-400">$1</span>');

  // String highlighting
  escaped = escaped.replace(/(["'`])(?:(?!\1|\\).|\\.)*?\1/g, '<span class="text-emerald-400">$&</span>');
  // Comment highlighting
  escaped = escaped.replace(/(\/\/.*$|#.*$)/gm, '<span class="text-zinc-500">$1</span>');
  // Number highlighting
  escaped = escaped.replace(/\b(\d+\.?\d*)\b/g, '<span class="text-amber-400">$1</span>');

  return escaped;
}
