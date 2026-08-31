// BridgeField — the UNIFORM form-field primitive for the External AI Bridge.
//
// Every feature (content creation, finance, learning, goals) renders its form
// fields through this component so the look, behavior, and AI-button wiring are
// identical everywhere ("Google-form-like" consistency). It pairs a labeled input
// with the FieldAIButton so the user can fill any field from their external AI.

import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import { FieldAIButton } from './FieldAIButton'
import { BridgeCategory } from './prompt'
import { TextArea, TextInput } from '@/features/content-engine/components/ui'

export interface BridgeFieldDef {
  /** Field key (used in the JSON schema + form state) */
  key: string
  /** Human label */
  label: string
  /** Placeholder text */
  placeholder?: string
  /** 'text' | 'textarea' */
  kind?: 'text' | 'textarea'
  /** Whether to show the per-field AI button (default true) */
  ai?: boolean
  /** Help hint shown under the label */
  hint?: string
}

interface BridgeFieldProps {
  def: BridgeFieldDef
  value: string
  onChange: (key: string, value: string) => void
  /** All current form values (passed to the AI prompt as context) */
  allValues: Record<string, string>
  category: BridgeCategory
  context?: string
  className?: string
}

export function BridgeField({ def, value, onChange, allValues, category, context, className }: BridgeFieldProps) {
  const input = useMemo(() => {
    const common = {
      value,
      onChange: (e: any) => onChange(def.key, e.target.value),
      placeholder: def.placeholder,
    }
    return def.kind === 'textarea' ? (
      <TextArea rows={2} {...common} className="text-[12px]" />
    ) : (
      <TextInput {...common} className="text-[12px]" />
    )
  }, [def, value, onChange])

  return (
    <div className={cn('space-y-1', className)}>
      <div className="flex items-center justify-between gap-2">
        <label className="text-[11px] font-medium text-zinc-300">
          {def.label}
          {def.hint && <span className="ml-1 text-[10px] font-normal text-zinc-500">{def.hint}</span>}
        </label>
        {def.ai !== false && (
          <FieldAIButton
            fieldName={def.key}
            label={def.label}
            value={value}
            onUpdate={(v) => onChange(def.key, v)}
            allFields={allValues}
            category={category}
            context={context}
          />
        )}
      </div>
      {input}
    </div>
  )
}

export default BridgeField
