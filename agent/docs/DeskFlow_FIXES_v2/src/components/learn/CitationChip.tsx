import React, { useState } from 'react';

interface Props {
  id: string;
  url: string;
  title: string;
}

export function CitationChip({ id, url, title }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <span className="relative inline-flex">
      <button
        onClick={() => setOpen(!open)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20 hover:text-indigo-200 transition-colors border border-indigo-500/20 cursor-pointer"
        aria-label={`Source ${id}: ${title}`}
      >
        [{id}]
      </button>
      {open && (
        <div className="absolute bottom-full left-0 mb-1.5 z-30 w-64 p-3 rounded-xl bg-zinc-800/95 backdrop-blur-xl border border-zinc-700/50 shadow-lg">
          <div className="text-xs font-medium text-zinc-200 mb-1 truncate">{title}</div>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-indigo-400 hover:text-indigo-300 truncate block hover:underline"
          >
            {url}
          </a>
          <div className="text-[10px] text-zinc-600 mt-1.5">Source [{id}]</div>
        </div>
      )}
    </span>
  );
}
