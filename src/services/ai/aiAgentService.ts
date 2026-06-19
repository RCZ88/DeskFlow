import { toolRegistry } from './toolRegistry'
import { securityGuard } from './securityGuard'
import type { AiAgentConfig, ToolCallRequest, ToolCallResult, AgentMessage, ToolParameter } from './types'

const SYSTEM_PROMPT_BASE = `You are an AI assistant integrated into a personal productivity tracker. You have access to tools that let you:

- READ goals, projects, activities, settings, stats, sleep data
- CREATE/UPDATE/DELETE goals, projects, external activities, categories, preferences
- START/STOP activity tracking sessions
- MANAGE problems and recording configurations

You cannot:
- Execute shell commands
- Modify the app's core files
- Change security settings

Rules:
1. Use tools to answer questions — do not guess or make up data
2. When the user asks to CREATE or DELETE something, explain what you're about to do and get confirmation before acting
3. When the user asks to READ something, just fetch and show it
4. Keep responses concise and helpful
5. If a tool fails, explain the error clearly
6. Batch independent tool calls when possible
7. When showing lists, summarize totals (e.g., "You have 5 projects" instead of dumping everything)
8. NEVER make up data — use the tools to fetch real data
9. For time-based queries, use appropriate periods: "today", "week", "month", "all"
10. Format times readably (e.g., "2h 30m" instead of raw seconds)`

class AiAgentService {
  private config: AiAgentConfig = {
    providerId: '',
    model: '',
    systemPrompt: SYSTEM_PROMPT_BASE,
    maxTokens: 2000,
    temperature: 0.7,
    maxToolCallsPerRound: 8,
    maxRounds: 5,
  }

  private conversationHistory: AgentMessage[] = []
  private confirmQueue: Array<{ toolName: string; args: Record<string, any>; resolve: (v: boolean) => void }> = []
  private progressCallback: ((progress: { round: number; totalRounds: number; toolName?: string; toolArgs?: Record<string, any>; status: 'thinking' | 'executing' | 'completed' | 'error'; message?: string; streamedContent?: string }) => void) | null = null

  getConfig() {
    return { ...this.config }
  }

  updateConfig(partial: Partial<AiAgentConfig>) {
    this.config = { ...this.config, ...partial }
  }

  setProgressCallback(callback: (progress: { round: number; totalRounds: number; toolName?: string; toolArgs?: Record<string, any>; status: 'thinking' | 'executing' | 'completed' | 'error'; message?: string; streamedContent?: string }) => void) {
    this.progressCallback = callback
  }

  clearProgressCallback() {
    this.progressCallback = null
  }

  getConversationHistory() {
    return [...this.conversationHistory]
  }

  getSystemPrompt() {
    const tools = toolRegistry.getAll()
    const readTools = tools.filter(t => t.securityLevel === 'read')
    const writeTools = tools.filter(t => t.securityLevel === 'confirm')

    return `${SYSTEM_PROMPT_BASE}

Available tools (${tools.length} total):
- READ only (${readTools.length}): ${readTools.map(t => t.name).join(', ')}
- WRITE/DELETE (${writeTools.length}, require confirmation): ${writeTools.map(t => t.name).join(', ')}

Security: ${JSON.stringify(securityGuard.getStats())}`
  }

