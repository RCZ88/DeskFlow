import type { ProviderTemplate } from './types';

export const PROVIDER_TEMPLATES: Record<string, ProviderTemplate> = {
  openrouter: {
    id: 'openrouter',
    label: 'OpenRouter',
    defaultBaseUrl: 'https://openrouter.ai/api/v1/chat/completions',
    auth: { type: 'bearer' },
    staticHeaders: { 'HTTP-Referer': 'https://deskflow.app', 'X-Title': 'DeskFlow' },
    suggestedModels: ['google/gemini-2.0-flash-001', 'deepseek/deepseek-chat-v3-0324'],
    docsUrl: 'https://openrouter.ai/docs',
  },
  cloudflayer: {
    id: 'cloudflayer',
    label: 'CloudFlayer',
    defaultBaseUrl: 'https://api.cloudflayer.ai/v1/chat/completions',
    auth: { type: 'bearer' },
    suggestedModels: [],
  },
  invilier: {
    id: 'invilier',
    label: 'Invilier',
    defaultBaseUrl: 'https://api.invilier.com/v1/chat/completions',
    auth: { type: 'bearer' },
    suggestedModels: [],
  },
  olamah: {
    id: 'olamah',
    label: 'Olamah',
    defaultBaseUrl: 'http://localhost:11434/v1/chat/completions',
    auth: { type: 'bearer' },
    suggestedModels: ['llama3.1', 'qwen2.5'],
  },
  custom: {
    id: 'custom',
    label: 'Custom (OpenAI-compatible)',
    defaultBaseUrl: '',
    auth: { type: 'bearer' },
    suggestedModels: [],
  },
};
