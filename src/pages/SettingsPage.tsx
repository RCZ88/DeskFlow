import { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { 
  Settings, Database, Clock, Download, Trash2, RefreshCw, Terminal,
  ChevronRight, X, Plus, GripVertical, Palette, Check, ChevronDown, Globe,
  ChevronLeft, Search, AlertTriangle, Sparkles, ChevronUp,
  Eye, EyeOff
} from 'lucide-react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { DEFAULT_SYSTEM_PROMPT } from '../lib/defaults';
import { PageShell } from '../components/PageShell';
import { GlassCard } from '../components/GlassCard';
import { SectionHeader } from '../components/SectionHeader';

interface SettingsPageProps {
  logs: any[];
  appStats: any[];
  storageStatus: {
    type: string;
    working: boolean;
    path: string;
    error?: string;
    logCount: number;
  };
  idleThreshold: number;
  setIdleThreshold: (val: number) => void;
  autoExport: boolean;
  setAutoExport: (val: boolean) => void;
  onClearData: () => void;
  onExportData: (format: 'csv' | 'json') => void;
  onViewDatabase: () => void;
  onRegisterSave: (fn: () => void) => void;
  onRequestNavigate: (path: string, hasUnsaved: boolean) => void;
  onHasChangesChange: (hasChanges: boolean) => void;
  onReloadData: () => void;
  onCategoryOverridesChange?: (overrides: Record<string, string>) => void;
  appColors?: Record<string, string>;
  setAppColors?: (colors: Record<string, string>) => void;
  categoryOrder?: string[];
  setCategoryOrder?: (order: string[]) => void;
  autoStartEnabled?: boolean;
  setAutoStartEnabled?: (enabled: boolean) => void;
  timerBehavior?: { neutralAction: 'pause' | 'reset' | 'ignore'; distractingAction: 'pause' | 'reset' | 'ignore' };
  setTimerBehavior?: (behavior: { neutralAction: 'pause' | 'reset' | 'ignore'; distractingAction: 'pause' | 'reset' | 'ignore' }) => void;
  trackerAppMode?: 'show-other' | 'pause' | 'track';
  setTrackerAppMode?: (mode: 'show-other' | 'pause' | 'track') => void;
  externalActivities?: { id: number; name: string; type: string; is_productive: boolean }[];
  externalActivityTiers?: Record<number, string>;
  onExternalActivityTiersChange?: (tiers: Record<number, string>) => void;
}

type AnimationSpeed = 'slow' | 'normal' | 'instant';

const DEFAULT_CATEGORIES = [
  'IDE', 'AI Tools', 'Browser', 'Entertainment', 'Communication',
  'Design', 'Productivity', 'Tools', 'Education', 'Developer Tools',
  'Search Engine', 'News', 'Shopping', 'Social Media', 'Uncategorized', 'Other'
];

const DEFAULT_TIER_ASSIGNMENTS = {
  productive: ['IDE', 'AI Tools', 'Developer Tools', 'Education', 'Productivity', 'Tools'],
  neutral: ['Communication', 'Design', 'Search Engine', 'News', 'Uncategorized', 'Other'],
  distracting: ['Entertainment', 'Social Media', 'Shopping', 'Gaming']
};

const CATEGORY_COLORS: Record<string, string> = {
  'IDE': '#6366f1',
  'AI Tools': '#8b5cf6',
  'Browser': '#3b82f6',
  'Entertainment': '#ec4899',
  'Communication': '#14b8a6',
  'Design': '#a855f7',
  'Productivity': '#10b981',
  'Tools': '#f59e0b',
  'Other': '#64748b',
};

const ANIMATION_DURATIONS: Record<AnimationSpeed, number> = {
  slow: 2500,
  normal: 1200,
  instant: 0,
};

// Preset colors for quick selection
const PRESET_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e', '#10b981',
  '#14b8a6', '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7',
  '#ec4899', '#f43f5e', '#64748b', '#78716c',
];

// Custom color picker component with preset swatches - simplified circle design
function ColorPicker({ value, onChange, size = 'md' }: { value: string; onChange: (color: string) => void; size?: 'sm' | 'md' }) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('[data-color-picker-overlay]')) return;
      if (ref.current && !ref.current.contains(target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen]);

  const sizeClass = size === 'sm' ? 'w-16 h-3' : 'w-20 h-4';

  return (
    <>
      <div ref={ref} className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`${sizeClass} rounded cursor-pointer border-2 border-zinc-600 hover:border-zinc-400 transition-colors duration-150 hover:scale-110 shadow-md`}
          style={{ backgroundColor: value, borderRadius: '4px' }}
          title="Click to change color"
        />
      </div>
      {isOpen && createPortal(
        <div
          data-color-picker-overlay
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 2147483647,
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setIsOpen(false); }}
        >
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
            }}
            className="p-4 bg-zinc-900 border border-zinc-700 rounded-xl w-52"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-zinc-300">Pick a color</span>
              <button
                onClick={() => setIsOpen(false)}
                className="text-zinc-500 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-5 gap-2 mb-3">
              {PRESET_COLORS.slice(0, 15).map((color) => (
                <button
                  key={color}
                  onClick={() => { onChange(color); setIsOpen(false); }}
                  className={`w-7 h-7 rounded-full hover:scale-110 transition-transform ${value === color ? 'ring-2 ring-white ring-offset-2 ring-offset-zinc-900' : ''}`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
            <div className="flex items-center gap-2 pt-3 border-t border-zinc-700">
              <input
                type="color"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-8 h-8 rounded cursor-pointer bg-transparent border-0"
              />
              <span className="text-xs text-zinc-400 font-mono">{value}</span>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

// Sortable category chip using dnd-kit
function SortableChip({ 
  id, 
  color,
  onRemove,
}: { 
  id: string; 
  color: string;
  onRemove?: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={{ ...style, backgroundColor: `${color}15`, borderColor: `${color}50`, color: color }}
      {...attributes}
      {...listeners}
      className="px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 border cursor-grab active:cursor-grabbing hover:scale-105 transition-transform select-none"
    >
      <GripVertical className="w-3 h-3 opacity-50" />
      <span>{id}</span>
      {onRemove && (
        <button 
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="ml-1 hover:opacity-70 transition-opacity"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}

// Tier container with droppable zone
import { useDroppable } from '@dnd-kit/core';

function TierContainer({ 
  tier, 
  color, 
  label,
  description,
  creditLabel,
  children
}: { 
  tier: 'productive' | 'neutral' | 'distracting';
  color: string;
  label: string;
  description: string;
  creditLabel: string;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: tier });
  const tierColor = tier === 'productive' ? '#22c55e' : tier === 'neutral' ? '#3b82f6' : '#ef4444';
  
  return (
    <div 
      ref={setNodeRef}
      className={`p-4 rounded-xl border transition-colors duration-150 ${
        isOver ? 'border-2 border-solid' : ''
      } ${
        tier === 'productive' 
          ? 'bg-gradient-to-br from-emerald-500/10 to-transparent border-emerald-500/20'
          : tier === 'neutral'
            ? 'bg-gradient-to-br from-blue-500/10 to-transparent border-blue-500/20'
            : 'bg-gradient-to-br from-red-500/10 to-transparent border-red-500/20'
      }`}
      style={isOver ? { borderColor: tierColor, borderWidth: 2 } : undefined}
    >
      <div className="flex items-center gap-3 mb-4">
        <div 
          className="w-4 h-4 rounded-full"
          style={{ 
            background: `linear-gradient(135deg, ${tierColor} 0%, ${tierColor}88 100%)`,
            boxShadow: `0 0 10px ${tierColor}50`
          }}
        />
        <div>
          <h3 className="font-semibold" style={{ color: tierColor }}>{label}</h3>
          <span className="text-xs text-zinc-500">{creditLabel}</span>
        </div>
      </div>
      <p className="text-xs text-zinc-500 mb-3">{description}</p>
      <div className="flex flex-wrap gap-2 min-h-[48px]">
        {children}
      </div>
    </div>
  );
}

export default function SettingsPage({
  logs = [],
  appStats = [],
  storageStatus = { type: 'none', working: false, path: '', logCount: 0 },
  idleThreshold = 5,
  setIdleThreshold = () => {},
  autoExport = false,
  setAutoExport = () => {},
  onClearData,
  onExportData,
  onViewDatabase,
  onRegisterSave,
  onRequestNavigate,
  onHasChangesChange,
  onReloadData,
  appColors = {},
  setAppColors,
  categoryOrder = DEFAULT_CATEGORIES.slice(0, 9),
  setCategoryOrder,
  autoStartEnabled: autoStartEnabledProp = false,
  setAutoStartEnabled: setAutoStartEnabledProp = () => {},
  timerBehavior: timerBehaviorProp = { neutralAction: 'pause', distractingAction: 'reset' },
  setTimerBehavior: setTimerBehaviorProp = () => {},
  trackerAppMode: trackerAppModeProp = 'track',
  setTrackerAppMode: setTrackerAppModeProp = () => {},
  externalActivities = [],
  externalActivityTiers: externalActivityTiersProp = {},
  onExternalActivityTiersChange,
}: Partial<SettingsPageProps> & { onRegisterSave: (fn: () => void) => void; onReloadData?: () => void }) {
  const [activeTab, setActiveTab] = useState<'category' | 'colors' | 'general' | 'tracking' | 'prompts'>(() => {
    const saved = localStorage.getItem('settings-activeTab');
    return (saved as any) || 'category';
  });
  const [tierAssignments, setTierAssignments] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('deskflow-tier-assignments');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch { /* ignore */ }
      }
    }
    return DEFAULT_TIER_ASSIGNMENTS;
  });
  const [hasChanges, setHasChanges] = useState(false);
  const [localAppColors, setLocalAppColors] = useState<Record<string, string>>(() => {
    // Load from localStorage first (in case Settings saved colors while app was closed)
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('deskflow-planet-colors');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch { /* ignore */ }
      }
    }
    // Fallback to prop
    return appColors;
  });
  const [localCategoryOrder, setLocalCategoryOrder] = useState<string[]>(categoryOrder);
  const [autoStartEnabled, setAutoStartEnabled] = useState(autoStartEnabledProp);
  const [localTimerBehavior, setLocalTimerBehavior] = useState(timerBehaviorProp);
  const [trackerAppMode, setTrackerAppMode] = useState(trackerAppModeProp);
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [localExternalTiers, setLocalExternalTiers] = useState<Record<number, string>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('deskflow-external-activity-tiers');
      if (saved) {
        try { return JSON.parse(saved); } catch { /* ignore */ }
      }
    }
    return externalActivityTiersProp;
  });
  
  const allCategories = useMemo(() => [...DEFAULT_CATEGORIES, ...customCategories], [customCategories]);
  
  // Sync tracker app mode from props when they change
  useEffect(() => {
    if (trackerAppModeProp !== trackerAppMode) {
      setTrackerAppMode(trackerAppModeProp);
    }
  }, [trackerAppModeProp]);
  
  // Drag-and-drop state for dnd-kit
  const [activeId, setActiveId] = useState<string | null>(null);
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 3,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Find which tier a category belongs to
  const findTier = (id: string): 'productive' | 'neutral' | 'distracting' | null => {
    if (tierAssignments.productive.includes(id)) return 'productive';
    if (tierAssignments.neutral.includes(id)) return 'neutral';
    if (tierAssignments.distracting.includes(id)) return 'distracting';
    return null;
  };

  // Handle drag start
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  // Handle drag end
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Determine source and destination tiers
    const sourceTier = findTier(activeId);
    
    // Check if overId is a tier name or a category
    let destTier: 'productive' | 'neutral' | 'distracting' | null = null;
    
    if (overId === 'productive' || overId === 'neutral' || overId === 'distracting') {
      destTier = overId;
    } else {
      destTier = findTier(overId);
    }

    if (!sourceTier || !destTier || sourceTier === destTier) return;

    // Move category from source to destination
    setTierAssignments(prev => {
      const newTiers = { ...prev };
      // Remove from source
      newTiers[sourceTier] = newTiers[sourceTier].filter(c => c !== activeId);
      // Add to destination
      newTiers[destTier] = [...newTiers[destTier], activeId];
      return newTiers;
    });
    setHasChanges(true);
    onHasChangesChange(true);
  };

