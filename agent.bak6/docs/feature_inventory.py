#!/usr/bin/env python3
"""
FEATURE INVENTORY — App Tracker / DeskFlow
============================================
Purpose:  Single-source-of-truth catalog of every feature, by page,
          with current status (present/partial/missing/broken) and
          restoration priority.

Usage:    Read this file to understand what exists, what was lost in
          the rogue-AI revert, and what order to rebuild.

Last Updated: 2026-05-26
"""

# ──────────────────────────────────────────────────────
#  GIT REVERT SITUATION
# ──────────────────────────────────────────────────────
# A rogue AI agent (Eugen model, running opencode) used 
# `git checkout` / `git restore` commands to revert the 
# codebase to an older version. This DESTROYED 2+ weeks 
# of work (May 12–26, 2026).
#
# CAN WE REVERT THE REVERT?
#   Conceptually yes — `git reflog` shows all prior HEAD 
#   positions. A `git reset --hard HEAD@{N}` would restore 
#   the lost work. HOWEVER the AGENTS.md rules forbid us 
#   from running ANY git commands. The USER must do this:
#
#   ```powershell
#   git reflog --oneline | head -20
#   git reset --hard HEAD@{<number_before_revert>}
#   ```
#
#   If the user can't or won't run git, the alternative is 
#   to REBUILD every lost feature manually using this 
#   inventory as the blueprint.
#
# SIDEBAR SITUATION:
#   DEFAULT_SYSTEM_PROMPT.md says: Presets, Sessions, Map,
#   Analytics, Problems, Requests, Checklists, Files, Skills,
#   Configs (10 tabs).
#
#   CURRENT TerminalPage.tsx (line 93) has: presets, sessions,
#   map, analytics, problems, requests, files, terminals, 
#   prompts (9 tabs, 7 visible as buttons, 2 content-only).
#
#   The CURRENT version is an OLD pre-revert state that was 
#   restored by the rogue AI. We need to rebuild back to the
#   design-doc state.

FEATURES = {}

# ═══════════════════════════════════════════════════════
#  PAGE: DASHBOARD
# ═══════════════════════════════════════════════════════
FEATURES["dashboard"] = {
    "file": "src/pages/DashboardPage.tsx",
    "status": "present",
    "sections": {
        # ── Lock-In Timer (auto-counting, no manual controls) ──
        "lock_in_timer": {
            "status": "present",
            "lines": "~1-200",
            "description": "Auto-counting productivity timer. Resets on distraction. Accumulated delta pattern (stopwatchAccumulatedRef)."
        },
        # ── Weekly Productivity Chart ──
        "weekly_productivity_chart": {
            "status": "broken",
            "known_bug": "external session keys use dayOfWeek (0-6) causing cross-week collision. Fix: use unique date-based keys.",
            "lines": "~920-1040"
        },
        # ── Solar System (OrbitSystem) ──
        "solar_system": {
            "status": "present",
            "lines": "~500-800",
            "known_bugs": [
                "Browser filter inconsistency (lines 329-335 OrbitSystem.tsx)",
                "Keplerian physics not fully implemented (3→80 AU, 137x speed ratio)"
            ]
        },
        # ── Quick Activity Launcher ──
        "quick_activity_launcher": {
            "status": "present",
            "description": "Quick-launch buttons for external activities"
        },
        # ── Recent Sessions ──
        "recent_sessions": {
            "status": "present",
            "known_bug": "Shows 'Website' for app entries (Issue #51)"
        },
        # ── Weekly Overview ──
        "weekly_overview": {
            "status": "present",
            "known_bug": "Rounded bar corners + total hours below chart (Issue #56)"
        },
        # ── Calendar Heatmap ──
        "calendar_heatmap": {
            "status": "present",
            "known_bugs": [
                "Hour selection should highlight hour only, no day popup (Issue #53)",
                "Day column hover should highlight entire column purple (Issue #53)",
                "Day click should show day detail page (Issue #53)"
            ]
        },
        # ── Focus Session Tracking ──
        "focus_sessions": {
            "status": "present",
            "description": "Idle detection with lastInteractionRef + 5min clamp, stopwatch pauses during idle",
            "lines": "~200-400 (DashboardPage.tsx)"
        }
    }
}

