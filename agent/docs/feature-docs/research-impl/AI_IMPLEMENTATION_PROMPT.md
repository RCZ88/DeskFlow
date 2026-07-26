# 🪐 DeskFlow Solar System - AI Implementation Prompt

**Instructions:** Copy this entire prompt and paste it into a new AI chat session. Attach the `ORBITAL_IMPROVEMENTS.md` file alongside it.

---

## PROMPT START

I'm working on a DeskFlow Electron app that visual app usage data as a 3D solar system. I need you to help me implement a comprehensive set of improvements to the orbital visualization.

### 📎 Attached File
I've attached `ORBITAL_IMPROVEMENTS.md` which contains:
- Complete list of current issues
- All requested improvements
- Technical specifications and code snippets
- Implementation roadmap (Phases 2-5)
- Design principles and user feedback
- Success criteria

**Please read this file thoroughly before proceeding.**

---

### 🎯 Current State

**What's Already Working (Phase 1 - DONE):**
- ✅ Elliptical orbits with Keplerian elements
- ✅ Unique orbit radius per planet (collision avoidance)
- ✅ Orbital inclination (tilt per planet)
- ✅ Improved planet emissive lighting
- ✅ Rotation speed shown in detail panel
- ✅ Category-based distance removed (now usage-based)

**What Needs Fixing (URGENT):**
1. ❌ Planets are too close together - need better spacing
2. ❌ Orbit paths not clearly visible (need elliptical path rendering)
3. ❌ Planet textures need higher quality and more variation
4. ❌ Lighting still too uniform (need day/night differentiation)

---

### 🚀 Your Task

**Step 1: Review & Plan**
1. Read `ORBITAL_IMPROVEMENTS.md` completely
2. Identify the top 5 highest-impact improvements
3. Create a detailed implementation plan with:
   - Specific code changes needed
   - File locations to modify
   - Expected visual outcome
   - Potential risks or dependencies

**Step 2: Prioritize**
Rank improvements by:
- **User Impact** (how much it improves the experience)
- **Implementation Complexity** (how hard it is to code)
- **Performance Cost** (FPS impact)

**Step 3: Present Your Plan**
Show me:
1. **What you'll implement first** (and why)
2. **Code snippets** for the key changes
3. **Visual mockup description** of expected result
4. **Any questions** you have before starting

---

### 📋 Key Requirements

**Must Preserve:**
- 60 FPS performance
- Current data flow (logs → planets)
- Elliptical orbit mechanics (already working)
- Collision avoidance (no overlapping orbits)

**Must Improve:**
- Planet spacing (logarithmic scaling preferred)
- Orbit path visibility (show actual elliptical paths)
- Texture quality (higher res, more variation)
- Lighting realism (day/night sides)

**Nice to Add (if time permits):**
- Atmospheric glow effects
- Moon orbital mechanics
- Focus mode (camera follows planet)
- Intro animation

---

### 💻 Technical Context

**Tech Stack:**
- React + TypeScript (frontend)
- React Three Fiber + Three.js (3D rendering)
- Electron (desktop wrapper)
- Vite (build tool)

**Key Files:**
- `src/components/OrbitSystem.tsx` - Main solar system component
- `src/App.tsx` - Main app with data flow
- `src/main.ts` - Electron main process (data storage)

**Current Orbit Calculation:**
```typescript
// Already implemented - elliptical orbits
const semiLatusRectum = semiMajorAxis * (1 - eccentricity * eccentricity);
const distance = semiLatusRectum / (1 + eccentricity * Math.cos(angle + longitudeOfPerihelion));
```

**Current Planet Rendering:**
```typescript
// Already implemented - emissive glow
<meshPhongMaterial
  map={texture}
  emissive={data.color}
  emissiveIntensity={0.3}
  shininess={80}
/>
```

---

### 🎨 Design Guidelines

**From User Feedback:**
- "Planets are way too close to one another"
- "Each planet should have its own orbit path"
- "Texture of the planet is very important"
- "Currently it's so dark and planets are not visible"
- "Show rotation speed when clicking the planet" ✅ DONE

**Design Principles:**
1. Form follows function - aesthetics serve data visualization
2. Progressive enhancement - start simple, add complexity
3. User control - let users toggle advanced features
4. Accessibility - color-blind friendly, readable at all sizes

---

### 📤 Expected Output

After reviewing the markdown file and planning, please provide:

1. **Implementation Plan** (bullet list of what you'll do first)
2. **Code Changes** (specific files and functions to modify)
3. **Visual Description** (what the user will see after changes)
4. **Questions** (anything you need clarification on before starting)

**Then wait for my approval before making any code changes.**

---

### ⚠️ Important Notes

- **DO NOT** make changes without showing me the plan first
- **DO** reference specific sections from `ORBITAL_IMPROVEMENTS.md`
- **DO** explain the "why" behind each change
- **DON'T** break existing functionality (elliptical orbits, collision avoidance)
- **DO** maintain 60 FPS performance

---

### 🎯 Success Criteria

After implementation, the solar system should:
- ✅ Show clearly separated planets (no clustering)
- ✅ Display visible orbit paths for each planet
- ✅ Have high-quality, distinct textures
- ✅ Show realistic lighting (day/night sides)
- ✅ Maintain smooth 60 FPS performance
- ✅ Be visually impressive and meaningful

---

**Ready? Please review the attached `ORBITAL_IMPROVEMENTS.md` and present your implementation plan.**

## PROMPT END

---

## 📝 How to Use This Prompt

1. **Open a new AI chat session** (this one or another AI)
2. **Attach the file:** `ORBITAL_IMPROVEMENTS.md`
3. **Copy and paste** everything between "PROMPT START" and "PROMPT END"
4. **Wait for the AI's plan** before approving any changes
5. **Review the plan** and ask questions if needed
6. **Approve implementation** once you're satisfied with the approach

---

## 💡 Tips for Best Results

- **Be specific** about what you want changed
- **Ask for visual descriptions** before code changes
- **Request incremental changes** (don't do everything at once)
- **Test after each phase** to ensure nothing breaks
- **Save working versions** before major changes

---

**Good luck! This prompt will give any AI complete context for improving your solar system visualization.** 🚀
