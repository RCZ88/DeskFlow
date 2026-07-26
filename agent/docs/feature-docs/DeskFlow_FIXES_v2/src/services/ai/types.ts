export type SecurityLevel = 'read' | 'confirm' | 'admin' | 'blocked'

export interface ToolParameter {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array'
  description: string
  required?: boolean
  enum?: string[]
  properties?: Record<string, ToolParameter>
  items?: ToolParameter
}

export interface AiTool {
  name: string
  description: string
  parameters: Record<string, ToolParameter>
  securityLevel: SecurityLevel
  category: string
  handler: (params: Record<string, any>) => Promise<any>
}

export interface ToolCallRequest {
  id: string
  toolName: string
  args: Record<string, any>
}

export interface ToolCallResult {
  toolCallId: string
  toolName: string
  result: any
  error?: string
}

export interface AiAgentConfig {
  providerId: string
  model: string
  systemPrompt: string
  maxTokens: number
  temperature: number
  maxToolCallsPerRound: number
  maxRounds: number
}

export interface AgentMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string
  toolCalls?: ToolCallRequest[]
  toolCallId?: string
  toolName?: string
}

export interface AgentContext {
  goals: any[]
  aggregates: any
  aiUsage: any
  projects: any[]
  sleep: any
  externalActivities: any[]
  activeSession: any
  preferences: Record<string, any>
}

export interface AuditEntry {
  timestamp: string
  toolName: string
  params: Record<string, any>
  result: any
  error?: string
  durationMs: number
  userId: 'ai'
}

export interface SecurityConfig {
  maxCallsPerMinute: number
  maxCallsPerSession: number
  requireConfirmForLevels: SecurityLevel[]
  adminPassword?: string
  auditEnabled: boolean
}
