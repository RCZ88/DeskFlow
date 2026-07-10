// src/components/AiChat/AiChat.tsx
import { useState as useState7, useEffect as useEffect4, useCallback as useCallback5, useRef as useRef5 } from "react";
import { AnimatePresence as AnimatePresence3 } from "framer-motion";

// src/components/AiChat/ChatHeader.tsx
import { RotateCcw, Settings, Bot } from "lucide-react";

// src/components/ai/GlassCard.tsx
import { motion } from "framer-motion";

// src/components/ai/tokens.ts
var MOTION = {
  fast: 0.15,
  normal: 0.25,
  slow: 0.4,
  ease: [0.16, 1, 0.3, 1],
  easeInOut: [0.4, 0, 0.2, 1],
  stagger: 0.05
};

// src/components/ai/GlassCard.tsx
import { jsx, jsxs } from "react/jsx-runtime";

// src/components/ai/SectionHead.tsx
import { jsx as jsx2, jsxs as jsxs2 } from "react/jsx-runtime";

// src/components/ai/StatusDot.tsx
import { jsx as jsx3, jsxs as jsxs3 } from "react/jsx-runtime";
var dotColor = {
  emerald: "bg-emerald-400",
  amber: "bg-amber-400",
  red: "bg-red-400",
  zinc: "bg-zinc-500",
  pink: "bg-pink-400"
};
function StatusDot({ color, label, breathe }) {
  return /* @__PURE__ */ jsxs3("span", { className: "inline-flex items-center gap-1.5", "aria-label": label, children: [
    /* @__PURE__ */ jsx3(
      "span",
      {
        className: `h-1.5 w-1.5 rounded-full ${dotColor[color]} ${breathe ? "animate-breathe" : ""}`
      }
    ),
    /* @__PURE__ */ jsx3("span", { className: "text-[11px] text-zinc-400", children: label })
  ] });
}

// src/components/ai/IconButton.tsx
import { jsx as jsx4 } from "react/jsx-runtime";
function IconButton({ icon: Icon, label, onClick, disabled, className = "" }) {
  return /* @__PURE__ */ jsx4(
    "button",
    {
      onClick,
      disabled,
      "aria-label": label,
      title: label,
      className: `relative grid place-items-center rounded-lg
        w-8 h-8 min-w-[44px] min-h-[44px] p-0
        text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60
        disabled:text-zinc-600 disabled:cursor-not-allowed
        focus-visible:ring-2 focus-visible:ring-pink-500/60 focus-visible:outline-none
        transition-colors ${className}`,
      children: /* @__PURE__ */ jsx4(Icon, { className: "h-4 w-4 pointer-events-none" })
    }
  );
}

// src/components/ai/StateShell.tsx
import { AnimatePresence, motion as motion2 } from "framer-motion";
import { Fragment, jsx as jsx5, jsxs as jsxs4 } from "react/jsx-runtime";

// src/components/AiChat/ChatHeader.tsx
import { jsx as jsx6, jsxs as jsxs5 } from "react/jsx-runtime";
var statusConfig = {
  ready: { dotColor: "emerald", label: "Ready", breathe: true },
  thinking: { dotColor: "amber", label: "Thinking\u2026", breathe: false },
  error: { dotColor: "red", label: "Connection issue", breathe: false }
};
var ChatHeader = ({ status, provider, onReset, onConfigure, messageCount }) => {
  const cfg = statusConfig[status];
  return /* @__PURE__ */ jsxs5("div", { className: "relative flex items-center gap-2 px-4 h-12 border-b border-zinc-800/60 shrink-0", children: [
    /* @__PURE__ */ jsx6(Bot, { className: "h-4 w-4 text-pink-400 shrink-0" }),
    /* @__PURE__ */ jsx6("span", { className: "text-[13px] font-semibold text-zinc-100", children: "AI Assistant" }),
    /* @__PURE__ */ jsx6(StatusDot, { color: cfg.dotColor, label: cfg.label, breathe: cfg.breathe }),
    provider && /* @__PURE__ */ jsxs5("span", { className: "rounded-md px-2 py-0.5 text-[11px] bg-violet-500/10 text-violet-300 ring-1 ring-violet-500/20 max-w-[160px] truncate shrink-0", title: `${provider.label} \xB7 ${provider.model}`, children: [
      provider.label,
      " \xB7 ",
      provider.model
    ] }),
    /* @__PURE__ */ jsxs5("div", { className: "ml-auto flex items-center gap-1", children: [
      messageCount > 0 && /* @__PURE__ */ jsx6("span", { className: "text-[10px] text-zinc-600 tabular-nums mr-1", children: messageCount }),
      /* @__PURE__ */ jsx6(IconButton, { icon: RotateCcw, label: "New chat", onClick: onReset }),
      /* @__PURE__ */ jsx6(IconButton, { icon: Settings, label: "Configure AI provider", onClick: onConfigure })
    ] })
  ] });
};

// src/components/AiChat/MessageList.tsx
import React, { useEffect, useRef, useState, useCallback } from "react";
import { ChevronDown } from "lucide-react";
import { jsx as jsx7, jsxs as jsxs6 } from "react/jsx-runtime";
var MessageList = ({ children, onScrollChange }) => {
  const containerRef = useRef(null);
  const [isPinned, setIsPinned] = useState(true);
  const [showFade, setShowFade] = useState(false);
  const prevChildrenCount = useRef(0);
  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const pinned = scrollHeight - scrollTop - clientHeight < 60;
    setIsPinned(pinned);
    setShowFade(scrollTop > 8);
    onScrollChange?.(pinned);
  }, [onScrollChange]);
  useEffect(() => {
    if (isPinned && containerRef.current) {
      containerRef.current.scrollTo({ top: containerRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [children, isPinned]);
  const childrenCount = React.Children.count(children);
  useEffect(() => {
    prevChildrenCount.current = childrenCount;
  }, [childrenCount]);
  return /* @__PURE__ */ jsxs6("div", { className: "relative flex-1 min-h-0", children: [
    showFade && /* @__PURE__ */ jsx7("div", { className: "sticky top-0 h-6 -mt-4 bg-[linear-gradient(180deg,#09090b,transparent)] pointer-events-none z-10" }),
    /* @__PURE__ */ jsxs6(
      "div",
      {
        ref: containerRef,
        onScroll: handleScroll,
        className: "absolute inset-0 overflow-y-auto px-4 py-4 space-y-3 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent",
        children: [
          children,
          /* @__PURE__ */ jsx7("div", { className: "h-2" })
        ]
      }
    ),
    !isPinned && /* @__PURE__ */ jsxs6(
      "button",
      {
        onClick: () => {
          if (containerRef.current) {
            containerRef.current.scrollTo({ top: containerRef.current.scrollHeight, behavior: "smooth" });
          }
          setIsPinned(true);
        },
        className: "absolute bottom-4 right-5 rounded-full bg-zinc-800/90 border border-zinc-700/50 px-3 py-1.5 text-[11px] font-mono text-zinc-200 hover:bg-zinc-700 hover:text-white transition-all shadow-lg z-10 backdrop-blur-sm hover:scale-105 active:scale-95",
        children: [
          /* @__PURE__ */ jsx7(ChevronDown, { className: "w-3 h-3 inline mr-1" }),
          "Jump to latest"
        ]
      }
    )
  ] });
};

// src/components/AiChat/MessageBubble.tsx
import { useState as useState2, useCallback as useCallback2 } from "react";
import { motion as motion3 } from "framer-motion";
import { Bot as Bot2, Copy, Check, User } from "lucide-react";
import { jsx as jsx8, jsxs as jsxs7 } from "react/jsx-runtime";
var MessageBubble = ({ role, children, timestamp, content }) => {
  const [copied, setCopied] = useState2(false);
  const isUser = role === "user";
  const handleCopy = useCallback2(() => {
    if (!content) return;
    navigator.clipboard.writeText(content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    }).catch(() => {
    });
  }, [content]);
  const timeStr = timestamp ? new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }).format(timestamp) : null;
  return /* @__PURE__ */ jsxs7(
    motion3.div,
    {
      layout: true,
      initial: { opacity: 0, y: 8, scale: 0.98 },
      animate: { opacity: 1, y: 0, scale: 1 },
      exit: { opacity: 0, y: -4 },
      transition: { duration: MOTION.normal, ease: MOTION.ease },
      className: `group flex gap-3 px-4 py-3 ${isUser ? "flex-row-reverse" : ""}`,
      children: [
        /* @__PURE__ */ jsx8("div", { className: `w-6 h-6 rounded-lg shrink-0 grid place-items-center ring-1 mt-0.5 ${isUser ? "bg-pink-500/15 ring-pink-500/30" : "bg-zinc-800 ring-zinc-700"}`, children: isUser ? /* @__PURE__ */ jsx8(User, { className: "h-3.5 w-3.5 text-pink-300" }) : /* @__PURE__ */ jsx8(Bot2, { className: "h-3.5 w-3.5 text-zinc-300" }) }),
        /* @__PURE__ */ jsxs7("div", { className: `relative ${isUser ? "max-w-[80%]" : "max-w-[85%]"}`, children: [
          /* @__PURE__ */ jsxs7("div", { className: `relative rounded-xl px-3.5 py-2.5 text-sm leading-relaxed ${isUser ? "bg-pink-500/12 ring-1 ring-pink-500/20 text-zinc-100 rounded-tr-sm" : "bg-zinc-900/60 ring-1 ring-zinc-800/60 text-zinc-200 rounded-tl-sm"}`, children: [
            content && /* @__PURE__ */ jsx8(
              "button",
              {
                onClick: handleCopy,
                className: "absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150 p-1 rounded-md hover:bg-zinc-800/60 text-zinc-500 hover:text-zinc-300",
                title: "Copy message",
                children: copied ? /* @__PURE__ */ jsx8(Check, { className: "w-3.5 h-3.5 text-emerald-400" }) : /* @__PURE__ */ jsx8(Copy, { className: "w-3.5 h-3.5" })
              }
            ),
            children
          ] }),
          timeStr && /* @__PURE__ */ jsx8("div", { className: "text-[10px] text-zinc-600 mt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150", children: timeStr })
        ] })
      ]
    }
  );
};

// src/components/AiChat/ChatInput.tsx
import { useState as useState3, useRef as useRef2, useCallback as useCallback3 } from "react";
import { Send, Sparkles } from "lucide-react";

// src/services/chatSafety.ts
var MAX_INPUT_LENGTH = 2e3;
function sanitizeInput(text) {
  let result = text.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, "").replace(/\x1b\[[0-9;]*[a-zA-Z]/g, "");
  if (result.length > MAX_INPUT_LENGTH) {
    result = result.slice(0, MAX_INPUT_LENGTH);
  }
  return result;
}

// src/components/VoiceInputButton.tsx
import { motion as motion4, AnimatePresence as AnimatePresence2 } from "framer-motion";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { Fragment as Fragment2, jsx as jsx9, jsxs as jsxs8 } from "react/jsx-runtime";
var circumference = 2 * Math.PI * 8;
function VoiceInputButton({ voice, disabled }) {
  if (!voice.supported) return null;
  const isListening = voice.state === "listening";
  const isProcessing = voice.state === "processing";
  const isError = voice.state === "error";
  const countdownRatio = voice.countdownMs / 5e3;
  const strokeDashoffset = circumference * (1 - countdownRatio);
  const isNearEnd = countdownRatio < 0.3;
  const label = isListening ? "Listening, tap to stop" : "Start voice input";
  const shortcutHint = "Ctrl+Shift+M";
  return /* @__PURE__ */ jsxs8("div", { className: "relative", children: [
    /* @__PURE__ */ jsxs8(
      "button",
      {
        onClick: isListening ? voice.stop : voice.start,
        disabled: disabled || isProcessing,
        "aria-label": label,
        "aria-pressed": isListening,
        className: `relative grid place-items-center rounded-lg
          w-8 h-8 min-w-[44px] min-h-[44px] p-0
          transition-all duration-150
          focus-visible:ring-2 focus-visible:ring-pink-500/60 focus-visible:outline-none
          disabled:opacity-40 disabled:cursor-not-allowed
          ${isListening ? "bg-pink-500/15 text-pink-400 ring-1 ring-pink-500/30" : isError ? "bg-red-500/10 text-red-400 ring-1 ring-red-500/40" : "text-zinc-400 bg-zinc-900/60 ring-1 ring-zinc-800/60 hover:text-pink-300 hover:ring-pink-500/30"}`,
        title: `${label} (${shortcutHint})`,
        children: [
          isProcessing ? /* @__PURE__ */ jsx9(Loader2, { className: "h-4 w-4 animate-spin" }) : isListening ? /* @__PURE__ */ jsx9(Mic, { className: "h-4 w-4" }) : /* @__PURE__ */ jsx9(MicOff, { className: "h-4 w-4" }),
          isListening && /* @__PURE__ */ jsxs8(Fragment2, { children: [
            /* @__PURE__ */ jsx9("span", { className: "absolute inset-0 rounded-lg v-ring pointer-events-none" }),
            /* @__PURE__ */ jsxs8("svg", { className: "absolute inset-0 w-full h-full -rotate-90 pointer-events-none", viewBox: "0 0 22 22", children: [
              /* @__PURE__ */ jsx9("circle", { cx: "11", cy: "11", r: "8", fill: "none", stroke: "rgba(244,114,182,0.2)", strokeWidth: "2.5" }),
              /* @__PURE__ */ jsx9(
                "circle",
                {
                  cx: "11",
                  cy: "11",
                  r: "8",
                  fill: "none",
                  stroke: isNearEnd ? "#fbbf24" : "#f472b6",
                  strokeWidth: "2.5",
                  strokeLinecap: "round",
                  strokeDasharray: circumference,
                  strokeDashoffset,
                  style: { transition: "stroke-dashoffset 100ms linear, stroke 200ms ease" }
                }
              )
            ] })
          ] }),
          isListening && /* @__PURE__ */ jsxs8("div", { className: "absolute bottom-0 left-1/2 -translate-x-1/2 flex items-end gap-[1.5px] h-3 pointer-events-none", children: [
            /* @__PURE__ */ jsx9("span", { className: "w-[2px] rounded-full bg-pink-400/70 v-bar" }),
            /* @__PURE__ */ jsx9("span", { className: "w-[2px] rounded-full bg-pink-400/70 v-bar", style: { animationDelay: "0.15s" } }),
            /* @__PURE__ */ jsx9("span", { className: "w-[2px] rounded-full bg-pink-400/70 v-bar", style: { animationDelay: "0.3s" } })
          ] })
        ]
      }
    ),
    /* @__PURE__ */ jsx9(AnimatePresence2, { children: isListening && voice.interim && /* @__PURE__ */ jsx9(
      motion4.div,
      {
        initial: { opacity: 0, y: 4 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: 4 },
        transition: { duration: MOTION.fast },
        className: "absolute bottom-full right-0 mb-2 z-30",
        role: "status",
        "aria-live": "polite",
        children: /* @__PURE__ */ jsx9("div", { className: "rounded-lg bg-zinc-900/95 ring-1 ring-zinc-700 px-2.5 py-1.5 text-xs text-zinc-200 max-w-[240px]", children: voice.interim })
      }
    ) })
  ] });
}

