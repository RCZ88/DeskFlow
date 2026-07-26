import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronRight, Check, Edit3, Plus, Minus, Play, X,
  BookOpen, Dumbbell, Activity, Moon, Utensils, Coffee, Bus, Book, Timer, Sun
} from 'lucide-react';
import { BorderBeam } from '../../components/ui/border-beam';

interface ExternalActivity {
  id: number;
  name: string;
  type: 'stopwatch' | 'sleep' | 'checkin';
  color: string;
  icon: string;
  is_productive: boolean;
}

const ACTIVITY_ICONS: Record<string, any> = {
  BookOpen, Dumbbell, Activity, Moon, Utensils, Coffee, Bus, Book, Sun, Timer
};

interface PinnedActivitiesProps {
  pinnedActivities: ExternalActivity[];
  setPinnedActivities: React.Dispatch<React.SetStateAction<ExternalActivity[]>>;
  activities: ExternalActivity[];
  selectedExternalActivity: ExternalActivity | null;
  setSelectedExternalActivity: React.Dispatch<React.SetStateAction<ExternalActivity | null>>;
  handleSelectExternalActivity: (activity: ExternalActivity) => void;
  externalSessionRunning: boolean;
  formatDuration: (ms: number) => string;
  externalElapsedMs: number;
  handleStartExternalSession: () => void;
  handleStopExternalSession: () => void;
  collapsible?: boolean; // New prop for RESULT.md
}

