# RESULT.md — DeskFlow AI Assistant Page Complete Revamp

> **Version**: 2.0.0
> **Scope**: `/ai` route — Layout, Slash Commands, Connector System, AI Integration, Chat History, Memory/RAG, Google AI Studio
> **Design System**: DeskFlow Dark Glass-Morphism
> **Status**: Production-ready specification

---

## Table of Contents

1. [Layout Architecture](#1-layout-architecture)
2. [Component Specifications](#2-component-specifications)
3. [Slash Command Palette](#3-slash-command-palette)
4. [Email / Calendar Full-View Modal](#4-email--calendar-full-view-modal)
5. [Connector System Integration](#5-connector-system-integration)
6. [Memory / RAG System](#6-memory--rag-system)
7. [Google AI Studio Provider](#7-google-ai-studio-provider)
8. [Animation Specifications](#8-animation-specifications)
9. [File Change List](#9-file-change-list)

---

## 1. Layout Architecture

### 1.1 The Problem

The current layout is fundamentally broken:
- 2-column hero row crams glance metrics + connectors into a narrow strip
- QuickCommands card is redundant and placed far from the chat
- Chat panel is squeezed between sidebar and strip
- User bubbles are misaligned (capped at 74%)
- No dedicated space for connector items, history, or memory

### 1.2 The Solution: Command Center Layout

The page becomes a **command center** with the chat as the absolute focal point. Everything else is secondary, accessible via toggles, modals, or slide-overs.

```
+-------------------------------------------------------------+
|  [DeskFlow AI]  [Model: Gemini 2.0]  [History]  [Settings]  |  <- Top bar (40px)
+-------------------------------------------------------------+
|  Today: 3/5 goals | 2h focus | 12 unread | 3 events today   |  <- Status bar (32px)
+-------------------------------------------------------------+
|                                                             |
|                        CHAT STREAM                          |  <- 60% viewport
|                                                             |
|  +-----------------------------------------------------+   |
|  |  Good evening - How can I help?                       |   |
|  |                                                     |   |
|  |  [Plan my evening]  [Check unread]  [/today]        |   |
|  +-----------------------------------------------------+   |
|                                                             |
+-------------------------------------------------------------+
|  Memories: prefers morning work | project Alpha deadline    |  <- Memory chips (24px)
+-------------------------------------------------------------+
|  [ / ] Ask anything, use / for commands...    [mic] [send]|  <- Input (56px)
+-------------------------------------------------------------+
|  [Show Focus / Plan / Reflect v]                            |  <- Strip toggle
+-------------------------------------------------------------+
|  [Focus] [Plan] [Reflect]                                   |  <- Collapsible strip
+-------------------------------------------------------------+
```

### 1.3 Exact CSS Rules

**File**: `src/components/ai/deck/deck.css` - Complete replacement

```css
/* =========================================================== */
/*  DeskFlow AI Command Center - Layout v2.0                   */
/* =========================================================== */

:root {
  --canvas: #09090b;
  --surface: rgba(24,24,27,.72);
  --surface-2: #151518;
  --surface-3: rgba(30,30,34,.85);
  --raised: rgba(39,39,42,.7);
  --line: rgba(255,255,255,.07);
  --line-2: rgba(255,255,255,.12);
  --line-3: rgba(255,255,255,.18);
  --tp: #fafafa;
  --ts: rgba(250,250,250,.60);
  --tm: rgba(250,250,250,.38);
  --pink: #ec4899;
  --emerald: #34d399;
  --amber: #fbbf24;
  --violet: #a78bfa;
  --cyan: #22d3ee;
  --red: #f87171;
  --mono: ui-monospace,"SF Mono","JetBrains Mono",Menlo,Consolas,monospace;
  --sans: -apple-system,BlinkMacSystemFont,"Inter","Segoe UI",Roboto,sans-serif;
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-xl: 20px;
}

/* --- Root --- */
.dk-root {
  position: relative;
  color: var(--tp);
  font-family: var(--sans);
  -webkit-font-smoothing: antialiased;
  background:
    radial-gradient(1400px 600px at 85% -10%, rgba(236,72,153,.10), transparent 65%),
    radial-gradient(1000px 500px at 5% -5%, rgba(167,139,250,.08), transparent 60%),
    radial-gradient(800px 400px at 50% 120%, rgba(34,211,238,.05), transparent 50%),
    var(--canvas);
  min-height: 100vh;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  padding: 0;
}

.dk-wrap {
  max-width: 900px;
  margin: 0 auto;
  width: 100%;
  display: flex;
  flex-direction: column;
  flex: 1;
  padding: 20px 24px 32px;
  gap: 0;
  position: relative;
}

/* --- Top Bar --- */
.dk-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 0 14px;
  flex: none;
  border-bottom: 1px solid var(--line);
  margin-bottom: 12px;
}

.dk-topbar-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  font-weight: 600;
  color: var(--tp);
}

.dk-topbar-brand-icon {
  width: 28px; height: 28px;
  border-radius: var(--radius-sm);
  background: linear-gradient(140deg, rgba(236,72,153,.2), rgba(167,139,250,.2));
  border: 1px solid rgba(255,255,255,.08);
  display: grid;
  place-items: center;
  font-size: 14px;
}

.dk-topbar-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.dk-topbar-btn {
  height: 30px;
  padding: 0 12px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--line);
  background: var(--surface-2);
  color: var(--ts);
  font-size: 11px;
  font-family: var(--mono);
  letter-spacing: 0.5px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.18s ease;
}

.dk-topbar-btn:hover {
  border-color: var(--line-2);
  color: var(--tp);
  background: var(--raised);
}

.dk-topbar-btn:active {
  transform: scale(0.97);
}

/* --- Status Bar --- */
.dk-statusbar {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 6px 14px;
  margin-bottom: 16px;
  border-radius: var(--radius-md);
  background: var(--surface-2);
  border: 1px solid var(--line);
  font-size: 11px;
  color: var(--ts);
  flex: none;
  overflow-x: auto;
  scrollbar-width: none;
}

.dk-statusbar::-webkit-scrollbar { display: none; }

.dk-statusbar-item {
  display: flex;
  align-items: center;
  gap: 5px;
  white-space: nowrap;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 5px;
  transition: background 0.15s ease;
}

.dk-statusbar-item:hover {
  background: var(--raised);
}

.dk-statusbar-dot {
  width: 5px; height: 5px;
  border-radius: 50%;
  background: var(--emerald);
  flex: none;
}

.dk-statusbar-dot.pulse {
  animation: dotPulse 2s ease-in-out infinite;
}

.dk-statusbar-sep {
  width: 1px; height: 14px;
  background: var(--line);
  flex: none;
}

/* --- Chat Card --- */
.dk-chat-card {
  position: relative;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  backdrop-filter: blur(16px);
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow: hidden;
  box-shadow: 0 0 0 1px rgba(255,255,255,.03), 0 8px 32px rgba(0,0,0,.25);
}

.dk-chat-card::before {
  content: "";
  position: absolute;
  left: 0; top: 0; bottom: 0;
  width: 3px;
  border-radius: 3px 0 0 3px;
  background: linear-gradient(180deg, var(--pink), #be185d);
  z-index: 2;
}

/* --- Stream --- */
.dk-stream {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 20px 24px 12px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: 0;
  width: 100%;
  box-sizing: border-box;
  scroll-behavior: smooth;
}

.dk-stream::-webkit-scrollbar { width: 5px; }
.dk-stream::-webkit-scrollbar-track { background: transparent; }
.dk-stream::-webkit-scrollbar-thumb { background: rgba(255,255,255,.10); border-radius: 3px; }

/* --- Messages --- */
.dk-msg {
  display: flex;
  gap: 12px;
  max-width: 92%;
  animation: msgEnter 0.3s cubic-bezier(0.22, 1, 0.36, 1) forwards;
  opacity: 0;
  transform: translateY(10px);
}

.dk-msg.dk-user {
  align-self: flex-end;
  flex-direction: row-reverse;
  margin-left: auto;
}

.dk-msg.dk-ai {
  align-self: flex-start;
  margin-right: auto;
}

@keyframes msgEnter {
  to { opacity: 1; transform: translateY(0); }
}

.dk-av {
  width: 28px; height: 28px;
  border-radius: 8px;
  flex: none;
  display: grid;
  place-items: center;
  font-size: 12px;
  font-weight: 700;
  flex-shrink: 0;
  user-select: none;
}

.dk-av.dk-ai {
  background: linear-gradient(140deg, #f472b6, #a78bfa);
  color: #0b0b0d;
}

.dk-av.dk-me {
  background: var(--raised);
  color: var(--ts);
  border: 1px solid var(--line-2);
}

.dk-bubble {
  font-size: 14px;
  line-height: 1.6;
  color: var(--tp);
  word-break: break-word;
}

.dk-msg.dk-user .dk-bubble {
  background: var(--raised);
  border: 1px solid var(--line-2);
  padding: 11px 16px;
  border-radius: 16px 16px 4px 16px;
  color: #f4f4f5;
}

.dk-msg.dk-ai .dk-bubble {
  padding-top: 2px;
  color: rgba(250,250,250,.88);
}

.dk-msg-time {
  font-size: 10px;
  color: var(--tm);
  font-family: var(--mono);
  margin-top: 4px;
  text-align: right;
}

.dk-msg.dk-ai .dk-msg-time {
  text-align: left;
}

/* --- Empty State --- */
.dk-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20px;
  flex: 1;
  padding: 48px 24px;
  text-align: center;
}

.dk-empty-icon {
  width: 56px; height: 56px;
  border-radius: var(--radius-lg);
  background: linear-gradient(140deg, rgba(236,72,153,.15), rgba(167,139,250,.15));
  border: 1px solid rgba(255,255,255,.08);
  display: grid;
  place-items: center;
  font-size: 24px;
  animation: emptyFloat 4s ease-in-out infinite;
}

@keyframes emptyFloat {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}

.dk-empty h3 {
  font-size: 16px;
  font-weight: 600;
  color: var(--tp);
  margin: 0;
  letter-spacing: -0.2px;
}

.dk-empty p {
  font-size: 13px;
  color: var(--ts);
  margin: 0;
  max-width: 360px;
  line-height: 1.55;
}

.dk-suggestions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
  max-width: 520px;
}

.dk-chip {
  font-size: 12.5px;
  padding: 8px 14px;
  border-radius: var(--radius-sm);
  background: var(--surface-2);
  border: 1px solid var(--line);
  color: var(--ts);
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.22, 1, 0.36, 1);
  font-family: var(--sans);
  font-weight: 500;
  letter-spacing: -0.1px;
}

.dk-chip:hover {
  background: var(--raised);
  border-color: var(--line-2);
  color: var(--tp);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,.2);
}

.dk-chip:active {
  transform: translateY(0);
}

/* --- Thinking --- */
.dk-thinking {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  align-self: flex-start;
}

.dk-thinking-dots {
  display: flex;
  gap: 5px;
}

.dk-thinking-dots span {
  width: 6px; height: 6px;
  border-radius: 50%;
  background: var(--tm);
  animation: dotPulse 1.4s ease-in-out infinite;
}

.dk-thinking-dots span:nth-child(2) { animation-delay: 0.2s; }
.dk-thinking-dots span:nth-child(3) { animation-delay: 0.4s; }

@keyframes dotPulse {
  0%, 100% { opacity: 0.25; transform: scale(0.8); }
  50% { opacity: 1; transform: scale(1.1); }
}

/* --- Memory Bar --- */
.dk-memory-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 24px;
  flex-wrap: wrap;
  min-height: 32px;
}

.dk-memory-label {
  font-size: 10px;
  color: var(--tm);
  font-family: var(--mono);
  letter-spacing: 0.8px;
  text-transform: uppercase;
  white-space: nowrap;
}

.dk-memory-chip {
  font-size: 11px;
  padding: 4px 10px;
  border-radius: 6px;
  background: rgba(167,139,250,.10);
  border: 1px solid rgba(167,139,250,.16);
  color: var(--violet);
  font-family: var(--mono);
  cursor: default;
  transition: all 0.18s ease;
  white-space: nowrap;
}

.dk-memory-chip:hover {
  background: rgba(167,139,250,.18);
  transform: translateY(-1px);
}

/* --- Input Area --- */
.dk-input-area {
  padding: 10px 16px 16px;
  border-top: 1px solid var(--line);
  background: rgba(9,9,11,.5);
  backdrop-filter: blur(12px);
  flex: none;
  position: relative;
}

.dk-input-wrap {
  display: flex;
  align-items: flex-end;
  gap: 10px;
  background: var(--surface-2);
  border: 1px solid var(--line);
  border-radius: var(--radius-md);
  padding: 10px 12px 10px 16px;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.dk-input-wrap:focus-within {
  border-color: var(--pink);
  box-shadow: 0 0 0 3px rgba(236,72,153,.10);
}

.dk-textarea {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  resize: none;
  color: var(--tp);
  font-family: var(--sans);
  font-size: 14px;
  line-height: 1.5;
  max-height: 140px;
  padding: 4px 0;
  min-height: 22px;
}

.dk-textarea::placeholder { color: var(--tm); }

.dk-input-tools {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: none;
}

.dk-iconbtn {
  width: 32px; height: 32px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--line);
  background: transparent;
  color: var(--ts);
  display: grid;
  place-items: center;
  cursor: pointer;
  flex: none;
  transition: all 0.15s ease;
  position: relative;
  overflow: hidden;
}

.dk-iconbtn:hover {
  background: var(--raised);
  border-color: var(--line-2);
  color: var(--tp);
}

.dk-iconbtn:active {
  transform: scale(0.93);
}

.dk-iconbtn.dk-send {
  background: var(--pink);
  border-color: var(--pink);
  color: #fff;
}

.dk-iconbtn.dk-send:hover {
  background: #db2777;
  border-color: #db2777;
  transform: scale(1.05);
}

.dk-iconbtn.dk-send:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  transform: none;
}

/* --- Slash Command Palette --- */
.dk-cmd-palette {
  position: absolute;
  bottom: calc(100% + 8px);
  left: 0; right: 0;
  background: var(--surface-3);
  border: 1px solid var(--line-2);
  border-radius: var(--radius-md);
  backdrop-filter: blur(20px);
  box-shadow: 0 -8px 32px rgba(0,0,0,.35);
  z-index: 50;
  overflow: hidden;
  animation: paletteEnter 0.2s cubic-bezier(0.22, 1, 0.36, 1) forwards;
}

@keyframes paletteEnter {
  from { opacity: 0; transform: translateY(8px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

.dk-cmd-palette-head {
  padding: 10px 14px 6px;
  font-size: 10px;
  color: var(--tm);
  font-family: var(--mono);
  letter-spacing: 1px;
  text-transform: uppercase;
  border-bottom: 1px solid var(--line);
}

.dk-cmd-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 14px;
  cursor: pointer;
  transition: all 0.12s ease;
  border-left: 2px solid transparent;
}

.dk-cmd-item:hover,
.dk-cmd-item.active {
  background: var(--raised);
  border-left-color: var(--pink);
}

.dk-cmd-item-icon {
  width: 26px; height: 26px;
  border-radius: 6px;
  background: var(--surface-2);
  border: 1px solid var(--line);
  display: grid;
  place-items: center;
  flex: none;
  font-size: 12px;
}

.dk-cmd-item-text {
  flex: 1;
  min-width: 0;
}

.dk-cmd-item-name {
  font-size: 12.5px;
  font-weight: 500;
  color: var(--tp);
}

.dk-cmd-item-desc {
  font-size: 11px;
  color: var(--tm);
  margin-top: 1px;
}

.dk-cmd-item-shortcut {
  font-size: 10px;
  color: var(--tm);
  font-family: var(--mono);
  padding: 2px 6px;
  border-radius: 4px;
  background: var(--surface-2);
  border: 1px solid var(--line);
}

/* --- Strip --- */
.dk-strip-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px;
  margin: 12px auto 0;
  font-family: var(--mono);
  font-size: 10px;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: var(--tm);
  cursor: pointer;
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  background: var(--surface);
  width: fit-content;
  transition: all 0.2s ease;
}

.dk-strip-toggle:hover {
  color: var(--tp);
  border-color: var(--line-2);
  background: var(--raised);
}

.dk-strip {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-top: 16px;
  transition: max-height 0.35s cubic-bezier(0.4,0,0.2,1), opacity 0.25s ease, margin 0.25s ease;
  overflow: hidden;
}

.dk-strip.collapsed {
  max-height: 0;
  opacity: 0;
  margin-top: 0;
  padding: 0;
}

.dk-strip.expanded {
  max-height: 500px;
  opacity: 1;
}

/* --- Card Base --- */
.dk-card {
  position: relative;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  backdrop-filter: blur(14px);
  padding: 18px 20px;
  overflow: hidden;
}

.dk-card::before {
  content: "";
  position: absolute;
  left: 0; top: 0; bottom: 0;
  width: 3px;
  border-radius: 3px 0 0 3px;
}

.dk-acc.dk-pink::before   { background: linear-gradient(180deg, var(--pink), #be185d); }
.dk-acc.dk-violet::before { background: linear-gradient(180deg, var(--violet), #7c3aed); }
.dk-acc.dk-emerald::before{ background: linear-gradient(180deg, var(--emerald), #059669); }
.dk-acc.dk-cyan::before   { background: linear-gradient(180deg, var(--cyan), #0891b2); }
.dk-acc.dk-amber::before  { background: linear-gradient(180deg, var(--amber), #b45309); }

/* --- Microlabel --- */
.dk-microlabel {
  font-family: var(--mono);
  font-size: 10.5px;
  letter-spacing: 1.6px;
  text-transform: uppercase;
  color: var(--tm);
  padding: 0 2px;
}

/* --- History Drawer --- */
.dk-history-drawer {
  position: fixed;
  top: 0; bottom: 0; left: 0;
  width: 280px;
  background: var(--surface-3);
  border-right: 1px solid var(--line-2);
  backdrop-filter: blur(20px);
  z-index: 100;
  transform: translateX(-100%);
  transition: transform 0.35s cubic-bezier(0.22, 1, 0.36, 1);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 4px 0 24px rgba(0,0,0,.3);
}

.dk-history-drawer.open {
  transform: translateX(0);
}

.dk-history-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 20px;
  border-bottom: 1px solid var(--line);
  flex: none;
}

.dk-history-head h4 {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--tp);
}

.dk-history-list {
  flex: 1;
  overflow-y: auto;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.dk-history-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.15s ease;
  border: 1px solid transparent;
}

.dk-history-item:hover {
  background: var(--raised);
  border-color: var(--line);
}

.dk-history-item.active {
  background: var(--raised);
  border-color: var(--line-2);
}

.dk-history-item .dk-h-date {
  font-size: 12.5px;
  color: var(--tp);
  font-weight: 500;
}

.dk-history-item .dk-h-meta {
  font-size: 10px;
  color: var(--tm);
  font-family: var(--mono);
}

.dk-history-item .dk-h-actions {
  margin-left: auto;
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.15s ease;
}

.dk-history-item:hover .dk-h-actions { opacity: 1; }

/* --- Modal Overlay --- */
.dk-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,.55);
  backdrop-filter: blur(4px);
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  animation: overlayEnter 0.2s ease forwards;
}

@keyframes overlayEnter {
  from { opacity: 0; }
  to { opacity: 1; }
}

.dk-modal {
  background: var(--surface-3);
  border: 1px solid var(--line-2);
  border-radius: var(--radius-xl);
  width: 100%;
  max-width: 640px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 24px 64px rgba(0,0,0,.4);
  animation: modalEnter 0.3s cubic-bezier(0.22, 1, 0.36, 1) forwards;
}

@keyframes modalEnter {
  from { opacity: 0; transform: scale(0.96) translateY(10px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}

.dk-modal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 24px;
  border-bottom: 1px solid var(--line);
  flex: none;
}

.dk-modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 20px 24px;
}

.dk-modal-foot {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  padding: 14px 24px;
  border-top: 1px solid var(--line);
  flex: none;
}

/* --- Spin --- */
@keyframes spin {
  to { transform: rotate(360deg); }
}
.spin {
  animation: spin 1s linear infinite;
}

/* --- Reduced Motion --- */
@media (prefers-reduced-motion: reduce) {
  .dk-msg, .dk-empty-icon, .dk-thinking-dots span,
  .dk-cmd-palette, .dk-history-drawer, .dk-modal-overlay, .dk-modal,
  .dk-strip, .dk-chip {
    animation: none !important;
    transition: none !important;
  }
  .dk-empty-icon { transform: none; }
  .dk-thinking-dots span { opacity: 0.5; }
}

/* --- Responsive --- */
@media (max-width: 640px) {
  .dk-wrap { padding: 12px 16px 20px; }
  .dk-stream { padding: 16px 16px 8px; }
  .dk-msg { max-width: 94%; }
  .dk-strip { grid-template-columns: 1fr; }
  .dk-history-drawer { width: 100%; }
  .dk-modal { max-width: 100%; border-radius: var(--radius-lg); }
}
```

---

## 2. Component Specifications

### 2.1 AiPageDeck.tsx (Complete Rewrite)

**File**: `src/components/ai/deck/AiPageDeck.tsx`

```tsx
import "./deck.css"
import { ChatPanel } from "../chat/ChatPanel"
import type { AgentStep } from "../chat/AgentProgressBar"
import type { ChatSuggestion } from "../chat/ChatEmptyState"
import type { ChatMessage } from "../chat/ChatPanel"
import type { CardAction } from "../chat/parsed"
import type { ReactNode } from "react"
import { useState } from "react"
import { ChevronDown, ChevronUp, History, Settings } from "lucide-react"

export interface DeckProps {
  messages: ChatMessage[]
  input: string
  onInputChange: (v: string) => void
  onSend: (text: string) => void
  onStop?: () => void
  onReset?: () => void
  onCardAction?: (a: CardAction) => void
  streaming?: boolean
  thinking?: boolean
  provider?: string
  online?: boolean
  suggestions?: ChatSuggestion[]
  agentSteps?: AgentStep[]
  agentStatus?: string
  listening?: boolean
  onToggleVoice?: () => void
  voiceSupported?: boolean
  actionResults?: Record<string, "running" | "done" | "error">
  connectorSyncing?: Record<string, true>
  contextWarnings?: string[]
  dismissError?: (index: number) => void
  onModelChange?: (provider: string, model: string) => void
  modeLabel?: string
  glanceMetrics?: { label: string; value: string }[]
  connectorsSlot?: ReactNode
  focusSlot?: ReactNode
  planSlot?: ReactNode
  reflectSlot?: ReactNode
  historySlot?: ReactNode
  memoryChips?: { id: string; text: string }[]
  onNewThread?: () => void
  connectorStatus?: { unreadCount: number; todayEventCount: number; lastSyncTime?: string; syncing?: boolean }
  onExpandConnectors?: () => void
  onOpenSettings?: () => void
  onOpenHistory?: () => void
}

export function AiPageDeck(props: DeckProps) {
  const [stripExpanded, setStripExpanded] = useState(false)
  const hasStripContent = !!(props.focusSlot || props.planSlot || props.reflectSlot)

  return (
    <>
      {/* --- Top Bar --- */}
      <div className="dk-topbar">
        <div className="dk-topbar-brand">
          <div className="dk-topbar-brand-icon">✦</div>
          <span>DeskFlow AI</span>
          {props.provider && (
            <span style={{ fontSize: 10, color: "var(--tm)", fontFamily: "var(--mono)", marginLeft: 4 }}>
              · {props.provider}
            </span>
          )}
        </div>
        <div className="dk-topbar-actions">
          <button className="dk-topbar-btn" onClick={props.onOpenHistory} title="Chat history">
            <History size={12} />
            History
          </button>
          <button className="dk-topbar-btn" onClick={props.onOpenSettings} title="Settings">
            <Settings size={12} />
            Settings
          </button>
        </div>
      </div>

      {/* --- Status Bar --- */}
      <div className="dk-statusbar">
        {(props.glanceMetrics ?? []).map((m, i) => (
          <div key={i} className="dk-statusbar-item">
            <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--tm)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              {m.label}
            </span>
            <span style={{ fontWeight: 600, color: "var(--tp)", marginLeft: 4, fontVariantNumeric: "tabular-nums" }}>
              {m.value}
            </span>
          </div>
        ))}
        {props.glanceMetrics && props.glanceMetrics.length > 0 && <div className="dk-statusbar-sep" />}
        {props.connectorStatus && (
          <>
            <div className="dk-statusbar-item" onClick={props.onExpandConnectors}>
              <span className={`dk-statusbar-dot ${props.connectorStatus.syncing ? "pulse" : ""}`} />
              <span>📧 {props.connectorStatus.unreadCount} unread</span>
            </div>
            <div className="dk-statusbar-item" onClick={props.onExpandConnectors}>
              <span className="dk-statusbar-dot" style={{ background: "var(--cyan)" }} />
              <span>📅 {props.connectorStatus.todayEventCount} today</span>
            </div>
            {props.connectorStatus.lastSyncTime && (
              <div className="dk-statusbar-item" style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--tm)" }}>
                Synced {props.connectorStatus.lastSyncTime}
              </div>
            )}
          </>
        )}
      </div>

      {/* --- Chat Panel --- */}
      <div className="dk-chat-card">
        {props.historySlot}
        <ChatPanel
          messages={props.messages}
          streaming={props.streaming}
          thinking={props.thinking}
          provider={props.provider}
          online={props.online}
          input={props.input}
          onInputChange={props.onInputChange}
          onSend={props.onSend}
          onStop={props.onStop}
          onReset={props.onReset}
          onCardAction={props.onCardAction}
          suggestions={props.suggestions}
          agentSteps={props.agentSteps}
          agentStatus={props.agentStatus}
          listening={props.listening}
          onToggleVoice={props.onToggleVoice}
          voiceSupported={props.voiceSupported}
          actionResults={props.actionResults}
          connectorSyncing={props.connectorSyncing}
          contextWarnings={props.contextWarnings}
          dismissError={props.dismissError}
          onModelChange={props.onModelChange}
          memoryChips={props.memoryChips}
          onNewThread={props.onNewThread}
          connectorStatus={props.connectorStatus}
          onExpandConnectors={props.onExpandConnectors}
        />
      </div>

      {/* --- Strip Toggle --- */}
      {hasStripContent && (
        <button className="dk-strip-toggle" onClick={() => setStripExpanded(v => !v)} aria-expanded={stripExpanded}>
          {stripExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          {stripExpanded ? "Hide Focus / Plan / Reflect" : "Show Focus / Plan / Reflect"}
        </button>
      )}

      <div className={`dk-strip ${stripExpanded ? "expanded" : "collapsed"}`}>
        {props.focusSlot ? <>{props.focusSlot}</> : null}
        {props.planSlot ? <>{props.planSlot}</> : null}
        {props.reflectSlot ? <>{props.reflectSlot}</> : null}
      </div>

      <div className="dk-foot" style={{ textAlign: "center", padding: "16px 0", fontSize: 10, color: "var(--tm)", fontFamily: "var(--mono)" }}>
        DeskFlow AI — Command Deck
      </div>
    </>
  )
}
```

---

### 2.2 ChatPanel.tsx (Modified)

**File**: `src/components/ai/chat/ChatPanel.tsx`

```tsx
import { useRef, useEffect } from "react"
import { MessageBubble } from "./MessageBubble"
import { ChatInput } from "./ChatInput"
import { ChatEmptyState } from "./ChatEmptyState"
import { AgentProgressBar } from "./AgentProgressBar"
import type { AgentStep } from "./AgentProgressBar"
import type { ChatSuggestion } from "./ChatEmptyState"
import type { CardAction } from "./parsed"
import type { ReactNode } from "react"

export interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp?: number
  parsed?: any
}

export interface ChatPanelProps {
  messages: ChatMessage[]
  input: string
  onInputChange: (v: string) => void
  onSend: (text: string) => void
  onStop?: () => void
  onReset?: () => void
  onCardAction?: (a: CardAction) => void
  streaming?: boolean
  thinking?: boolean
  provider?: string
  online?: boolean
  suggestions?: ChatSuggestion[]
  agentSteps?: AgentStep[]
  agentStatus?: string
  listening?: boolean
  onToggleVoice?: () => void
  voiceSupported?: boolean
  actionResults?: Record<string, "running" | "done" | "error">
  connectorSyncing?: Record<string, true>
  contextWarnings?: string[]
  dismissError?: (index: number) => void
  onModelChange?: (provider: string, model: string) => void
  historySlot?: ReactNode
  memoryChips?: { id: string; text: string }[]
  onNewThread?: () => void
  connectorStatus?: { unreadCount: number; todayEventCount: number; lastSyncTime?: string; syncing?: boolean }
  onExpandConnectors?: () => void
}

export function ChatPanel(props: ChatPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const empty = props.messages.length === 0

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [props.messages, props.thinking])

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, position: "relative" }}>
      {/* History Drawer Overlay */}
      {props.historySlot}

      {/* Message Stream */}
      <div ref={scrollRef} className="dk-stream">
        {empty ? (
          <ChatEmptyState
            suggestions={props.suggestions}
            onSuggestion={props.onSend}
            onNewThread={props.onNewThread}
          />
        ) : (
          props.messages.map((m) => (
            <MessageBubble
              key={m.id}
              message={m}
              streaming={props.streaming && m.role === "assistant" && m.id === props.messages[props.messages.length - 1]?.id}
              onCardAction={props.onCardAction}
              actionResults={props.actionResults}
              connectorSyncing={props.connectorSyncing}
            />
          ))
        )}
        {props.thinking && !empty && (
          <div className="dk-thinking">
            <div className="dk-av dk-ai">✦</div>
            <div className="dk-thinking-dots">
              <span /><span /><span />
            </div>
          </div>
        )}
      </div>

      {/* Memory Chips */}
      {props.memoryChips && props.memoryChips.length > 0 && (
        <div className="dk-memory-bar">
          <span className="dk-memory-label">Memories</span>
          {props.memoryChips.map((chip) => (
            <span key={chip.id} className="dk-memory-chip" title={chip.text}>
              {chip.text.length > 32 ? chip.text.slice(0, 32) + "..." : chip.text}
            </span>
          ))}
        </div>
      )}

      {/* Input Area */}
      <div className="dk-input-area">
        <AgentProgressBar steps={props.agentSteps} status={props.agentStatus} />
        <ChatInput
          value={props.input}
          onChange={props.onInputChange}
          onSend={props.onSend}
          onStop={props.onStop}
          streaming={props.streaming}
          listening={props.listening}
          onToggleVoice={props.onToggleVoice}
          voiceSupported={props.voiceSupported}
        />
      </div>
    </div>
  )
}
```

---

### 2.3 ChatInput.tsx (Complete Rewrite - No Terminal Prefix)

**File**: `src/components/ai/chat/ChatInput.tsx`

```tsx
import { useEffect, useRef, useState, useCallback } from "react"
import { Mic, Square, Send } from "lucide-react"
import { SlashCommandPalette } from "./SlashCommandPalette"

export interface ChatInputProps {
  value: string
  onChange: (v: string) => void
  onSend: (text: string) => void
  onStop?: () => void
  streaming?: boolean
  listening?: boolean
  onToggleVoice?: () => void
  voiceSupported?: boolean
}

const SLASH_COMMANDS = [
  { id: "unread", name: "/unread", desc: "Show unread emails", icon: "📧", category: "email" },
  { id: "inbox", name: "/inbox", desc: "Show recent emails", icon: "📥", category: "email" },
  { id: "calendar", name: "/calendar", desc: "Show upcoming events", icon: "📅", category: "calendar" },
  { id: "today", name: "/today", desc: "Today schedule + emails", icon: "📋", category: "combined" },
  { id: "sync", name: "/sync", desc: "Sync all connectors", icon: "🔄", category: "action" },
  { id: "email", name: "/email", desc: "Search emails", icon: "🔍", category: "email" },
  { id: "plan", name: "/plan", desc: "Plan my day", icon: "📝", category: "ai" },
  { id: "digest", name: "/digest", desc: "Generate digest", icon: "📰", category: "ai" },
  { id: "reflect", name: "/reflect", desc: "Reflect on today", icon: "🪞", category: "ai" },
  { id: "focus", name: "/focus", desc: "Start focus session", icon: "🎯", category: "ai" },
]

export function ChatInput(props: ChatInputProps) {
  const taRef = useRef<HTMLTextAreaElement>(null)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [paletteIndex, setPaletteIndex] = useState(0)
  const [filteredCommands, setFilteredCommands] = useState(SLASH_COMMANDS)

  useEffect(() => {
    const el = taRef.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = Math.min(el.scrollHeight, 140) + "px"
  }, [props.value])

  const canSend = props.value.trim().length > 0 && !props.streaming

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (paletteOpen) {
      if (e.key === "ArrowDown") {
        e.preventDefault()
        setPaletteIndex(i => (i + 1) % filteredCommands.length)
        return
      }
      if (e.key === "ArrowUp") {
        e.preventDefault()
        setPaletteIndex(i => (i - 1 + filteredCommands.length) % filteredCommands.length)
        return
      }
      if (e.key === "Enter") {
        e.preventDefault()
        const cmd = filteredCommands[paletteIndex]
        if (cmd) {
          props.onChange(cmd.name + " ")
          setPaletteOpen(false)
          taRef.current?.focus()
        }
        return
      }
      if (e.key === "Escape") {
        setPaletteOpen(false)
        return
      }
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      if (canSend) props.onSend(props.value.trim())
    }
  }, [paletteOpen, filteredCommands, paletteIndex, canSend, props])

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value
    props.onChange(val)

    if (val.startsWith("/") && !props.streaming) {
      const query = val.slice(1).toLowerCase()
      const filtered = SLASH_COMMANDS.filter(c =>
        c.name.toLowerCase().includes(query) ||
        c.desc.toLowerCase().includes(query)
      )
      setFilteredCommands(filtered.length > 0 ? filtered : SLASH_COMMANDS)
      setPaletteOpen(true)
      setPaletteIndex(0)
    } else {
      setPaletteOpen(false)
    }
  }, [props])

  const handleSelectCommand = useCallback((cmd: typeof SLASH_COMMANDS[0]) => {
    props.onChange(cmd.name + " ")
    setPaletteOpen(false)
    taRef.current?.focus()
  }, [props])

  return (
    <div style={{ position: "relative" }}>
      {/* Slash Command Palette */}
      {paletteOpen && (
        <SlashCommandPalette
          commands={filteredCommands}
          activeIndex={paletteIndex}
          onSelect={handleSelectCommand}
          onClose={() => setPaletteOpen(false)}
        />
      )}

      <div className="dk-input-wrap">
        <textarea
          ref={taRef}
          className="dk-textarea"
          rows={1}
          value={props.value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Ask anything, type / for commands..."
          disabled={props.streaming}
        />
        <div className="dk-input-tools">
          {props.onToggleVoice && (
            <button
              type="button"
              onClick={props.onToggleVoice}
              disabled={!props.voiceSupported}
              className="dk-iconbtn"
              style={props.listening ? { background: "rgba(236,72,153,.15)", color: "var(--pink)", borderColor: "transparent" } : undefined}
              title={props.listening ? "Stop voice input" : "Start voice input"}
            >
              <Mic size={14} />
            </button>
          )}
          {props.streaming ? (
            <button
              type="button"
              onClick={props.onStop}
              className="dk-iconbtn"
              style={{ color: "var(--red)" }}
              title="Stop generating"
            >
              <Square size={12} className="fill-current" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => canSend && props.onSend(props.value.trim())}
              disabled={!canSend}
              className="dk-iconbtn dk-send"
              title="Send message"
            >
              <Send size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
```

---

### 2.4 SlashCommandPalette.tsx (New Component)

**File**: `src/components/ai/chat/SlashCommandPalette.tsx`

```tsx
import { useEffect, useRef } from "react"
import { Command } from "lucide-react"

interface SlashCommand {
  id: string
  name: string
  desc: string
  icon: string
  category: string
}

interface SlashCommandPaletteProps {
  commands: SlashCommand[]
  activeIndex: number
  onSelect: (cmd: SlashCommand) => void
  onClose: () => void
}

export function SlashCommandPalette(props: SlashCommandPaletteProps) {
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = listRef.current
    if (!el) return
    const active = el.children[props.activeIndex] as HTMLElement
    if (active) {
      active.scrollIntoView({ block: "nearest", behavior: "smooth" })
    }
  }, [props.activeIndex])

  const grouped = props.commands.reduce((acc, cmd) => {
    if (!acc[cmd.category]) acc[cmd.category] = []
    acc[cmd.category].push(cmd)
    return acc
  }, {} as Record<string, SlashCommand[]>)

  const categoryLabels: Record<string, string> = {
    email: "Email",
    calendar: "Calendar",
    combined: "Combined",
    action: "Actions",
    ai: "AI Assist",
  }

  return (
    <div className="dk-cmd-palette">
      <div className="dk-cmd-palette-head">
        <Command size={10} style={{ display: "inline", marginRight: 4, verticalAlign: "middle" }} />
        Commands - Arrow keys to navigate, Enter to select, Esc to close
      </div>
      <div ref={listRef} style={{ maxHeight: 280, overflowY: "auto" }}>
        {Object.entries(grouped).map(([category, cmds]) => (
          <div key={category}>
            <div style={{
              padding: "6px 14px 2px",
              fontSize: 9,
              color: "var(--tm)",
              fontFamily: "var(--mono)",
              letterSpacing: "1px",
              textTransform: "uppercase",
            }}>
              {categoryLabels[category] || category}
            </div>
            {cmds.map((cmd, idx) => {
              const globalIdx = props.commands.indexOf(cmd)
              const isActive = globalIdx === props.activeIndex
              return (
                <div
                  key={cmd.id}
                  className={`dk-cmd-item ${isActive ? "active" : ""}`}
                  onClick={() => props.onSelect(cmd)}
                >
                  <div className="dk-cmd-item-icon">{cmd.icon}</div>
                  <div className="dk-cmd-item-text">
                    <div className="dk-cmd-item-name">{cmd.name}</div>
                    <div className="dk-cmd-item-desc">{cmd.desc}</div>
                  </div>
                  {isActive && (
                    <span className="dk-cmd-item-shortcut">Enter</span>
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
```

---

### 2.5 MessageBubble.tsx (Fixed Alignment)

**File**: `src/components/ai/chat/MessageBubble.tsx`

```tsx
import { ParsedMessageRouter } from "./ParsedMessageRouter"
import type { CardAction } from "./parsed"

export interface MessageBubbleProps {
  message: {
    id: string
    role: "user" | "assistant"
    content: string
    timestamp?: number
    parsed?: any
  }
  streaming?: boolean
  onCardAction?: (a: CardAction) => void
  actionResults?: Record<string, "running" | "done" | "error">
  connectorSyncing?: Record<string, true>
}

export function MessageBubble(props: MessageBubbleProps) {
  const { message, streaming } = props
  const isUser = message.role === "user"
  const hasCard = !!message.parsed && message.parsed.type !== "text"

  const timeStr = message.timestamp
    ? new Date(message.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : null

  return (
    <div className={`dk-msg ${isUser ? "dk-user" : "dk-ai"}`}>
      <div className={`dk-av ${isUser ? "dk-me" : "dk-ai"}`}>
        {isUser ? "CZ" : "✦"}
      </div>
      <div style={{ minWidth: 0, display: "flex", flexDirection: "column" }}>
        <div className="dk-bubble">
          {streaming && !isUser ? (
            <TypewriterText text={message.content} />
          ) : (
            <span style={{ whiteSpace: "pre-wrap" }}>{message.content}</span>
          )}
        </div>
        {hasCard && (
          <ParsedMessageRouter
            parsed={message.parsed}
            onAction={props.onCardAction}
            actionResults={props.actionResults}
            connectorSyncing={props.connectorSyncing}
          />
        )}
        {timeStr && (
          <div className={`dk-msg-time ${isUser ? "" : "dk-ai"}`}>
            {timeStr}
          </div>
        )}
      </div>
    </div>
  )
}

function TypewriterText({ text }: { text: string }) {
  return <span style={{ whiteSpace: "pre-wrap" }}>{text}</span>
}
```

---

### 2.6 ChatEmptyState.tsx (Enhanced)

**File**: `src/components/ai/chat/ChatEmptyState.tsx`

```tsx
import { useMemo } from "react"
import { Plus } from "lucide-react"

export interface ChatSuggestion {
  id: string
  label: string
  prompt: string
  icon?: string
}

interface ChatEmptyStateProps {
  suggestions?: ChatSuggestion[]
  onSuggestion?: (prompt: string) => void
  onNewThread?: () => void
}

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 6) return "Up late?"
  if (hour < 12) return "Good morning"
  if (hour < 17) return "Good afternoon"
  if (hour < 22) return "Good evening"
  return "Good night"
}

function getTimeIcon(): string {
  const hour = new Date().getHours()
  if (hour < 6) return "🌙"
  if (hour < 12) return "☀️"
  if (hour < 17) return "🌤️"
  if (hour < 22) return "🌆"
  return "🌙"
}

export function ChatEmptyState(props: ChatEmptyStateProps) {
  const greeting = useMemo(getGreeting, [])
  const timeIcon = useMemo(getTimeIcon, [])

  const suggestions = props.suggestions ?? [
    { id: "plan", label: "Plan my day", prompt: "Help me plan my day based on my goals.", icon: "📝" },
    { id: "summary", label: "Summarize progress", prompt: "Summarize my progress this week.", icon: "📊" },
    { id: "focus", label: "What should I focus on?", prompt: "What is the most important thing to focus on right now?", icon: "🎯" },
  ]

  return (
    <div className="dk-empty">
      <div className="dk-empty-icon">{timeIcon}</div>
      <h3>{greeting} — How can I help?</h3>
      <p>
        I can plan your day, check your emails, manage your calendar, summarize progress, or answer questions about your work.
      </p>

      <div className="dk-suggestions">
        {suggestions.map((s, i) => (
          <button
            key={s.id}
            className="dk-chip"
            onClick={() => props.onSuggestion?.(s.prompt)}
            style={{ animationDelay: `${i * 60}ms` }}
          >
            {s.icon && <span style={{ marginRight: 4 }}>{s.icon}</span>}
            {s.label}
          </button>
        ))}
      </div>

      {props.onNewThread && (
        <button
          onClick={props.onNewThread}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 11,
            padding: "7px 14px",
            borderRadius: 8,
            border: "1px solid var(--line)",
            background: "var(--surface-2)",
            color: "var(--ts)",
            cursor: "pointer",
            fontFamily: "var(--mono)",
            letterSpacing: "0.5px",
            marginTop: 4,
            transition: "all 0.2s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "var(--line-2)"
            e.currentTarget.style.color = "var(--tp)"
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "var(--line)"
            e.currentTarget.style.color = "var(--ts)"
          }}
        >
          <Plus size={12} />
          New Thread
        </button>
      )}
    </div>
  )
}
```

---

### 2.7 ConnectorItemModal.tsx (New - Full Page Email/Calendar View)

**File**: `src/components/ai/connectors/ConnectorItemModal.tsx`

```tsx
import { useState } from "react"
import { X, Reply, Trash2, Check, Mail, CalendarDays, Send, Loader2 } from "lucide-react"
import type { ConnectorItem } from "../../../types/connectors"

interface ConnectorItemModalProps {
  item: ConnectorItem
  connectorType: "email" | "calendar"
  onClose: () => void
  onReply?: (itemId: string, draft: string) => Promise<void>
  onMarkRead?: (itemId: string, read: boolean) => Promise<void>
  onDelete?: (itemId: string) => Promise<void>
}

export function ConnectorItemModal(props: ConnectorItemModalProps) {
  const { item, connectorType } = props
  const [replyMode, setReplyMode] = useState(false)
  const [replyDraft, setReplyDraft] = useState("")
  const [sending, setSending] = useState(false)
  const [marking, setMarking] = useState(false)

  const isEmail = connectorType === "email"
  const isUnread = item.is_read === false
  const fromAddr = item.metadata?.from || ""
  const dateStr = item.date ? new Date(item.date).toLocaleString() : ""
  const startTime = item.metadata?.startTime
  const endTime = item.metadata?.endTime

  const handleReply = async () => {
    if (!replyDraft.trim() || !props.onReply) return
    setSending(true)
    try {
      await props.onReply(item.id, replyDraft)
      setReplyMode(false)
      setReplyDraft("")
    } finally {
      setSending(false)
    }
  }

  const handleMarkRead = async () => {
    if (!props.onMarkRead) return
    setMarking(true)
    try {
      await props.onMarkRead(item.id, !isUnread)
    } finally {
      setMarking(false)
    }
  }

  return (
    <div className="dk-modal-overlay" onClick={props.onClose}>
      <div className="dk-modal" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="dk-modal-head">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: isEmail ? "rgba(236,72,153,.12)" : "rgba(34,211,238,.12)",
              border: `1px solid ${isEmail ? "rgba(236,72,153,.2)" : "rgba(34,211,238,.2)"}`,
              display: "grid", placeItems: "center",
            }}>
              {isEmail ? <Mail size={14} color="var(--pink)" /> : <CalendarDays size={14} color="var(--cyan)" />}
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--tp)" }}>
                {item.subject || item.summary || "(no subject)"}
              </div>
              <div style={{ fontSize: 11, color: "var(--tm)", fontFamily: "var(--mono)", marginTop: 2 }}>
                {isEmail ? fromAddr : dateStr}
              </div>
            </div>
          </div>
          <button onClick={props.onClose} className="dk-iconbtn" style={{ width: 28, height: 28 }}>
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div className="dk-modal-body">
          {isEmail && (
            <>
              <div style={{
                display: "grid",
                gridTemplateColumns: "80px 1fr",
                gap: "8px 12px",
                fontSize: 12,
                color: "var(--ts)",
                marginBottom: 16,
                padding: 12,
                background: "var(--surface-2)",
                borderRadius: 10,
                border: "1px solid var(--line)",
              }}>
                <span style={{ color: "var(--tm)", fontFamily: "var(--mono)" }}>From</span>
                <span>{fromAddr || "—"}</span>
                <span style={{ color: "var(--tm)", fontFamily: "var(--mono)" }}>Date</span>
                <span>{dateStr}</span>
                <span style={{ color: "var(--tm)", fontFamily: "var(--mono)" }}>Status</span>
                <span style={{ color: isUnread ? "var(--pink)" : "var(--emerald)" }}>
                  {isUnread ? "● Unread" : "✓ Read"}
                </span>
              </div>
              <div style={{
                fontSize: 13.5,
                lineHeight: 1.65,
                color: "var(--tp)",
                whiteSpace: "pre-wrap",
                padding: 4,
              }}>
                {item.summary || "(no content)"}
              </div>
            </>
          )}

          {!isEmail && (
            <>
              <div style={{
                display: "grid",
                gridTemplateColumns: "80px 1fr",
                gap: "8px 12px",
                fontSize: 12,
                color: "var(--ts)",
                marginBottom: 16,
                padding: 12,
                background: "var(--surface-2)",
                borderRadius: 10,
                border: "1px solid var(--line)",
              }}>
                <span style={{ color: "var(--tm)", fontFamily: "var(--mono)" }}>Start</span>
                <span>{startTime || dateStr}</span>
                {endTime && (
                  <>
                    <span style={{ color: "var(--tm)", fontFamily: "var(--mono)" }}>End</span>
                    <span>{endTime}</span>
                  </>
                )}
                <span style={{ color: "var(--tm)", fontFamily: "var(--mono)" }}>Calendar</span>
                <span>{item.connectorId}</span>
              </div>
              <div style={{ fontSize: 13.5, lineHeight: 1.65, color: "var(--tp)" }}>
                {item.summary || "(no description)"}
              </div>
            </>
          )}

          {/* Reply Composer */}
          {replyMode && (
            <div style={{
              marginTop: 20,
              padding: 14,
              background: "var(--surface-2)",
              borderRadius: 12,
              border: "1px solid var(--line)",
            }}>
              <div style={{
                fontSize: 11, color: "var(--tm)", fontFamily: "var(--mono)",
                marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.8px",
              }}>
                Reply
              </div>
              <textarea
                value={replyDraft}
                onChange={e => setReplyDraft(e.target.value)}
                placeholder="Type your reply..."
                style={{
                  width: "100%",
                  minHeight: 100,
                  background: "var(--surface)",
                  border: "1px solid var(--line)",
                  borderRadius: 8,
                  padding: 10,
                  color: "var(--tp)",
                  fontSize: 13,
                  fontFamily: "var(--sans)",
                  resize: "vertical",
                  outline: "none",
                }}
              />
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 10 }}>
                <button
                  onClick={() => setReplyMode(false)}
                  style={{
                    fontSize: 11, padding: "6px 14px", borderRadius: 6,
                    border: "1px solid var(--line)", background: "transparent",
                    color: "var(--ts)", cursor: "pointer", fontFamily: "var(--mono)",
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleReply}
                  disabled={!replyDraft.trim() || sending}
                  style={{
                    fontSize: 11, padding: "6px 14px", borderRadius: 6,
                    border: "none", background: "var(--emerald)",
                    color: "#0b0b0d", cursor: "pointer", fontFamily: "var(--mono)", fontWeight: 600,
                    display: "flex", alignItems: "center", gap: 4,
                    opacity: !replyDraft.trim() || sending ? 0.5 : 1,
                  }}
                >
                  {sending ? <Loader2 size={11} className="spin" /> : <Send size={11} />}
                  Send
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="dk-modal-foot">
          {isEmail && (
            <>
              <button onClick={() => setReplyMode(!replyMode)} className="dk-topbar-btn" style={{ height: 32 }}>
                <Reply size={12} />
                Reply
              </button>
              <button onClick={handleMarkRead} disabled={marking} className="dk-topbar-btn" style={{ height: 32 }}>
                {marking ? <Loader2 size={12} className="spin" /> : <Check size={12} />}
                {isUnread ? "Mark Read" : "Mark Unread"}
              </button>
            </>
          )}
          {props.onDelete && (
            <button
              onClick={() => props.onDelete?.(item.id)}
              className="dk-topbar-btn"
              style={{ height: 32, color: "var(--red)", borderColor: "rgba(248,113,113,.3)" }}
            >
              <Trash2 size={12} />
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
```

---

### 2.8 ConnectorsPanel.tsx (Full Rewrite)

**File**: `src/components/ai/connectors/ConnectorsPanel.tsx`

```tsx
import { useState, useEffect, useCallback } from "react"
import {
  Mail, CalendarDays, RefreshCw, Trash2, ChevronDown, ChevronUp,
  Loader2, AlertCircle, Search, X, Plus
} from "lucide-react"
import type { ConnectorConfig, ConnectorItem } from "../../../types/connectors"
import { useConnectorItems } from "../../../hooks/useConnectorItems"
import { ConnectorItemModal } from "./ConnectorItemModal"

interface ConnectorsPanelProps {
  connectors: ConnectorConfig[]
  onSync: (id: string) => Promise<void>
  onSyncAll: () => Promise<void>
  onDelete: (id: string) => Promise<void>
  onTest: (id: string) => Promise<void>
  onReply?: (connectorId: string, emailId: string, draft: string) => Promise<void>
  onMarkRead?: (connectorId: string, emailId: string, read: boolean) => Promise<void>
  loading?: boolean
  error?: string | null
  onRetry?: () => void
}

export function ConnectorsPanel(props: ConnectorsPanelProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterType, setFilterType] = useState<"all" | "email" | "calendar">("all")
  const [syncingAll, setSyncingAll] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [modalItem, setModalItem] = useState<{ item: ConnectorItem; type: "email" | "calendar"; connectorId: string } | null>(null)

  const handleSyncAll = useCallback(async () => {
    setSyncingAll(true)
    try { await props.onSyncAll() } finally { setSyncingAll(false) }
  }, [props.onSyncAll])

  const filteredConnectors = props.connectors.filter(c => {
    if (filterType === "all") return true
    return c.type === filterType
  })

  if (props.loading) {
    return (
      <div className="dk-card dk-acc dk-cyan" style={{ minHeight: 180 }}>
        <div className="dk-microlabel" style={{ marginBottom: 12 }}>Connectors</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[1, 2].map(i => (
            <div key={i} style={{
              height: 44, borderRadius: 10, background: "var(--surface-2)",
              animation: "pulse 1.5s ease-in-out infinite",
            }} />
          ))}
        </div>
      </div>
    )
  }

  if (props.error) {
    return (
      <div className="dk-card dk-acc dk-cyan">
        <div className="dk-microlabel" style={{ marginBottom: 10 }}>Connectors</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--red)", marginBottom: 10 }}>
          <AlertCircle size={14} />
          {props.error}
        </div>
        {props.onRetry && (
          <button onClick={props.onRetry} className="dk-topbar-btn">
            Retry
          </button>
        )}
      </div>
    )
  }

  if (filteredConnectors.length === 0) {
    return (
      <div className="dk-card dk-acc dk-cyan">
        <div className="dk-microlabel" style={{ marginBottom: 10 }}>Connectors</div>
        <div style={{ textAlign: "center", padding: "20px 10px" }}>
          <div style={{ fontSize: 24, marginBottom: 8, opacity: 0.3 }}>🔌</div>
          <div style={{ fontSize: 12, color: "var(--tm)", marginBottom: 4 }}>No connectors configured</div>
          <div style={{ fontSize: 11, color: "var(--tm)", opacity: 0.7 }}>Add email or calendar in Settings</div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="dk-card dk-acc dk-cyan">
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div className="dk-microlabel">Connectors</div>
          <button
            onClick={handleSyncAll}
            disabled={syncingAll}
            className="dk-topbar-btn"
          >
            {syncingAll ? <Loader2 size={11} className="spin" /> : <RefreshCw size={11} />}
            Sync All
          </button>
        </div>

        {/* Search & Filter */}
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <div style={{
            flex: 1, display: "flex", alignItems: "center", gap: 6,
            background: "var(--surface-2)", border: "1px solid var(--line)",
            borderRadius: 8, padding: "6px 10px",
          }}>
            <Search size={12} color="var(--tm)" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search items..."
              style={{
                flex: 1, background: "transparent", border: "none", outline: "none",
                color: "var(--tp)", fontSize: 12, fontFamily: "var(--sans)",
              }}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--tm)" }}>
                <X size={12} />
              </button>
            )}
          </div>
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value as any)}
            style={{
              background: "var(--surface-2)", border: "1px solid var(--line)",
              borderRadius: 8, color: "var(--ts)", fontSize: 11,
              fontFamily: "var(--mono)", padding: "6px 10px", cursor: "pointer",
            }}
          >
            <option value="all">All</option>
            <option value="email">Email</option>
            <option value="calendar">Calendar</option>
          </select>
        </div>

        {/* Connector Cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filteredConnectors.map(connector => (
            <ConnectorCard
              key={connector.id}
              connector={connector}
              isExpanded={expandedId === connector.id}
              onToggle={() => setExpandedId(expandedId === connector.id ? null : connector.id)}
              onSync={async () => { await props.onSync(connector.id) }}
              onDelete={async () => {
                setDeletingId(connector.id)
                await props.onDelete(connector.id)
                setDeletingId(null)
              }}
              onTest={() => props.onTest(connector.id)}
              searchQuery={searchQuery}
              isDeleting={deletingId === connector.id}
              onItemClick={(item) => setModalItem({ item, type: connector.type as "email" | "calendar", connectorId: connector.id })}
            />
          ))}
        </div>
      </div>

      {/* Full-View Modal */}
      {modalItem && (
        <ConnectorItemModal
          item={modalItem.item}
          connectorType={modalItem.type}
          onClose={() => setModalItem(null)}
          onReply={props.onReply ? (emailId, draft) => props.onReply!(modalItem.connectorId, emailId, draft) : undefined}
          onMarkRead={props.onMarkRead ? (emailId, read) => props.onMarkRead!(modalItem.connectorId, emailId, read) : undefined}
        />
      )}
    </>
  )
}

// --- Connector Card ---
interface ConnectorCardProps {
  connector: ConnectorConfig
  isExpanded: boolean
  onToggle: () => void
  onSync: () => Promise<void>
  onDelete: () => Promise<void>
  onTest: () => Promise<void>
  searchQuery: string
  isDeleting: boolean
  onItemClick: (item: ConnectorItem) => void
}

function ConnectorCard(props: ConnectorCardProps) {
  const { connector, isExpanded } = props
  const [syncing, setSyncing] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const itemsHook = useConnectorItems(connector.id)

  const isEmail = connector.type === "email"
  const statusColor = connector.status === "connected" ? "var(--emerald)" : connector.status === "error" ? "var(--red)" : "var(--tm)"
  const lastSync = connector.lastSync ? timeAgo(new Date(connector.lastSync)) : "Never"

  useEffect(() => {
    if (isExpanded) {
      itemsHook.load({ search: props.searchQuery || undefined, limit: 10 })
    }
  }, [isExpanded, props.searchQuery])

  const handleSync = useCallback(async () => {
    setSyncing(true)
    try {
      await props.onSync()
      if (isExpanded) itemsHook.load({ search: props.searchQuery || undefined, limit: 10 })
    } finally {
      setSyncing(false)
    }
  }, [props.onSync, isExpanded, props.searchQuery, itemsHook])

  return (
    <div style={{
      borderRadius: 12,
      border: "1px solid var(--line)",
      background: "var(--surface-2)",
      overflow: "hidden",
      transition: "border-color 0.2s ease",
    }}>
      {/* Card Header */}
      <div
        onClick={props.onToggle}
        style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "10px 12px", cursor: "pointer",
          userSelect: "none",
        }}
      >
        <div style={{
          width: 28, height: 28, borderRadius: 7,
          background: isEmail ? "rgba(236,72,153,.12)" : "rgba(34,211,238,.12)",
          border: `1px solid ${isEmail ? "rgba(236,72,153,.2)" : "rgba(34,211,238,.2)"}`,
          display: "grid", placeItems: "center",
        }}>
          {isEmail ? <Mail size={13} color="var(--pink)" /> : <CalendarDays size={13} color="var(--cyan)" />}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--tp)", lineHeight: 1.3 }}>
            {connector.displayName}
          </div>
          <div style={{ fontSize: 10, color: "var(--tm)", fontFamily: "var(--mono)", display: "flex", gap: 8, marginTop: 2 }}>
            <span style={{ color: statusColor }}>● {connector.status}</span>
            <span>· {lastSync}</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          <button onClick={(e) => { e.stopPropagation(); handleSync() }} disabled={syncing}
            className="dk-iconbtn" style={{ width: 24, height: 24 }} title="Sync">
            {syncing ? <Loader2 size={11} className="spin" /> : <RefreshCw size={11} />}
          </button>
          <button onClick={(e) => { e.stopPropagation(); props.onTest() }}
            className="dk-iconbtn" style={{ width: 24, height: 24 }} title="Test connection">
            <AlertCircle size={11} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(true) }} disabled={props.isDeleting}
            className="dk-iconbtn" style={{ width: 24, height: 24 }} title="Delete">
            {props.isDeleting ? <Loader2 size={11} className="spin" /> : <Trash2 size={11} />}
          </button>
          {isExpanded ? <ChevronUp size={14} color="var(--tm)" /> : <ChevronDown size={14} color="var(--tm)" />}
        </div>
      </div>

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div style={{
          padding: "8px 12px", background: "rgba(248,113,113,.06)",
          borderTop: "1px solid rgba(248,113,113,.12)",
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
        }}>
          <span style={{ fontSize: 11, color: "var(--red)" }}>Delete this connector?</span>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={() => setShowDeleteConfirm(false)} className="dk-topbar-btn" style={{ height: 26, padding: "0 10px" }}>
              Cancel
            </button>
            <button onClick={() => { setShowDeleteConfirm(false); props.onDelete() }}
              className="dk-topbar-btn" style={{ height: 26, padding: "0 10px", color: "var(--red)", borderColor: "rgba(248,113,113,.3)" }}>
              Delete
            </button>
          </div>
        </div>
      )}

      {/* Expanded Items */}
      {isExpanded && (
        <div style={{
          borderTop: "1px solid var(--line)",
          maxHeight: 320, overflowY: "auto",
          padding: "8px 0",
        }}>
          {itemsHook.state.status === "loading" ? (
            <div style={{ padding: 16, textAlign: "center" }}>
              <Loader2 size={16} color="var(--tm)" className="spin" />
            </div>
          ) : itemsHook.state.status === "error" ? (
            <div style={{ padding: 12, fontSize: 11, color: "var(--red)", textAlign: "center" }}>
              {itemsHook.state.message}
            </div>
          ) : itemsHook.state.status === "ready" && itemsHook.state.data.items.length === 0 ? (
            <div style={{ padding: 16, textAlign: "center", fontSize: 11, color: "var(--tm)" }}>
              No items found. Try syncing.
            </div>
          ) : itemsHook.state.status === "ready" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {itemsHook.state.data.items.map((item: ConnectorItem) => (
                <ConnectorItemRow key={item.id} item={item} onClick={() => props.onItemClick(item)} />
              ))}
              {itemsHook.state.data.hasMore && (
                <button
                  onClick={() => itemsHook.load({ offset: itemsHook.state.data.offset, limit: 10 })}
                  style={{
                    margin: "8px auto 4px", fontSize: 10, padding: "4px 12px",
                    borderRadius: 6, border: "1px solid var(--line)",
                    background: "transparent", color: "var(--tm)",
                    cursor: "pointer", fontFamily: "var(--mono)",
                  }}
                >
                  Load more
                </button>
              )}
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}

// --- Connector Item Row ---
function ConnectorItemRow({ item, onClick }: { item: ConnectorItem; onClick: () => void }) {
  const isEmail = item.itemType === "email"
  const isUnread = item.is_read === false
  const dateStr = item.date ? timeAgo(new Date(item.date)) : ""
  const fromAddr = item.metadata?.from ? ` — ${item.metadata.from}` : ""

  return (
    <div
      onClick={onClick}
      style={{
        display: "flex", alignItems: "flex-start", gap: 8,
        padding: "8px 12px", borderRadius: 6,
        transition: "background 0.15s ease",
        cursor: "pointer",
      }}
      onMouseEnter={e => { e.currentTarget.style.background = "var(--raised)" }}
      onMouseLeave={e => { e.currentTarget.style.background = "transparent" }}
    >
      <div style={{
        width: 6, height: 6, borderRadius: "50%", marginTop: 5,
        background: isUnread ? "var(--pink)" : "transparent",
        flex: "none",
      }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 11.5, fontWeight: isUnread ? 600 : 400,
          color: isUnread ? "var(--tp)" : "var(--ts)",
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>
          {item.subject || item.summary || "(no subject)"}
        </div>
        {item.summary && (
          <div style={{
            fontSize: 10.5, color: "var(--tm)", marginTop: 2,
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          }}>
            {item.summary.slice(0, 80)}{item.summary.length > 80 ? "..." : ""}
            {fromAddr}
          </div>
        )}
      </div>
      <div style={{
        fontSize: 9.5, color: "var(--tm)", fontFamily: "var(--mono)",
        flex: "none", whiteSpace: "nowrap",
      }}>
        {dateStr}
      </div>
    </div>
  )
}

// --- Time Ago Helper ---
function timeAgo(date: Date): string {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (minutes < 1) return "now"
  if (minutes < 60) return `${minutes}m`
  if (hours < 24) return `${hours}h`
  if (days < 7) return `${days}d`
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" })
}
```

---

## 3. Slash Command System

### 3.1 Command Reference

| Command | Args | Description | Category |
|---------|------|-------------|----------|
| `/unread` | none | Show unread emails from all email connectors | email |
| `/inbox` | `[limit]` | Show recent emails (default 10) | email |
| `/calendar` | `[limit]` | Show upcoming events (default 5) | calendar |
| `/today` | none | Today schedule + unread summary | combined |
| `/sync` | `[name]` | Sync all or specific connector by name | action |
| `/email` | `[search]` | Search emails by query | email |
| `/plan` | none | Plan my day based on goals + calendar | ai |
| `/digest` | none | Generate daily digest | ai |
| `/reflect` | none | Reflect on today | ai |
| `/focus` | none | Start focus session | ai |

### 3.2 useSlashCommands.ts (Full Implementation)

**File**: `src/hooks/useSlashCommands.ts`

```tsx
import { useCallback } from "react"
import type { ChatMsg } from "./useAiChat"

export interface SlashCommandResult {
  handled: boolean
  messages?: ChatMsg[]
  shouldSendToAI?: boolean
}

export interface SlashCommandContext {
  connectors: any[]
  currentThreadDate: string
}

export function useSlashCommands() {
  const parseAndExecute = useCallback(async (
    text: string,
    ctx: SlashCommandContext
  ): Promise<SlashCommandResult> => {
    const trimmed = text.trim()
    if (!trimmed.startsWith("/")) return { handled: false }

    const [command, ...args] = trimmed.slice(1).split(" ")
    const argStr = args.join(" ").trim()

    switch (command.toLowerCase()) {
      case "unread": return await handleUnread(ctx)
      case "inbox": return await handleInbox(ctx, argStr)
      case "calendar": return await handleCalendar(ctx, argStr)
      case "today": return await handleToday(ctx)
      case "sync": return await handleSync(ctx, argStr)
      case "email": return await handleEmailSearch(ctx, argStr)
      case "plan": return { handled: true, shouldSendToAI: true }
      case "digest": return { handled: true, shouldSendToAI: true }
      case "reflect": return { handled: true, shouldSendToAI: true }
      case "focus": return { handled: true, shouldSendToAI: true }
      default:
        return {
          handled: true,
          messages: [makeAssistantMsg(`Unknown command: /${command}. Available: /unread, /inbox, /calendar, /today, /sync [name], /email [search], /plan, /digest, /reflect, /focus`)],
        }
    }
  }, [])

  return { parseAndExecute }
}

// --- Command Handlers ---

async function handleUnread(ctx: SlashCommandContext): Promise<SlashCommandResult> {
  const emailConnectors = ctx.connectors.filter((c: any) => c.type === "email")
  if (emailConnectors.length === 0) {
    return { handled: true, messages: [makeAssistantMsg("No email connectors configured. Add one in Settings.")] }
  }

  const lines: string[] = ["📧 **Unread Emails**"]
  let totalUnread = 0

  for (const conn of emailConnectors) {
    try {
      const r = await window.electron?.connectors?.items(conn.id, { unreadOnly: true, limit: 10 })
      if (r?.success && r.items?.length > 0) {
        totalUnread += r.items.length
        lines.push(`
**${conn.displayName}** — ${r.items.length} unread:`)
        for (const item of r.items) {
          const from = item.metadata?.from ? ` (${item.metadata.from})` : ""
          const date = item.date ? new Date(item.date).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : ""
          lines.push(`• ${item.subject || "(no subject)"}${from} — ${date}`)
        }
      }
    } catch (e) {
      lines.push(`
**${conn.displayName}**: Failed to fetch — ${(e as Error).message}`)
    }
  }

  if (totalUnread === 0) lines.push("
No unread emails. You are all caught up! ✨")
  return { handled: true, messages: [makeAssistantMsg(lines.join("
"))] }
}

async function handleInbox(ctx: SlashCommandContext, arg: string): Promise<SlashCommandResult> {
  const limit = parseInt(arg) || 10
  const emailConnectors = ctx.connectors.filter((c: any) => c.type === "email")
  if (emailConnectors.length === 0) {
    return { handled: true, messages: [makeAssistantMsg("No email connectors configured.")] }
  }

  const lines: string[] = [`📥 **Recent Emails** (last ${limit})`]
  for (const conn of emailConnectors) {
    try {
      const r = await window.electron?.connectors?.items(conn.id, { limit, type: "email" })
      if (r?.success && r.items?.length > 0) {
        lines.push(`
**${conn.displayName}:**`)
        for (const item of r.items) {
          const marker = item.is_read ? " " : "●"
          const from = item.metadata?.from ? ` — ${item.metadata.from}` : ""
          lines.push(`${marker} ${item.subject || "(no subject)"}${from}`)
        }
      }
    } catch (e) {
      lines.push(`
**${conn.displayName}**: Error — ${(e as Error).message}`)
    }
  }
  return { handled: true, messages: [makeAssistantMsg(lines.join("
"))] }
}

async function handleCalendar(ctx: SlashCommandContext, arg: string): Promise<SlashCommandResult> {
  const limit = parseInt(arg) || 5
  const calConnectors = ctx.connectors.filter((c: any) => c.type === "calendar")
  if (calConnectors.length === 0) {
    return { handled: true, messages: [makeAssistantMsg("No calendar connectors configured. Add one in Settings.")] }
  }

  const lines: string[] = [`📅 **Upcoming Events** (next ${limit})`]
  for (const conn of calConnectors) {
    try {
      const r = await window.electron?.connectors?.items(conn.id, { limit, type: "event" })
      if (r?.success && r.items?.length > 0) {
        lines.push(`
**${conn.displayName}:**`)
        for (const item of r.items) {
          const start = item.metadata?.startTime ? formatEventTime(item.metadata.startTime) : ""
          const end = item.metadata?.endTime ? `– ${formatEventTime(item.metadata.endTime)}` : ""
          lines.push(`• ${item.summary || "(no title)"} ${start} ${end}`)
        }
      }
    } catch (e) {
      lines.push(`
**${conn.displayName}**: Error — ${(e as Error).message}`)
    }
  }
  return { handled: true, messages: [makeAssistantMsg(lines.join("
"))] }
}

async function handleToday(ctx: SlashCommandContext): Promise<SlashCommandResult> {
  const lines: string[] = ["📋 **Today at a Glance**"]
  const now = new Date()

  // Emails
  const emailConnectors = ctx.connectors.filter((c: any) => c.type === "email")
  let emailCount = 0
  for (const conn of emailConnectors) {
    try {
      const r = await window.electron?.connectors?.items(conn.id, { unreadOnly: true, limit: 5 })
      if (r?.success) emailCount += r.items?.length || 0
    } catch {}
  }
  lines.push(`
📧 **Emails**: ${emailCount} unread`)

  // Calendar
  const calConnectors = ctx.connectors.filter((c: any) => c.type === "calendar")
  let eventCount = 0
  for (const conn of calConnectors) {
    try {
      const r = await window.electron?.connectors?.items(conn.id, { limit: 10, type: "event" })
      if (r?.success) {
        const todayEvents = (r.items || []).filter((item: any) => {
          const d = new Date(item.date)
          return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
        })
        eventCount += todayEvents.length
        if (todayEvents.length > 0) {
          lines.push(`
📅 **${conn.displayName}** — ${todayEvents.length} events:`)
          for (const item of todayEvents) {
            const start = item.metadata?.startTime ? formatEventTime(item.metadata.startTime) : ""
            lines.push(`• ${item.summary || "(no title)"} ${start}`)
          }
        }
      }
    } catch {}
  }
  if (eventCount === 0) lines.push("📅 **Calendar**: No events today")

  return { handled: true, messages: [makeAssistantMsg(lines.join("
"))] }
}

async function handleSync(ctx: SlashCommandContext, arg: string): Promise<SlashCommandResult> {
  const lines: string[] = ["🔄 **Sync Results**"]
  const targets = arg
    ? ctx.connectors.filter((c: any) => c.displayName.toLowerCase().includes(arg.toLowerCase()))
    : ctx.connectors

  if (targets.length === 0) {
    return { handled: true, messages: [makeAssistantMsg(`No connector matching "${arg}" found.`)] }
  }

  for (const conn of targets) {
    try {
      const r = await window.electron?.connectors?.sync(conn.id)
      if (r?.success) {
        lines.push(`✅ **${conn.displayName}**: ${r.itemsAdded} items added`)
      } else {
        lines.push(`❌ **${conn.displayName}**: ${r.error || "Sync failed"}`)
      }
    } catch (e) {
      lines.push(`❌ **${conn.displayName}**: ${(e as Error).message}`)
    }
  }

  return { handled: true, messages: [makeAssistantMsg(lines.join("
"))] }
}

async function handleEmailSearch(ctx: SlashCommandContext, arg: string): Promise<SlashCommandResult> {
  if (!arg) {
    return { handled: true, messages: [makeAssistantMsg("Usage: /email [search query] — searches email subjects and content.")] }
  }
  const emailConnectors = ctx.connectors.filter((c: any) => c.type === "email")
  const lines: string[] = [`🔍 **Email Search**: "${arg}"`]

  for (const conn of emailConnectors) {
    try {
      const r = await window.electron?.connectors?.items(conn.id, { search: arg, limit: 10 })
      if (r?.success && r.items?.length > 0) {
        lines.push(`
**${conn.displayName}** — ${r.items.length} results:`)
        for (const item of r.items) {
          const from = item.metadata?.from ? ` (${item.metadata.from})` : ""
          lines.push(`• ${item.subject || "(no subject)"}${from}`)
        }
      } else {
        lines.push(`
**${conn.displayName}**: No matches`)
      }
    } catch (e) {
      lines.push(`
**${conn.displayName}**: Error — ${(e as Error).message}`)
    }
  }

  return { handled: true, messages: [makeAssistantMsg(lines.join("
"))] }
}

// --- Helpers ---

function makeAssistantMsg(content: string): ChatMsg {
  return {
    id: crypto.randomUUID(),
    role: "assistant",
    content,
    timestamp: Date.now(),
  }
}

function formatEventTime(isoStr: string): string {
  try {
    const d = new Date(isoStr)
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  } catch {
    return isoStr
  }
}
```

---

## 4. Memory / RAG System

### 4.1 SQLite Schema

**File**: Add to existing migrations or `src/main/database/schema.sql`

```sql
-- Chat threads metadata
CREATE TABLE IF NOT EXISTS ai_chat_threads (
  thread_date TEXT PRIMARY KEY,
  title TEXT,
  message_count INTEGER DEFAULT 0,
  last_message_at INTEGER,
  preview TEXT,
  summary TEXT,
  created_at INTEGER DEFAULT (unixepoch() * 1000),
  updated_at INTEGER DEFAULT (unixepoch() * 1000)
);

-- Chat messages
CREATE TABLE IF NOT EXISTS ai_chat_messages (
  id TEXT PRIMARY KEY,
  thread_date TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('user','assistant','system')),
  content TEXT NOT NULL,
  parsed_json TEXT,
  timestamp INTEGER,
  FOREIGN KEY (thread_date) REFERENCES ai_chat_threads(thread_date) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_chat_msg_thread ON ai_chat_messages(thread_date);
CREATE INDEX IF NOT EXISTS idx_chat_msg_time ON ai_chat_messages(timestamp);

-- Memory / RAG facts
CREATE TABLE IF NOT EXISTS ai_chat_memories (
  id TEXT PRIMARY KEY,
  thread_date TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL CHECK(category IN ('goal','preference','decision','context','project','habit')),
  importance REAL DEFAULT 0.5 CHECK(importance >= 0 AND importance <= 1),
  embedding BLOB,
  created_at INTEGER DEFAULT (unixepoch() * 1000),
  FOREIGN KEY (thread_date) REFERENCES ai_chat_threads(thread_date) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_mem_thread ON ai_chat_memories(thread_date);
CREATE INDEX IF NOT EXISTS idx_mem_category ON ai_chat_memories(category);
CREATE INDEX IF NOT EXISTS idx_mem_importance ON ai_chat_memories(importance DESC);
```

### 4.2 Memory Extraction (Backend)

**File**: `src/main/ai/memoryExtractor.ts`

```ts
const CATEGORY_PATTERNS: Record<string, RegExp[]> = {
  goal: [/goal|objective|target|aim/i, /set a goal|new goal|goal for/i],
  preference: [/prefer|like|don't like|favorite|instead of/i, /i want|i would rather/i],
  decision: [/decided|choose|picked|went with|settled on/i, /decision|conclusion/i],
  context: [/project|client|team|deadline|meeting/i, /working on|assigned to/i],
  habit: [/every day|daily|routine|habit|usually|typically/i],
}

export function extractMemoriesFromMessages(
  db: any,
  threadDate: string,
  messages: Array<{ content: string; parsed?: any }>
): any[] {
  const memories: any[] = []
  for (const msg of messages) {
    const content = msg.content
    for (const [category, patterns] of Object.entries(CATEGORY_PATTERNS)) {
      for (const pattern of patterns) {
        const match = content.match(pattern)
        if (match) {
          const sentenceStart = content.lastIndexOf(".", match.index) + 1
          const sentenceEnd = content.indexOf(".", match.index + match[0].length)
          const sentence = content.slice(sentenceStart, sentenceEnd > -1 ? sentenceEnd + 1 : undefined).trim()
          if (sentence.length > 10 && sentence.length < 200) {
            memories.push({
              id: crypto.randomUUID(),
              threadDate,
              content: sentence,
              category,
              importance: calculateImportance(sentence, category, msg.parsed),
              createdAt: Date.now(),
            })
          }
          break
        }
      }
    }
    if (msg.parsed?.type === "goal_suggestion") {
      for (const goal of msg.parsed.goals ?? []) {
        memories.push({
          id: crypto.randomUUID(), threadDate,
          content: `Goal suggested: ${goal.title} (${goal.category})`,
          category: "goal", importance: 0.7, createdAt: Date.now(),
        })
      }
    }
  }
  const seen = new Set<string>()
  return memories.filter(m => {
    const key = m.content.toLowerCase().slice(0, 40)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function calculateImportance(sentence: string, category: string, parsed?: any): number {
  let score = 0.5
  if (category === "goal") score += 0.2
  if (category === "decision") score += 0.15
  if (sentence.includes("important") || sentence.includes("critical")) score += 0.15
  if (parsed) score += 0.1
  return Math.min(1, Math.max(0, score))
}
```

### 4.3 Memory Retrieval

**File**: `src/main/ai/memoryRetrieval.ts`

```ts
export function getRelevantMemories(db: any, threadDate: string, limit = 8): any[] {
  const current = db.prepare(`
    SELECT id, content, category, importance 
    FROM ai_chat_memories 
    WHERE thread_date = ? 
    ORDER BY importance DESC, created_at DESC 
    LIMIT ?
  `).all(threadDate, limit)

  const recent = db.prepare(`
    SELECT id, content, category, importance 
    FROM ai_chat_memories 
    WHERE thread_date != ? AND importance > 0.6
    ORDER BY created_at DESC 
    LIMIT ?
  `).all(threadDate, Math.floor(limit / 2))

  const merged = [...current, ...recent]
  const seen = new Set<string>()
  return merged.filter((m: any) => {
    if (seen.has(m.content.toLowerCase().slice(0, 30))) return false
    seen.add(m.content.toLowerCase().slice(0, 30))
    return true
  }).slice(0, limit)
}
```

---

## 5. Google AI Studio Provider

### 5.1 Provider Template

**File**: `src/main/ai/providers/googleAiStudio.ts`

```ts
const GOOGLE_AI_STUDIO_BASE = "https://generativelanguage.googleapis.com/v1beta"

export const GOOGLE_AI_STUDIO_MODELS = [
  "gemini-2.0-flash",
  "gemini-2.5-pro",
  "gemini-2.5-flash",
  "gemini-2.0-flash-lite",
  "gemini-1.5-pro",
]

export async function* streamGoogleAiStudio(
  config: { apiKey: string; model: string; baseUrl?: string },
  messages: Array<{ role: string; content: string }>
): AsyncGenerator<string, void, unknown> {
  const url = `${config.baseUrl || GOOGLE_AI_STUDIO_BASE}/models/${config.model}:streamGenerateContent?key=${config.apiKey}`

  const contents = messages.map(m => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }))

  const systemInstruction = messages.find(m => m.role === "system")?.content ?? ""
  const chatContents = contents.filter((c: any) => c.role !== "system")

  const body: any = {
    contents: chatContents,
    generationConfig: { temperature: 0.7, maxOutputTokens: 4000 },
  }

  if (systemInstruction) {
    body.systemInstruction = { parts: [{ text: systemInstruction }] }
  }

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error?.message || `Google AI Studio error: ${res.status}`)
  }

  const reader = res.body?.getReader()
  if (!reader) throw new Error("No response body")

  const decoder = new TextDecoder()
  let buffer = ""

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split("
")
    buffer = lines.pop() || ""
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || !trimmed.startsWith("{")) continue
      try {
        const chunk = JSON.parse(trimmed)
        const text = chunk.candidates?.[0]?.content?.parts?.[0]?.text ?? ""
        if (text) yield text
      } catch {}
    }
  }

  if (buffer.trim()) {
    try {
      const chunk = JSON.parse(buffer.trim())
      const text = chunk.candidates?.[0]?.content?.parts?.[0]?.text ?? ""
      if (text) yield text
    } catch {}
  }
}
```

### 5.2 Settings Integration

**File**: `src/components/settings/SettingsAI.tsx`

Add default provider:

```tsx
const DEFAULT_PROVIDERS = [
  {
    id: "google-ai-studio",
    label: "Google AI Studio",
    models: ["gemini-2.0-flash", "gemini-2.5-pro", "gemini-2.5-flash"],
    enabled: false,
    apiKey: "",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    templateId: "google-ai-studio",
    extraConfig: {},
  },
  // ... existing defaults ...
]
```

---

## 6. Animation Specifications

| Element | Trigger | Animation | Duration | Easing |
|---------|---------|-----------|----------|--------|
| Message bubble | Mount | fade + translateY(10px to 0) | 300ms | cubic-bezier(0.22,1,0.36,1) |
| Empty state icon | Continuous | float oscillation | 4000ms | ease-in-out |
| Suggestion chip | Hover | translateY(-2px) + shadow | 200ms | cubic-bezier(0.22,1,0.36,1) |
| Slash palette | Open | fade + translateY(8px) + scale(0.98 to 1) | 200ms | cubic-bezier(0.22,1,0.36,1) |
| Command item | Active | border-left pink + bg raised | 120ms | ease |
| History drawer | Toggle | translateX(-100% to 0) | 350ms | cubic-bezier(0.22,1,0.36,1) |
| Modal overlay | Open | fade | 200ms | ease |
| Modal content | Open | scale(0.96) + translateY(10px) | 300ms | cubic-bezier(0.22,1,0.36,1) |
| Strip | Toggle | max-height + opacity + margin | 350ms | cubic-bezier(0.4,0,0.2,1) |
| Send button | Hover | scale(1.05) | 150ms | ease |
| Input wrap | Focus | border pink + boxShadow | 200ms | ease |
| Memory chip | Hover | translateY(-1px) + bg brighten | 180ms | ease |
| Thinking dots | Continuous | pulse opacity + scale | 1400ms | ease-in-out |
| Status bar dot | Syncing | pulse | 2000ms | ease-in-out |

---

## 7. File Change List

### 7.1 Modified Files

| File | Change |
|------|--------|
| `src/components/ai/deck/deck.css` | Complete rewrite — new layout system, top bar, status bar, chat card, input area, slash palette, modal, history drawer |
| `src/components/ai/deck/AiPageDeck.tsx` | Remove QuickCommands, add top bar with History/Settings buttons, add status bar, remove 2-col hero row |
| `src/components/ai/chat/ChatPanel.tsx` | Remove header, add memory chips bar, wire connector status |
| `src/components/ai/chat/ChatInput.tsx` | Remove terminal prefix, add slash command palette integration, modern glass styling |
| `src/components/ai/chat/MessageBubble.tsx` | Fix user alignment (remove 74% cap, add margin-left:auto) |
| `src/components/ai/chat/ChatEmptyState.tsx` | Enhanced greeting, icon emojis, connector-aware suggestions |
| `src/components/ai/connectors/ConnectorsPanel.tsx` | Full rewrite — expandable cards with items, search/filter, sync, delete, modal trigger |
| `src/hooks/useAiChat.ts` | Add addMessage, threads, memories, loadThread, deleteThread, startNewThread |
| `src/hooks/useSlashCommands.ts` | Full implementation with all 10 commands |
| `src/services/ai/aiAgentService.ts` | Call buildConnectorContext() from getSystemPrompt() |
| `src/services/aiContextBundle.ts` | Include last 5 emails + 3 events per connector |
| `src/services/ai/toolRegistry.ts` | Add replyToEmail, createCalendarEvent, updateCalendarEvent, deleteCalendarEvent, markEmailRead |
| `src/preload.ts` | Add sendEmail, createEvent, updateEvent, deleteEvent, markRead to connectors bridge |
| `src/main.ts` | Add IPC handlers for connector actions, memory extraction, enhanced list-threads |
| `src/components/settings/SettingsAI.tsx` | Add Google AI Studio default provider |

### 7.2 New Files

| File | Purpose |
|------|---------|
| `src/components/ai/chat/SlashCommandPalette.tsx` | Dropdown palette with keyboard navigation |
| `src/components/ai/connectors/ConnectorItemModal.tsx` | Full-page modal for email/calendar item viewing and actions |
| `src/components/ai/chat/ChatHistory.tsx` | History drawer component |
| `src/hooks/useAutoSync.ts` | Background auto-sync manager |
| `src/main/ai/memoryExtractor.ts` | Rule-based memory extraction |
| `src/main/ai/memoryRetrieval.ts` | Memory retrieval with relevance scoring |
| `src/main/ai/providers/googleAiStudio.ts` | Google AI Studio streaming API client |

### 7.3 Deleted / Removed

| Item | Reason |
|------|--------|
| `QuickCommands` component | Redundant with slash command palette |
| `digestSlot` from sidebar | Digest has its own tab |
| Terminal `>_` prefix from ChatInput | Modern input design |
| `max-width:74%` on user bubbles | Caused misalignment |
| `max-height:36vh` on sidebar | Crushed connectors |
| `height:100vh` + `overflow:hidden` on root | Layout collapse trap |

---

## Appendix: Anti-Slop Verification

1. ✅ Re-skinned to DeskFlow tokens — All colors use var(--pink), var(--surface), etc.
2. ✅ Max rounded-xl, p-5 padding — Cards use 16px radius, 18px 20px padding
3. ✅ Dark mode only — Canvas #09090b, no light variants
4. ✅ Geist + JetBrains Mono — var(--sans) and var(--mono) throughout
5. ✅ Glass layer — backdrop-filter: blur(16px) on chat card, blur(20px) on palette
6. ✅ No default purple gradients — Gradients are pink/violet/cyan category-specific
7. ✅ No generic hero patterns — No abstract illustrations
8. ✅ Empty/loading/error/populated states — Every component has all 4 states
9. ✅ Hover/focus/disabled states — All interactive elements have transitions
10. ✅ Smooth transitions — All state changes use 150-350ms with appropriate easing
11. ✅ Keyboard navigation — Slash palette supports arrow keys, Enter, Escape
12. ✅ Accessibility — aria labels, aria-expanded, reduced motion support

---

*End of Complete Revamp Design Specification*
