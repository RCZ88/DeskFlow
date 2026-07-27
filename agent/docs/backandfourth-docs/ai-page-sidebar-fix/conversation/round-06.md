# Round 06 — Owner → Specialist

## Date: 2026-07-27
## Status: In Progress

---

## Owner's Responses

### Response to REQUEST 1 (Missing hooks/state in AiPage.tsx):

**All missing state is defined inline in AiPage.tsx — there are NO additional custom hooks beyond the 5 we already verified.** Here's the complete state map:

```tsx
// Lines 71-152 — ALL state definitions in AiPage.tsx:
const [goals, setGoals] = useState<Goal[]>([]);                    // line 71
const [review, setReview] = useState<string | null>(null);         // line 72
const [goalsState, setGoalsState] = useState<DataState>('loading'); // line 73
const [goalsError, setGoalsError] = useState<string | null>(null); // line 74
const [suggestions, setSuggestions] = useState<Goal[]>([]);        // line 75
const [planGoals, setPlanGoals] = useState<Goal[]>([]);            // line 76
const [longTermGoals, setLongTermGoals] = useState<LongTermGoal[]>([]); // line 77
const [planningNotes, setPlanningNotes] = useState('');            // line 78
const [showFeatures, setShowFeatures] = useState(false);           // line 79
const navigate = useNavigate();                                    // line 80

const [digestTopics, setDigestTopics] = useState<any[]>([]);       // line 86
const [digestState, setDigestState] = useState<DataState>('loading'); // line 87
const [digestReason, setDigestReason] = useState<string | null>(null); // line 88

const [aiProviders, setAiProviders] = useState([]);                // line 91
const [aiRouting, setAiRouting] = useState({});                    // line 92
const [configuringFeature, setConfiguringFeature] = useState(null); // line 93
const [showConnectorSetup, setShowConnectorSetup] = useState(false); // line 94
const [connectorsState, setConnectorsState] = useState('loading'); // line 95
const [connectors, setConnectors] = useState([]);                  // line 96

const chat = useAiChat();           // line 98 — VERIFIED CLEAN
const slash = useSlashCommands();   // line 99 — VERIFIED CLEAN
const voice = useVoiceInput({...}); // line 100 — VERIFIED CLEAN

const [actionResults, setActionResults] = useState({});            // line 105
const [connectorSyncing, setConnectorSyncing] = useState({});      // line 106
const [reflectDays, setReflectDays] = useState([]);                // line 107
const [connectorStatus, setConnectorStatus] = useState({...});     // line 108
const [toasts, setToasts] = useState([]);                          // line 115

const [dayWindow, setDayWindow] = useState(5);                     // line 140
const [historyOpen, setHistoryOpen] = useState(false);              // line 144
const [chatHistoryOpen, setChatHistoryOpen] = useState(false);      // line 145
const [commandsOpen, setCommandsOpen] = useState(false);            // line 146
const [expandedCardIds, setExpandedCardIds] = useState(new Set());  // line 147
const [canvasMode, setCanvasMode] = useState(true);                 // line 148
const [selectedCardId, setSelectedCardId] = useState(null);         // line 149
const [paletteOpen, setPaletteOpen] = useState(false);              // line 150
const canvas = useCanvasState();                                     // line 151 — VERIFIED CLEAN
const [autoApprove, setAutoApprove] = useState(false);              // line 152

const [bootState, setBootState] = useState('loading');              // line 553
const [bootError, setBootError] = useState(null);                   // line 554

// Derived values (not hooks):
const mode = determineMode(goals);                                  // line 390
const defaultBadge = getProviderBadge(aiProviders, aiRouting.default); // line 1072
```

**No additional hooks.** All state is defined inline. The only custom hooks are the 5 we already verified: `useAiChat`, `useSlashCommands`, `useVoiceInput`, `useCanvasState`, `useAutoSync`.

---

### BUG FOUND: `setRailOpen` is undefined

**`setRailOpen` is used on line 616 but is NEVER defined in AiPage.tsx.**

```tsx
// Lines 606-621:
useEffect(() => {
  const handler = (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault()
      setPaletteOpen(v => !v)
    }
    // ⌘⇧L / Ctrl+Shift+L to toggle transcript rail
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'L') {
      e.preventDefault()
      setRailOpen(v => !v)    // <-- BUG: setRailOpen is not defined
    }
  }
  window.addEventListener('keydown', handler)
  return () => window.removeEventListener('keydown', handler)
}, [])
```

This would cause a `ReferenceError: setRailOpen is not defined` when the user presses Ctrl+Shift+L. However, this is a **keyboard-triggered bug**, not a mount-time bug — the error only fires when the key combination is pressed, not on component mount.

**This is NOT the root cause of the sidebar issue**, but it IS a bug that needs fixing.

---

### Response to REQUEST 2 (AiPageDeck):

**Already covered in Round 1.** `AiPageDeck` is only rendered when `canvasMode === false` (line 1168). Since `canvasMode` defaults to `true` (line 148), the Deck component is NOT rendered on initial mount. Only `CanvasContainer` is rendered.

---

### Response to QUESTION 3 (Fresh Load Test):

**I cannot run interactive tests** (probe tools won't connect to the running Electron instance). The user needs to test this manually:

**Test:** Refresh the Electron app while the URL shows `/ai`. Does the sidebar work on the fresh load, or is it broken immediately?

---

### Response to QUESTION 4 (The "Rail" State):

**`setRailOpen` is a BUG.** It's referenced on line 616 but never defined. There is NO `railOpen` state in AiPage.tsx. The "Transcript Rail" mentioned in the comment (line 613) does not have a corresponding state variable.

This means:
- Pressing Ctrl+Shift+L would throw `ReferenceError: setRailOpen is not defined`
- This error would be caught by the keyboard handler's closure, NOT by React's error boundary
- The error would silently fail — no crash, no UI change

**This is a separate bug from the sidebar issue**, but should be fixed. The `railOpen` state needs to be added, and the TranscriptRail component needs to be implemented or the keyboard shortcut removed.

---

## Summary

| Question | Answer |
|----------|--------|
| Where do missing hooks come from? | NO additional hooks — all state is inline in AiPage.tsx |
| Does AiPageDeck render on mount? | NO — `canvasMode` defaults to `true`, Deck is hidden |
| Fresh load test? | User needs to test manually |
| What does setRailOpen control? | NOTHING — it's undefined (bug) |

## Convergence Status
**All code paths verified.** The Specialist now has the complete picture. The only remaining test is the fresh load test (manual).