// src/components/AiChat/ChatInput.tsx
import { jsx as jsx10, jsxs as jsxs9 } from "react/jsx-runtime";
var ChatInput = ({ onSend, disabled, placeholder, voice }) => {
  const [text, setText] = useState3("");
  const [justSent, setJustSent] = useState3(false);
  const textareaRef = useRef2(null);
  const handleSend = useCallback3(() => {
    const trimmed = sanitizeInput(text.trim());
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText("");
    setJustSent(true);
    setTimeout(() => setJustSent(false), 600);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [text, disabled, onSend]);
  const handleKeyDown = useCallback3((e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);
  const handleInput = useCallback3((value) => {
    if (value.length > MAX_INPUT_LENGTH) return;
    setText(value);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 5 * 24) + "px";
    }
  }, []);
  const isEmpty = !text.trim();
  const canSend = !disabled && !isEmpty;
  const progress = text.length / MAX_INPUT_LENGTH;
  const circumference2 = 2 * Math.PI * 7;
  const strokeDashoffset = circumference2 * (1 - Math.min(progress, 1));
  return /* @__PURE__ */ jsxs9("div", { className: "relative bg-zinc-950/60 backdrop-blur-md px-4 py-3", children: [
    /* @__PURE__ */ jsx10("div", { className: "absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-pink-500/30 to-transparent pointer-events-none" }),
    /* @__PURE__ */ jsxs9("div", { className: "flex items-end gap-2", children: [
      /* @__PURE__ */ jsx10("div", { className: "relative flex-1", children: /* @__PURE__ */ jsx10(
        "textarea",
        {
          ref: textareaRef,
          value: text,
          onChange: (e) => handleInput(e.target.value),
          onKeyDown: handleKeyDown,
          rows: 1,
          disabled,
          placeholder: placeholder ?? "Ask about your day, manage goals\u2026",
          className: "w-full resize-none bg-zinc-900/70 border border-zinc-800/50 focus:border-pink-400/40 focus:bg-zinc-900/90 rounded-xl pr-4 pl-4 py-2.5 text-[13px] text-zinc-100 placeholder:text-zinc-500 outline-none transition-all duration-200 focus:ring-2 focus:ring-pink-400/20"
        }
      ) }),
      /* @__PURE__ */ jsx10(
        VoiceInputButton,
        {
          voice,
          disabled
        }
      ),
      /* @__PURE__ */ jsx10(
        "button",
        {
          onClick: handleSend,
          disabled: !canSend,
          className: `rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-200 shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center ${canSend ? justSent ? "bg-emerald-500/80 text-zinc-950" : "bg-pink-500/80 hover:bg-pink-400 text-zinc-950" : "bg-zinc-800/60 text-zinc-600 cursor-not-allowed"}`,
          children: justSent ? /* @__PURE__ */ jsx10("svg", { className: "w-4 h-4", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2.5", strokeLinecap: "round", strokeLinejoin: "round", children: /* @__PURE__ */ jsx10("polyline", { points: "20 6 9 17 4 12" }) }) : /* @__PURE__ */ jsx10(Send, { className: "w-4 h-4" })
        }
      )
    ] }),
    /* @__PURE__ */ jsxs9("div", { className: "flex items-center justify-between mt-1.5 px-0.5", children: [
      /* @__PURE__ */ jsxs9("div", { className: "flex items-center gap-1.5", children: [
        /* @__PURE__ */ jsx10(Sparkles, { className: "w-3 h-3 text-zinc-600" }),
        /* @__PURE__ */ jsx10("span", { className: "text-[10px] font-mono text-zinc-600 tracking-wide", children: "AI-POWERED" })
      ] }),
      /* @__PURE__ */ jsxs9("svg", { className: "w-4 h-4 -rotate-90", viewBox: "0 0 18 18", children: [
        /* @__PURE__ */ jsx10("circle", { cx: "9", cy: "9", r: "7", fill: "none", stroke: "#3f3f46", strokeWidth: "2" }),
        /* @__PURE__ */ jsx10(
          "circle",
          {
            cx: "9",
            cy: "9",
            r: "7",
            fill: "none",
            stroke: progress > 0.9 ? "#fbbf24" : "#f472b6",
            strokeWidth: "2",
            strokeLinecap: "round",
            strokeDasharray: circumference2,
            strokeDashoffset,
            style: { transition: "stroke-dashoffset 200ms ease-out" }
          }
        )
      ] })
    ] })
  ] });
};

// src/components/AiChat/ChatEmptyState.tsx
import { useMemo } from "react";
import { Sparkles as Sparkles2 } from "lucide-react";
import { jsx as jsx11, jsxs as jsxs10 } from "react/jsx-runtime";
var ChatEmptyState = ({ onPick, connectors }) => {
  const timeOfDay = useMemo(() => {
    const h = (/* @__PURE__ */ new Date()).getHours();
    if (h < 12) return "morning";
    if (h < 17) return "afternoon";
    return "evening";
  }, []);
  const hasEmail = connectors?.some((c) => c.type === "email");
  const hasCalendar = connectors?.some((c) => c.type === "calendar");
  const suggestions = useMemo(() => {
    const base = [
      { id: "day", label: "Summarize my day", prompt: "Summarize my day" },
      { id: "focus", label: "What should I focus on?", prompt: "What should I focus on today?" }
    ];
    if (hasEmail) base.push({ id: "inbox", label: "What\u2019s in my inbox?", prompt: "What's in my inbox today?" });
    if (hasCalendar) base.push({ id: "meetings", label: "What meetings do I have?", prompt: "What meetings do I have today?" });
    base.push({ id: "goals", label: "Review my goals", prompt: "Review my goals" });
    return base;
  }, [hasEmail, hasCalendar]);
  return /* @__PURE__ */ jsxs10("div", { className: "flex-1 flex flex-col items-center justify-center text-center px-6", children: [
    /* @__PURE__ */ jsx11("div", { className: "h-12 w-12 rounded-xl bg-pink-500/10 ring-1 ring-pink-500/20 grid place-items-center", children: /* @__PURE__ */ jsx11(Sparkles2, { className: "h-6 w-6 text-pink-400" }) }),
    /* @__PURE__ */ jsxs10("h3", { className: "mt-4 text-sm font-semibold text-zinc-100", children: [
      "Good ",
      timeOfDay,
      ", ready when you are"
    ] }),
    /* @__PURE__ */ jsx11("p", { className: "mt-1 text-xs text-zinc-500 max-w-[280px]", children: "Ask about your tracked time, goals, projects, or connected inbox & calendar." }),
    /* @__PURE__ */ jsx11("div", { className: "mt-5 flex flex-wrap justify-center gap-2 max-w-[420px]", children: suggestions.map((s, i) => /* @__PURE__ */ jsx11(
      "button",
      {
        onClick: () => onPick(s.prompt),
        className: "rounded-lg px-3 py-1.5 text-xs bg-zinc-900/60 ring-1 ring-zinc-800/60 text-zinc-300 hover:ring-pink-500/40 hover:text-zinc-100 hover:-translate-y-0.5 transition-all duration-150",
        style: { transitionDelay: `${i * 50}ms` },
        children: s.label
      },
      s.id
    )) })
  ] });
};

// src/components/AiChat/blocks/GoalListBlock.tsx
import { jsx as jsx12, jsxs as jsxs11 } from "react/jsx-runtime";
var GoalListBlock = ({ block }) => {
  const title = block.fields.title;
  const summary = block.fields.summary;
  const items = block.items ?? [];
  const done = items.filter((i) => i.checked).length;
  const total = items.length;
  return /* @__PURE__ */ jsxs11("div", { className: "space-y-2", children: [
    title && /* @__PURE__ */ jsx12("p", { className: "text-sm font-medium text-stone-200", children: title }),
    /* @__PURE__ */ jsx12("div", { className: "space-y-1", children: items.map((item, i) => /* @__PURE__ */ jsxs11("label", { className: "flex items-center gap-2 text-sm cursor-pointer min-h-[44px] px-2 -mx-2 rounded-lg hover:bg-stone-800/40 transition-colors", children: [
      /* @__PURE__ */ jsx12(
        "input",
        {
          type: "checkbox",
          checked: item.checked,
          readOnly: true,
          className: "accent-sage-400 w-4 h-4 rounded border-stone-600"
        }
      ),
      /* @__PURE__ */ jsx12("span", { className: item.checked ? "line-through text-stone-500" : "text-stone-300", children: item.label }),
      item.category && /* @__PURE__ */ jsx12("span", { className: "text-[11px] text-stone-600 ml-auto", children: item.category })
    ] }, i)) }),
    total > 0 && /* @__PURE__ */ jsxs11("div", { className: "space-y-1.5", children: [
      /* @__PURE__ */ jsxs11("svg", { className: "w-full h-3", viewBox: "0 0 100 4", children: [
        /* @__PURE__ */ jsx12("rect", { x: "0", y: "0", width: "100", height: "4", rx: "2", className: "fill-stone-800/80" }),
        /* @__PURE__ */ jsx12("rect", { x: "0", y: "0", width: `${done / total * 100}`, height: "4", rx: "2", className: "fill-sage-400 transition-all duration-300 ease-out" })
      ] }),
      summary && /* @__PURE__ */ jsx12("p", { className: "text-xs text-stone-500", children: summary })
    ] })
  ] });
};

// src/components/AiChat/blocks/GoalCreateBlock.tsx
import { Check as Check2 } from "lucide-react";
import { jsx as jsx13, jsxs as jsxs12 } from "react/jsx-runtime";
var GoalCreateBlock = ({ block }) => {
  const title = block.fields.title;
  const category = block.fields.category;
  return /* @__PURE__ */ jsxs12("div", { className: "inline-flex items-center gap-2.5 rounded-lg bg-sage-400/10 border border-sage-400/25 px-3 py-2 text-sage-300 text-sm", children: [
    /* @__PURE__ */ jsx13(Check2, { className: "w-4 h-4 text-sage-400" }),
    /* @__PURE__ */ jsxs12("span", { children: [
      "Created goal ",
      /* @__PURE__ */ jsx13("strong", { children: title }),
      category ? ` (${category})` : ""
    ] })
  ] });
};

// src/components/AiChat/blocks/GoalDeleteBlock.tsx
import { Trash2 } from "lucide-react";
import { jsx as jsx14, jsxs as jsxs13 } from "react/jsx-runtime";
var GoalDeleteBlock = ({ block }) => {
  const title = block.fields.title;
  return /* @__PURE__ */ jsxs13("div", { className: "inline-flex items-center gap-2.5 rounded-lg bg-stone-800/50 border border-stone-700/40 px-3 py-2 text-stone-400 text-sm", children: [
    /* @__PURE__ */ jsx14(Trash2, { className: "w-4 h-4 text-stone-500" }),
    /* @__PURE__ */ jsxs13("span", { children: [
      "Deleted goal ",
      /* @__PURE__ */ jsx14("span", { className: "line-through text-stone-500", children: title })
    ] })
  ] });
};

// src/components/AiChat/blocks/NewsItemBlock.tsx
import { jsx as jsx15, jsxs as jsxs14 } from "react/jsx-runtime";
var NewsItemBlock = ({ block, onClick }) => {
  const title = block.fields.title;
  const summary = block.fields.summary;
  const detail = block.fields.detail;
  return /* @__PURE__ */ jsxs14(
    "div",
    {
      onClick,
      className: "border-l-2 border-clay-400/50 bg-stone-900/40 hover:bg-stone-900/60 rounded-r-lg px-3 py-2.5 cursor-pointer transition-colors",
      style: {
        backgroundImage: `radial-gradient(circle, rgba(168,162,158,0.03) 1px, transparent 1px)`,
        backgroundSize: "20px 20px"
      },
      children: [
        /* @__PURE__ */ jsx15("p", { className: "text-sm font-medium text-stone-200", children: title }),
        summary && /* @__PURE__ */ jsx15("p", { className: "text-xs text-stone-400 mt-0.5", children: summary }),
        detail && /* @__PURE__ */ jsx15("p", { className: "text-xs text-stone-500 mt-1", children: detail })
      ]
    }
  );
};

// src/components/AiChat/blocks/DataSummaryBlock.tsx
import { jsx as jsx16, jsxs as jsxs15 } from "react/jsx-runtime";
var DataSummaryBlock = ({ block }) => {
  const title = block.fields.title;
  const metrics = Object.entries(block.fields).filter(([k]) => k !== "title");
  return /* @__PURE__ */ jsxs15("div", { className: "space-y-1.5", children: [
    title && /* @__PURE__ */ jsx16("p", { className: "text-sm font-medium text-stone-200", children: title }),
    /* @__PURE__ */ jsx16("div", { className: "space-y-1", children: metrics.map(([key, value]) => {
      const val = String(value);
      const trendUp = val.startsWith("\u25B2") || val.startsWith("+");
      const trendDown = val.startsWith("\u25BC") || val.startsWith("-");
      const trendClass = trendUp ? "text-sage-400" : trendDown ? "text-clay-400" : "text-stone-300";
      return /* @__PURE__ */ jsxs15("div", { className: "flex items-center justify-between text-sm gap-3", children: [
        /* @__PURE__ */ jsx16("span", { className: "text-stone-500 font-mono text-[13px]", children: key }),
        /* @__PURE__ */ jsxs15("div", { className: "flex items-center gap-2", children: [
          trendUp && /* @__PURE__ */ jsx16("div", { className: "w-12 h-1.5 rounded-full bg-stone-800/80 overflow-hidden", children: /* @__PURE__ */ jsx16("div", { className: "h-full rounded-full bg-sage-400", style: { width: `${Math.min(parseFloat(val) * 10, 100)}%` } }) }),
          trendDown && /* @__PURE__ */ jsx16("div", { className: "w-12 h-1.5 rounded-full bg-stone-800/80 overflow-hidden", children: /* @__PURE__ */ jsx16("div", { className: "h-full rounded-full bg-clay-400", style: { width: `${Math.min(parseFloat(val.replace(/[^\d.-]/g, "")) * 10, 100)}%` } }) }),
          /* @__PURE__ */ jsx16("span", { className: `font-medium text-[13px] font-mono ${trendClass}`, children: val })
        ] })
      ] }, key);
    }) })
  ] });
};

// src/components/AiChat/blocks/ErrorBlock.tsx
import { AlertCircle } from "lucide-react";
import { jsx as jsx17, jsxs as jsxs16 } from "react/jsx-runtime";
var ErrorBlock = ({ block, onRetry }) => {
  const message = block.fields.message;
  return /* @__PURE__ */ jsxs16("div", { className: "bg-clay-500/10 border border-clay-500/30 rounded-lg px-3 py-2.5 space-y-2", children: [
    /* @__PURE__ */ jsxs16("div", { className: "flex items-start gap-2", children: [
      /* @__PURE__ */ jsx17(AlertCircle, { className: "w-4 h-4 text-clay-400 mt-0.5 shrink-0" }),
      /* @__PURE__ */ jsx17("p", { className: "text-sm text-clay-300", children: message || "Something went wrong" })
    ] }),
    onRetry && /* @__PURE__ */ jsx17("div", { className: "flex gap-2", children: /* @__PURE__ */ jsx17(
      "button",
      {
        onClick: onRetry,
        className: "bg-clay-500/80 hover:bg-clay-400 text-stone-950 text-xs font-medium rounded-lg px-3 py-1.5 min-h-[44px] transition-colors",
        children: "Retry"
      }
    ) })
  ] });
};

// src/components/AiChat/blocks/NavigationBlock.tsx
import { ArrowRight } from "lucide-react";
import { jsx as jsx18, jsxs as jsxs17 } from "react/jsx-runtime";
var NavigationBlock = ({ block, onClick }) => {
  const page = block.fields.page ?? block.fields.route ?? "";
  const label = block.fields.label || page;
  return /* @__PURE__ */ jsxs17(
    "button",
    {
      onClick,
      className: "inline-flex items-center gap-1.5 rounded-full bg-sky-400/10 border border-sky-400/30 px-3.5 py-2 text-sm text-sky-300 min-h-[44px] transition-colors hover:bg-sky-400/20 active:scale-[0.97] group",
      children: [
        label,
        /* @__PURE__ */ jsx18(ArrowRight, { className: "w-4 h-4 transition-transform duration-150 group-hover:translate-x-0.5" })
      ]
    }
  );
};

// src/components/AiChat/blocks/TextBlock.tsx
import { Fragment as Fragment5 } from "react";

// src/components/AiChat/blocks/Inline.tsx
import { Fragment as Fragment3 } from "react";
import { Fragment as Fragment4, jsx as jsx19, jsxs as jsxs18 } from "react/jsx-runtime";
var InlineRenderer = ({ nodes, accentClass = "text-clay-300" }) => {
  return /* @__PURE__ */ jsx19(Fragment4, { children: nodes.map((n, i) => {
    switch (n.t) {
      case "text":
        return /* @__PURE__ */ jsx19(Fragment3, { children: n.v }, i);
      case "bold":
        return /* @__PURE__ */ jsx19("strong", { className: "font-semibold text-stone-100", children: n.v }, i);
      case "italic":
        return /* @__PURE__ */ jsx19("em", { className: "italic text-stone-200", children: n.v }, i);
      case "strike":
        return /* @__PURE__ */ jsx19("del", { className: "line-through text-stone-500", children: n.v }, i);
      case "code":
        return /* @__PURE__ */ jsx19("code", { className: "font-mono text-[12.5px] text-clay-300 bg-stone-800/60 rounded px-1", children: n.v }, i);
      case "metric":
        return /* @__PURE__ */ jsx19("span", { className: `font-mono text-glow bg-stone-800/50 rounded px-1 ${accentClass}`, children: n.v }, i);
      case "cite":
        return /* @__PURE__ */ jsxs18("sup", { className: `font-mono text-[11px] ${accentClass} cursor-help`, children: [
          "[",
          n.id,
          "]"
        ] }, i);
      case "link":
        return /* @__PURE__ */ jsx19("a", { href: n.href, target: "_blank", rel: "noopener noreferrer", className: "text-clay-300 hover:text-clay-200 underline underline-offset-2 decoration-clay-400/30", children: n.v }, i);
      default:
        return null;
    }
  }) });
};

// src/components/AiChat/blocks/TextBlock.tsx
import { Fragment as Fragment6, jsx as jsx20, jsxs as jsxs19 } from "react/jsx-runtime";
function mdToReact(text) {
  const nodes = [];
  let i = 0;
  let key = 0;
  while (i < text.length) {
    const remaining = text.slice(i);
    const codeBlockMatch = remaining.match(/^```(\w*)\n([\s\S]*?)```\n?/);
    if (codeBlockMatch) {
      const [, lang, code] = codeBlockMatch;
      nodes.push(
        /* @__PURE__ */ jsxs19("pre", { className: "my-2 rounded-lg bg-stone-950/80 border border-stone-800/60 overflow-x-auto", children: [
          lang && /* @__PURE__ */ jsx20("div", { className: "px-3 py-1 text-[10px] text-stone-500 border-b border-stone-800/40 font-mono uppercase tracking-wider", children: lang }),
          /* @__PURE__ */ jsx20("code", { className: "block px-3 py-2.5 text-xs text-stone-200 font-mono leading-relaxed", children: code.trim() })
        ] }, key++)
      );
      i += codeBlockMatch[0].length;
      continue;
    }
    const headingMatch = remaining.match(/^#{1,3}\s+(.+)\n?/);
    if (headingMatch) {
      const level = headingMatch[0].trim().startsWith("###") ? 3 : headingMatch[0].trim().startsWith("## ") ? 2 : 1;
      const Tag = level === 1 ? "h3" : level === 2 ? "h4" : "h5";
      nodes.push(
        /* @__PURE__ */ jsx20(Tag, { className: "text-sm font-semibold text-stone-100 mt-3 mb-1.5", children: headingMatch[1] }, key++)
      );
      i += headingMatch[0].length;
      continue;
    }
    const quoteMatch = remaining.match(/^>\s*(.+)\n?/);
    if (quoteMatch) {
      nodes.push(
        /* @__PURE__ */ jsx20("blockquote", { className: "border-l-2 border-stone-600/50 pl-3 my-1.5 text-sm text-stone-400 italic", children: quoteMatch[1] }, key++)
      );
      i += quoteMatch[0].length;
      continue;
    }
    const ulMatch = remaining.match(/^[-*]\s+(.+)\n?/);
    if (ulMatch) {
      const items = [ulMatch[1]];
      let j = i + ulMatch[0].length;
      while (j < text.length) {
        const nextItem = text.slice(j).match(/^[-*]\s+(.+)\n?/);
        if (nextItem) {
          items.push(nextItem[1]);
          j += nextItem[0].length;
        } else break;
      }
      nodes.push(
        /* @__PURE__ */ jsx20("ul", { className: "list-disc list-inside my-1 space-y-0.5 text-sm text-stone-300", children: items.map((item, idx) => /* @__PURE__ */ jsx20("li", { children: renderInline(item) }, idx)) }, key++)
      );
      i = j;
      continue;
    }
    const olMatch = remaining.match(/^\d+\.\s+(.+)\n?/);
    if (olMatch) {
      const items = [olMatch[1]];
      let j = i + olMatch[0].length;
      while (j < text.length) {
        const nextItem = text.slice(j).match(/^\d+\.\s+(.+)\n?/);
        if (nextItem) {
          items.push(nextItem[1]);
          j += nextItem[0].length;
        } else break;
      }
      nodes.push(
        /* @__PURE__ */ jsx20("ol", { className: "list-decimal list-inside my-1 space-y-0.5 text-sm text-stone-300", children: items.map((item, idx) => /* @__PURE__ */ jsx20("li", { children: renderInline(item) }, idx)) }, key++)
      );
      i = j;
      continue;
    }
    const hrMatch = remaining.match(/^---+\n?/);
    if (hrMatch) {
      nodes.push(/* @__PURE__ */ jsx20("hr", { className: "my-3 border-stone-800/60" }, key++));
      i += hrMatch[0].length;
      continue;
    }
    const paraEnd = remaining.search(/\n\n|\n(?=#|\||>|---|[-*]\s|\d+\.\s)/);
    if (paraEnd === 0) {
      i += 1;
      continue;
    }
    const para = paraEnd === -1 ? remaining.trimEnd() : remaining.slice(0, paraEnd);
    if (para) {
      nodes.push(
        /* @__PURE__ */ jsx20("p", { className: "text-sm text-stone-300 leading-relaxed mb-1.5 last:mb-0 font-serif", children: renderInline(para) }, key++)
      );
      i += paraEnd === -1 ? remaining.length : paraEnd;
    } else {
      i += 1;
    }
  }
  return nodes;
}
function renderInline(text) {
  const parts = [];
  let i = 0;
  let key = 0;
  while (i < text.length) {
    const remaining = text.slice(i);
    const codeMatch = remaining.match(/^`([^`]+)`/);
    if (codeMatch) {
      parts.push(/* @__PURE__ */ jsx20("code", { className: "px-1 py-0.5 rounded bg-stone-800/80 text-[13px] text-clay-300 font-mono", children: codeMatch[1] }, key++));
      i += codeMatch[0].length;
      continue;
    }
    const linkMatch = remaining.match(/^\[([^\]]+)\]\(([^)]+)\)/);
    if (linkMatch) {
      parts.push(/* @__PURE__ */ jsx20("a", { href: linkMatch[2], target: "_blank", rel: "noopener noreferrer", className: "text-clay-300 hover:text-clay-200 underline underline-offset-2 decoration-clay-400/30", children: linkMatch[1] }, key++));
      i += linkMatch[0].length;
      continue;
    }
    const boldMatch = remaining.match(/^\*\*([^*]+)\*\*/);
    if (boldMatch) {
      parts.push(/* @__PURE__ */ jsx20("strong", { className: "font-semibold text-stone-100", children: boldMatch[1] }, key++));
      i += boldMatch[0].length;
      continue;
    }
    const italicMatch = remaining.match(/^_([^_]+)_/);
    if (italicMatch) {
      parts.push(/* @__PURE__ */ jsx20("em", { className: "italic text-stone-200", children: italicMatch[1] }, key++));
      i += italicMatch[0].length;
      continue;
    }
    const strikethroughMatch = remaining.match(/^~~([^~]+)~~/);
    if (strikethroughMatch) {
      parts.push(/* @__PURE__ */ jsx20("del", { className: "line-through text-stone-500", children: strikethroughMatch[1] }, key++));
      i += strikethroughMatch[0].length;
      continue;
    }
    if (remaining[0] === "\n") {
      i += 1;
      continue;
    }
    if (remaining[0] === "|" || remaining[0] === "-") {
      const tableLine = remaining.match(/^[|\-:\s]+\n?/);
      if (tableLine) {
        i += tableLine[0].length;
        continue;
      }
    }
    const chunkEnd = remaining.search(/[`[*_[~(!]|(?=\n)/);
    if (chunkEnd === 0) {
      i += 1;
      continue;
    }
    const chunk = chunkEnd === -1 ? remaining : remaining.slice(0, chunkEnd);
    if (chunk) {
      parts.push(/* @__PURE__ */ jsx20(Fragment5, { children: chunk }, key++));
    }
    i += chunkEnd === -1 ? remaining.length : chunkEnd;
  }
  return parts.length === 1 ? parts[0] : /* @__PURE__ */ jsx20(Fragment6, { children: parts });
}
function renderProse(prose) {
  const paragraphs = [];
  let current = [];
  let key = 0;
  for (const n of prose) {
    if (n.t === "text" && n.v === "\n") {
      if (current.length > 0) {
        paragraphs.push(
          /* @__PURE__ */ jsx20("p", { className: "text-[15px] leading-[1.7] text-stone-300 max-w-[62ch] mb-1.5 last:mb-0 font-serif", children: current.map((c, i) => /* @__PURE__ */ jsx20(Fragment5, { children: c }, i)) }, key++)
        );
        current = [];
      }
      continue;
    }
    current.push(/* @__PURE__ */ jsx20(InlineRenderer, { nodes: [n] }, `${key}-${current.length}`));
  }
  if (current.length > 0) {
    paragraphs.push(
      /* @__PURE__ */ jsx20("p", { className: "text-[15px] leading-[1.7] text-stone-300 max-w-[62ch] mb-1.5 last:mb-0", children: current.map((c, i) => /* @__PURE__ */ jsx20(Fragment5, { children: c }, i)) }, key++)
    );
  }
  return paragraphs.length > 0 ? /* @__PURE__ */ jsx20(Fragment6, { children: paragraphs }) : null;
}
var TextBlock = ({ block }) => {
  if (block.prose && block.prose.length > 0) {
    return /* @__PURE__ */ jsx20("div", { className: "space-y-0.5", children: renderProse(block.prose) });
  }
  const body = block.fields.body;
  if (!body) return null;
  return /* @__PURE__ */ jsx20("div", { className: "space-y-0.5", children: mdToReact(body) });
};

// src/services/wireFormat.ts
var ACCENT2 = {
  clay: { text: "text-clay-300", border: "border-clay-400/30", bg: "bg-clay-400/10", dot: "bg-clay-400" },
  sage: { text: "text-sage-400", border: "border-sage-400/30", bg: "bg-sage-400/10", dot: "bg-sage-400" },
  amber: { text: "text-amber-400", border: "border-amber-400/30", bg: "bg-amber-400/10", dot: "bg-amber-400" },
  sky: { text: "text-sky-400", border: "border-sky-400/30", bg: "bg-sky-400/10", dot: "bg-sky-400" },
  neutral: { text: "text-stone-300", border: "border-stone-700/50", bg: "bg-stone-800/40", dot: "bg-stone-500" }
};
var MOTION2 = {
  entry: { duration: 0.25, ease: [0.16, 1, 0.3, 1] },
  stagger: 0.08,
  hover: { duration: 0.15, ease: [0.16, 1, 0.3, 1] },
  cross: { duration: 0.2, ease: "easeInOut" }
};
var messageVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: MOTION2.entry }
};

// src/components/AiChat/blocks/GroupShell.tsx
import { jsx as jsx21, jsxs as jsxs20 } from "react/jsx-runtime";
var GroupShell = ({ title, accent, children }) => {
  const t = accent ? ACCENT2[accent] : ACCENT2.neutral;
  return /* @__PURE__ */ jsxs20("div", { className: `rounded-xl border ${t.border} ${t.bg} p-3 space-y-2.5`, children: [
    title && /* @__PURE__ */ jsxs20("div", { className: "flex items-center gap-2", children: [
      /* @__PURE__ */ jsx21("span", { className: `w-1.5 h-1.5 rounded-full ${t.dot}` }),
      /* @__PURE__ */ jsx21("span", { className: "text-[13px] font-semibold text-stone-200", children: title })
    ] }),
    children
  ] });
};

// src/components/AiChat/blocks/TableBlock.tsx
import { jsx as jsx22, jsxs as jsxs21 } from "react/jsx-runtime";
var TableBlock = ({ block }) => {
  const rows = block.rows ?? [];
  if (rows.length === 0) return null;
  return /* @__PURE__ */ jsx22("div", { className: "overflow-x-auto", children: /* @__PURE__ */ jsxs21("table", { className: "w-full text-[13px] font-mono", children: [
    /* @__PURE__ */ jsx22("thead", { children: /* @__PURE__ */ jsx22("tr", { className: "divide-x divide-stone-800/60", children: rows[0].map((cell, i) => /* @__PURE__ */ jsx22("th", { className: "text-left px-3 py-1.5 text-stone-400 font-medium", children: cell }, i)) }) }),
    /* @__PURE__ */ jsx22("tbody", { className: "divide-y divide-stone-800/60", children: rows.slice(1).map((row, i) => /* @__PURE__ */ jsx22("tr", { className: "odd:bg-stone-900/30 divide-x divide-stone-800/60", children: row.map((cell, j) => /* @__PURE__ */ jsx22("td", { className: "px-3 py-1.5 text-stone-300", children: cell }, j)) }, i)) })
  ] }) });
};

// src/components/AiChat/blocks/ConfirmBlock.tsx
import { useState as useState4 } from "react";
import { Check as Check3, X } from "lucide-react";
import { jsx as jsx23, jsxs as jsxs22 } from "react/jsx-runtime";
var ConfirmBlock = ({ block }) => {
  const [resolved, setResolved] = useState4(null);
  const toolName = block.fields.tool ?? block.fields.label ?? "this action";
  if (resolved === "accepted") {
    return /* @__PURE__ */ jsxs22("div", { className: "bg-sage-400/10 border border-sage-400/25 rounded-lg px-3 py-2 text-sage-300 text-sm flex items-center gap-2", children: [
      /* @__PURE__ */ jsx23(Check3, { className: "w-4 h-4" }),
      toolName,
      " accepted"
    ] });
  }
  if (resolved === "declined") {
    return /* @__PURE__ */ jsxs22("div", { className: "bg-stone-800/50 border border-stone-700/40 rounded-lg px-3 py-2 text-stone-400 text-sm flex items-center gap-2", children: [
      /* @__PURE__ */ jsx23(X, { className: "w-4 h-4" }),
      toolName,
      " declined"
    ] });
  }
  return /* @__PURE__ */ jsxs22("div", { className: "bg-stone-900/80 border border-clay-400/30 rounded-xl p-3 space-y-3", children: [
    /* @__PURE__ */ jsx23("p", { className: "text-sm text-stone-200 font-mono", children: toolName }),
    /* @__PURE__ */ jsxs22("div", { className: "flex gap-2", children: [
      /* @__PURE__ */ jsxs22(
        "button",
        {
          onClick: () => setResolved("accepted"),
          className: "flex-1 rounded-lg bg-sage-400/90 hover:bg-sage-400 text-stone-950 text-sm font-medium px-4 py-2.5 min-h-[44px] transition-colors flex items-center justify-center gap-2",
          children: [
            /* @__PURE__ */ jsx23(Check3, { className: "w-4 h-4" }),
            "Accept"
          ]
        }
      ),
      /* @__PURE__ */ jsxs22(
        "button",
        {
          onClick: () => setResolved("declined"),
          className: "flex-1 rounded-lg border border-stone-700 hover:bg-stone-800 text-stone-300 text-sm font-medium px-4 py-2.5 min-h-[44px] transition-colors flex items-center justify-center gap-2",
          children: [
            /* @__PURE__ */ jsx23(X, { className: "w-4 h-4" }),
            "Decline"
          ]
        }
      )
    ] })
  ] });
};

// src/components/AiChat/blocks/SourcesBlock.tsx
import { useNavigate } from "react-router-dom";
import { jsx as jsx24, jsxs as jsxs23 } from "react/jsx-runtime";
var SourcesBlock = ({ refs }) => {
  const navigate = useNavigate();
  const entries = Object.entries(refs);
  if (entries.length === 0) return null;
  return /* @__PURE__ */ jsx24("div", { className: "flex flex-wrap gap-2", children: entries.map(([id, ref]) => /* @__PURE__ */ jsxs23(
    "button",
    {
      onClick: () => ref.href ? navigate(ref.href) : void 0,
      className: "inline-flex items-center gap-1.5 text-[11px] font-mono text-stone-500 bg-stone-800/40 hover:bg-stone-800/70 rounded-full px-2.5 py-1 transition-colors",
      children: [
        /* @__PURE__ */ jsxs23("span", { className: "text-clay-300", children: [
          "[",
          id,
          "]"
        ] }),
        ref.label
      ]
    },
    id
  )) });
};

// src/components/AiChat/BlockRenderer.tsx
import { Fragment as Fragment7, jsx as jsx25 } from "react/jsx-runtime";
function BlockRouter({ block, refs, onNewsClick, onNavigate, onRetry, index }) {
  const meta = block.meta;
  const priorityScale = meta.priority === "tertiary" ? "opacity-60 scale-[0.92]" : "";
  switch (block.type) {
    case "goal-list":
      return /* @__PURE__ */ jsx25("div", { className: priorityScale, children: /* @__PURE__ */ jsx25(GoalListBlock, { block }) });
    case "goal-create":
      return /* @__PURE__ */ jsx25("div", { className: priorityScale, children: /* @__PURE__ */ jsx25(GoalCreateBlock, { block }) });
    case "goal-delete":
      return /* @__PURE__ */ jsx25("div", { className: priorityScale, children: /* @__PURE__ */ jsx25(GoalDeleteBlock, { block }) });
    case "news-item":
      return /* @__PURE__ */ jsx25("div", { className: priorityScale, children: /* @__PURE__ */ jsx25(NewsItemBlock, { block, onClick: onNewsClick }) });
    case "data-summary":
      return /* @__PURE__ */ jsx25("div", { className: priorityScale, children: /* @__PURE__ */ jsx25(DataSummaryBlock, { block }) });
    case "error":
      return /* @__PURE__ */ jsx25("div", { className: priorityScale, children: /* @__PURE__ */ jsx25(ErrorBlock, { block, onRetry }) });
    case "navigation":
      return /* @__PURE__ */ jsx25("div", { className: priorityScale, children: /* @__PURE__ */ jsx25(NavigationBlock, { block, onClick: () => onNavigate?.(
        block.fields.page ?? block.fields.route ?? "",
        block.fields.section || void 0,
        block.fields.tab || void 0
      ) }) });
    case "table":
      return /* @__PURE__ */ jsx25("div", { className: priorityScale, children: /* @__PURE__ */ jsx25(TableBlock, { block }) });
    case "confirm":
      return /* @__PURE__ */ jsx25("div", { className: priorityScale, children: /* @__PURE__ */ jsx25(ConfirmBlock, { block }) });
    case "sources":
      return /* @__PURE__ */ jsx25("div", { className: priorityScale, children: /* @__PURE__ */ jsx25(SourcesBlock, { block, refs }) });
    case "text":
      return /* @__PURE__ */ jsx25("div", { className: priorityScale, children: /* @__PURE__ */ jsx25(TextBlock, { block }) });
    default:
      return /* @__PURE__ */ jsx25(TextBlock, { block });
  }
}
var BlockRenderer = ({ nodes, refs, onNewsClick, onNavigate, onRetry }) => {
  if (!nodes || nodes.length === 0) {
    return /* @__PURE__ */ jsx25("p", { className: "text-sm text-stone-500", children: "(empty message)" });
  }
  return /* @__PURE__ */ jsx25(Fragment7, { children: nodes.map((node, i) => {
    if (node.kind === "group") {
      return /* @__PURE__ */ jsx25(GroupShell, { title: node.title, accent: node.accent, children: node.children.map((b, j) => /* @__PURE__ */ jsx25(BlockRouter, { block: b, refs, onNewsClick, onNavigate, onRetry, index: j }, j)) }, i);
    }
    return /* @__PURE__ */ jsx25(
      BlockRouter,
      {
        block: node,
        refs,
        onNewsClick,
        onNavigate,
        onRetry,
        index: i
      },
      i
    );
  }) });
};

// src/components/AiChat/TypewriterText.tsx
import { useState as useState5, useEffect as useEffect2, useRef as useRef3 } from "react";
import { useNavigate as useNavigate2 } from "react-router-dom";

// src/lib/deepNav.ts
var SECTION_STORAGE_KEY = "deepNav:section";
function navigateTo(target, navigate) {
  const { route, section, tab, subpage, state } = target;
  if (section) {
    try {
      sessionStorage.setItem(SECTION_STORAGE_KEY, section);
    } catch {
    }
  }
  if (tab) {
    const tabKey = route === "/settings" ? "settings-activeTab" : route === "/ide" ? "ide-activeTab" : route === "/finance" ? "finance-activeTab" : route === "/reports" ? "insights-activeTab" : `${route}-activeTab`;
    try {
      localStorage.setItem(tabKey, tab);
    } catch {
    }
  }
  if (subpage) {
    try {
      sessionStorage.setItem("deepNav:subpage", subpage);
    } catch {
    }
  }
  navigate(route, {
    state: { section, tab, subpage, ...state },
    replace: false
  });
}

// src/components/AiChat/TypewriterText.tsx
import { jsx as jsx26, jsxs as jsxs24 } from "react/jsx-runtime";
var CHARS_PER_TICK = 1;
var TICK_MS = 20;
function flattenText(nodes) {
  const parts = [];
  function walk(n) {
    if (!n) return;
    if (typeof n === "string") {
      parts.push(n);
      return;
    }
    if (Array.isArray(n)) {
      n.forEach(walk);
      return;
    }
    if (n.kind === "group") {
      n.children?.forEach(walk);
      return;
    }
    if (n.type === "text" && n.fields?.body) {
      parts.push(n.fields.body);
      return;
    }
  }
  walk(nodes);
  return parts.join(" ");
}
var TypewriterText = ({ nodes, refs = {}, onDone }) => {
  const [revealed, setRevealed] = useState5(0);
  const navigate = useNavigate2();
  const doneRef = useRef3(false);
  const fullText = flattenText(nodes);
  useEffect2(() => {
    if (!fullText) {
      onDone?.();
      return;
    }
    const total = fullText.length;
    const tick = () => {
      setRevealed((prev) => {
        const next = prev + CHARS_PER_TICK;
        if (next >= total) {
          setTimeout(() => {
            if (!doneRef.current) {
              doneRef.current = true;
              onDone?.();
            }
          }, TICK_MS);
          return total;
        }
        return next;
      });
    };
    const id = setInterval(tick, TICK_MS);
    return () => clearInterval(id);
  }, [fullText, onDone]);
  if (!fullText) return null;
  const isComplete = revealed >= fullText.length;
  if (isComplete) {
    return /* @__PURE__ */ jsx26(
      BlockRenderer,
      {
        nodes,
        refs,
        onNavigate: (page, section, tab) => navigateTo({ route: page, section, tab }, navigate)
      }
    );
  }
  return /* @__PURE__ */ jsxs24("span", { className: "text-sm text-zinc-100 whitespace-pre-wrap", children: [
    fullText.slice(0, revealed),
    /* @__PURE__ */ jsx26("span", { className: "inline-block w-[2px] h-[1em] -mb-[2px] bg-pink-400 ml-0.5 align-baseline animate-pulse" })
  ] });
};

// src/components/AiChat/ThinkingIndicator.tsx
import { Bot as Bot3 } from "lucide-react";
import { jsx as jsx27, jsxs as jsxs25 } from "react/jsx-runtime";
var ThinkingIndicator = () => {
  return /* @__PURE__ */ jsxs25("div", { className: "group flex gap-3 px-4 py-3", children: [
    /* @__PURE__ */ jsx27("div", { className: "w-6 h-6 rounded-lg shrink-0 grid place-items-center ring-1 ring-zinc-700 bg-zinc-800 mt-0.5", children: /* @__PURE__ */ jsx27(Bot3, { className: "h-3.5 w-3.5 text-zinc-300" }) }),
    /* @__PURE__ */ jsxs25("div", { className: "flex items-center gap-1.5 py-2", children: [
      /* @__PURE__ */ jsx27("span", { className: "w-1.5 h-1.5 rounded-full bg-pink-400/70 animate-[breathe_1.2s_ease-in-out_infinite] translate-y-0", style: { animationDelay: "0ms" } }),
      /* @__PURE__ */ jsx27("span", { className: "w-1.5 h-1.5 rounded-full bg-pink-400/70 animate-[breathe_1.2s_ease-in-out_infinite] translate-y-0", style: { animationDelay: "40ms" } }),
      /* @__PURE__ */ jsx27("span", { className: "w-1.5 h-1.5 rounded-full bg-pink-400/70 animate-[breathe_1.2s_ease-in-out_infinite] translate-y-0", style: { animationDelay: "80ms" } })
    ] })
  ] });
};

// src/components/AiChat/AgentProgressBar.tsx
import { motion as motion5 } from "framer-motion";
import { Loader2 as Loader22, AlertCircle as AlertCircle2 } from "lucide-react";
import { jsx as jsx28, jsxs as jsxs26 } from "react/jsx-runtime";
var toolLabels = {
  getGoals: "Reading your goals",
  saveGoal: "Saving goal",
  suggestGoals: "Generating suggestions",
  getDashboardAggregates: "Loading dashboard",
  getAIUsageSummary: "Checking AI usage",
  getProjects: "Loading projects",
  getConnectors: "Checking data sources",
  getConnectorItems: "Reading inbox",
  readPlanningMd: "Reading your plan",
  getLongtermGoals: "Checking long-term goals",
  getGoalContext: "Building context"
};
function toolLabel(name) {
  if (!name) return "Reasoning";
  return toolLabels[name] ?? name.replace(/([A-Z])/g, " $1").trim().toLowerCase();
}
var AgentProgressBar = ({ round, totalRounds, toolName, status, message }) => {
  const pct = totalRounds > 0 ? round / totalRounds : 0;
  const isError = status === "error";
  return /* @__PURE__ */ jsxs26("div", { className: "px-4 py-2 border-t border-zinc-800/60 bg-zinc-950/40", children: [
    /* @__PURE__ */ jsxs26("div", { className: "flex items-center gap-2 text-[11px] text-zinc-400", children: [
      isError ? /* @__PURE__ */ jsx28(AlertCircle2, { className: "h-3 w-3 text-red-400 shrink-0" }) : /* @__PURE__ */ jsx28(Loader22, { className: "h-3 w-3 text-pink-400 animate-spin shrink-0" }),
      /* @__PURE__ */ jsx28("span", { className: "font-medium text-zinc-300", children: isError ? message ?? "Error" : toolLabel(toolName) }),
      /* @__PURE__ */ jsx28("span", { className: "text-zinc-600", children: "\xB7" }),
      /* @__PURE__ */ jsxs26("span", { children: [
        "round ",
        round,
        "/",
        totalRounds
      ] }),
      /* @__PURE__ */ jsxs26("span", { className: "ml-auto tabular-nums text-zinc-500", children: [
        Math.round(pct * 100),
        "%"
      ] })
    ] }),
    /* @__PURE__ */ jsx28("div", { className: "mt-1.5 h-1 rounded-full bg-zinc-800 overflow-hidden", children: /* @__PURE__ */ jsx28(
      motion5.div,
      {
        className: `h-full rounded-full ${isError ? "bg-red-500" : "bg-pink-500"}`,
        style: { transformOrigin: "left" },
        animate: { scaleX: pct },
        transition: { duration: MOTION.normal, ease: MOTION.ease }
      }
    ) })
  ] });
};

// src/services/parseBlocks.legacy.ts
function parseBlocks(raw) {
  try {
    const lines = raw.split("\n");
    const blocks = [];
    let current = null;
    let proseLines = [];
    let inItems = false;
    let itemsKey = "";
    let items = [];
    const flushProse = () => {
      if (proseLines.length > 0) {
        blocks.push({ type: "text", fields: { body: proseLines.join("\n").trim() } });
        proseLines = [];
      }
    };
    const flushItems = () => {
      if (inItems && current && itemsKey) {
        current.fields[itemsKey] = items;
        items = [];
        itemsKey = "";
        inItems = false;
      }
    };
    for (const line of lines) {
      const typeMatch = line.match(/^\[type:\s*(\S+)\]/);
      if (typeMatch) {
        flushProse();
        flushItems();
        current = { type: typeMatch[1], fields: {} };
        blocks.push(current);
        continue;
      }
      if (!current) {
        proseLines.push(line);
        continue;
      }
      if (line.trim() === "[items:") {
        flushProse();
        inItems = true;
        itemsKey = "items";
        items = [];
        continue;
      }
      if (inItems) {
        if (line.trim() === "]") {
          flushItems();
          continue;
        }
        const itemMatch = line.match(/^-\s*(\[.?\])\s*(.+)/);
        if (itemMatch) {
          const checked = itemMatch[1] === "[x]" || itemMatch[1] === "[X]";
          const rest = itemMatch[2].trim();
          const catMatch = rest.match(/^(.+?)\s*\((\w+)\)$/);
          if (catMatch) {
            items.push({ checked, label: catMatch[1].trim(), category: catMatch[2] });
          } else {
            items.push({ checked, label: rest });
          }
        }
        continue;
      }
      const kvMatch = line.match(/^\[(\w+):\s*(.*)\]/);
      if (kvMatch) {
        flushProse();
        current.fields[kvMatch[1]] = kvMatch[2].trim();
        continue;
      }
      proseLines.push(line);
    }
    flushProse();
    flushItems();
    return blocks;
  } catch {
    return [{ type: "text", fields: { body: raw } }];
  }
}

// src/services/parseBlocks.ts
var HAS_V2 = /(^|\n)\s*>>{1,2}\w/;
function parseHeader(rest) {
  const [typeTok, ...attrs] = rest.trim().split(/\s+/);
  const meta = { priority: "secondary" };
  for (const a of attrs) {
    if (a === "p1") meta.priority = "primary";
    else if (a === "p2") meta.priority = "secondary";
    else if (a === "p3") meta.priority = "tertiary";
    else if (a.startsWith("#")) meta.icon = a.slice(1);
    else if (a.startsWith("~")) meta.accent = a.slice(1);
  }
  return { type: typeTok, meta };
}
function parseInline(str) {
  const nodes = [];
  let i = 0;
  while (i < str.length) {
    const r = str.slice(i);
    const cite = r.match(/^<s\s+id=(\d+)>([^<]+)<\/s>/);
    if (cite) {
      nodes.push({ t: "cite", id: cite[1], v: cite[2] });
      i += cite[0].length;
      continue;
    }
    const metric = r.match(/^<m>([^<]+)<\/m>/);
    if (metric) {
      nodes.push({ t: "metric", v: metric[1] });
      i += metric[0].length;
      continue;
    }
    const code = r.match(/^`([^`]+)`/);
    if (code) {
      nodes.push({ t: "code", v: code[1] });
      i += code[0].length;
      continue;
    }
    const link = r.match(/^\[([^\]]+)\]\(([^)]+)\)/);
    if (link) {
      nodes.push({ t: "link", v: link[1], href: link[2] });
      i += link[0].length;
      continue;
    }
    const bold = r.match(/^\*\*([^*]+)\*\*/);
    if (bold) {
      nodes.push({ t: "bold", v: bold[1] });
      i += bold[0].length;
      continue;
    }
    const italic = r.match(/^_([^_]+)_/);
    if (italic) {
      nodes.push({ t: "italic", v: italic[1] });
      i += italic[0].length;
      continue;
    }
    const strike = r.match(/^~~([^~]+)~~/);
    if (strike) {
      nodes.push({ t: "strike", v: strike[1] });
      i += strike[0].length;
      continue;
    }
    if (r[0] === "\n") {
      nodes.push({ t: "text", v: "\n" });
      i += 1;
      continue;
    }
    const chunkEnd = r.search(/[`<\[*_~]/);
    if (chunkEnd === 0) {
      i += 1;
      continue;
    }
    const chunk = chunkEnd === -1 ? r : r.slice(0, chunkEnd);
    if (chunk) nodes.push({ t: "text", v: chunk });
    i += chunkEnd === -1 ? r.length : chunkEnd;
  }
  return nodes;
}
function parseStructuredResponse(raw) {
  if (!HAS_V2.test(raw)) {
    const legacy = parseBlocks(raw);
    return {
      version: 1,
      refs: {},
      nodes: legacy.map((b) => ({
        kind: "block",
        type: b.type,
        meta: { priority: "secondary" },
        fields: Object.fromEntries(
          Object.entries(b.fields).map(([k, v]) => [k, Array.isArray(v) ? "" : v])
        ),
        items: Array.isArray(b.fields.items) ? b.fields.items : void 0,
        prose: void 0
      }))
    };
  }
  const lines = raw.split(/\r?\n/);
  const nodes = [];
  const refs = {};
  let group = null;
  let cur = null;
  let inRefs = false;
  const push = (b) => group ? group.children.push(b) : nodes.push(b);
  const flush = () => {
    if (cur) {
      push(cur);
      cur = null;
    }
  };
  for (const line of lines) {
    const t = line.trimEnd();
    if (t.startsWith(">>>group")) {
      flush();
      const title = t.match(/title="([^"]*)"/)?.[1];
      const accent = t.match(/~(\w+)/)?.[1];
      group = { kind: "group", title, accent, children: [] };
      continue;
    }
    if (t.startsWith("<<<")) {
      flush();
      if (group) nodes.push(group);
      group = null;
      continue;
    }
    if (t.startsWith(">>refs")) {
      flush();
      inRefs = true;
      continue;
    }
    if (inRefs && /^\d+:/.test(t.trim())) {
      const [id, body] = t.trim().split(/:\s*/, 2);
      if (body) {
        const [label, meta] = body.split(/\s*\|\s*/);
        refs[id] = { label, href: meta?.match(/route:(\S+)/)?.[1] };
      }
      continue;
    }
    if (t.startsWith(">>")) {
      flush();
      inRefs = false;
      const { type, meta } = parseHeader(t.slice(2));
      cur = {
        kind: "block",
        type,
        meta,
        fields: {},
        items: type === "goal-list" ? [] : void 0,
        prose: type === "text" ? [] : void 0,
        rows: type === "table" ? [] : void 0
      };
      continue;
    }
    if (!cur) {
      cur = { kind: "block", type: "text", meta: { priority: "secondary" }, fields: {}, prose: [] };
    }
    const item = t.match(/^\s*-\s*\[( |x)\]\s*(.+?)(?:\s*\(([^)]+)\))?$/);
    const kv = t.match(/^([a-zA-Z][\w-]*):\s*(.*)$/);
    if (cur.items && item) cur.items.push({ checked: item[1] === "x", label: item[2], category: item[3] });
    else if (cur.rows && t.includes("|")) cur.rows.push(t.split("|").map((c) => c.trim()));
    else if (cur.type !== "text" && kv) cur.fields[kv[1]] = kv[2];
    else if (cur.prose) cur.prose.push(...parseInline(t), { t: "text", v: "\n" });
  }
  flush();
  if (group) nodes.push(group);
  return { version: 2, nodes, refs };
}

