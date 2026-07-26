# CONTEXT_BUNDLE.md — AI Assistant Page Visual Redesign

## Project Context

This is part of the App Tracker project, a comprehensive goal tracking and productivity application. The AI Assistant page (`src/pages/AiPage.tsx`) is a key component that provides intelligent assistance for daily goal management.

## Current Implementation

### Core Files Modified

#### `src/pages/AiPage.tsx` (lines 67-337)
- **Current Structure:** Three main zones (Focus/Plan/Reflect) with 12-column grid layout
- **Header:** Mode-aware header with dynamic title, description, and action buttons
- **Section Layout:** Numbered sections (01 FOCUS / 02 PLAN / 03 REFLECT) with visual hierarchy
- **Components:** DailyPlanCard, ContextSummaryCard, MyPlanCard, LongTermPlanCard, TopicDigestCard, GoalHistoryCard
- **State Management:** Goals, suggestions, reviews, loading states, error handling
- **IPC Integration:** Uses `window.deskflowAPI` for goals, planning, digests, and suggestions

#### `src/components/GlassCard.tsx` (lines 1-41)
- **Purpose:** Base card component with 7 variants (default, compact, subtle, notebook, bordered, elevated, interactive)
- **Variants:** Each variant has distinct background, blur, border, and shadow properties
- **Accent System:** Supports 'pink', 'amber', 'emerald', 'none' for color theming
- **Interactive Features:** Hover states, click handling, backdrop blur effects

#### `src/components/ContextSummaryCard.tsx` (lines 1-60)
- **Variant:** Uses `variant="compact"` with smaller icon box (w-8 h-8)
- **Accent:** Uses `accent="pink"` for visual consistency

#### `src/components/MyPlanCard.tsx` (lines 1-50)
- **Variant:** Uses `variant="notebook"` with smaller icon box
- **Accent:** Passes `accent="emerald"` to MarkdownPreview component

#### `src/components/LongTermPlanCard.tsx` (lines 1-45)
- **Variant:** Uses `variant="subtle"` with smaller icon box (w-8 h-8)
- **Accent:** Uses `accent="pink"` for visual consistency

#### `src/components/MarkdownPreview.tsx` (lines 1-50)
- **New Feature:** Added `accent` prop to support color-matched heading colors
- **Previous:** Hardcoded `text-purple-400` for headings
- **Current:** Uses `text-{accent}-400` for accent-matched colors

## Design System in Use

### Color Palette
- **Primary Colors:** pink, amber, emerald, zinc
- **Backgrounds:** Various opacity levels (900/40, 900/60, 900/70, 900/80)
- **Text Colors:** White (text-white), zinc tones (text-zinc-300, text-zinc-400, text-zinc-500)

### Typography
- **Headings:** text-3xl, text-2xl, text-xl, text-lg
- **Labels:** text-xs (uppercase tracking), text-sm
- **Body:** text-base, text-sm

### Spacing System
- **Section Margins:** mb-12 (between zones), mb-8 (within zones)
- **Gaps:** gap-6 (between cards), gap-5 (within grids)
- **Padding:** px-4, py-8, p-4 (cards)

### Component Patterns
- **Card Variants:** Each card has distinct visual weight and hierarchy
- **Section Headers:** Numbered labels with status badges
- **Grid Layouts:** 12-column responsive grid (xl:grid-cols-12)
- **Interactive Elements:** Hover states, transitions, micro-interactions

## Data Flow

### Current Architecture
1. **Goals Loading:** `window.deskflowAPI.getGoals(today)` → goals state
2. **Planning Data:** `window.deskflowAPI.readPlanningMd()` → planGoals state
3. **Topic Digests:** `window.deskflowAPI.getTopicDigest()` → digestTopics state
4. **Context Stats:** `window.deskflowAPI.getGoalContext()` → completed/unfinished counts
5. **Suggestions:** `window.deskflowAPI.suggestGoals()` → suggestions state
6. **Long-term Goals:** `window.deskflowAPI.getLongtermGoals()` → LongTermPlanCard data

### State Management
- **Goals:** Array of Goal objects with status, category, target, progress
- **Suggestions:** Array of AI-generated goal suggestions
- **Planning:** Array of checklist items with titles and target times
- **Context:** Summary statistics (completed this week, unfinished today)
- **Digests:** Array of topic digest entries

## Current Visual Issues

### Problems Identified
1. **Visual Monotony:** Cards share similar visual weight despite different purposes
2. **Unclear Hierarchy:** Section differentiation relies only on numbering
3. **Limited Interactivity:** Minimal hover states and micro-interactions
4. **Static Header:** Header doesn't change with mode or context
5. **Spacing Irregularities:** Inconsistent margins and gaps between elements

