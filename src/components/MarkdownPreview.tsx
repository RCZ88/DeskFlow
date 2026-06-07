interface MarkdownPreviewProps {
  content: string;
  className?: string;
}

export function MarkdownPreview({ content, className = '' }: MarkdownPreviewProps) {
  const lines = content.split('\n');

  const elements = lines.map((line, i) => {
    const trimmed = line.trim();

    if (trimmed.startsWith('- [x] ')) {
      const text = trimmed.replace('- [x] ', '');
      return (
        <div key={i} className="flex items-start gap-2 text-sm text-zinc-300">
          <span className="mt-0.5 text-emerald-400 shrink-0">✓</span>
          <span className="line-through text-zinc-500">{text}</span>
        </div>
      );
    }

    if (trimmed.startsWith('- [ ] ')) {
      const text = trimmed.replace('- [ ] ', '');
      return (
        <div key={i} className="flex items-start gap-2 text-sm text-zinc-300">
          <span className="mt-0.5 w-3.5 h-3.5 rounded border border-zinc-600 shrink-0" />
          <span>{text}</span>
        </div>
      );
    }

    if (trimmed.startsWith('- ')) {
      const text = trimmed.replace('- ', '');
      return <div key={i} className="flex items-start gap-2 text-sm text-zinc-300"><span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-zinc-500 shrink-0" />{renderInline(text)}</div>;
    }

    if (trimmed.startsWith('## ')) {
      return <h2 key={i} className="text-sm font-semibold text-purple-400 mt-4 mb-2">{trimmed.replace('## ', '')}</h2>;
    }

    if (trimmed.startsWith('# ')) {
      return <h1 key={i} className="text-base font-bold text-purple-400 mt-4 mb-2">{trimmed.replace('# ', '')}</h1>;
    }

    if (trimmed === '') {
      return <div key={i} className="h-2" />;
    }

    return <div key={i} className="text-sm text-zinc-300">{renderInline(trimmed)}</div>;
  });

  return <div className={`space-y-0.5 ${className}`}>{elements}</div>;
}

function renderInline(text: string) {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, j) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={j} className="font-semibold text-zinc-100">{part.slice(2, -2)}</strong>;
    }
    return <span key={j}>{part}</span>;
  });
}