export function PinnedActivities({
  pinnedActivities,
  setPinnedActivities,
  activities,
  selectedExternalActivity,
  setSelectedExternalActivity,
  handleSelectExternalActivity,
  externalSessionRunning,
  formatDuration,
  externalElapsedMs,
  handleStartExternalSession,
  handleStopExternalSession,
  collapsible = false,
}: PinnedActivitiesProps) {
  const [pinnedActivitiesExpanded, setPinnedActivitiesExpanded] = useState(true);
  const [pinnedActivitiesEditMode, setPinnedActivitiesEditMode] = useState(false);
  const [showAddActivityModal, setShowAddActivityModal] = useState(false);
  const [addPinnedPicker, setAddPinnedPicker] = useState<ExternalActivity[]>([]);
  const [selectedAddActivities, setSelectedAddActivities] = useState<Set<number>>(new Set());

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="rounded-xl p-5 border backdrop-blur-sm mb-12 bg-zinc-950/80 border-zinc-500/20"
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => collapsible ? setPinnedActivitiesExpanded(!pinnedActivitiesExpanded) : null}
            className="flex items-center gap-2 flex-1 text-left"
          >
            {collapsible && <ChevronRight className={`w-4 h-4 text-zinc-400 transition-transform ${pinnedActivitiesExpanded ? 'rotate-90' : ''}`} />}
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">Pinned Activities</h2>
              <p className="text-xs text-zinc-600 mt-1">Quick manual tracking</p>
            </div>
          </button>
          <button
            onClick={() => setPinnedActivitiesEditMode(!pinnedActivitiesEditMode)}
            className={`p-2 rounded-lg border transition-colors duration-150 ${
              pinnedActivitiesEditMode
                ? 'bg-emerald-500/20 border-emerald-500/50'
                : 'bg-zinc-500/10 border-zinc-500/20 hover:border-zinc-500/30'
            }`}
          >
            {pinnedActivitiesEditMode ? (
              <Check className="w-4 h-4 text-emerald-400" />
            ) : (
              <Edit3 className="w-4 h-4 text-zinc-400" />
            )}
          </button>
        </div>

        {pinnedActivitiesExpanded && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {pinnedActivities.map((activity) => {
            const Icon = ACTIVITY_ICONS[activity.icon] || Timer;
            const isSelected = selectedExternalActivity?.id === activity.id;
            
            return (
              <motion.div key={activity.id} className="relative">
                {isSelected && (
                  <BorderBeam
                    size={50}
                    duration={6}
                    colorFrom="#10b981"
                    colorTo="#34d399"
                    borderWidth={1.5}
                  />
                )}
                <motion.button
                  onClick={() => {
                    if (pinnedActivitiesEditMode) {
                      setPinnedActivities(prev => prev.filter(a => a.id !== activity.id));
                    } else if (isSelected) {
                      setSelectedExternalActivity(null);
                    } else {
                      handleSelectExternalActivity(activity);
                    }
                  }}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className={`w-full rounded-xl border transition-all duration-200 text-center overflow-hidden ${
                    isSelected
                      ? 'border-emerald-500/50'
                      : 'bg-zinc-500/10 border-zinc-500/20 hover:border-zinc-500/40 hover:bg-zinc-500/15'
                  }`}
                  style={{
                    padding: isSelected ? '12px 12px 8px' : '16px 12px',
                    background: isSelected
                      ? 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(6,95,70,0.10))'
                      : undefined,
                    boxShadow: isSelected
                      ? '0 0 24px rgba(16,185,129,0.12), inset 0 1px 0 rgba(16,185,129,0.20)'
                      : undefined,
                  }}
                >
                  {isSelected && externalSessionRunning && (
                    <div className="flex items-center justify-center gap-1.5 mb-1.5">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                      <span className="text-[10px] font-medium text-emerald-400/80 uppercase tracking-wider">Tracking</span>
                    </div>
                  )}
                  <Icon
                    className={`w-6 h-6 mx-auto mb-1.5 transition-colors duration-200 ${
                      isSelected
                        ? 'text-emerald-400'
                        : activity.is_productive ? 'text-emerald-500' : 'text-indigo-500'
                    }`}
                  />
                  <div className="text-xs font-semibold transition-colors duration-200 text-white">
                    {activity.name}
                  </div>
                  {isSelected && externalSessionRunning && (
                    <div className="text-lg font-mono font-bold text-emerald-400 mt-1.5 tabular-nums">
                      {formatDuration(externalElapsedMs)}
                    </div>
                  )}
                  {isSelected && !externalSessionRunning && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStartExternalSession();
                      }}
                      className="mt-2 mb-0.5 inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-semibold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/25 hover:border-emerald-500/40 transition-all duration-150 cursor-pointer"
                    >
                      <Play className="w-2.5 h-2.5 fill-current" />
                      Start
                    </button>
                  )}
                </motion.button>
                {isSelected && externalSessionRunning && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStopExternalSession();
                    }}
                    className="absolute -bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 px-3 py-1 rounded-full bg-red-500/90 text-white text-[10px] font-semibold uppercase tracking-wider shadow-lg shadow-red-500/20 hover:bg-red-500 transition-colors duration-150 whitespace-nowrap"
                  >
                    Stop
                  </motion.button>
                )}
                {pinnedActivitiesEditMode && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setPinnedActivities(prev => prev.filter(a => a.id !== activity.id));
                    }}
                    className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 flex items-center justify-center"
                  >
                    <Minus className="w-3 h-3 text-white" />
                  </button>
                )}
              </motion.div>
            );
          })}
          
          {/* Add activity button in edit mode */}
          {pinnedActivitiesEditMode && pinnedActivities.length < 6 && (
            <motion.button
              onClick={() => {
                const available = activities.filter(a => !pinnedActivities.find(p => p.id === a.id));
                if (available.length === 0) return;
                if (available.length === 1) {
                  setPinnedActivities(prev => [...prev, available[0]]);
                } else {
                  setAddPinnedPicker(available);
                  setSelectedAddActivities(new Set());
                  setShowAddActivityModal(true);
                }
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-full p-4 rounded-lg border border-dashed transition-colors duration-150 text-center"
              style={{
                backgroundColor: 'rgba(107, 114, 128, 0.05)',
                borderColor: 'rgba(107, 114, 128, 0.3)'
              }}
            >
              <Plus className="w-6 h-6 mx-auto mb-2 text-zinc-500" />
              <div className="text-xs font-semibold text-zinc-500">Add</div>
            </motion.button>
          )}
          
        </div>
      )}
      </div>

      {/* Add Activity Modal */}
     <AnimatePresence>
       {showAddActivityModal && (
         <motion.div
           initial={{ opacity: 0 }}
           animate={{ opacity: 1 }}
           exit={{ opacity: 0 }}
           className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
           onClick={() => { setShowAddActivityModal(false); setAddPinnedPicker([]); setSelectedAddActivities(new Set()); }}
         >
           <motion.div
             initial={{ scale: 0.92, opacity: 0, y: 10 }}
             animate={{ scale: 1, opacity: 1, y: 0 }}
             exit={{ scale: 0.92, opacity: 0, y: 10 }}
             className="rounded-xl border overflow-hidden w-full max-w-sm bg-zinc-950/98 border-zinc-500/15 shadow-[0_25px_60px_rgba(0,0,0,0.5)]"
             onClick={(e) => e.stopPropagation()}
           >
              <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-zinc-500/10">
               <div>
                 <h3 className="text-base font-semibold text-zinc-100">Pin Activities</h3>
                 <p className="text-xs text-zinc-500 mt-0.5">Select activities to add to dashboard</p>
               </div>
               <button
                 onClick={() => { setShowAddActivityModal(false); setAddPinnedPicker([]); setSelectedAddActivities(new Set()); }}
                 className="p-1.5 hover:bg-zinc-800 rounded-lg transition-colors"
               >
                 <X className="w-4 h-4 text-zinc-500" />
               </button>
             </div>

             <div className="px-2 py-2 max-h-72 overflow-y-auto">
               {addPinnedPicker.map(activity => {
                 const isSelected = selectedAddActivities.has(activity.id);
                 return (
                   <button
                     key={activity.id}
                     onClick={() => {
                       const next = new Set(selectedAddActivities);
                       if (isSelected) {
                         next.delete(activity.id);
                       } else {
                         next.add(activity.id);
                       }
                       setSelectedAddActivities(next);
                     }}
                     className={`w-full px-3 py-3 text-left text-sm rounded-xl flex items-center gap-3 transition-colors duration-150 ${
                       isSelected
                         ? 'bg-emerald-500/10'
                         : 'hover:bg-zinc-800/50'
                     }`}
                   >
                     <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors duration-150 ${
                       isSelected
                         ? 'border-emerald-500 bg-emerald-500'
                         : 'border-zinc-600 bg-transparent'
                     }`}>
                       {isSelected && (
                         <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                           <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                         </svg>
                       )}
                     </div>
                     <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: activity.color }} />
                     <span className={`font-medium ${isSelected ? 'text-emerald-300' : 'text-zinc-300'}`}>
                       {activity.name}
                     </span>
                   </button>
                 );
               })}
             </div>

              <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-zinc-500/10">
               <button
                 onClick={() => { setShowAddActivityModal(false); setAddPinnedPicker([]); setSelectedAddActivities(new Set()); }}
                 className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-xl transition-colors duration-150"
               >
                 Cancel
               </button>
               <button
                 onClick={() => {
                   const selected = addPinnedPicker.filter(a => selectedAddActivities.has(a.id));
                   setPinnedActivities(prev => [...prev, ...selected]);
                   setShowAddActivityModal(false);
                   setAddPinnedPicker([]);
                   setSelectedAddActivities(new Set());
                 }}
                 disabled={selectedAddActivities.size === 0}
                  className={`px-5 py-2 text-sm font-semibold rounded-xl transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed ${
                    selectedAddActivities.size > 0
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      : 'bg-zinc-500/10 text-zinc-500 border border-zinc-500/20'
                  }`}
               >
                 {selectedAddActivities.size > 0
                   ? `Add (${selectedAddActivities.size})`
                   : 'Select activities'}
               </button>
             </div>
           </motion.div>
         </motion.div>
        )}
</AnimatePresence>
    </motion.div>
  );
}