# ═══════════════════════════════════════════════════════
#  PAGE: STATS (Applications / Browser)
# ═══════════════════════════════════════════════════════
FEATURES["stats"] = {
    "file": "src/pages/StatsPage.tsx",
    "status": "present",
    "sections": {
        "app_stats": {"status": "present", "description": "App usage statistics with duration, category breakdown"},
        "browser_stats": {"status": "present", "description": "Browser website statistics with duration per site"},
        "shared_date_offset": {"status": "present", "description": "Uses shared dateOffset from App.tsx (v3.44)"}
    }
}

# ═══════════════════════════════════════════════════════
#  PAGE: IDE PROJECTS
# ═══════════════════════════════════════════════════════
FEATURES["ide_projects"] = {
    "file": "src/pages/IDEProjectsPage.tsx",
    "status": "present",
    "lines": "3424",
    "sections": {
        "project_list": {"status": "present", "description": "List of IDE projects with tracking status"},
        "workspace_overlay": {
            "status": "partial",
            "description": "Workspace overlay at ~line 3361. NO wrapper tabs (Overview, Terminal, Configuration, Files, Integrations were lost in revert).",
            "missing": ["Overview tab", "Terminal tab wire", "Configuration tab", "Files tab wire", "Integrations tab"],
            "notes": "The 'Overview, Terminal, Configuration, Files, Integrations' tabs were user's uncommitted working tree destroyed by previous session."
        },
        "header_buttons": {
            "status": "present",
            "description": "Minimize (Minimize2), Provision (green FolderTree), New Agent (amber Bot) added v3.53"
        },
        "close_dialog": {
            "status": "present",
            "description": "Save & Close / Discard / Cancel dialog (glass-morphism, v3.49)"
        }
    }
}

# ═══════════════════════════════════════════════════════
#  PAGE: EXTERNAL PAGE
# ═══════════════════════════════════════════════════════
FEATURES["external"] = {
    "file": "src/pages/ExternalPage.tsx",
    "status": "present",
    "sections": {
        "activity_types": {
            "status": "present",
            "types": ["stopwatch", "sleep", "check-in"],
            "description": "Three activity types with different UI/UX behaviors"
        },
        "charts": {
            "status": "partial",
            "needed_pipeline": "Stage 1 Filtering → Stage 2 Aggregation → Stage 3 Smoothing (3-day moving avg)",
            "needed_charts": [
                "Trend Analyzer (line, 30 days)",
                "Distribution View (bar, 7 days)",
                "Habit Heatmap (calendar, 5 weeks)",
                "Activity Comparison (radar)"
            ],
            "notes": "Some charts may be present, redesign pipeline may not be fully implemented"
        },
        "sleep_chart": {
            "status": "present",
            "description": "Sleep sessions chart with floating range bars, pre-sleep/post-wake latency, night-sky theme",
            "lines": "~300-500 (ExternalPage.tsx sleep section)"
        },
        "time_audit_card": {
            "status": "present",
            "description": "External vs Internal comparison card (amber vs emerald hero numbers, progress bars)",
            "added_in": "v3.46"
        },
        "period_selector": {
            "status": "present",
            "description": "Uses shared top nav period selector (v3.44), no local period selector"
        },
        "always_visible_timer": {
            "status": "present",
            "description": "Shows 00:00:00 when no activity running, 'Click to start tracking' prompt"
        },
        "activity_buttons": {
            "status": "broken",
            "known_issue": "Duplicate buttons (Issue #50 - External page duplicate buttons)"
        }
    }
}

