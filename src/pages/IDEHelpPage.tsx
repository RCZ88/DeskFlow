import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Monitor,
  Code2,
  Terminal,
  GitBranch,
  Package,
  Cpu,
  Database,
  Cloud,
  Plus,
  Trash2,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Sparkles,
  GitCommit,
  Layers,
  Boxes,
  Zap,
  Users,
  Clock,
  Activity,
  TrendingUp,
  ExternalLink,
  HelpCircle,
  FolderOpen,
  Settings,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  TrendingDown,
  DollarSign,
  BookOpen,
  Rocket,
  Target,
  Layers as LayersIcon,
  Wrench,
  Gauge,
  FileCode,
  Server,
  Search,
  FolderTree,
  Link2,
  Bot,
  HardDrive,
  Layout,
  Grid3X3,
  List,
  ChevronLeft,
  Keyboard,
} from 'lucide-react';
import { PageShell } from '../components/PageShell';
import { GlassCard } from '../components/GlassCard';
import { SectionHeader } from '../components/SectionHeader';

interface HelpItem {
  id: string;
  title: string;
  description: string;
  icon: any;
  category: 'basics' | 'features' | 'ai' | 'projects' | 'metrics' | 'troubleshooting';
  details?: string[];
}

const HELP_ITEMS: HelpItem[] = [
  {
    id: 'what-is',
    title: 'What is IDE Projects?',
    description: 'IDE Projects is a comprehensive project and developer tool tracking system that helps you manage your development environment, track AI agent usage, and monitor project metrics.',
    icon: Monitor,
    category: 'basics',
  },
  {
    id: 'detection',
    title: 'IDE Auto-Detection',
    description: 'Automatically detects installed IDEs like VS Code, JetBrains (IntelliJ, PyCharm, WebStorm, etc.), Android Studio, and more.',
    icon: Search,
    category: 'basics',
    details: [
      'VS Code: Scans for code.exe in common locations',
      'JetBrains: Uses "where" command to find installations',
      'Android Studio: Checks standard installation paths',
      'Antigravity: Detects via environment variables',
    ],
  },
  {
    id: 'tool-scanning',
    title: 'Development Tool Scanning',
    description: 'Automatically scans for and identifies development tools in your system.',
    icon: Wrench,
    category: 'basics',
    details: [
      'Version Control: Git, GitHub CLI',
      'Runtimes: Node.js, Python, Java, Go, Rust',
      'Package Managers: npm, pnpm, yarn, pip, cargo',
      'Containers: Docker, Kubernetes',
      'Build Tools: Vite, Webpack, Gradle, Maven',
      'Databases: MySQL, PostgreSQL, MongoDB',
      'Cloud Tools: AWS, Azure, GCP CLIs',
    ],
  },
  {
    id: 'project-tracking',
    title: 'Project Tracking',
    description: 'Add and track your development projects with their details and associated tools.',
    icon: FolderTree,
    category: 'projects',
    details: [
      'Click "Add Project" to register a new project',
      'Select your default IDE for the project',
      'Specify the primary programming language',
      'Optionally add repository URL (GitHub, GitLab)',
    ],
  },
  {
    id: 'ai-agents',
    title: 'AI Agent Integration',
    description: 'Track usage from AI coding assistants like Claude Code, Cursor, OpenCode, Gemini CLI, and more.',
    icon: Bot,
    category: 'ai',
    details: [
      'Claude Code: Monitors ~/.claude/projects',
      'Cursor: Reads VS Code globalStorage',
      'OpenCode: Parses opencode.db SQLite',
      'Gemini CLI: Watches ~/.gemini/tmp and history',
      'Aider: Tracks ~/.oobo/aider-analytics.jsonl',
    ],
  },
  {
    id: 'ai-usage',
    title: 'AI Usage Metrics',
    description: 'View detailed AI agent usage including tokens, cost, and session data.',
    icon: Gauge,
    category: 'ai',
    details: [
      'Total tokens used (input/output)',
      'Estimated cost in USD',
      'Sessions count per tool',
      'Model breakdown',
      'Daily/weekly/monthly periods',
    ],
  },
  {
    id: 'git-metrics',
    title: 'Git & Commit Metrics',
    description: 'Track local and remote Git commit history with DORA metrics.',
    icon: GitCommit,
    category: 'metrics',
    details: [
      'Local commits: Scans .git directories',
      'GitHub commits: Requires repository URL + optional token',
      'DORA metrics: Deployment frequency, lead time, MTTR, change failure rate',
      'Contributor stats: Author breakdown',
    ],
  },
  {
    id: 'terminal-integration',
    title: 'Terminal Window',
    description: 'Integrated tiling terminal for running AI agents directly in DeskFlow.',
    icon: Terminal,
    category: 'features',
    details: [
      'xterm.js-based terminal emulator',
      'Node-pty for actual shell process',
      'Recursive split layouts (horizontal/vertical)',
      'Spawn named terminals with tracking',
    ],
  },
  {
    id: 'keyboard-shortcuts',
    title: 'Keyboard Shortcuts',
    description: 'Quick actions and navigation within IDE Projects.',
    icon: Keyboard,
    category: 'troubleshooting',
    details: [
      'Arrow keys: Navigate project list',
      'Enter: Open selected project',
      'Esc: Close modals',
      'Ctrl+A: Add new project',
      'Ctrl+R: Refresh data',
    ],
  },
  {
    id: 'common-issues',
    title: 'Common Issues & Solutions',
    description: 'Troubleshooting tips for common problems.',
    icon: AlertCircle,
    category: 'troubleshooting',
    details: [
      'IDE not detected: Try clicking "Scan Tools" button',
      'AI usage showing zero: Ensure agents have been run at least once',
      'Git metrics empty: Add repository URL in project settings',
      'Slow loading: Large projects may take time to scan',
    ],
  },
];

