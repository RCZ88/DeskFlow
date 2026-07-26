import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ImageIcon, AlertTriangle, Loader2, ExternalLink } from 'lucide-react';

const api = (window as any).deskflowAPI;

interface ImageGenSettings {
  enabled: boolean;
  providerId: string;
  model: string;
  costWarning: boolean;
}

interface AiProvider {
  id: string;
  label: string;
  models: string[];
  enabled: boolean;
  apiKey?: string;
  baseUrl?: string;
}

// Providers that support image generation
const IMAGE_GEN_PROVIDER_IDS = new Set([
  'openai', 'openrouter', 'stability', 'replicate', 'together', 'fireworks',
]);

// Known image models per provider
const KNOWN_IMAGE_MODELS: Record<string, { id: string; name: string; cost: string }[]> = {
  openai: [
    { id: 'dall-e-3', name: 'DALL-E 3', cost: '~$0.04-0.12/image' },
    { id: 'dall-e-2', name: 'DALL-E 2', cost: '~$0.02/image' },
    { id: 'gpt-image-1', name: 'GPT Image 1', cost: '~$0.02-0.19/image' },
  ],
  stability: [
    { id: 'stable-diffusion-xl-1024-v1-0', name: 'Stable Diffusion XL', cost: '~$0.002/image' },
    { id: 'stable-image-core-v1', name: 'Stable Image Core', cost: '~$0.03/image' },
  ],
  replicate: [
    { id: 'black-forest-labs/flux-schnell', name: 'Flux Schnell', cost: '~$0.003/image' },
    { id: 'black-forest-labs/flux-dev', name: 'Flux Dev', cost: '~$0.025/image' },
  ],
};

