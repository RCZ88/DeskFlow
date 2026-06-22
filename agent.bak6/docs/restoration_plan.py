#!/usr/bin/env python3
"""
RESTORATION PLAN — App Tracker / DeskFlow
===========================================
Purpose:  Step-by-step fix plan to restore all features lost in 
          the rogue-AI revert (git checkout/restore on May 26, 2026).

Priority Scale: P0 = CRITICAL (app-breaking), P1 = HIGH, P2 = MEDIUM

Usage:  Read this file to understand the fix order. Each fix lists:
  - The file(s) to modify
  - The exact change needed
  - Verification step

After ALL fixes: run `npm run build` and test each feature.

Last Updated: 2026-05-26
"""

RESTORATION_PLAN = []

# ════════════════════════════════════════════════════════════════
#  TIER 0: CRITICAL — App-Breaking Fixes
# ════════════════════════════════════════════════════════════════

RESTORATION_PLAN.append({
    "id": "FIX-001",
    "priority": "P0",
    "area": "Terminal Workspace",
    "title": "Fix TerminalMiniMap props (layout → layouts + missing onToggleDirection)",
    "file": "src/pages/TerminalPage.tsx",
    "lines": "~1533",
    "current": '''<TerminalMiniMap
  layout={terminalLayout}
  layouts={[terminalLayout]}
  terminalTabs={terminalTabs}
  onFocusTerminal={handleFocusTerminal}
  onMoveTerminalToGroup={handleTerminalMoveToGroup}
/>''',
    "target": '''<TerminalMiniMap
  layouts={[terminalLayout]}
  terminalTabs={terminalTabs}
  onFocusTerminal={handleFocusTerminal}
  onMoveTerminalToGroup={handleTerminalMoveToGroup}
  onToggleDirection={(groupIndex, path) => {
    setTerminalLayout(prev => toggleSplitDirection(prev, path));
  }}
/>''',
    "notes": "The current code passes `layout` (singular PaneNode) but TerminalMiniMap expects `layouts` (PaneNode[] array). Also missing `onToggleDirection` handler that calls imported `toggleSplitDirection`.",
    "verification": "Load terminal page → open map tab → TerminalMiniMap renders without TypeScript errors → click + button to split → map updates"
})

RESTORATION_PLAN.append({
    "id": "FIX-002a",
    "priority": "P0",
    "area": "Terminal Workspace",
    "title": "Define handleTerminalMoveToGroup function",
    "file": "src/pages/TerminalPage.tsx",
    "reference": "TERMINAL_AND_WORKSPACE_FEATURES.md #27 (KNOWN BUGS)",
    "action": "Define real handler that dispatches swap in layout. Currently referenced but undefined — breaks DnD in map tab.",
    "target": "Add function that calls swapLeavesInTree or dispatches a CustomEvent for drag-drop reorder.",
    "verification": "Drag a terminal card in map tab → terminal moves to new position"
})

RESTORATION_PLAN.append({
    "id": "FIX-002b",
    "priority": "P0",
    "area": "Terminal Workspace",
    "title": "Define loadSavedConfigs, handleSaveWorkspace, handleLoadWorkspace",
    "file": "src/pages/TerminalPage.tsx",
    "reference": "TERMINAL_AND_WORKSPACE_FEATURES.md #27 (KNOWN BUGS)",
    "action": "These 3 functions are referenced in JSX but never defined. Define them using existing IPC: loadSavedConfigs → get-terminal-layouts, handleSaveWorkspace → save-terminal-layout, handleLoadWorkspace → restore layout from saved config.",
    "verification": "Open configs/sessions tab → save workspace → load workspace → layout restores"
})

# ════════════════════════════════════════════════════════════════
#  TIER 1: HIGH — Core UX Features Lost
# ════════════════════════════════════════════════════════════════