  async processMessage(userMessage: string): Promise<string> {
    console.log(`[AiAgent] processMessage start, userMessage="${userMessage.slice(0, 50)}", historyLen=${this.conversationHistory.length}`)
    this.conversationHistory.push({ role: 'user', content: userMessage })

    const systemPrompt = this.getSystemPrompt()
    let finalResponse = ''

    this.progressCallback?.({ round: 0, totalRounds: this.config.maxRounds, status: 'thinking', message: 'Starting AI response...' })

    for (let round = 0; round < this.config.maxRounds; round++) {
      console.log(`[AiAgent] Round ${round}/${this.config.maxRounds} start`)
      this.progressCallback?.({ round, totalRounds: this.config.maxRounds, status: 'thinking', message: `Round ${round + 1} of ${this.config.maxRounds}` })

      const providerTools = toolRegistry.getOpenAISpecs()

      const response = await this.callLLM(systemPrompt, providerTools, round, this.config.maxRounds)

      if (!response?.choices?.[0]?.message) {
        console.log(`[AiAgent] Round ${round}: no response/choices`)
        const fallback = 'I encountered an error connecting to the AI provider. Please check your provider settings and try again.'
        this.conversationHistory.push({ role: 'assistant', content: fallback })
        this.progressCallback?.({ round, totalRounds: this.config.maxRounds, status: 'error', message: 'Failed to get AI response' })
        return fallback
      }

      const message = response.choices[0].message
      const toolCalls = message.tool_calls

      if (!toolCalls || toolCalls.length === 0) {
        console.log(`[AiAgent] Round ${round}: no tool calls, content="${(message.content || '').slice(0, 80)}"`)
        this.conversationHistory.push({ role: 'assistant', content: message.content || '' })
        finalResponse = message.content || 'Done.'
        this.progressCallback?.({ round, totalRounds: this.config.maxRounds, status: 'completed', message: 'AI response generated' })
        break
      }

      console.log(`[AiAgent] Round ${round}: ${toolCalls.length} tool call(s): ${toolCalls.map((tc: any) => tc.function.name).join(', ')}`)
      this.conversationHistory.push({
        role: 'assistant',
        content: message.content || `[Using ${toolCalls.length} tool(s)...]`,
        toolCalls: toolCalls.map((tc: any) => ({
          id: tc.id,
          toolName: tc.function.name,
          args: JSON.parse(tc.function.arguments),
        })),
      })

      const batchLimit = Math.min(toolCalls.length, this.config.maxToolCallsPerRound)
      const results: ToolCallResult[] = []

      for (let i = 0; i < batchLimit; i++) {
        const tc = toolCalls[i]
        const toolName = tc.function.name
        let args: Record<string, any>
        try { args = JSON.parse(tc.function.arguments) } catch { args = {} }

        this.progressCallback?.({ round, totalRounds: this.config.maxRounds, toolName, toolArgs: args, status: 'executing', message: `Executing tool: ${toolName}` })

        const tool = toolRegistry.get(toolName)
        if (!tool) {
          console.log(`[AiAgent] Tool ${toolName}: NOT FOUND`)
          results.push({ toolCallId: tc.id, toolName, result: null, error: `Unknown tool: ${toolName}` })
          this.progressCallback?.({ round, totalRounds: this.config.maxRounds, toolName, toolArgs: args, status: 'error', message: `Unknown tool: ${toolName}` })
          continue
        }

        if (securityGuard.requiresConfirm(tool.securityLevel)) {
          console.log(`[AiAgent] Tool ${toolName}: waiting for confirm`)
          const confirmed = await this.requestConfirm(toolName, args)
          console.log(`[AiAgent] Tool ${toolName}: confirm=${confirmed}`)
          if (!confirmed) {
            results.push({ toolCallId: tc.id, toolName, result: null, error: 'User declined confirmation' })
            this.progressCallback?.({ round, totalRounds: this.config.maxRounds, toolName, toolArgs: args, status: 'error', message: 'User declined confirmation' })
            continue
          }
        }

        try {
          console.log(`[AiAgent] Tool ${toolName}: executing, args=${JSON.stringify(args)}`)
          const result = await toolRegistry.execute(toolName, args)
          console.log(`[AiAgent] Tool ${toolName}: completed, result type=${typeof result}`)
          results.push({ toolCallId: tc.id, toolName, result })
          this.progressCallback?.({ round, totalRounds: this.config.maxRounds, toolName, toolArgs: args, status: 'completed', message: `Tool completed: ${toolName}` })
        } catch (err: any) {
          console.log(`[AiAgent] Tool ${toolName}: ERROR ${err.message}`)
          results.push({ toolCallId: tc.id, toolName, result: null, error: err.message })
          this.progressCallback?.({ round, totalRounds: this.config.maxRounds, toolName, toolArgs: args, status: 'error', message: `Tool error: ${err.message}` })
        }
      }

      for (const r of results) {
        this.conversationHistory.push({
          role: 'tool',
          content: r.error ? `Error: ${r.error}` : JSON.stringify(r.result).slice(0, 5000),
          toolCallId: r.toolCallId,
          toolName: r.toolName,
        })
      }
      console.log(`[AiAgent] Round ${round} end, historyLen=${this.conversationHistory.length}`)
    }

    console.log(`[AiAgent] processMessage done, finalResponse="${(finalResponse || '').slice(0, 80)}"`)
    return finalResponse || 'I completed the operation but could not generate a summary.'
  }

