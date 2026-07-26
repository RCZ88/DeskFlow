# Audit Report: DeskFlow AI Assistant Page

> Generated: Jul 18, 2026
> Scope: `src/pages/AiPage.tsx` + all imports + all child components

---

## 1. Component Tree (42 components)

```
AiPage (1081 lines — GOD COMPONENT)
├── AiPageDeck (layout + expandable cards)
│   ├── ChatPanel (message list + input)
│   │   ├── MessageBubble (per message)
│   │   │   ├── TypewriterText (streaming)
│   │   │   ├── MarkdownRenderer (final)
│   │   │   ├── ThoughtSection (collapsible <thought> tags)
│   │   │   └── ParsedMessageRouter → 10 card renderers:
│   │   │       GoalSuggestion, PlanUpdate, StatsSummary,
│   │   │       ActionList, DigestTopic, ConnectorStatus,
│   │   │       FormFill, ChartData, Error, CardShell
│   │   ├── SlashCommandPalette (autocomplete)
│   │   ├── ChatInput (textarea + voice + send)
│   │   └── AgentProgressBar
│   ├── ExpandableCard × 5 (connectors, focus, plan, reflect, digest)
│   ├── FocusBoard → GoalRow[]
│   ├── PlanBoard (goals + notes tabs)
│   ├── ReflectFeed
│   └── DailyDigestBoard
├── ConnectorsPanel → ConnectorCard[]
├── ChatHistory (thread list modal)
├── SlashCommandManager (CRUD modal)
├── GoalsRemindersDrawer
├── AIFeaturesModal
├── AiProviderSelectModal
└── ConnectorSetupModal
```

### Component Locations

| Component | File Path |
|---|---|
| AiPage | `src/pages/AiPage.tsx` |
| AiPageDeck | `src/components/ai/deck/AiPageDeck.tsx` |
| ChatPanel | `src/components/ai/chat/ChatPanel.tsx` |
| ChatInput | `src/components/ai/chat/ChatInput.tsx` |
| MessageBubble | `src/components/ai/chat/MessageBubble.tsx` |
| TypewriterText | `src/components/ai/chat/TypewriterText.tsx` |
| MarkdownRenderer | `src/components/ai/chat/MarkdownRenderer.tsx` |
| ThoughtSection | `src/components/ai/chat/ThoughtSection.tsx` |
| ParsedMessageRouter | `src/components/ai/chat/ParsedMessageRouter.tsx` |
| SlashCommandPalette | `src/components/ai/chat/SlashCommandPalette.tsx` |
| SlashCommandManager | `src/components/ai/chat/SlashCommandManager.tsx` |
| AgentProgressBar | `src/components/ai/chat/AgentProgressBar.tsx` |
| ChatHistory | `src/components/ai/chat/ChatHistory.tsx` |
| FocusBoard | `src/components/ai/focus/FocusBoard.tsx` |
| GoalRow | `src/components/ai/focus/GoalRow.tsx` |
| PlanBoard | `src/components/ai/plan/PlanBoard.tsx` |
| ReflectFeed | `src/components/ai/reflect/ReflectFeed.tsx` |
| SummaryGrid | `src/components/ai/summary/SummaryGrid.tsx` (imported, never rendered) |
| DailyDigestBoard | `src/components/ai/digest/DailyDigestBoard.tsx` |
| ConnectorsPanel | `src/components/ai/connectors/ConnectorsPanel.tsx` |
| GoalsRemindersDrawer | `src/components/ai/reminders/GoalsRemindersDrawer.tsx` |
| CardShell | `src/components/ai/chat/renderers/CardShell.tsx` |
| GoalSuggestionCard | `src/components/ai/chat/renderers/GoalSuggestionCard.tsx` |
| PlanUpdateCard | `src/components/ai/chat/renderers/PlanUpdateCard.tsx` |
| StatsSummaryCard | `src/components/ai/chat/renderers/StatsSummaryCard.tsx` |
| ActionListCard | `src/components/ai/chat/renderers/ActionListCard.tsx` |
| DigestTopicCard | `src/components/ai/chat/renderers/DigestTopicCard.tsx` |
| ConnectorStatusCard | `src/components/ai/chat/renderers/ConnectorStatusCard.tsx` |
| FormFillCard | `src/components/ai/chat/renderers/FormFillCard.tsx` |
| ChartDataCard | `src/components/ai/chat/renderers/ChartDataCard.tsx` |
| ErrorCard | `src/components/ai/chat/renderers/ErrorCard.tsx` |

### Hooks

| Hook | File Path |
|---|---|
| useAiChat | `src/hooks/useAiChat.ts` |
| useSlashCommands | `src/hooks/useSlashCommands.ts` |
| useAutoSync | `src/hooks/useAutoSync.ts` |
| useVoiceInput | `src/hooks/useVoiceInput.ts` |

### Services

