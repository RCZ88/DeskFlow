import { useState } from 'react';
import { X, Send, FileText, Sparkles, Loader2, ChevronRight } from 'lucide-react';

interface DSLGenerationModalProps {
  skill: {
    id: string;
    name: string;
    description: string;
    content?: string;
    filePath?: string;
  };
  terminals: Array<{
    id: string;
    label?: string;
    agent?: string;
    topic?: string;
  }>;
  activeTerminalId: string | null;
  onClose: () => void;
  onSend: (terminalId: string, prompt: string) => Promise<void>;
}

const STAGES = [
  { key: 'compose', label: 'Compose', icon: FileText },
  { key: 'sending', label: 'Send to Agent', icon: Send },
  { key: 'done', label: 'Done', icon: Sparkles },
] as const;

export default function DSLGenerationModal({
  skill,
  terminals,
  activeTerminalId,
  onClose,
  onSend,
}: DSLGenerationModalProps) {
  const [selectedTerminal, setSelectedTerminal] = useState(activeTerminalId || '');
  const [customInstructions, setCustomInstructions] = useState('');
  const [stage, setStage] = useState<'compose' | 'sending' | 'done'>('compose');
  const [error, setError] = useState<string | null>(null);

  const availableTerminals = terminals.filter(t => t.id);

  const buildPrompt = (): string => {
    const parts: string[] = [];

    parts.push(`Generate DSL frontmatter for the skill "${skill.name}".`);
    parts.push('');
    parts.push(`Description: ${skill.description || 'No description available'}`);

    if (skill.filePath) {
      parts.push(`Skill file path: ${skill.filePath}`);
    }

    parts.push('');
    parts.push('Read `agent/skills/SKILL_DSL_GUIDE.md` for the DSL specification — it defines');
    parts.push('the YAML frontmatter schema for `inputs` (form controls) and `outputs`');
    parts.push('(produced results) sections. The type mapping table tells you which widget');
    parts.push('maps to which type.');
    parts.push('');

    if (skill.filePath) {
      parts.push(`Read the current skill file at: ${skill.filePath}`);
    } else {
      parts.push(`Read the current skill file at: agent/skills/${skill.id}.md`);
    }

    parts.push('');
    parts.push('Analyze the skill\'s content and generate appropriate `inputs` and `outputs`');
    parts.push('sections based on what the skill does and what configurable parameters it needs.');
    parts.push('');
    parts.push('Requirements:');
    parts.push('- Generate "inputs" entries with: name, type, required, description, group');
    parts.push('- Use the type mapping table from SKILL_DSL_GUIDE.md to pick the right widget');
    parts.push('- Set sensible defaults, placeholders, min/max ranges where applicable');
    parts.push('- For enum/multienum types, include explicit "choices" arrays');
    parts.push('- Group related inputs together using the "group" field');
    parts.push('- Include "outputs" when the skill produces structured results');
    parts.push('- Preserve ALL existing frontmatter fields (id, name, description, tags, etc.)');
    parts.push('- Only add/replace the inputs and outputs sections');

    if (customInstructions.trim()) {
      parts.push('');
      parts.push('Additional instructions from the user:');
      parts.push(customInstructions.trim());
    }

    parts.push('');
    parts.push('When done, update the SKILL.md file with the generated frontmatter.');

    return parts.join('\n');
  };

  const handleSend = async () => {
    if (!selectedTerminal) {
      setError('Please select a terminal');
      return;
    }

    setError(null);
    setStage('sending');

    try {
      const prompt = buildPrompt();
      await onSend(selectedTerminal, prompt);
      setStage('done');
    } catch (err) {
      setError((err as Error).message || 'Failed to send prompt to terminal');
      setStage('compose');
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 border border-gray-700 rounded-xl max-w-2xl w-full mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-semibold text-white">Generate DSL UI</h2>
            <span className="text-[10px] text-zinc-500 font-mono">{skill.id}</span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-300 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Progress steps */}
        <div className="flex items-center gap-2 px-5 py-3 bg-gray-950/50 border-b border-gray-800">
          {STAGES.map((s, i) => {
            const stageKeys = STAGES.map(x => x.key);
            const currentIdx = stageKeys.indexOf(stage);
            const thisIdx = i;
            const isDone = thisIdx < currentIdx;
            const isActive = thisIdx === currentIdx;
            const Icon = s.icon;

            return (
              <div key={s.key} className="flex items-center gap-1.5">
                {i > 0 && <ChevronRight className="w-3 h-3 text-gray-700" />}
                <div className={`flex items-center gap-1 ${isActive ? 'text-amber-400' : isDone ? 'text-emerald-400' : 'text-gray-500'}`}>
                  {stage === 'sending' && isActive ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Icon className="w-3 h-3" />
                  )}
                  <span className="text-[10px] font-medium">{s.label}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Body */}
        <div className="px-5 py-4 space-y-4">
          {/* Skill info */}
          <div className="bg-gray-950/50 rounded-lg p-3 border border-gray-800">
            <span className="text-[10px] text-amber-400 font-medium">Skill</span>
            <p className="text-xs text-white font-medium mt-0.5">{skill.name}</p>
            <p className="text-[10px] text-gray-500 mt-0.5 line-clamp-2">
              {skill.description || 'No description'}
            </p>
          </div>

          {/* Terminal picker */}
          <div>
            <label className="text-[10px] font-medium text-gray-400 mb-1.5 block">
              Target Terminal <span className="text-red-400">*</span>
            </label>
            {availableTerminals.length === 0 ? (
              <p className="text-[10px] text-red-400">No terminals available — open a terminal first</p>
            ) : (
              <select
                value={selectedTerminal}
                onChange={(e) => setSelectedTerminal(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-amber-500/50"
              >
                <option value="">Select a terminal...</option>
                {availableTerminals.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.id.substring(0, 20)}{t.id.length > 20 ? '...' : ''}
                    {t.agent ? ` — ${t.agent}` : ''}
                    {t.topic ? ` — ${t.topic.substring(0, 30)}` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Custom instructions */}
          <div>
            <label className="text-[10px] font-medium text-gray-400 mb-1.5 block">
              Custom Instructions <span className="text-gray-600">(optional)</span>
            </label>
            <textarea
              value={customInstructions}
              onChange={(e) => setCustomInstructions(e.target.value)}
              placeholder="e.g. Add a 'Style' enum input with minimal/standard/detailed choices, group output settings together..."
              rows={3}
              className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-[11px] text-gray-300 placeholder-gray-600 focus:outline-none focus:border-amber-500/50 resize-none"
            />
          </div>

          {/* Prompt preview (collapsible) */}
          <details className="group">
            <summary className="text-[10px] text-gray-600 cursor-pointer hover:text-gray-400 transition-colors">
              Preview prompt →
            </summary>
            <pre className="mt-1.5 text-[9px] text-gray-500 bg-gray-950 rounded-lg p-2.5 max-h-32 overflow-y-auto whitespace-pre-wrap font-mono border border-gray-800">
              {buildPrompt()}
            </pre>
          </details>

          {/* Error */}
          {error && (
            <div className="bg-red-500/20 text-red-300 border border-red-500/30 rounded-lg px-3 py-2 text-[10px]">
              {error}
            </div>
          )}

          {/* Done state */}
          {stage === 'done' && (
            <div className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-lg px-3 py-2.5 text-[10px]">
              <span className="font-medium">Prompt sent!</span> The terminal agent will read the DSL guide,
              analyze the skill, and update the SKILL.md file. Check the terminal for progress.
              Skills list will refresh automatically.
            </div>
          )}
        </div>

        {/* ── Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-gray-800">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded text-[10px] text-gray-400 hover:text-gray-200 transition-colors"
          >
            {stage === 'done' ? 'Close' : 'Cancel'}
          </button>
          {stage === 'compose' && (
            <button
              onClick={handleSend}
              disabled={!selectedTerminal || availableTerminals.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[10px] font-medium bg-amber-600 hover:bg-amber-700 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Send className="w-3 h-3" />
              Send to Terminal Agent
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
