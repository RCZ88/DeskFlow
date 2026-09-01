# CC Revamp Plan — Content Engine + Overlay Studio

## Source: CC_revamp01092026.md session + cc_full_spec_fix.md + frontend-component-sourcing skill

## MCP Inventory (tarball-sourced, MCPs not invocable in this runtime)
| Component | Source | Status | Use for |
|-----------|--------|--------|---------|
| BlurFade | Magic UI tarball | ✅ DONE | Entrance animations |
| NumberTicker | React Bits Counter | ✅ DONE | Animated numbers |
| BentoGrid | Magic UI tarball | 🔲 TODO | Dashboard tool grid |
| DecryptedText | React Bits | 🔲 TODO | Hero/title text |
| card/button/tabs/dialog | shadcn CLI (@/components/ui) | ✅ EXISTS | Primitives |

## Revamp Execution Order

### Phase 1: Overlay Studio Shell (connection + layout)
1. StudioSidebar — pipeline steps connected to content engine state, BentoGrid for session library
2. StudioInspector — selection details, overlay properties, collision warnings
3. StudioWorkspace — proper 3-pane with collapse, episode context always visible

### Phase 2: Overlay Studio Views (the 4 remaining)
4. ManualBridgePanel — BlurFade steps, modern prompt display, validation checklist
5. VisualizerView — real canvas surface, safe zones, overlay rendering
6. CutPlanView — already done, polish with BentoGrid
7. ScenePlanView — already done, add DecryptedText for overlay text

### Phase 3: Content Engine Connection
8. ContentEngineWorkspace — sidebar connected to overlay studio, shared context
9. OverlayAssignmentPanel — already done, integrate BentoGrid

### Phase 4: Context + AI
10. ContextProfilePage — already done, add ActivityHeatmap
11. Context-Aware AI Chat — inject profile into system prompt

## LAMINAR Law (applied to every component)
- Hairline borders: border-white/[0.08] instead of box-shadow
- White-only accents — no hue
- Mono labels 11-12px, uppercase, +14% letter-spacing
- Colors from tokens.css only
- No spring bounce — use BlurFade or duration:0.2 ease:[0.16,1,0.3,1]
