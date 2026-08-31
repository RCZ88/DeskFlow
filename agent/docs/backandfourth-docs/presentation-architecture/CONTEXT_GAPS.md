# Context Gaps — Presentation Architecture Refactor

| Context Needed | Status | Location | How to Obtain |
|----------------|--------|----------|---------------|
| Full PROMPT_GENERATE_SLIDE text | ✅ Have | prompts.ts:42-101 | Embedded in CONTEXT_BUNDLE |
| htmlParser.ts full implementation | ✅ Have | htmlParser.ts | Embedded in CONTEXT_BUNDLE |
| slideValidator.ts full implementation | ✅ Have | slideValidator.ts | Embedded in CONTEXT_BUNDLE |
| PresentationWorkspace rendering | ✅ Have | PresentationWorkspace.tsx:814-829 | Embedded in CONTEXT_BUNDLE |
| PresentationWorkspace navigation | ✅ Have | PresentationWorkspace.tsx:796-812 | Embedded in CONTEXT_BUNDLE |
| Backend IPC handlers | ✅ Have | main.ts:1908-1975 | Embedded in CONTEXT_BUNDLE |
| Preload bridge | ✅ Have | preload.ts:1722-1733 | Embedded in CONTEXT_BUNDLE |
| DB schema | ✅ Have | main.ts CREATE TABLE | Embedded in CONTEXT_BUNDLE |
| SlidePlan / PlannedSlide types | ✅ Have | promptComposer.ts:1-33 | Embedded in CONTEXT_BUNDLE |
| compilePrompt function | ✅ Have | promptComposer.ts:466-523 | Embedded in CONTEXT_BUNDLE |
| Theme token structure | ⚠️ Partial | prompts.ts:9-40 | Theme presets embedded, full ThemeRegistry can be fetched |
| Visual primitive map | ✅ Have | In prompt text line 66 | metric→hero-number, code→code-block, etc. |
| How `handleAuto` triggers generation | ✅ Have | PresentationWorkspace.tsx:403-428 | Embedded in CONTEXT_BUNDLE |
| What the AI actually outputs today | ❌ Missing | Need real example | Specialist should ask for a sample AI output |
| How existing presentations look in DB | ❌ Missing | Need DB query | Can query if Specialist asks |
| External AI response format expectations | ❌ Missing | Need to define | Specialist should design |
| Whether to keep HTML fallback for old presentations | ❌ Missing | Need decision | Specialist should recommend |