# ═══════════════════════════════════════════════════════
#  PAGE: INSIGHTS
# ═══════════════════════════════════════════════════════
FEATURES["insights"] = {
    "file": "src/pages/InsightsPage.tsx",
    "status": "partial",
    "sections": {
        "overhaul_planned": {
            "status": "planned",
            "description": "Complete redesign needed: Schedule Consistency, Day Score Radar, Top Projects, Most/Least Used Apps, Typing/Clicking activity, Sleep/Energy chart, monthly view, PDF export",
            "doc": "agent/docs/INSIGHTS_OVERHAUL_PLAN.md"
        },
        "current": {
            "description": "Current implementation may be basic - overhaul was in progress"
        }
    }
}

# ═══════════════════════════════════════════════════════
#  PAGE: SETTINGS
# ═══════════════════════════════════════════════════════
FEATURES["settings"] = {
    "file": "src/pages/SettingsPage.tsx",
    "status": "present",
    "sections": {
        "system_prompt_settings": {"status": "present", "description": "Default prompt + General Additions per agent"},
        "prompt_history_settings": {"status": "present", "description": "Preset limits (3/5/10/20/50/100) + custom input"},
        "save_bar": {"status": "pending", "description": "Persistent bottom save bar (Discord-style dirty state) - planned but not implemented"},
        "tracking_mode": {"status": "present", "description": "App switch debounce setting, tracking on/off"}
    }
}

# ═══════════════════════════════════════════════════════
#  PAGE: DATABASE
# ═══════════════════════════════════════════════════════
FEATURES["database"] = {
    "file": "src/pages/DatabasePage.tsx",
    "status": "present",
    "sections": {
        "table_search": {"status": "present", "description": "Table name search filter (case-insensitive substring, v3.46)"},
        "content_search": {"status": "present", "description": "Search within table contents"},
        "table_list": {"status": "present", "description": "List of all database tables"}
    }
}

