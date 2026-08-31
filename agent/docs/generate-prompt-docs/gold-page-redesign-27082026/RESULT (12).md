# Gold Page Redesign — RESULT.md

> **Generated:** 2026-08-28 | **Architect:** Lead Designer + Engineer
> **Status:** Design Specification — Ready for Implementation

---

## 1. Executive Summary

The Gold Tab is being restored as a **unified life planning surface** — warm, personal, and intentional. The separate `GoalsSection.tsx` component (which duplicated GoldPage internals and broke the amber aesthetic) is removed. Goal rendering returns to `GoldPage.tsx` itself, where it always belonged.

The schedule is redesigned with the Life page's amber accent and connected to goals. The calendar strip now shows goals and deadlines as colored dots. The entire page flows as one cohesive system: **plan the day → see the schedule → track goals → reflect on the week → gaze at the long view**.

**Core principle:** This is not a dashboard. It is where someone sits down each morning or evening and thinks about their life.

---

## 2. What Was Removed

### `src/components/goals/GoalsSection.tsx` — DELETE ENTIRE FILE

**Why it had to go:**
- Duplicated GoldPage's internal goal rendering, state management, and CRUD handlers
- Imported its own `CriteriaBuilder`, `GoalCard`, `HabitTracker`, `GoalAICoach` — shadowing GoldPage's identical logic
- Rendered `ScheduleCard` with a **pink-500** theme (`#ec4899`) — completely foreign to the Life page's warm amber (`#fbbf24`)
- Had its own day selector, its own add/edit form state, its own stat pills — all redundant
- Broke the visual continuity between the header, calendar, week board, and goals
- Made goals feel like a "widget" dropped into the page instead of the *point* of the page

**What replaces it:**
GoldPage's own render method regains direct control of the goal list, add/edit forms, stat pills, AI parser, habit tracker, and AI coach. The schedule is rendered as a first-class section within GoldPage's layout, not inside a nested component.

---

## 3. What Was Redesigned

### 3.1 ScheduleCard — From Foreign Widget to Native Life Block

**Current problem:** `ScheduleCard.tsx` uses `SpotlightCard` with pink glow (`rgba(236, 72, 153, 0.08)`), `AnimatedGradientText` in pink→rose, pink day selector buttons, and pink "NOW" badges. It looks like it was teleported from a different app.

**Redesign:**

| Element | Before | After |
|---|---|---|
| Accent color | Pink `#ec4899` | Amber `#fbbf24` |
| Card wrapper | `SpotlightCard` pink glow | `WarmCard ambient` (same as rest of page) |
| Header gradient | Pink→Rose | Amber→Gold `#fbbf24` → `#f59e0b` |
| Day selector active | Pink bg/border | Amber bg/border |
| Current block border | Pink `BorderBeam` | Amber `BorderBeam` |
| "NOW" badge | Pink | Amber with flame icon |
| Category icons | Fixed set | Same, but colored by schedule block's linked goal category |
| Empty state | Generic sun icon | Warm "No plans today" with amber accent |
| Add button | Pink | Amber |

**Behavior changes:**
- **Synchronized date:** The schedule no longer has its own day selector. It reads `selectedDate` from GoldPage and filters entries for that day of week. The existing `CalendarStrip` and `WeekBoard` are the single source of truth for date navigation.
- **Goal-linked blocks:** Schedule entries with `goal_id` show a small category-colored dot and the goal title beneath the block title. Clicking the goal link navigates to that goal's date.
- **Focus awareness:** If a focus session is active and a schedule block's `matchCategory` aligns with the active focus goal, the block gets a subtle amber pulse indicator.
- **Simplified form:** The inline add/edit form uses the same glass styling as `CriteriaBuilder` — no more `SpotlightCard` wrapper around the form.

**Props remain the same:**
```ts
interface ScheduleCardProps {
  entries: ScheduleEntry[];
  selectedDate: string;        // NEW — passed from GoldPage
  selectedDay: number;         // NEW — derived from selectedDate
  onAdd: (entry: Omit<ScheduleEntry, 'id' | 'createdAt'>) => void;
  onUpdate: (id: string, patch: Partial<ScheduleEntry>) => void;
  onDelete: (id: string) => void;
  linkedGoals?: { id: string; title: string; category: string }[];  // NEW
}
```

