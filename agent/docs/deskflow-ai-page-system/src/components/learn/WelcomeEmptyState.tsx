import { motion } from 'framer-motion';
import { BookOpen, Wand2, FileUp, ClipboardPaste, Compass } from 'lucide-react';
import { BlurFade } from '../ui/blur-fade';
import { BorderBeam } from '../ui/border-beam';

export interface WelcomeEmptyStateProps {
  onCompose: () => void;
  onTryExample: () => void;
  onImport: () => void;
  onPaste: () => void;
  onBrowse?: () => void;
}

interface QuickAction {
  key: string;
  icon: typeof Wand2;
  title: string;
  body: string;
  run: (p: WelcomeEmptyStateProps) => void;
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

const float = {
  rest: { y: 0, rotateZ: -3 },
  hover: { y: -6, rotateZ: -3 },
};
const floatSpring = { type: 'spring' as const, stiffness: 260, damping: 22 };

export function WelcomeEmptyState(props: WelcomeEmptyStateProps) {
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
            </div>
          </BlurFade>
        </div>

        {/* Right: a single hero book on a stand */}
        <BlurFade delay={0.2} direction="up" inView>
          <div className="relative mx-auto w-fit">
            <motion.div
              initial="rest"
              animate="rest"
              whileHover="hover"
              variants={float}
              transition={floatSpring}
              className="lyceum-book-cloth relative flex h-[300px] w-[220px] flex-col justify-between rounded-r-lg rounded-l-sm p-6"
              style={heroCover}
            >
              <BorderBeam colorFrom="#f3d9a4" colorTo="#c2553a" />
              <span className="pointer-events-none absolute inset-y-0 left-0 w-3 rounded-l-sm bg-black/30" />
              <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-amber-200/80">
                Volume I
              </span>
              <h2 className="font-serif text-2xl font-semibold leading-tight text-[#fdf3df]">
                The Art of
                <br />
                Understanding
              </h2>
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-amber-200/60">
                Lyceum Press
              </span>
            </motion.div>
            {/* book stand shadow */}
            <div className="lyceum-book-shadow mx-auto mt-3 h-4 w-[80%] rounded-[50%]" />
          </div>
        </BlurFade>
      </div>

      {/* Quick actions */}
      <div className="absolute inset-x-0 bottom-0 mx-auto max-w-5xl px-6 pb-10">
        <BlurFade delay={0.32} inView>
          <div className="grid gap-3 sm:grid-cols-3">
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
          </div>
        </BlurFade>
      </div>
    </div>
  );
}

const heroCover = {
  background: 'linear-gradient(150deg, #c2553a 0%, #8f3a25 100%)',
  boxShadow:
    'inset 0 0 0 1px rgba(255,255,255,0.07), inset -16px 0 26px -20px rgba(0,0,0,0.6), 0 30px 60px -28px rgba(0,0,0,0.7)',
};