  private async callLLM(systemPrompt: string, tools: any[], round: number = 0, totalRounds: number = 1, onChunk?: (text: string) => void): Promise<any> {
    console.log(`[AiAgent:callLLM] round=${round}/${totalRounds}, historyLen=${this.conversationHistory.length}`)
    const api = (window as any).deskflowAPI

    let preferredModel = ''
    let state: any = null
    try {
      const aiConfig = await api.getAiConfig()
      if (aiConfig?.briefModel) preferredModel = aiConfig.briefModel
      state = await api.getAiProviders()
    } catch {}
    if (!state) {
      const defaultApiKey = await api?.getOpenRouterApiKey?.()
      state = {
        providers: [
          { id: 'openrouter', templateId: 'openrouter', label: 'OpenRouter', enabled: true, apiKey: defaultApiKey || '', baseUrl: '', models: ['google/gemini-2.0-flash-001'], priority: 0 },
        ],
        routing: { default: { providerId: 'openrouter', model: '' } },
      }
    }

    const enabled = state.providers.filter((p: any) => p.enabled)
    if (enabled.length === 0) throw new Error('No enabled AI providers')

    const defaultRoute = state.routing?.default
    const target = defaultRoute?.providerId
      ? enabled.find((p: any) => p.id === defaultRoute.providerId) || enabled[0]
      : enabled[0]

    const template = this.getTemplate(target.templateId)
    const model = preferredModel || defaultRoute?.model || target.models[0] || 'gpt-3.5-turbo'
    const baseUrl = target.baseUrl || template.defaultBaseUrl
    if (!baseUrl) throw new Error(`Provider ${target.label} has no base URL`)

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(template.staticHeaders || {}),
    }
    if (target.apiKey) {
      if (template.auth.type === 'bearer') {
        headers['Authorization'] = `Bearer ${target.apiKey}`
      } else if (template.auth.type === 'header' && template.auth.headerName) {
        headers[template.auth.headerName] = target.apiKey
      }
    }

    let url = baseUrl
    if (target.apiKey && template.auth.type === 'query' && template.auth.queryParam) {
      url += `?${template.auth.queryParam}=${encodeURIComponent(target.apiKey)}`
    }

    const messages = [
      { role: 'system', content: systemPrompt },
      ...this.convertToProviderMessages(this.conversationHistory),
    ]

    const body: any = {
      model,
      messages,
      max_tokens: this.config.maxTokens,
      temperature: this.config.temperature,
      stream: true,
    }

    if (tools && tools.length > 0) {
      body.tools = tools
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errText = await response.text()
      throw new Error(`${target.label} error ${response.status}: ${errText.slice(0, 300)}`)
    }

