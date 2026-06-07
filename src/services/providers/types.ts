export interface ProviderTemplate {
  id: string;
  label: string;
  defaultBaseUrl: string;
  auth: { type: 'bearer' | 'header' | 'query'; headerName?: string; queryParam?: string };
  staticHeaders?: Record<string, string>;
  buildBody?: (req: CanonicalRequest) => unknown;
  parseResponse?: (raw: any) => CanonicalResponse;
  suggestedModels?: string[];
  docsUrl?: string;
}

export interface CanonicalRequest {
  model: string;
  systemPrompt: string;
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  maxTokens?: number;
  temperature?: number;
}

export interface CanonicalResponse {
  content: string;
  usage?: { prompt_tokens: number; completion_tokens: number };
}

export interface ResolvedProvider {
  config: ProviderConfig;
  template: ProviderTemplate;
}

export interface ProviderConfig {
  id: string;
  templateId: string;
  label: string;
  enabled: boolean;
  apiKey?: string;
  baseUrl?: string;
  models: string[];
  priority: number;
  monthlyTokenBudget?: number;
  tokensUsedThisMonth?: number;
  budgetResetDate?: string;
}

export interface AiProvidersState {
  providers: ProviderConfig[];
  routing: {
    default: { providerId: string; model: string };
    researchDigest?: { providerId: string; model: string } | null;
    goalAssistant?: { providerId: string; model: string } | null;
  };
}
