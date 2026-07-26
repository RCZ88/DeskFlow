// Image Generation Service
// Calls image APIs (OpenAI, Stability, Replicate) with the Ian Xiaohei style

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

// ── Ian Xiaohei Style Instructions ──────────────────────────────────────────

export const IAN_XIAOHEI_STYLE = `STYLE RULES (Ian Xiaohei / 小黑):
- Pure white background (#FFFFFF), no texture, no paper grain, no beige, no shadows, no gradients
- Black ink line art with slight hand-drawn wobble, thin consistent strokes
- Subject occupies 40-60% of frame, generous white space
- 1-3 sparse Chinese handwritten annotations in red (#E53935), orange (#FF9800), or blue (#1E88E5)
- Whimsical and clever, NOT childish, NOT cute/kawaii, NOT cartoonish
- Maximum 3-4 distinct objects in scene
- One clear focal action

CHARACTER: 小黑 (Xiaohei)
- Simple black silhouette body, round head, white circle eyes, stick-thin legs
- Expression: neutral/focused, not smiling, not frowning
- Always engaged in the core action of the illustration
- NOT a mascot, NOT a sticker, NOT standing in the corner

COMPOSITION:
- Isometric or slight 3/4 view preferred
- Clean lines, no crosshatching, no shading
- 16:9 horizontal format`;

// ── Types ───────────────────────────────────────────────────────────────────

export interface ImageGenRequest {
  prompt: string;
  style?: 'ian-xiaohei' | 'minimal' | 'none';
  size?: '1024x1024' | '1792x1024' | '1024x1792';
  quality?: 'standard' | 'hd';
}

export interface ImageGenResult {
  ok: boolean;
  imagePath?: string;
  imageData?: string; // base64
  error?: string;
  provider?: string;
  model?: string;
}

interface ProviderConfig {
  id: string;
  apiKey: string;
  baseUrl?: string;
  model: string;
}

// ── Provider Adapters ───────────────────────────────────────────────────────

async function callOpenAI(config: ProviderConfig, request: ImageGenRequest): Promise<ImageGenResult> {
  const prompt = request.style === 'ian-xiaohei'
    ? `${IAN_XIAOHEI_STYLE}\n\nSCENE: ${request.prompt}`
    : request.prompt;

  const response = await fetch(`${config.baseUrl || 'https://api.openai.com/v1'}/images/generations`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: config.model || 'dall-e-3',
      prompt,
      n: 1,
      size: request.size || '1792x1024',
      quality: request.quality || 'standard',
      response_format: 'b64_json',
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    return { ok: false, error: err.error?.message || `OpenAI API error: ${response.status}` };
  }

  const data = await response.json();
  const b64 = data.data?.[0]?.b64_json;
  if (!b64) return { ok: false, error: 'No image data in response' };

  return { ok: true, imageData: b64, provider: 'openai', model: config.model };
}

async function callStability(config: ProviderConfig, request: ImageGenRequest): Promise<ImageGenResult> {
  const prompt = request.style === 'ian-xiaohei'
    ? `${IAN_XIAOHEI_STYLE}\n\nSCENE: ${request.prompt}`
    : request.prompt;

  const response = await fetch(`${config.baseUrl || 'https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image'}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      text_prompts: [{ text: prompt, weight: 1 }],
      cfg_scale: 7,
      height: 576,
      width: 1024,
      steps: 30,
      samples: 1,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    return { ok: false, error: err.message || `Stability API error: ${response.status}` };
  }

  const data = await response.json();
  const b64 = data.artifacts?.[0]?.base64;
  if (!b64) return { ok: false, error: 'No image data in response' };

  return { ok: true, imageData: b64, provider: 'stability', model: config.model };
}

async function callReplicate(config: ProviderConfig, request: ImageGenRequest): Promise<ImageGenResult> {
  const prompt = request.style === 'ian-xiaohei'
    ? `${IAN_XIAOHEI_STYLE}\n\nSCENE: ${request.prompt}`
    : request.prompt;

  // Create prediction
  const createResponse = await fetch('https://api.replicate.com/v1/predictions', {
    method: 'POST',
    headers: {
      'Authorization': `Token ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      version: config.model || 'black-forest-labs/flux-schnell',
      input: { prompt, num_outputs: 1, aspect_ratio: '16:9', output_format: 'png' },
    }),
  });

  if (!createResponse.ok) {
    const err = await createResponse.json().catch(() => ({}));
    return { ok: false, error: err.error || `Replicate API error: ${createResponse.status}` };
  }

  const prediction = await createResponse.json();

  // Poll for completion
  let result = prediction;
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 2000));
    const pollResponse = await fetch(`https://api.replicate.com/v1/predictions/${prediction.id}`, {
      headers: { 'Authorization': `Token ${config.apiKey}` },
    });
    result = await pollResponse.json();
    if (result.status === 'succeeded') break;
    if (result.status === 'failed') return { ok: false, error: result.error || 'Generation failed' };
  }

  if (result.status !== 'succeeded') return { ok: false, error: 'Generation timed out' };

  const imageUrl = Array.isArray(result.output) ? result.output[0] : result.output;
  if (!imageUrl) return { ok: false, error: 'No image URL in response' };

  // Download the image
  const imgResponse = await fetch(imageUrl);
  if (!imgResponse.ok) return { ok: false, error: 'Failed to download generated image' };

  const buffer = Buffer.from(await imgResponse.arrayBuffer());
  const b64 = buffer.toString('base64');

  return { ok: true, imageData: b64, provider: 'replicate', model: config.model };
}