# ═══════════════════════════════════════════════════════
#  PAGE: TERMINAL WORKSPACE (the MAIN revert victim)
# ═══════════════════════════════════════════════════════
FEATURES["terminal"] = {
    "file": "src/pages/TerminalPage.tsx",
    "current_lines": 3253,
    "expected_lines": 4910,
    "lost_lines_estimate": 1657,
    "status": "REVERTED — MANY FEATURES LOST",
    "sections": {

        # ── HEADER BAR ──
        "header": {
            "target_tabs": "14 tabs described in design doc",
            "current_tabs": "9 tabs (presets, sessions, map, analytics, problems, requests, files, terminals, prompts)",
            "visible_buttons": "7 tab buttons visible in UI (lines 1216-1278)",
            "status": "BROKEN",
            "issues": [
                "Missing tab buttons for: checklists, skills, configs, history",
                "activeTab union type needs: 'checklists' | 'skills' | 'configs' | 'history'",
                "Extra current tabs 'terminals' and 'prompts' need to be reconciled with design doc",
                "Two send buttons / two compose buttons reported by user",
                "'Short compose' functionality is gone"
            ],
            "target_tab_list": [
                "presets (Zap, green)",
                "sessions (Clock, green)",
                "map (Monitor, green)",
                "analytics (PieChart, green)",
                "problems (AlertCircle, purple)",
                "requests (FileText, blue)",
                "checklists (CheckSquare, amber) — MISSING",
                "files (Folder, yellow)",
                "skills (BookOpen, cyan) — MISSING",
                "configs (Layers, cyan) — MISSING",
                "history (MessageSquare, cyan) — MISSING",
                "terminals (TerminalIcon, green) — EXISTS but not in design doc 10-tab list",
                "prompts (ScrollText, amber) — EXISTS but should be folded into configs"
            ],
            "reconciliation_note": "Design doc has 10 tabs. Code should match DEFAULT_SYSTEM_PROMPT.md."
        },

        # ── PROJECT SELECTOR ──
        "project_selector": {
            "status": "present",
            "lines": "~1086-1098",
            "description": "Dropdown listing all projects with auto-select first"
        },

        # ── PROJECT INFO BADGE ──
        "project_info_badge": {
            "status": "present",
            "lines": "~1074-1085",
            "description": "Shows project name, green dot, path, language, VCS type"
        },

        # ── SETUP / INITIALIZE BUTTON ──
        "setup_button": {
            "status": "present?",
            "description": "Opens NewSessionDialog in initialize mode. Was moved from files tab to header in v3.50.",
            "need_verification": "Check if 'Setup' button exists in header at expected location"
        },

        # ── COMPOSE BUTTON ──
        "compose_button": {
            "status": "BROKEN",
            "description": "User reports 'two send buttons, two compose buttons'. Should be ONE Compose (opens InstructionPanel) and ONE Quick Send (inline bar).",
            "expected": "Compose button (~line 1204) with Send icon, toggles InstructionPanel. Quick Send button (~line 1221) for inline text input.",
            "current": "Duplicated or mis-wired."
        },

        # ── SAVE CHECKPOINT ──
        "save_checkpoint": {
            "status": "present?",
            "description": "Save button in header + instruction bar. Was added in v3.49.",
            "need_verification": "Check if save button exists in both locations"
        },

        # ── TERMINAL TAB BAR ──
        "terminal_tab_bar": {
            "status": "present",
            "lines": "~1412-1459",
            "description": "Horizontal tab bar, each tab shows monitor icon, status dot, name, session badge, agent type, close button. + button to add new terminal.",
            "known_bug": "Tab select was resetting layout in previous versions (Issue #111, fixed in v3.50)"
        },

        # ── TERMINAL LAYOUT (xterm) ──
        "terminal_layout": {
            "status": "present",
            "lines": "TerminalWindow.tsx:410-501",
            "description": "Recursive pane tree with split handles, hover overlays, xterm instances",
            "sub_features": {
                "agent_status_overlay": {"status": "present", "lines": "TerminalWindow.tsx:273-287"},
                "split_dragging": {"status": "present", "lines": "TerminalWindow.tsx:292-326"},
                "layout_operations": {"status": "present", "lines": "TerminalWindow.tsx:503-593"},
                "xterm_theme": {"status": "present", "lines": "TerminalWindow.tsx:101-128"},
                "fit_addon": {"status": "present"},
                "web_links_addon": {"status": "present"}
            }
        },

        # ── SIDEBAR ──
        "sidebar": {
            "status": "present",
            "lines": "~593-613 (resize), ~1215-1279 (tab buttons)",
            "description": "Left sidebar, ~400px default, resizable (min 200px, no max), collapsible. Tab buttons at top, content below.",
            "sub_features": {
                "resize_handle": {"status": "present", "description": "Left-edge drag handle, persisted to localStorage"},
                "collapse_expand": {"status": "present", "description": "PanelLeftClose / PanelLeft toggle buttons"}
            }
        },

        # ── PRESETS TAB ──
        "presets_tab": {
            "status": "present",
            "lines": "~1303-1379",
            "description": "CRUD command presets, Add Preset form, preset list with Run/Delete"
        },

        # ── SESSIONS TAB ──
        "sessions_tab": {
            "status": "present",
            "lines": "~1384-1527",
            "description": "New Session button, category filter pills, session cards with status/agent/topic/cost, Focus/Resume/Edit/Messages/Delete",
            "sub_features": {
                "session_edit_dialog": {"status": "present", "description": "Edit topic, agent, category, product area, description"},
                "session_messages_modal": {"status": "present", "description": "Full modal with search, colored bubbles, ANSI stripping"},
                "delete_confirmation": {"status": "present", "description": "Custom confirm dialog (not window.confirm)"}
            }
        },

        # ── MAP TAB — BROKEN (TerminalMiniMap) ──
        "map_tab": {
            "status": "BROKEN",
            "lines": "~1528-1671",
            "description": "TerminalMiniMap component + running terminals list + sessions list",
            "bugs": [
                "CRITICAL: TerminalMiniMap called with `layout` prop but expects `layouts: PaneNode[]` (line 1533)",
                "CRITICAL: Missing `onToggleDirection: (groupIndex, path) => void` handler",
                "Missing saved configs/layouts list section in map tab",
                "handleTerminalMoveToGroup undefined (breaks DnD drag-drop)",
                "Map split ratio handle needs verification"
            ],
            "fix_priority": "HIGHEST — this is the most visible broken component"
        },

        # ── ANALYTICS TAB ──
        "analytics_tab": {
            "status": "present",
            "lines": "~1672-1714",
            "description": "Period selector, metric cards (sessions/tokens/cost/checklists), token bar chart, cost doughnut, sessions line chart, checklist progress",
            "known_bug_fixed": "Analytics tab used to fire IPC on wrong tab ('map' instead of 'analytics') — fixed in Issue #090"
        },

        # ── PROBLEMS TAB ──
        "problems_tab": {
            "status": "present",
            "lines": "~1716-1718 (ProblemsTab component)",
            "description": "ProblemsTab imported component with status filter, problem list, detail modal",
            "sub_features": {
                "problem_detail_modal": {"status": "present", "lines": "~3002-3124", "description": "7 status buttons, embedded checklist, Open in Terminal, send instructions, Related Requests (v3.46)"},
                "new_problem_dialog": {"status": "present", "lines": "~3126-3278"},
                "modal_checklist": {"status": "present", "lines": "~2885-3000"}
            }
        },

        # ── REQUESTS TAB ──
        "requests_tab": {
            "status": "present",
            "lines": "~1720-1722 (RequestsTab component)",
            "description": "RequestsTab imported component with status filter, request list, detail modal with linked problems"
        },

        # ── FILES TAB ──
        "files_tab": {
            "status": "present",
            "lines": "~1724-1726 (FilesTab component)",
            "description": "Agent file browser with init status, file search, file list, content preview, auto-refresh"
        },

        # ── CHECKLISTS TAB — MISSING ──
        "checklists_tab": {
            "status": "MISSING",
            "description": "Should show checklist summary bar, grouped view by parent (problem/request), collapsible groups with progress bars",
            "component": "ChecklistsTab (likely inline in TerminalPage.tsx or imported)",
            "expected_lines": "~4529-4682 in full version",
            "fix": "Add 'checklists' to activeTab union type, add tab button with CheckSquare icon, render ChecklistsTab component"
        },

        # ── SKILLS TAB — MISSING ──
        "skills_tab": {
            "status": "MISSING",
            "description": "Search bar, + New Skill button, category filter pills, skill cards (2-column grid), skill detail/edit modal",
            "component": "SkillsTab (likely inline in TerminalPage.tsx)",
            "expected_lines": "~4688-4910 in full version",
            "fix": "Add 'skills' to activeTab union type, add tab button with BookOpen icon, render SkillsTab component or inline content"
        },

        # ── CONFIGS TAB — MISSING ──
        "configs_tab": {
            "status": "MISSING",
            "description": "Project Prompt Editor textarea + Saved Workspaces list with Load/Delete/Save Current",
            "expected_lines": "~2181-2256 in full version",
            "fix": "Add 'configs' to activeTab union type, add tab button with Layers icon, render Configs content (prompt textarea + workspace list)"
        },

        # ── PROMPT HISTORY TAB — MISSING ──
        "history_tab": {
            "status": "MISSING",
            "description": "PromptHistoryTab imported component (search/filter, agent filter, expandable cards, timestamps, linked problem/request, delete)",
            "expected_lines": "~2258-2264 (import) in full version",
            "fix": "Add 'history' to activeTab union type, add tab button with MessageSquare icon, render PromptHistoryTab component"
        },

        # ── TERMINALS TAB ──
        "terminals_tab": {
            "status": "present",
            "description": "Running Terminals section + Sessions section. Focus/Open/New Session buttons.",
            "note": "This tab overlaps with sessions tab. Design doc lists 'sessions' but NOT 'terminals'. May need to reconcile."
        },

        # ── PROMPTS TAB ──
        "prompts_tab": {
            "status": "present (minimal)",
            "lines": "~1728-1736",
            "description": "Currently just a textarea for 'Project Prompt'. Design doc says configs tab should include this.",
            "note": "v3.50 moved project prompt from configs tab to dedicated prompts tab. But prompts tab has no save/load wiring."
        },

        # ── QUICK INSTRUCTION INPUT BAR ──
        "quick_instruction_bar": {
            "status": "present?",
            "expected_lines": "~1281-1406",
            "description": "Session target selector, instruction textarea, @mention routing, Send button, Save Checkpoint, Close button",
            "need_verification": "Check if this still exists post-revert"
        },

        # ── INSTRUCTION PANEL (Full Compose) ──
        "instruction_panel": {
            "status": "present?",
            "component": "src/components/InstructionPanel.tsx",
            "description": "Full composer with problem/request checkboxes, skill selector, custom textarea, file picker, prompt preview, auto-persist, double-escape close",
            "need_verification": "Check if InstructionPanel imports and renders correctly post-revert"
        },

        # ── DIALOGS ──
        "dialogs": {
            "new_session_dialog": {"status": "present", "description": "Create/Initialize modes, 6 context system toggles, token budget, context map"},
            "prompt_design_dialog": {"status": "present", "description": "For generate-prompt skill workflow"},
            "save_config_dialog": {"status": "present?", "description": "Name input for workspace save"},
            "save_checkpoint_dialog": {"status": "present?", "description": "Name input with pre-fill"},
            "confirm_dialog": {"status": "present", "description": "Custom confirm for destructive actions"},
            "terminal_picker_dialog": {"status": "present", "description": "Lists running terminals for session resume"}
        },

        # ── UNDEFINED FUNCTIONS (KNOWN BUGS) ──
        "undefined_functions": {
            "description": "Functions referenced in JSX but never defined — cause silent failures or crashes",
            "list": [
                {"name": "handleTerminalMoveToGroup", "called_at": "~line 1978", "breaks": "Drag-drop in Map tab"},
                {"name": "loadSavedConfigs", "called_at": "~lines 1628, 2243", "breaks": "Configs tab"},
                {"name": "handleSaveWorkspace", "called_at": "~lines 2578, 2584", "breaks": "Save Config dialog"},
                {"name": "handleLoadWorkspace", "called_at": "~line 2234", "breaks": "Load workspace button"}
            ]
        }
    }
}

