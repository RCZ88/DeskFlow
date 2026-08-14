import React, { useMemo, useState, useCallback } from 'react'
import { useStudio } from '../../state/StudioProvider'
import { AlertTriangle, Check, Clipboard, ClipboardCheck, Loader2, Wand2, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { PROMPT_CUT_PLANNER, PROMPT_SCENE_DSL } from '../../../../lib/overlayPrompts'
import { extractJson, validateCutPlan, validateSceneDSL, allPassed, passedCount, generateRepairPrompt } from '../../../../lib/overlayParser'

export function ManualBridgePanel() {
  const { state, dispatch, activeSession } = useStudio()
  const { bridge } = state
  const [copied, setCopied] = useState(false)

  if (!activeSession) return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
      <FileJson size={28} className="mb-3 text-zinc-600" />
      <p className="text-[13px] font-medium text-zinc-400">No session selected</p>
      <p className="text-[11px] text-zinc-500 mt-1 mb-4">Select a video session to use the Manual Bridge.</p>
    </div>
  )

  const activePrompt = useMemo(() => {
    if (!activeSession?.transcript) return ''
    if (bridge.mode === 'cut-plan') return PROMPT_CUT_PLANNER + '\n\n================ INPUT DATA ================\nvideo_id: ' + activeSession.sourceVideoName + '\ntranscript:\n' + JSON.stringify(activeSession.transcript, null, 2)
    return PROMPT_SCENE_DSL + '\n\n================ INPUT DATA ================\nvideo_id: ' + activeSession?.sourceVideoName + '\nkept_transcript:\n' + JSON.stringify(activeSession?.transcript, null, 2)
  }, [activeSession, bridge.mode])

  const copyPrompt = useCallback(async () => {
    try { await navigator.clipboard.writeText(activePrompt) } catch { const ta = document.createElement('textarea'); ta.value = activePrompt; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta) }
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }, [activePrompt])

  const validateResponse = useCallback(() => {
    if (!bridge.rawResponse.trim()) return
    try {
      const parsed = extractJson(bridge.rawResponse)
      const checks = bridge.mode === 'cut-plan' ? validateCutPlan(parsed, activeSession?.transcript) : validateSceneDSL(parsed, activeSession?.transcript)
      dispatch({ type: 'VALIDATE_BRIDGE_SUCCESS', checks })
    } catch (err: any) {
      dispatch({ type: 'VALIDATE_BRIDGE_ERROR', error: err.message })
    }
  }, [bridge.rawResponse, bridge.mode, activeSession, dispatch])

  return (
    <div className="p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[13px] font-semibold text-zinc-200">Manual Bridge — {bridge.mode === 'cut-plan' ? 'Cut Planner' : 'Scene DSL'}</h2>
          <p className="text-[11px] text-zinc-500 mt-0.5">Copy the prompt → paste into any AI → paste the response back.</p>
        </div>
        <button onClick={() => dispatch({ type: 'CLOSE_BRIDGE' })} className="studio-btn-ghost rounded-md"><X size={14} /></button>
      </div>

      {/* Steps */}
      <div className="flex items-center gap-2">
        {(['prompt', 'paste', 'validate'] as const).map((s, i) => (
          <div key={s} className="flex items-center gap-1">
            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold ${bridge.step === s ? 'bg-[#ec4899] text-zinc-950' : (['prompt', 'paste', 'validate'].indexOf(bridge.step) > i ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-800 text-zinc-500')}`}>
              {['prompt', 'paste', 'validate'].indexOf(bridge.step) > i ? '✓' : i + 1}
            </div>
            <span className={`text-[11px] ${bridge.step === s ? 'text-zinc-200' : 'text-zinc-500'}`}>{s === 'prompt' ? 'Copy' : s === 'paste' ? 'Paste' : 'Check'}</span>
            {i < 2 && <div className="w-4 h-px bg-zinc-700" />}
          </div>
        ))}
      </div>

      {/* Step content */}
      <AnimatePresence mode="wait">
        {bridge.step === 'prompt' && (
          <motion.div key="prompt" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }} transition={{ duration: 0.2 }} className="space-y-2">
            <div className="rounded-xl border border-zinc-700/30 bg-zinc-950/60 p-3 max-h-[300px] overflow-auto">
              <pre className="text-[11px] text-zinc-500 leading-relaxed whitespace-pre-wrap font-mono">{activePrompt.slice(0, 2000)}{activePrompt.length > 2000 ? '\n\n...' : ''}</pre>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-zinc-600">{activePrompt.length} chars</span>
              <div className="flex gap-2">
                <button onClick={copyPrompt} className="studio-btn-primary inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[11px]">{copied ? <ClipboardCheck size={12} /> : <Clipboard size={12} />} {copied ? 'Copied!' : 'Copy Prompt'}</button>
                <button onClick={() => dispatch({ type: 'SET_BRIDGE_STEP', step: 'paste' })} className="studio-btn-secondary rounded-lg px-3 py-2 text-[11px]">Next →</button>
              </div>
            </div>
          </motion.div>
        )}

        {bridge.step === 'paste' && (
          <motion.div key="paste" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }} transition={{ duration: 0.2 }} className="space-y-2">
            <textarea value={bridge.rawResponse} onChange={e => dispatch({ type: 'SET_BRIDGE_RESPONSE', rawResponse: e.target.value })} placeholder="Paste the raw JSON response from your AI model here."
              className="h-[250px] w-full resize-none rounded-xl border border-zinc-700/30 bg-zinc-950/60 p-3 font-mono text-[11px] leading-relaxed text-zinc-300 placeholder-zinc-600 outline-none transition-all duration-150 focus:border-[#ec4899]/60 focus:ring-2 focus:ring-[#ec4899]/20" />
            <div className="flex gap-2">
              <button onClick={validateResponse} disabled={!bridge.rawResponse.trim()} className="studio-btn-primary flex-1 rounded-lg px-4 py-2.5 text-[11px]">Validate</button>
              <button onClick={() => dispatch({ type: 'SET_BRIDGE_STEP', step: 'prompt' })} className="studio-btn-secondary rounded-lg px-3 py-2.5 text-[11px]">←</button>
            </div>
          </motion.div>
        )}

        {bridge.step === 'validate' && (
          <motion.div key="validate" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }} transition={{ duration: 0.2 }} className="space-y-2">
            <div className="rounded-xl border border-zinc-700/30 bg-zinc-950/60 p-3 max-h-[300px] overflow-auto">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[13px] font-semibold text-zinc-300">Validation</span>
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${allPassed(bridge.validationChecks) ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'}`}>{passedCount(bridge.validationChecks).passed}/{passedCount(bridge.validationChecks).total} passed</span>
              </div>
              {bridge.validationChecks.map((c, i) => (
                <div key={i} className="flex items-start gap-2 text-[11px] py-1">
                  <span className={`mt-0.5 shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${c.passed ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>{c.passed ? '✓' : '✗'}</span>
                  <span className={`font-medium ${c.passed ? 'text-zinc-400' : 'text-red-300'}`}>{c.rule}</span>
                </div>
              ))}
            </div>
            {allPassed(bridge.validationChecks) ? (
              <button onClick={() => { dispatch({ type: 'ACCEPT_BRIDGE_RESULT' }); dispatch({ type: 'SET_STAGE', stage: bridge.mode === 'cut-plan' ? 'cut-plan' : 'scene-plan' }) }}
                className="w-full studio-btn-primary inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-[11px]"><Check size={12} /> Accept Result</button>
            ) : (
              <div className="flex gap-2">
                <button onClick={() => { dispatch({ type: 'SET_BRIDGE_STEP', step: 'paste' }); dispatch({ type: 'VALIDATE_BRIDGE_ERROR', error: '' }) }} className="studio-btn-secondary rounded-lg px-3 py-2.5 text-[11px]">← Back</button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {bridge.lastError && (
        <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/[0.08] p-2.5 text-[11px] text-red-300">
          <AlertTriangle size={12} className="mt-0.5 shrink-0" /> {bridge.lastError}
        </div>
      )}
    </div>
  )
}
