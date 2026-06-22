# ⚠️ Project Constraints

**Purpose:** Hard rules and limitations for the DeskFlow project.

---

## 🔒 Hard Constraints

### Electron
- **No external URLs** - All assets must be local
- **No nodeIntegration** - Must use contextIsolation
- **CJS for Electron** - Main/preload must be CommonJS (.cjs)
- **Path spaces** - Avoid paths with spaces for native modules

### React
- **HashRouter only** - No BrowserRouter (file:// protocol)
- **No direct DOM** - Use refs for Three.js integration
- **TypeScript** - All new code must be TypeScript

### Three.js / R3F
- **CanvasTexture** - Must set colorSpace = SRGBColorSpace
- **Texture wrapping** - RepeatWrapping for both S and T
- **Sphere geometry** - Minimum 64x64 segments
- **No external models** - Procedural only

### Database
- **SQLite preferred** - JSON fallback only if SQLite fails
- **Deferred init** - Initialize after app.whenReady()
- **No SQL injection** - Use prepared statements

### Build
- **Vite base** - Must be './' for Electron
- **TypeScript target** - ES2020 for Electron, ESNext for React
- **No eval** - Content Security Policy

---

## 📏 Style Constraints

### Code Style
- **2 spaces** - Indentation
- **Single quotes** - Strings (unless JSX requires double)
- **Semicolons** - Always
- **Arrow functions** - Prefer for callbacks
- **Type annotations** - Required for function parameters

### File Organization
- **Components** - PascalCase (OrbitSystem.tsx)
- **Utilities** - camelCase (computePlanets.ts)
- **Types** - PascalCase (PlanetData)
- **Constants** - UPPER_SNAKE_CASE (APP_CATEGORIES)

### Naming
- **Descriptive** - Clear purpose in name
- **No abbreviations** - Unless universally known (API, URL)
- **Boolean prefix** - is, has, should, can
- **Event handlers** - handle prefix (handleClick)

---

## 🚫 Forbidden Patterns

### Never Do:
- ❌ Direct DOM manipulation without refs
- ❌ any type (use proper TypeScript types)
- ❌ console.log in production (use console.error/warn)
- ❌ Magic numbers (use named constants)
- ❌ Deeply nested components (max 3 levels)
- ❌ Large files (>500 lines, split into modules)
- ❌ Unused imports
- ❌ @ts-ignore without comment
- ❌ eval() or Function()
- ❌ innerHTML

### Always Do:
- ✅ Type all props and state
- ✅ Handle errors with try/catch
- ✅ Clean up effects (return cleanup function)
- ✅ Use React.memo for expensive renders
- ✅ Memoize expensive computations (useMemo)
- ✅ Debounce throttle user inputs
- ✅ Test critical paths
- ✅ Update state.md after changes

---

## 🔧 Technical Constraints

### Performance
- **60 FPS target** - Maintain in Solar System view
- **Max 12 planets** - Hard limit for performance
- **Texture size** - Max 1024x512
- **Geometry segments** - 64x64 max for planets
- **Orbit segments** - 256 max for paths

### Memory
- **Log limit** - 1000 entries max
- **Texture cache** - Reuse textures per category
- **Event listeners** - Always clean up
- **WebGL contexts** - One Canvas only

### Compatibility
- **Windows 10+** - Minimum OS
- **Node.js 18+** - Runtime
- **Electron 41** - Framework
- **Chrome 120+** - WebView

---

## 📋 Decision Rules

### When Adding Features:
1. Does it break existing functionality?
2. Does it follow existing patterns?
3. Is it performant (60 FPS)?
4. Is it maintainable?
5. Is it documented?

### When Fixing Bugs:
1. Reproduce consistently?
2. Root cause identified?
3. Fix doesn't break other things?
4. Edge cases handled?
5. State.md updated?

### When Refactoring:
1. Tests pass before starting?
2. Small reversible changes?
3. Functionality identical?
4. Patterns improved?
5. Documentation updated?

---

## 🔄 Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-04-04 | Initial creation |

---

**Last Updated:** 2026-04-04
**Maintained By:** AI Development Team