### User Feedback
- "The design is just straight up bad"
- "Colors and blending are unclear"
- "Border makes it really bad and messy"
- "Unorganized and tired of the design"

## Backend Integration

### IPC Channels Used
- `getGoals(date)` — Returns GoalDay with goals array
- `readPlanningMd()` — Returns planning markdown content
- `getTopicDigest()` — Returns topic digest with topics array
- `getGoalContext()` — Returns statistics about goals
- `suggestGoals()` — Returns AI-generated goal suggestions
- `getLongtermGoals()` - Returns long-term goals

### Service Layer
- Goals are managed through the ProblemsService
- Planning data comes from the planning parser
- Topic digests are handled by the digest service
- Suggestions come from the AI agent service

## Technical Constraints

### Existing Codebase
- Must maintain backward compatibility
- Cannot break existing functionality
- Must follow existing code patterns and conventions
- All changes must pass the build (`npm run build`)

### Design Requirements
- Modern, visually interesting design
- Clear visual hierarchy
- Responsive grid layout
- Enhanced hover states and micro-interactions
- Better typography and spacing
- Maintain app theme consistency

## Files to Modify

### Primary Files
1. `src/pages/AiPage.tsx` — Complete visual redesign
2. `src/components/GlassCard.tsx` — Enhanced visual variants
3. `src/components/ContextSummaryCard.tsx` — Update styling
4. `src/components/MyPlanCard.tsx` — Update styling
5. `src/components/LongTermPlanCard.tsx` — Update styling
6. `src/components/MarkdownPreview.tsx` — Ensure accent prop works

### Supporting Files
- `src/components/TopicDigestCard.tsx` — May need styling updates
- `src/components/GoalHistoryCard.tsx` — May need styling updates
- Any other components that import GlassCard with specific variants

## What Needs to Be Fixed

### Visual Hierarchy
1. **Section Headers:** Make 01 FOCUS / 02 PLAN / 03 REFLECT more visually distinct
2. **Card Variants:** Ensure each card has unique visual identity
3. **Status Indicators:** Add visual indicators for active states
4. **Color Coding:** Use accent colors consistently for section differentiation

### Interactive Elements
1. **Hover States:** Enhance hover effects on cards and buttons
2. **Micro-interactions:** Add subtle animations and transitions
3. **Focus States:** Improve accessibility with visible focus indicators
4. **Loading States:** Better visual feedback during async operations

### Layout and Spacing
1. **Grid System:** Optimize 12-column grid for better content organization
2. **Card Spacing:** Consistent margins and gaps between cards
3. **Section Spacing:** Better separation between major sections
4. **Responsive Design:** Ensure layout works well on all screen sizes

### Typography and Color
1. **Heading Hierarchy:** Clear distinction between different heading levels
2. **Color Contrast:** Ensure text is readable against backgrounds
3. **Color Psychology:** Use colors that align with section purposes
4. **Visual Balance:** Balance content and whitespace effectively

## Backend Logic Verification

### Existing IPC Channels
- ✅ `getGoals()` — Returns GoalDay with goals array
- ✅ `readPlanningMd()` — Returns planning markdown content
- ✅ `getTopicDigest()` — Returns topic digest with topics array
- ✅ `getGoalContext()` — Returns statistics about goals
- ✅ `suggestGoals()` — Returns AI-generated goal suggestions
- ✅ `getLongtermGoals()` — Returns long-term goals

### No Backend Changes Required
- All existing IPC channels are functional
- No new backend features are needed for this redesign
- The visual overhaul is purely frontend-focused

## Implementation Notes

### Build Requirements
- Must pass `npm run build` without errors
- TypeScript strict mode must be satisfied
- All imports and exports must be correct

### Testing Considerations
- Manual testing of visual changes
- Verify hover states and interactions
- Check responsive behavior on different screen sizes
- Ensure accessibility compliance

### Performance Considerations
- Optimize for fast rendering
- Minimize unnecessary re-renders
- Ensure smooth transitions and animations
- Maintain good Core Web Vitals

## Next Steps

1. **Generate Design Prompt:** Create a high-fidelity design specification prompt
2. **Send to Target AI:** Provide the prompt and CONTEXT_BUNDLE.md to the AI
3. **Analyze RESULT.md:** Review the design solution and create implementation plan
4. **Implement Changes:** Follow the Phase 1-4 workflow to implement the design
5. **Verify Build:** Ensure all changes pass the build and manual testing

## Files Created

- `agent/docs/ai-assistant-redesign/CONTEXT_BUNDLE.md` — This file
- `agent/docs/ai-assistant-redesign/prompt.md` — Will be created next
- `agent/docs/ai-assistant-redesign/RESULT.md` — Will be created after AI response
- `agent/docs/ai-assistant-redesign/IMPLEMENTATION_PLAN.md` — Will be created after RESULT.md analysis