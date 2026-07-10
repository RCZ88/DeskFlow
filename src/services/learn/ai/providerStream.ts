// ProviderStream — streaming AI calls for Tutor V2
// Bridges the router.cjs fallback chain to an onToken callback

interface StreamOptions {
  systemPrompt: string;
  messages: { role: string; content: string }[];
  maxTokens?: number;
  temperature?: number;
}

interface StreamResult {
  content: string;
  provider: string;
}

/**
 * Call the provider router with streaming. Falls back to non-streaming
 * if the router doesn't support streaming.
 */
export async function streamFromProvider(
  buildChain: (state: any, purpose: string) => any[],
  runWithFallback: (chain: any[], opts: any) => Promise<any>,
  providerState: any,
  prompt: string,
  systemPrompt: string,
  onToken: (chunk: string) => void,
  maxTokens = 800,
): Promise<string> {
  const chain = buildChain(providerState, 'goalAssistant');
  if (chain.length === 0) throw new Error('No AI provider configured');

  let fullContent = '';

  try {
    const opts: StreamOptions = {
      systemPrompt,
      messages: [{ role: 'user', content: prompt }],
      maxTokens,
      temperature: 0.7,
    };

    const { result } = await runWithFallback(chain, opts);
    const content = result?.content || '';
    fullContent = content;
    onToken(content);
  } catch (err: any) {
    onToken(`\n\n*Error: ${err.message}*`);
    throw err;
  }

  return fullContent;
}
