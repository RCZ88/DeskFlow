import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Key, CheckCircle, XCircle, Loader2, Wifi } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';

interface AiSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (settings: AiProviderConfig) => void;
}

export interface AiProviderConfig {
  provider: 'openai' | 'anthropic' | 'ollama';
  apiKey: string;
  model: string;
  temperature: number;
  baseUrl?: string;
}

const providers = [
  { id: 'openai' as const, name: 'OpenAI', models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'] },
  { id: 'anthropic' as const, name: 'Anthropic', models: ['claude-sonnet-4-20250514', 'claude-3-5-haiku-20241022', 'claude-3-opus-20240229'] },
  { id: 'ollama' as const, name: 'Local (Ollama)', models: ['llama3', 'mistral', 'codellama', 'phi3'] },
];

export function AiSettings({ isOpen, onClose, onSave }: AiSettingsProps) {
  const [config, setConfig] = useState<AiProviderConfig>({
    provider: 'openai',
    apiKey: '',
    model: 'gpt-4o',
    temperature: 0.3,
  });
  const [showApiKey, setShowApiKey] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'failed'>('idle');
  const [testMessage, setTestMessage] = useState('');

  useEffect(() => {
    if (isOpen) {
      try {
        const saved = localStorage.getItem('resume-ai-settings');
        if (saved) setConfig(JSON.parse(saved));
      } catch { /* ignore */ }
    }
  }, [isOpen]);

  const selectedProvider = providers.find(p => p.id === config.provider);

  const handleTest = async () => {
    setTestStatus('testing');
    setTestMessage('');
    try {
      const result = await (window as any).deskflowAPI?.resume?.testAiConnection?.(config);
      if (result?.success) {
        setTestStatus('success');
        setTestMessage(result.message || 'Connected');
      } else {
        setTestStatus('failed');
        setTestMessage(result?.error || 'Connection failed');
      }
    } catch (e: any) {
      setTestStatus('failed');
      setTestMessage(e.message || 'Connection failed');
    }
  };

  const handleSave = () => {
    try {
      localStorage.setItem('resume-ai-settings', JSON.stringify(config));
    } catch { /* ignore */ }
    onSave(config);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="relative bg-gradient-to-br from-zinc-900/95 to-zinc-800/90 backdrop-blur-xl border border-zinc-700/50 rounded-xl p-5 w-full max-w-md shadow-2xl shadow-black/40 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top accent */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[var(--page-accent)]/40 to-transparent" />

            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-[var(--page-accent)]/15 flex items-center justify-center ring-1 ring-[var(--page-accent)]/20">
                  <Wifi className="w-5 h-5 text-[var(--page-accent)]" />
                </div>
                <h3 className="text-sm font-semibold text-white">AI Provider Settings</h3>
              </div>
              <button onClick={onClose} className="text-zinc-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-zinc-800/50">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Provider Selector */}
              <div>
                <label className="text-xs font-medium text-zinc-400 mb-2 block">Provider</label>
                <div className="grid grid-cols-3 gap-2">
                  {providers.map((p) => (
                    <motion.button
                      key={p.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setConfig({ ...config, provider: p.id, model: p.models[0] })}
                      className={`p-3 rounded-xl ring-1 text-center transition-all duration-150 ${
                        config.provider === p.id
                          ? 'ring-[var(--page-accent)]/40 bg-[var(--page-accent)]/10 text-[var(--page-accent)]'
                          : 'ring-zinc-700/50 text-zinc-400 hover:ring-zinc-600/50 hover:bg-zinc-800/30'
                      }`}
                    >
                      <p className="text-xs font-semibold">{p.name}</p>
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* API Key */}
              {config.provider !== 'ollama' && (
                <div className="space-y-2">
                  <label className="text-xs font-medium text-zinc-400">API Key</label>
                  <div className="relative">
                    <Input
                      type={showApiKey ? 'text' : 'password'}
                      value={config.apiKey}
                      onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                      placeholder="sk-..."
                      className="pr-10 rounded-xl bg-gradient-to-br from-zinc-900/80 to-zinc-800/40"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                    >
                      <Key className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* Base URL for Ollama */}
              {config.provider === 'ollama' && (
                <div className="space-y-2">
                  <label className="text-xs font-medium text-zinc-400">Base URL</label>
                  <Input
                    value={config.baseUrl || 'http://localhost:11434/v1'}
                    onChange={(e) => setConfig({ ...config, baseUrl: e.target.value })}
                    placeholder="http://localhost:11434/v1"
                    className="rounded-xl bg-gradient-to-br from-zinc-900/80 to-zinc-800/40"
                  />
                </div>
              )}

              {/* Model Selector */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-zinc-400">Model</label>
                <select
                  value={config.model}
                  onChange={(e) => setConfig({ ...config, model: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-gradient-to-br from-zinc-900/80 to-zinc-800/40 ring-1 ring-zinc-700/50 text-sm text-white outline-none focus:ring-[var(--page-accent)]/50 focus:ring-2 transition-all duration-150 appearance-none"
                >
                  {selectedProvider?.models.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              {/* Temperature */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-zinc-400">Temperature</label>
                  <span className="text-xs text-zinc-500 tabular-nums">{config.temperature.toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.1}
                  value={config.temperature}
                  onChange={(e) => setConfig({ ...config, temperature: parseFloat(e.target.value) })}
                  className="w-full h-1.5 rounded-full bg-zinc-700 appearance-none cursor-pointer accent-[var(--page-accent)]"
                />
                <div className="flex justify-between text-[10px] text-zinc-500">
                  <span>Precise</span>
                  <span>Creative</span>
                </div>
              </div>

              {/* Test Connection */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleTest}
                  disabled={testStatus === 'testing' || (config.provider !== 'ollama' && !config.apiKey)}
                  className="flex-1"
                >
                  {testStatus === 'testing' ? (
                    <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Testing...</>
                  ) : testStatus === 'success' ? (
                    <><CheckCircle className="w-3.5 h-3.5 mr-1.5 text-emerald-400" /> Connected</>
                  ) : testStatus === 'failed' ? (
                    <><XCircle className="w-3.5 h-3.5 mr-1.5 text-red-400" /> Failed</>
                  ) : (
                    'Test Connection'
                  )}
                </Button>
                {testMessage && (
                  <span className={`text-[10px] ${testStatus === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>
                    {testMessage}
                  </span>
                )}
              </div>

              {/* Save */}
              <Button onClick={handleSave} className="w-full" size="lg">
                Save Settings
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
