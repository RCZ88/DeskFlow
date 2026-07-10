export type SafetyAction = 'read' | 'create' | 'edit' | 'delete' | 'shell' | 'config'

const INTENT_TO_SAFETY: Record<string, SafetyAction> = {
  create: 'create',
  delete: 'delete',
  edit: 'edit',
  toggle: 'edit',
  list: 'read',
  unknown: 'read',
}

export interface SafetyResult {
  allowed: boolean
  reason?: string
  confirmRequired: boolean
}

export const MAX_INPUT_LENGTH = 2000

const PERMISSION_MATRIX: Record<SafetyAction, { allowed: boolean; confirmRequired: boolean; reason?: string }> = {
  read:    { allowed: true, confirmRequired: false },
  create:  { allowed: true, confirmRequired: true },
  edit:    { allowed: true, confirmRequired: true },
  delete:  { allowed: true, confirmRequired: true },
  shell:   { allowed: false, confirmRequired: false, reason: 'Shell execution blocked in Phase 1' },
  config:  { allowed: false, confirmRequired: false, reason: 'Config changes deferred to Phase 2' },
}

export function mapIntentToAction(intent: string): SafetyAction {
  return INTENT_TO_SAFETY[intent] ?? 'read'
}

export function checkAction(action: SafetyAction): SafetyResult {
  const entry = PERMISSION_MATRIX[action]
  return { ...entry }
}

export function sanitizeInput(text: string): string {
  let result = text
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '')
    .replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '')
  if (result.length > MAX_INPUT_LENGTH) {
    result = result.slice(0, MAX_INPUT_LENGTH)
  }
  return result
}