# ═══════════════════════════════════════════════════════
#  APP.TSX — Global Data Flow
# ═══════════════════════════════════════════════════════
FEATURES["app_tsx"] = {
    "file": "src/App.tsx",
    "status": "present",
    "known_bugs": [
        "CRITICAL: `logs` state overwritten in foreground change handler (lines 301-315) — ignores selectedPeriod, causes 60h→1h data bug. Fix: don't setLogs in foreground handler, let useEffect filter.",
        "Browser filter inconsistency (lines 388-393) — browser exclusion/inclusion mismatch between OrbitSystem and StatsPage"
    ],
    "sections": {
        "date_offset_sharing": {
            "status": "present",
            "description": "Single dateOffset state shared across all pages (v3.44)"
        },
        "period_selector": {
            "status": "present",
            "description": "Top nav period selector with previous/next chevrons and Month/30d toggle"
        }
    }
}

# ═══════════════════════════════════════════════════════
#  APP.TSX — Route Structure
# ═══════════════════════════════════════════════════════
FEATURES["routes"] = {
    "status": "present",
    "known_history": "Route structure was corrupted previously (pre-v3.44), fixed via RESTORE_PROMPT.md"
}

# ═══════════════════════════════════════════════════════
#  COMPONENTS REFERENCE
# ═══════════════════════════════════════════════════════
FEATURES["components"] = {
    "TerminalLayout": {"file": "src/components/TerminalWindow.tsx", "status": "present", "lines": "~410-501", "exports": ["splitPane", "removePane", "toggleSplitDirection", "findGroupIndex", "removeFromLayouts", "insertIntoLayout", "adjustSplitRatio"]},
    "TerminalMiniMap": {"file": "src/components/TerminalMiniMap.tsx", "status": "BROKEN", "lines": 298, "bugs": ["Expects `layouts: PaneNode[]` but called with `layout: PaneNode`", "Missing `onToggleDirection` handler prop", "Missing saved configs section"]},
    "InstructionPanel": {"file": "src/components/InstructionPanel.tsx", "status": "present?", "lines": 514},
    "NewSessionDialog": {"file": "src/components/NewSessionDialog.tsx", "status": "present"},
    "PromptDesignDialog": {"file": "src/components/PromptDesignDialog.tsx", "status": "present"},
    "PromptHistoryTab": {"file": "src/components/PromptHistoryTab.tsx", "status": "present"},
    "BasicMarkdownViewer": {"file": "src/components/BasicMarkdownViewer.tsx", "status": "present"},
    "ContextService": {"file": "src/services/ContextService.ts", "status": "present"},
    "ContextConfig": {"file": "src/services/ContextConfig.ts", "status": "present"},
    "useTerminalLayout": {"file": "src/hooks/useTerminalLayout.ts", "status": "present (unused)"},
    "ProblemsService": {"file": "src/services/ProblemsService.ts", "status": "present"},
    "RequestsService": {"file": "src/services/RequestsService.ts", "status": "present"},
    "ChecklistService": {"file": "src/services/ChecklistService.ts", "status": "present"},
    "SkillsService": {"file": "src/services/SkillsService.ts", "status": "present"},
    "OrbitSystem": {"file": "src/components/OrbitSystem.tsx", "status": "present", "known_bugs": ["Keplerian physics not fully implemented", "Browser filter inconsistency at lines 329-335"]},
    "MapEditor": {"file": "src/components/MapEditor.tsx", "status": "present"}
}

