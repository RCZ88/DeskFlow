# Design Prompt — IDE Projects Page Revamp

## Raw Request

> There's one simple thing that I would like you to do on this sidebar, that is to make so that the sidebar stuff is more straight out, there's more mind-general padding because it's very condensed together, and it doesn't utilize the height of the sidebar, right? It should be fitting, almost fit it entirely on the sidebar, right? So either add some padding source, some stuff, that's the simple part.
>
> The second part is that we're going to move on to the IDE Projects page. The only useful pages on the IDE Projects really is the overview, right? The overview is just a dashboard, which is, again, not that useful, but it's a good thing but we can make it a little bit better. The Projects page, which is the main thing because you can open the workspace here and open from the IDE, and the AI tools and a little bit on the Git, Git is also a little bit useful, it's very interesting to see those stuff, and we can definitely make it better.
>
> But there isn't this stuff like, for example, the trash, the tools, and the IDE page, it's all kind of useless, like why would you have a list of IDs on the, they're on a separate page in the tools. Like, it only shows the list of tools that you're doing, that you're using, and stuff like that. I feel like we can make it a little bit better, and also the trash, I don't know what that is, or it's for daily permanently to be put together.
>
> I think the better use case for this is that you make a backup. It's a place where you can see the backup files, right? Because if you were doing AI coding, it'll mean that any changes can be restored. Unless they have, they have made a backup for it. So why don't we replace the trash thing? The trash is sort of useless because who the hell drove their things away, and why would you be wanting to be stored by them? So of course, this doesn't make any sense, it should be that it is a backup place.
>
> And for the stuff that I mentioned around there, what is it called? The tools and the IDE, I think we can replace that, or we can revamp that to something better, because it's kind of really useless.
>
> Yeah, I think that's pretty much it for now. I don't see how those start for use useful at all. And if I were to see the, I would like to see an improvement in those. And like, yeah, just basically an improvement on all of those.
>
> I think that's it for now. The sync AI, I think we can put the sync AI on the AI tools. Some page, we don't put it on the top, because that is only sync AI. It's only specific for the AI agents in the AI tools. Some page of the IDE projects here.

## Context
Read `CONTEXT_BUNDLE.md` (in the same directory) for the full codebase context — sidebar structure, IDE Projects page tab layout, all IPC endpoints, design tokens, and current implementation details.

## The Mandate

Design a comprehensive plan for improving the sidebar spacing and revamping the IDE Projects page. You are acting as Lead Designer and Engineer — own the full solution from spacing calculations to tab architecture to data flow.

### Part A — Sidebar Spacing

**Goal:** Better utilize the full sidebar height so items feel evenly distributed and not cramped.

Requirements:
- The sidebar has a fixed width (w-64) and full height (h-screen)
- Currently has a logo header (shrink-0), nav items (space-y-1.5, px-3, py-4), and a footer (shrink-0)
- Need to make it feel "more straight out" with more "mind-general padding" — items should be evenly spread to nearly fill the height
- Items should not pile at the top leaving dead space at the bottom
- Consider: increasing padding between items, vertical centering, distributing items across available height, or a combination
- Must remain scrollable if content overflows

Deliver:
1. **Engineering spec:** Exact CSS/Tailwind class changes — what padding, gap, margin adjustments at each nesting level (sidebar wrapper → nav container → item buttons → footer)
2. **Visual spec:** How much space each section takes (logo, nav items, footer) as a ratio of total height
3. **UX flow:** What happens when there are too many items to fit (scroll behavior)

### Part B — IDE Projects Tab Architecture

**Goal:** Reduce from 8 tabs to fewer, more useful tabs. Replace low-value tabs with high-value replacements.

#### Keep:
| Tab | Rationale |
|-----|-----------|
| **Overview** | Dashboard for quick glance — make it better |
| **Projects** | Core: add/open/scan/manage projects |
| **AI Tools** | AI agent usage, charts, per-agent detail |
| **Git** | Commit history, contributor stats, DORA metrics |

#### Replace/Revamp:

1. **IDEs tab** → Remove or merge. Currently shows detected IDE list (VS Code, etc.). User says "redundant with tools — just a list of IDs on separate page." Either:
   - Merge IDE detection info into Projects (show which IDE each project opens with)
   - Or merge into a consolidated "Environment" tab that combines IDEs + Tools

2. **Tools tab** → Revamp to something more useful. Currently a categorized list of dev tools with expandable groups. User says "it only shows the list of tools that you're using — we can make it better."
   - Ideas: Make it a **Development Environment** dashboard with actionable info (tool health checks, version update suggestions, config analysis)
   - Or integrate it with the IDEs tab into an **Environment** tab

3. **Trash tab** → Replace with **Backup** tab. User says: "The trash is useless. Replace it with a backup place for AI coding changes. If you're doing AI coding, any changes can be restored from backup."
   - Design a backup management UI for AI coding session backups
   - Could show: backup snapshots (timestamps), restore buttons, backup file browser
   - Consider: file-level diffs, session-level restore, backup scheduling
   - Note: Check if any backup IPC endpoints exist in CONTEXT_BUNDLE.md — if not, specify what backend is needed

4. **Analytics tab** → Keep but can be improved. User says "not that useful but a good thing."

#### Move:
- **Sync AI button** → Move from page header into the **AI Tools** tab content. It's specific to AI agent data import, not a page-level action.

Deliver for each tab change:
1. **Architecture decision:** Remove, merge, or replace — and with what
2. **Data processing pipeline:** What data flows where, what IPC calls are needed
3. **Visual spec:** New tab bar layout (which tabs, in what order), icons, active state design
4. **UX flow:** Navigation, empty states, loading states, error states for each new/changed tab
5. **Backend gaps:** Any new IPC handlers or DB tables needed (especially for Backup)

### Part C — Implementation Order

Provide a recommended implementation order that minimizes breakage:
1. Sidebar spacing (isolated change, low risk)
2. Tab reorganization (remove/add tabs, restructure the tab bar)
3. New tab content (Backup tab, Environment revamp)
4. Move Sync AI button
5. Polish (empty states, transitions)

## Constraints
- Tailwind CSS v4 ONLY (`@import "tailwindcss"`) — no v3 directives
- All icons from lucide-react library
- Framer Motion for animations (AnimatePresence, motion.div, etc.)
- Data flows through Electron IPC only (preload bridge → main process)
- No direct Node/DB access in renderer
- The page uses `<PageShell page="ide-projects">` wrapper
- Active tab is persisted to localStorage (`ide-projects-activeTab`)
- Must maintain backward compatibility for existing localStorage keys

## Output Format

Provide a single, comprehensive solution as a markdown specification. Do NOT offer multiple options. Design the best version.

Structure:
```
## Part A: Sidebar Spacing
- Exact class changes
- Visual spec
- Before/after comparison

## Part B: Tab Architecture
### New Tab Bar
- Order, labels, icons
- Render logic

### Tab: Overview (improved)
- Changes from current

### Tab: Projects (keep as-is or minor improvements)
- Any changes needed

### Tab: AI Tools (improved + Sync AI moved in)
- How Sync AI integrates
- Layout changes

### Tab: Git (improved)
- Any changes needed

### Tab: [Environment / New Name] (replaces IDEs + Tools)
- What it shows
- How it's better

### Tab: Backup (replaces Trash)
- Full design spec
- Data model
- IPC requirements

### Tab: Analytics (kept)
- Any improvements

## Part C: Implementation Order
- Step-by-step order

## Backend Audit Table
- For each new feature, list IPC channel, handler, service, DB schema, and whether it exists or needs creation
```
