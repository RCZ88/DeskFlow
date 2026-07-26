# CONTEXT_BUNDLE.md: AI Assistant Page Layout Revamp

## Relevant Source Code

### AiPage.tsx (Main Component)
File: `src/pages/AiPage.tsx`
Lines: 1-344

Key sections:
- Header (lines 248-275): Title, day label, mode indicator
- Main grid container (lines 277-329): `grid grid-cols-1 lg:grid-cols-3 gap-5`
- Left column (lines 283-310): `lg:col-span-2` containing DailyPlanCard and TopicDigestCard
- Right column (lines 312-328): `lg:col-span-1` containing MyPlanCard, LongTermPlanCard, GoalHistoryCard, ContextSummaryCard
- Footer (lines 331-341): Attribution text

### Component Props Interface
From AiPage.tsx:
- `goals: Goal[]` - Array of goal objects
- `mode: Mode` - 'morning' | 'in-progress' | 'review'
- `suggestions?: Array<{ title: string; category: GoalCategory }>` - AI-generated suggestions
- `planGoals?: Array<{ title: string; targetSeconds?: number }>` - Planning checklist items
- `review?: string | null` - Evening review text
- Various loading/error/saving booleans for UI state

### Data Structures
File: `src/services/GoalStore.ts`
Lines: 1-109

Key interfaces:
```typescript
export type GoalCategory = 'work' | 'personal' | 'health' | 'learning';
export type GoalPeriod = 'daily' | 'weekly' | 'monthly';
export type GoalStatus = 'suggested' | 'pending' | 'in-progress' | 'completed' | 'overdue' | 'slipped' | 'dismissed';

export interface GoalTarget {
  type: 'time' | 'completion';
  targetSeconds?: number;
  matchCategory?: string;
  matchApps?: string[];
  done?: boolean;
}

export interface GoalLink {
  label: string;
  url: string;
}

export interface Goal {
  id: string;
  title: string;
  description?: string;
  category: GoalCategory;
  target: GoalTarget;
  period: GoalPeriod;
  status: GoalStatus;
  date: string;
  source: string;
  links: GoalLink[];
  progressSeconds?: number;
  createdAt: string;
  completedAt?: string;
}
```

### Design Tokens & Conventions
From `agent/skills/frontend-design/SKILL.md`:

**Color System for Productivity Page (AiPage):**
- Accent: pink-500 (Brand default for Productivity page)
- Background: zinc-950 (base), zinc-900 (elevated), zinc-900/50 (glass)
- Text: zinc-100 (primary), zinc-400 (secondary), zinc-600 (disabled)
- Border: zinc-800 (subtle), zinc-700 (active), zinc-600/50 (glass edge)

**Spacing Scale:**
- xs: 4px (icon padding, tight inline)
- sm: 8px (component internal padding)
- md: 12px (card padding, list items)
- lg: 16px (section gaps)
- xl: 24px (page sections)
- 2xl: 32px (major divisions)

**Card Padding Standard:**
- ALL card padding → `p-5` (20px). Never `p-6` or `p-8`.

**Border Radius Maximum:**
- ALL cards, modals, containers → `rounded-xl` (12px). Never `rounded-2xl` or `rounded-3xl`.

**Typography Scale:**
- Badge: 11px/500 — status badges, category pills
- Meta: 12px/400 — timestamps, secondary info
- Body: 13px/400 — default body text
- Body+: 14px/400 — stat values, card content
- Card title: 13px/600 — section headings within cards
- Section h2: 15px/600 — section titles
- Page title: 18px/600 — ALL page h1 titles
- Display: 24-32px/700 — timer values, hero score badges

**Animation Tokens:**
- fast: 150ms (hover states, toggles)
- normal: 250ms (modals, dropdowns)
- slow: 400ms (page transitions)
- ease-out: cubic-bezier(0.16, 1, 0.3, 1) (standard motion)

### IPC Endpoints Used
From AiPage.tsx usage of `window.deskflowAPI!`:
- `getGoals(date: string): Promise<GoalDay>` - Load goals for a date
- `getTopicDigest(): Promise<{success: boolean, topics?: any[], error?: string}>` - Load topic digest
- `getGoalContext(): Promise<any>` - Get goal context for suggestions
- `getLongtermGoals(): Promise<{success: boolean, goals?: any[]}>` - Get long-term goals
- `readPlanningMd(): Promise<{content?: string}>` - Read planning checklist
- `saveGoal(date: string, goal: Goal): Promise<void>` - Save a goal
- `saveGoalReview(date: string, message: string): Promise<{success: boolean}>` - Save evening review

### State Management
- Goals state: `goals: Goal[]` (loaded via `getGoals`)
- Review state: `review: string | null` (loaded via `getGoals` and saved via `saveGoalReview`)
- Digest state: `digestTopics: any[]`, `digestLoading: boolean`, `digestError: string | null`
- Suggestions state: `suggestions: Array<{ title: string; category: GoalCategory }>` (from `suggestGoals`)
- Plan goals state: `planGoals: Array<{ title: string; targetSeconds?: number }>` (from `readPlanningMd`)
- Various loading/error states for async operations

### Architecture Notes
- **Data Flow**: 
  - IPC calls in `useEffect` hooks load initial data (goals, digest, context)
  - User interactions trigger IPC calls (accepting suggestions, toggling goals, saving reviews)
  - Data flows from IPC → React state → Component props → UI rendering
  
- **Component Hierarchy**:
  - AiPage (container)
    - Header (presentation)
    - Main Grid (layout)
      - Left Column (lg:col-span-2)
        - DailyPlanCard (goal management)
        - TopicDigestCard (daily insights)
      - Right Column (lg:col-span-1)
        - MyPlanCard (long-term planning)
        - LongTermPlanCard (extended goals)
        - GoalHistoryCard (past performance)
        - ContextSummaryCard (stats overview)
    - Footer (attribution)

- **Responsive Behavior**:
  - Mobile (< lg): Single column stack (grid-cols-1)
  - Desktop (≥ lg): Three column grid (grid-cols-3) with 2:1 column ratio
  - All cards use motion variants for entrance animations

- **Current Design Variance**: Balanced (5/10) - Mix of safe and bold elements
- **Current Motion Intensity**: Moderate (5/10) - Standard transitions (250ms)
- **Current Visual Density**: Dense (7/10) - Tight packing, information-rich (appropriate for dev tool)

## Problem Statement
The AI assistant page layout feels improperly scaled and unbalanced. User reports elements feel "all on the side" suggesting:
1. The 2:1 column ratio (lg:col-span-2 vs lg:col-span-1) creates visual imbalance
2. Card sizes and spacing may not be optimized for the content density
3. Layout doesn't effectively utilize available screen real estate
4. Visual hierarchy could be improved to better prioritize important information

## Constraints
1. Must maintain all existing functionality and data flows
2. Must use existing component types (DailyPlanCard, TopicDigestCard, etc.)
3. Must follow DeskFlow design system conventions (frontend-design skill)
4. Must maintain responsive behavior (mobile stacking, desktop grid)
5. Must preserve motion patterns and animations
6. Should optimize for visual density appropriate to a developer tool (currently Dense/7)