const [animationSpeed, setAnimationSpeed] = useState<AnimationSpeed>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('deskflow-animation-speed') as AnimationSpeed) || 'normal';
    }
    return 'normal';
  });
  const [appCategoryOverrides, setAppCategoryOverrides] = useState<Record<string, string>>({});
  const [domainCategoryOverrides, setDomainCategoryOverrides] = useState<Record<string, string>>({});

  // Load overrides from BOTH localStorage AND categoryConfig on mount
  useEffect(() => {
    const loadOverrides = async () => {
      const overrides: Record<string, string> = {};
      const domainOverrides: Record<string, string> = {};
      
      // First load from localStorage
      if (typeof window !== 'undefined') {
        try {
          const saved = localStorage.getItem('deskflow-app-category-overrides');
          if (saved) Object.assign(overrides, JSON.parse(saved));
        } catch { /* ignore */ }
        try {
          const saved = localStorage.getItem('deskflow-domain-category-overrides');
          if (saved) Object.assign(domainOverrides, JSON.parse(saved));
        } catch { /* ignore */ }
      }
      
      // Also load from categoryConfig (for persistence across app restarts)
      if (window.deskflowAPI?.getCategoryConfig) {
        try {
          const config = await window.deskflowAPI.getCategoryConfig();
          // Merge appCategoryMap into overrides
          if (config?.appCategoryMap) {
            Object.assign(overrides, config.appCategoryMap);
          }
          if (config?.domainCategoryMap) {
            Object.assign(domainOverrides, config.domainCategoryMap);
          }
          // Load keyword rules
          if (config?.domainKeywordRules) {
            setDomainKeywords(config.domainKeywordRules);
          }
          if (config?.domainDefaultCategories) {
            setDomainDefaultCategories(config.domainDefaultCategories);
          }
          // Load custom categories
          if (config?.customCategories) {
            setCustomCategories(config.customCategories);
          }
        } catch { /* ignore */ }
      }
      
      // Load tier assignments from backend (ensures custom categories are in tiers)
      if (window.deskflowAPI?.getTierAssignments) {
        try {
          const backendTiers = await window.deskflowAPI.getTierAssignments();
          if (backendTiers) {
            setTierAssignments(prev => {
              const merged = {
                productive: [...new Set([...prev.productive, ...(backendTiers.productive || [])])],
                neutral: [...new Set([...prev.neutral, ...(backendTiers.neutral || [])])],
                distracting: [...new Set([...prev.distracting, ...(backendTiers.distracting || [])])],
              };
              return merged;
            });
          }
        } catch { /* ignore */ }
      }
       
      // Load keyword-enabled domains and their keyword sets
      if (window.deskflowAPI?.getKeywordEnabledDomains) {
        try {
          const domains = await window.deskflowAPI.getKeywordEnabledDomains();
          setKeywordEnabledDomains(domains);
          
// Load keyword sets for each domain
          const keywordSetsMap: Record<string, { category: string; keywords: string[] }[]> = {};
          for (const domain of domains) {
            if (window.deskflowAPI?.getDomainKeywordRules) {
              const rules = await window.deskflowAPI.getDomainKeywordRules(domain);
              if (rules && rules.length > 0) {
                keywordSetsMap[domain] = rules;
              }
            }
          }
          setDomainKeywordSets(keywordSetsMap);
        } catch { /* ignore */ }
      }

      // Load AI config & interest topics
      if (window.deskflowAPI?.getAiConfig) {
        try {
          const config = await window.deskflowAPI.getAiConfig();
          if (config) {
            setAiConfig(prev => ({ ...prev, ...config }));
          }
        } catch { /* ignore */ }
      }
      if (window.deskflowAPI?.getInterestTopics) {
        try {
          const topics = await window.deskflowAPI.getInterestTopics();
          if (topics?.length > 0) setInterestTopics(topics);
        } catch { /* ignore */ }
      }
          // Load OpenRouter API key from preferences
      if (window.deskflowAPI?.getPreferences) {
        try {
          const prefs = await window.deskflowAPI.getPreferences();
          if (prefs?.openrouterApiKey) {
            // Strip any quotes that might have been saved
            const cleanKey = prefs.openrouterApiKey.trim().replace(/^["']|["']$/g, '');
            setOpenRouterApiKey(cleanKey);
          }
          if (prefs?.filterTransientApps !== undefined) {
            setFilterTransientApps(prefs.filterTransientApps);
          }
          if (prefs?.promptHistoryLimit !== undefined) {
            setPromptHistoryLimit(prefs.promptHistoryLimit);
          }
        } catch { /* ignore */ }
      }
      
      setAppCategoryOverrides(overrides);
      setDomainCategoryOverrides(domainOverrides);
    };
    loadOverrides();
  }, []);
  const [dataSyncMode, setDataSyncMode] = useState<'forward' | 'refactor'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('deskflow-data-sync-mode');
      if (saved === 'refactor' || saved === 'forward') return saved;
    }
    return 'forward';
  });
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [syncMessage, setSyncMessage] = useState('');

  // Save dataSyncMode when it changes
  useEffect(() => {
    localStorage.setItem('deskflow-data-sync-mode', dataSyncMode);
  }, [dataSyncMode]);

  // Auto-refactor when category overrides change (if dataSyncMode is 'refactor')
  useEffect(() => {
    if (dataSyncMode === 'refactor' && syncStatus === 'idle' && (Object.keys(appCategoryOverrides).length > 0 || Object.keys(domainCategoryOverrides).length > 0)) {
      // Only auto-refactor if we've already loaded overrides (not on initial mount)
      if (hasInitiallyLoadedRef.current) {
        console.log('[Settings] Auto-refactoring due to category override change...');
        performRefactor();
      } else {
        hasInitiallyLoadedRef.current = true;
      }
    }
  }, [appCategoryOverrides, domainCategoryOverrides, dataSyncMode]);

  const hasInitiallyLoadedRef = useRef(false);

  const performRefactor = async () => {
    if (!window.deskflowAPI?.updateCategoriesFromOverrides) {
      setSyncStatus('error');
      setSyncMessage('Database sync not available');
      return;
    }
    setSyncStatus('syncing');
    setSyncMessage('Syncing categories to database...');
    try {
      const appOverrides: Record<string, string> = {};
      const domainOverrides: Record<string, string> = {};
      
      for (const [app, category] of Object.entries(appCategoryOverrides)) {
        appOverrides[app.toLowerCase()] = category;
      }
      for (const [domain, category] of Object.entries(domainCategoryOverrides)) {
        domainOverrides[domain.toLowerCase()] = category;
      }
      
      const result = await window.deskflowAPI.updateCategoriesFromOverrides(appOverrides, domainOverrides);
      if (result.success) {
        setSyncStatus('success');
        setSyncMessage(`Updated ${result.updatedCount} rows`);
        if (onReloadData) {
          setTimeout(() => onReloadData(), 500);
        }
        setTimeout(() => {
          setSyncStatus('idle');
          setSyncMessage('');
        }, 3000);
      } else {
        setSyncStatus('error');
        setSyncMessage(result.error || 'Sync failed');
      }
    } catch (err) {
      setSyncStatus('error');
      setSyncMessage('Sync error: ' + (err as Error).message);
    }
  };

  useEffect(() => {
    if (dataSyncMode === 'refactor' && syncStatus === 'idle') {
      performRefactor();
    }
  }, [dataSyncMode]);

  const getAssignedCategories = () => {
    return new Set([
      ...tierAssignments.productive,
      ...tierAssignments.neutral,
      ...tierAssignments.distracting
    ]);
  };

  const removeCategoryFromTier = (tier: 'productive' | 'neutral' | 'distracting', category: string) => {
    setTierAssignments(prev => ({
      ...prev,
      [tier]: prev[tier].filter(c => c !== category)
    }));
    setHasChanges(true);
    onHasChangesChange(true);
  };

  const getUnassignedCategories = () => {
    const assigned = getAssignedCategories();
    return allCategories.filter(cat => !assigned.has(cat));
  };

  const handleAddCategory = async () => {
    const name = newCategoryName.trim();
    if (!name) return;
    if (allCategories.includes(name)) return;
    if (window.deskflowAPI?.addCategory) {
      await window.deskflowAPI.addCategory(name);
    }
    setCustomCategories(prev => [...prev, name]);
    setTierAssignments(prev => ({
      ...prev,
      neutral: [...prev.neutral, name]
    }));
    setNewCategoryName('');
    setHasChanges(true);
    onHasChangesChange(true);
  };

  const saveChanges = async () => {
    if (window.deskflowAPI?.setTierAssignments) {
      await window.deskflowAPI.setTierAssignments(tierAssignments);
      console.log('[Settings] Saved tier assignments:', tierAssignments);
    }
    localStorage.setItem('deskflow-tier-assignments', JSON.stringify(tierAssignments));
    // Always save colors to localStorage (even if parent doesn't provide setter)
    localStorage.setItem('deskflow-planet-colors', JSON.stringify(localAppColors));
    if (setAppColors) {
      setAppColors(localAppColors);
    }
    if (setCategoryOrder) {
      setCategoryOrder(localCategoryOrder);
      localStorage.setItem('deskflow-category-order', JSON.stringify(localCategoryOrder));
    }
    localStorage.setItem('deskflow-app-category-overrides', JSON.stringify(appCategoryOverrides));
    localStorage.setItem('deskflow-domain-category-overrides', JSON.stringify(domainCategoryOverrides));
    localStorage.setItem('deskflow-animation-speed', animationSpeed);
    
    // Save tracker app mode to preferences
    if (window.deskflowAPI?.setPreference) {
      await window.deskflowAPI.setPreference('trackerAppMode', trackerAppMode);
    }
    
    // Save OpenRouter API key to preferences (strip quotes)
    if (openRouterApiKey && window.deskflowAPI?.setPreference) {
      const cleanKey = openRouterApiKey.trim().replace(/^["']|["']$/g, '');
      await window.deskflowAPI.setPreference('openrouterApiKey', cleanKey);
    }
    
    // Save AI config
    if (window.deskflowAPI?.saveAiConfig) {
      const cleanKey = openRouterApiKey.trim().replace(/^["']|["']$/g, '');
      await window.deskflowAPI.saveAiConfig({ ...aiConfig, apiKey: cleanKey });
    }
    
    // Notify parent component immediately
    try {
      if (typeof onCategoryOverridesChange === 'function') {
        onCategoryOverridesChange(appCategoryOverrides);
      }
    } catch (e) {
      console.error('[Settings] Error notifying parent:', e);
    }
    
    // Also trigger data reload via onReloadData
    try {
      if (typeof onReloadData === 'function') {
        onReloadData();
      }
    } catch (e) {
      console.error('[Settings] Error reloading data:', e);
    }
    
    setHasChanges(false);
    onHasChangesChange(false);
  };

  const handleAppColorChange = (app: string, color: string) => {
    setLocalAppColors(prev => ({ ...prev, [app]: color }));
    setHasChanges(true);
    onHasChangesChange(true);
  };

  const handleCategoryColorChange = (category: string, color: string) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(`deskflow-category-color-${category}`, color);
      setHasChanges(true);
      onHasChangesChange(true);
    }
  };

  const getCategoryColor = (category: string): string => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`deskflow-category-color-${category}`);
      if (saved) return saved;
    }
    return CATEGORY_COLORS[category] || '#64748b';
  };

  const getAppColor = (app: string): string => {
    return localAppColors[app] || appColors[app] || '#888888';
  };

  const changeAppCategory = (app: string, newCategory: string) => {
    const updated = { ...appCategoryOverrides, [app]: newCategory };
    setAppCategoryOverrides(updated);
    if (setAppColors) {
      const colorKey = `__category__${newCategory}`;
      const newColors = { ...localAppColors };
      newColors[app] = newColors[app] || appColors[app] || CATEGORY_COLORS[newCategory] || '#888888';
      setAppColors(newColors);
    }
    setEditingAppCategory(null);
    setHasChanges(true);
    onHasChangesChange(true);
  };

  const getAppDisplayCategory = (app: any): string => {
    return appCategoryOverrides[app.app] || app.category || 'Other';
  };

  useEffect(() => {
    if (onRegisterSave) {
      onRegisterSave(saveChanges);
    }
  }, [tierAssignments, localAppColors, localCategoryOrder, animationSpeed, appCategoryOverrides, domainCategoryOverrides, onRegisterSave, saveChanges]);

  const tabs = [
    { id: 'category', label: 'Category' },
    { id: 'colors', label: 'Colors' },
    { id: 'ai', label: 'AI Assistant' },
    { id: 'general', label: 'General' },
    { id: 'tracking', label: 'Tracking' },
    { id: 'prompts', label: 'System Prompts' }
  ];

  const [domainStats, setDomainStats] = useState<any[]>([]);

  useEffect(() => {
    const fetchDomainStats = async () => {
      if (window.deskflowAPI?.getBrowserDomainStats) {
        const stats = await window.deskflowAPI.getBrowserDomainStats('all');
        setDomainStats(stats || []);
      }
    };
    if (activeTab === 'category') {
      fetchDomainStats();
    }
  }, [activeTab]);

  // Persist active tab to localStorage
  useEffect(() => {
    localStorage.setItem('settings-activeTab', activeTab);
  }, [activeTab]);

  const [editingAppCategory, setEditingAppCategory] = useState<string | null>(null);
  const [editingDomainCategory, setEditingDomainCategory] = useState<string | null>(null);
  const [appCarouselIndex, setAppCarouselIndex] = useState(0);
  const [domainCarouselIndex, setDomainCarouselIndex] = useState(0);
  const [appCarouselExpanded, setAppCarouselExpanded] = useState(false);
  const [domainCarouselExpanded, setDomainCarouselExpanded] = useState(false);
  const [appSearchQuery, setAppSearchQuery] = useState('');
  const [domainSearchQuery, setDomainSearchQuery] = useState('');
  const [appSearchFilter, setAppSearchFilter] = useState('');
  const [editingExtActivity, setEditingExtActivity] = useState<number | null>(null);
  const [extCarouselIndex, setExtCarouselIndex] = useState(0);
  const [extCarouselExpanded, setExtCarouselExpanded] = useState(false);
  const [domainSearchFilter, setDomainSearchFilter] = useState('');
  const [colorTab, setColorTab] = useState<'apps' | 'websites'>('apps');
  const [colorSearchFilter, setColorSearchFilter] = useState('');
  const [generatingColors, setGeneratingColors] = useState(false);
  const [pendingColors, setPendingColors] = useState<Record<string, string>>({});
  const [preAiColors, setPreAiColors] = useState<Record<string, string>>({});
  const [generatingCategories, setGeneratingCategories] = useState(false);
  const [pendingCategories, setPendingCategories] = useState<Record<string, string>>({});
  const [preAiCategories, setPreAiCategories] = useState<Record<string, string>>({});
  const [openRouterApiKey, setOpenRouterApiKey] = useState('');
  const [apiKeyTestStatus, setApiKeyTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [apiKeyTestMessage, setApiKeyTestMessage] = useState('');

  // AI Assistant state
  const [interestTopics, setInterestTopics] = useState<string[]>([]);
  const [newTopic, setNewTopic] = useState('');
  const [aiUsageStats, setAiUsageStats] = useState<{ totalCalls: number; totalCost: number }>({ totalCalls: 0, totalCost: 0 });
  const [showApiKey, setShowApiKey] = useState(false);
  const [aiConfig, setAiConfig] = useState({
    briefModel: 'google/gemini-2.0-flash-001',
    weeklyModel: 'google/gemini-2.0-flash-001',
    digestModel: 'google/gemini-2.0-flash-001',
    anomalyModel: 'google/gemini-2.0-flash-001',
    autoGenerateBrief: true,
  });
  
  // Keyword-based productivity categorization state
  // NEW structure: Record<domain, { category: string; keywords: string[] }[]>
  const [keywordEnabledDomains, setKeywordEnabledDomains] = useState<string[]>([]);
  const [editingKeywordDomain, setEditingKeywordDomain] = useState<string | null>(null);
  const [domainKeywordSets, setDomainKeywordSets] = useState<Record<string, { category: string; keywords: string[] }[]>>({});
  const [newKeywordDomain, setNewKeywordDomain] = useState('');
  
  // Keyword set editing state
  const [editingKeywordSets, setEditingKeywordSets] = useState<{ category: string; keywords: string[] }[]>([]);
  const [tempKeywordInput, setTempKeywordInput] = useState('');
  const [tempCategoryForNewSet, setTempCategoryForNewSet] = useState('Education');

  // Tracking settings state
  const [sleepGapMs, setSleepGapMs] = useState(10000);
  const [maxSessionMs, setMaxSessionMs] = useState(300000);
  const [filterTransientApps, setFilterTransientApps] = useState(true);
  const [promptHistoryLimit, setPromptHistoryLimit] = useState(5);
  const [browserRecordingMode, setBrowserRecordingMode] = useState<'always' | 'on-view'>('always');
  const [appRecordingMode, setAppRecordingMode] = useState<'always' | 'on-view'>('always');

  // System Prompts state
  const [systemPrompts, setSystemPrompts] = useState<Record<string, string>>({
    claude: '',
    opencode: '',
    custom: ''
  });

  // Load tracking settings on mount
  useEffect(() => {
    const loadTrackingSettings = async () => {
      if (window.deskflowAPI?.getTrackingSettings) {
        const settings = await window.deskflowAPI.getTrackingSettings();
        setSleepGapMs(settings.sleep_gap_ms || 10000);
        setMaxSessionMs(settings.max_session_ms || 300000);
      }
      if (window.deskflowAPI?.getRecordingModes) {
        const modes = await window.deskflowAPI.getRecordingModes();
        setBrowserRecordingMode(modes.browser || 'always');
        setAppRecordingMode(modes.app || 'always');
      }
    };
    loadTrackingSettings();
  }, []);

  // Load system prompts on mount
  useEffect(() => {
    const loadPrompts = async () => {
      if (window.deskflowAPI?.getPreferences) {
        const prefs = await window.deskflowAPI.getPreferences();
        if (prefs?.systemPrompts) {
          setSystemPrompts({ claude: '', opencode: '', custom: '', ...prefs.systemPrompts });
        }
      }
    };
    loadPrompts();
  }, []);

  const handleSaveSystemPrompt = async (agent: string, content: string) => {
    const updated = { ...systemPrompts, [agent]: content };
    setSystemPrompts(updated);
    if (window.deskflowAPI?.setPreference) {
      await window.deskflowAPI.setPreference('systemPrompts', updated);
    }
  };

  const AGENTS = ['opencode', 'claude', 'aider', 'codex', 'gemini'];

  const DEFAULT_RESUME_COMMANDS: Record<string, string> = {
    opencode: '{agent} -s {resumeId}',
    claude: '{agent} --resume {resumeId}',
    aider: '{agent} --session {resumeId}',
    codex: '{agent} -s {resumeId}',
    gemini: '{agent} -s {resumeId}',
  };

  const [resumeCommands, setResumeCommands] = useState<Record<string, string>>(
    Object.fromEntries(AGENTS.map(a => [a, DEFAULT_RESUME_COMMANDS[a] || '{agent} -s {resumeId}']))
  );

  useEffect(() => {
    const load = async () => {
      if (window.deskflowAPI?.getPreferences) {
        const prefs = await window.deskflowAPI.getPreferences();
        if (prefs?.agentResumeCommands) {
          setResumeCommands(prev => ({ ...prev, ...prefs.agentResumeCommands }));
        }
      }
    };
    load();
  }, []);

  const handleSaveResumeCommand = async (agent: string, cmd: string) => {
    const updated = { ...resumeCommands, [agent]: cmd };
    setResumeCommands(updated);
    if (window.deskflowAPI?.setPreference) {
      await window.deskflowAPI.setPreference('agentResumeCommands', updated);
    }
  };

  const handleSaveTrackingSetting = async (key: string, value: number) => {
    if (window.deskflowAPI?.setTrackingSetting) {
      await window.deskflowAPI.setTrackingSetting(key, value.toString());
    }
  };

  const ITEMS_PER_PAGE = 5;

  const filteredAppStats = appSearchFilter 
    ? appStats.filter((a: any) => a.app.toLowerCase().includes(appSearchFilter.toLowerCase()))
    : appStats;
    
  const filteredDomainStats = domainSearchFilter 
    ? domainStats.filter((s: any) => s.domain.toLowerCase().includes(domainSearchFilter.toLowerCase()))
    : domainStats;

  return (
    <PageShell page="settings">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2.5">
            <Settings className="w-5 h-5 text-zinc-400" />
            Settings
          </h1>
          <p className="text-xs text-zinc-500 mt-1">Track and customize your app usage</p>
        </div>
      </div>

      <div className="flex gap-1 bg-zinc-900/50 p-1 rounded-xl">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-150 ${
              activeTab === tab.id 
                ? 'bg-zinc-800 text-white shadow-sm' 
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content based on active tab */}
      {activeTab === 'category' && (
        <div className="space-y-4">
          {/* Data Sync Mode */}
          <GlassCard>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold">Data Sync Mode</h2>
                <p className="text-xs text-zinc-500">Choose how category changes are applied to your data</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setDataSyncMode('forward')}
                className={`flex-1 px-4 py-3 rounded-xl text-sm font-medium transition ${
                  dataSyncMode === 'forward'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-zinc-800/50 text-zinc-400 hover:text-zinc-200 border border-transparent'
                }`}
              >
                <div className="font-medium">Forward Only</div>
                <div className="text-xs mt-1 opacity-70">New data uses updated categories</div>
              </button>
              <button
                onClick={() => setDataSyncMode('refactor')}
                className={`flex-1 px-4 py-3 rounded-xl text-sm font-medium transition ${
                  dataSyncMode === 'refactor'
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : 'bg-zinc-800/50 text-zinc-400 hover:text-zinc-200 border border-transparent'
                }`}
              >
                <div className="font-medium">Refactor All Data</div>
                <div className="text-xs mt-1 opacity-70">Update existing data to match categories</div>
              </button>
            </div>
            {dataSyncMode === 'refactor' && (
              <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-amber-500/10 rounded-lg border border-amber-500/20">
                <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <p className="text-xs text-amber-200">This will update all existing data to match your category settings. This action cannot be undone.</p>
              </div>
            )}
            {syncStatus !== 'idle' && (
              <div className={`mt-3 text-xs px-3 py-2 rounded-lg ${
                syncStatus === 'success' ? 'bg-emerald-500/10 text-emerald-400' :
                syncStatus === 'error' ? 'bg-red-500/10 text-red-400' :
                'bg-zinc-800/50 text-zinc-400'
              }`}>
                {syncMessage}
              </div>
            )}
          </GlassCard>

          {/* Custom Categories */}
          <GlassCard>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold">Custom Categories</h2>
                <p className="text-xs text-zinc-500">Add new categories beyond the defaults</p>
              </div>
            </div>

            {customCategories.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {customCategories.map(cat => {
                  const catColor = getCategoryColor(cat);
                  return (
                    <div
                      key={cat}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm"
                      style={{ backgroundColor: `${catColor}20`, color: catColor }}
                    >
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: catColor }} />
                      <span>{cat}</span>
                      <button
                        onClick={async () => {
                          if (window.deskflowAPI?.removeCategory) {
                            await window.deskflowAPI.removeCategory(cat);
                          }
                          setCustomCategories(prev => prev.filter(c => c !== cat));
                          setTierAssignments(prev => ({
                            productive: prev.productive.filter(c => c !== cat),
                            neutral: prev.neutral.filter(c => c !== cat),
                            distracting: prev.distracting.filter(c => c !== cat),
                          }));
                          setHasChanges(true);
                          onHasChangesChange(true);
                        }}
                        className="ml-1 p-0.5 hover:bg-white/10 rounded transition-colors duration-150"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex gap-2">
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddCategory(); }}
                placeholder="New category name..."
                className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
              />
              <button
                onClick={handleAddCategory}
                disabled={!newCategoryName.trim()}
                className="px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg text-sm font-medium transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                Add
              </button>
            </div>
          </GlassCard>

          {/* Productivity Tiers */}
          <GlassCard>
            <div className="mb-4">
              <h2 className="text-lg font-semibold">Productivity</h2>
              <p className="text-xs text-zinc-500">Drag categories between tiers</p>
            </div>

            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                <TierContainer
                  tier="productive"
                  color="#22c55e"
                  label="Productive"
                  description="Full productivity credit."
                  creditLabel="100%"
                >
                  <SortableContext items={tierAssignments.productive} strategy={verticalListSortingStrategy}>
                    {tierAssignments.productive.map(id => (
                      <SortableChip
                        key={id}
                        id={id}
                        color="#22c55e"
                        onRemove={() => removeCategoryFromTier('productive', id)}
                      />
                    ))}
                  </SortableContext>
                  {tierAssignments.productive.length === 0 && (
                    <div className="w-full py-3 border-2 border-dashed border-emerald-500/30 rounded-lg text-center text-xs text-emerald-400/50">
                      Drop here
                    </div>
                  )}
                </TierContainer>

                <TierContainer
                  tier="neutral"
                  color="#3b82f6"
                  label="Neutral"
                  description="Partial credit."
                  creditLabel="50%"
                >
                  <SortableContext items={tierAssignments.neutral} strategy={verticalListSortingStrategy}>
                    {tierAssignments.neutral.map(id => (
                      <SortableChip
                        key={id}
                        id={id}
                        color="#3b82f6"
                        onRemove={() => removeCategoryFromTier('neutral', id)}
                      />
                    ))}
                  </SortableContext>
                  {tierAssignments.neutral.length === 0 && (
                    <div className="w-full py-3 border-2 border-dashed border-blue-500/30 rounded-lg text-center text-xs text-blue-400/50">
                      Drop here
                    </div>
                  )}
                </TierContainer>

                <TierContainer
                  tier="distracting"
                  color="#ef4444"
                  label="Distracting"
                  description="No credit."
                  creditLabel="0%"
                >
                  <SortableContext items={tierAssignments.distracting} strategy={verticalListSortingStrategy}>
                    {tierAssignments.distracting.map(id => (
                      <SortableChip
                        key={id}
                        id={id}
                        color="#ef4444"
                        onRemove={() => removeCategoryFromTier('distracting', id)}
                      />
                    ))}
                  </SortableContext>
                  {tierAssignments.distracting.length === 0 && (
                    <div className="w-full py-3 border-2 border-dashed border-red-500/30 rounded-lg text-center text-xs text-red-400/50">
                      Drop here
                    </div>
                  )}
                </TierContainer>
              </div>

              <DragOverlay>
                {activeId ? (
                  (() => {
                    const tier = findTier(activeId);
                    const chipColor = tier === 'productive' ? '#22c55e' : tier === 'neutral' ? '#3b82f6' : '#ef4444';
                    return (
                      <div className="fixed px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 border cursor-grabbing z-[9999] pointer-events-none"
                        style={{ 
                          borderColor: `${chipColor}50`,
                          color: chipColor,
                          backgroundColor: `${chipColor}15`,
                          transform: 'translate(-50%, -50%)',
                          left: '50%',
                          top: '50%'
                        }}
                      >
                        <GripVertical className="w-3 h-3 opacity-50" />
                        <span>{activeId}</span>
                      </div>
                    );
                  })()
                ) : null}
              </DragOverlay>
            </DndContext>
          </GlassCard>

          {/* External Activities Tier Assignment */}
          {externalActivities.length > 0 && (
            <GlassCard>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div>
                    <h2 className="text-lg font-semibold">External Activities</h2>
                    <p className="text-xs text-zinc-500">Click activity to change tier</p>
                  </div>
                  <span className="text-xs text-zinc-500 bg-zinc-800/50 px-2 py-1 rounded-md">{externalActivities.length} activities</span>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => { if (extCarouselIndex > 0) setExtCarouselIndex(extCarouselIndex - 1); }}
                  disabled={extCarouselIndex === 0}
                  className="flex-shrink-0 p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors duration-150"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                
                <div className="flex-1 grid grid-cols-5 gap-2">
                  {externalActivities.slice(
                    extCarouselIndex * (extCarouselExpanded ? 15 : ITEMS_PER_PAGE),
                    extCarouselIndex * (extCarouselExpanded ? 15 : ITEMS_PER_PAGE) + (extCarouselExpanded ? 15 : ITEMS_PER_PAGE)
                  ).map(act => {
                    const currentTier = localExternalTiers[act.id] || (act.is_productive ? 'productive' : 'neutral');
                    const tierColor = currentTier === 'productive' ? '#22c55e' : currentTier === 'distracting' ? '#ef4444' : '#3b82f6';
                    const isEditing = editingExtActivity === act.id;
                    
                    return (
                      <div key={act.id}>
                        <button
                          onClick={() => setEditingExtActivity(isEditing ? null : act.id)}
                          className={`w-full flex flex-col items-center p-3 rounded-xl border transition-colors duration-150 group ${
                            isEditing 
                              ? 'bg-zinc-700/60 border-2 border-emerald-500/60' 
                              : 'bg-zinc-800/40 hover:bg-zinc-800/70 border border-zinc-700/30 hover:border-zinc-500'
                          }`}
                        >
                          <div className="flex items-center justify-center gap-1.5 w-full">
                            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: tierColor }} />
                            <span className="text-xs text-zinc-200 group-hover:text-white truncate max-w-[calc(100%-16px)]">{act.name}</span>
                          </div>
                          <span className="text-xs px-1.5 py-0.5 rounded mt-1.5" style={{ backgroundColor: `${tierColor}20`, color: tierColor }}>
                            {currentTier}
                          </span>
                        </button>
                      </div>
                    );
                  })}
                </div>
                
                <button 
                  onClick={() => {
                    const itemsPerView = extCarouselExpanded ? 15 : ITEMS_PER_PAGE;
                    const maxPage = Math.max(0, Math.ceil(externalActivities.length / itemsPerView) - 1);
                    if (extCarouselIndex < maxPage) setExtCarouselIndex(extCarouselIndex + 1);
                  }}
                  disabled={extCarouselIndex >= Math.max(0, Math.ceil(externalActivities.length / (extCarouselExpanded ? 15 : ITEMS_PER_PAGE)) - 1)}
                  className="flex-shrink-0 p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors duration-150"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              
              {/* Show More/Less Button */}
              {externalActivities.length > 5 && (
                <button
                  onClick={() => {
                    setExtCarouselExpanded(!extCarouselExpanded);
                    setExtCarouselIndex(0);
                  }}
                  className="mt-3 w-full py-2 bg-zinc-800/50 hover:bg-zinc-800 rounded-lg text-sm text-zinc-400 hover:text-white transition-colors duration-150 flex items-center justify-center gap-2"
                >
                  {extCarouselExpanded ? (
                    <><ChevronUp className="w-4 h-4" /> Show Less</>
                  ) : (
                    <><ChevronDown className="w-4 h-4" /> Show More</>
                  )}
                </button>
              )}
              
              {/* Tier Selection Panel */}
              {editingExtActivity !== null && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 p-4 bg-zinc-900/80 rounded-xl border border-zinc-700/50"
                >
                  <div className="grid grid-cols-3 gap-2">
                    {(['productive', 'neutral', 'distracting'] as const).map(tier => {
                      const tierColors = { productive: '#22c55e', neutral: '#3b82f6', distracting: '#ef4444' };
                      const currentTier = localExternalTiers[editingExtActivity] || 'neutral';
                      const isSelected = currentTier === tier;
                      return (
                        <button
                          key={tier}
                          onClick={() => {
                            const updated = { ...localExternalTiers, [editingExtActivity]: tier };
                            setLocalExternalTiers(updated);
                            localStorage.setItem('deskflow-external-activity-tiers', JSON.stringify(updated));
                            onExternalActivityTiersChange?.(updated);
                          }}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors duration-150 ${
                            isSelected ? 'ring-2 ring-white/30' : 'hover:bg-zinc-800'
                          }`}
                          style={{ backgroundColor: `${tierColors[tier]}15`, borderColor: isSelected ? tierColors[tier] : 'transparent', color: tierColors[tier] }}
                        >
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: tierColors[tier] }} />
                          <span className="capitalize">{tier}</span>
                          {isSelected && <Check className="w-4 h-4 ml-auto" />}
                        </button>
                      );
                    })}
                  </div>
                  <button 
                    onClick={() => setEditingExtActivity(null)}
                    className="w-full mt-3 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm text-zinc-400 transition-colors duration-150"
                  >
                    Done
                  </button>
                </motion.div>
              )}
            </GlassCard>
          )}

          {/* Applications Section - Carousel with Expandable Grid */}
          <GlassCard>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div>
                  <h2 className="text-lg font-semibold">Applications</h2>
                  <p className="text-xs text-zinc-500">Click app to change category</p>
                </div>
                {appStats.length > 0 && (
                  <span className="text-xs text-zinc-500 bg-zinc-800/50 px-2 py-1 rounded-md">{filteredAppStats.length} apps</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={async () => {
                    setPreAiCategories({ ...appCategoryOverrides });
                    setGeneratingCategories(true);
                    try {
                      const itemsToCategorize = appStats.map((a: any) => ({
                        name: a.app,
                        category: getAppDisplayCategory(a)
                      }));
                      if (window.deskflowAPI?.generateAICategorization) {
                        const result = await window.deskflowAPI.generateAICategorization(itemsToCategorize);
                        const newOverrides = { ...appCategoryOverrides };
                        result.forEach((item: any) => {
                          newOverrides[item.name] = item.category;
                        });
                        setAppCategoryOverrides(newOverrides);
                        setHasChanges(true);
                        onHasChangesChange(true);
                        setGeneratingCategories(false);
                      }
                    } catch (err) {
                      console.error('Magic Category failed:', err);
                      setGeneratingCategories(false);
                    }
                  }}
                  disabled={generatingCategories}
                  className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 hover:border-zinc-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors duration-150 flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {generatingCategories ? 'Generating...' : 'Magic Category'}
                </button>
                {appStats.length > 0 && (
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                    <input
                      type="text"
                      placeholder="Search apps..."
                      value={appSearchFilter}
                      onChange={(e) => { setAppSearchFilter(e.target.value); setAppCarouselIndex(0); }}
                      className="pl-8 pr-3 py-1.5 text-sm bg-zinc-800/50 border border-zinc-700/50 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 w-36"
                    />
                  </div>
                )}
              </div>
            </div>
            
            {filteredAppStats.length > 0 ? (
              <>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => { const current = appCarouselIndex; if (current > 0) setAppCarouselIndex(current - 1); }}
                    disabled={appCarouselIndex === 0}
                    className="flex-shrink-0 p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors duration-150"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  
                  <div className={`flex-1 grid gap-2 ${appCarouselExpanded ? 'grid-cols-5' : 'grid-cols-5'}`}>
                    {filteredAppStats.slice(
                      appCarouselIndex * (appCarouselExpanded ? 15 : ITEMS_PER_PAGE), 
                      appCarouselIndex * (appCarouselExpanded ? 15 : ITEMS_PER_PAGE) + (appCarouselExpanded ? 15 : ITEMS_PER_PAGE)
                    ).map((app: any) => {
                      const displayCategory = getAppDisplayCategory(app);
                      const categoryColor = getCategoryColor(displayCategory);
                      const isEditing = editingAppCategory === app.app;
                      
                      return (
                        <div key={app.app} className="relative">
                          <button
                            onClick={() => setEditingAppCategory(isEditing ? null : app.app)}
                            className={`w-full flex flex-col items-center p-3 rounded-xl border transition-colors duration-150 group ${
                              isEditing 
                                ? 'bg-zinc-700/60 border-2 border-emerald-500/60' 
                                : 'bg-zinc-800/40 hover:bg-zinc-800/70 border border-zinc-700/30 hover:border-zinc-500'
                            }`}
                          >
                            {/* Individual AI Sparkle Button */}
                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                try {
                                  if (window.deskflowAPI?.generateAICategorization) {
                                    const result = await window.deskflowAPI.generateAICategorization([{
                                      name: app.app,
                                      category: displayCategory
                                    }]);
                                    if (result.length > 0) {
                                      changeAppCategory(app.app, result[0].category);
                                    }
                                  }
                                } catch (err) {
                                  console.error('Individual AI categorize failed:', err);
                                }
                              }}
                              className="absolute top-1.5 right-1.5 p-1 rounded bg-white/10 hover:bg-white/20 text-white/40 hover:text-white transition-colors duration-150 opacity-60 hover:opacity-100 z-10"
                              title="AI Categorize"
                            >
                              <Sparkles className="w-3 h-3" />
                            </button>
                            
                            <div className="flex items-center justify-center gap-1.5 w-full pr-5">
                              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: categoryColor }} />
                              <span className="text-xs text-zinc-200 group-hover:text-white truncate max-w-[calc(100%-16px)]">{app.app}</span>
                            </div>
                            <span className="text-xs px-1.5 py-0.5 rounded mt-1.5" style={{ backgroundColor: `${categoryColor}20`, color: categoryColor }}>
                              {displayCategory}
                            </span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  
                  <button 
                    onClick={() => { 
                      const itemsPerView = appCarouselExpanded ? 15 : ITEMS_PER_PAGE;
                      const maxPage = Math.max(0, Math.ceil(filteredAppStats.length / itemsPerView) - 1);
                      if (appCarouselIndex < maxPage) setAppCarouselIndex(appCarouselIndex + 1); 
                    }}
                    disabled={appCarouselIndex >= Math.max(0, Math.ceil(filteredAppStats.length / (appCarouselExpanded ? 15 : ITEMS_PER_PAGE)) - 1)}
                    className="flex-shrink-0 p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors duration-150"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
                
                {/* Show More/Less Button */}
                {filteredAppStats.length > 5 && (
                  <button
                    onClick={() => {
                      setAppCarouselExpanded(!appCarouselExpanded);
                      setAppCarouselIndex(0);
                    }}
                    className="mt-3 w-full py-2 bg-zinc-800/50 hover:bg-zinc-800 rounded-lg text-sm text-zinc-400 hover:text-white transition-colors duration-150 flex items-center justify-center gap-2"
                  >
                    {appCarouselExpanded ? (
                      <>
                        <ChevronUp className="w-4 h-4" />
                        Show Less
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-4 h-4" />
                        Show More
                      </>
                    )}
                  </button>
                )}
              </>
            ) : (
              <div className="text-center py-8 text-zinc-500">
                <Clock className="w-6 h-6 mx-auto mb-2 opacity-50" />
                <p className="text-sm">{appSearchFilter ? 'No matching apps' : 'No apps tracked yet'}</p>
              </div>
            )}
            
            {/* Full Category Selection Panel */}
            {editingAppCategory && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 p-4 bg-zinc-900/80 rounded-xl border border-zinc-700/50"
              >
                <div className="flex items-center gap-2 mb-3">
                  <Search className="w-4 h-4 text-zinc-500" />
                  <input
                    type="text"
                    placeholder="Search categories..."
                    value={appSearchQuery}
                    onChange={(e) => setAppSearchQuery(e.target.value)}
                    className="flex-1 bg-transparent text-sm text-white placeholder-zinc-500 focus:outline-none"
                  />
                </div>
                <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto">
                  {allCategories.filter(cat => cat.toLowerCase().includes(appSearchQuery.toLowerCase())).map((cat) => {
                    const catColor = getCategoryColor(cat);
                    const appData = appStats.find((a: any) => a.app === editingAppCategory);
                    const displayCategory = getAppDisplayCategory(appData);
                    const isSelected = displayCategory === cat;
                    return (
                      <button
                        key={cat}
                        onClick={() => changeAppCategory(editingAppCategory, cat)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors duration-150 ${
                          isSelected ? 'ring-2 ring-white/30' : 'hover:bg-zinc-800'
                        }`}
                        style={{ backgroundColor: `${catColor}15`, borderColor: isSelected ? catColor : 'transparent', color: catColor }}
                      >
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: catColor }} />
                        <span>{cat}</span>
                        {isSelected && <Check className="w-4 h-4 ml-auto" />}
                      </button>
                    );
                  })}
                </div>
                <button 
                  onClick={() => setEditingAppCategory(null)}
                  className="w-full mt-3 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm text-zinc-400 transition-colors duration-150"
                >
                  Done
                </button>
              </motion.div>
            )}
          </GlassCard>

          {/* Websites Section - Carousel with Expandable Grid */}
          <GlassCard>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div>
                  <h2 className="text-lg font-semibold">Websites</h2>
                  <p className="text-xs text-zinc-500">Click site to change category</p>
                </div>
                {domainStats.length > 0 && (
                  <span className="text-xs text-zinc-500 bg-zinc-800/50 px-2 py-1 rounded-md">{filteredDomainStats.length} sites</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={async () => {
                    setPreAiCategories({ ...domainCategoryOverrides });
                    setGeneratingCategories(true);
                    try {
                      const itemsToCategorize = domainStats.map((d: any) => ({
                        name: d.domain,
                        category: domainCategoryOverrides[d.domain] || d.category || 'Other'
                      }));
                      if (window.deskflowAPI?.generateAICategorization) {
                        const result = await window.deskflowAPI.generateAICategorization(itemsToCategorize);
                        const newOverrides = { ...domainCategoryOverrides };
                        result.forEach((item: any) => {
                          newOverrides[item.name] = item.category;
                        });
                        setDomainCategoryOverrides(newOverrides);
                        setHasChanges(true);
                        onHasChangesChange(true);
                        setGeneratingCategories(false);
                      }
                    } catch (err) {
                      console.error('Magic Category failed:', err);
                      setGeneratingCategories(false);
                    }
                  }}
                  disabled={generatingCategories}
                  className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 hover:border-zinc-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors duration-150 flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {generatingCategories ? 'Generating...' : 'Magic Category'}
                </button>
                {domainStats.length > 0 && (
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                    <input
                      type="text"
                      placeholder="Search sites..."
                      value={domainSearchFilter}
                      onChange={(e) => { setDomainSearchFilter(e.target.value); setDomainCarouselIndex(0); }}
                      className="pl-8 pr-3 py-1.5 text-sm bg-zinc-800/50 border border-zinc-700/50 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 w-36"
                    />
                  </div>
                )}
              </div>
            </div>
            
            {filteredDomainStats.length > 0 ? (
              <>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => { const current = domainCarouselIndex; if (current > 0) setDomainCarouselIndex(current - 1); }}
                    disabled={domainCarouselIndex === 0}
                    className="flex-shrink-0 p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors duration-150"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  
                  <div className="flex-1 grid grid-cols-5 gap-2">
                    {filteredDomainStats.slice(
                      domainCarouselIndex * (domainCarouselExpanded ? 15 : ITEMS_PER_PAGE), 
                      domainCarouselIndex * (domainCarouselExpanded ? 15 : ITEMS_PER_PAGE) + (domainCarouselExpanded ? 15 : ITEMS_PER_PAGE)
                    ).map((site: any) => {
                      const displayCategory = domainCategoryOverrides[site.domain] || site.category || 'Other';
                      const categoryColor = getCategoryColor(displayCategory);
                      const isEditing = editingDomainCategory === site.domain;
                      
                      return (
                        <div key={site.domain} className="relative">
                          <button
                            onClick={() => setEditingDomainCategory(isEditing ? null : site.domain)}
                            className={`w-full flex flex-col items-center p-3 rounded-xl border transition-colors duration-150 group ${
                              isEditing 
                                ? 'bg-zinc-700/60 border-2 border-emerald-500/60' 
                                : 'bg-zinc-800/40 hover:bg-zinc-800/70 border border-zinc-700/30 hover:border-zinc-500'
                            }`}
                          >
                            {/* Individual AI Sparkle Button */}
                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                try {
                                  if (window.deskflowAPI?.generateAICategorization) {
                                    const result = await window.deskflowAPI.generateAICategorization([{
                                      name: site.domain,
                                      category: displayCategory
                                    }]);
                                    if (result.length > 0) {
                                      const updated = { ...domainCategoryOverrides, [site.domain]: result[0].category };
                                      setDomainCategoryOverrides(updated);
                                      if (window.deskflowAPI?.setDomainCategory) {
                                        await window.deskflowAPI.setDomainCategory(site.domain, result[0].category);
                                      }
                                      setHasChanges(true);
                                      onHasChangesChange(true);
                                    }
                                  }
                                } catch (err) {
                                  console.error('Individual AI categorize failed:', err);
                                }
                              }}
                              className="absolute top-1.5 right-1.5 p-1 rounded bg-white/10 hover:bg-white/20 text-white/40 hover:text-white transition-colors duration-150 opacity-60 hover:opacity-100 z-10"
                              title="AI Categorize"
                            >
                              <Sparkles className="w-3 h-3" />
                            </button>
                            
                            <div className="flex items-center justify-center gap-1.5 w-full pr-5">
                              <Globe className="w-3 h-3 text-zinc-500 flex-shrink-0" />
                              <span className="text-xs text-zinc-200 group-hover:text-white truncate max-w-[calc(100%-20px)]">{site.domain}</span>
                            </div>
                            <span className="text-xs px-1.5 py-0.5 rounded mt-1.5" style={{ backgroundColor: `${categoryColor}20`, color: categoryColor }}>
                              {displayCategory}
                            </span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  
                  <button 
                    onClick={() => { 
                      const itemsPerView = domainCarouselExpanded ? 15 : ITEMS_PER_PAGE;
                      const maxPage = Math.max(0, Math.ceil(filteredDomainStats.length / itemsPerView) - 1);
                      if (domainCarouselIndex < maxPage) setDomainCarouselIndex(domainCarouselIndex + 1); 
                    }}
                    disabled={domainCarouselIndex >= Math.max(0, Math.ceil(filteredDomainStats.length / (domainCarouselExpanded ? 15 : ITEMS_PER_PAGE)) - 1)}
                    className="flex-shrink-0 p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors duration-150"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
                
                {/* Show More/Less Button */}
                {filteredDomainStats.length > 5 && (
                  <button
                    onClick={() => {
                      setDomainCarouselExpanded(!domainCarouselExpanded);
                      setDomainCarouselIndex(0);
                    }}
                    className="mt-3 w-full py-2 bg-zinc-800/50 hover:bg-zinc-800 rounded-lg text-sm text-zinc-400 hover:text-white transition-colors duration-150 flex items-center justify-center gap-2"
                  >
                    {domainCarouselExpanded ? (
                      <>
                        <ChevronUp className="w-4 h-4" />
                        Show Less
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-4 h-4" />
                        Show More
                      </>
                    )}
                  </button>
                )}
              </>
            ) : (
              <div className="text-center py-8 text-zinc-500">
                <Globe className="w-6 h-6 mx-auto mb-2 opacity-50" />
                <p className="text-sm">{domainSearchFilter ? 'No matching sites' : 'No websites tracked yet'}</p>
              </div>
            )}
            
            {/* Full Category Selection Panel */}
            {editingDomainCategory && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 p-4 bg-zinc-900/80 rounded-xl border border-zinc-700/50"
              >
                <div className="flex items-center gap-2 mb-3">
                  <Search className="w-4 h-4 text-zinc-500" />
                  <input
                    type="text"
                    placeholder="Search categories..."
                    value={domainSearchQuery}
                    onChange={(e) => setDomainSearchQuery(e.target.value)}
                    className="flex-1 bg-transparent text-sm text-white placeholder-zinc-500 focus:outline-none"
                  />
                </div>
                <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto">
                  {allCategories.filter(cat => cat.toLowerCase().includes(domainSearchQuery.toLowerCase())).map((cat) => {
                    const catColor = getCategoryColor(cat);
                    const siteData = domainStats.find((s: any) => s.domain === editingDomainCategory);
                    const displayCategory = domainCategoryOverrides[editingDomainCategory] || siteData?.category || 'Other';
                    const isSelected = displayCategory === cat;
                    return (
                      <button
                        key={cat}
                        onClick={async () => {
                          const updated = { ...domainCategoryOverrides, [editingDomainCategory]: cat };
                          setDomainCategoryOverrides(updated);
                          if (window.deskflowAPI?.setDomainCategory) {
                            await window.deskflowAPI.setDomainCategory(editingDomainCategory, cat);
                          }
                          setEditingDomainCategory(null);
                          setHasChanges(true);
                          onHasChangesChange(true);
                        }}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors duration-150 ${
                          isSelected ? 'ring-2 ring-white/30' : 'hover:bg-zinc-800'
                        }`}
                        style={{ backgroundColor: `${catColor}15`, borderColor: isSelected ? catColor : 'transparent', color: catColor }}
                      >
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: catColor }} />
                        <span>{cat}</span>
                        {isSelected && <Check className="w-4 h-4 ml-auto" />}
                      </button>
                    );
                  })}
                </div>
                <button 
                  onClick={() => setEditingDomainCategory(null)}
                  className="w-full mt-3 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm text-zinc-400 transition-colors duration-150"
                >
                  Done
                </button>
              </motion.div>
            )}
          </GlassCard>

          {/* Smart Website Categorization Section */}
          <GlassCard>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold">Smart Website Categorization</h2>
                <p className="text-xs text-zinc-500">Configure keyword-based productivity detection for websites</p>
              </div>
              <button
                onClick={() => setEditingKeywordDomain(editingKeywordDomain ? null : 'new')}
                className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg text-sm font-medium transition-colors duration-150 flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Domain
              </button>
            </div>

            {/* List of domains with keyword rules */}
            <div className="space-y-2 mb-4">
              {keywordEnabledDomains.length > 0 ? (
                keywordEnabledDomains.map((domain) => {
                  const sets = domainKeywordSets[domain] || [];
                  const totalKeywords = sets.reduce((acc, s) => acc + (s.keywords?.length || 0), 0);
                  return (
                    <div
                      key={domain}
                      className="flex items-center justify-between p-3 bg-zinc-800/40 rounded-xl border border-zinc-700/30"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <Globe className="w-4 h-4 text-zinc-500" />
                        <div>
                          <div className="text-sm font-medium text-zinc-200">{domain}</div>
                          <div className="text-xs text-zinc-500">
                            {sets.length} rule(s), {totalKeywords} keywords total
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setEditingKeywordDomain(domain);
                            setEditingKeywordSets(domainKeywordSets[domain] || []);
                            setTempKeywordInput('');
                          }}
                          className="px-2 py-1 text-xs bg-zinc-700 hover:bg-zinc-600 rounded-md transition-colors duration-150"
                        >
                          Configure
                        </button>
                        <button
                          onClick={async () => {
                            if (window.deskflowAPI?.removeKeywordDomain) {
                              await window.deskflowAPI.removeKeywordDomain(domain);
                              setKeywordEnabledDomains(prev => prev.filter(d => d !== domain));
                              setHasChanges(true);
                              onHasChangesChange(true);
                            }
                          }}
                          className="p-1.5 text-zinc-500 hover:text-red-400 transition-colors duration-150"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-6 text-zinc-500">
                  <Globe className="w-6 h-6 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No domains with keyword rules yet</p>
                  <p className="text-xs mt-1">Add a domain to enable smart categorization</p>
                </div>
              )}
            </div>

            {/* Configuration panel - NEW: Multiple keyword sets */}
            {editingKeywordDomain && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 p-4 bg-zinc-900/80 rounded-xl border border-zinc-700/50"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold">
                    {editingKeywordDomain === 'new' ? 'Add New Domain' : `Configure: ${editingKeywordDomain}`}
                  </h3>
                  <button
                    onClick={() => {
                      setEditingKeywordDomain(null);
                      setEditingKeywordSets([]);
                      setTempKeywordInput('');
                    }}
                    className="p-1 text-zinc-500 hover:text-white transition-colors duration-150"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Domain Dropdown for new */}
                {editingKeywordDomain === 'new' && (
                  <div className="mb-4">
                    <label className="text-xs text-zinc-400 mb-1.5 block">Select Website</label>
                    <select
                      value={newKeywordDomain}
                      onChange={(e) => setNewKeywordDomain(e.target.value)}
                      className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500"
                    >
                      <option value="">Choose a website...</option>
                      {domainStats
                        .filter((s: any) => !keywordEnabledDomains.includes(s.domain))
                        .map((site: any) => (
                          <option key={site.domain} value={site.domain}>
                            {site.domain} ({site.category || 'Uncategorized'})
                          </option>
                        ))}
                    </select>
                  </div>
                )}

                {/* Keyword Sets - each set has category + keywords */}
                <div className="space-y-3 mb-4">
                  {(editingKeywordDomain === 'new' ? editingKeywordSets : (domainKeywordSets[editingKeywordDomain] || []))
                    .map((set, setIdx) => (
                      <div key={setIdx} className="p-3 bg-zinc-800/50 rounded-lg border border-zinc-700/30">
                        <div className="flex items-center justify-between mb-2">
                          <select
                            value={set.category}
                            onChange={(e) => {
                              const updated = [...(editingKeywordDomain === 'new' ? editingKeywordSets : (domainKeywordSets[editingKeywordDomain] || []))];
                              updated[setIdx] = { ...updated[setIdx], category: e.target.value };
                              if (editingKeywordDomain === 'new') {
                                setEditingKeywordSets(updated);
                              } else {
                                setDomainKeywordSets(prev => ({ ...prev, [editingKeywordDomain]: updated }));
                                setEditingKeywordSets(updated);
                              }
                            }}
                            className="px-2 py-1 bg-zinc-700 border border-zinc-600 rounded text-xs text-white"
                          >
                            {allCategories.map(cat => (
                              <option key={cat} value={cat}>{cat}</option>
                            ))}
                          </select>
                          <button
                            onClick={() => {
                              const updated = [...(editingKeywordDomain === 'new' ? editingKeywordSets : (domainKeywordSets[editingKeywordDomain] || []))];
                              updated.splice(setIdx, 1);
                              if (editingKeywordDomain === 'new') {
                                setEditingKeywordSets(updated);
                              } else {
                                setDomainKeywordSets(prev => ({ ...prev, [editingKeywordDomain]: updated }));
                                setEditingKeywordSets(updated);
                              }
                            }}
                            className="p-1 text-zinc-500 hover:text-red-400"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {(set.keywords || []).map((keyword, kwIdx) => (
                            <span key={kwIdx} className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-full text-xs">
                              {keyword}
                              <button
                                onClick={() => {
                                  const updated = [...(editingKeywordDomain === 'new' ? editingKeywordSets : (domainKeywordSets[editingKeywordDomain] || []))];
                                  updated[setIdx] = { 
                                    ...updated[setIdx], 
                                    keywords: (updated[setIdx].keywords || []).filter((_, i) => i !== kwIdx) 
                                  };
                                  if (editingKeywordDomain === 'new') {
                                    setEditingKeywordSets(updated);
                                  } else {
                                    setDomainKeywordSets(prev => ({ ...prev, [editingKeywordDomain]: updated }));
                                    setEditingKeywordSets(updated);
                                  }
                                }}
                              >
                                <X className="w-2.5 h-2.5" />
                              </button>
                            </span>
                          ))}
                          {(!set.keywords || set.keywords.length === 0) && (
                            <span className="text-xs text-zinc-500 italic">No keywords - will always use this category</span>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={setIdx === (editingKeywordDomain === 'new' ? editingKeywordSets.length - 1 : (domainKeywordSets[editingKeywordDomain] || []).length - 1) ? tempKeywordInput : ''}
                            onChange={(e) => setTempKeywordInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && tempKeywordInput.trim()) {
                                e.preventDefault();
                                const newKeyword = tempKeywordInput.trim().toLowerCase();
                                const updated = [...(editingKeywordDomain === 'new' ? editingKeywordSets : (domainKeywordSets[editingKeywordDomain] || []))];
                                if (!updated[setIdx].keywords) updated[setIdx].keywords = [];
                                if (!updated[setIdx].keywords.includes(newKeyword)) {
                                  updated[setIdx] = { 
                                    ...updated[setIdx], 
                                    keywords: [...updated[setIdx].keywords, newKeyword] 
                                  };
                                  if (editingKeywordDomain === 'new') {
                                    setEditingKeywordSets(updated);
                                  } else {
                                    setDomainKeywordSets(prev => ({ ...prev, [editingKeywordDomain]: updated }));
                                    setEditingKeywordSets(updated);
                                  }
                                }
                                setTempKeywordInput('');
                              }
                            }}
                            placeholder={`Add keyword for ${set.category}...`}
                            className="flex-1 px-2 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-xs text-white placeholder-zinc-500"
                          />
                        </div>
                      </div>
                    ))}
                </div>

                {/* Add new keyword set button */}
                <button
                  onClick={() => {
                    const newSet = { category: tempCategoryForNewSet, keywords: [] };
                    if (editingKeywordDomain === 'new') {
                      setEditingKeywordSets(prev => [...prev, newSet]);
                    } else {
                      setDomainKeywordSets(prev => ({ 
                        ...prev, 
                        [editingKeywordDomain]: [...(prev[editingKeywordDomain] || []), newSet] 
                      }));
                      setEditingKeywordSets(prev => [...prev, newSet]);
                    }
                  }}
                  className="w-full py-2 mb-4 border border-dashed border-zinc-600 text-zinc-400 hover:border-zinc-500 hover:text-zinc-300 rounded-lg text-sm transition-colors duration-150"
                >
                  + Add Keyword Set
                </button>

                {/* Category selector for new set */}
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-xs text-zinc-400">New set category:</span>
                  <select
                    value={tempCategoryForNewSet}
                    onChange={(e) => setTempCategoryForNewSet(e.target.value)}
                    className="px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-xs text-white"
                  >
                    {allCategories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                {/* Note about fallback */}
                <p className="text-xs text-zinc-500 mb-4">
                  If no keywords match, falls back to Category Overrides setting
                </p>

                {/* Save Button */}
                <button
                  onClick={async () => {
                    const domain = editingKeywordDomain === 'new' ? newKeywordDomain.toLowerCase() : editingKeywordDomain;
                    const keywordSets = editingKeywordDomain === 'new' ? editingKeywordSets : (domainKeywordSets[editingKeywordDomain] || []);

                    if (!domain) {
                      alert('Please select a website');
                      return;
                    }

                    if (window.deskflowAPI?.addKeywordDomain) {
                      await window.deskflowAPI.addKeywordDomain(domain, keywordSets);
                      
                      if (editingKeywordDomain === 'new') {
                        setDomainKeywordSets(prev => ({ ...prev, [domain]: keywordSets }));
                        setKeywordEnabledDomains(prev => [...prev, domain]);
                      } else {
                        setDomainKeywordSets(prev => ({ ...prev, [domain]: keywordSets }));
                      }
                      
                      setEditingKeywordDomain(null);
                      setEditingKeywordSets([]);
                      setTempKeywordInput('');
                      setNewKeywordDomain('');
                    }
                  }}
                  disabled={editingKeywordDomain === 'new' && !newKeywordDomain}
                  className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-zinc-700 disabled:text-zinc-500 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors duration-150"
                >
                  {editingKeywordDomain === 'new' ? 'Add Domain' : 'Done'}
                </button>
              </motion.div>
            )}
          </GlassCard>
        </div>
      )}

      {activeTab === 'general' && (
        <div className="space-y-4">
          <GlassCard className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold mb-3">App Tracker Behavior</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-zinc-400 mb-2 block">App Tracker Window Mode</label>
                  <div className="flex gap-2">
                    {(['show-other', 'pause', 'track'] as const).map(mode => (
                      <button
                        key={mode}
                        onClick={() => {
                          setTrackerAppMode(mode);
                          setTrackerAppModeProp(mode);
                          setHasChanges(true);
                          onHasChangesChange(true);
                        }}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition flex-1 ${
                          trackerAppMode === mode
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                            : 'bg-zinc-800/50 border border-zinc-700/50 text-zinc-400 hover:text-white'
                        }`}
                      >
                        {mode === 'show-other' ? 'Show Other Apps' : mode === 'pause' ? 'Pause Timer' : 'Track as Normal'}
                      </button>
                    ))}
                  </div>
                  <div className="mt-2 space-y-1 text-xs text-zinc-500">
                    <p><span className="text-emerald-400">Show Other Apps:</span> When you open the tracker, it keeps showing the last app you were using. The tracker app itself is not tracked.</p>
                    <p><span className="text-amber-400">Pause Timer:</span> The stopwatch pauses when you're using the tracker app (but previous time is preserved). Useful when reviewing stats.</p>
                    <p><span className="text-blue-400">Track as Normal:</span> The tracker app is tracked like any other app. Timer counts based on its category.</p>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-zinc-400 mb-2 block">Idle Threshold</label>
                  <div className="flex gap-2">
                    {[3, 5, 10].map(m => (
                      <button
                        key={m}
                        onClick={() => {
                          setIdleThreshold(m);
                          setHasChanges(true);
                          onHasChangesChange(true);
                        }}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                          idleThreshold === m
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                            : 'bg-zinc-800/50 border border-zinc-700/50 text-zinc-400 hover:text-white'
                        }`}
                      >
                        {m} min
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-zinc-400 mb-2 block">When using Neutral apps</label>
                  <div className="flex gap-2">
                    {(['pause', 'reset', 'ignore'] as const).map(action => (
                      <button
                        key={action}
                        onClick={() => {
                          const newBehavior = { ...localTimerBehavior, neutralAction: action };
                          setLocalTimerBehavior(newBehavior);
                          setTimerBehaviorProp(newBehavior);
                          setHasChanges(true);
                          onHasChangesChange(true);
                          if (window.deskflowAPI?.setPreference) {
                            window.deskflowAPI.setPreference('timerBehavior', newBehavior);
                          }
                        }}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                          localTimerBehavior.neutralAction === action
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                            : 'bg-zinc-800/50 border border-zinc-700/50 text-zinc-400 hover:text-white'
                        }`}
                      >
                        {action === 'pause' ? '⏸ Pause' : action === 'reset' ? '🔄 Reset' : '⏭ Ignore'}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-zinc-500 mt-1">What happens when you switch from productive to neutral (e.g., Communication, Design)</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-zinc-400 mb-2 block">When using Distracting apps</label>
                  <div className="flex gap-2">
                    {(['pause', 'reset', 'ignore'] as const).map(action => (
                      <button
                        key={action}
                        onClick={() => {
                          const newBehavior = { ...localTimerBehavior, distractingAction: action };
                          setLocalTimerBehavior(newBehavior);
                          setTimerBehaviorProp(newBehavior);
                          setHasChanges(true);
                          onHasChangesChange(true);
                          if (window.deskflowAPI?.setPreference) {
                            window.deskflowAPI.setPreference('timerBehavior', newBehavior);
                          }
                        }}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                          localTimerBehavior.distractingAction === action
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                            : 'bg-zinc-800/50 border border-zinc-700/50 text-zinc-400 hover:text-white'
                        }`}
                      >
                        {action === 'pause' ? '⏸ Pause' : action === 'reset' ? '🔄 Reset' : '⏭ Ignore'}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-zinc-500 mt-1">What happens when you switch from productive to distracting (e.g., Entertainment, Social Media)</p>
                </div>

                <div className="flex items-center justify-between py-2">
                  <div>
                    <div className="text-sm font-medium">Min Session Duration</div>
                    <div className="text-xs text-zinc-500">Only count sessions longer than this</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {([60, 180, 300, 600, 900, 1800] as const).map(m => (
                      <button
                        key={m}
                        onClick={() => {
                          if (window.deskflowAPI?.setPreference) {
                            window.deskflowAPI.setPreference('productivityMinDuration', m);
                            setHasChanges(true);
                            onHasChangesChange(true);
                          }
                        }}
                        className={`px-2 py-1 rounded text-xs font-medium transition ${
                          m === 300
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                            : 'bg-zinc-800/50 border border-zinc-700/50 text-zinc-400 hover:text-white'
                        }`}
                      >
                        {m < 60 ? `${m}s` : m < 3600 ? `${m / 60}m` : `${m / 3600}h`}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between py-2">
                  <div>
                    <div className="text-sm font-medium">Auto-Export</div>
                    <div className="text-xs text-zinc-500">Export data periodically</div>
                  </div>
                  <button
                    onClick={() => {
                      setAutoExport(!autoExport);
                      setHasChanges(true);
                      onHasChangesChange(true);
                    }}
                    className={`w-12 h-6 rounded-full transition-colors duration-150 relative ${
                      autoExport ? 'bg-emerald-500' : 'bg-zinc-700'
                    }`}
                  >
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-colors duration-150 ${
                      autoExport ? 'left-7' : 'left-1'
                    }`} />
                  </button>
                </div>

                <div className="flex items-center justify-between py-2">
                  <div>
                    <div className="text-sm font-medium">Auto-Start</div>
                    <div className="text-xs text-zinc-500">Launch on system startup</div>
                  </div>
                  <button
                    onClick={async () => {
                      const newValue = !autoStartEnabled;
                      setAutoStartEnabled(newValue);
                      setAutoStartEnabledProp?.(newValue);
                      setHasChanges(true);
                      onHasChangesChange(true);
                      if (window.deskflowAPI?.setAutoStart) {
                        await window.deskflowAPI.setAutoStart(newValue);
                      }
                    }}
                    className={`w-12 h-6 rounded-full transition-colors duration-150 relative ${
                      autoStartEnabled ? 'bg-emerald-500' : 'bg-zinc-700'
                    }`}
                  >
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-colors duration-150 ${
                      autoStartEnabled ? 'left-7' : 'left-1'
                    }`} />
                  </button>
                </div>

                <div>
                  <p className="text-xs text-zinc-500 italic">OpenRouter API key is configured in the <span className="text-zinc-300 not-italic">AI Assistant</span> tab</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-zinc-400 mb-2 block">Animation Speed</label>
                  <div className="flex gap-1.5">
                    {(['slow', 'normal', 'instant'] as const).map((speed) => (
                      <button
                        key={speed}
                        onClick={() => {
                          setAnimationSpeed(speed);
                          setHasChanges(true);
                          onHasChangesChange(true);
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                          animationSpeed === speed
                            ? 'bg-violet-500/20 text-violet-400 border border-violet-500/40'
                            : 'bg-zinc-800/50 border border-zinc-700/50 text-zinc-400 hover:text-white'
                        }`}
                      >
                        {speed === 'slow' ? 'Slow' : speed === 'normal' ? 'Normal' : 'Off'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="bg-zinc-800/40 rounded-xl p-3 border border-zinc-700/30">
                <div className="flex items-center gap-2 mb-2">
                  <Database className="w-3.5 h-3.5 text-zinc-400" />
                  <span className="text-sm font-medium">Storage</span>
                </div>
                <div className="space-y-1 text-xs text-zinc-400">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Type:</span>
                    <span>{storageStatus.type === 'sqlite' ? 'SQLite' : storageStatus.type === 'json' ? 'JSON' : 'None'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Records:</span>
                    <span>{storageStatus.logCount.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="bg-zinc-800/40 rounded-xl p-3 border border-zinc-700/30">
                <div className="flex items-center gap-2 mb-2">
                  <Download className="w-3.5 h-3.5 text-zinc-400" />
                  <span className="text-sm font-medium">Export</span>
                </div>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => onExportData('csv')}
                    className="flex-1 px-2 py-1.5 bg-zinc-700/50 hover:bg-zinc-700 rounded-md text-xs font-medium transition"
                  >
                    CSV
                  </button>
                  <button
                    onClick={() => onExportData('json')}
                    className="flex-1 px-2 py-1.5 bg-zinc-700/50 hover:bg-zinc-700 rounded-md text-xs font-medium transition"
                  >
                    JSON
                  </button>
                </div>
              </div>
            </div>
          </GlassCard>
        </div>
      )}

      {activeTab === 'tracking' && (
        <div className="space-y-4">
          <GlassCard className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold mb-1">Tracking Settings</h2>
              <p className="text-xs text-zinc-500">Configure how app usage is tracked</p>
            </div>

            <div className="flex items-center justify-between py-2">
              <div>
                <label className="text-sm font-medium text-zinc-300">Ignore Transient System Apps</label>
                <p className="text-xs text-zinc-500">Filter out brief system windows (Explorer, task switcher) from tracking</p>
              </div>
              <button
                onClick={async () => {
                  const newVal = !filterTransientApps;
                  setFilterTransientApps(newVal);
                  if (window.deskflowAPI?.setPreference) {
                    await window.deskflowAPI.setPreference('filterTransientApps', newVal);
                  }
                }}
                className={`relative w-11 h-6 rounded-full transition-colors ${filterTransientApps ? 'bg-emerald-500' : 'bg-zinc-700'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${filterTransientApps ? 'translate-x-5' : ''}`} />
              </button>
            </div>

            <div className="flex items-center justify-between py-2">
              <div>
                <label className="text-sm font-medium text-zinc-300">Website Background Recording</label>
                <p className="text-xs text-zinc-500">When OFF, website logs only appear while Browser Activity page is open</p>
              </div>
              <button
                onClick={async () => {
                  const newMode = browserRecordingMode === 'always' ? 'on-view' : 'always';
                  setBrowserRecordingMode(newMode);
                  if (window.deskflowAPI?.setRecordingMode) {
                    await window.deskflowAPI.setRecordingMode('browser', newMode);
                  }
                }}
                className={`relative w-11 h-6 rounded-full transition-colors ${browserRecordingMode === 'always' ? 'bg-emerald-500' : 'bg-zinc-700'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${browserRecordingMode === 'always' ? 'translate-x-5' : ''}`} />
              </button>
            </div>

            <div className="flex items-center justify-between py-2">
              <div>
                <label className="text-sm font-medium text-zinc-300">App Background Recording</label>
                <p className="text-xs text-zinc-500">When OFF, app logs only appear while Dashboard is open</p>
              </div>
              <button
                onClick={async () => {
                  const newMode = appRecordingMode === 'always' ? 'on-view' : 'always';
                  setAppRecordingMode(newMode);
                  if (window.deskflowAPI?.setRecordingMode) {
                    await window.deskflowAPI.setRecordingMode('app', newMode);
                  }
                }}
                className={`relative w-11 h-6 rounded-full transition-colors ${appRecordingMode === 'always' ? 'bg-emerald-500' : 'bg-zinc-700'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${appRecordingMode === 'always' ? 'translate-x-5' : ''}`} />
              </button>
            </div>

            <div className="pt-4 border-t border-zinc-700/50"></div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-zinc-300">Sleep Gap Detection</label>
                  <p className="text-xs text-zinc-500">Time before app is considered "sleep"</p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={sleepGapMs}
                    onChange={(e) => setSleepGapMs(parseInt(e.target.value) || 10000)}
                    className="w-24 px-2 py-1 text-sm bg-zinc-800 border border-zinc-700 rounded text-white text-right font-mono"
                  />
                  <span className="text-xs text-zinc-500">ms</span>
                </div>
              </div>
              <div className="flex gap-2">
                {[5000, 10000, 15000, 30000].map(ms => (
                  <button
                    key={ms}
                    onClick={() => { setSleepGapMs(ms); handleSaveTrackingSetting('sleep_gap_ms', ms); }}
                    className={`px-3 py-1 rounded text-xs font-medium transition ${sleepGapMs === ms ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-zinc-800/50 border border-zinc-700/50 text-zinc-400 hover:text-white'}`}
                  >
                    {ms / 1000}s
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-zinc-300">Max Session Duration</label>
                  <p className="text-xs text-zinc-500">Maximum app session length</p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={maxSessionMs}
                    onChange={(e) => setMaxSessionMs(parseInt(e.target.value) || 300000)}
                    className="w-24 px-2 py-1 text-sm bg-zinc-800 border border-zinc-700 rounded text-white text-right font-mono"
                  />
                  <span className="text-xs text-zinc-500">ms</span>
                </div>
              </div>
              <div className="flex gap-2">
                {[60000, 180000, 300000, 600000].map(ms => (
                  <button
                    key={ms}
                    onClick={() => { setMaxSessionMs(ms); handleSaveTrackingSetting('max_session_ms', ms); }}
                    className={`px-3 py-1 rounded text-xs font-medium transition ${maxSessionMs === ms ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-zinc-800/50 border border-zinc-700/50 text-zinc-400 hover:text-white'}`}
                  >
                    {ms === 60000 ? '1m' : ms === 180000 ? '3m' : ms === 300000 ? '5m' : '10m'}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-zinc-700/50 grid grid-cols-2 gap-4 text-xs">
              <div className="bg-zinc-800/50 rounded-lg p-3">
                <div className="text-zinc-500 mb-1">Sleep Gap</div>
                <div className="text-white font-mono">{(sleepGapMs / 1000).toFixed(1)}s</div>
              </div>
              <div className="bg-zinc-800/50 rounded-lg p-3">
                <div className="text-zinc-500 mb-1">Max Session</div>
                <div className="text-white font-mono">{(maxSessionMs / 60000).toFixed(1)}m</div>
              </div>
            </div>
          </GlassCard>

          {/* Prompt History Settings */}
          <GlassCard>
            <h2 className="text-lg font-semibold mb-3">Prompt History</h2>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-zinc-400 mb-2 block">Visible Prompts</label>
                <p className="text-xs text-zinc-500 mb-2">Number of recent prompts shown in the terminal sidebar history tab. Older prompts are hidden but can be expanded.</p>
                <div className="flex gap-2 flex-wrap">
                  {[3, 5, 10, 20, 50, 100].map(n => (
                    <button
                      key={n}
                      onClick={() => {
                        setPromptHistoryLimit(n);
                        window.deskflowAPI?.setPreference?.('promptHistoryLimit', n);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                        promptHistoryLimit === n
                          ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                          : 'bg-zinc-800/50 border border-zinc-700/50 text-zinc-400 hover:text-white'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-500">Custom:</span>
                <input
                  type="number"
                  min={1}
                  max={999}
                  value={promptHistoryLimit}
                  onChange={(e) => {
                    const v = Math.max(1, parseInt(e.target.value) || 5);
                    setPromptHistoryLimit(v);
                    window.deskflowAPI?.setPreference?.('promptHistoryLimit', v);
                  }}
                  className="w-20 px-2 py-1 text-sm bg-zinc-800 border border-zinc-700 rounded text-white text-right font-mono"
                />
              </div>
            </div>
          </GlassCard>
        </div>
      )}

      {activeTab === 'prompts' && (
        <div className="space-y-4">
          <GlassCard>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold">System Prompts</h2>
                <p className="text-xs text-zinc-500">General prompts apply to all projects. Project-specific prompts can be set in each workspace.</p>
              </div>
            </div>

            {/* Default prompt preview */}
            <details className="mb-4 group">
              <summary className="text-sm font-medium text-zinc-400 hover:text-zinc-300 cursor-pointer select-none list-none flex items-center gap-2">
                <ChevronRight className="w-3.5 h-3.5 transition-transform group-open:rotate-90" />
                Default Prompt (always prepended)
              </summary>
              <div className="mt-2 bg-zinc-900/80 rounded-lg border border-zinc-700/50 p-3 max-h-48 overflow-y-auto">
                <pre className="text-[11px] text-zinc-400 font-mono whitespace-pre-wrap">{DEFAULT_SYSTEM_PROMPT}</pre>
              </div>
            </details>

            {['claude', 'opencode', 'custom'].map(agent => {
              const additions = systemPrompts[agent] || '';
              const merged = additions ? `${DEFAULT_SYSTEM_PROMPT}\n\n## Additional Instructions\n${additions}` : DEFAULT_SYSTEM_PROMPT;
              return (
                <div key={agent} className="mb-4 p-4 bg-zinc-800/40 rounded-xl border border-zinc-700/30">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-zinc-300 capitalize">{agent === 'custom' ? 'Custom AI' : agent}</label>
                    <button
                      onClick={() => handleSaveSystemPrompt(agent, '')}
                      className="px-2 py-1 text-xs bg-zinc-700 hover:bg-zinc-600 text-zinc-400 rounded transition-colors"
                    >
                      Clear additions
                    </button>
                  </div>
                  <textarea
                    value={additions}
                    onChange={(e) => setSystemPrompts(prev => ({ ...prev, [agent]: e.target.value }))}
                    onBlur={() => handleSaveSystemPrompt(agent, systemPrompts[agent])}
                    placeholder="Add instructions that will be appended to the default prompt..."
                    rows={4}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-300 font-mono placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-colors duration-150"
                  />
                  <div className="flex justify-between mt-1">
                    <span className="text-[10px] text-zinc-600">Additions: {additions.length} chars | Merged: {merged.length} chars</span>
                    <button
                      onClick={() => handleSaveSystemPrompt(agent, systemPrompts[agent])}
                      className="px-2 py-0.5 text-[10px] bg-cyan-600 hover:bg-cyan-500 text-white rounded transition-colors"
                    >
                      Save
                    </button>
                  </div>
                  <details className="mt-2 group">
                    <summary className="text-[11px] text-zinc-600 hover:text-zinc-500 cursor-pointer select-none list-none flex items-center gap-1">
                      <ChevronRight className="w-3 h-3 transition-transform group-open:rotate-90" />
                      Preview merged prompt
                    </summary>
                    <div className="mt-1 bg-zinc-900/80 rounded-lg border border-zinc-700/50 p-2 max-h-32 overflow-y-auto">
                      <pre className="text-[10px] text-zinc-500 font-mono whitespace-pre-wrap">{merged}</pre>
                    </div>
                  </details>
                </div>
              );
            })}
          </GlassCard>

          <GlassCard>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold">Agent Resume Commands</h2>
                <p className="text-xs text-zinc-500">Template for resuming AI agent sessions. Use <code className="text-cyan-400">{'{agent}'}</code> and <code className="text-cyan-400">{'{resumeId}'}</code> as placeholders.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {AGENTS.map(agent => {
                const cmd = resumeCommands[agent] || DEFAULT_RESUME_COMMANDS[agent] || '{agent} -s {resumeId}';
                return (
                  <div key={agent} className="p-3 bg-zinc-800/40 rounded-xl border border-zinc-700/30">
                    <label className="text-sm font-medium text-zinc-300 capitalize block mb-1.5">{agent}</label>
                    <div className="flex gap-2">
                      <input
                        value={cmd}
                        onChange={(e) => setResumeCommands(prev => ({ ...prev, [agent]: e.target.value }))}
                        onBlur={() => handleSaveResumeCommand(agent, resumeCommands[agent] || DEFAULT_RESUME_COMMANDS[agent] || '{agent} -s {resumeId}')}
                        placeholder="{agent} -s {resumeId}"
                        className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-zinc-300 font-mono placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-colors duration-150"
                      />
                      <button
                        onClick={() => handleSaveResumeCommand(agent, resumeCommands[agent] || DEFAULT_RESUME_COMMANDS[agent] || '{agent} -s {resumeId}')}
                        className="px-2.5 py-1.5 text-xs bg-cyan-600 hover:bg-cyan-500 text-white rounded transition-colors shrink-0"
                      >
                        Save
                      </button>
                    </div>
                    <p className="text-[10px] text-zinc-600 mt-1">
                      Result: <code className="text-emerald-400">{cmd.replace('{agent}', agent).replace('{resumeId}', 'abc123')}</code>
                    </p>
                  </div>
                );
              })}
            </div>
          </GlassCard>
        </div>
      )}

      {activeTab === 'colors' && (
        <div className="space-y-4">
          {/* Category Colors Section */}
          <GlassCard>
            <SectionHeader
              title="Category Colors"
              icon={<Palette className="w-5 h-5" />}
            />
            <p className="text-xs text-zinc-500 mb-4">Solar system colors</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
              {Object.keys(CATEGORY_COLORS).map((category) => (
                <div key={category} className="flex items-center gap-2 p-2.5 bg-zinc-800/40 hover:bg-zinc-800/70 rounded-lg border border-zinc-700/30 hover:border-zinc-600 transition-colors duration-150 group">
                  <ColorPicker 
                    value={getCategoryColor(category)} 
                    onChange={(color) => handleCategoryColorChange(category, color)}
                    size="sm"
                  />
                  <span className="text-sm text-zinc-300 group-hover:text-white font-medium truncate">{category}</span>
                </div>
              ))}
            </div>
          </GlassCard>

          {/* App/Website Colors Section */}
          <GlassCard>
            <SectionHeader
              title={`${colorTab === 'apps' ? 'Application' : 'Website'} Colors`}
              icon={<Palette className="w-5 h-5" />}
              action={
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-500 bg-zinc-800/50 px-2 py-1 rounded-md">
                    {(colorTab === 'apps' ? appStats : domainStats).length} {colorTab}
                  </span>
                  <button
                  onClick={async () => {
                    setPreAiColors({ ...localAppColors });
                    setGeneratingColors(true);
                    try {
                      const appsToColor = colorTab === 'apps' 
                        ? appStats.map((a: any) => a.app)
                        : domainStats.map((d: any) => d.domain);
                      if (window.deskflowAPI?.generateAIColors) {
                        const generated = await window.deskflowAPI.generateAIColors(appsToColor);
                        // Apply all generated colors in single state update
                        const validColors: Record<string, string> = {};
                        Object.entries(generated).forEach(([appName, color]) => {
                          if (color && typeof color === 'string' && color.startsWith('#')) {
                            validColors[appName] = color;
                          }
                        });
                        setLocalAppColors(prev => ({ ...prev, ...validColors }));
                        setHasChanges(true);
                        onHasChangesChange(true);
                        setGeneratingColors(false);
                      }
                    } catch (err) {
                      console.error('Magic Color failed:', err);
                      setGeneratingColors(false);
                    }
                  }}
                  disabled={generatingColors}
                  className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 hover:border-zinc-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors duration-150 flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {generatingColors ? 'Generating...' : 'Magic Color'}
                </button>
              </div>
              }
            />
            <p className="text-xs text-zinc-500 mb-3">Individual colors</p>

            {/* Apps/Websites Toggle */}
            <div className="flex gap-1 bg-zinc-900/50 p-1 rounded-xl mb-4 w-fit">
              <button
                onClick={() => setColorTab('apps')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors duration-150 ${
                  colorTab === 'apps' 
                    ? 'bg-zinc-800 text-white shadow-sm' 
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                }`}
              >
                Apps
              </button>
              <button
                onClick={() => setColorTab('websites')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors duration-150 ${
                  colorTab === 'websites' 
                    ? 'bg-zinc-800 text-white shadow-sm' 
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                }`}
              >
                Websites
              </button>
            </div>

            {/* Search Filter */}
            <div className="mb-4 relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                placeholder={`Search ${colorTab}...`}
                value={colorSearchFilter}
                onChange={(e) => setColorSearchFilter(e.target.value)}
                className="w-full sm:w-64 pl-8 pr-3 py-2 text-sm bg-zinc-800/50 border border-zinc-700/50 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
              />
            </div>

            {/* Responsive Grid Layout - ALL Items */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {(colorTab === 'apps' ? appStats : domainStats)
                .filter((item: any) => colorSearchFilter === '' || (colorTab === 'apps' ? item.app : item.domain).toLowerCase().includes(colorSearchFilter.toLowerCase()))
                .map((item: any) => {
                  const name = colorTab === 'apps' ? item.app : item.domain;
                  const color = localAppColors[name] || '#888888';
                  const category = colorTab === 'apps' ? item.category : (item.category || 'Other');
                  const categoryColor = getCategoryColor(category);
                  return (
                    <div key={name} className="relative flex flex-col p-3 bg-zinc-800/40 hover:bg-zinc-800/70 rounded-xl border border-zinc-700/30 hover:border-zinc-600 transition-colors duration-150 group">
                      {/* Individual AI Sparkle Button */}
                      <button
                        onClick={async () => {
                          try {
                            if (window.deskflowAPI?.generateAIColors) {
                              const generated = await window.deskflowAPI.generateAIColors([name]);
                              if (generated[name]) {
                                handleAppColorChange(name, generated[name]);
                              }
                            }
                          } catch (err) {
                            console.error('Individual AI color failed:', err);
                          }
                        }}
                        className="absolute top-2 right-2 p-1 rounded bg-white/10 hover:bg-white/20 text-white/40 hover:text-white transition-colors duration-150 opacity-60 hover:opacity-100 z-10"
                        title="AI Color"
                      >
                        <Sparkles className="w-3 h-3" />
                      </button>
                      
                      {/* Color Bar at Top */}
                      <div className="mb-2">
                        <ColorPicker 
                          value={color} 
                          onChange={(newColor) => handleAppColorChange(name, newColor)}
                          size="sm"
                        />
                      </div>
                      
                      {/* App Name */}
                      <div className="text-xs text-zinc-300 group-hover:text-white font-medium truncate mb-1 pr-5">{name}</div>
                      
                      {/* Category Badge */}
                      <span 
                        className="text-[10px] px-1.5 py-0.5 rounded-md self-start"
                        style={{ backgroundColor: `${categoryColor}20`, color: categoryColor }}
                      >
                        {category}
                      </span>
                    </div>
                  );
                })}
            </div>
          </GlassCard>
        </div>
      )}

      {activeTab === 'ai' && (
        <div className="space-y-4">
          <GlassCard className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold mb-1">AI Assistant</h2>
              <p className="text-xs text-zinc-500">Configure AI briefing, weekly review, and research features</p>
            </div>

            {/* API Key */}
            <div>
              <label className="text-sm font-medium text-zinc-400 mb-2 block">OpenRouter API Key</label>
              <div className="relative">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  placeholder="sk-or-v1-..."
                  value={openRouterApiKey}
                  onChange={(e) => {
                    setOpenRouterApiKey(e.target.value);
                    setApiKeyTestStatus('idle');
                    setHasChanges(true);
                    onHasChangesChange(true);
                  }}
                  className="w-full px-3 py-2 text-sm bg-zinc-800/50 border border-zinc-700/50 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 font-mono pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(prev => !prev)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-zinc-500 hover:text-zinc-300 transition-colors"
                  tabIndex={-1}
                >
                  {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-zinc-500 mt-1.5">All AI features use this key. Must be an OpenRouter API key.</p>
              <div className="flex items-center gap-2 mt-2">
                <button
                  onClick={async () => {
                    if (!openRouterApiKey) {
                      setApiKeyTestStatus('error');
                      setApiKeyTestMessage('Please enter an API key first');
                      return;
                    }
                    setApiKeyTestStatus('testing');
                    setApiKeyTestMessage('Testing connection...');
                    try {
                      if (window.deskflowAPI?.setPreference) {
                        await window.deskflowAPI.setPreference('openrouterApiKey', openRouterApiKey);
                      }
                      const result = await window.deskflowAPI?.testOpenRouterKey?.();
                      if (result?.success) {
                        setApiKeyTestStatus('success');
                        setApiKeyTestMessage(`Connected! Model: ${result.model || 'OK'}`);
                      } else {
                        setApiKeyTestStatus('error');
                        setApiKeyTestMessage(result?.error || 'Connection failed');
                      }
                    } catch (err: any) {
                      setApiKeyTestStatus('error');
                      setApiKeyTestMessage(err.message || 'Test failed');
                    }
                  }}
                  disabled={apiKeyTestStatus === 'testing'}
                  className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 hover:border-zinc-500 disabled:opacity-50 text-white rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5"
                >
                  {apiKeyTestStatus === 'testing' ? 'Testing...' : 'Test Connection'}
                </button>
                {apiKeyTestStatus === 'success' && (
                  <span className="text-xs text-emerald-400 flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    {apiKeyTestMessage}
                  </span>
                )}
                {apiKeyTestStatus === 'error' && (
                  <span className="text-xs text-red-400 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    {apiKeyTestMessage}
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-500 mt-1.5">Any OpenRouter-compatible model slug works — paste the full slug (e.g. <code className="text-zinc-400">openai/gpt-4o</code>)</p>
            </div>

            <div className="pt-4 border-t border-zinc-700/50" />

            {/* Brief Model — open-ended text input */}
            <div>
              <label className="text-sm font-medium text-zinc-400 mb-2 block">Brief Generation Model</label>
              <input
                type="text"
                value={aiConfig.briefModel}
                onChange={(e) => {
                  setAiConfig(prev => ({ ...prev, briefModel: e.target.value }));
                  setHasChanges(true);
                  onHasChangesChange(true);
                }}
                placeholder="google/gemini-2.0-flash-001"
                className="w-full px-3 py-2 text-sm bg-zinc-800/50 border border-zinc-700/50 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 font-mono"
              />
              <p className="text-xs text-zinc-500 mt-1">Used for daily briefs and anomaly detection. Any OpenRouter model slug.</p>
            </div>

            {/* Weekly & Digest Model — open-ended text input */}
            <div>
              <label className="text-sm font-medium text-zinc-400 mb-2 block">Weekly & Digest Model</label>
              <input
                type="text"
                value={aiConfig.weeklyModel}
                onChange={(e) => {
                  setAiConfig(prev => ({ ...prev, weeklyModel: e.target.value }));
                  setHasChanges(true);
                  onHasChangesChange(true);
                }}
                placeholder="deepseek/deepseek-chat-v3-0324"
                className="w-full px-3 py-2 text-sm bg-zinc-800/50 border border-zinc-700/50 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 font-mono"
              />
              <p className="text-xs text-zinc-500 mt-1">Used for weekly reviews and topic research digests. Any OpenRouter model slug.</p>
            </div>

            <div className="flex items-center justify-between py-2">
              <div>
                <label className="text-sm font-medium text-zinc-300">Auto-generate daily brief on start</label>
                <p className="text-xs text-zinc-500">Generate a daily briefing in the background when the app opens</p>
              </div>
              <button
                onClick={() => {
                  setAiConfig(prev => ({ ...prev, autoGenerateBrief: !prev.autoGenerateBrief }));
                  setHasChanges(true);
                  onHasChangesChange(true);
                }}
                className={`relative w-11 h-6 rounded-full transition-colors ${aiConfig.autoGenerateBrief ? 'bg-violet-500' : 'bg-zinc-700'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${aiConfig.autoGenerateBrief ? 'translate-x-5' : ''}`} />
              </button>
            </div>

            <div className="pt-4 border-t border-zinc-700/50" />

            {/* Interest Topics */}
            <div>
              <label className="text-sm font-medium text-zinc-400 mb-2 block">Research Topics</label>
              <p className="text-xs text-zinc-500 mb-3">Topics you want AI to research daily digests for</p>
              <div className="flex items-center gap-2 mb-3">
                <input
                  type="text"
                  value={newTopic}
                  onChange={(e) => setNewTopic(e.target.value)}
                  onKeyDown={async (e) => {
                    if (e.key === 'Enter' && newTopic.trim()) {
                      const topic = newTopic.trim();
                      if (window.deskflowAPI?.addInterestTopic) {
                        await window.deskflowAPI.addInterestTopic(topic);
                      }
                      setInterestTopics(prev => [...prev, topic]);
                      setNewTopic('');
                      setHasChanges(true);
                      onHasChangesChange(true);
                    }
                  }}
                  placeholder="e.g., Artificial Intelligence"
                  className="flex-1 px-3 py-2 text-sm bg-zinc-800/50 border border-zinc-700/50 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
                />
                <button
                  onClick={async () => {
                    if (newTopic.trim()) {
                      const topic = newTopic.trim();
                      if (window.deskflowAPI?.addInterestTopic) {
                        await window.deskflowAPI.addInterestTopic(topic);
                      }
                      setInterestTopics(prev => [...prev, topic]);
                      setNewTopic('');
                    }
                  }}
                  disabled={!newTopic.trim()}
                  className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 disabled:opacity-40 text-white rounded-lg text-xs font-medium transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {interestTopics.map((topic, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium"
                    style={{ backgroundColor: 'rgba(139, 92, 246, 0.1)', color: '#a78bfa', border: '1px solid rgba(139, 92, 246, 0.2)' }}
                  >
                    {topic}
                    <button
                      onClick={async () => {
                        if (window.deskflowAPI?.removeInterestTopic) {
                          await window.deskflowAPI.removeInterestTopic(topic);
                        }
                        setInterestTopics(prev => prev.filter(t => t !== topic));
                      }}
                      className="ml-0.5 hover:text-white transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
                {interestTopics.length === 0 && (
                  <p className="text-xs text-zinc-500 italic">No topics added yet</p>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-zinc-700/50" />

            {/* Usage Stats */}
            <div>
              <label className="text-sm font-medium text-zinc-400 mb-2 block">Usage</label>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-zinc-800/40 rounded-xl p-3 border border-zinc-700/30">
                  <div className="text-xs text-zinc-500 mb-1">Total API Calls</div>
                  <div className="text-lg font-semibold text-white">{aiUsageStats.totalCalls}</div>
                </div>
                <div className="bg-zinc-800/40 rounded-xl p-3 border border-zinc-700/30">
                  <div className="text-xs text-zinc-500 mb-1">Estimated Cost</div>
                  <div className="text-lg font-semibold text-white">${aiUsageStats.totalCost.toFixed(4)}</div>
                </div>
              </div>
            </div>
          </GlassCard>
        </div>
      )}

      {/* Discord-style Bottom Save Bar */}
      <AnimatePresence>
        {hasChanges && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-zinc-900/95 backdrop-blur-md border-t border-zinc-700/50 shadow-black/50"
          >
            <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                <span className="text-sm text-zinc-300">You have unsaved changes</span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    // Reset all changes to original state
                    setTierAssignments(() => {
                      if (typeof window !== 'undefined') {
                        const saved = localStorage.getItem('deskflow-tier-assignments');
                        if (saved) {
                          try { return JSON.parse(saved); } catch { /* ignore */ }
                        }
                      }
                      return DEFAULT_TIER_ASSIGNMENTS;
                    });
                    setLocalAppColors(() => {
                      if (typeof window !== 'undefined') {
                        const saved = localStorage.getItem('deskflow-planet-colors');
                        if (saved) {
                          try { return JSON.parse(saved); } catch { /* ignore */ }
                        }
                      }
                      return appColors;
                    });
                    setLocalCategoryOrder(categoryOrder);
                    setAppCategoryOverrides({});
                    setDomainCategoryOverrides({});
                    setHasChanges(false);
                    onHasChangesChange(false);
                  }}
                  className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white transition-colors"
                >
                  Discard
                </button>
                <button
                  onClick={saveChanges}
                  className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-white rounded-lg text-sm font-medium transition-colors duration-150 shadow-emerald-500/25 flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  OK
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </PageShell>
  );
}