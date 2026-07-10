import { AnimatePresence, motion } from 'framer-motion';
import { MOTION } from './tokens';

type ViewState<T> =
  | { status: 'loading' }
  | { status: 'empty' }
  | { status: 'error'; message: string; retry: () => void }
  | { status: 'ready'; data: T };

interface StateShellProps<T> {
  state: ViewState<T>;
  skeleton: React.ReactNode;
  empty: React.ReactNode;
  children: (data: T) => React.ReactNode;
}

function StateShellInner<T>({ state, skeleton, empty, children }: StateShellProps<T>) {
  switch (state.status) {
    case 'loading':
      return <>{skeleton}</>;
    case 'empty':
      return <>{empty}</>;
    case 'ready':
      return <>{children(state.data)}</>;
    case 'error':
      return (
        <div className="flex flex-col items-center justify-center py-8 text-center px-4">
          <div className="h-10 w-10 rounded-xl bg-red-500/10 ring-1 ring-red-500/20 grid place-items-center mb-3">
            <svg className="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-sm text-zinc-400 max-w-[280px]">{state.message}</p>
          <button
            onClick={state.retry}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium
              bg-zinc-900 text-zinc-300 ring-1 ring-zinc-800 hover:bg-zinc-800 hover:text-zinc-100 transition-colors"
          >
            Retry
          </button>
        </div>
      );
  }
}

export function StateShell<T>(props: StateShellProps<T>) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={props.state.status}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: MOTION.fast }}
      >
        <StateShellInner {...props} />
      </motion.div>
    </AnimatePresence>
  );
}

export type { ViewState };
