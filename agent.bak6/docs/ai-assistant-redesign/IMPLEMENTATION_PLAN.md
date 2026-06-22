# IMPLEMENTATION_PLAN.md — AI Assistant Page Visual Redesign

## Overview

This plan implements the high-fidelity design specification from `RESULT.md` into the actual codebase. The design focuses on:

1. **Visual Hierarchy**: Clear distinction between FOCUS/PLAN/REFLECT sections
2. **Card Diversity**: Seven distinct GlassCard variants with unique visual identities
3. **Modern Typography**: Single scale with accent-matched heading colors
4. **Enhanced Interactivity**: Hover states, micro-interactions, and focus management
5. **Responsive Grid**: 12-column layout optimized for all screen sizes
6. **Accessibility**: WCAG AA compliance with reduced motion support

## Files to Modify

### Primary Files

| File | Changes |
|------|---------|
| `src/pages/AiPage.tsx` | Add `SECTION_ACCENTS` map; rebuild section headers with index + badge; mode-aware sticky header; grid `col-span` assignments; pass zone accent into each card |
| `src/components/GlassCard.tsx` | Refactor variants into `variantStyles` + `accentEdge` lookups; add hover/lift + focus-ring classes; keep prop API identical |
| `src/components/MarkdownPreview.tsx` | Map `accent` → `headingColor`; remove any residual `text-purple-400`; tint links/bullets with accent-400 |
| `src/components/MyPlanCard.tsx` | Confirm `variant="notebook"` + `accent="emerald"` passed through to `MarkdownPreview` |
| `src/components/ContextSummaryCard.tsx` | `variant="compact"`, pink accent, badge styling |
| `src/components/LongTermPlanCard.tsx` | Switch accent `pink → emerald`; `variant="subtle"` |
| `src/components/TopicDigestCard.tsx` | `variant="bordered"`, amber accent |
| `src/components/GoalHistoryCard.tsx` | `variant="interactive"`, amber accent, hover lift |
| Global CSS / Tailwind layer | Add `prefers-reduced-motion` block; remove any animated `filter`/`backdrop-filter` causing decorator jitter |

### Backend Verification

**✅ All six IPC channels are functional:**
- `getGoals()` — Returns GoalDay with goals array
- `readPlanningMd()` — Returns planning markdown content
- `getTopicDigest()` — Returns topic digest with topics array
- `getGoalContext()` — Returns statistics about goals
- `suggestGoals()` — Returns AI-generated goal suggestions
- `getLongtermGoals()` — Returns long-term goals

**No backend gaps detected.** This redesign is purely frontend.

## Implementation Steps

### Phase 1 — Core Data Structure

#### Step 1.1: Add SECTION_ACCENTS map to AiPage.tsx

**Location:** `src/pages/AiPage.tsx`

**Changes:** Add the SECTION_ACCENTS map after the existing modeConfig:

```tsx
const SECTION_ACCENTS = {
  focus: {
    index: "text-pink-400",   label: "text-pink-300",
    heading: "text-pink-200", border: "border-pink-500/20",
    glow: "shadow-pink-500/10",
    badgeBg: "bg-pink-500/10", badgeText: "text-pink-300",
    badgeRing: "ring-pink-500/20", dot: "bg-pink-400",
    ring: "focus-visible:ring-pink-400/60",
  },
  plan: {
    index: "text-emerald-400",   label: "text-emerald-300",
    heading: "text-emerald-200", border: "border-emerald-500/20",
    glow: "shadow-emerald-500/10",
    badgeBg: "bg-emerald-500/10", badgeText: "text-emerald-300",
    badgeRing: "ring-emerald-500/20", dot: "bg-emerald-400",
    ring: "focus-visible:ring-emerald-400/60",
  },
  reflect: {
    index: "text-amber-400",   label: "text-amber-300",
    heading: "text-amber-200", border: "border-amber-500/20",
    glow: "shadow-amber-500/10",
    badgeBg: "bg-amber-500/10", badgeText: "text-amber-300",
    badgeRing: "ring-amber-500/20", dot: "bg-amber-400",
    ring: "focus-visible:ring-amber-400/60",
  },
} as const
```