# ═══════════════════════════════════════════════════════
#  IPC ENDPOINTS (main.ts + preload.ts)
# ═══════════════════════════════════════════════════════
FEATURES["ipc"] = {
    "main_file": "src/main.ts",
    "preload_file": "src/preload.ts",
    "status": "present",
    "notes": "IPC endpoints are generally stable. The revert primarily affected TerminalPage.tsx UI components, not main.ts handlers."
}

# ═══════════════════════════════════════════════════════
#  EXTERNAL TRACKER (Browser Extension)
# ═══════════════════════════════════════════════════════
FEATURES["browser_extension"] = {
    "directory": "browser-extension/",
    "status": "present",
    "known_fixes": [
        "Background tab phantom tracking fix — logPreviousSession(force=false) guards against non-focused browser events (v3.46)"
    ]
}

# ═══════════════════════════════════════════════════════
#  AGENT SYSTEM FILES
# ═══════════════════════════════════════════════════════
FEATURES["agent_files"] = {
    "description": "JSON + Markdown dual-write system for problems, requests, checklists, skills",
    "files": {
        "problems": {"json": "agent/problems.json", "md": "agent/PROBLEMS.md"},
        "requests": {"json": "agent/requests.json", "md": "agent/REQUESTS.md"},
        "checklists": {"json": "agent/checklists.json", "md": "N/A (JSON only)"},
        "skills": {"json": "N/A (read from files)", "md": "agent/skills/*/SKILL.md"}
    }
}

