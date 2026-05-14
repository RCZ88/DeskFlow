import { useState, useEffect } from 'react';
import { Send, X, FileText, Folder } from 'lucide-react';

interface Problem {
  id: string;
  title: string;
  status: string;
  priority: string;
  user_notes?: string;
  files: string[];
}

interface Request {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
}

interface Skill {
  id: string;
  name: string;
  description: string;
  content?: string;
}

interface InstructionConfig {
  problems: string[];
  requests: string[];
  skill?: string;
  instruction: string;
  prompt: string;
}

interface InstructionPanelProps {
  problems: Problem[];
  requests: Request[];
  onSend: (config: InstructionConfig) => void;
  onClose: () => void;
  isSending?: boolean;
  projectPath?: string;
}

export function InstructionPanel({
  problems,
  requests,
  onSend,
  onClose,
  isSending,
  projectPath,
}: InstructionPanelProps) {
  const [selectedProblems, setSelectedProblems] = useState<string[]>([]);
  const [selectedRequests, setSelectedRequests] = useState<string[]>([]);
  const [selectedSkill, setSelectedSkill] = useState<string>();
  const [customInstruction, setCustomInstruction] = useState('');
  const [skills, setSkills] = useState<Skill[]>([]);
  const [agentFiles, setAgentFiles] = useState<{ name: string; path: string }[]>([]);
  const [selectedAgentFiles, setSelectedAgentFiles] = useState<string[]>([]);
  const [showFilePicker, setShowFilePicker] = useState(false);
  const [agentFileContents, setAgentFileContents] = useState<Record<string, string>>({});

  useEffect(() => {
    window.deskflowAPI?.getSkills?.().then(result => {
      if (result?.success) setSkills(result.data || []);
    });
  }, []);

  useEffect(() => {
    if (!projectPath || !window.deskflowAPI) return;
    (window as any).deskflowAPI.listAgentDirFiles?.(projectPath).then((result: any) => {
      if (result?.success) setAgentFiles(result.data || []);
    });
  }, [projectPath]);

  const loadAgentFileContent = async (filename: string) => {
    if (!projectPath || agentFileContents[filename]) return;
    try {
      const result = await (window as any).deskflowAPI.readAgentFileContent?.(filename, projectPath);
      if (result?.success && result.data) {
        setAgentFileContents(prev => ({ ...prev, [filename]: result.data }));
      }
    } catch {}
  };

  const generatePrompt = (): string => {
    const parts: string[] = [];

    if (selectedSkill) {
      const skill = skills.find(s => s.id === selectedSkill);
      if (skill) {
        parts.push(`## Skill: ${skill.name}\n${skill.description ? `> ${skill.description}\n` : ''}`);
        if (skill.content) parts.push(`${skill.content}\n`);
      }
    }

    if (selectedProblems.length > 0) {
      const lines: string[] = ['## Problems to Address\n'];
      for (const id of selectedProblems) {
        const p = problems.find(x => x.id === id);
        if (p) {
          lines.push(`### ${p.id}: ${p.title}`);
          lines.push(`Status: ${p.status}`);
          if (p.user_notes) lines.push(`User notes: "${p.user_notes}"`);
          if (p.files.length > 0) lines.push(`Files: ${p.files.join(', ')}`);
          lines.push('');
        }
      }
      parts.push(lines.join('\n'));
    }

    if (selectedRequests.length > 0) {
      const lines: string[] = ['## Requests to Implement\n'];
      for (const id of selectedRequests) {
        const r = requests.find(x => x.id === id);
        if (r) {
          lines.push(`### ${r.id}: ${r.title}`);
          lines.push(`Priority: ${r.priority}`);
          if (r.description) lines.push(`Description: ${r.description}`);
          lines.push('');
        }
      }
      parts.push(lines.join('\n'));
    }

    if (selectedAgentFiles.length > 0) {
      const fileParts: string[] = [];
      for (const name of selectedAgentFiles) {
        const content = agentFileContents[name];
        if (content) {
          fileParts.push(`## Agent File: ${name}\n\n\`\`\`\n${content}\n\`\`\``);
        }
      }
      if (fileParts.length > 0) parts.push(fileParts.join('\n\n'));
    }

    if (customInstruction.trim()) {
      parts.push(`## Instructions\n\n${customInstruction.trim()}`);
    }

    return parts.join('\n---\n\n');
  };

  const activeProblems = problems.filter(p => p.status !== 'Fixed' && p.status !== 'Irrelevant');
  const activeRequests = requests.filter(r => r.status !== 'Completed' && r.status !== 'Cancelled');

  const hasSelection = selectedProblems.length > 0 || selectedRequests.length > 0 || !!customInstruction;

  return (
    <div className="px-4 py-3 bg-gradient-to-r from-zinc-800/95 to-zinc-900/90 border-b border-zinc-700/60 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-medium text-zinc-300">Compose Instruction</h3>
        <button
          onClick={onClose}
          className="p-1 hover:bg-zinc-700 rounded text-zinc-500 hover:text-zinc-300"
        >
          <X className="w-3 h-3" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">Problems</label>
          <div className="mt-1 max-h-24 overflow-y-auto space-y-0.5 bg-zinc-900/50 rounded p-1">
            {activeProblems.length === 0 ? (
              <div className="text-[10px] text-zinc-600 px-1 py-2 text-center">No open problems</div>
            ) : activeProblems.map(p => (
              <label
                key={p.id}
                className={`flex items-center gap-1.5 px-1.5 py-1 rounded cursor-pointer text-[10px] transition-colors ${
                  selectedProblems.includes(p.id)
                    ? 'bg-green-600/20 text-green-300'
                    : 'hover:bg-zinc-800 text-zinc-400'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedProblems.includes(p.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedProblems([...selectedProblems, p.id]);
                    } else {
                      setSelectedProblems(selectedProblems.filter(x => x !== p.id));
                    }
                  }}
                  className="accent-green-500"
                />
                <span className="truncate">{p.id}: {p.title}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">Requests</label>
          <div className="mt-1 max-h-24 overflow-y-auto space-y-0.5 bg-zinc-900/50 rounded p-1">
            {activeRequests.length === 0 ? (
              <div className="text-[10px] text-zinc-600 px-1 py-2 text-center">No open requests</div>
            ) : activeRequests.map(r => (
              <label
                key={r.id}
                className={`flex items-center gap-1.5 px-1.5 py-1 rounded cursor-pointer text-[10px] transition-colors ${
                  selectedRequests.includes(r.id)
                    ? 'bg-blue-600/20 text-blue-300'
                    : 'hover:bg-zinc-800 text-zinc-400'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedRequests.includes(r.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedRequests([...selectedRequests, r.id]);
                    } else {
                      setSelectedRequests(selectedRequests.filter(x => x !== r.id));
                    }
                  }}
                  className="accent-blue-500"
                />
                <span className="truncate">{r.id}: {r.title}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-3 mb-3">
        <div className="flex-1">
          <label className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">Skill</label>
          <select
            value={selectedSkill || ''}
            onChange={(e) => setSelectedSkill(e.target.value || undefined)}
            className="w-full mt-1 bg-zinc-900 border border-zinc-700 rounded px-2 py-1.5 text-xs text-zinc-300"
          >
            <option value="">No skill (custom instruction)</option>
            {skills.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        <div className="flex-1">
          <label className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">Instruction</label>
          <textarea
            value={customInstruction}
            onChange={(e) => setCustomInstruction(e.target.value)}
            className="w-full mt-1 bg-zinc-900 border border-zinc-700 rounded px-2 py-1.5 text-xs text-zinc-300 h-12 resize-none"
            placeholder="Additional instructions..."
          />
        </div>
      </div>

      {/* Agent Files Picker */}
      {projectPath && agentFiles.length > 0 && (
        <div className="mb-3">
          <button
            onClick={() => setShowFilePicker(!showFilePicker)}
            className="flex items-center gap-1 text-[10px] font-medium text-zinc-500 uppercase tracking-wider hover:text-zinc-300 transition-colors"
          >
            <Folder className="w-3 h-3" />
            Agent Files ({selectedAgentFiles.length} selected)
          </button>
          {showFilePicker && (
            <div className="mt-1 max-h-28 overflow-y-auto space-y-0.5 bg-zinc-900/50 rounded p-1">
              {agentFiles.map((f) => (
                <label key={f.path} className="flex items-center gap-1.5 px-1.5 py-1 rounded cursor-pointer text-[10px] transition-colors hover:bg-zinc-800 text-zinc-400">
                  <input
                    type="checkbox"
                    checked={selectedAgentFiles.includes(f.name)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedAgentFiles([...selectedAgentFiles, f.name]);
                        loadAgentFileContent(f.name);
                      } else {
                        setSelectedAgentFiles(selectedAgentFiles.filter(x => x !== f.name));
                      }
                    }}
                    className="accent-amber-500"
                  />
                  <FileText className="w-2.5 h-2.5 text-zinc-500" />
                  <span className="truncate">{f.name}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      )}

      {hasSelection && (
        <div className="mb-3 bg-zinc-900 rounded p-2 border border-zinc-800">
          <div className="text-[9px] text-zinc-600 mb-1 uppercase tracking-wider">Prompt Preview</div>
          <pre className="text-[10px] text-zinc-400 font-mono whitespace-pre-wrap max-h-24 overflow-y-auto">
            {generatePrompt() || 'Select items above to build a prompt...'}
          </pre>
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={() => onSend({
            problems: selectedProblems,
            requests: selectedRequests,
            skill: selectedSkill,
            instruction: customInstruction,
            prompt: generatePrompt()
          })}
          disabled={!hasSelection || isSending}
          className="flex-1 px-3 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:from-zinc-700 disabled:to-zinc-700 disabled:text-zinc-500 text-white text-xs rounded flex items-center justify-center gap-1 transition-all"
        >
          {isSending ? (
            <span className="animate-spin inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full" />
          ) : (
            <Send className="w-3 h-3" />
          )}
          {isSending ? 'Sending...' : 'Send to Terminal'}
        </button>
      </div>
    </div>
  );
}

export default InstructionPanel;