**Visual structure:**
```
┌─ WarmCard (ambient) ──────────────────────────────┐
│  ┌─ Header ─────────────────────────────────────┐ │
│  │  [Calendar icon] Today's Schedule · 3 blocks │ │
│  │                                    [+ Add]    │ │
│  └───────────────────────────────────────────────┘ │
│  ┌─ Current Block (if active) ──────────────────┐ │
│  │  ▓ amber left rail │ ● NOW │ Title           │ │
│  │  9:00 AM – 10:30 AM · 1h 30m · Room 302     │ │
│  │  Serves: ▓ Work — Complete project draft     │ │
│  └───────────────────────────────────────────────┘ │
│  ┌─ Upcoming Block ─────────────────────────────┐ │
│  │  ▓ cyan left rail │ Title                    │ │
│  │  11:00 AM – 12:00 PM · 1h · Library          │ │
│  └───────────────────────────────────────────────┘ │
│  ┌─ Upcoming Block ─────────────────────────────┐ │
│  │  ▓ violet left rail │ Title                  │ │
│  └───────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

### 3.2 The Goals Area — Inline in GoldPage

Instead of `<GoalsSection />`, GoldPage's render method directly contains:

```tsx
{/* ═══ GOALS AREA — inline, warm, connected ═══ */}
<div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
  {/* Left column (2/3): Goals + Schedule */}
  <div className="lg:col-span-2 space-y-4">
    <StatPillsRow />
    <ScheduleCard ... />
    <GoalControls />
    <MissedGoalRecoveryBanner ... />
    <ActiveGoalList ... />
    <CompletedGoalCollapsible ... />
    <HabitTracker ... />
    <GoalAICoach ... />
  </div>

  {/* Right column (1/3): Radar + Reminders + Vault */}
  <div className="space-y-4">
    <DeadlineRadar ... />
    <BellBoard ... />
    <TheVault ... />
  </div>
</div>
```

**Stat Pills Row:**
- 4 pills: Active goals, Done today, Best streak, Time tracked
- Uses `WarmCard` with `NumberTicker` for animated counts
- Amber accent on streak pill

**Goal Controls:**
- "Add Goal" button (amber) and "AI Parse" button (violet, subtle)
- Collapsible `CriteriaBuilder` for adding
- Collapsible `GoalLanguageParser` for AI parsing
- Both use `AnimatePresence` for smooth expand/collapse

**Active Goal List:**
- Maps `activeGoals` (filtered from `goals`) to `GoalCard`
- Each card shows live focus tracking indicator if `activeGoalIds.includes(goal.id)`
- Edit mode swaps card for `CriteriaBuilder` inline

**Completed Goal Collapsible:**
- "Sealed (3)" chevron button
- Expands to show done goals with strikethrough
- Same `AnimatePresence` pattern as existing `showCompleted`

---

## 4. What Was Enhanced

### 4.1 CalendarStrip — Multi-Dot Calendar

**Current:** Shows a single green dot if `goalDates.has(dateStr)`.

**Enhanced:** Shows up to 3 colored dots per date:
- **Goal dots:** Colored by category (work=pink, personal=violet, health=emerald, learning=cyan, finance=amber, relationships=rose)
- **Deadline dot:** Rose `#f43f5e` (diamond shape, not circle)
- **Reminder dot:** Amber `#fbbf24` (smaller circle)

**Implementation:**
```tsx
// In CalendarStrip, replace the single dot with:
<span className="flex gap-0.5 mt-0.5">
  {getDotsForDate(dateStr).slice(0, 3).map((dot, i) => (
    <span
      key={i}
      className={dot.shape === 'diamond' ? 'w-1 h-1 rotate-45' : 'w-1 h-1 rounded-full'}
      style={{ background: dot.color }}
    />
  ))}
</span>
```

**Data flow:** GoldPage passes `radarMarks` (already computed) down to `CalendarStrip` as a new prop `marks: Map<string, RadarMark[]>`. The strip also uses `weekGoals` to derive category-colored goal dots.

**Today indicator:** Keep the existing violet dot in the corner, but change to amber to match the page accent.

### 4.2 WeekBoard — Enhanced Habit Grid

**Current:** Shows habit dot-chips and daily goal count.

**Enhanced:**
- **Deadline indicators:** Small rose diamond in the top-right of a day cell if that day has a deadline
- **Reminder indicators:** Small amber dot above the day number if reminders exist
- **Goal count:** Shows not just "3 daily" but a mini breakdown: "2 work · 1 health" using category dots
- **Click behavior:** Clicking a day navigates to it (existing). Clicking a habit dot toggles it (existing). **New:** Clicking a deadline indicator opens the deadline in `DeadlineRadar`.