const CATEGORY_CONFIG = {
  basics: { label: 'Getting Started', icon: Rocket, color: 'text-blue-400' },
  features: { label: 'Features', icon: Sparkles, color: 'text-purple-400' },
  ai: { label: 'AI Agents', icon: Bot, color: 'text-cyan-400' },
  projects: { label: 'Projects', icon: FolderTree, color: 'text-green-400' },
  metrics: { label: 'Metrics', icon: Gauge, color: 'text-orange-400' },
  troubleshooting: { label: 'Troubleshooting', icon: Wrench, color: 'text-red-400' },
};

export default function IDEHelpPage() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        window.history.back();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const filteredItems = selectedCategory
    ? HELP_ITEMS.filter((item) => item.category === selectedCategory)
    : HELP_ITEMS;

  return (
    <PageShell page="ide" variant="default">
      <SectionHeader title="IDE Projects Help" icon={<BookOpen className="w-5 h-5" />} />

      <div className="flex gap-4 mb-6 flex-wrap">
        <button
          onClick={() => setSelectedCategory(null)}
          className={`px-4 py-2 rounded-xl text-sm transition ${
            !selectedCategory
              ? 'bg-indigo-600 text-white'
              : 'bg-zinc-800 text-zinc-400 hover:text-white'
          }`}
        >
          All Topics
        </button>
        {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
          <button
            key={key}
            onClick={() => setSelectedCategory(key)}
            className={`px-4 py-2 rounded-xl text-sm transition flex items-center gap-2 ${
              selectedCategory === key
                ? 'bg-indigo-600 text-white'
                : 'bg-zinc-800 text-zinc-400 hover:text-white'
            }`}
          >
            <config.icon className={`w-4 h-4 ${config.color}`} />
            {config.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto space-y-3">
        {filteredItems.map((item) => (
          <GlassCard key={item.id} variant="interactive" className="overflow-hidden p-0">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <button
                onClick={() => setExpandedItem(expandedItem === item.id ? null : item.id)}
                className="w-full p-4 flex items-start gap-4 text-left hover:bg-zinc-800/30 transition-colors"
              >
                <div className={`p-2 rounded-lg bg-zinc-800 ${item.category === 'ai' ? 'text-cyan-400' : item.category === 'troubleshooting' ? 'text-red-400' : 'text-indigo-400'}`}>
                  <item.icon className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium">{item.title}</h3>
                    {expandedItem === item.id ? (
                      <ChevronDown className="w-4 h-4 text-zinc-500" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-zinc-500" />
                    )}
                  </div>
                  <p className="text-zinc-400 text-sm">{item.description}</p>
                </div>
              </button>

              <AnimatePresence>
                {expandedItem === item.id && item.details && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-t border-zinc-800"
                  >
                    <div className="p-4 pt-2 space-y-2">
                      {item.details.map((detail, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-sm">
                          <div className="w-1.5 h-1.5 rounded-full bg-zinc-600 mt-1.5 flex-shrink-0" />
                          <span className="text-zinc-300">{detail}</span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </GlassCard>
        ))}
      </div>

      <div className="mt-6 pt-6 border-t border-zinc-800">
        <div className="flex items-center gap-4 text-sm text-zinc-500">
          <HelpCircle className="w-4 h-4" />
          <span>Press Esc to close this help panel</span>
        </div>
      </div>
    </PageShell>
  );
}