// src/services/ai/securityGuard.ts
var DEFAULT_CONFIG = {
  maxCallsPerMinute: 60,
  maxCallsPerSession: 500,
  requireConfirmForLevels: ["confirm", "admin"],
  auditEnabled: true
};
var SecurityGuard = class {
  config = { ...DEFAULT_CONFIG };
  callTimestamps = [];
  totalCalls = 0;
  auditLog = [];
  static LEVEL_HIERARCHY = {
    read: 0,
    confirm: 1,
    admin: 2,
    blocked: 99
  };
  getConfig() {
    return { ...this.config };
  }
  updateConfig(partial) {
    this.config = { ...this.config, ...partial };
  }
  isLevelAllowed(level) {
    if (level === "read") return true;
    if (level === "confirm") return true;
    if (level === "admin") return true;
    return false;
  }
  requiresConfirm(level) {
    return this.config.requireConfirmForLevels.includes(level);
  }
  checkRateLimit() {
    const now = Date.now();
    this.callTimestamps = this.callTimestamps.filter((t) => now - t < 6e4);
    if (this.callTimestamps.length >= this.config.maxCallsPerMinute) {
      return { allowed: false, reason: `Rate limit: max ${this.config.maxCallsPerMinute} calls per minute` };
    }
    if (this.totalCalls >= this.config.maxCallsPerSession) {
      return { allowed: false, reason: `Session limit: max ${this.config.maxCallsPerSession} calls per session` };
    }
    return { allowed: true };
  }
  validateParams(params, schema) {
    for (const [key, def] of Object.entries(schema)) {
      if (def.required && (params[key] === void 0 || params[key] === null)) {
        return { valid: false, error: `Missing required parameter: ${key}` };
      }
      if (params[key] !== void 0 && params[key] !== null) {
        const val = params[key];
        switch (def.type) {
          case "string":
            if (typeof val !== "string") return { valid: false, error: `${key} must be a string` };
            if (val.length > 1e4) return { valid: false, error: `${key} exceeds max length 10000` };
            break;
          case "number":
            if (typeof val !== "number" || isNaN(val)) return { valid: false, error: `${key} must be a number` };
            if (val < -1e9 || val > 1e9) return { valid: false, error: `${key} out of range` };
            break;
          case "boolean":
            if (typeof val !== "boolean") return { valid: false, error: `${key} must be a boolean` };
            break;
          case "array":
            if (!Array.isArray(val)) return { valid: false, error: `${key} must be an array` };
            if (val.length > 100) return { valid: false, error: `${key} exceeds max array length 100` };
            break;
          case "object":
            if (typeof val !== "object" || Array.isArray(val) || val === null) {
              return { valid: false, error: `${key} must be an object` };
            }
            const json = JSON.stringify(val);
            if (json.length > 5e4) return { valid: false, error: `${key} object exceeds 50KB` };
            break;
        }
      }
    }
    return { valid: true };
  }
  audited(toolName, params, fn) {
    const start = Date.now();
    this.callTimestamps.push(start);
    this.totalCalls++;
    return fn().then((result) => {
      if (this.config.auditEnabled) {
        this.auditLog.push({
          timestamp: (/* @__PURE__ */ new Date()).toISOString(),
          toolName,
          params: this.sanitizeParams(params),
          result: "(success)",
          durationMs: Date.now() - start,
          userId: "ai"
        });
      }
      return result;
    }).catch((err) => {
      if (this.config.auditEnabled) {
        this.auditLog.push({
          timestamp: (/* @__PURE__ */ new Date()).toISOString(),
          toolName,
          params: this.sanitizeParams(params),
          error: err.message,
          durationMs: Date.now() - start,
          userId: "ai"
        });
      }
      throw err;
    });
  }
  getAuditLog() {
    return [...this.auditLog];
  }
  getStats() {
    return {
      totalCalls: this.totalCalls,
      recentCallsPerMin: this.callTimestamps.length,
      auditEntries: this.auditLog.length
    };
  }
  sanitizeParams(params) {
    const sanitized = {};
    for (const [key, val] of Object.entries(params)) {
      if (typeof val === "string" && val.length > 200) {
        sanitized[key] = val.slice(0, 200) + "...";
      } else {
        sanitized[key] = val;
      }
    }
    return sanitized;
  }
};
var securityGuard = new SecurityGuard();