### 4.3 Goal-Schedule Linking

**New field usage:** `ScheduleEntry.goal_id` already exists in the types. Now it's surfaced in the UI.

**In ScheduleCard:**
- When rendering a block, if `entry.goal_id` exists, look up the goal in `linkedGoals`
- Show: `Serves: [category dot] Goal Title` beneath the time/location row
- The left rail color of the block defaults to the linked goal's category color (if no explicit `color` is set)
- Clicking the goal name sets `selectedDate` to the goal's date and scrolls to the goal list

**In GoalCard:**
- If the goal has `linkedScheduleId`, show a small calendar icon with "Scheduled" badge
- Clicking it highlights the schedule block

**In CriteriaBuilder:**
- New optional field: "Link to schedule block" — a dropdown of existing schedule entries for the selected day
- When a goal is linked to a schedule block, the block's `goal_id` is updated via `onUpdateSchedule`

### 4.4 DeadlineRadar — Goal-Aware

**Enhanced:**
- Clicking a deadline date in the month grid not only navigates to that date but also **filters the goal list** to show goals due on that date
- Deadlines that are linked to goals (via `goal_id` in the deadline type, or matching title) show the goal's category color instead of generic rose
- Countdown list items show a "related goals" count if any goals share that date

### 4.5 BellBoard — Goal-Aware Reminders

