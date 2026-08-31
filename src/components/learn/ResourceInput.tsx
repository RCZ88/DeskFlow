import React, { useState, useRef } from 'react';
import { Plus, X, Link, FileText, Upload, Globe, Type } from 'lucide-react';
import { FieldAIButton } from '@/components/ai-bridge/FieldAIButton';

export interface Resource {
  id: string;
  type: 'link' | 'text' | 'file';
  content: string;
  fileName?: string;
}

interface ResourceInputProps {
  resources: Resource[];
  onChange: (resources: Resource[]) => void;
}

export function ResourceInput({ resources, onChange }: ResourceInputProps) {
  const [addingType, setAddingType] = useState<'link' | 'text' | null>(null);
  const [linkInput, setLinkInput] = useState('');
  const [textInput, setTextInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const linkInputRef = useRef<HTMLInputElement>(null);

  const addLink = () => {
    if (!linkInput.trim()) return;
    const url = linkInput.trim();
    const formatted = url.startsWith('http') ? url : `https://${url}`;
    try {
      const hostname = new URL(formatted).hostname.replace('www.', '');
      onChange([...resources, { id: `res-${Date.now()}`, type: 'link', content: formatted, fileName: hostname }]);
    } catch {
      onChange([...resources, { id: `res-${Date.now()}`, type: 'link', content: formatted, fileName: formatted.slice(0, 30) }]);
    }
    setLinkInput('');
    setAddingType(null);
  };

  const addText = () => {
    if (!textInput.trim()) return;
    const preview = textInput.trim().slice(0, 40) + (textInput.trim().length > 40 ? '...' : '');
    onChange([...resources, { id: `res-${Date.now()}`, type: 'text', content: textInput.trim(), fileName: preview }]);
    setTextInput('');
    setAddingType(null);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      onChange([...resources, { id: `res-${Date.now()}`, type: 'file', content: reader.result as string, fileName: file.name }]);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const removeResource = (id: string) => {
    onChange(resources.filter(r => r.id !== id));
  };

  const handleLinkKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); addLink(); }
    if (e.key === 'Escape') { setAddingType(null); setLinkInput(''); }
  };

  const handleTextKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { setAddingType(null); setTextInput(''); }
  };

  const typeIcons = {
    link: Globe,
    text: Type,
    file: FileText,
  };

  const typeColors = {
    link: 'text-clay-400 bg-clay-500/10 border-clay-500/20',
    text: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    file: 'text-sage-400 bg-sage-500/10 border-sage-500/20',
  };

  return (
    <div className="space-y-2">
      {/* Resource chips */}
      {resources.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {resources.map((res) => {
            const Icon = typeIcons[res.type];
            return (
              <div
                key={res.id}
                className={`group inline-flex items-center gap-1.5 pl-2 pr-1 py-1 rounded-lg border text-xs font-medium cursor-default transition ${typeColors[res.type]}`}
              >
                <Icon className="w-3 h-3 shrink-0" />
                <span className="max-w-[140px] truncate">{res.fileName || res.content.slice(0, 20)}</span>
                {res.type === 'link' && (
                  <a href={res.content} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-[9px] opacity-50 hover:opacity-100 transition">↗</a>
                )}
                <button
                  onClick={() => removeResource(res.id)}
                  className="p-0.5 rounded hover:bg-white/10 opacity-40 hover:opacity-100 transition"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Add buttons / Input */}
      {addingType === null ? (
        <div className="flex items-center gap-1">
          <button
            onClick={() => { setAddingType('link'); setTimeout(() => linkInputRef.current?.focus(), 50); }}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-dashed border-zinc-700/40 text-zinc-500 hover:text-clay-400 hover:border-clay-500/30 transition text-[11px]"
          >
            <Link className="w-2.5 h-2.5" />
            Link
          </button>
          <button
            onClick={() => setAddingType('text')}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-dashed border-zinc-700/40 text-zinc-500 hover:text-amber-400 hover:border-amber-500/30 transition text-[11px]"
          >
            <Type className="w-2.5 h-2.5" />
            Text
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-dashed border-zinc-700/40 text-zinc-500 hover:text-sage-400 hover:border-sage-500/30 transition text-[11px]"
          >
            <Upload className="w-2.5 h-2.5" />
            File
          </button>
          <input ref={fileInputRef} type="file" accept=".txt,.md,.json,.pdf" onChange={handleFileUpload} className="hidden" />
        </div>
      ) : addingType === 'link' ? (
        <div className="flex items-center gap-1.5">
          <div className="relative flex-1 max-w-xs">
            <Globe className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-600" />
            <input
              ref={linkInputRef}
              type="url"
              value={linkInput}
              onChange={(e) => setLinkInput(e.target.value)}
              onKeyDown={handleLinkKeyDown}
              onBlur={() => { if (!linkInput) { setAddingType(null); } }}
              placeholder="URL..."
              className="w-full pl-7 pr-2 py-1.5 rounded-lg bg-zinc-800/60 border border-zinc-700/50 text-zinc-200 text-xs focus:outline-none focus:border-clay-500/40 placeholder:text-zinc-600"
            />
          </div>
          <button onClick={addLink} className="px-2 py-1.5 rounded-lg bg-clay-500/15 text-clay-300 text-[11px] font-medium border border-clay-400/20 hover:bg-clay-500/25 transition">Add</button>
          <button onClick={() => { setAddingType(null); setLinkInput(''); }} className="p-1.5 rounded text-zinc-600 hover:text-zinc-400 transition">
            <X className="w-3 h-3" />
          </button>
        </div>
      ) : addingType === 'text' ? (
        <div className="space-y-1.5">
          <textarea
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            onKeyDown={handleTextKeyDown}
            placeholder="Paste notes..."
            className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-800/60 border border-zinc-700/50 text-zinc-200 text-xs leading-relaxed focus:outline-none focus:border-clay-500/40 resize-none placeholder:text-zinc-600 min-h-[48px]"
            rows={2}
            autoFocus
          />
          <FieldAIButton
            fieldName="textInput"
            label="Resource Notes"
            value={textInput}
            onUpdate={setTextInput}
            allFields={{ textInput, linkInput }}
            category="learn"
            context="Help write or summarize resource notes"
          />
          <div className="flex items-center gap-1">
            <button onClick={addText} className="px-2 py-1 rounded-lg bg-clay-500/15 text-clay-300 text-[11px] font-medium border border-clay-400/20 hover:bg-clay-500/25 transition">Add</button>
            <button onClick={() => { setAddingType(null); setTextInput(''); }} className="p-1 rounded text-zinc-600 hover:text-zinc-400 transition">
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
