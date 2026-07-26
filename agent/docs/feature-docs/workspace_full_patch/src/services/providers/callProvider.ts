import { CanonicalRequest, CanonicalResponse, ResolvedProvider } from './types';

export async function callProvider(
  provider: ResolvedProvider,
  req: CanonicalRequest,
): Promise<CanonicalResponse> {
  const { config, template } = provider;
  const baseUrl = config.baseUrl || template.defaultBaseUrl;
  if (!baseUrl) {
    console.log(`[PROV] ${config.id}: no base URL configured`);
    throw new Error(`Provider ${config.id} has no base URL configured`);
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(template.staticHeaders ?? {}),
  };
  let url = template.interpolateUrl ? template.interpolateUrl(baseUrl, config) : baseUrl;
  if (config.apiKey) {
    if (template.auth.type === 'bearer') headers['Authorization'] = `Bearer ${config.apiKey}`;
    else if (template.auth.type === 'header') headers[template.auth.headerName!] = config.apiKey;
    else if (template.auth.type === 'query') url += `?${template.auth.queryParam}=${encodeURIComponent(config.apiKey)}`;
  }

  const body = template.buildBody
    ? template.buildBody(req)
    : {
        model: req.model,
        messages: [{ role: 'system', content: req.systemPrompt }, ...req.messages],
        max_tokens: req.maxTokens ?? 500,
        temperature: req.temperature ?? 0.4,
      };

  console.log(`[PROV] >>> ${config.id} calling ${url} model=${req.model} maxTokens=${req.maxTokens ?? 500}`);
  console.log(`[PROV] >>> ${config.id} baseUrl=${baseUrl} interpolated=${url} auth=${template.auth.type} key=${config.apiKey ? config.apiKey.slice(0,12)+'...' : 'NONE'}`);
  console.log(`[PROV] >>> ${config.id} body preview:`, JSON.stringify(body).slice(0, 300));

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  let response;
  try {
    response = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body), signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const errText = await response.text();
    console.log(`[PROV] <<< ${config.id} FAILED status=${response.status}: ${errText.slice(0, 300)}`);
    const e = new Error(`${template.label} error ${response.status}: ${errText.slice(0, 200)}`);
    (e as any).status = response.status;
    throw e;
  }
  console.log(`[PROV] <<< ${config.id} OK status=${response.status}`);
  const raw = await response.json();
  let result: CanonicalResponse;
  if (template.parseResponse) {
    result = template.parseResponse(raw);
  } else {
    const choice = raw.choices?.[0];
    const msg = choice?.message ?? {};
    const finishReason = choice?.finish_reason;
    // Reasoning models (Cloudflare gemma, deepseek-r1, etc.) sometimes return the
    // answer in `reasoning` with content:null — especially when truncated by max_tokens.
    const content = msg.content ?? msg.reasoning ?? '';
    if (!content && finishReason === 'length') {
      const e = new Error(`${template.label}: response truncated (finish_reason=length) before producing content — raise maxTokens`);
      (e as any).status = 422;
      throw e;
    }
    result = { content, usage: raw.usage };
  }
  console.log(`[PROV] ${config.id} response content len=${String(result.content).length} usage=${JSON.stringify(result.usage)}`);
  return result;
}