**Enhanced:**
- Reminders can be created from a goal card via a new "Remind me" action
- Reminders with `goal_id` show the goal title and category dot
- Quick-add chips include "Tomorrow" and "Next week" (existing) plus **"Goal deadline"** (sets due date to the selected goal's deadline)

---

## 5. Integration Map

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         GOLD PAGE INTEGRATION MAP                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  CALENDAR STRIP ─────┬──► shows goal dots (colored by category)        │
│  (date navigation)   ├──► shows deadline diamonds (rose)               │
│                      └──► shows reminder dots (amber)                  │
│                              ▼                                          │
│  WEEK BOARD ─────────┬──► habit toggles update goals via API           │
│  (weekly overview)   ├──► deadline indicators on day cells             │
│                      └──► click day → set selectedDate                 │
│                              ▼                                          │
│  DEADLINE RADAR ─────┬──► click date → set selectedDate                │
│  (month view)        ├──► click countdown → navigate + filter goals    │
│                      └──► marks feed into CalendarStrip dots           │
│                              ▼                                          │
│  SCHEDULE CARD ──────┬──► linked goals show category color + title     │
│  (daily time blocks) ├──► focus session highlights active blocks       │
│                      ├──► add form links to goals via dropdown         │
│                      └──► block color inherits from linked goal        │
│                              ▼                                          │
│  GOAL LIST ──────────┬──► GoalCard shows "Scheduled" if linked        │
│  (today's goals)     ├──► toggle updates WeekBoard via loadWeek()      │
│                      ├──► edit opens CriteriaBuilder inline            │
│                      ├──► delete removes from all views                │
│                      └──► AI parser creates goals with schedule links  │
│                              ▼                                          │
│  BELL BOARD ─────────┬──► reminders can reference goals                │
│  (events/reminders)  ├──► quick-add includes "Goal deadline" chip      │
│                      └──► overdue reminders show in DeadlineRadar      │
│                              ▼                                          │
│  THE VAULT ──────────┬──► long-term goals link to daily goals          │
│  (long-term view)    ├──► progress rings update when children complete │
│                      └──► serving count shows active daily links       │
│                              ▼                                          │
│  REFLECTION CARD ────┬──► hard stats pulled from goal completions      │
│  (journal)           ├──► smart prompts reference goal streaks         │
│                      └──► save triggers goal review API                │
│                              ▼                                          │
│  WEEK REVIEW ────────┬──► productivity bars from daily reflections     │
│  (weekly recap)      ├──► covenant streak dots from completions        │
│                      └──► goal/habit counts from weekGoals             │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

**Data flow:**
1. User selects date via `CalendarStrip` or `WeekBoard` → `setSelectedDate` → all sections reload
2. User toggles goal → `handleToggle` → optimistically updates `goals` + `weekGoals` → `confetti` → API save → `loadWeek()` refreshes `WeekBoard`
3. User links schedule block to goal → `updateScheduleEntry` → block color changes → `GoalCard` shows "Scheduled" badge
4. User adds reminder with due date → `createReminder` → `DeadlineRadar` gets new mark → `CalendarStrip` gets new dot
5. User completes all goals → `ReflectionCard` prompts "You sealed all N goals — what felt most impactful?"

---

## 6. Component Specifications

### 6.1 GoldPage (Main Component)

**State additions:**
```ts
const [showLangParser, setShowLangParser] = useState(false);
const [scheduleViewDay, setScheduleViewDay] = useState<number>(new Date().getDay());
```

**Derived data additions:**
```ts
const activeGoals = useMemo(() => goals.filter(g => g.status !== 'done' && g.status !== 'suggested'), [goals]);
const completedGoals = useMemo(() => goals.filter(g => g.status === 'done'), [goals]);
const todaySchedule = useMemo(() => 
  schedule.filter(e => e.day_of_week === new Date(selectedDate + 'T00:00:00').getDay()),
  [schedule, selectedDate]
);
```

**Handler additions:**
```ts
const handleLinkGoalToSchedule = (goalId: string, scheduleId: string | null) => {
  // Update goal's linkedScheduleId
  // Update schedule entry's goal_id
};
```

**Render structure:**
```tsx
<div className="space-y-4 max-w-6xl mx-auto">
  <GoldHeader ... />
  <CalendarStrip selectedDate={selectedDate} onDateChange={setSelectedDate} 
    marks={radarMarks} weekGoals={weekGoals} />

  {/* Focus session banner (existing) */}
  <AnimatePresence>...</AnimatePresence>

  {/* Two-column layout */}
  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
    {/* LEFT: Goals + Schedule */}
    <div className="lg:col-span-2 space-y-4">

      {/* Stat Pills */}
      <div className="grid grid-cols-4 gap-2">
        <StatPill icon={<Target size={14}/>} label="Active" value={activeGoals.length} accent="violet" />
        <StatPill icon={<CheckCircle2 size={14}/>} label="Sealed" value={completedGoals.length} accent="emerald" />
        <StatPill icon={<Flame size={14}/>} label="Streak" value={bestStreak} accent="amber" />
        <StatPill icon={<Clock size={14}/>} label="Tracked" value={formatTime(tracked)} accent="cyan" />
      </div>

      {/* Schedule — redesigned, amber-themed */}
      <WarmCard ambient>
        <ScheduleCard 
          entries={schedule}
          selectedDate={selectedDate}
          selectedDay={new Date(selectedDate + 'T00:00:00').getDay()}
          onAdd={addScheduleEntry}
          onUpdate={updateScheduleEntry}
          onDelete={deleteScheduleEntry}
          linkedGoals={goals.map(g => ({ id: g.id, title: g.title, category: g.category }))}
        />
      </WarmCard>

      {/* Goal controls */}
      <div className="flex items-center justify-between">
        <h2 className="text-[13px] font-semibold text-zinc-200">
          {prettyDate(selectedDate)}
        </h2>
        <div className="flex items-center gap-1.5">
          <button onClick={() => setShowLangParser(!showLangParser)} ...>
            <Wand2 size={12} /> AI
          </button>
          <button onClick={() => { setIsAdding(!isAdding); setNewCriteria(defaultCriteria); }} ...>
            {isAdding ? <X size={13} /> : <Plus size={13} />} {isAdding ? 'Cancel' : 'Add Goal'}
          </button>
        </div>
      </div>

      {/* AI Language Parser */}
      <AnimatePresence>
        {showLangParser && (
          <motion.div ...>
            <WarmCard><GoalLanguageParser onAccept={handleLangAccept} onCancel={() => setShowLangParser(false)} /></WarmCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Goal Form */}
      <AnimatePresence>
        {isAdding && (
          <motion.div ...>
            <WarmCard><CriteriaBuilder ... /></WarmCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Missed Goals Recovery */}
      <MissedGoalRecoveryBanner missedGoals={missedGoals} ... />

      {/* Active Goals */}
      {loading ? <GoalCardSkeleton /> : error ? <GoalErrorState ... /> : activeGoals.length === 0 ? (
        <WarmCard><GoalEmptyState onAdd={() => setIsAdding(true)} /></WarmCard>
      ) : (
        <div className="space-y-1.5">
          {activeGoals.map(goal => (
            <div key={goal.id} className="relative">
              {editingId === goal.id ? (
                <WarmCard><CriteriaBuilder ... /></WarmCard>
              ) : (
                <>
                  <GoalCard goal={goal} ... />
                  {activeGoalIds.includes(goal.id) && goal.target.type === 'time' && (
                    <div className="absolute bottom-1.5 right-3 ...">+{formatTime(...)} live</div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Completed Goals */}
      {completedGoals.length > 0 && (
        <div>
          <button onClick={() => setShowCompleted(p => !p)} ...>
            {showCompleted ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            Sealed ({completedGoals.length})
          </button>
          <AnimatePresence>
            {showCompleted && (
              <motion.div ...>
                {completedGoals.map(goal => <GoalCard key={goal.id} goal={goal} ... />)}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Habit Tracker */}
      <WarmCard ambient>
        <HabitTracker currentDate={selectedDate} />
      </WarmCard>

      {/* AI Goal Coach */}
      <WarmCard ambient>
        <div className="flex items-center gap-1.5 mb-3">
          <Sparkles size={13} className="text-violet-400" />
          <span className="text-[13px] font-semibold text-zinc-200">AI Goal Coach</span>
        </div>
        <GoalAICoach onApply={...} onDismiss={...} />
      </WarmCard>
    </div>

    {/* RIGHT: Radar + Reminders + Vault */}
    <div className="space-y-4">
      <DeadlineRadar marks={radarMarks} selectedDate={selectedDate} onPick={setSelectedDate} />
      <BellBoard reminders={reminders} ... selectedDate={selectedDate} />
      <TheVault longTermGoals={longTermGoals} todayGoals={goals} onSave={handleLTGSave} onDelete={handleLTGDelete} />
    </div>
  </div>

  {/* Bottom full-width sections */}
  <ReflectionCard date={selectedDate} data={reflection} summary={reviewSummary} onSave={...} />
  <WeekReview weekDates={weekDates} reflections={weekReflections} />
  <LifeRiver />
</div>
```

### 6.2 CalendarStrip (Enhanced)

**New props:**
```ts
interface CalendarStripProps {
  selectedDate: string;
  onDateChange: (date: string) => void;
  marks?: Map<string, { color: string; label: string }[]>;  // NEW
  weekGoals?: Record<string, Goal[]>;  // NEW
}
```

**Dot logic per date:**
```ts
function getDotsForDate(dateStr: string, weekGoals?: Record<string, Goal[]>, marks?: Map<string, RadarMark[]>): Dot[] {
  const dots: Dot[] = [];

  // Goal category dots (max 2)
  const dayGoals = weekGoals?.[dateStr] || [];
  const categories = [...new Set(dayGoals.map(g => g.category))];
  categories.slice(0, 2).forEach(cat => {
    dots.push({ color: catDot(cat), shape: 'circle' });
  });

  // Deadline marks (diamond)
  const dayMarks = marks?.get(dateStr) || [];
  dayMarks.forEach(m => {
    if (dots.length < 3) dots.push({ color: m.color, shape: 'diamond' });
  });

  return dots;
}
```

**Styling:** Dots are `w-1 h-1` with `0.5` gap. Diamond uses `rotate-45`. Rendered in a flex row beneath the day number.

### 6.3 ScheduleCard (Redesigned)

**Removed:**
- `SpotlightCard` wrapper
- `AnimatedGradientText` (replaced with plain `text-[15px] font-semibold text-zinc-200`)
- Internal day selector (now receives `selectedDay` from parent)
- Pink color tokens everywhere

**Added:**
- `selectedDate: string` prop
- `selectedDay: number` prop  
- `linkedGoals` prop for goal linking
- Goal link rendering in block rows
- Amber `BorderBeam` on current block
- `WarmCard` styling instead of standalone card

**Color mapping:**
```ts
const GOAL_CATEGORY_COLORS: Record<string, string> = {
  work: '#ec4899',
  personal: '#8b5cf6', 
  health: '#34d399',
  learning: '#22d3ee',
  finance: '#fbbf24',
  relationships: '#fb7185',
};

// Block left rail color:
const railColor = entry.color || (linkedGoal ? GOAL_CATEGORY_COLORS[linkedGoal.category] : '#6b7280');
```

**Current block styling:**
```
bg-amber-500/[0.08] border-amber-500/30
```
Instead of pink.

**"NOW" badge:**
```tsx
<span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/20 text-amber-400 border border-amber-500/20 shrink-0 flex items-center gap-1">
  <Flame size={10} /> NOW
</span>
```

### 6.4 GoalCard (Enhanced)

**New display elements:**
- If `goal.linkedScheduleId`: show `<Calendar size={10} /> Scheduled` badge in amber
- If `goal.parentIds` linked to long-term goal: show "Serves: [Vault goal title]" (existing, keep)
- Clicking "Scheduled" badge scrolls to and highlights the schedule block

**Focus indicator:**
- Keep existing live tracking indicator (amber pulse + `+Xm live`)
- Add: if a schedule block linked to this goal is currently active, show `▶ In session` badge

### 6.5 CriteriaBuilder (Enhanced)

**New field:**
- "Link to schedule" dropdown (only visible when `linkedScheduleEntries.length > 0`)
- Shows schedule entries for the goal's date
- Setting it updates both the goal's `linkedScheduleId` and the schedule entry's `goal_id`

### 6.6 StatPill (New Sub-Component)

```tsx
function StatPill({ icon, label, value, accent }: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  accent: 'amber' | 'violet' | 'emerald' | 'cyan' | 'rose';
}) {
  const accentMap = {
    amber: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    violet: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
    emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    cyan: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
    rose: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
  };
  return (
    <div className={`${GLASS} px-3 py-2.5 flex items-center gap-2`}>
      <span className={accentMap[accent]}>{icon}</span>
      <div className="min-w-0">
        <div className="text-[14px] font-semibold text-zinc-100 tabular-nums">{value}</div>
        <div className="text-[10px] text-zinc-600">{label}</div>
      </div>
    </div>
  );
}
```

---

## 7. Layout

### 7.1 Visual Hierarchy (Top → Bottom)

```
┌─────────────────────────────────────────────────────────────────────┐
│  GOLD HEADER                                                        │
│  [Big Date] [Month Year] · 3/5 sealed · 2h 14m tracked  [🔥 4d] [○]│
├─────────────────────────────────────────────────────────────────────┤
│  CALENDAR STRIP (29 30 31 01 02 03 04 05 ...)                       │
│       ·  ·  ◆  ·· ·  ·  ···  ·  ·  ·  ·  ·                         │
│  (dots: goals by category, ◆ deadlines, · reminders)               │
├─────────────────────────────────────────────────────────────────────┤
│  FOCUS SESSION BANNER (if active)                                   │
├─────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────┐ ┌───────────────────────┐  │
│  │  STAT PILLS                         │ │  DEADLINE RADAR       │  │
│  │  [Active 3] [Sealed 2] [🔥 4] [2h] │ │  [mini month grid]    │  │
│  ├─────────────────────────────────────┤ │  [countdown list]     │  │
│  │  TODAY'S SCHEDULE                   │ ├───────────────────────┤  │
│  │  ━━━ NOW ━━━ Math Lecture          │ │  EVENTS & REMINDERS   │  │
│  │  ─── 11:00 ─── Focus: Deep Work    │ │  [input + date]       │  │
│  │  ─── 14:00 ─── Gym                 │ │  [reminder list]      │  │
│  ├─────────────────────────────────────┤ ├───────────────────────┤  │
│  │  [Add Goal] [AI Parse]              │ │  THE VAULT            │  │
│  ├─────────────────────────────────────┤ │  [progress rings]     │  │
│  │  ⚠️ 1 goal missed — [Late] [Move]  │ │  [long-term goals]    │  │
│  ├─────────────────────────────────────┤ └───────────────────────┘  │
│  │  □ Complete project draft           │                           │
│  │    Work · completion · Scheduled    │                           │
│  │  □ Read 30 pages                    │                           │
│  │    Learning · time · 15m / 30m      │                           │
│  ├─────────────────────────────────────┤                           │
│  │  ▼ Sealed (2)                       │                           │
│  │    ✓ Morning routine                │                           │
│  │    ✓ Email backlog                  │                           │
│  ├─────────────────────────────────────┤                           │
│  │  WEEKLY HABIT GRID                  │                           │
│  │  M T W T F S S                      │                           │
│  │  □ □ □ □ □ □ □  Meditation          │                           │
│  │  □ □ □ □ □ □ □  Exercise            │                           │
│  ├─────────────────────────────────────┤                           │
│  │  ✨ AI Goal Coach                   │                           │
│  │  [Run AI Health Check]              │                           │
│  └─────────────────────────────────────┘                           │
├─────────────────────────────────────────────────────────────────────┤
│  REFLECTION CARD                                                    │
│  [Productive 4h] [Coding 2h] [Goals 2/3] [Habits 1/2] [Covenant 4] │
│  How did the day go...                                              │
│  [prompt: You spent 4h productive — where did it go?]              │
├─────────────────────────────────────────────────────────────────────┤
│  WEEK REVIEW (Mon→Sun bars)                                         │
│  Mon ████████ 4h 2 🔥                                               │
│  Tue ██████ 3h 1 🔥                                                 │
│  ...                                                                │
├─────────────────────────────────────────────────────────────────────┤
│  LIFE RIVER                                                         │
│  [phases visualization]                                             │
└─────────────────────────────────────────────────────────────────────┘
```

### 7.2 Responsive Behavior

**Desktop (≥1024px):**
- Two-column grid: 2/3 goals+schedule, 1/3 radar+reminders+vault
- Calendar strip shows ±14 days
- WeekBoard shows full habit grid

**Tablet (768–1023px):**
- Single column, full width
- Right sidebar sections stack below goals
- Calendar strip shows ±7 days

**Mobile (<768px):**
- Single column, full width
- Stat pills become 2×2 grid
- Schedule blocks are full width with reduced metadata
- Calendar strip is horizontally scrollable with snap points
- WeekBoard day cells are smaller (min-w-[40px])

---

## 8. Implementation Phases

### Phase 1: Demolition & Restoration (1–2 hours)
1. **Delete** `src/components/goals/GoalsSection.tsx`
2. **Delete** all imports of `GoalsSection` from `GoldPage.tsx`
3. **Restore** GoldPage's render method to directly render goal lists using existing `GoalCard`, `CriteriaBuilder`, etc.
4. **Verify** the page loads without `GoalsSection` — goals should render inline
5. **Preserve** all existing handlers (`handleAdd`, `handleToggle`, `handleDelete`, `handleEditStart`, `handleEditSave`, `handleToggleDay`)

### Phase 2: Schedule Redesign (2–3 hours)
1. **Fork** `ScheduleCard.tsx` → create `LifeScheduleCard.tsx` (or modify in place)
2. **Replace** all pink tokens with amber:
   - `ec4899` → `fbbf24`
   - `f472b6` → `f59e0b`
   - `pink-500` → `amber-400` / `amber-500`
3. **Remove** `SpotlightCard` wrapper, replace with `WarmCard ambient`
4. **Remove** internal day selector — accept `selectedDay` from parent
5. **Remove** `AnimatedGradientText` — use plain warm serif or semibold text
6. **Add** `linkedGoals` prop and render goal links in blocks
7. **Update** `GoldPage` to pass `selectedDate`, `selectedDay`, and `linkedGoals` to `ScheduleCard`

### Phase 3: Calendar Enhancement (1–2 hours)
1. **Update** `CalendarStrip` props to accept `marks` and `weekGoals`
2. **Implement** `getDotsForDate` helper
3. **Replace** single green dot with multi-dot flex row (max 3 dots)
4. **Style** dots: category colors for goals, rose diamonds for deadlines, amber circles for reminders
5. **Update** GoldPage to pass `radarMarks` and `weekGoals` to `CalendarStrip`

### Phase 4: Goal-Schedule Linking (1–2 hours)
1. **Add** `linkedScheduleId` handling to `CriteriaBuilder`
2. **Add** schedule entry dropdown in goal form (filter by selected day's schedule)
3. **Update** `GoalCard` to show "Scheduled" badge with calendar icon
4. **Update** `ScheduleCard` to show "Serves: [Goal]" beneath block title
5. **Add** `handleLinkGoalToSchedule` in GoldPage to sync both sides

### Phase 5: Integration Polish (1–2 hours)
1. **Add** `StatPill` sub-component for the 4 stat pills
2. **Integrate** `GoalLanguageParser` as collapsible section in goals area
3. **Integrate** `GoalAICoach` as card in goals area
4. **Integrate** `HabitTracker` in goals area
5. **Integrate** `MissedGoalRecoveryBanner` at top of goal list
6. **Add** `showLangParser` state to GoldPage
7. **Ensure** all `AnimatePresence` wrappers have proper `initial/animate/exit` props
8. **Test** empty states, loading states, error states for all sections

### Phase 6: Responsive & Visual Polish (1 hour)
1. **Add** `lg:grid-cols-3` two-column layout
2. **Test** mobile: calendar scroll, schedule blocks, vault cards
3. **Verify** amber accent consistency across all new components
4. **Verify** glass card consistency (`WarmCard ambient` everywhere)
5. **Check** that `BorderBeam` on current schedule block uses amber
6. **Final** pass: typography sizes, spacing, tabular-nums on all numbers

---

## 9. Verification Checklist

### Functionality
- [ ] `GoalsSection.tsx` is completely removed from the codebase
- [ ] GoldPage renders goals inline without importing `GoalsSection`
- [ ] Goal add/edit/delete/toggle all work exactly as before
- [ ] `WeekBoard` habit toggles update both the board and the goal list
- [ ] `CalendarStrip` navigation changes `selectedDate` and reloads all sections
- [ ] `DeadlineRadar` month navigation works independently
- [ ] `DeadlineRadar` clicking a date sets `selectedDate`
- [ ] `BellBoard` reminders can be created, toggled, deleted
- [ ] `TheVault` long-term goals can be added, edited, deleted
- [ ] `ReflectionCard` journal saves via API
- [ ] `WeekReview` shows productivity bars for Mon→Sun
- [ ] `LifeRiver` renders without errors

### Schedule Redesign
- [ ] Schedule card uses amber accent, not pink
- [ ] Schedule card uses `WarmCard` not `SpotlightCard`
- [ ] Schedule shows entries for the day matching `selectedDate`
- [ ] Current block has amber `BorderBeam` and "NOW" badge
- [ ] Schedule add/edit form uses amber focus rings
- [ ] Empty state uses warm amber styling
- [ ] Schedule blocks show linked goal titles and category colors
- [ ] No internal day selector in schedule (uses parent's date)

### Calendar Enhancement
- [ ] Calendar strip shows category-colored dots under dates with goals
- [ ] Calendar strip shows rose diamond dots for deadlines
- [ ] Calendar strip shows amber dots for reminders
- [ ] Max 3 dots per date, no overflow
- [ ] Today indicator uses amber (not violet)
- [ ] Selected date highlight uses amber border

### Integration
- [ ] Goals can be linked to schedule blocks from `CriteriaBuilder`
- [ ] Linked goals show "Scheduled" badge in `GoalCard`
- [ ] Schedule blocks show "Serves: [Goal]" for linked goals
- [ ] Focus session banner appears when focus is active
- [ ] Live tracking indicator shows on time-based goals during focus
- [ ] `MissedGoalRecoveryBanner` appears when goals are missed
- [ ] `GoalLanguageParser` creates goals that can link to schedule
- [ ] `GoalAICoach` proposals can be applied and refresh the list

### Visual & UX
- [ ] Page uses amber (`#fbbf24`) as primary accent throughout
- [ ] All cards use consistent glass styling (`WarmCard ambient`)
- [ ] Two-column layout on desktop, single column on mobile
- [ ] All numbers use `tabular-nums` for alignment
- [ ] Typography follows Geist 13px base, 600 headings
- [ ] Empty states are warm and helpful, not cold
- [ ] Loading states use pulse/skeleton consistently
- [ ] Error states offer retry actions
- [ ] Animations use `AnimatePresence` for smooth enter/exit
- [ ] Confetti fires on goal completion (amber/violet/gold colors)

### Performance
- [ ] No duplicate API calls on date change
- [ ] `useMemo` used for `activeGoals`, `completedGoals`, `todaySchedule`, `weekDates`
- [ ] `useCallback` preserved for all handler functions
- [ ] No unnecessary re-renders of `CalendarStrip` or `WeekBoard`

### Accessibility
- [ ] All interactive elements have `aria-label` where icon-only
- [ ] Color is not the sole means of conveying information
- [ ] Focus indicators visible on all buttons/inputs
- [ ] Text meets contrast ratios on glass backgrounds

---

## Appendix: Design Token Reference

```
Primary accent:     #fbbf24 (amber-400)
Secondary accent:   #f59e0b (amber-500)
Glass background:   bg-[rgba(24,24,27,0.60)]
Glass border:       border-[rgba(63,63,70,0.40)]
Backdrop blur:      backdrop-blur-xl
Warm text:          text-zinc-200
Muted text:         text-zinc-500
Subtle text:        text-zinc-600
Header font:        warmth-serif (italic for dates)
Body font:          Geist (sans)
Base size:          text-[13px]
Heading size:       text-[15px] font-semibold
Big date:           text-[44px] font-semibold text-amber-300 tabular-nums

Category dots:
  work:          #ec4899 (pink)
  personal:      #8b5cf6 (violet)
  health:        #34d399 (emerald)
  learning:      #22d3ee (cyan)
  finance:       #fbbf24 (amber)
  relationships: #fb7185 (rose)

Deadline:        #f43f5e (rose-500)
Reminder:        #fbbf24 (amber-400)
Success:         #34d399 (emerald-400)
Danger:          #f43f5e (rose-500)
```

---

*End of specification. Ready for implementation.*