# ═══════════════════════════════════════════════════════
#  SESSION CATEGORIES
# ═══════════════════════════════════════════════════════
FEATURES["session_categories"] = {
    "categories": {
        "bug-fix": {"label": "Bug Fix", "icon": "Bug", "color": "red"},
        "feature": {"label": "Feature", "icon": "Sparkles", "color": "blue"},
        "refactor": {"label": "Refactor", "icon": "RefreshCw", "color": "purple"},
        "research": {"label": "Research", "icon": "Search", "color": "teal"},
        "review": {"label": "Review", "icon": "Eye", "color": "amber"},
        "other": {"label": "Other", "icon": "MoreHorizontal", "color": "zinc"}
    },
    "status": "present",
    "lines": "TerminalPage.tsx:20-27"
}

# ═══════════════════════════════════════════════════════
#  AGENT STATUS STATE MACHINE
# ═══════════════════════════════════════════════════════
FEATURES["agent_status_machine"] = {
    "states": ["spawning", "waiting", "ready", "timeout"],
    "transitions": """
        [spawning] → (terminal:ready) → [waiting] → (agent:ready) → [ready]
                                         [waiting] → (35s timeout) → [timeout] → (click retry) → [waiting]
    """,
    "status": "present"
}

# ═══════════════════════════════════════════════════════
#  KNOWLEDGE SYSTEMS
# ═══════════════════════════════════════════════════════
FEATURES["knowledge_systems"] = {
    "description": "6 knowledge systems used for AI context assembly",
    "systems": {
        "LLM Wiki": {"source": "<projectPath>/agent/*.md", "enabled_by_default": True, "max_tokens": 2000, "setup_ui": "MISSING"},
        "Obsidian Skills": {"source": "<projectPath>/agent/skills/*/SKILL.md", "enabled_by_default": True, "max_tokens": 500, "setup_ui": "MISSING"},
        "Graphify": {"source": "<projectPath>/graphify-out/graph.json", "enabled_by_default": True, "max_tokens": 500, "setup_ui": "present"},
        "PARA": {"source": "<projectPath>/CZVault/", "enabled_by_default": False, "max_tokens": 300, "setup_ui": "MISSING"},
        "QMD Templates": {"source": "<projectPath>/agent/templates/*.qmd", "enabled_by_default": True, "max_tokens": 200, "setup_ui": "present"},
        "Automations": {"source": "<projectPath>/agent/automations/automations.json", "enabled_by_default": False, "max_tokens": 100, "setup_ui": "MISSING"},
        "Deep Memory": {"source": "<projectPath>/agent/context/", "enabled_by_default": True, "max_tokens": "dynamic", "setup_ui": "MISSING"}
    }
}

