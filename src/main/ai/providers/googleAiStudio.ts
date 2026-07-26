const GOOGLE_AI_STUDIO_BASE = "https://generativelanguage.googleapis.com/v1beta"

export const GOOGLE_AI_STUDIO_MODELS = [
  "gemini-2.0-flash",
  "gemini-2.5-pro",
  "gemini-2.5-flash",
  "gemini-2.0-flash-lite",
  "gemini-1.5-pro",
]

export async function* streamGoogleAiStudio(
  config: { apiKey: string; model: string; baseUrl?: string },
  messages: Array<{ role: string; content: string }>
): AsyncGenerator<string, void, unknown> {
  const url = `${config.baseUrl || GOOGLE_AI_STUDIO_BASE}/models/${config.model}:streamGenerateContent?key=${config.apiKey}`

  const contents = messages.map(m => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }))

  const systemInstruction = messages.find(m => m.role === "system")?.content ?? ""
  const chatContents = contents.filter((c: any) => c.role !== "system")

  const body: any = {
    contents: chatContents,
    generationConfig: { temperature: 0.7, maxOutputTokens: 4000 },
  }

  if (systemInstruction) {
    body.systemInstruction = { parts: [{ text: systemInstruction }] }
  }

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error?.message || `Google AI Studio error: ${res.status}`)
  }

  const reader = res.body?.getReader()
  if (!reader) throw new Error("No response body")

  const decoder = new TextDecoder()
  let buffer = ""

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split("\n")
    buffer = lines.pop() || ""
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || !trimmed.startsWith("{")) continue
      try {
        const chunk = JSON.parse(trimmed)
        const text = chunk.candidates?.[0]?.content?.parts?.[0]?.text ?? ""
        if (text) yield text
      } catch {}
    }
  }

  if (buffer.trim()) {
    try {
      const chunk = JSON.parse(buffer.trim())
      const text = chunk.candidates?.[0]?.content?.parts?.[0]?.text ?? ""
      if (text) yield text
    } catch {}
  }
}