// src/services/ai/toolRegistry.ts
var api = window.deskflowAPI;
function p(type, description, extra) {
  return { type, description, ...extra };
}
var ToolRegistry = class {
  tools = /* @__PURE__ */ new Map();
  register(tool) {
    this.tools.set(tool.name, tool);
  }
  get(name) {
    return this.tools.get(name);
  }
  getAll() {
    return Array.from(this.tools.values());
  }
  getByCategory(category) {
    return this.getAll().filter((t) => t.category === category);
  }
  getOpenAISpecs() {
    return this.getAll().map((tool) => ({
      type: "function",
      function: {
        name: tool.name,
        description: tool.description,
        parameters: {
          type: "object",
          properties: this.toOpenAIProps(tool.parameters),
          required: Object.entries(tool.parameters).filter(([_, p2]) => p2.required).map(([k, _]) => k)
        }
      }
    }));
  }
  async execute(name, args) {
    const tool = this.tools.get(name);
    if (!tool) throw new Error(`Unknown tool: ${name}`);
    if (!securityGuard.isLevelAllowed(tool.securityLevel)) {
      throw new Error(`Tool ${name} requires ${tool.securityLevel} access`);
    }
    const rateCheck = securityGuard.checkRateLimit();
    if (!rateCheck.allowed) throw new Error(rateCheck.reason);
    const validation = securityGuard.validateParams(args, tool.parameters);
    if (!validation.valid) throw new Error(validation.error);
    return securityGuard.audited(name, args, () => tool.handler(args));
  }
  toOpenAIProps(params) {
    const props = {};
    for (const [key, def] of Object.entries(params)) {
      props[key] = {
        type: def.type,
        description: def.description,
        ...def.enum ? { enum: def.enum } : {},
        ...def.properties ? { properties: this.toOpenAIProps(def.properties) } : {},
        ...def.items ? { items: { type: def.items.type, description: def.items.description } } : {}
      };
    }
    return props;
  }
};
var toolRegistry = new ToolRegistry();
async function checkAccess(key) {
  try {
    const prefs = await api.getPreferences();
    const encoded = prefs?.ai_dataAccess;
    const access = encoded ? JSON.parse(encoded) : {};
    const allowed = access[key] !== false;
    return { allowed, message: allowed ? void 0 : `Access to ${key} data is disabled. You can enable it in Settings \u2192 AI Assistant \u2192 Data Access.` };
  } catch {
    return { allowed: true };
  }
}
function registerAll() {
  const r = (name, description, params, level, category, handler) => {
    toolRegistry.register({ name, description, parameters: params, securityLevel: level, category, handler });
  };
  r("getGoals", "Get goals for a specific date", { date: p("string", "Date string YYYY-MM-DD", { required: true }) }, "read", "goals", async (p2) => {
    const gate = await checkAccess("goals");
    if (!gate.allowed) return { _privacy: true, message: gate.message };
    return api.getGoals(p2.date);
  });
  r("getGoalsBatch", "Get goals for a date range", { startDate: p("string", "Start date YYYY-MM-DD", { required: true }), endDate: p("string", "End date YYYY-MM-DD", { required: true }) }, "read", "goals", async (p2) => {
    const gate = await checkAccess("goals");
    if (!gate.allowed) return { _privacy: true, message: gate.message };
    return api.getGoalsBatch(p2.startDate, p2.endDate);
  });
  r("getLongtermGoals", "Get long-term goals", {}, "read", "goals", async () => {
    const gate = await checkAccess("goals");
    if (!gate.allowed) return { _privacy: true, message: gate.message };
    return api.getLongtermGoals();
  });
  r("saveLongtermGoal", "Create or update a long-term goal (strategic goals, milestones, life objectives)", {
    id: p("string", "Goal ID (omit for new goal, include to update existing)"),
    title: p("string", "Goal title", { required: true }),
    description: p("string", "Detailed description"),
    category: p("string", "Category: work, learning, health, finance, personal, etc."),
    priority: p("number", "Priority (lower = higher priority, default 0)"),
    status: p("string", "Status: pending, in_progress, completed, abandoned", { enum: ["pending", "in_progress", "completed", "abandoned"] })
  }, "confirm", "goals", async (params) => {
    const gate = await checkAccess("goals");
    if (!gate.allowed) return { _privacy: true, message: gate.message };
    const id = params.id || `lt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    return api.saveGoal("2000-01-01", {
      id,
      title: params.title,
      description: params.description || null,
      category: params.category || "personal",
      target: { type: "custom" },
      status: params.status || "pending",
      period: "longterm",
      source: "ai_assistant",
      priority: params.priority ?? 0
    });
  });
  r("deleteLongtermGoal", "Delete a long-term goal", { goalId: p("string", "Long-term goal ID to delete", { required: true }) }, "confirm", "goals", async (params) => {
    const gate = await checkAccess("goals");
    if (!gate.allowed) return { _privacy: true, message: gate.message };
    return api.deleteGoal(params.goalId);
  });
  r("saveGoal", "Create or update a daily goal", { date: p("string", "Date YYYY-MM-DD", { required: true }), goal: p("object", "Goal object with id, text, etc.", { required: true }) }, "confirm", "goals", (p2) => api.saveGoal(p2.date, p2.goal));
  r("deleteGoal", "Delete a goal by ID", { goalId: p("string", "Goal ID to delete", { required: true }) }, "confirm", "goals", (p2) => api.deleteGoal(p2.goalId));
  r("saveGoalReview", "Save a goal review summary", { date: p("string", "Date YYYY-MM-DD", { required: true }), reviewSummary: p("string", "Review summary text", { required: true }) }, "confirm", "goals", (p2) => api.saveGoalReview(p2.date, p2.reviewSummary));
  r("getGoalContext", "Get goal context for AI", {}, "read", "goals", async () => {
    const gate = await checkAccess("goals");
    if (!gate.allowed) return { _privacy: true, message: gate.message };
    return api.getGoalContext();
  });
  r("getGoal", "Get a single goal by its ID", { goalId: p("string", "Goal ID", { required: true }) }, "read", "goals", async (params) => {
    const gate = await checkAccess("goals");
    if (!gate.allowed) return { _privacy: true, message: gate.message };
    return api.getGoal(params.goalId);
  });
  r("getChildGoals", "Get all child goals (decomposition) for a parent goal", { parentId: p("string", "Parent goal ID", { required: true }) }, "read", "goals", async (params) => {
    const gate = await checkAccess("goals");
    if (!gate.allowed) return { _privacy: true, message: gate.message };
    return api.getChildGoals(params.parentId);
  });
  r("decomposeGoal", "Break a long-term or strategic goal into smaller sub-goals (weekly, monthly, or daily). Creates multiple child goals linked to the parent via parent_id.", {
    parentId: p("string", "ID of the parent goal to decompose", { required: true }),
    children: p("array", "Array of child goal definitions", { required: true, items: { type: "object", description: '{ title, description?, category?, period: "daily"|"weekly"|"monthly"|"quarterly", priority?, status? }' } })
  }, "confirm", "goals", async (params) => {
    const gate = await checkAccess("goals");
    if (!gate.allowed) return { _privacy: true, message: gate.message };
    const children = params.children.map((c) => ({
      id: `child_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      title: c.title,
      description: c.description || null,
      category: c.category || "personal",
      period: c.period || "weekly",
      status: c.status || "pending",
      source: "ai_assistant",
      parent_id: params.parentId,
      priority: c.priority ?? 5,
      target: { type: "custom" },
      date: "2000-01-01"
    }));
    return api.saveGoalsBatch(children);
  });
  r("linkGoalToProblem", "Link a goal to a problem for traceability (goal will show the linked problem)", { goalId: p("string", "Goal ID", { required: true }), problemId: p("string", "Problem ID to link", { required: true }), label: p("string", "Optional display label") }, "confirm", "goals", async (params) => {
    const gate = await checkAccess("goals");
    if (!gate.allowed) return { _privacy: true, message: gate.message };
    return api.linkGoalToEntity(params.goalId, { type: "problem", id: params.problemId, label: params.label });
  });
  r("linkGoalToRequest", "Link a goal to a feature request for traceability", { goalId: p("string", "Goal ID", { required: true }), requestId: p("string", "Request ID to link", { required: true }), label: p("string", "Optional display label") }, "confirm", "goals", async (params) => {
    const gate = await checkAccess("goals");
    if (!gate.allowed) return { _privacy: true, message: gate.message };
    return api.linkGoalToEntity(params.goalId, { type: "request", id: params.requestId, label: params.label });
  });
  r("unlinkGoalFromProblem", "Remove a link between a goal and a problem", { goalId: p("string", "Goal ID", { required: true }), problemId: p("string", "Problem ID to unlink", { required: true }) }, "confirm", "goals", async (params) => {
    const gate = await checkAccess("goals");
    if (!gate.allowed) return { _privacy: true, message: gate.message };
    return api.unlinkGoalFromEntity(params.goalId, "problem", params.problemId);
  });
  r("unlinkGoalFromRequest", "Remove a link between a goal and a request", { goalId: p("string", "Goal ID", { required: true }), requestId: p("string", "Request ID to unlink", { required: true }) }, "confirm", "goals", async (params) => {
    const gate = await checkAccess("goals");
    if (!gate.allowed) return { _privacy: true, message: gate.message };
    return api.unlinkGoalFromEntity(params.goalId, "request", params.requestId);
  });
  r("getProjects", "Get all projects (non-deleted)", {}, "read", "projects", async () => {
    const gate = await checkAccess("projects");
    if (!gate.allowed) return { _privacy: true, message: gate.message };
    return api.getProjects();
  });
  r("getAllProjects", "Get ALL projects including deleted", {}, "read", "projects", async () => {
    const gate = await checkAccess("projects");
    if (!gate.allowed) return { _privacy: true, message: gate.message };
    return api.getAllProjects();
  });
  r("getProjectDetails", "Get detailed project info", { projectId: p("string", "Project ID", { required: true }) }, "read", "projects", async (p2) => {
    const gate = await checkAccess("projects");
    if (!gate.allowed) return { _privacy: true, message: gate.message };
    return api.getProjectDetails(p2.projectId);
  });
  r("addProject", "Create a new project", { name: p("string", "Project name", { required: true }), path: p("string", "File system path", { required: true }), repositoryUrl: p("string", "Optional git URL"), vcsType: p("string", "VCS type (git etc)"), primaryLanguage: p("string", "Primary programming language"), defaultIde: p("string", "Default IDE ID") }, "confirm", "projects", (p2) => api.addProject(p2));
  r("updateProject", "Update project fields", { projectId: p("string", "Project ID", { required: true }), name: p("string", "New name"), path: p("string", "New path"), repositoryUrl: p("string", "Git URL"), vcsType: p("string", "VCS type"), primaryLanguage: p("string", "Language"), defaultIde: p("string", "IDE ID") }, "confirm", "projects", (p2) => api.updateProject(p2.projectId, p2));
  r("deleteProject", "Soft-delete a project", { projectId: p("string", "Project ID", { required: true }) }, "confirm", "projects", (p2) => api.deleteProject(p2.projectId));
  r("restoreProject", "Restore a deleted project", { projectId: p("string", "Project ID", { required: true }) }, "confirm", "projects", (p2) => api.restoreProject(p2.projectId));
  r("openProject", "Open a project in its IDE", { projectId: p("string", "Project ID", { required: true }), ideId: p("string", "Optional specific IDE ID") }, "confirm", "projects", (p2) => api.openProject(p2.projectId, p2.ideId));
  r("calculateProjectHealth", "Calculate project health score", { projectId: p("string", "Project ID", { required: true }) }, "read", "projects", async (p2) => {
    const gate = await checkAccess("projects");
    if (!gate.allowed) return { _privacy: true, message: gate.message };
    return api.calculateProjectHealth(p2.projectId);
  });
  r("getCommitStats", "Get commit statistics for project(s)", { projectId: p("string", "Optional project ID"), period: p("string", '"week" or "month"') }, "read", "projects", async (p2) => {
    const gate = await checkAccess("projects");
    if (!gate.allowed) return { _privacy: true, message: gate.message };
    return api.getCommitStats(p2.projectId, p2.period);
  });
  r("getExternalActivities", "Get all external activities", {}, "read", "external", () => api.getExternalActivities());
  r("addExternalActivity", "Create an external activity", { name: p("string", "Activity name", { required: true }), type: p("string", "Activity type", { required: true }), color: p("string", "Hex color"), icon: p("string", "Icon identifier"), default_duration: p("number", "Default duration in minutes") }, "confirm", "external", (p2) => api.addExternalActivity(p2));
  r("updateExternalActivity", "Update an external activity", { id: p("string", "Activity ID", { required: true }), name: p("string", "New name"), type: p("string", "New type"), color: p("string", "New hex color"), icon: p("string", "New icon"), default_duration: p("number", "Default duration mins"), is_visible: p("boolean", "Visibility"), is_default: p("boolean", "Is default") }, "confirm", "external", (p2) => api.updateExternalActivity(p2.id, p2));
  r("deleteExternalActivity", "Delete an external activity", { id: p("string", "Activity ID to delete", { required: true }) }, "confirm", "external", (p2) => api.deleteExternalActivity(p2.id));
  r("startExternalSession", "Start tracking an external activity", { activityId: p("string", "Activity ID to start", { required: true }) }, "confirm", "external", (p2) => api.startExternalSession(p2.activityId));
  r("stopExternalSession", "Stop tracking an external session", { sessionId: p("string", "Session ID", { required: true }), endTime: p("string", "Optional end time ISO string") }, "confirm", "external", (p2) => api.stopExternalSession(p2.sessionId, p2.endTime));
  r("getExternalSessions", "Get external sessions for a period", { period: p("string", '"today", "week", "month", or "all"', { required: true }) }, "read", "external", (p2) => api.getExternalSessions(p2.period));
  r("getExternalStats", "Get external activity stats", { period: p("string", '"today", "week", "month", or "all"', { required: true }) }, "read", "external", (p2) => api.getExternalStats(p2.period));
  r("addExternalTime", "Manually add time to an activity", { activityId: p("string", "Activity ID", { required: true }), durationMinutes: p("number", "Duration in minutes", { required: true }), started_at: p("string", "Start time ISO string"), ended_at: p("string", "End time ISO string") }, "confirm", "external", (p2) => api.addExternalTime(p2.activityId, p2.durationMinutes, p2.started_at, p2.ended_at));
  r("getActiveExternalSession", "Get currently active external session", {}, "read", "external", () => api.getActiveExternalSession());
  r("getSleepForDate", "Get sleep data for a date", { dateStr: p("string", "Date string YYYY-MM-DD", { required: true }) }, "read", "sleep", (p2) => api.getSleepForDate(p2.dateStr));
  r("addManualSleep", "Add manual sleep entry", { started_at: p("string", "Start time ISO", { required: true }), ended_at: p("string", "End time ISO", { required: true }) }, "confirm", "sleep", (p2) => api.addManualSleep(p2));
  r("updateManualSleep", "Update a manual sleep entry", { sessionId: p("string", "Session ID", { required: true }), started_at: p("string", "Start time ISO", { required: true }), ended_at: p("string", "End time ISO", { required: true }) }, "confirm", "sleep", (p2) => api.updateManualSleep(p2.sessionId, p2));
  r("getSleepTrends", "Get sleep trends data", { period: p("string", '"today", "week", "month", "all"', { required: true }), dateOffset: p("number", "Days offset from today") }, "read", "sleep", (p2) => api.getSleepTrends(p2.period, p2.dateOffset));
  r("getPreferences", "Get all user preferences", {}, "read", "settings", () => api.getPreferences());
  r("setPreference", "Set a user preference", { key: p("string", "Preference key", { required: true }), value: p("string", "Preference value (JSON string)", { required: true }) }, "confirm", "settings", (p2) => api.setPreference(p2.key, p2.value));
  r("getExternalSettings", "Get external settings value", { key: p("string", "Settings key", { required: true }) }, "read", "settings", (p2) => api.getExternalSettings(p2.key));
  r("setExternalSettings", "Set external settings value", { key: p("string", "Settings key", { required: true }), value: p("string", "Settings value", { required: true }) }, "confirm", "settings", (p2) => api.setExternalSettings(p2.key, p2.value));
  r("getCategoryConfig", "Get category configuration", {}, "read", "categories", () => api.getCategoryConfig());
  r("getTierAssignments", "Get tier assignments for apps/domains", {}, "read", "categories", () => api.getTierAssignments());
  r("setAppCategory", "Set category for an app", { appName: p("string", "App name", { required: true }), category: p("string", "Category name", { required: true }) }, "confirm", "categories", (p2) => api.setAppCategory(p2.appName, p2.category));
  r("setDomainCategory", "Set category for a domain", { domain: p("string", "Domain name", { required: true }), category: p("string", "Category name", { required: true }) }, "confirm", "categories", (p2) => api.setDomainCategory(p2.domain, p2.category));
  r("setAppTier", "Set productivity tier for an app", { appName: p("string", "App name", { required: true }), tier: p("string", '"productive", "neutral", or "distracting"', { required: true, enum: ["productive", "neutral", "distracting"] }) }, "confirm", "categories", (p2) => api.setAppTier(p2.appName, p2.tier));
  r("setDomainTier", "Set productivity tier for a domain", { domain: p("string", "Domain name", { required: true }), tier: p("string", '"productive", "neutral", or "distracting"', { required: true, enum: ["productive", "neutral", "distracting"] }) }, "confirm", "categories", (p2) => api.setDomainTier(p2.domain, p2.tier));
  r("setTierAssignments", "Bulk set tier assignments", { assignments: p("object", "{ productive: string[], neutral: string[], distracting: string[] }", { required: true }) }, "confirm", "categories", (p2) => api.setTierAssignments(p2.assignments));
  r("getIDEProjectsOverview", "Get IDE projects overview with token usage and costs", { period: p("string", "Period string"), dateOffset: p("number", "Days offset") }, "read", "ide", async (p2) => {
    const gate = await checkAccess("projects");
    if (!gate.allowed) return { _privacy: true, message: gate.message };
    return api.getIDEProjectsOverview(p2.period, p2.dateOffset);
  });
  r("getTerminalSessions", "Get terminal sessions", { projectId: p("string", "Optional project ID"), limit: p("number", "Max sessions") }, "read", "ide", (p2) => api.getTerminalSessions(p2.projectId, p2.limit));
  r("getProblems", "Get problems for a project", { projectId: p("string", "Optional project ID"), projectPath: p("string", "Optional project path") }, "read", "problems", async (p2) => {
    const gate = await checkAccess("problems");
    if (!gate.allowed) return { _privacy: true, message: gate.message };
    return api.getProblems(p2.projectId, p2.projectPath);
  });
  r("updateProblemStatus", "Update a problem status", { problemId: p("string", "Problem ID", { required: true }), status: p("string", "New status", { required: true }) }, "confirm", "problems", (p2) => api.updateProblemStatus({ problemId: p2.problemId, status: p2.status }));
  r("deleteProblem", "Delete a problem", { problemId: p("string", "Problem ID", { required: true }) }, "confirm", "problems", (p2) => api.deleteProblem(p2.problemId));
  r("getRecordingModes", "Get current recording modes", {}, "read", "recording", () => api.getRecordingModes());
  r("setRecordingMode", "Set recording mode for browser or app", { type: p("string", '"browser" or "app"', { required: true, enum: ["browser", "app"] }), mode: p("string", '"always" or "on-view"', { required: true, enum: ["always", "on-view"] }) }, "confirm", "recording", (p2) => api.setRecordingMode(p2.type, p2.mode));
  r("getBrowserCategoryStats", "Get browser stats by category", { period: p("string", "Period string", { required: true }), dateOffset: p("number", "Days offset") }, "read", "stats", (p2) => api.getBrowserCategoryStats(p2.period, p2.dateOffset));
  r("getAiContext", "Get AI context for agent", { projectId: p("string", "Optional project ID"), since: p("string", "ISO date filter"), limit: p("number", "Max entries") }, "read", "ai", (p2) => api.getAiContext(p2));
  r("getRequests", "Get all feature requests", { projectId: p("string", "Optional project ID") }, "read", "requests", async (params) => {
    const gate = await checkAccess("requests");
    if (!gate.allowed) return { _privacy: true, message: gate.message };
    return api.getRequests(params.projectId);
  });
  r("getAIUsageSummary", "Get AI usage summary (tokens, costs, sessions per tool)", { period: p("string", 'Period string like "day", "week", "month"'), dateOffset: p("number", "Days offset"), projectId: p("string", "Optional project ID") }, "read", "ai", async (params) => {
    const gate = await checkAccess("aiUsage");
    if (!gate.allowed) return { _privacy: true, message: gate.message };
    return api.getAIUsageSummary(params.period, params.dateOffset, params.projectId);
  });
  r("getDashboardAggregates", "Get dashboard aggregate stats (overview, app stats, hourly stats, focus time)", { period: p("string", 'Period string like "today", "week", "month", "all"', { required: true }), dateOffset: p("number", "Days offset"), weekOffset: p("number", "Weeks offset") }, "read", "stats", async (params) => {
    const gate = await checkAccess("dashboardStats");
    if (!gate.allowed) return { _privacy: true, message: gate.message };
    return api.getDashboardAggregates(params);
  });
  r("getInterestTopics", "Get all active research topics that AI uses for digest generation", {}, "read", "ai", async () => {
    const gate = await checkAccess("aiUsage");
    if (!gate.allowed) return { _privacy: true, message: gate.message };
    return api.getInterestTopics();
  });
  r("addInterestTopic", "Add a new research topic for AI to track and include in digests", { topic: p("string", 'Research topic name (e.g. "React performance", "Rust async")', { required: true }) }, "confirm", "ai", async (params) => {
    const gate = await checkAccess("aiUsage");
    if (!gate.allowed) return { _privacy: true, message: gate.message };
    return api.addInterestTopic(params.topic);
  });
  r("removeInterestTopic", "Remove a research topic from AI tracking", { topic: p("string", "Topic name to remove", { required: true }) }, "confirm", "ai", async (params) => {
    const gate = await checkAccess("aiUsage");
    if (!gate.allowed) return { _privacy: true, message: gate.message };
    return api.removeInterestTopic(params.topic);
  });
  r("addProblemCheck", "Add a checklist item to a problem (tracking verification steps for bug fixes)", { problemId: p("string", "Problem ID to add the check to", { required: true }), description: p("string", "Short description of what to verify", { required: true }), instruction: p("string", "Detailed verification instructions") }, "confirm", "checklist", async (params) => {
    const gate = await checkAccess("checklist");
    if (!gate.allowed) return { _privacy: true, message: gate.message };
    return api.addProblemCheck({ problemId: params.problemId, description: params.description, instruction: params.instruction });
  });
  r("addRequestCheck", "Add a checklist item to a feature request (tracking implementation steps)", { requestId: p("string", "Request ID to add the check to", { required: true }), description: p("string", "Short description of what to verify", { required: true }), instruction: p("string", "Detailed verification instructions") }, "confirm", "checklist", async (params) => {
    const gate = await checkAccess("checklist");
    if (!gate.allowed) return { _privacy: true, message: gate.message };
    return api.addRequestCheck({ requestId: params.requestId, description: params.description, instruction: params.instruction });
  });
  r("completeCheck", "Mark a checklist item as completed after verifying it works", { checkId: p("string", "Check item ID to mark completed", { required: true }) }, "confirm", "checklist", async (params) => {
    const gate = await checkAccess("checklist");
    if (!gate.allowed) return { _privacy: true, message: gate.message };
    return api.completeCheck(params.checkId);
  });
  r("getProblemChecks", "Get all checklist items for a problem", { problemId: p("string", "Problem ID", { required: true }) }, "read", "checklist", async (params) => {
    const gate = await checkAccess("checklist");
    if (!gate.allowed) return { _privacy: true, message: gate.message };
    return api.getProblemChecks(params.problemId);
  });
  r("getRequestChecks", "Get all checklist items for a request", { requestId: p("string", "Request ID", { required: true }) }, "read", "checklist", async (params) => {
    const gate = await checkAccess("checklist");
    if (!gate.allowed) return { _privacy: true, message: gate.message };
    return api.getRequestChecks(params.requestId);
  });
  r("getWorkspaceState", "Get all saved workspace layouts and configs", {}, "read", "ide", async () => {
    try {
      return await api.listAllWorkspaces();
    } catch (err) {
      return { error: err.message };
    }
  });
  r("getTerminalSessionsRich", "Get terminal sessions with details (topic, agent, status, tokens, cost)", { projectId: p("string", "Optional project ID filter"), limit: p("number", "Max sessions (default 20)") }, "read", "ide", async (params) => {
    try {
      return await api.getTerminalSessions(params.projectId, params.limit || 20);
    } catch (err) {
      return { error: err.message };
    }
  });
  r("getTerminalMessages", "Get messages from a specific terminal session", { sessionId: p("string", "Terminal session ID", { required: true }) }, "read", "ide", async (params) => {
    try {
      return await api.getTerminalMessages(params.sessionId);
    } catch (err) {
      return { error: err.message };
    }
  });
  r("getTutorialStatus", "Check which feature tutorials have been completed", {}, "read", "settings", async () => {
    try {
      const raw = localStorage.getItem("tutorial-completed");
      const completed = raw ? JSON.parse(raw) : [];
      return { completed, features: ["dash.score", "dash.timer", "dash.sessions", "prod.score", "browser.track", "ide.detect", "ext.timer", "sleep.track"] };
    } catch {
      return { completed: [], features: [] };
    }
  });
  r("startFeatureTutorial", "Start a guided tutorial for a specific app feature", {
    featureId: p("string", 'Feature ID to start tutorial for (e.g. "dash.timer", "ide.detect")', { required: true, enum: ["dash.score", "dash.timer", "dash.sessions", "prod.score", "browser.track", "ide.detect", "ext.timer", "sleep.track"] })
  }, "confirm", "settings", async (params) => {
    try {
      localStorage.setItem("tutorial:start", params.featureId);
    } catch {
    }
    return { success: true, featureId: params.featureId, message: `Tutorial for ${params.featureId} will start. Look for the highlighted walkthrough on screen.` };
  });
  r("getPrompts", "Get agent prompts with status and progress info", { sessionId: p("string", "Optional session ID filter"), projectId: p("string", "Optional project ID filter") }, "read", "prompts", async (params) => {
    const gate = await checkAccess("prompts");
    if (!gate.allowed) return { _privacy: true, message: gate.message };
    return api.agentPrompts.list({ sessionId: params.sessionId, projectId: params.projectId });
  });
  r("createPrompt", "Create a new agent prompt record linked to a session", { sessionId: p("string", "Session ID this prompt belongs to"), projectId: p("string", "Optional project ID"), content: p("string", "The prompt content text", { required: true }), title: p("string", "Short title for the prompt"), category: p("string", "Category (e.g. debug, feature, review, research)") }, "confirm", "prompts", async (params) => {
    const gate = await checkAccess("prompts");
    if (!gate.allowed) return { _privacy: true, message: gate.message };
    return api.agentPrompts.create({ sessionId: params.sessionId, content: params.content, title: params.title, category: params.category, projectId: params.projectId });
  });
  r("updatePrompt", "Update prompt status, progress percentage, and result summary", { id: p("string", "Prompt ID to update", { required: true }), status: p("string", "New status (pending, in_progress, completed, failed, cancelled)"), progress: p("number", "Progress 0-100"), resultSummary: p("string", "AI-generated summary of the prompt result") }, "confirm", "prompts", async (params) => {
    const gate = await checkAccess("prompts");
    if (!gate.allowed) return { _privacy: true, message: gate.message };
    return api.agentPrompts.update({ id: params.id, status: params.status, progress: params.progress, resultSummary: params.resultSummary });
  });
  r("getConnectors", "List all configured connectors (email, calendar) that sync external data", {}, "read", "connectors", async () => {
    const gate = await checkAccess("connectors");
    if (!gate.allowed) return { _privacy: true, message: gate.message };
    try {
      return await api.connectors.list();
    } catch (err) {
      return { error: err.message };
    }
  });
  r("getConnectorItems", "Get synced items (emails, events) from a connector, optionally filtered by type", { connectorId: p("string", "Connector ID to fetch items from", { required: true }), type: p("string", "Optional item type filter: email or event"), limit: p("number", "Max items (default 20)") }, "read", "connectors", async (params) => {
    const gate = await checkAccess("connectors");
    if (!gate.allowed) return { _privacy: true, message: gate.message };
    try {
      return await api.connectors.items(params.connectorId, { type: params.type, limit: params.limit || 20 });
    } catch (err) {
      return { error: err.message };
    }
  });
}
registerAll();