// ── Main Entry Point ────────────────────────────────────────────────────────

export async function generateImage(
  request: ImageGenRequest,
  providerConfig: ProviderConfig,
  saveDir?: string,
  filename?: string,
): Promise<ImageGenResult> {
  const providerId = providerConfig.id.toLowerCase();

  let result: ImageGenResult;
  if (providerId === 'openai' || providerId === 'openrouter') {
    result = await callOpenAI(providerConfig, request);
  } else if (providerId === 'stability' || providerId === 'stabilityai') {
    result = await callStability(providerConfig, request);
  } else if (providerId === 'replicate') {
    result = await callReplicate(providerConfig, request);
  } else {
    return { ok: false, error: `Unsupported provider: ${providerId}` };
  }

  // Save to disk if requested
  if (result.ok && result.imageData && saveDir) {
    try {
      mkdirSync(saveDir, { recursive: true });
      const fname = filename || `illustration-${Date.now()}.png`;
      const filePath = join(saveDir, fname);
      writeFileSync(filePath, Buffer.from(result.imageData, 'base64'));
      result.imagePath = filePath;
    } catch (e: any) {
      result.error = `Failed to save image: ${e.message}`;
    }
  }

  return result;
}

// ── Explain-with-Image: AI generates prompt from confused text ──────────────

const EXPLAIN_WITH_IMAGE_SYSTEM = `You are a visual educator. The user is confused about a concept. Your job is to:

1. Understand what they're confused about
2. Think of a visual metaphor or diagram that would explain it clearly
3. Generate an illustration prompt in the Ian Xiaohei (小黑) style

RULES:
- The illustration must show ONE core concept, not multiple
- Use visual metaphors (e.g., water flow for data flow, building blocks for layers)
- Include the 小黑 character actively demonstrating the concept
- Add 1-2 Chinese annotations for key terms
- Keep the prompt concise (1-2 sentences for the scene)

OUTPUT FORMAT (JSON only):
{
  "concept": "one-line summary of what the user is confused about",
  "metaphor": "the visual metaphor you chose",
  "prompt": "the full illustration prompt in English",
  "annotations": ["中文标注1", "中文标注2"]
}`;

export async function generateExplainPrompt(
  confusedText: string,
  contextText: string,
  callAi: (prompt: string, systemPrompt: string, maxTokens?: number) => Promise<string>,
): Promise<{ ok: boolean; data?: { concept: string; metaphor: string; prompt: string; annotations: string[] }; error?: string }> {
  const userPrompt = `The user selected this text and is confused:
"${confusedText}"

Context around the selection:
"${contextText}"

Generate an illustration prompt that would visually explain this concept using the 小黑 character.`;

  try {
    const raw = await callAi(userPrompt, EXPLAIN_WITH_IMAGE_SYSTEM, 500);
    // Extract JSON from response
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return { ok: false, error: 'Failed to parse AI response' };
    const parsed = JSON.parse(jsonMatch[0]);
    return { ok: true, data: parsed };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}