RESTORATION_PLAN.append({
    "id": "FIX-003",
    "priority": "P1",
    "area": "Terminal Workspace",
    "title": "Add missing sidebar tab buttons (Checklists, Skills, Configs, History)",
    "file": "src/pages/TerminalPage.tsx",
    "lines": "~1216-1279 (tab buttons section), ~93 (activeTab type), ~1716-1736+ (render sections)",
    "action": """
1. UPDATE activeTab union type (line 93):
   Add: 'checklists' | 'skills' | 'configs' | 'history'
   Remove or merge: 'terminals' (overlaps with sessions), 'prompts' (merge into configs)
   FINAL: 'presets' | 'sessions' | 'map' | 'analytics' | 'problems' | 'requests' | 'checklists' | 'files' | 'skills' | 'configs' | 'history'

2. ADD tab buttons (after line 1278, before </div>):
   - Checklists: onClick→setActiveTab('checklists'), CheckSquare icon, amber active color
   - Skills: onClick→setActiveTab('skills'), BookOpen icon, cyan active color
   - Configs: onClick→setActiveTab('configs'), Layers icon, cyan active color
   - History: onClick→setActiveTab('history'), MessageSquare icon, cyan active color

3. ADD render sections (after line 1736):
   - activeTab === 'checklists' → render ChecklistsTab
   - activeTab === 'skills' → render SkillsTab  
   - activeTab === 'configs' → render Configs content (project prompt editor + saved workspaces list)
   - activeTab === 'history' → render PromptHistoryTab

4. ADD imports:
   - CheckSquare, BookOpen, Layers, MessageSquare from lucide-react
   - PromptHistoryTab component
""",
    "verification": "Sidebar shows all 10+ tabs. Each tab switches to correct content. No TypeScript errors."
})

RESTORATION_PLAN.append({
    "id": "FIX-004",
    "priority": "P1",
    "area": "Terminal Workspace",
    "title": "Fix duplicate Send/Compose buttons",
    "file": "src/pages/TerminalPage.tsx",
    "action": "User reports 'two send buttons, two compose buttons'. Audit the header area (~lines 1196-1212) and instruction input bar (~lines 1281-1406). Ensure ONE Compose button (opens InstructionPanel) and ONE Quick Send button (opens inline bar). Remove duplicates.",
    "verification": "One Compose button in header. One Quick Send button. No duplicate buttons visible."
})

RESTORATION_PLAN.append({
    "id": "FIX-005",
    "priority": "P1",
    "area": "Terminal Workspace",
    "title": "Restore 'Short Compose' functionality",
    "file": "src/pages/TerminalPage.tsx",
    "action": "User reports 'short compose stuff is also gone'. The Quick Instruction Input Bar section (~lines 1281-1406) with: session target selector, instruction textarea, @mention routing, Send button. Check if this section was stripped in revert and restore it.",
    "verification": "Quick input bar appears, @mention routing works, sends to correct terminal."
})

RESTORATION_PLAN.append({
    "id": "FIX-006",
    "priority": "P1",
    "area": "Terminal Workspace",
    "title": "Fix sidebar orientation/visual issues",
    "file": "src/pages/TerminalPage.tsx",
    "action": "User reports 'sidebar orientation stuff is also gone'. Check: sidebar resize handle, collapse/expand button, tab button styling (active colors/underscore), tab header spacing, content area padding. May be CSS/layout issues from the revert.",
    "verification": "Sidebar resizes correctly, collapse/expand works, tabs show active state properly."
})

RESTORATION_PLAN.append({
    "id": "FIX-007",
    "priority": "P1",
    "area": "Terminal Workspace",
    "title": "Fix 'Q&D context stuff' and 'new style stuff'",
    "file": "src/pages/TerminalPage.tsx + related components",
    "action": "User mentions 'Q&D context stuff and new style stuff' that was lost. This likely refers to: NewSessionDialog's 6-system toggle context map UI, merged prompt preview with 4 collapsible levels, the glass-morphism redesign of problems/requests/checklists tabs (v3.50). Check each and restore.",
    "verification": "NewSessionDialog shows 6 system toggles. Problems/requests/checklists have glass-morphism styling. Character counters visible."
})

# ════════════════════════════════════════════════════════════════
#  TIER 2: MEDIUM — Bugs & Data Issues
# ════════════════════════════════════════════════════════════════

RESTORATION_PLAN.append({
    "id": "FIX-008",
    "priority": "P2",
    "area": "Dashboard / App.tsx",
    "title": "Fix logs overwrite in foreground change handler",
    "file": "src/App.tsx",
    "lines": "~301-315",
    "action": "The foreground change handler calls setLogs(formattedLogs) with ALL data, ignoring selectedPeriod. This causes the 60h→1h bug. Fix: remove setLogs from foreground handler entirely — let the useEffect filter properly.",
    "verification": "Switch periods → data shows correct hours for each period. No inflated hours."
})

RESTORATION_PLAN.append({
    "id": "FIX-009",
    "priority": "P2",
    "area": "Dashboard",
    "title": "Fix weekly chart external key collision",
    "file": "src/pages/DashboardPage.tsx",
    "lines": "~920-1040",
    "action": "External session keys use dayOfWeek (0-6), causing cross-week collision. Use unique date-based keys across both internal and external data paths.",
    "verification": "Multiple weeks of external data show correctly on weekly chart."
})

