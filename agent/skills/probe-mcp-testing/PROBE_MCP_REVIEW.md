# Probe MCP — Capability Review & Improvement Feedback

> **Conversation date:** 2026-06-15
> **Context:** AI agent tested workspace sidebar features (Presets, Sessions, Analytics, etc.) on an Electron app via Probe MCP. After presenting results, the user questioned the depth and usefulness of the testing.

---

## User's Original Question (paraphrased + consolidated)

> "Does the Probe MCP test properly, or can it only check if a button renders? Can you actually see the response after clicking something — like text content, element state, the result of an action? How does the debug function work — does it work by making temporary console prints and checking them? Are you only able to verify that a button exists, which is too simple and doesn't test anything? The responses you gave look like you're only confirming buttons render.
>
> I want Probe to test like a human. What are the things that would improve the MCP so that you can explore more, test more, have more versatility on complex scenarios, be dynamic, and adapt itself to work for every scenario?"

---

## My Response Summary

### What Probe CAN Actually Do (far more than I used it for)

| Probe Capability | What It Really Does |
|---|---|
| **Check text content after click** | `probe_assert_text` + `probe_snapshot` shows element `name` fields — can verify success messages, error toasts, list entries appear |
| **Read any page state** | `probe_eval` runs arbitrary JS — can read React state, localStorage, DOM, any in-memory data |
| **Verify IPC wiring** | `probe_assert_ipc('channel-name')` confirms the backend IPC call actually fired |
| **Catch runtime errors** | `probe_read_console('error')` captures JS errors that happened during the test |
| **Wait for specific conditions** | `probe_wait_for(textPresent: 'Session created')` polls until expected text appears (vs just waiting N seconds) |
| **Verify computed styles** | `probe_assert_style` checks actual CSS (e.g., confirm success button is green) |
| **Read in-app checkpoints** | App can call `window.__probe.expect('presetSaved', true)` — Probe reads it with `probe_read_expectations` |
| **Full JS escape hatch** | `probe_eval` can call `window.deskflowAPI.addTerminalPreset(...)` directly — bypasses React form issues |
| **Check data persistence** | Create entity → navigate away → come back → verify entity still exists |

### Why My Tests Were Shallow

I treated the session as a **regression smoke test** — "do all tabs render without crashing?" That's Depth 1 on a 5-level scale. Real behavioral testing (Depth 3-4) would have been:

- Click Add Preset → type name/command → click Save → verify form closes → assert IPC fired → assert DB row was created → verify new preset appears in the list
- Create session → verify it appears in list → click Details → verify cost/token fields aren't NaN/undefined → click Messages → verify at least a welcome message appears
- Save session → close workspace → reopen → verify session still in list

### The Real Gaps (What Probe MCP Needs)

These are the genuine limitations I hit that blocked deeper testing:

#### 1. React Controlled Input Handling (Biggest Problem)
`probe_type` fires native DOM events but React's synthetic event system sometimes ignores them — the text appears on screen but `onChange` never fires, so React state never updates. **Workaround:** Call IPC directly via `probe_eval`, but this sidesteps the UI layer entirely.

*What would fix it:* A tool that dispatches the full `nativeInputValueSetter` + `input` + `change` + React internal event sequence.

#### 2. No "Wait for Element Ref"
`probe_wait_for` accepts CSS selectors or text strings, but not a snapshot ref (`@e3`). After a snapshot, I already have the ref — I should be able to wait for that specific element to become visible without re-querying.

#### 3. No "React State Settled" Detection
After clicking a button, there's no built-in way to know when React has finished re-rendering. I resort to `wait_for(time: 1)` which is fragile — too short misses the update, too long wastes time.

#### 4. Off-Viewport Elements Invisible
The Create Session button was at y=2522 — invisible in viewport-only snapshots. `viewportOnly: false` helps but some elements inside scrollable containers still don't appear.

#### 5. Main Process Errors Invisible Without `inspectMain`
If `probe_open` doesn't pass `inspectMain: true`, main process errors (e.g., `ipcMain.handle` throwing) are completely invisible. I can only see renderer-side IPC calls.

#### 6. No Conditional Assertions
Can't say "if this element exists, assert X; if not, assert Y" — makes it hard to test optional UI states like welcome modals that only show once.

#### 7. No Direct DB Verification
To check if data persisted, I have to go through the IPC round-trip (`getPresets()` → parse response → check list). No way to directly query the SQLite DB that backs the app.

#### 8. No Pseudo-Element Visibility
CSS `::before` / `::after` icons (like checkmarks or status indicators) are invisible in snapshots. If a button shows success via a `::before` checkmark, the snapshot can't see it.

#### 9. No Network Request Assertion
`probe_assert_ipc` covers Electron IPC but there's no equivalent for HTTP fetch/XHR calls the app might make to an API backend.

#### 10. No Keyboard Shortcut Tools
`probe_press_key` exists but there's no higher-level tool for `Ctrl+S`, `Cmd+K`, etc.

---

## Priority Ranking for Improvements

| Priority | Gap | Why It Matters Most |
|----------|-----|---------------------|
| **P1** | React controlled input handling | Without it, testing ANY form is unreliable; workaround requires bypassing the UI |
| **P2** | Wait-for-element-ref | Enables precise async sequencing without fragile timeouts |
| **P3** | React state settlement | Eliminates the #1 source of flaky tests (timing) |
| **P4** | Auto-scroll in snapshots | Ensures full-page element discovery without manual scrollTo |
| **P5** | Conditional assertions | Enables testing of branching UI flows (modal shown vs not) |
| **P6** | DB state verification | Eliminates the IPC round-trip for persistence checks |
| **P7** | Auto-scroll on click | Handles elements inside nested scroll containers |
| **P8** | Pseudo-element support | Catches icon-only state indicators |
| **P9** | Network request assertion | Covers HTTP-level communication |
| **P10** | Keyboard shortcut testing | Covers power-user workflows |

---

## My Assessment

Probe MCP is **capable of much more than I used it for.** The tools exist to do real behavioral testing (assert_text, assert_ipc, wait_for, eval). The issue was that I aimed too low — I treated it as a "does the page crash?" smoke test rather than a "does the feature work correctly?" behavioral test.

The React controlled input gap is the **single biggest blocker** to deep testing. Everything else has a workaround (eval, extra scrolling, etc.) but the React input problem forces you to either (a) skip UI testing or (b) call IPC directly, which tests the backend in isolation but not the full stack.

For the app's testing needs, Depth 3 (Behavioral/Data Flow) is the sweet spot — it catches real bugs without the maintenance cost of full regression suites. That requires fixing the React input issue first.
