import { useCallback, useEffect, useRef, useState } from "react"
import {
	parseAssistantContent,
	serializeParsed,
	type ParsedMessage,
} from "../components/ai/chat/parsed"
import { buildContextBundle, todayIso } from "../services/aiContextBundle"

export interface ChatMsg {
	id: string
	role: "user" | "assistant"
	content: string
	timestamp?: number
	parsed?: ParsedMessage
}

type AnyRec = Record<string, unknown>

// The preload bridge is exposed on window.deskflowAPI in this app.
function bridge(): AnyRec | undefined {
	const w = window as unknown as { deskflowAPI?: AnyRec }
	return w.deskflowAPI
}

function uid(): string {
	return Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}

interface ProviderState {
	providers?: Array<{ id: string; enabled?: boolean; models?: string[] }>
	routing?: { default?: { providerId?: string; model?: string } }
}

/** Pick the active provider + model exactly like aiAgentService does. */
function pickTarget(state: ProviderState | null): { provider: unknown; model: string } | null {
	const providers = state?.providers || []
	const enabled = providers.filter((p) => p.enabled)
	if (enabled.length === 0) return null
	const def = state?.routing?.default
	const target = def?.providerId ? enabled.find((p) => p.id === def.providerId) || enabled[0] : enabled[0]
	const model = def?.model || target.models?.[0] || "gpt-3.5-turbo"
	return { provider: target, model }
}

export interface UseAiChat {
	messages: ChatMsg[]
	input: string
	setInput: (v: string) => void
	streaming: boolean
	thinking: boolean
	error: string | null
	hasProvider: boolean
	send: (text?: string) => Promise<void>
	stop: () => void
	reset: () => Promise<void>
	setAssistantMessage: (id: string, patch: Partial<ChatMsg>) => void
}

/**
 * End-to-end chat controller for the /ai page. Loads today's thread on mount,
 * streams provider replies token-by-token, parses structured payloads on
 * completion, and persists every turn (including parsed_json) via ai-chat:save.
 */