// src/services/ai/aiAgentService.ts
var SYSTEM_PROMPT_BASE = `You are an AI assistant integrated into a personal productivity tracker. You have access to tools that let you:

- READ goals, projects, activities, settings, stats, sleep data, workspace state, terminal sessions, checks
- CREATE/UPDATE/DELETE goals (daily + long-term), projects, external activities, categories, preferences
- DECOMPOSE long-term goals into sub-goals for milestone tracking
- START/STOP activity tracking sessions
- MANAGE problems, recording configurations, and research topics
- CHECK tutorial completion status and START feature tutorials

Navigation \u2014 When you want to take the user to a specific page or section, output a navigation block:
\`\`\`
[type: navigation]
[page: /settings]
[tab: ai]
[section: settings.ai]
[label: Go to AI Settings]
\`\`\`
Supported params: page (route), tab (tab key), section (section ID), label (button text).
Section IDs include: settings.ai, settings.finance, settings.tracking, settings.prompts, ide.ai-tools, ide.projects, ai.chat, ai.focus, ai.plan, ai.reflect, insights.weekly, finance.accounts, external.sleep, and more.

Long-term goals: Use saveLongtermGoal to create strategic goals (life objectives, milestones). Use getLongtermGoals to review them.

Goal decomposition: Break a long-term goal into smaller sub-goals with decomposeGoal(parentId, children[]). Children get parent_id linking them to the parent. Use getChildGoals(parentId) to retrieve them. For example: create a long-term goal \u2192 decompose into weekly milestones \u2192 optionally decompose weekly into daily tasks.

Goal linking: Use linkGoalToProblem / linkGoalToRequest to trace which problems or requests a goal relates to. The links appear in the goal's metadata. Use unlinkGoalFromProblem / unlinkGoalFromRequest to remove links.

Checklists: Use addProblemCheck(problemId, description, instruction) to create verification steps on problems, and addRequestCheck for feature requests. Use completeCheck(checkId) to mark items done after verifying. Use getProblemChecks / getRequestChecks to list existing checks. The checks live on problems and requests and can be viewed in the workspace sidebar under the Work \u2192 Issues \u2192 Checklist subtab.

Research topics: Use getInterestTopics to see what the AI tracks. Use addInterestTopic/removeInterestTopic to manage them.

Rules:
1. Use tools to answer questions \u2014 do not guess or make up data
2. When the user asks to CREATE or DELETE something, explain what you're about to do and get confirmation before acting
3. When the user asks to READ something, just fetch and show it
4. Keep responses concise and helpful
5. If a tool fails, explain the error clearly
6. Batch independent tool calls when possible
7. When showing lists, summarize totals (e.g., "You have 5 projects" instead of dumping everything)
8. NEVER make up data \u2014 use the tools to fetch real data
9. For time-based queries, use appropriate periods: "today", "week", "month", "all"
10. Format times readably (e.g., "2h 30m" instead of raw seconds)
11. When showing data, offer a navigation link to the relevant page when it helps the user
12. For long-term goal management, ask clarifying questions about priority and category before creating
13. When the user wants to break down a goal, use decomposeGoal to create sub-goals with appropriate periods (weekly for milestones, daily for actionable tasks)
14. After decomposing a goal, link sub-goals to relevant problems or requests with linkGoalToProblem / linkGoalToRequest for full traceability
15. Use addProblemCheck to create verification steps on problems \u2014 this is how the AI tracks whether a fix actually works
16. When a user confirms a fix works, use completeCheck to mark the checklist item as done`;
var AiAgentService = class {
  config = {
    providerId: "",
    model: "",
    systemPrompt: SYSTEM_PROMPT_BASE,
    maxTokens: 2e3,
    temperature: 0.7,
    maxToolCallsPerRound: 8,
    maxRounds: 5
  };
  conversationHistory = [];
  confirmQueue = [];
  progressCallback = null;
  getConfig() {
    return { ...this.config };
  }
  updateConfig(partial) {
    this.config = { ...this.config, ...partial };
  }
  setProgressCallback(callback) {
    this.progressCallback = callback;
  }
  clearProgressCallback() {
    this.progressCallback = null;
  }
  getConversationHistory() {
    return [...this.conversationHistory];
  }
  getSystemPrompt() {
    const tools = toolRegistry.getAll();
    const readTools = tools.filter((t) => t.securityLevel === "read");
    const writeTools = tools.filter((t) => t.securityLevel === "confirm");
    return `${SYSTEM_PROMPT_BASE}

Available tools (${tools.length} total):
- READ only (${readTools.length}): ${readTools.map((t) => t.name).join(", ")}
- WRITE/DELETE (${writeTools.length}, require confirmation): ${writeTools.map((t) => t.name).join(", ")}

Security: ${JSON.stringify(securityGuard.getStats())}`;
  }
  async buildConnectorContext() {
    try {
      const api2 = window.deskflowAPI;
      if (!api2?.connectors) return "";
      const connectors = await api2.connectors.list();
      if (!Array.isArray(connectors) || connectors.length === 0) return "";
      const lines = [];
      for (const c of connectors) {
        const result = await api2.connectors.items(c.id, { limit: 5 });
        if (result?.items?.length) {
          lines.push(`
### ${c.displayName || c.provider}`);
          for (const item of result.items) {
            lines.push(`- ${item.itemType === "event" ? "\u{1F4C5}" : "\u{1F4E7}"} **${item.subject}** (${item.date})${item.summary ? ` \u2014 ${item.summary.slice(0, 120)}` : ""}`);
          }
        }
      }
      if (lines.length === 0) return "";
      return `
## Recent Connector Items
${lines.join("\n")}
`;
    } catch {
      return "";
    }
  }
  async processMessage(userMessage) {
    console.log(`[AiAgent] processMessage start, userMessage="${userMessage.slice(0, 50)}", historyLen=${this.conversationHistory.length}`);
    this.conversationHistory.push({ role: "user", content: userMessage });
    const connectorContext = await this.buildConnectorContext();
    const systemPrompt = this.getSystemPrompt() + connectorContext;
    let finalResponse = "";
    this.progressCallback?.({ round: 0, totalRounds: this.config.maxRounds, status: "thinking", message: "Starting AI response..." });
    for (let round = 0; round < this.config.maxRounds; round++) {
      console.log(`[AiAgent] Round ${round}/${this.config.maxRounds} start`);
      this.progressCallback?.({ round, totalRounds: this.config.maxRounds, status: "thinking", message: `Round ${round + 1} of ${this.config.maxRounds}` });
      const providerTools = toolRegistry.getOpenAISpecs();
      const response = await this.callLLM(systemPrompt, providerTools, round, this.config.maxRounds);
      if (!response?.choices?.[0]?.message) {
        console.log(`[AiAgent] Round ${round}: no response/choices`);
        const fallback = "I encountered an error connecting to the AI provider. Please check your provider settings and try again.";
        this.conversationHistory.push({ role: "assistant", content: fallback });
        this.progressCallback?.({ round, totalRounds: this.config.maxRounds, status: "error", message: "Failed to get AI response" });
        return fallback;
      }
      const message = response.choices[0].message;
      const toolCalls = message.tool_calls;
      if (!toolCalls || toolCalls.length === 0) {
        console.log(`[AiAgent] Round ${round}: no tool calls, content="${(message.content || "").slice(0, 80)}"`);
        this.conversationHistory.push({ role: "assistant", content: message.content || "" });
        finalResponse = message.content || "Done.";
        this.progressCallback?.({ round, totalRounds: this.config.maxRounds, status: "completed", message: "AI response generated" });
        break;
      }
      console.log(`[AiAgent] Round ${round}: ${toolCalls.length} tool call(s): ${toolCalls.map((tc) => tc.function.name).join(", ")}`);
      this.conversationHistory.push({
        role: "assistant",
        content: message.content || `[Using ${toolCalls.length} tool(s)...]`,
        toolCalls: toolCalls.map((tc) => ({
          id: tc.id,
          toolName: tc.function.name,
          args: JSON.parse(tc.function.arguments)
        }))
      });
      const batchLimit = Math.min(toolCalls.length, this.config.maxToolCallsPerRound);
      const results = [];
      for (let i = 0; i < batchLimit; i++) {
        const tc = toolCalls[i];
        const toolName = tc.function.name;
        let args;
        try {
          args = JSON.parse(tc.function.arguments);
        } catch {
          args = {};
        }
        this.progressCallback?.({ round, totalRounds: this.config.maxRounds, toolName, toolArgs: args, status: "executing", message: `Executing tool: ${toolName}` });
        const tool = toolRegistry.get(toolName);
        if (!tool) {
          console.log(`[AiAgent] Tool ${toolName}: NOT FOUND`);
          results.push({ toolCallId: tc.id, toolName, result: null, error: `Unknown tool: ${toolName}` });
          this.progressCallback?.({ round, totalRounds: this.config.maxRounds, toolName, toolArgs: args, status: "error", message: `Unknown tool: ${toolName}` });
          continue;
        }
        if (securityGuard.requiresConfirm(tool.securityLevel)) {
          console.log(`[AiAgent] Tool ${toolName}: waiting for confirm`);
          const confirmed = await this.requestConfirm(toolName, args);
          console.log(`[AiAgent] Tool ${toolName}: confirm=${confirmed}`);
          if (!confirmed) {
            results.push({ toolCallId: tc.id, toolName, result: null, error: "User declined confirmation" });
            this.progressCallback?.({ round, totalRounds: this.config.maxRounds, toolName, toolArgs: args, status: "error", message: "User declined confirmation" });
            continue;
          }
        }
        try {
          console.log(`[AiAgent] Tool ${toolName}: executing, args=${JSON.stringify(args)}`);
          const result = await toolRegistry.execute(toolName, args);
          console.log(`[AiAgent] Tool ${toolName}: completed, result type=${typeof result}`);
          results.push({ toolCallId: tc.id, toolName, result });
          this.progressCallback?.({ round, totalRounds: this.config.maxRounds, toolName, toolArgs: args, status: "completed", message: `Tool completed: ${toolName}` });
        } catch (err) {
          console.log(`[AiAgent] Tool ${toolName}: ERROR ${err.message}`);
          results.push({ toolCallId: tc.id, toolName, result: null, error: err.message });
          this.progressCallback?.({ round, totalRounds: this.config.maxRounds, toolName, toolArgs: args, status: "error", message: `Tool error: ${err.message}` });
        }
      }
      for (const r of results) {
        this.conversationHistory.push({
          role: "tool",
          content: r.error ? `Error: ${r.error}` : JSON.stringify(r.result).slice(0, 5e3),
          toolCallId: r.toolCallId,
          toolName: r.toolName
        });
      }
      console.log(`[AiAgent] Round ${round} end, historyLen=${this.conversationHistory.length}`);
    }
    console.log(`[AiAgent] processMessage done, finalResponse="${(finalResponse || "").slice(0, 80)}"`);
    return finalResponse || "I completed the operation but could not generate a summary.";
  }
  async callLLM(systemPrompt, tools, round = 0, totalRounds = 1, onChunk) {
    console.log("[AiAgent:callLLM] round=" + round + "/" + totalRounds + " historyLen=" + this.conversationHistory.length);
    const api2 = window.deskflowAPI;
    let preferredModel = "";
    let state = null;
    try {
      const aiConfig = await api2.getAiConfig();
      if (aiConfig?.briefModel) preferredModel = aiConfig.briefModel;
      state = await api2.getAiProviders();
    } catch (err) {
      console.warn("[AiAgent] Failed to load provider config, falling back to OpenRouter:", err);
    }
    if (!state) {
      state = {
        providers: [
          { id: "openrouter", templateId: "openrouter", label: "OpenRouter", enabled: true, apiKey: "", baseUrl: "", models: ["google/gemini-2.0-flash-001"], priority: 0 }
        ],
        routing: { default: { providerId: "openrouter", model: "" } }
      };
    }
    const enabled = state.providers.filter((p2) => p2.enabled);
    if (enabled.length === 0) throw new Error("No enabled AI providers");
    const defaultRoute = state.routing?.default;
    const target = defaultRoute?.providerId ? enabled.find((p2) => p2.id === defaultRoute.providerId) || enabled[0] : enabled[0];
    const model = preferredModel || defaultRoute?.model || target.models[0] || "gpt-3.5-turbo";
    const messages = [
      { role: "system", content: systemPrompt },
      ...this.convertToProviderMessages(this.conversationHistory)
    ];
    if (!api2.providerChatCall || !api2.onProviderChunk) {
      return await this.callLLMFallback(api2, target, model, messages, tools, round, totalRounds, onChunk);
    }
    return new Promise((resolve, reject) => {
      let fullContent = "";
      const streamedToolCalls = {};
      let cleanup = null;
      let timeout = null;
      cleanup = api2.onProviderChunk((data) => {
        if (data.error) {
          cleanup?.();
          if (timeout) clearTimeout(timeout);
          reject(new Error(data.error));
          return;
        }
        if (data.delta) {
          fullContent += data.delta;
          onChunk?.(data.delta);
          this.progressCallback?.({ round, totalRounds, status: "thinking", message: "Generating response...", streamedContent: fullContent });
        }
        if (data.done) {
          cleanup?.();
          if (timeout) clearTimeout(timeout);
          const toolCalls = Object.keys(streamedToolCalls).length > 0 ? Object.values(streamedToolCalls).filter((tc) => tc.id && tc.function.name) : void 0;
          console.log("[AiAgent:callLLM] done, contentLen=" + fullContent.length + " toolCalls=" + (toolCalls?.length || 0));
          resolve({
            choices: [{ message: { content: fullContent, ...toolCalls ? { tool_calls: toolCalls } : {} } }],
            usage: { prompt_tokens: 0, completion_tokens: fullContent.length > 0 ? Math.ceil(fullContent.length / 4) : 0 }
          });
        }
      });
      timeout = setTimeout(() => {
        cleanup?.();
        reject(new Error("Provider call timed out after 60s"));
      }, 6e4);
      api2.providerChatCall({ provider: target, messages, model, maxTokens: this.config.maxTokens, temperature: this.config.temperature }).catch((err) => {
        cleanup?.();
        if (timeout) clearTimeout(timeout);
        reject(err);
      });
    });
  }
  async callLLMFallback(api2, target, model, messages, tools, round, totalRounds, onChunk) {
    console.log("[AiAgent:callLLMFallback] using providerChatBasic");
    const result = await api2.providerChatBasic({ provider: target, messages, model, maxTokens: this.config.maxTokens, temperature: this.config.temperature });
    if (!result?.success) throw new Error(result?.error || "Provider call failed");
    const fullContent = result.content || "";
    if (onChunk) onChunk(fullContent);
    this.progressCallback?.({ round, totalRounds, status: "thinking", message: "Generating response...", streamedContent: fullContent });
    return {
      choices: [{ message: { content: fullContent } }],
      usage: { prompt_tokens: 0, completion_tokens: fullContent.length > 0 ? Math.ceil(fullContent.length / 4) : 0 }
    };
  }
  requestConfirm(toolName, args) {
    return new Promise((resolve) => {
      this.confirmQueue.push({ toolName, args, resolve });
    });
  }
  getPendingConfirm() {
    return this.confirmQueue.length > 0 ? this.confirmQueue[0] : null;
  }
  resolveConfirm(approved) {
    const item = this.confirmQueue.shift();
    if (item) item.resolve(approved);
  }
  get hasPendingConfirm() {
    return this.confirmQueue.length > 0;
  }
  convertToProviderMessages(history) {
    return history.map((msg) => {
      if (msg.role === "tool") {
        return {
          role: "tool",
          content: msg.content,
          tool_call_id: msg.toolCallId
        };
      }
      if (msg.role === "assistant" && msg.toolCalls) {
        return {
          role: "assistant",
          content: msg.content,
          tool_calls: msg.toolCalls.map((tc) => ({
            id: tc.id,
            type: "function",
            function: { name: tc.toolName, arguments: JSON.stringify(tc.args) }
          }))
        };
      }
      return { role: msg.role, content: msg.content };
    });
  }
  resetConversation() {
    this.conversationHistory = [];
    this.confirmQueue = [];
  }
};
var aiAgentService = new AiAgentService();