| Service | File Path |
|---|---|
| aiContextBundle | `src/services/aiContextBundle.ts` |
| customSlashCommands | `src/services/customSlashCommands.ts` |
| planningParser | `src/services/planningParser.ts` |
| chatPersistence | `src/services/chatPersistence.ts` |

---

## 2. State Management

**Approach**: All state via React `useState` in `AiPage.tsx` and `useAiChat.ts`. Zero external stores. Zero Context providers.

### AiPage.tsx State Variables (33+)

| Variable | Type | Purpose |
|---|---|---|
| `goals` | `Goal[]` | Today's daily goals |
| `review` | `string \| null` | Evening review text |
| `goalsState` | `DataState` | loading/empty/error/ready |
| `goalsError` | `string \| null` | Error message |
| `suggestions` | `Goal[]` | AI-generated goal suggestions |
| `planGoals` | `Goal[]` | Goals from planning.md |
| `longTermGoals` | `LongTermGoal[]` | Long-term goals |
| `planningNotes` | `string` | Raw planning.md content |
| `showFeatures` | `boolean` | AIFeaturesModal toggle |
| `digestTopics` | `any[]` | Daily digest topics |
| `digestState` | `DataState` | Digest loading state |
| `digestReason` | `string \| null` | Digest error |
| `aiProviders` | `Array` | Available AI providers |
| `aiRouting` | `Record` | Feature-to-provider routing |
| `configuringFeature` | `string \| null` | Which provider modal is open |
| `showConnectorSetup` | `boolean` | Connector setup modal |
| `connectorsState` | `DataState` | Connectors loading |
| `connectors` | `Connector[]` | Active connectors |
| `actionResults` | `Record` | IPC action execution status |
| `connectorSyncing` | `Record` | Per-connector sync state |
| `reflectDays` | `GoalDay[]` | Historical days |
| `toasts` | `Toast[]` | Notification queue |
| `reminders` | `any[]` | User reminders |
| `calendarEvents` | `any[]` | Calendar events |
| `expandedCardIds` | `Set<string>` | Which cards expanded |
| `autoApprove` | `boolean` | Auto-approve IPC actions |
| `bootState` | `string` | Page boot state |
| `chatHistoryOpen` | `boolean` | ChatHistory modal |
| `commandsOpen` | `boolean` | SlashCommandManager |
| `historyOpen` | `boolean` | GoalsRemindersDrawer |
| `dayWindow` | `number` | Days in reflect feed |
| `savingNotes` | `boolean` | Notes save in progress |

### useAiChat.ts State Variables (10)

| Variable | Type | Purpose |
|---|---|---|
| `messages` | `ChatMsg[]` | Current thread messages |
| `input` | `string` | Chat input value |
| `streaming` | `boolean` | AI response streaming |
| `thinking` | `boolean` | Waiting for first chunk |
| `error` | `string \| null` | Chat error |
| `contextWarnings` | `string[]` | Context bundle warnings |
| `hasProvider` | `boolean` | AI provider configured |
| `threads` | `ChatThreadMeta[]` | Saved thread metadata |
| `currentThreadDate` | `string` | Active thread date key |
| `memories` | `Array` | Extracted conversation memories |

---

## 3. IPC Endpoints (35+)

### Goals & Planning
| Endpoint | Purpose |
|---|---|
| `getGoals(date)` | Load today's daily goals |
| `saveGoal(date, goal)` | Create/update a single goal |
| `saveGoalsBatch(goals)` | Batch create/update goals |
| `deleteGoal(id)` | Delete a goal |
| `getGoalsBatch(start, end)` | Load multi-day goal history |
| `saveGoalReview(date, msg)` | Save evening review text |
| `suggestGoals(date, ctx)` | AI-generate goal suggestions |
| `getGoalContext()` | 7-day goal trend stats |
| `parseGoalDump(text)` | AI parse free-text into goals |
| `readPlanningMd()` | Read planning.md file |
| `writePlanningMd({content})` | Write planning.md file |

### Daily Digest
| Endpoint | Purpose |
|---|---|
| `getTopicDigest(force?)` | Fetch/generate daily digest |
| `isDigestGenerating()` | Check if digest is generating |
| `onDigestGenerationComplete(cb)` | Event: digest complete |

### AI Chat
| Endpoint | Purpose |
|---|---|
| `getAiProviders()` | Get AI provider config |
| `saveAiProviders({providers, routing})` | Save provider routing |
| `providerChatCall({provider, messages, model})` | Send chat (streaming) |
| `onProviderChunk(callback)` | Subscribe to streaming chunks |
| `aiChatSave({threadDate, messages})` | Persist chat thread |
| `aiChatLoad(threadDate)` | Load chat thread |
| `aiChatListThreads()` | List all saved threads |
| `aiChatReset(threadDate)` | Delete/reset a thread |
| `aiChatRenameThread(threadDate, title)` | Rename a thread |
| `aiChatGetMemories(threadDate)` | Load memories |
| `aiChatExtractMemories({threadDate, messages})` | Extract memories |

