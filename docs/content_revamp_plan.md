# Content Creation Page — Complete Revamp Plan

## Scope: src/features/content-engine/ ONLY

## Files to Revamp (11 total)
1. ContentEngineWorkspace.tsx — main layout + sidebar
2. IdeasView.tsx — kanban board
3. EpisodesView.tsx — episode detail + overlay panel
4. SeriesView.tsx — series management
5. ThemesView.tsx — theme cards
6. AnalyticsView.tsx — video cards, stats
7. LessonsView.tsx — lesson cards
8. FrameworksView.tsx — framework cards
9. ProcessGalleryView.tsx — gallery cards
10. PlaybookView.tsx — playbook sections
11. BrainstormView.tsx — thought capture

## Problems
1. Sidebar disconnected from Overlay Studio — no shared state
2. Colors — raw hex (#f5c518, #00d4ff, #ec4899) instead of tokens
3. Fonts — no Geist/Space Grotesk/JetBrains Mono hierarchy
4. Width — elements overlapping, no min-w-0, no proper grid
5. No MCP components — BlurFade, NumberTicker, BentoGrid, DecryptedText
6. No skill patterns — frontend-design, human-centred-UX, impeccable

## LAMINAR Law (every component)
- Hairline borders: border-white/[0.08]
- White-only accents (except semantic: emerald=success, rose=error, amber=warning)
- Mono labels 11-12px, uppercase, tracking-wider
- Fonts: Geist (body), Space Grotesk (display), JetBrains Mono (labels)
- No spring bounce — BlurFade or duration:0.2 ease:[0.16,1,0.3,1]
- min-w-0 on all flex children
- gap-3 grid, no manual margins

## Shared Components (create once, use everywhere)
- BlurFade — entrance animation
- NumberTicker — animated numbers (exists in @/components/ui/)
- BentoCard — dashboard cards
- SectionHeader — consistent section headers
- StatusChip — status indicators

## Execution Order
1. Create shared LAMINAR components
2. ContentEngineWorkspace.tsx — sidebar + layout
3. IdeasView.tsx — kanban
4. EpisodesView.tsx — episode detail
5. SeriesView.tsx — series
6. ThemesView.tsx — themes
7. AnalyticsView.tsx — analytics
8. LessonsView.tsx — lessons
9. FrameworksView.tsx — frameworks
10. ProcessGalleryView.tsx — gallery
11. PlaybookView.tsx — playbook
12. BrainstormView.tsx — brainstorm

## Font Setup
- Import Space Grotesk + JetBrains Mono from Google Fonts in index.html (already there)
- Use font-mono for labels, font-sans for body (Geist)