// src/components/AiChat/AiChat.tsx
import { useNavigate as useNavigate3 } from "react-router-dom";

// src/hooks/useVoiceInput.ts
import { useState as useState6, useRef as useRef4, useCallback as useCallback4, useEffect as useEffect3 } from "react";
function useVoiceInput({ onTranscript, silenceMs = 5e3 }) {
  const [state, setState] = useState6("idle");
  const [supported, setSupported] = useState6(true);
  const [interim, setInterim] = useState6("");
  const [error, setError] = useState6();
  const [countdownMs, setCountdownMs] = useState6(silenceMs);
  const recognitionRef = useRef4(null);
  const silenceTimerRef = useRef4(null);
  const countdownTimerRef = useRef4(null);
  const startedAtRef = useRef4(0);
  const clearTimers = useCallback4(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
  }, []);
  const resetSilenceTimer = useCallback4(() => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    setCountdownMs(silenceMs);
    silenceTimerRef.current = setTimeout(() => {
      recognitionRef.current?.stop();
    }, silenceMs);
  }, [silenceMs]);
  useEffect3(() => {
    const SR = window.webkitSpeechRecognition || window.SpeechRecognition;
    if (!SR) {
      setSupported(false);
      return;
    }
    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.onresult = (event) => {
      let interimStr = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (!result.isFinal) {
          interimStr += result[0].transcript;
        }
      }
      setInterim(interimStr);
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          setInterim("");
          onTranscript(result[0].transcript);
        }
      }
      resetSilenceTimer();
    };
    recognition.onerror = (event) => {
      setState("error");
      if (event.error === "not-allowed") setError("no-permission");
      else if (event.error === "no-speech") setError("no-speech");
      else if (event.error === "aborted") setError("aborted");
      else setError("unknown");
      clearTimers();
      setTimeout(() => {
        setState("idle");
        setError(void 0);
      }, 1200);
    };
    recognition.onend = () => {
      setState("idle");
      setInterim("");
      clearTimers();
    };
    recognitionRef.current = recognition;
    return () => {
      recognition.abort();
      clearTimers();
    };
  }, [onTranscript, resetSilenceTimer, clearTimers]);
  const start = useCallback4(() => {
    if (!recognitionRef.current || !supported) return;
    setInterim("");
    setError(void 0);
    setCountdownMs(silenceMs);
    setState("listening");
    startedAtRef.current = Date.now();
    try {
      recognitionRef.current.start();
    } catch {
      setState("idle");
      return;
    }
    resetSilenceTimer();
    countdownTimerRef.current = setInterval(() => {
      setCountdownMs((prev) => Math.max(0, prev - 100));
    }, 100);
  }, [supported, silenceMs, resetSilenceTimer]);
  const stop = useCallback4(() => {
    if (state === "listening") {
      setState("processing");
      setTimeout(() => {
        if (recognitionRef.current) recognitionRef.current.stop();
      }, 200);
    } else if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  }, [state]);
  useEffect3(() => {
    return () => clearTimers();
  }, [clearTimers]);
  return { supported, state, interim, error, start, stop, countdownMs };
}