export function ImageGenSettings() {
  const [settings, setSettings] = useState<ImageGenSettings>({ enabled: false, providerId: '', model: '', costWarning: true });
  const [providers, setProviders] = useState<AiProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [settingsResult, providersResult] = await Promise.all([
          api.learnGetImageGenSettings(),
          api.getAiProviders?.() || Promise.resolve({ providers: [] }),
        ]);
        if (settingsResult.ok) setSettings(settingsResult.data);
        if (providersResult?.providers) {
          setProviders(providersResult.providers.filter((p: AiProvider) => p.enabled && p.apiKey));
        }
      } catch { /* ignore */ }
      setLoading(false);
    };
    load();
  }, []);

  const update = async (patch: Partial<ImageGenSettings>) => {
    const updated = { ...settings, ...patch };
    setSettings(updated);
    setSaving(true);
    try {
      await api.learnSetImageGenSettings(patch);
    } catch { /* ignore */ }
    setSaving(false);
  };

  // Get available image gen providers (configured + have API key)
  const imageProviders = providers.filter(p => {
    const id = p.id.toLowerCase();
    return IMAGE_GEN_PROVIDER_IDS.has(id) || 
           p.models.some(m => m.includes('dall') || m.includes('flux') || m.includes('stable') || m.includes('image'));
  });

  // Get models for selected provider
  const selectedProvider = providers.find(p => p.id === settings.providerId);
  const providerModels = selectedProvider ? getModelsForProvider(selectedProvider) : [];

  function getModelsForProvider(provider: AiProvider): { id: string; name: string; cost: string }[] {
    const id = provider.id.toLowerCase();
    
    // Check known models first
    if (KNOWN_IMAGE_MODELS[id]) return KNOWN_IMAGE_MODELS[id];
    
    // Filter provider's models to image-capable ones
    return provider.models
      .filter(m => m.includes('dall') || m.includes('flux') || m.includes('stable') || m.includes('image'))
      .map(m => ({ id: m, name: m, cost: 'Check provider pricing' }));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-4 h-4 text-clay-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ImageIcon className="w-4 h-4 text-amber-400" />
          <h3 className="font-serif text-sm font-semibold text-glow">AI Illustrations</h3>
        </div>
        <button
          onClick={() => update({ enabled: !settings.enabled })}
          className={`relative w-11 h-6 rounded-full transition-colors ${
            settings.enabled ? 'bg-amber-500' : 'bg-zinc-700'
          }`}
        >
          <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
            settings.enabled ? 'left-6' : 'left-1'
          }`} />
        </button>
      </div>

      <p className="text-xs text-zinc-500">
        Generate hand-drawn illustrations for your lessons using AI image models.
      </p>

      {settings.enabled && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="space-y-4"
        >
          {/* Cost Warning */}
          {settings.costWarning && (
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
              <div className="text-xs text-amber-300">
                <p className="font-medium">Token cost warning</p>
                <p className="text-amber-400/70 mt-0.5">
                  Image generation uses separate API calls that cost additional credits beyond your text model.
                  Each lesson may generate 4-8 images.
                </p>
              </div>
            </div>
          )}

          {imageProviders.length === 0 ? (
            <div className="px-3 py-4 rounded-lg bg-zinc-800/40 border border-zinc-700/30 text-center">
              <p className="text-xs text-zinc-400 mb-2">No image generation providers configured.</p>
              <p className="text-[10px] text-zinc-600">
                Go to <span className="text-clay-400">Settings → AI Providers</span> and add a provider with an API key
                (OpenAI, Stability AI, Replicate, etc.) that supports image generation.
              </p>
            </div>
          ) : (
            <>
              {/* Provider Selection */}
              <div>
                <label className="text-xs font-medium text-zinc-400 mb-2 block">Provider</label>
                <div className="grid grid-cols-1 gap-2">
                  {imageProviders.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => update({ providerId: p.id, model: '' })}
                      className={`flex items-center justify-between px-3 py-2.5 rounded-lg border text-left transition-all ${
                        settings.providerId === p.id
                          ? 'border-amber-500/40 bg-amber-500/10'
                          : 'border-white/10 bg-[#1c1917]/40 hover:bg-[#1c1917]/60'
                      }`}
                    >
                      <div>
                        <p className="text-xs font-medium text-zinc-200">{p.label}</p>
                        <p className="text-[10px] text-zinc-500">{p.models.length} models available</p>
                      </div>
                      {settings.providerId === p.id && (
                        <span className="text-[10px] text-amber-400">Selected</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Model Selection */}
              {selectedProvider && providerModels.length > 0 && (
                <div>
                  <label className="text-xs font-medium text-zinc-400 mb-2 block">Image Model</label>
                  <div className="grid grid-cols-1 gap-2">
                    {providerModels.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => update({ model: m.id })}
                        className={`flex items-center justify-between px-3 py-2.5 rounded-lg border text-left transition-all ${
                          settings.model === m.id
                            ? 'border-amber-500/40 bg-amber-500/10'
                            : 'border-white/10 bg-[#1c1917]/40 hover:bg-[#1c1917]/60'
                        }`}
                      >
                        <div>
                          <p className="text-xs font-medium text-zinc-200">{m.name}</p>
                          <p className="text-[10px] text-zinc-500">{m.id}</p>
                        </div>
                        <span className="text-[10px] text-zinc-500">{m.cost}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {selectedProvider && providerModels.length === 0 && (
                <div className="px-3 py-3 rounded-lg bg-zinc-800/40 border border-zinc-700/30">
                  <p className="text-xs text-zinc-400">
                    No image models found for {selectedProvider.label}. 
                    Add image-capable models to this provider in Settings → AI Providers.
                  </p>
                </div>
              )}
            </>
          )}

          <p className="text-[10px] text-zinc-600 italic">
            Configure providers and API keys in Settings → AI Providers.
          </p>
        </motion.div>
      )}

      {saving && (
        <div className="flex items-center gap-1.5 text-[10px] text-zinc-500">
          <Loader2 className="w-3 h-3 animate-spin" />
          Saving...
        </div>
      )}
    </div>
  );
}
