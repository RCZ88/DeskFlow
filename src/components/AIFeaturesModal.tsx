import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Database, Edit3, Clock, FolderKanban, Sliders, ShieldOff,
  Sparkles, Target, BarChart3, Moon, GitCommit, Globe, AppWindow,
  CheckSquare, PlusCircle, PlayCircle, RefreshCw,
  MessageSquare, Zap, Bot, X, ChevronDown
} from 'lucide-react';

interface Feature {
  icon: typeof Bot;
  title: string;
  description: string;
  details: string[];
}

interface CapabilityGroup {
  icon: typeof Bot;
  title: string;
  color: string;
  features: Feature[];
}

const groups: CapabilityGroup[] = [
  {
    icon: Database,
    title: 'Read Data',
    color: 'from-blue-500 to-cyan-400',
    features: [
      {
        icon: Target,
        title: 'Goals & Projects',
        description: 'Retrieve your goals, projects, and activities on demand',
        details: [
          'List daily goals and long-term objectives',
          'View project details, activity breakdowns, and stats',
          'Check sleep data, trends, and patterns',
        ],
      },
      {
        icon: BarChart3,
        title: 'Statistics & Trends',
        description: 'Get insights into your tracked data',
        details: [
          'View commit statistics and project health scores',
          'See browser and app category breakdowns',
          'Analyze productivity trends over time',
        ],
      },
      {
        icon: Globe,
        title: 'Settings & Config',
        description: 'Check your current configuration',
        details: [
          'View productivity tier assignments for apps and domains',
          'Check recording modes and preferences',
          'Inspect category and tier configurations',
        ],
      },
    ],
  },
  {
    icon: Edit3,
    title: 'Create & Update',
    color: 'from-emerald-500 to-teal-400',
    features: [
      {
        icon: CheckSquare,
        title: 'Daily Goals',
        description: 'Add or modify your daily and long-term goals',
        details: [
          'Create new daily goals with targets',
          'Edit existing goals and mark progress',
          'Set long-term objectives and track milestones',
        ],
      },
      {
        icon: FolderKanban,
        title: 'Projects',
        description: 'Create and manage projects',
        details: [
          'Create new projects with descriptions',
          'Update project details and metadata',
          'Manage problems and issues for projects',
        ],
      },
      {
        icon: PlusCircle,
        title: 'External Activities',
        description: 'Log activities outside your computer',
        details: [
          'Add workouts, meetings, reading sessions',
          'Categorize activities with tiers (productive/neutral/distracting)',
          'Manual time entries for anything you did off-screen',
        ],
      },
    ],
  },
  {
    icon: Clock,
    title: 'Track Time',
    color: 'from-violet-500 to-purple-400',
    features: [
      {
        icon: PlayCircle,
        title: 'Start/Stop Tracking',
        description: 'Control activity tracking sessions',
        details: [
          'Start tracking a new activity or project',
          'Stop active tracking sessions',
          'Switch between activities seamlessly',
        ],
      },
      {
        icon: Moon,
        title: 'Sleep & Breaks',
        description: 'Log rest periods',
        details: [
          'Manually log sleep entries with start/end times',
          'Log breaks and personal time',
          'View sleep quality trends',
        ],
      },
      {
        icon: RefreshCw,
        title: 'Manual Time Entry',
        description: 'Add time to past activities',
        details: [
          'Add time retroactively to any activity',
          'Adjust durations for incorrectly tracked sessions',
          'Backfill missed tracking periods',
        ],
      },
    ],
  },
  {
    icon: FolderKanban,
    title: 'Manage Projects',
    color: 'from-amber-500 to-orange-400',
    features: [
      {
        icon: PlusCircle,
        title: 'Full CRUD',
        description: 'Complete project lifecycle management',
        details: [
          'Create, update, delete, and restore projects',
          'Open projects directly in your IDE (VS Code, etc.)',
          'Track commit history and calculate health scores',
        ],
      },
      {
        icon: GitCommit,
        title: 'Git & Health',
        description: 'Codebase insights',
        details: [
          'View commit stats per project',
          'Calculate project health based on activity',
          'Identify stale or neglected projects',
        ],
      },
      {
        icon: 'Trash2' as any,
        title: 'Problem Management',
        description: 'Track issues within projects',
        details: [
          'Add problems/issues to projects',
          'Update status and priority of issues',
          'Track resolution progress',
        ],
      },
    ],
  },
  {
    icon: Sliders,
    title: 'Configure',
    color: 'from-pink-500 to-rose-400',
    features: [
      {
        icon: AppWindow,
        title: 'App Tiers',
        description: 'Set productivity classifications',
        details: [
          'Mark apps as productive, neutral, or distracting',
          'Configure domain-level productivity tiers',
          'Bulk-categorize by patterns',
        ],
      },
      {
        icon: Globe,
        title: 'Recording Modes',
        description: 'Control what gets tracked',
        details: [
          'Set browser recording mode (always/never/smart)',
          'Configure app recording mode',
          'Adjust category assignments and preferences',
        ],
      },
      {
        icon: Sparkles,
        title: 'Preferences',
        description: 'Personalize your tracker',
        details: [
          'Set timer behavior and display preferences',
          'Configure notification settings',
          'Adjust any user-facing configuration',
        ],
      },
    ],
  },
];

