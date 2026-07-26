# Round 4 — Project Owner → Specialist

## Sent: LearnPage.tsx Full Source Code

**Request:** Specialist asked for `src/components/learn/LearnPage.tsx` (lines covering AnimatePresence block and Header/Navigation JSX)

**Response:** Full 776-line source code provided. File saved to `conversation/round-04-CONTEXT-LearnPage.tsx`.

**Key architecture points shared:**
- View type: `'welcome' | 'showcase' | 'library' | 'reader' | 'import' | 'intents' | 'progress'`
- 30+ useState hooks for state management
- AnimatePresence mode="wait" wrapping all view renders
- Welcome view returns early (no header chrome)
- Header: conditional buttons per view (Home, Curriculum, Profile, Ideas, Progress, How it works)
- Reader view: passes 20+ props to ReaderView component
- 5 modal components at root level
- Keyboard shortcuts (j/k/a/g/?/Esc) in reader view

**Status:** Awaiting Specialist's next REQUEST or architectural proposal.
