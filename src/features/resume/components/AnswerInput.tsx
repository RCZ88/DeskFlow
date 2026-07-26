import { useState } from 'react';
import { X, Plus } from 'lucide-react';
import { Input } from '../../../components/ui/input';
import { VoiceInput } from './VoiceInput';
import type { Question } from '../../../types/resume';

interface AnswerInputProps {
  inputType: Question['inputType'];
  value: any;
  onChange: (value: any) => void;
  validation?: Question['validation'];
  placeholder?: string;
  disabled?: boolean;
}

export function AnswerInput({ inputType, value, onChange, validation, placeholder, disabled }: AnswerInputProps) {
  const [tagInput, setTagInput] = useState('');

  if (inputType === 'tags') {
    const tags: string[] = Array.isArray(value) ? value : [];
    const addTag = () => {
      if (tagInput.trim() && !tags.includes(tagInput.trim())) {
        onChange([...tags, tagInput.trim()]);
        setTagInput('');
      }
    };
    const removeTag = (tag: string) => {
      onChange(tags.filter((t) => t !== tag));
    };

    return (
      <div className="space-y-2.5">
        <div className="flex flex-wrap gap-1.5 min-h-[56px] p-3.5 rounded-xl bg-gradient-to-br from-zinc-900/80 to-zinc-800/40 ring-1 ring-zinc-700/50 focus-within:ring-[var(--page-accent)]/50 focus-within:ring-2 transition-all duration-150">
          {tags.map((tag) => (
            <motion.span
              key={tag}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[var(--page-accent)]/10 text-[var(--page-accent)] text-xs font-medium ring-1 ring-[var(--page-accent)]/20"
            >
              {tag}
              <button onClick={() => removeTag(tag)} className="hover:text-white transition-colors ml-0.5">
                <X className="w-3 h-3" />
              </button>
            </motion.span>
          ))}
          <input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
            placeholder={tags.length === 0 ? (placeholder || 'Type and press Enter...') : ''}
            disabled={disabled}
            className="flex-1 min-w-[120px] bg-transparent text-sm text-white placeholder-zinc-500 outline-none disabled:opacity-50"
          />
        </div>
        <button onClick={addTag} disabled={!tagInput.trim() || disabled} className="text-xs text-[var(--page-accent)] hover:text-[var(--page-accent)]/80 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition-colors">
          <Plus className="w-3 h-3" /> Add tag
        </button>
      </div>
    );
  }

  if (inputType === 'textarea') {
    return (
      <div className="relative">
        <textarea
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || 'Type your answer here... Be specific about what you did, the outcome, and the technologies used.'}
          disabled={disabled}
          rows={16}
          className="w-full p-5 pr-14 rounded-xl bg-gradient-to-br from-zinc-900/80 to-zinc-800/40 ring-1 ring-zinc-700/50 text-[15px] text-white placeholder-zinc-500 outline-none focus:ring-[var(--page-accent)]/50 focus:ring-2 transition-all duration-150 resize-y min-h-[320px] disabled:opacity-50 disabled:cursor-wait leading-relaxed"
        />
        <VoiceInput value={value || ''} onChange={onChange} disabled={disabled} />
        {value && value.length > 0 && (
          <div className="absolute bottom-3 right-12 text-[10px] text-zinc-600 tabular-nums">
            {value.length} chars
          </div>
        )}
      </div>
    );
  }

  if (inputType === 'metric') {
    return (
      <div className="relative">
        <Input
          type="text"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || 'e.g., 42%, 3 months, $50k, 10x improvement'}
          disabled={disabled}
          className="h-14 pr-14 text-base rounded-xl bg-gradient-to-br from-zinc-900/80 to-zinc-800/40"
        />
        <VoiceInput value={value || ''} onChange={onChange} disabled={disabled} />
        {validation?.metricTypes && (
          <div className="flex gap-1.5 items-center mt-2.5">
            {validation.metricTypes.map((t) => (
              <span key={t} className="px-2 py-1 rounded-lg bg-zinc-800/60 text-[10px] text-zinc-400 font-mono ring-1 ring-zinc-700/30">
                {t}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (inputType === 'slider') {
    return (
      <div className="space-y-3">
        <input
          type="range"
          min={0}
          max={100}
          value={value || 50}
          onChange={(e) => onChange(Number(e.target.value))}
          disabled={disabled}
          className="w-full h-2 rounded-full bg-zinc-700 appearance-none cursor-pointer accent-[var(--page-accent)] disabled:opacity-50"
        />
        <div className="flex justify-between text-xs text-zinc-500">
          <span>Low</span>
          <span className="text-white font-semibold tabular-nums">{value || 50}%</span>
          <span>High</span>
        </div>
      </div>
    );
  }

  // Default: text input with voice — BIGGER
  return (
    <div className="relative">
      <Input
        type="text"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || 'Type your answer here...'}
        disabled={disabled}
        className="h-14 pr-14 text-base rounded-xl bg-gradient-to-br from-zinc-900/80 to-zinc-800/40"
      />
      <VoiceInput value={value || ''} onChange={onChange} disabled={disabled} />
      {value && value.length > 0 && (
        <div className="absolute right-12 top-1/2 -translate-y-1/2 text-[10px] text-zinc-600 tabular-nums">
          {value.length}
        </div>
      )}
    </div>
  );
}
