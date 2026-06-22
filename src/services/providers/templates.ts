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
  cloudflare: {
    id: 'cloudflare',
    label: 'Cloudflare',
    defaultBaseUrl: 'https://api.cloudflare.com/client/v4/accounts/{account_id}/ai/v1/chat/completions',
    auth: { type: 'bearer' },
    staticHeaders: { 'Content-Type': 'application/json' },
    suggestedModels: ['@cf/meta/llama-3.1-8b-instruct', '@cf/mistral/mistral-7b-instruct-v0.1'],
    docsUrl: 'https://developers.cloudflare.com/workers-ai/',
  },
  ollama: {
    id: 'ollama',
    label: 'Ollama',
    defaultBaseUrl: 'http://localhost:11434/v1/chat/completions',
    auth: { type: 'bearer' },
    suggestedModels: ['llama3.1', 'qwen2.5'],
  },
  github: {
    id: 'github',
    label: 'GitHub Models',
    defaultBaseUrl: 'https://models.inference.ai.azure.com/chat/completions',
    auth: { type: 'bearer' },
    staticHeaders: { 'Accept': 'application/json' },
    suggestedModels: ['gpt-4o-mini', 'gpt-4o', 'DeepSeek-V3', 'Mistral-large', 'Llama-3.1-70B'],
    docsUrl: 'https://docs.github.com/github-models',
  },
  gemini: {
    id: 'gemini',
    label: 'Google Gemini',
    defaultBaseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
    auth: { type: 'query', queryParam: 'key' },
    suggestedModels: ['gemini-2.0-flash', 'gemini-2.0-flash-lite'],
    docsUrl: 'https://ai.google.dev/gemini-api/docs/openai',
  },
  custom: {
    id: 'custom',
    label: 'Custom (OpenAI-compatible)',
    defaultBaseUrl: '',
    auth: { type: 'bearer' },
    suggestedModels: [],
  },
};