**Implementation:**
1. Add the SECTION_ACCENTS map after line 65 in AiPage.tsx
2. Ensure it's typed as `const SECTION_ACCENTS = { ... } as const`

#### Step 1.2: Update section headers to use SECTION_ACCENTS

**Location:** `src/pages/AiPage.tsx`

**Changes:** Update the three section headers to use SECTION_ACCENTS:

```tsx
// Focus zone
<section className="relative group">
  <div className="flex items-center gap-4 mb-6">
    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-zinc-800 to-zinc-900 border border-zinc-700 group-hover:scale-105 transition-transform">
      <Sparkles className="w-5 h-5 text-zinc-300" />
    </div>
    <div className="flex-1">
      <div className="flex items-center gap-3 mb-1">
        <span className="text-xs font-bold tracking-wider text-zinc-500 uppercase">01 FOCUS</span>
        <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Active</span>
      </div>
      <h2 className="text-xl font-semibold text-white">Today's Priorities</h2>
      <p className="text-sm text-zinc-500 mt-1">Your daily goals and action items</p>
    </div>
  </div>

  <div className="relative">
    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 w-px h-8 bg-gradient-to-b from-zinc-700 to-transparent" />

    <div className="relative z-10">
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <DailyPlanCard
          goals={goals}
          mode={mode}
          suggestions={suggestions}
          planGoals={planGoals}
          review={review}
          loading={goalsLoading}
          suggesting={suggesting}
          saving={savingGoal}
          error={goalsError}
          onToggle={handleToggle}
          onSuggest={handleSuggest}
          onAccept={handleAccept}
          onDismiss={handleDismiss}
          onFeedback={handleFeedback}
        />
        <ContextSummaryCard
          unfinishedCount={unfinishedCount}
          completedThisWeek={completedThisWeek}
        />
      </div>
    </div>
  </div>
</section>
```

**Implementation:**
1. Update the Focus zone (lines 255-288) to use SECTION_ACCENTS
2. Update the Plan zone (lines 291-307) to use SECTION_ACCENTS
3. Update the Reflect zone (lines 309-330) to use SECTION_ACCENTS
4. Update the header (lines 228-253) to use SECTION_ACCENTS for mode-aware styling

### Phase 2 — Card Component Updates

#### Step 2.1: Update GlassCard.tsx with variantStyles and accentEdge

**Location:** `src/components/GlassCard.tsx`

**Changes:** Refactor the variant styles and add accentEdge:

```tsx
const variantStyles = {
  default:   'bg-zinc-900/60 backdrop-blur-xl border border-zinc-800/50 shadow-lg',
  compact:   'bg-zinc-900/50 backdrop-blur-md border border-zinc-800/40 shadow-sm',
  subtle:    'bg-zinc-900/30 border border-zinc-800/30 shadow-sm',
  notebook:  'bg-zinc-950/70 backdrop-blur-lg border-l-2 shadow-inner',
  bordered:  'bg-transparent border-[1.5px]',
  elevated:  'bg-zinc-800/70 backdrop-blur-2xl border border-zinc-600/40 shadow-2xl',
  interactive: 'bg-zinc-900/60 backdrop-blur-xl border shadow-lg cursor-pointer',
};

const accentEdge: Record<Accent, string> = {
  pink:    "border-pink-500/30",
  emerald: "border-emerald-500/30",
  amber:   "border-amber-500/30",
  none:    "border-zinc-700/40",
}
```

**Implementation:**
1. Replace the existing variantStyles object with the new one
2. Add the accentEdge object after variantStyles
3. Update the GlassCard component to use accentEdge for border styling

#### Step 2.2: Update individual cards with correct variants and accents

**Location:** Various component files

**Changes:** Update each card component with the correct variant and accent:

