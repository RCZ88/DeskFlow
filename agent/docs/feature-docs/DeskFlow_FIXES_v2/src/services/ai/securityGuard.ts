import type { SecurityLevel, AuditEntry, SecurityConfig } from './types'

const DEFAULT_CONFIG: SecurityConfig = {
  maxCallsPerMinute: 60,
  maxCallsPerSession: 500,
  requireConfirmForLevels: ['confirm', 'admin'],
  auditEnabled: true,
}

class SecurityGuard {
  private config: SecurityConfig = { ...DEFAULT_CONFIG }
  private callTimestamps: number[] = []
  private totalCalls = 0
  private auditLog: AuditEntry[] = []

  private static readonly LEVEL_HIERARCHY: Record<SecurityLevel, number> = {
    read: 0,
    confirm: 1,
    admin: 2,
    blocked: 99,
  }

  getConfig() {
    return { ...this.config }
  }

  updateConfig(partial: Partial<SecurityConfig>) {
    this.config = { ...this.config, ...partial }
  }

  isLevelAllowed(level: SecurityLevel): boolean {
    if (level === 'read') return true
    if (level === 'confirm') return true
    if (level === 'admin') return true
    return false
  }

  requiresConfirm(level: SecurityLevel): boolean {
    return this.config.requireConfirmForLevels.includes(level)
  }

  checkRateLimit(): { allowed: boolean; reason?: string } {
    const now = Date.now()
    this.callTimestamps = this.callTimestamps.filter(t => now - t < 60000)
    if (this.callTimestamps.length >= this.config.maxCallsPerMinute) {
      return { allowed: false, reason: `Rate limit: max ${this.config.maxCallsPerMinute} calls per minute` }
    }
    if (this.totalCalls >= this.config.maxCallsPerSession) {
      return { allowed: false, reason: `Session limit: max ${this.config.maxCallsPerSession} calls per session` }
    }
    return { allowed: true }
  }

  validateParams(params: Record<string, any>, schema: Record<string, any>): { valid: boolean; error?: string } {
    for (const [key, def] of Object.entries(schema)) {
      if (def.required && (params[key] === undefined || params[key] === null)) {
        return { valid: false, error: `Missing required parameter: ${key}` }
      }
      if (params[key] !== undefined && params[key] !== null) {
        const val = params[key]
        switch (def.type) {
          case 'string':
            if (typeof val !== 'string') return { valid: false, error: `${key} must be a string` }
            if (val.length > 10000) return { valid: false, error: `${key} exceeds max length 10000` }
            break
          case 'number':
            if (typeof val !== 'number' || isNaN(val)) return { valid: false, error: `${key} must be a number` }
            if (val < -1e9 || val > 1e9) return { valid: false, error: `${key} out of range` }
            break
          case 'boolean':
            if (typeof val !== 'boolean') return { valid: false, error: `${key} must be a boolean` }
            break
          case 'array':
            if (!Array.isArray(val)) return { valid: false, error: `${key} must be an array` }
            if (val.length > 100) return { valid: false, error: `${key} exceeds max array length 100` }
            break
          case 'object':
            if (typeof val !== 'object' || Array.isArray(val) || val === null) {
              return { valid: false, error: `${key} must be an object` }
            }
            const json = JSON.stringify(val)
            if (json.length > 50000) return { valid: false, error: `${key} object exceeds 50KB` }
            break
        }
      }
    }
    return { valid: true }
  }

  audited<T>(toolName: string, params: Record<string, any>, fn: () => Promise<T>): Promise<T> {
    const start = Date.now()
    this.callTimestamps.push(start)
    this.totalCalls++

    return fn()
      .then(result => {
        if (this.config.auditEnabled) {
          this.auditLog.push({
            timestamp: new Date().toISOString(),
            toolName,
            params: this.sanitizeParams(params),
            result: '(success)',
            durationMs: Date.now() - start,
            userId: 'ai',
          })
        }
        return result
      })
      .catch((err: Error) => {
        if (this.config.auditEnabled) {
          this.auditLog.push({
            timestamp: new Date().toISOString(),
            toolName,
            params: this.sanitizeParams(params),
            error: err.message,
            durationMs: Date.now() - start,
            userId: 'ai',
          })
        }
        throw err
      })
  }

  getAuditLog(): AuditEntry[] {
    return [...this.auditLog]
  }

  getStats() {
    return {
      totalCalls: this.totalCalls,
      recentCallsPerMin: this.callTimestamps.length,
      auditEntries: this.auditLog.length,
    }
  }

  private sanitizeParams(params: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {}
    for (const [key, val] of Object.entries(params)) {
      if (typeof val === 'string' && val.length > 200) {
        sanitized[key] = val.slice(0, 200) + '...'
      } else {
        sanitized[key] = val
      }
    }
    return sanitized
  }
}

export const securityGuard = new SecurityGuard()
export type { SecurityGuard }
