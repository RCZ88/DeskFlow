import { CanonicalRequest, CanonicalResponse, ResolvedProvider, AiProvidersState, ProviderConfig } from './types';
import { PROVIDER_TEMPLATES } from './templates';
import { callProvider } from './callProvider';

export function buildChain(
  state: AiProvidersState,
  feature: 'researchDigest' | 'goalAssistant',
): Array<{ provider: ResolvedProvider; model: string }> {
  const enabled = state.providers.filter(p => p.enabled);
  const assigned = state.routing[feature] ?? state.routing.default;

  const resolve = (cfg: ProviderConfig): ResolvedProvider | null => {
    const template = PROVIDER_TEMPLATES[cfg.templateId];
    if (!template) return null;
    return { config: cfg, template };
  };

  const chain: Array<{ provider: ResolvedProvider; model: string }> = [];
  const primaryCfg = enabled.find(p => p.id === assigned.providerId);
  if (primaryCfg) {
    const p = resolve(primaryCfg);
    if (p) chain.push({ provider: p, model: assigned.model });
  }

  enabled
    .sort((a, b) => a.priority - b.priority)
    .filter(p => p.id !== assigned.providerId)
    .forEach(p => {
      const r = resolve(p);
      if (r) chain.push({ provider: r, model: p.models[0] ?? assigned.model });
    });

  return chain;
}

async function callWithTokenTiers(
  provider: ResolvedProvider,
  req: CanonicalRequest,
): Promise<CanonicalResponse> {
  const cfg = provider.config;

  if (cfg.monthlyTokenBudget && (cfg.tokensUsedThisMonth ?? 0) >= cfg.monthlyTokenBudget) {
    const e = new Error(`Budget exhausted for ${cfg.label}`);
    (e as any).status = 402;
    throw e;
  }

  const tiers = [req.maxTokens ?? 200, 100, 50, 40];
  let lastErr: any;

  for (const maxTokens of tiers) {
    try {
      const res = await callProvider(provider, { ...req, maxTokens });
      const used = (res.usage?.prompt_tokens ?? 0) + (res.usage?.completion_tokens ?? 0);
      cfg.tokensUsedThisMonth = (cfg.tokensUsedThisMonth ?? 0) + used;
      return res;
    } catch (err: any) {
      lastErr = err;
      if (err.status !== 402) throw err;
    }
  }

  throw lastErr;
}

export async function runWithFallback(
  chain: ReturnType<typeof buildChain>,
  req: Omit<CanonicalRequest, 'model'>,
): Promise<{ result: CanonicalResponse; usedProviderId: string }> {
  let lastErr: any;
  for (const link of chain) {
    try {
      const result = await callWithTokenTiers(link.provider, { ...req, model: link.model });
      return { result, usedProviderId: link.provider.config.id };
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr ?? new Error('No providers available');
}