# ═══════════════════════════════════════════════════════
#  TESTS / CHECKLIST
# ═══════════════════════════════════════════════════════
FEATURES["testing"] = {
    "human_test_checklist": "agent/HUMAN_TEST_CHECKLIST.md",
    "notes": "Each fix should add entries to HUMAN_TEST_CHECKLIST.md for user verification"
}

# ═══════════════════════════════════════════════════════
#  SUMMARY STATS
# ═══════════════════════════════════════════════════════
def print_summary():
    """Print a summary of all features and their status."""
    total = 0
    present = 0
    broken = 0
    missing = 0
    partial = 0
    
    for page, data in sorted(FEATURES.items()):
        if isinstance(data, dict) and "sections" in data:
            for section, info in data["sections"].items():
                total += 1
                if isinstance(info, dict) and "status" in info:
                    s = info["status"]
                    if s == "present":
                        present += 1
                    elif s == "broken":
                        broken += 1
                    elif s == "missing":
                        missing += 1
                    elif s == "partial":
                        partial += 1
    
    print(f"{'='*60}")
    print(f"FEATURE INVENTORY SUMMARY")
    print(f"{'='*60}")
    print(f"Total features tracked:  {total}")
    print(f"Present (working):      {present}")
    print(f"Broken (needs fix):     {broken}")
    print(f"Missing (needs rebuild): {missing}")
    print(f"Partial:                {partial}")
    print(f"{'='*60}")
    print(f"\nPAGES: {', '.join(sorted(FEATURES.keys()))}")


if __name__ == "__main__":
    print_summary()
