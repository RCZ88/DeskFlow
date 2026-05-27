import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home, BarChart3, Globe, Moon, Terminal, BookOpen, Sparkles,
  AlertTriangle, Palette, Network, Database, Activity, Settings,
  HelpCircle, ChevronRight, Check, RotateCcw, ArrowLeft, ArrowRight,
  Zap, ExternalLink, Trophy, X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import TutorialOverlay from '../components/TutorialOverlay';

interface Feature {
  id: string;
  name: string;
  icon: any;
  category: string;
  status: 'released' | 'beta' | 'planned';
  description: string;
  route: string;
  tutorialSteps: TutorialStep[];
}

interface TutorialStep {
  target: string;
  title: string;
  instruction: string;
  position: 'top' | 'bottom' | 'left' | 'right' | 'center';
}

const FEATURES: Feature[] = [
  {
    id: 'dashboard', name: 'Dashboard', icon: Home, category: 'Core', status: 'released',
    description: 'Activity heatmap, weekly overview, daily stats, and 3D planet visualization of your app usage.',
    route: '/',
    tutorialSteps: [
      { target: '[data-tutorial="heatmap"]', title: 'Activity Heatmap', instruction: 'This heatmap shows your daily activity intensity. Darker cells = more tracked time.', position: 'bottom' },
      { target: '[data-tutorial="weekly"]', title: 'Weekly Overview', instruction: 'See your top apps and total hours for the current week at a glance.', position: 'bottom' },
      { target: '[data-tutorial="planets"]', title: '3D Orbit System', instruction: 'Each planet represents a tracked app. Size = time spent. Click to explore!', position: 'center' },
    ],
  },
  {
    id: 'orbit', name: '3D Orbit Visualization', icon: Activity, category: 'Core', status: 'released',
    description: 'Interactive Three.js solar system where planets represent your apps, scaled by usage time.',
    route: '/',
    tutorialSteps: [
      { target: '[data-tutorial="planets"]', title: 'Planet Navigation', instruction: 'Scroll to zoom, drag to rotate. Click a planet to see app details.', position: 'center' },
    ],
  },
  {
    id: 'stats', name: 'Usage Statistics', icon: BarChart3, category: 'Core', status: 'released',
    description: 'Detailed breakdowns of app usage by category, time period, and productivity type.',
    route: '/stats',
    tutorialSteps: [
      { target: '[data-tutorial="period-selector"]', title: 'Time Period', instruction: 'Switch between day, week, and month views.', position: 'bottom' },
    ],
  },
  {
    id: 'external', name: 'External Tracker', icon: Moon, category: 'Core', status: 'released',
    description: 'Manual activity logging, sleep tracking with timeline chart, and focus timer.',
    route: '/external',
    tutorialSteps: [
      { target: '[data-tutorial="sleep-chart"]', title: 'Sleep Timeline', instruction: '24-hour bar view of your sleep patterns. Color-coded by sleep segment.', position: 'top' },
      { target: '[data-tutorial="timer"]', title: 'Focus Timer', instruction: 'Start a focus session timer. Tracks time and category.', position: 'top' },
    ],
  },
  {
    id: 'terminal', name: 'Terminal & Agent Sessions', icon: Terminal, category: 'Tracker Mind', status: 'released',
    description: 'AI agent terminal with split panes, session management, and real-time context assembly.',
    route: '/ide',
    tutorialSteps: [
      { target: '[data-tutorial="terminal-pane"]', title: 'Terminal Pane', instruction: 'Type commands or let the AI agent work. Split panes for multitasking.', position: 'right' },
      { target: '[data-tutorial="new-agent"]', title: 'New Agent Session', instruction: 'Click "New Agent" to start an AI session with context from your workspace.', position: 'bottom' },
    ],
  },
  {
    id: 'context', name: 'Context Management', icon: BookOpen, category: 'Tracker Mind', status: 'released',
    description: '12 context systems that assemble knowledge into AI prompts: LLM Wiki, Skills, Graphify, PARA, QMD, and more.',
    route: '/ide',
    tutorialSteps: [
      { target: '[data-tutorial="context-tab"]', title: 'Context Sidebar', instruction: 'Open the Context tab in the workspace sidebar to configure all context systems.', position: 'right' },
    ],
  },
  {
    id: 'problems', name: 'Problems & Requests', icon: AlertTriangle, category: 'Tracker Mind', status: 'released',
    description: 'Track bugs, feature requests, and their checklists. AI agents can auto-update status.',
    route: '/ide',
    tutorialSteps: [
      { target: '[data-tutorial="problems-tab"]', title: 'Problems Panel', instruction: 'Create, track, and assign problems to AI agents for resolution.', position: 'right' },
    ],
  },
  {
    id: 'design', name: 'Design Skills System', icon: Palette, category: 'Tracker Mind', status: 'beta',
    description: 'Frontend design intelligence with taste knobs, style references, and 5 design skills.',
    route: '/ide',
    tutorialSteps: [
      { target: '[data-tutorial="context-tab"]', title: 'Design Configuration', instruction: 'Open Context → Design to adjust taste knobs and toggle design skills.', position: 'right' },
    ],
  },
  {
    id: 'skills', name: 'Skills Framework', icon: Sparkles, category: 'Tracker Mind', status: 'released',
    description: 'SKILL.md files define reusable agent behaviors. Browse, create, and compose skills.',
    route: '/ide',
    tutorialSteps: [
      { target: '[data-tutorial="skills-tab"]', title: 'Skills Browser', instruction: 'View and manage all skill definitions. Toggle them for context assembly.', position: 'right' },
    ],
  },
  {
    id: 'graphify', name: 'Knowledge Graph', icon: Network, category: 'Tracker Mind', status: 'beta',
    description: 'Automated knowledge graph construction from agent conversations and workspace files.',
    route: '/ide',
    tutorialSteps: [],
  },
  {
    id: 'database', name: 'Database Analytics', icon: Database, category: 'Data', status: 'released',
    description: 'Analytics dashboard with charts for tokens, costs, sessions, problems, and daily activity trends.',
    route: '/database',
    tutorialSteps: [
      { target: '[data-tutorial="analytics-toggle"]', title: 'Analytics View', instruction: 'Switch between Analytics charts and raw Tables browser.', position: 'bottom' },
    ],
  },
  {
    id: 'settings', name: 'Settings', icon: Settings, category: 'Core', status: 'released',
    description: 'App tracking categories, tracker configuration, external page setup, and preferences.',
    route: '/settings',
    tutorialSteps: [],
  },
];