### Connectors
| Endpoint | Purpose |
|---|---|
| `connectors.list()` | List all connectors |
| `connectors.items(id, opts)` | Fetch items (emails, events) |
| `connectors.sync(id)` | Sync a connector |
| `connectors.test(id)` | Test connectivity |
| `connectors.sendEmail(id, opts)` | Send email reply |
| `connectors.markRead(itemId, read)` | Mark email read/unread |
| `connectors.remove(id)` | Delete a connector |

### Context Bundle (called per AI send)
Calls `getGoals`, `getLongtermGoals`, `getGoalContext`, `getAIUsageSummary`, `getProjects`, `readPlanningMd`, `connectors.list/items`, `financeGetSummary`, `financeGetWallets`, `financeGetSubscriptionIntelligence`, `getDashboardAggregates`.

### Dynamic IPC
`run-ipc` — AI response can name ANY preload function and call it. No allowlist.

---

## 4. Data Flow: Prompt → AI → Card

```
User types → ChatInput
  → AiPage.handleSend()
    → slash.parseAndExecute() — intercepts /commands
    → chat.send(text)
      → buildContextBundleDetailed() — aggregates all data
      → pickTarget() — finds enabled AI provider
      → providerChatCall() — streams response
      → onProviderChunk — delta → full text
      → parseAssistantContent() — extracts JSON structured cards
      → ParsedMessageRouter → renders typed card
      → extractMemories() — saves facts to DB
```

### ParsedMessage Types (10)
`goal_suggestion`, `plan_update`, `stats_summary`, `action_list`, `digest_item`, `connector_status`, `form_fill`, `chart_data`, `error`, `reminder_create`, `goal_event_link`

---

## 5. UI Patterns Catalog

| Pattern | Location | Notes |
|---|---|---|
| Loading skeleton | `Skeleton`, `SkeletonRow` | Used in FocusBoard, PlanBoard |
| Empty state | `EmptyState` | Icon + message + CTA button |
| Error state | `StateShell` with `state="error"` | Error message + retry button |
| Toast notification | `toasts` array in AiPage | Transient feedback |
| Confirmation dialog | `DeleteConfirmDialog` in PlanBoard | Two-click delete |
| Modal overlay | Multiple modals | Backdrop blur + click-outside-to-close |
| Expandable card | `ExpandableCard` in AiPageDeck | Click header to toggle |
| Segment control | `Segmented` component | Tab switching (Goals/Notes) |
| Progress bar | `AgentProgressBar` | AI round progress |
| Accent bar | `GlassCard` with `bar` prop | 3px colored left strip |
| Status dot | `StatusDot` | Breathing animation |
| Inline edit | `ChatHistory` thread rename | Click pencil → input |
| Slash autocomplete | `SlashCommandPalette` | Arrow keys + Enter |

---

## 6. Technical Debt (17 items)

### Critical for Drafting Table

| # | Issue | Location | Impact |
|---|---|---|---|
| 1 | **God Component** | AiPage.tsx (1081 lines, 33 state vars) | Impossible to test/refactor. Must decompose before canvas. |
| 2 | **Two-party conversation** | `ChatMsg.role: "user" \| "assistant"` | Can't show system messages, tool calls, multi-agent. |
| 3 | **Dynamic IPC dispatch** | `api[action.ipc](action.payload)` | AI can call ANY preload function. Security risk. |
| 4 | **No Error Boundaries** | Entire AiPage | One thrown component crashes the page. |
| 5 | **Single thread per day** | Thread ID = ISO date string | Can't have multiple conversations same day. |
| 6 | **`setExpandedCardId` undefined** | AiPage.tsx line 1045 | Runtime crash when clicking "Open Goal" from reminders drawer. Should be `setExpandedCardIds` (plural). |
| 7 | **SummaryGrid imported, never rendered** | AiPage.tsx line 8 | Dead code. |

### Moderate

| # | Issue | Location |
|---|---|---|
| 8 | `ChatMsg.id` uses `Date.now() + Math.random()` | useAiChat.ts:33 — collision risk |
| 9 | MarkdownRenderer is custom (no external lib) | MarkdownRenderer.tsx — misses nested lists, tables, images |
| 10 | Memory extraction runs after every send | useAiChat.ts:472 — wastes IPC calls |
| 11 | No rate limiting on slash command connector calls | useSlashCommands.ts |
| 12 | Voice input hardcoded to `en-US` | useVoiceInput.ts:98 |

### Minor

| # | Issue | Location |
|---|---|---|
| 13 | `focusMetrics.focusSeconds` always zero | AiPage.tsx:159 — no timer integration |
| 14 | Toast counter is module-level mutable | AiPage.tsx:28 |
| 15 | `window.deskflowAPI!` non-null assertion 40+ times | AiPage.tsx |
| 16 | deck.css global classes could leak | AiPageDeck.tsx:1 |
| 17 | `onCardAction` `run-ipc` calls dynamic function without validation | AiPage.tsx:587-600 |
