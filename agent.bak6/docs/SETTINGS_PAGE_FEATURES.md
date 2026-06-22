# Settings Page Features Documentation

**Purpose:** Complete reference for all Settings page features, UI specifications, and what was lost/rebuilt multiple times.

**Last Updated:** 2026-04-21

---

## 📋 Current Feature List (What SHOULD Be There)

### Category Tab

1. **Application Carousel**
   - Line/rectangle style (NOT circles)
   - 5 items per row (1 row = 5 apps, 3 rows = 15 apps)
   - Expandable: click "Show More" to show 3 rows (15 apps), collapsed shows 1 row (5 apps)
   - Both apps AND websites shown with toggle button
   - Click app/website name to edit category inline

2. **Website Carousel**
   - Same line/rectangle style as applications
   - Same expandable behavior (1 row / 3 rows)
   - Toggle between Apps and Websites view

3. **Smart Website Categorization**
   - Add domains with keyword rules
   - Default keywords for productive YouTube (tutorial, course, learn, etc.)
   - Per-domain default categories

4. **Category Assignments** (SHOULD BE ONLY ONE SECTION)
   - Carousel-based with drag-to-reorder
   - Shows all categories with color indicators
   - Remove duplicate - ONLY ONE instance allowed

5. **Magic Category** (AI Feature - NOT YET IMPLEMENTED)
   - Button to auto-categorize all apps/websites using AI
   - Confirm/Undo flow: Show preview → User confirms → Apply

---

### Colors Tab

1. **Category Colors**
   - Line/rectangle style color picker (NOT circles)
   - ColorPicker dimensions: w-16/h-3 (sm), w-20/h-4 (md)
   - Shows all categories with their colors
   - Click color bar to change

2. **Application Colors**
   - Line/rectangle style color picker
   - 5x3 grid layout (5 columns, 1 row default, 3 rows expanded)
   - Expandable: "Show More" / "Show Less" button
   - Shows ALL apps from database (no time filter)
   - Search/filter input

3. **Magic Color** (AI Feature - NOT YET IMPLEMENTED)
   - Button with Sparkles icon
   - Generate brand-appropriate colors for all apps
   - Confirm/Undo flow: Show preview → User confirms → Apply

4. **Apps/Websites Toggle**
   - Toggle between viewing Apps colors and Websites colors in Colors tab

---

### General Tab

1. **Idle Threshold**
   - Slider or input for minutes

2. **Auto Export**
   - Toggle for CSV/JSON export

3. **Data Management**
   - Clear data button
   - Export data buttons
   - View database button

---

## 🎨 UI Specifications

### ColorPicker Component

**Current (WRONG - needs fix):**
```tsx
// Circle style - NOT acceptable
<button className="w-7 h-7 rounded-full" />
```

**Must Be (RECTANGLE style):**
```tsx
// Line/rectangle style
<button 
  className={size === 'sm' ? 'w-16 h-3' : 'w-20 h-4'}
  style={{ borderRadius: '4px' }}
/>
```

### Grid Layout

- **Default:** 5 columns × 1 row = 5 items
- **Expanded:** 5 columns × 3 rows = 15 items
- **Expand button text:** "Show More" / "Show Less"
- **Toggle between Apps and Websites**

---

## 📦 Required State Variables

### Existing (should already be there)

```tsx
const [activeTab, setActiveTab] = useState<'category' | 'colors' | 'general'>('category');
const [appCarouselPage, setAppCarouselPage] = useState(0);
const [appCarouselExpanded, setAppCarouselExpanded] = useState(false);
const [domainCarouselPage, setDomainCarouselPage] = useState(0);
const [domainCarouselExpanded, setDomainCarouselExpanded] = useState(false);
const [colorEditMode, setColorEditMode] = useState<'apps' | 'websites'>('apps');
const [appColors, setAppColors] = useState<Record<string, string>>({});
const [domainColors, setDomainColors] = useState<Record<string, string>>({});
```

### NEED TO ADD (missing):

```tsx
const [colorTab, setColorTab] = useState<'apps' | 'websites'>('apps');
const [colorExpanded, setColorExpanded] = useState(false);
const [colorSearchFilter, setColorSearchFilter] = useState('');
const [openColorPicker, setOpenColorPicker] = useState<string | null>(null);
const [generatingColors, setGeneratingColors] = useState(false);
const [pendingColors, setPendingColors] = useState<Record<string, string>>({});
const [preAiColors, setPreAiColors] = useState<Record<string, string>>({});
```