// src/components/AiChat/AiChat.tsx
import { jsx as jsx29, jsxs as jsxs27 } from "react/jsx-runtime";
var idCounter = 0;
function nextId() {
  return `msg_${Date.now()}_${++idCounter}`;
}
var GREETING = `Hello! I'm your AI assistant. I can access your goals, projects, activities, sleep data, and more.

**Try asking me:**
- *What did I work on today?*
- *Show me my active projects*
- *How many goals did I complete this week?*
- *What's my sleep trend?*`;
function greetingMsg() {
  return { id: nextId(), role: "assistant", content: GREETING, parsed: parseStructuredResponse(GREETING), timestamp: Date.now() };
}
function badgeToProvider(badge) {
  if (!badge) return null;
  const parts = badge.label.split(" \xB7 ");
  return { label: parts[0], model: parts[1] ?? "", accent: "violet" };
}
var AiChat = ({ today: todayProp, onConfigure, providerBadge }) => {
  const today = todayProp ?? (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  const navigate = useNavigate3();
  const [messages, setMessages] = useState7([]);
  const [isLoaded, setIsLoaded] = useState7(false);
  const loadedRef = useRef5(false);
  const [isThinking, setIsThinking] = useState7(false);
  const [typingId, setTypingId] = useState7(null);
  const [progress, setProgress] = useState7(null);
  const [streamedContent, setStreamedContent] = useState7("");
  const bottomRef = useRef5(null);
  const toolsUsedRef = useRef5([]);
  const voice = useVoiceInput({
    onTranscript: (t) => {
    }
  });
  const handleTypingDone = useCallback5(() => setTypingId(null), []);
  useEffect4(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    const api2 = window.electronAPI;
    if (!api2?.aiChatLoad) {
      setIsLoaded(true);
      setMessages([greetingMsg()]);
      return;
    }
    api2.aiChatLoad(today).then((result) => {
      if (result.success && result.messages?.length > 0) {
        const msgs = result.messages.map((r) => ({
          id: `msg_${r.id}`,
          role: r.role,
          content: r.content,
          parsed: r.parsed_json ? JSON.parse(r.parsed_json) : parseStructuredResponse(r.content),
          timestamp: new Date(r.created_at).getTime()
        }));
        setMessages(msgs);
      } else {
        setMessages([greetingMsg()]);
      }
      setIsLoaded(true);
    }).catch(() => {
      setMessages([greetingMsg()]);
      setIsLoaded(true);
    });
  }, [today]);
  useEffect4(() => {
    if (!isLoaded) return;
    const api2 = window.electronAPI;
    if (!api2?.aiChatSave) return;
    const payload = messages.map((m) => ({
      role: m.role,
      content: m.content,
      parsed_json: JSON.stringify(m.parsed),
      timestamp: m.timestamp
    }));
    api2.aiChatSave({ threadDate: today, messages: payload }).catch(() => {
    });
  }, [today, messages, isLoaded]);
  useEffect4(() => {
    aiAgentService.setProgressCallback((progressData) => {
      setProgress(progressData);
      if (progressData.streamedContent) {
        setStreamedContent(progressData.streamedContent);
      }
    });
    return () => {
      aiAgentService.clearProgressCallback();
    };
  }, []);
  const addMessage = useCallback5((role, content) => {
    const parsed = parseStructuredResponse(content);
    const msg = { id: nextId(), role, content, parsed, timestamp: Date.now() };
    setMessages((prev) => [...prev, msg]);
    return msg;
  }, []);
  const handleSend = useCallback5(async (text) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const pendingConfirm2 = aiAgentService.getPendingConfirm();
    if (pendingConfirm2) {
      const confirmed = /^(yes|yeah|confirm|go ahead|do it|sure|ok|okay)$/i.test(trimmed);
      const cancelled = /^(no|nope|cancel|never mind|stop|don't|dont)$/i.test(trimmed);
      if (cancelled) {
        aiAgentService.resolveConfirm(false);
        addMessage("assistant", "Cancelled.");
        setIsThinking(false);
        setProgress(null);
        setStreamedContent("");
        return;
      }
      if (confirmed) {
        addMessage("user", trimmed);
        aiAgentService.resolveConfirm(true);
        return;
      }
    }
    if (isThinking) return;
    addMessage("user", trimmed);
    setIsThinking(true);
    setProgress({ round: 0, totalRounds: aiAgentService.getConfig().maxRounds, status: "thinking", message: "Starting AI response..." });
    try {
      const response = await aiAgentService.processMessage(trimmed);
      setStreamedContent("");
      const msg = addMessage("assistant", response);
      setTypingId(msg.id);
    } catch (err) {
      setStreamedContent("");
      const msg = err instanceof Error ? err.message : "Something went wrong.";
      addMessage("assistant", `[type: error]
[message: ${msg}]`);
    }
    setIsThinking(false);
    setProgress(null);
  }, [isThinking, addMessage]);
  const handleReset = useCallback5(() => {
    aiAgentService.resetConversation();
    setMessages([greetingMsg()]);
    const api2 = window.electronAPI;
    if (api2?.aiChatReset) {
      api2.aiChatReset(today).catch(() => {
      });
    }
    toolsUsedRef.current = [];
    setStreamedContent("");
  }, [today]);
  const handleSuggestion = useCallback5((text) => {
    handleSend(text);
  }, [handleSend]);
  const status = isThinking ? "thinking" : "ready";
  const provider = badgeToProvider(providerBadge);
  const pendingConfirm = aiAgentService.getPendingConfirm();
  const isEmpty = !isThinking && messages.length === 0 && isLoaded;
  return /* @__PURE__ */ jsxs27("div", { className: "flex flex-col h-full", children: [
    /* @__PURE__ */ jsx29(
      ChatHeader,
      {
        status,
        provider,
        onReset: handleReset,
        onConfigure: onConfigure ?? (() => {
        }),
        messageCount: messages.length
      }
    ),
    isEmpty ? /* @__PURE__ */ jsx29(ChatEmptyState, { onPick: handleSuggestion }) : /* @__PURE__ */ jsxs27(MessageList, { children: [
      messages.map((msg) => {
        const isTyping = msg.id === typingId;
        return /* @__PURE__ */ jsx29(MessageBubble, { role: msg.role, timestamp: msg.timestamp, content: msg.content, children: msg.role === "assistant" && isTyping ? /* @__PURE__ */ jsx29(
          TypewriterText,
          {
            nodes: msg.parsed.nodes,
            refs: msg.parsed.refs,
            onDone: handleTypingDone
          }
        ) : /* @__PURE__ */ jsx29(
          BlockRenderer,
          {
            nodes: msg.parsed.nodes,
            refs: msg.parsed.refs,
            onNavigate: (page, section, tab) => navigateTo({ route: page, section, tab }, navigate)
          }
        ) }, msg.id);
      }),
      /* @__PURE__ */ jsx29(AnimatePresence3, { children: isThinking && /* @__PURE__ */ jsx29(MessageBubble, { role: "assistant", children: streamedContent ? /* @__PURE__ */ jsxs27("div", { className: "text-sm text-zinc-100 whitespace-pre-wrap", children: [
        /* @__PURE__ */ jsx29(
          BlockRenderer,
          {
            nodes: parseStructuredResponse(streamedContent).nodes,
            refs: {},
            onNavigate: (page, section, tab) => navigateTo({ route: page, section, tab }, navigate)
          }
        ),
        /* @__PURE__ */ jsx29("span", { className: "inline-block w-[2px] h-[1em] -mb-[2px] bg-pink-400 ml-0.5 align-baseline animate-pulse" })
      ] }) : /* @__PURE__ */ jsx29(ThinkingIndicator, {}) }, "thinking") }),
      pendingConfirm && !isThinking && /* @__PURE__ */ jsx29(MessageBubble, { role: "assistant", content: pendingConfirm.toolName, children: /* @__PURE__ */ jsxs27("span", { className: "text-sm text-zinc-200", children: [
        "Do you want to ",
        pendingConfirm.toolName,
        '? Reply "yes" to confirm or "no" to cancel.'
      ] }) }, "confirm")
    ] }),
    /* @__PURE__ */ jsx29(AnimatePresence3, { children: progress && /* @__PURE__ */ jsx29(
      AgentProgressBar,
      {
        round: progress.round,
        totalRounds: progress.totalRounds,
        toolName: progress.toolName,
        status: progress.status,
        message: progress.message
      }
    ) }),
    /* @__PURE__ */ jsx29(
      ChatInput,
      {
        onSend: handleSend,
        disabled: isThinking || typingId !== null,
        placeholder: pendingConfirm ? "Reply yes or no\u2026" : "Ask about goals, projects, activities\u2026",
        voice
      }
    )
  ] });
};
export {
  AiChat
};