function FeatureCard({ feature, index }: { feature: Feature; index: number }) {
  const [expanded, setExpanded] = useState(false);

  const IconComponent = feature.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.25 }}
      className="group"
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left"
      >
        <div className="relative p-3 rounded-lg bg-zinc-800/50 border border-zinc-700/40 hover:border-zinc-600/50 transition-all duration-150 hover:bg-zinc-800/70">
          <div className="flex items-start gap-2.5">
            <div className="shrink-0 w-7 h-7 rounded-md bg-zinc-700/60 flex items-center justify-center">
              <IconComponent className="w-3.5 h-3.5 text-zinc-300" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-medium text-xs text-zinc-200">{feature.title}</div>
              <div className="text-[11px] text-zinc-500 mt-0.5">{feature.description}</div>
            </div>
            <ChevronDown className={`shrink-0 w-3.5 h-3.5 text-zinc-600 mt-0.5 transition-transform duration-150 ${expanded ? 'rotate-180' : ''}`} />
          </div>

          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="overflow-hidden"
            >
              <div className="mt-2 pt-2 border-t border-zinc-700/40 space-y-1">
                {feature.details.map((detail, i) => (
                  <div key={i} className="flex items-start gap-2 text-[11px] text-zinc-400">
                    <div className="shrink-0 w-1 h-1 rounded-full bg-zinc-600 mt-1.5" />
                    <span>{detail}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      </button>
    </motion.div>
  );
}

interface AIFeaturesModalProps {
  open: boolean;
  onClose: () => void;
}

export function AIFeaturesModal({ open, onClose }: AIFeaturesModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[80]"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="w-full max-w-2xl mx-4 max-h-[85vh] bg-zinc-950 border border-zinc-800/60 rounded-2xl shadow-2xl shadow-black/50 flex flex-col overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-800/60 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-zinc-100">AI Assistant Capabilities</h2>
                  <p className="text-[11px] text-zinc-500">Everything your AI can do for you</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-7 h-7 rounded-md bg-zinc-800/60 hover:bg-zinc-700/60 flex items-center justify-center transition-colors"
              >
                <X className="w-3.5 h-3.5 text-zinc-400" />
              </button>
            </div>

            {/* Quick tags */}
            <div className="flex items-center gap-1.5 px-5 py-2 border-b border-zinc-800/40 shrink-0 bg-zinc-900/30">
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20">
                <MessageSquare className="w-2.5 h-2.5 text-emerald-400" />
                <span className="text-[10px] text-emerald-300">Ask naturally</span>
              </div>
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/20">
                <Zap className="w-2.5 h-2.5 text-blue-400" />
                <span className="text-[10px] text-blue-300">Real-time data</span>
              </div>
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-violet-500/10 border border-violet-500/20">
                <Sparkles className="w-2.5 h-2.5 text-violet-400" />
                <span className="text-[10px] text-violet-300">Proactive suggestions</span>
              </div>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {groups.map((group, gi) => (
                <motion.div
                  key={group.title}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 + gi * 0.06, duration: 0.25 }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`shrink-0 w-6 h-6 rounded-md bg-gradient-to-br ${group.color} flex items-center justify-center`}>
                      <group.icon className="w-3 h-3 text-white" />
                    </div>
                    <h3 className="text-xs font-semibold text-zinc-300">{group.title}</h3>
                  </div>
                  <div className="grid gap-1.5">
                    {group.features.map((feature, fi) => (
                      <FeatureCard key={feature.title} feature={feature} index={fi + gi * 10} />
                    ))}
                  </div>
                </motion.div>
              ))}

              {/* Limitations */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.25 }}
                className="mt-2 p-3 rounded-lg bg-rose-500/5 border border-rose-500/15"
              >
                <div className="flex items-start gap-2">
                  <ShieldOff className="shrink-0 w-3.5 h-3.5 text-rose-400 mt-0.5" />
                  <div>
                    <div className="text-xs font-medium text-rose-300">Limitations</div>
                    <ul className="mt-1 space-y-0.5">
                      {[
                        'Cannot run shell commands or modify app files',
                        'Cannot change security settings',
                        'Cannot access files outside the app data scope',
                      ].map((item, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-[11px] text-zinc-500">
                          <div className="shrink-0 w-1 h-1 rounded-full bg-zinc-700 mt-1" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Footer */}
            <div className="px-5 py-2 border-t border-zinc-800/40 shrink-0 bg-zinc-900/20">
              <p className="text-[10px] text-zinc-600 text-center">
                Just type what you need in natural language — I'll figure out the rest.
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