export function useAiChat(): UseAiChat {
	const [messages, setMessages] = useState<ChatMsg[]>([])
	const [input, setInput] = useState("")
	const [streaming, setStreaming] = useState(false)
	const [thinking, setThinking] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [hasProvider, setHasProvider] = useState(true)

	const cleanupRef = useRef<null | (() => void)>(null)
	const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
	const threadDate = todayIso()

	// --- persistence -------------------------------------------------------
	const persist = useCallback(
		(msgs: ChatMsg[]) => {
			const b = bridge()
			if (!b || typeof b.aiChatSave !== "function") return
			try {
				;(b.aiChatSave as (a: AnyRec) => unknown)({
					threadDate,
					messages: msgs.map((m) => ({
						role: m.role,
						content: m.content,
						parsed_json: serializeParsed(m.parsed),
						timestamp: m.timestamp,
					})),
				})
			} catch {
				/* non-fatal */
			}
		},
		[threadDate],
	)

	// --- load existing thread on mount ------------------------------------
	useEffect(() => {
		const b = bridge()
		let cancelled = false
		;(async () => {
			try {
				if (b && typeof b.aiChatLoad === "function") {
					const raw = (await (b.aiChatLoad as (d: string) => Promise<unknown>)(threadDate)) as
						| Array<AnyRec>
						| { messages?: Array<AnyRec> }
						| null
					const list = Array.isArray(raw) ? raw : raw?.messages || []
					if (!cancelled && list.length) {
						setMessages(
							list.map((m) => {
								const content = String(m.content ?? "")
								const { text, parsed } = parseAssistantContent(
									content,
									(m.parsed_json as string | undefined) ?? null,
								)
								return {
									id: uid(),
									role: (m.role as "user" | "assistant") || "assistant",
									content: parsed && parsed.type !== "text" ? text : content,
									parsed: parsed && parsed.type !== "text" ? parsed : undefined,
									timestamp: (m.timestamp as number) || undefined,
								}
							}),
						)
					}
				}
				if (b && typeof b.getAiProviders === "function") {
					const st = (await (b.getAiProviders as () => Promise<unknown>)()) as ProviderState
					if (!cancelled) setHasProvider(Boolean(pickTarget(st)))
				}
			} catch {
				/* fresh thread */
			}
		})()
		return () => {
			cancelled = true
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [threadDate])

	const setAssistantMessage = useCallback((id: string, patch: Partial<ChatMsg>) => {
		setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)))
	}, [])

	const stop = useCallback(() => {
		if (cleanupRef.current) {
			cleanupRef.current()
			cleanupRef.current = null
		}
		if (timeoutRef.current) {
			clearTimeout(timeoutRef.current)
			timeoutRef.current = null
		}
		setStreaming(false)
		setThinking(false)
	}, [])

	const reset = useCallback(async () => {
		stop()
		setMessages([])
		setError(null)
		const b = bridge()
		try {
			if (b && typeof b.aiChatReset === "function") {
				await (b.aiChatReset as (d: string) => Promise<unknown>)(threadDate)
			}
		} catch {
			/* non-fatal */
		}
	}, [stop, threadDate])

	const send = useCallback(
		async (textArg?: string) => {
			const text = (textArg ?? input).trim()
			if (!text || streaming) return
			const b = bridge()
			if (!b || typeof b.getAiProviders !== "function" || typeof b.providerChatCall !== "function") {
				setError("Chat backend unavailable.")
				return
			}

			setError(null)
			setInput("")

			const userMsg: ChatMsg = { id: uid(), role: "user", content: text, timestamp: Date.now() }
			const assistantId = uid()
			const assistantMsg: ChatMsg = { id: assistantId, role: "assistant", content: "", timestamp: Date.now() }

			// snapshot history BEFORE this turn for the provider call
			const history = messages.map((m) => ({ role: m.role, content: m.content }))
			setMessages((prev) => [...prev, userMsg, assistantMsg])
			setThinking(true)

			// provider selection
			let target: { provider: unknown; model: string } | null = null
			try {
				const st = (await (b.getAiProviders as () => Promise<unknown>)()) as ProviderState
				target = pickTarget(st)
			} catch {
				target = null
			}
			if (!target) {
				setHasProvider(false)
				setThinking(false)
				setAssistantMessage(assistantId, {
					parsed: {
						type: "error",
						message: "No AI provider configured",
						recovery: "Open the provider selector and enable a model to start chatting.",
					},
				})
				setStreaming(false)
				return
			}
			setHasProvider(true)

			// build system prompt with live app context
			let systemPrompt = ""
			try {
				systemPrompt = await buildContextBundle()
			} catch {
				systemPrompt = "You are DeskFlow AI."
			}

			const payloadMessages = [
				{ role: "system", content: systemPrompt },
				...history,
				{ role: "user", content: text },
			]

			let full = ""
			setStreaming(true)

			const finish = (finalText: string) => {
				const { text: prose, parsed } = parseAssistantContent(finalText)
				setMessages((prev) => {
					const next = prev.map((m) =>
						m.id === assistantId
							? {
									...m,
									content: parsed && parsed.type !== "text" ? prose : finalText,
									parsed: parsed && parsed.type !== "text" ? parsed : undefined,
							  }
							: m,
					)
					persist(next)
					return next
				})
				stop()
			}

			// stream via provider-chunk events
			if (typeof b.onProviderChunk === "function") {
				cleanupRef.current = (b.onProviderChunk as (cb: (d: AnyRec) => void) => () => void)((d) => {
					if (d.error) {
						setThinking(false)
						setAssistantMessage(assistantId, {
							parsed: {
								type: "error",
								message: "The model returned an error",
								recovery: String(d.error),
							},
						})
						stop()
						return
					}
					if (typeof d.delta === "string" && d.delta) {
						setThinking(false)
						full += d.delta
						setAssistantMessage(assistantId, { content: full })
					}
					if (d.done) finish(typeof d.full === "string" && d.full ? d.full : full)
				})
			}

			// 60s watchdog
			timeoutRef.current = setTimeout(() => {
				if (!full) {
					setAssistantMessage(assistantId, {
						parsed: { type: "error", message: "Request timed out", recovery: "Try again or pick another model." },
					})
				}
				stop()
			}, 60000)

			try {
				await (b.providerChatCall as (a: AnyRec) => Promise<unknown>)({
					provider: target.provider,
					messages: payloadMessages,
					model: target.model,
				})
			} catch (e) {
				setThinking(false)
				setAssistantMessage(assistantId, {
					parsed: {
						type: "error",
						message: "Could not reach the model",
						recovery: e instanceof Error ? e.message : "Check your provider settings.",
					},
				})
				stop()
			}
		},
		[input, streaming, messages, persist, setAssistantMessage, stop],
	)

	useEffect(() => () => stop(), [stop])

	return {
		messages,
		input,
		setInput,
		streaming,
		thinking,
		error,
		hasProvider,
		send,
		stop,
		reset,
		setAssistantMessage,
	}
}