---

## 🔌 Required Backend IPC Handlers

### preload.ts additions

```tsx
// Already exists
generateAIColors: (apps: string[]) => Promise<Record<string, string>>;

// Need to add
generateAICategorization: (items: Array<{name: string, category: string}>) => Promise<Array<{name: string, category: string}>>;
```

### main.ts additions

```tsx
// Handler: generate-ai-colors (using HTTPS to openrouter.ai)
// Handler: generate-ai-categorization (using HTTPS to openrouter.ai)
```

---

## 🚫 Features TO REMOVE

1. **Duplicate Category Assignments section** - The file may have two instances of `{activeTab === 'category'}` blocks. Only ONE allowed.

---

## 🔄 User Flows

### Magic Color Flow

1. User clicks "Magic Color" button (with Sparkles icon)
2. Button shows loading state + "Generating..."
3. Backend calls OpenRouter API with all app/website names
4. Returns brand-appropriate color for each app
5. Preview shows with "Confirm" or "Cancel" buttons
6. User clicks "Confirm" → Apply colors
7. User clicks "Cancel" → Revert to pre-AI colors
8. Button returns to normal state

### Magic Category Flow

1. User clicks "Magic Category" button
2. Button shows loading state
3. Backend calls OpenRouter API
4. Returns suggested category for each app/website
5. Preview shows with "Confirm" or "Cancel" buttons
6. User confirms → Apply categories

---

## 📊 Import Requirements

### Current imports (keep these):
```tsx
import { 
  Settings, Database, Clock, Download, Trash2, RefreshCw, 
  ChevronRight, X, Plus, GripVertical, Palette, Check, ChevronDown, Globe,
  ChevronLeft, Search, AlertTriangle
} from 'lucide-react';
```

### Need to ADD:
```tsx
import { Sparkles, ChevronUp } from 'lucide-react';
```

---

## ⚠️ CRITICAL RULES

### NEVER USE GIT TO REVERT

**This is the #1 cause of losing Settings page features:**

```
NEVER run these commands:
- git checkout -- <file>
- git checkout HEAD -- <file>
- git restore <file>
- git reset --hard
- git stash
```

**When something breaks:**
1. Read the error message
2. Fix the code manually
3. Run build to test
4. If build passes, user tests functionality

**Only the USER can decide to use git to revert.**

### ALWAYS UPDATE STATE.MD

After ANY change to SettingsPage.tsx, add entry to `agent/state.md`:
```markdown
### YYYY-MM-DD — [Description]

**What Changed:**
1. ✅ [Change 1]
2. ✅ [Change 2]

**Files Modified:**
- `src/pages/SettingsPage.tsx` - [Description]

**Why:** Brief explanation

**Result:** What user sees now
```

---

## 🔍 How to Verify Settings Page is Correct

1. **Check color picker is RECTANGLE style** (not circle)
   - Look for `w-16 h-3` or `w-20 h-4` class
   
2. **Check grid is 5x3** (5 columns × 1-3 rows)
   - Look for `grid-cols-5`

3. **Check Colors tab has toggle** between Apps/Websites
   - Look for `colorTab` state

4. **Check Magic Color button exists**
   - Look for `Sparkles` import and generatingColors state

5. **Check NO duplicate Category sections**
   - Count `{activeTab === 'category'}` - should be exactly 1

6. **Run build to verify:**
   ```bash
   npm run build
   ```
   If build passes, code is syntactically correct.

---

## 📝 Template for Future Changes

When adding new features to Settings page:

```markdown
### Feature Name

**What:** Brief description

**Files to Modify:**
- `src/pages/SettingsPage.tsx` - Add UI
- `src/preload.ts` - Add API binding (if needed)
- `src/main.ts` - Add IPC handler (if needed)
- `agent/state.md` - Document change
- `agent/docs/SETTINGS_PAGE_FEATURES.md` - Add to this file

**Testing:**
1. Run `npm run build`
2. Open app → Settings → [Tab]
3. Test the new feature works
```

---

## 📚 Related Files

| File | Purpose |
|------|---------|
| `src/pages/SettingsPage.tsx` | Main Settings page (1781 lines) |
| `src/main.ts` | Backend IPC handlers |
| `src/preload.ts` | Frontend API bindings |
| `agent/state.md` | Version history |
| `agent/debugging.md` | Common errors |