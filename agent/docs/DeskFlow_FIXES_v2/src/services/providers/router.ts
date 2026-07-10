import { CanonicalRequest, CanonicalResponse, ResolvedProvider, AiProvidersState, ProviderConfig } from './types';
import { PROVIDER_TEMPLATES } from './templates';
import { callProvider } from './callProvider';

export function buildChain(
  state: AiProvidersState,
  feature: 'researchDigest' | 'goalAssistant',
): Array<{ provider: ResolvedProvider; model: string }> {
  const enabled = state.providers.filter(p => p.enabled);
  const assigned = state.routing[feature] ?? state.routing.default;

  console.log(`[PROV] buildChain feature=${feature} enabled=${enabled.length} assigned=${JSON.stringify(assigned)}`);

  const resolve = (cfg: ProviderConfig): ResolvedProvider | null => {
    const template = PROVIDER_TEMPLATES[cfg.templateId];
    if (!template) {
      console.log(`[PROV] buildChain: no template for ${cfg.id} templateId=${cfg.templateId}`);
      return null;
    }
    return { config: cfg, template };
  };

  const chain: Array<{ provider: ResolvedProvider; model: string }> = [];
  const primaryCfg = enabled.find(p => p.id === assigned.providerId);
  if (primaryCfg) {
    console.log(`[PROV] buildChain: primary = ${primaryCfg.id} (${primaryCfg.templateId}) model=${assigned.model}`);
    const p = resolve(primaryCfg);
    if (p) chain.push({ provider: p, model: assigned.model });
  } else {
    console.log(`[PROV] buildChain: no primary found for providerId=${assigned.providerId}`);
  }

  enabled
    .sort((a, b) => a.priority - b.priority)
    .filter(p => p.id !== assigned.providerId)
    .forEach(p => {
      const r = resolve(p);
      if (r) {
        const model = p.models[0] ?? assigned.model;
        console.log(`[PROV] buildChain: fallback ${p.id} (${p.templateId}) model=${model}`);
        chain.push({ provider: r, model });
      }
    });

  console.log(`[PROV] buildChain: final chain length=${chain.length}`);
  return chain;
}

async function callWithTokenTiers(
  provider: ResolvedProvider,
  req: CanonicalRequest,
): Promise<CanonicalResponse> {
  const cfg = provider.config;

  if (cfg.monthlyTokenBudget && (cfg.tokensUsedThisMonth ?? 0) >= cfg.monthlyTokenBudget) {
    console.log(`[PROV] ${cfg.id}: budget exhausted (${cfg.tokensUsedThisMonth}/${cfg.monthlyTokenBudget})`);
    const e = new Error(`Budget exhausted for ${cfg.label}`);
    (e as any).status = 402;
    throw e;
  }

  const tiers = [req.maxTokens ?? 1500, 100, 50, 40];
  let lastErr: any;

  for (const maxTokens of tiers) {
    try {
      console.log(`[PROV] ${cfg.id}: trying tier maxTokens=${maxTokens}`);
      const res = await callProvider(provider, { ...req, maxTokens });
      const used = (res.usage?.prompt_tokens ?? 0) + (res.usage?.completion_tokens ?? 0);
      cfg.tokensUsedThisMonth = (cfg.tokensUsedThisMonth ?? 0) + used;
      console.log(`[PROV] ${cfg.id}: tier maxTokens=${maxTokens} SUCCEEDED, used=${used} tokens`);
      return res;
    } catch (err: any) {
      lastErr = err;
      console.log(`[PROV] ${cfg.id}: tier maxTokens=${maxTokens} FAILED status=${err.status} msg=${err.message?.slice(0, 120)}`);
      if (err.status !== 402) throw err;
    }
  }

  console.log(`[PROV] ${cfg.id}: all tiers exhausted`);
  throw lastErr;
}

export async function runWithFallback(
  chain: ReturnType<typeof buildChain>,
  req: Omit<CanonicalRequest, 'model'>,
): Promise<{ result: CanonicalResponse; usedProviderId: string }> {
  console.log(`[PROV] runWithFallback: chain has ${chain.length} providers`);
  for (const [i, link] of chain.entries()) {
    console.log(`[PROV] chain[${i}]: ${link.provider.config.id} model=${link.model}`);
  }
  let lastErr: any;
  const errors: string[] = [];
  for (const [i, link] of chain.entries()) {
    try {
      console.log(`[PROV] runWithFallback: trying chain[${i}] ${link.provider.config.id} model=${link.model}`);
      const result = await callWithTokenTiers(link.provider, { ...req, model: link.model });
      console.log(`[PROV] runWithFallback: chain[${i}] ${link.provider.config.id} SUCCEEDED`);
      return { result, usedProviderId: link.provider.config.id };
    } catch (err: any) {
      console.log(`[PROV] runWithFallback: chain[${i}] ${link.provider.config.id} FAILED: ${err.message?.slice(0, 150)}`);
      lastErr = err;
      errors.push(`${link.provider.config.label || link.provider.config.id}: ${err.message}`);
    }
  }
  console.log(`[PROV] runWithFallback: ALL providers failed`);
  // Aggregate every provider's failure so the real cause isn't masked by the last link.
  if (errors.length) throw new Error(`All ${errors.length} provider(s) failed — ${errors.join(' | ')}`);
  throw lastErr ?? new Error('No providers available');
}