const CATEGORIES = ['All', 'Core', 'Tracker Mind', 'Data'] as const;

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  released: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', label: 'Released' },
  beta: { bg: 'bg-amber-500/10', text: 'text-amber-400', label: 'Beta' },
  planned: { bg: 'bg-zinc-500/10', text: 'text-zinc-400', label: 'Planned' },
};

const CATEGORY_COLORS: Record<string, string> = {
  Core: 'from-emerald-500/20 to-emerald-500/5',
  'Tracker Mind': 'from-purple-500/20 to-purple-500/5',
  Data: 'from-blue-500/20 to-blue-500/5',
};

const PROGRESS_KEY = 'tutorial-progress';

interface TutorialProgress {
  viewedFeatures: string[];
  completedAt: string | null;
}

function loadProgress(): TutorialProgress {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { viewedFeatures: [], completedAt: null };
}

function saveProgress(progress: TutorialProgress) {
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
}

export default function TutorialPage() {
  const navigate = useNavigate();
  const [progress, setProgress] = useState<TutorialProgress>(loadProgress);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [activeFeature, setActiveFeature] = useState<Feature | null>(null);
  const [activeStep, setActiveStep] = useState(0);
  const [showOverlay, setShowOverlay] = useState(false);

  const filteredFeatures = selectedCategory === 'All'
    ? FEATURES : FEATURES.filter((f) => f.category === selectedCategory);

  const viewedCount = progress.viewedFeatures.length;
  const totalWithSteps = FEATURES.filter((f) => f.tutorialSteps.length > 0).length;
  const isAllComplete = totalWithSteps > 0 && viewedCount >= totalWithSteps;

  const startTutorial = useCallback((feature: Feature) => {
    if (feature.tutorialSteps.length === 0) return;
    setActiveFeature(feature);
    setActiveStep(0);
    setShowOverlay(true);
  }, []);

  const nextStep = useCallback(() => {
    if (!activeFeature) return;
    if (activeStep < activeFeature.tutorialSteps.length - 1) {
      setActiveStep((s) => s + 1);
    } else {
      setProgress((prev) => {
        const updated = {
          ...prev,
          viewedFeatures: prev.viewedFeatures.includes(activeFeature.id)
            ? prev.viewedFeatures : [...prev.viewedFeatures, activeFeature.id],
        };
        saveProgress(updated);
        return updated;
      });
      setShowOverlay(false);
      setActiveFeature(null);
    }
  }, [activeFeature, activeStep]);

  const prevStep = useCallback(() => {
    if (activeStep > 0) setActiveStep((s) => s - 1);
  }, [activeStep]);

  const closeTutorial = useCallback(() => {
    setShowOverlay(false);
    setActiveFeature(null);
  }, []);

  const tryFeature = useCallback((feature: Feature) => {
    setProgress((prev) => {
      const updated = {
        ...prev,
        viewedFeatures: prev.viewedFeatures.includes(feature.id)
          ? prev.viewedFeatures : [...prev.viewedFeatures, feature.id],
      };
      saveProgress(updated);
      return updated;
    });
    navigate(feature.route);
  }, [navigate]);

  const resetProgress = useCallback(() => {
    const cleared: TutorialProgress = { viewedFeatures: [], completedAt: null };
    saveProgress(cleared);
    setProgress(cleared);
  }, []);

  const currentStep = activeFeature?.tutorialSteps[activeStep];

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      <div className="flex-shrink-0 border-b border-zinc-800/60 bg-zinc-950/80 backdrop-blur-xl">
        <div className="px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <HelpCircle className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-white">Features & Tutorial</h1>
              <p className="text-xs text-zinc-500">
                {isAllComplete ? 'All tutorials completed!' : `${viewedCount}/${totalWithSteps} features toured`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-32 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${totalWithSteps > 0 ? (viewedCount / totalWithSteps) * 100 : 0}%` }} />
            </div>
            {viewedCount > 0 && (
              <button onClick={resetProgress}
                className="text-[10px] text-zinc-600 hover:text-zinc-400 flex items-center gap-1 transition-colors">
                <RotateCcw className="w-3 h-3" />
                Reset
              </button>
            )}
          </div>
        </div>

        <div className="px-6 pb-3 flex gap-1">
          {CATEGORIES.map((cat) => (
            <button key={cat} onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                selectedCategory === cat
                  ? 'bg-zinc-700/60 text-zinc-200'
                  : 'text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800/40'
              }`}>{cat}</button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {isAllComplete && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            className="glass rounded-2xl p-6 text-center mb-6 border border-emerald-500/20">
            <Trophy className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
            <h2 className="text-base font-semibold text-white mb-1">You've completed all tutorials!</h2>
            <p className="text-xs text-zinc-500 mb-3">You're now familiar with all of DeskFlow's features.</p>
            <button onClick={resetProgress}
              className="px-3 py-1.5 rounded-lg bg-zinc-700/50 border border-zinc-600/50 text-xs text-zinc-300 hover:bg-zinc-600/50 transition-colors inline-flex items-center gap-1.5">
              <RotateCcw className="w-3 h-3" />
              Restart tutorials
            </button>
          </motion.div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredFeatures.map((feature, i) => {
            const isViewed = progress.viewedFeatures.includes(feature.id);
            const status = STATUS_STYLES[feature.status];
            const gradientClass = CATEGORY_COLORS[feature.category] || 'from-zinc-500/20 to-zinc-500/5';
            return (
              <motion.div key={feature.id}
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04, duration: 0.2 }}
                className="glass rounded-2xl overflow-hidden border border-zinc-700/30 hover:border-zinc-600/50 transition-all group">
                <div className={`h-1 bg-gradient-to-r ${gradientClass}`} />
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${gradientClass} flex items-center justify-center`}>
                        <feature.icon className="w-4 h-4 text-zinc-300" />
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-white">{feature.name}</h3>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${status.bg} ${status.text}`}>{status.label}</span>
                      </div>
                    </div>
                    {isViewed && (
                      <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center">
                        <Check className="w-3 h-3 text-emerald-400" />
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-zinc-500 leading-relaxed mb-3">{feature.description}</p>
                  <div className="flex items-center gap-2">
                    {feature.tutorialSteps.length > 0 && (
                      <button onClick={() => startTutorial(feature)}
                        className="flex-1 px-2.5 py-1.5 rounded-lg bg-zinc-700/40 border border-zinc-600/30 text-[11px] text-zinc-300 hover:bg-zinc-600/40 transition-colors flex items-center justify-center gap-1.5">
                        <Zap className="w-3 h-3 text-amber-400" />
                        Tutorial <span className="text-zinc-600">({feature.tutorialSteps.length})</span>
                      </button>
                    )}
                    <button onClick={() => tryFeature(feature)}
                      className="flex-1 px-2.5 py-1.5 rounded-lg bg-zinc-800/60 border border-zinc-700/30 text-[11px] text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/40 transition-colors flex items-center justify-center gap-1.5">
                      <ExternalLink className="w-3 h-3" />
                      Try it
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      <TutorialOverlay
        isVisible={showOverlay}
        step={currentStep || null}
        stepIndex={activeStep}
        totalSteps={activeFeature?.tutorialSteps.length || 0}
        featureName={activeFeature?.name || ''}
        onNext={nextStep}
        onPrev={prevStep}
        onClose={closeTutorial}
        onTryIt={() => activeFeature && tryFeature(activeFeature)}
      />
    </div>
  );
}