    // Handle streaming response
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Response body is not readable');
    }
    
    const decoder = new TextDecoder();
    let fullContent = '';
    let usage = { prompt_tokens: 0, completion_tokens: 0 };
    const streamedToolCalls: Record<number, any> = {};
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') continue;
          
          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta;
            
            // Extract content from delta
            if (delta?.content) {
              fullContent += delta.content;
              onChunk?.(delta.content);
              this.progressCallback?.({ round, totalRounds, status: 'thinking', message: 'Generating response...', streamedContent: fullContent });
            }
            
            // Extract tool calls from delta (OpenAI streaming format)
            if (delta?.tool_calls) {
              for (const tc of delta.tool_calls) {
                if (!streamedToolCalls[tc.index]) {
                  streamedToolCalls[tc.index] = { id: '', type: 'function', function: { name: '', arguments: '' } };
                }
                if (tc.id) streamedToolCalls[tc.index].id = tc.id;
                if (tc.function?.name) streamedToolCalls[tc.index].function.name += tc.function.name;
                if (tc.function?.arguments) streamedToolCalls[tc.index].function.arguments += tc.function.arguments;
              }
            }
            
            // Extract usage information
            if (parsed.usage) {
              usage = {
                prompt_tokens: parsed.usage.prompt_tokens || 0,
                completion_tokens: parsed.usage.completion_tokens || 0,
              };
            }
          } catch (e) {
            // Skip invalid JSON lines
            continue;
          }
        }
      }
    }

    const toolCalls = Object.keys(streamedToolCalls).length > 0
      ? Object.values(streamedToolCalls).filter(tc => tc.id && tc.function.name)
      : undefined

    console.log(`[AiAgent:callLLM] done, contentLen=${fullContent.length}, toolCalls=${toolCalls?.length || 0}`)
    return {
      choices: [{
        message: {
          content: fullContent,
          ...(toolCalls ? { tool_calls: toolCalls } : {}),
        },
      }],
      usage,
    };
  }

  private getTemplate(templateId: string): any {
    const templates: Record<string, any> = {
      openrouter: {
        id: 'openrouter',
        defaultBaseUrl: 'https://openrouter.ai/api/v1/chat/completions',
        auth: { type: 'bearer' },
        staticHeaders: { 'HTTP-Referer': 'https://deskflow.app', 'X-Title': 'DeskFlow' },
      },
      cloudflayer: {
        id: 'cloudflayer',
        defaultBaseUrl: 'https://api.cloudflayer.ai/v1/chat/completions',
        auth: { type: 'bearer' },
      },
      invilier: {
        id: 'invilier',
        defaultBaseUrl: 'https://api.invilier.com/v1/chat/completions',
        auth: { type: 'bearer' },
      },
      olamah: {
        id: 'olamah',
        defaultBaseUrl: 'http://localhost:11434/v1/chat/completions',
        auth: { type: 'bearer' },
      },
      custom: {
        id: 'custom',
        defaultBaseUrl: '',
        auth: { type: 'bearer' },
      },
    }
    return templates[templateId] || templates.custom
  }

  private requestConfirm(toolName: string, args: Record<string, any>): Promise<boolean> {
    return new Promise(resolve => {
      this.confirmQueue.push({ toolName, args, resolve })
    })
  }

  getPendingConfirm(): { toolName: string; args: Record<string, any> } | null {
    return this.confirmQueue.length > 0 ? this.confirmQueue[0] : null
  }

  resolveConfirm(approved: boolean) {
    const item = this.confirmQueue.shift()
    if (item) item.resolve(approved)
  }

  get hasPendingConfirm(): boolean {
    return this.confirmQueue.length > 0
  }

  private convertToProviderMessages(history: AgentMessage[]): any[] {
    return history.map(msg => {
      if (msg.role === 'tool') {
        return {
          role: 'tool',
          content: msg.content,
          tool_call_id: msg.toolCallId,
        }
      }
      if (msg.role === 'assistant' && msg.toolCalls) {
        return {
          role: 'assistant',
          content: msg.content,
          tool_calls: msg.toolCalls.map(tc => ({
            id: tc.id,
            type: 'function',
            function: { name: tc.toolName, arguments: JSON.stringify(tc.args) },
          })),
        }
      }
      return { role: msg.role, content: msg.content }
    })
  }

  resetConversation() {
    this.conversationHistory = []
    this.confirmQueue = []
  }
}

export const aiAgentService = new AiAgentService()
