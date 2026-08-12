# PROMPT: Life River Feature Overhaul

## Raw Request (Verbatim)

"there are a few things missing from this shit. First of all, the text input on the one creating the chapter is not connected to the speech to text. I need you to make sure that you take a note on this project, on somewhere in your mark non-files. Either it is that memory, that memory, that it's supposed, all the thing is supposed to connected to the speech to text feature and also another thing is that the draft I can save it as a draft, but there's no way for me to open those drafts, I can't see those drafts anywhere, I can't access them anywhere. Also, I may not have completed everything, but I think the feature of the gold and memories thing is not really able to show on the river thing, maybe it's on the adding the phases, but when I try to see, there is no actual showing of the covenant, the gold and the memories thing. I know it's not supposed to be directly related to those, I mean it should be separate, it can be separated, but there's no way for me to actually add those stuff, like memories and stuff. It should be that the river thing is mainly for the goals and the phases, but there should be a way for me to add those memories and stuff and still be able to connect them and still have the system able to connect them without actually having those mandatory on the adding phases thing, it should not interfere or interrupt, maybe we can add it in one of those processes of adding the phases, but it should be still on the same page, but it's sort of separate and nowhere, I can add it in a different button, a different button where this different button should be able to adjust according to which, often four things, phases, covenant, gold and memories that we choose, for example, for the covenant, it can be really related to this and it should all connect to the phases and the ability, one of the more important things is the ability for me to edit those, so to edit the phases and whatever it is, phases, covenant, gold, memories, I should be able to access those and be able to edit those, and the visualization should be intractable in a way that when I click on it, it should show the thing and I'm able to show the details and there should be a button to edit it, and there should be everything, the accessibility to edit it and make sure that everything is incorporated properly, as the picture is going to be incorporated properly, I'll just get that we can review the entire mode, not just in the phases form, but also in the covenant and gold, we can combine them together right, because currently we have this switching of the quote unquote mode, it's on the Ripper thing, but it only changes the circle part at the top, rather ring them at the top, it doesn't necessarily change anything else, I don't know if that's because I haven't set up any pictures or anything, but because in the Ripper mode, you can't really set up much on those, yeah, there's no way there's no buttons, we need to make sure that those stuff are actually orchestrated and integrated properly in a way that, like, it's beautiful, it's still onto the same thing, so it's still on the same design and it's incorporated properly, right, and I think we need to use the generic prompt skill because it's like very complicated how the design is for it to make sure that it still stays on land, still stays on track, and the design and everything stays beautiful, so the ability to edit, the ability to view properly, the ability to, you know, for example, make the life river on the bottom of the visualization a bit bigger, right, because currently it's kind of really small, to be more visible, more prominent, I think that's pretty much it for now"

## Problem Statement

The Life Page River mode is incomplete. The user has 6 core problems:

1. **Speech-to-text not connected** — Phase creation dialog textareas have no mic buttons
2. **Drafts inaccessible** — Can save as draft but no UI to view/resume drafts
3. **Covenant/Gold/Memories invisible** — Lens switcher only changes ring visualization, nothing else
4. **No way to add data from River mode** — Must switch to Pages mode to add memories, goals, covenant
5. **No edit access from visualization** — Clicking rings doesn't open edit dialog
6. **River too small** — Visualization is too small, needs to be more prominent

## Critical Context

ALL code changes are already implemented in the source files. The built bundle contains all changes. The console log `[LifePage] v2.0 loaded` appears, proving the new code runs. **BUT THE USER SEES NOTHING VISUAL.**

The reason: ALL changes are interactive-only. They only appear when:
- Opening the dialog (voice input)
- Switching lens (opacity changes)
- Having draft phases (draft list)
- Clicking rings (edit dialog)

**The user expects to see DIFFERENCE just by looking at the page, not after performing specific actions.**

## Engineering Task

Design a complete solution where EVERY feature is visible by default when the page loads. The solution must:

1. **Make lens indicator ALWAYS visible** — Show current lens name + icon below the ring switcher
2. **Make quick-add toolbar ALWAYS visible** — Show 4 buttons (Phase, Covenant, Goal, Memory) with active lens highlighted
3. **Show data preview cards on default lens** — Covenant/Goals/Memories counts visible without switching lens
4. **Make drafts section ALWAYS visible** — Show draft list OR "No drafts" placeholder
5. **Add voice badge on Add Phase button** — Visible mic indicator
6. **Build inline add modals** — Covenant, Gold, Memory forms that open as overlays (no page navigation)
7. **Wire ring clicks to edit dialog** — Clicking a ring opens PhaseFormDialog
8. **Enforce river canvas height** — Make it visibly taller

## Constraints
- Must work with existing IPC handlers
- Must stay in dark mode, glass cards, amber/emerald/rose accents
- VoiceInputWrapper pattern: `<VoiceInputWrapper><textarea /></VoiceInputWrapper>`
- All data hooks already return real data
- Must NOT navigate away from River mode for any add action

## Expected Output
A RESULT.md with:
1. Exact code changes per file (not descriptions — actual JSX/CSS)
2. How each feature becomes visible without user interaction
3. How real data shows in each lens mode
4. Inline add forms that don't navigate away
5. Runtime verification steps