```tsx
// DailyPlanCard - Focus zone, elevated variant, pink accent
<DailyPlanCard className="xl:col-span-8" />

// ContextSummaryCard - Focus zone, compact variant, pink accent
<ContextSummaryCard
  unfinishedCount={unfinishedCount}
  completedThisWeek={completedThisWeek}
  className="xl:col-span-4"
/>

// MyPlanCard - Plan zone, notebook variant, emerald accent
<MyPlanCard onPlanningSaved={handlePlanningSaved} />

// LongTermPlanCard - Plan zone, subtle variant, emerald accent
<LongTermPlanCard />

// TopicDigestCard - Reflect zone, bordered variant, amber accent
<TopicDigestCard
  topics={digestTopics}
  loading={digestLoading}
  error={digestError || undefined}
  onRefresh={() => loadDigest(true)}
/>

// GoalHistoryCard - Reflect zone, interactive variant, amber accent
<GoalHistoryCard />
```

**Implementation:**
1. Update DailyPlanCard to use `variant="elevated"` and pass `accent="pink"` to props
2. Update ContextSummaryCard to use `variant="compact"` and `accent="pink"`
3. Update MyPlanCard to use `variant="notebook"` and `accent="emerald"`
4. Update LongTermPlanCard to use `variant="subtle"` and `accent="emerald"`
5. Update TopicDigestCard to use `variant="bordered"` and `accent="amber"`
6. Update GoalHistoryCard to use `variant="interactive"` and `accent="amber"`

### Phase 3 — MarkdownPreview Updates

#### Step 3.1: Update MarkdownPreview.tsx with accent-driven heading colors

**Location:** `src/components/MarkdownPreview.tsx`

**Changes:** Add accent prop and heading color mapping:

```tsx
interface MarkdownPreviewProps {
  content: string;
  accent?: Accent; // 'pink' | 'amber' | 'emerald' | 'none'
  className?: string;
}

const headingColor: Record<Accent, string> = {
  pink: "text-pink-200", emerald: "text-emerald-200",
  amber: "text-amber-200", none: "text-zinc-100",
}

// Usage in component
<h1 className={`text-2xl font-semibold ${headingColor[accent || 'none']}`}>{heading}</h1>
<h2 className={`text-lg font-semibold ${headingColor[accent || 'none']}`}>{heading}</h2>
<h3 className={`text-base font-medium ${headingColor[accent || 'none']}`}>{heading}</h3>
```

**Implementation:**
1. Add `accent?: Accent` prop to MarkdownPreviewProps interface
2. Add headingColor mapping object
3. Update all heading elements to use headingColor[accent]
4. Ensure MyPlanCard passes `accent="emerald"` to MarkdownPreview

### Phase 4 — Global CSS and Motion

#### Step 4.1: Add reduced motion support

**Location:** Global CSS (likely in `src/index.css` or similar)

**Changes:** Add reduced motion styles:

```css
@media (prefers-reduced-motion: reduce) {
  * { transition: none !important; animation: none !important; transform: none !important; }
}
```

**Implementation:**
1. Add the reduced motion CSS to the global styles
2. Ensure all transitions and animations respect this setting

#### Step 4.2: Fix jitter issue

**Location:** AiPage.tsx

**Changes:** Replace filter/backdrop-filter animations with transform-only animations:

```tsx
// Instead of animating filter/backdrop-filter, use transform
<div
  className="absolute -top-4 left-1/2 transform -translate-x-1/2 w-px h-8 bg-gradient-to-b from-zinc-700 to-transparent"
  style={{ willChange: 'transform' }}
>
  {/* Static accent gradient divider */}
</div>
```

**Implementation:**
1. Update the section decorator to use transform instead of filter/backdrop-filter
2. Add will-change: transform for performance
3. Remove any other filter/backdrop-filter animations

### Phase 5 — Grid Layout Updates

#### Step 5.1: Update grid spans for each zone

**Location:** AiPage.tsx

**Changes:** Update the grid spans for each zone:

