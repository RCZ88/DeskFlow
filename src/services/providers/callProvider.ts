import { CanonicalRequest, CanonicalResponse, ResolvedProvider } from './types';

export async function callProvider(
  provider: ResolvedProvider,
  req: CanonicalRequest,
): Promise<CanonicalResponse> {
  const { config, template } = provider;
  const baseUrl = config.baseUrl || template.defaultBaseUrl;
  if (!baseUrl) throw new Error(`Provider ${config.id} has no base URL configured`);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(template.staticHeaders ?? {}),
  };
  let url = baseUrl;
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
    const e = new Error(`${template.label} error ${response.status}: ${errText.slice(0, 200)}`);
    (e as any).status = response.status;
    throw e;
  }
  const raw = await response.json();
  return template.parseResponse
    ? template.parseResponse(raw)
    : {
        content: raw.choices?.[0]?.message?.content || '',
        usage: raw.usage,
      };
}
