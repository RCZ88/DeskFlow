import { motion } from 'framer-motion';
import { BookOpen, Wand2, FileUp, ClipboardPaste, Compass, Copy, Check, Layers } from 'lucide-react';
import { useState, useCallback } from 'react';
import { BlurFade } from '../ui/blur-fade';
import { BookOpening } from './BookOpening';

const api = (window as any).deskflowAPI;

export interface WelcomeEmptyStateProps {
  onCompose: () => void;
  onTryExample: () => void;
  onImport: () => void;
  onPaste: () => void;
  onBrowse?: () => void;
  onShowcase?: () => void;
}

interface QuickAction {
  key: string;
  icon: typeof Wand2;
  title: string;
  body: string;
  run: (p: WelcomeEmptyStateProps, setCopied?: (v: boolean) => void) => void;
}

const ACTIONS: QuickAction[] = [
  {
    key: 'example',
    icon: Compass,
    title: 'Open a sample',
    body: 'Study a finished, grounded lesson to see the format in action.',
    run: (p) => p.onTryExample(),
  },
  {
    key: 'import',
    icon: FileUp,
    title: 'Import a file',
    body: 'Bring in a .lmd or .ldoc you already have on disk.',
    run: (p) => p.onImport(),
  },
  {
    key: 'paste',
    icon: ClipboardPaste,
    title: 'Paste a draft',
    body: 'Drop in Lesson Markdown and we compile it for you.',
    run: (p) => p.onPaste(),
  },
];

export function WelcomeEmptyState(props: WelcomeEmptyStateProps) {
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  const handleCopyPrompt = useCallback(async () => {
    try {
      const result = await api.learnGetLessonSystemPrompt();
      if (result.ok && result.data) {
        await navigator.clipboard.writeText(result.data);
        setCopiedPrompt(true);
        setTimeout(() => setCopiedPrompt(false), 2500);
      }
    } catch (e) {
      console.error('[Welcome] Failed to copy prompt:', e);
    }
  }, []);

  return (
    <div
      className="lyceum-welcome relative flex min-h-full w-full items-center justify-center overflow-hidden px-6 py-16"
      data-page="learn"
    >
      {/* warm ambient wash */}
      <div className="lyceum-welcome-glow pointer-events-none absolute inset-0" aria-hidden />

      <div className="relative mx-auto grid w-full max-w-5xl items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
        {/* Left: the invitation */}
        <div>
          <BlurFade inView>
            <span className="inline-flex items-center gap-2 rounded-full border border-clay-400/30 bg-clay-500/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.28em] text-clay-300">
              <BookOpen className="h-3 w-3" />
              Lyceum Learn
            </span>
          </BlurFade>

          <BlurFade delay={0.08} inView>
            <h1 className="mt-5 font-serif text-5xl font-semibold leading-[1.05] text-glow">
              A library that
              <br />
              writes itself.
            </h1>
          </BlurFade>

          <BlurFade delay={0.16} inView>
            <p className="mt-5 max-w-md text-[15px] leading-relaxed text-zinc-400">
              Compose a grounded, citation-backed lesson on anything you want to understand.
              Describe a topic and Lyceum drafts the concepts, diagrams, and quizzes — every
              claim tied to a source.
            </p>
          </BlurFade>

          <BlurFade delay={0.24} inView>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <button
                onClick={props.onCompose}
                className="inline-flex items-center gap-2 rounded-xl border border-clay-400/40 bg-clay-500/15 px-6 py-3 font-serif text-sm font-semibold text-glow transition-all hover:bg-clay-500/25 hover:shadow-[0_0_20px_rgba(194,85,58,0.25)]"
              >
                <Wand2 className="h-4 w-4" />
                Compose a lesson
              </button>
              <button
                onClick={props.onTryExample}
                className="font-mono text-[11px] uppercase tracking-[0.2em] text-zinc-400 underline-offset-4 transition-colors hover:text-glow hover:underline"
              >
                or read a sample first
              </button>
              {props.onBrowse && (
                <button
                  onClick={props.onBrowse}
                  className="font-mono text-[11px] uppercase tracking-[0.2em] text-zinc-500 underline-offset-4 transition-colors hover:text-glow hover:underline"
                >
                  or browse your library &rarr;
                </button>
              )}
              {props.onShowcase && (
                <button
                  onClick={props.onShowcase}
                  className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.2em] text-amber-400/70 underline-offset-4 transition-colors hover:text-amber-300 hover:underline"
                >
                  <Layers className="w-3 h-3" />
                  explore all features
                </button>
              )}
            </div>
          </BlurFade>
        </div>

        {/* Right: animated book opening */}
        <BlurFade delay={0.2} direction="up" inView>
          <div className="relative mx-auto w-fit">
            <BookOpening />
          </div>
        </BlurFade>
      </div>

      {/* Quick actions */}
      <div className="absolute inset-x-0 bottom-0 mx-auto max-w-5xl px-6 pb-10">
        <BlurFade delay={0.32} inView>
          <div className="grid gap-3 sm:grid-cols-4">
            {ACTIONS.map((a) => {
              const Icon = a.icon;
              return (
                <button
                  key={a.key}
                  onClick={() => a.run(props)}
                  className="group rounded-xl border border-white/10 bg-white/[0.02] p-4 text-left transition-colors hover:border-clay-400/40 hover:bg-clay-500/[0.06]"
                >
                  <Icon className="h-4 w-4 text-clay-300 transition-transform group-hover:scale-110" />
                  <p className="mt-2 font-serif text-[15px] font-semibold text-glow">{a.title}</p>
                  <p className="mt-1 text-[12px] leading-relaxed text-zinc-500">{a.body}</p>
                </button>
              );
            })}
            {/* Copy Lesson Prompt — standalone, no topic input needed */}
            <button
              onClick={handleCopyPrompt}
              className="group rounded-xl border border-dashed border-amber-500/30 bg-amber-500/[0.04] p-4 text-left transition-colors hover:border-amber-500/50 hover:bg-amber-500/[0.08]"
            >
              {copiedPrompt ? (
                <Check className="h-4 w-4 text-emerald-400" />
              ) : (
                <Copy className="h-4 w-4 text-amber-400 transition-transform group-hover:scale-110" />
              )}
              <p className="mt-2 font-serif text-[15px] font-semibold text-glow">
                {copiedPrompt ? 'Copied!' : 'Copy Lesson Prompt'}
              </p>
              <p className="mt-1 text-[12px] leading-relaxed text-zinc-500">
                {copiedPrompt
                  ? 'Paste into any AI chat to start generating .ldoc lessons'
                  : 'System prompt for any AI — paste into ChatGPT, Claude, etc.'}
              </p>
            </button>
          </div>
        </BlurFade>
      </div>
    </div>
  );
}