```tsx
// Focus zone
<div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
  <DailyPlanCard       className="xl:col-span-8" />
  <ContextSummaryCard  className="xl:col-span-4" />
</div>

// Plan zone
<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
  <MyPlanCard className="xl:col-span-7" />
  <LongTermPlanCard className="xl:col-span-5" />
</div>

// Reflect zone
<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
  <TopicDigestCard className="md:col-span-6" />
  <GoalHistoryCard className="md:col-span-6" />
</div>
```

**Implementation:**
1. Update the grid spans in each zone according to the specification
2. Ensure the grid classes are correct for responsive behavior

## Testing Strategy

### Manual Verification Steps

1. **Build Check:** `npm run build` passes with zero TypeScript / lint errors
2. **Visual Distinction:** Each of the seven variants is visually distinguishable side by side
3. **Color Fix:** No purple headings anywhere; `MyPlanCard` headings render emerald
4. **Jitter Fix:** Section decorators are stable — no jitter on scroll or hover
5. **Responsive Design:** Resize sweep: mobile (1-col), tablet (`md` 6/6), desktop (`xl` spans) all hold
6. **Keyboard Navigation:** All interactive cards/buttons reachable and operable via keyboard
7. **Reduced Motion:** `prefers-reduced-motion: reduce` disables all transforms/transitions
8. **Data States:** Loading skeletons, populated, and error rows all render correctly

## Critical Path

1. **High Priority:** AiPage.tsx SECTION_ACCENTS map and header updates (blocks all other changes)
2. **High Priority:** GlassCard.tsx variantStyles and accentEdge refactoring (affects all cards)
3. **Medium Priority:** MarkdownPreview.tsx accent prop and heading colors
4. **Medium Priority:** Individual card variant and accent updates
5. **Low Priority:** Global CSS reduced motion and jitter fixes

## Risk Assessment

### High Risk
- **Breaking Changes:** Any change to prop APIs could break existing functionality
- **TypeScript Errors:** Complex type changes could cause compilation errors
- **Visual Regression:** Significant visual changes could affect user experience

### Medium Risk
- **State Management:** Changes to component state could affect data flow
- **Performance:** New animations and transitions could impact performance
- **Accessibility:** New interactive elements must meet accessibility standards

### Low Risk
- **Backend Integration:** All backend channels are already functional
- **Build Process:** Build process is well-established and tested

## Success Criteria

### Technical Success
- ✅ `npm run build` passes with zero errors
- ✅ All TypeScript types are correct
- ✅ All imports and exports are valid
- ✅ All IPC channels remain functional

### Visual Success
- ✅ Cards have distinct visual identities
- ✅ Section headers are visually prominent
- ✅ Color system is consistent and effective
- ✅ Typography hierarchy is clear
- ✅ Interactive elements provide meaningful feedback
- ✅ Responsive design works on all screen sizes

### User Experience Success
- ✅ No jitter or visual instability
- ✅ Keyboard navigation works
- ✅ Reduced motion support works
- ✅ All interactive elements are accessible
- ✅ Visual hierarchy is clear and intuitive

## Rollback Plan

If any implementation fails:

1. **Revert Changes:** Use git to revert all changes to the modified files
2. **Rollback Order:** Revert in reverse order of implementation (latest changes first)
3. **Test Rollback:** Ensure the application works with the original code
4. **Document Issues:** Document any issues encountered during rollback

## Post-Implementation Checklist

### Before Going Live
- [ ] Build passes with zero errors
- [ ] All tests pass (manual verification)
- [ ] Visual design matches specification
- [ ] Interactive elements work correctly
- [ ] Accessibility standards are met
- [ ] Responsive design works on all devices
- [ ] Performance is acceptable
- [ ] No regressions in existing functionality

### After Going Live
- [ ] Monitor for any issues
- [ ] Collect user feedback
- [ ] Address any reported problems
- [ ] Update documentation if needed

## Conclusion

This implementation plan provides a clear roadmap for implementing the high-fidelity design specification from `RESULT.md`. By following the phases and steps outlined, we can successfully modernize the AI Assistant page while maintaining the app's theme and functionality.

The key is to implement changes incrementally, testing each phase before moving to the next. This minimizes risk and ensures that any issues can be quickly identified and resolved.