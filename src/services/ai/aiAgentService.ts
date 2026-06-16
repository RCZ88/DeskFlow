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

  getConfig() {
    return { ...this.config }
  }

  updateConfig(partial: Partial<AiAgentConfig>) {
    this.config = { ...this.config, ...partial }
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
    this.conversationHistory.push({ role: 'user', content: userMessage })

    const systemPrompt = this.getSystemPrompt()
    let finalResponse = ''

    for (let round = 0; round < this.config.maxRounds; round++) {
      const providerTools = toolRegistry.getOpenAISpecs()

      const response = await this.callLLM(systemPrompt, providerTools)

      if (!response?.choices?.[0]?.message) {
        const fallback = 'I encountered an error connecting to the AI provider. Please check your provider settings and try again.'
        this.conversationHistory.push({ role: 'assistant', content: fallback })
        return fallback
      }

      const message = response.choices[0].message
      const toolCalls = message.tool_calls

      if (!toolCalls || toolCalls.length === 0) {
        this.conversationHistory.push({ role: 'assistant', content: message.content || '' })
        finalResponse = message.content || 'Done.'
        break
      }

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

        const tool = toolRegistry.get(toolName)
        if (!tool) {
          results.push({ toolCallId: tc.id, toolName, result: null, error: `Unknown tool: ${toolName}` })
          continue
        }

        if (securityGuard.requiresConfirm(tool.securityLevel)) {
          const confirmed = await this.requestConfirm(toolName, args)
          if (!confirmed) {
            results.push({ toolCallId: tc.id, toolName, result: null, error: 'User declined confirmation' })
            continue
          }
        }

        try {
          const result = await toolRegistry.execute(toolName, args)
          results.push({ toolCallId: tc.id, toolName, result })
        } catch (err: any) {
          results.push({ toolCallId: tc.id, toolName, result: null, error: err.message })
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
    }

    return finalResponse || 'I completed the operation but could not generate a summary.'
  }

  private async callLLM(systemPrompt: string, tools: any[]): Promise<any> {
    const api = (window as any).deskflowAPI
    const state = await api.getAiProviders()
    if (!state) throw new Error('No AI providers configured')

    const enabled = state.providers.filter((p: any) => p.enabled)
    if (enabled.length === 0) throw new Error('No enabled AI providers')

    const defaultRoute = state.routing?.default
    const target = defaultRoute?.providerId
      ? enabled.find((p: any) => p.id === defaultRoute.providerId) || enabled[0]
      : enabled[0]

    const template = this.getTemplate(target.templateId)
    const model = defaultRoute?.model || target.models[0] || 'gpt-3.5-turbo'
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

    return response.json()
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