RESTORATION_PLAN.append({
    "id": "FIX-010",
    "priority": "P2",
    "area": "OrbitSystem",
    "title": "Fix browser filter inconsistency in OrbitSystem",
    "file": "src/components/OrbitSystem.tsx",
    "lines": "~329-335",
    "action": "Browser exclusion/inclusion mismatch between OrbitSystem and StatsPage. Sync the filtering logic.",
    "verification": "Same period shows same browser data in both OrbitSystem and StatsPage."
})

RESTORATION_PLAN.append({
    "id": "FIX-011",
    "priority": "P2",
    "area": "External Page",
    "title": "Fix duplicate External activity buttons",
    "file": "src/pages/ExternalPage.tsx",
    "issue": "Issue #50",
    "action": "Duplicate activity buttons on External page. Remove duplicates, keep one set of activity type buttons.",
    "verification": "Each activity type appears once. No duplicates."
})

RESTORATION_PLAN.append({
    "id": "FIX-012",
    "priority": "P2",
    "area": "Dashboard",
    "title": "Fix recent sessions showing 'Website' for app entries",
    "file": "src/pages/DashboardPage.tsx",
    "issue": "Issue #51",
    "action": "Recent Sessions shows 'Website' for app entries. Fix the activity feed initialization to show correct app names.",
    "verification": "App entries show app name, not 'Website'."
})

RESTORATION_PLAN.append({
    "id": "FIX-013",
    "priority": "P2",
    "area": "Dashboard",
    "title": "Fix heatmap interactions",
    "file": "src/pages/DashboardPage.tsx",
    "issue": "Issue #53",
    "action": """
1. Hour click: select hour only (no day popup)
2. Day column hover: highlight entire column purple
3. Day text click: show day detail page
""",
    "verification": "Each interaction works as specified."
})

# ════════════════════════════════════════════════════════════════
#  FIX ORDER (EXECUTION SEQUENCE)
# ════════════════════════════════════════════════════════════════

FIX_ORDER = [
    # Tier 0 — Must fix first to have a working app
    "FIX-001",  # TerminalMiniMap props
    "FIX-002a", # handleTerminalMoveToGroup
    "FIX-002b", # loadSavedConfigs + workspace functions
    
    # Tier 1 — Core UX
    "FIX-003",  # Missing sidebar tabs
    "FIX-004",  # Duplicate send/compose
    "FIX-005",  # Short compose
    "FIX-006",  # Sidebar orientation
    "FIX-007",  # Q&D context + new style
    
    # Tier 2 — Bugs
    "FIX-008",  # Logs overwrite
    "FIX-009",  # Weekly chart key collision
    "FIX-010",  # Browser filter
    "FIX-011",  # Duplicate buttons
    "FIX-012",  # Recent sessions
    "FIX-013",  # Heatmap interactions
]


def print_plan():
    """Print the complete restoration plan."""
    print("=" * 70)
    print("  COMPLETE RESTORATION PLAN — App Tracker")
    print(f"  Total fixes: {len(RESTORATION_PLAN)}")
    print("=" * 70)
    print()
    
    for tier, label in [("P0", "CRITICAL"), ("P1", "HIGH"), ("P2", "MEDIUM")]:
        fixes = [f for f in RESTORATION_PLAN if f["priority"] == tier]
        if not fixes:
            continue
        print(f"\n{'─' * 70}")
        print(f"  TIER {tier}: {label}")
        print(f"{'─' * 70}")
        for fix in fixes:
            print(f"\n  {fix['id']}: {fix['title']}")
            print(f"    File:    {fix.get('file', 'N/A')}")
            print(f"    Area:    {fix['area']}")
            print(f"    Action:  {fix.get('action', fix.get('notes', 'See target field'))}")
            print(f"    Verify:  {fix.get('verification', 'N/A')}")
    
    print(f"\n\n{'=' * 70}")
    print("  EXECUTION ORDER:")
    print(f"{'=' * 70}")
    for i, fix_id in enumerate(FIX_ORDER, 1):
        fix = next((f for f in RESTORATION_PLAN if f["id"] == fix_id), None)
        if fix:
            print(f"  {i}. {fix['id']}: {fix['title']}")
    
    print(f"\n\n{'=' * 70}")
    print("  AFTER ALL FIXES:")
    print(f"{'=' * 70}")
    print("  1. Run: npm run build")
    print("  2. Test each feature listed in HUMAN_TEST_CHECKLIST.md")
    print("  3. Run maintain-context skill: python agent/skills/maintain-context/graphify_maintain.py rebuild")
    print("  4. Update state.md with new version")


if __name__ == "__main__":
    print_plan()
