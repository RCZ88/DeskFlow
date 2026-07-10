import React, { useState, useEffect, useCallback } from 'react';
import { Shield, Loader2, Bot, FolderOpen, Globe, FileEdit } from 'lucide-react';
import type { LearnPermission } from '../../shared/learn/types';

interface Props {
  getPermissions: () => Promise<LearnPermission[]>;
  setPermission: (key: string, level: string) => Promise<void>;
}

const PERM_META: Record<string, { label: string; icon: React.ReactNode; desc: string }> = {
  ai_provider: {
    label: 'AI Provider',
    icon: <Bot className="w-3.5 h-3.5" />,
    desc: 'Allow AI to generate answers and explanations',
  },
  file_system: {
    label: 'File System',
    icon: <FolderOpen className="w-3.5 h-3.5" />,
    desc: 'Allow AI to read/write files in the workspace',
  },
  network: {
    label: 'Network',
    icon: <Globe className="w-3.5 h-3.5" />,
    desc: 'Allow AI to make network requests',
  },
  node_edit: {
    label: 'Node Edit',
    icon: <FileEdit className="w-3.5 h-3.5" />,
    desc: 'Allow AI to propose edits to this lesson',
  },
};

const LEVELS = [
  { value: 'always', label: 'Always', color: 'text-emerald-400' },
  { value: 'ask', label: 'Ask First', color: 'text-amber-400' },
  { value: 'never', label: 'Never', color: 'text-red-400' },
];

export function PermissionSettings({ getPermissions, setPermission }: Props) {
  const [perms, setPerms] = useState<LearnPermission[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try { setPerms(await getPermissions()); } catch { /* ignore */ }
    setLoading(false);
  }, [getPermissions]);

  useEffect(() => { load(); }, [load]);

  const handleChange = async (key: string, level: string) => {
    await setPermission(key, level);
    setPerms(prev => prev.map(p => p.permission_key === key ? { ...p, level: level as LearnPermission['level'] } : p));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-4 h-4 text-zinc-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 px-4 pt-4 pb-2">
        <Shield className="w-4 h-4 text-amber-400" />
        <span className="text-sm font-medium text-zinc-200">Permissions</span>
      </div>
      {perms.map((perm) => {
        const meta = PERM_META[perm.permission_key];
        if (!meta) return null;
        return (
          <div key={perm.id} className="px-4 py-2.5 hover:bg-zinc-800/30 transition">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-zinc-400 shrink-0">{meta.icon}</span>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-zinc-300">{meta.label}</p>
                  <p className="text-[10px] text-zinc-600 truncate">{meta.desc}</p>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0 ml-3">
                {LEVELS.map((l) => (
                  <button
                    key={l.value}
                    onClick={() => handleChange(perm.permission_key, l.value)}
                    className={`px-2 py-1 rounded text-[10px] font-medium transition border ${
                      perm.level === l.value
                        ? `${l.color} border-current bg-current/10`
                        : 'text-zinc-600 border-transparent hover:text-zinc-400'
                    }`}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
