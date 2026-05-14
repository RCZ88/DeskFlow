import { useState, useRef } from 'react';

interface DurationPickerProps {
  hours: number;
  minutes: number;
  onHoursChange: (h: number) => void;
  onMinutesChange: (m: number) => void;
  maxHours?: number;
  hourLabel?: string;
  minuteLabel?: string;
  showLabels?: boolean;
}

export function DurationPicker({
  hours,
  minutes,
  onHoursChange,
  onMinutesChange,
  maxHours = 23,
  hourLabel = 'Hour',
  minuteLabel = 'Min',
  showLabels = true,
}: DurationPickerProps) {
  const [editing, setEditing] = useState<'hours' | 'minutes' | null>(null);
  const [editValue, setEditValue] = useState('');
  const holdTimerRef = useRef<number | null>(null);
  const holdCountRef = useRef(0);

  const incHours = () => onHoursChange(Math.min(hours + 1, maxHours));
  const decHours = () => onHoursChange(Math.max(hours - 1, 0));
  const incMinutes = () => {
    if (minutes + 1 >= 60) {
      onMinutesChange(0);
      onHoursChange(Math.min(hours + 1, maxHours));
    } else {
      onMinutesChange(minutes + 1);
    }
  };
  const decMinutes = () => {
    if (minutes - 1 < 0) {
      onMinutesChange(59);
      onHoursChange(Math.max(hours - 1, 0));
    } else {
      onMinutesChange(minutes - 1);
    }
  };

  const startHold = (action: () => void) => {
    holdCountRef.current = 0;
    action();
    const scheduleNext = () => {
      holdCountRef.current++;
      action();
      const delay = Math.max(50, 300 - holdCountRef.current * 15);
      holdTimerRef.current = window.setTimeout(scheduleNext, delay);
    };
    holdTimerRef.current = window.setTimeout(scheduleNext, 400);
  };

  const stopHold = () => {
    if (holdTimerRef.current !== null) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    holdCountRef.current = 0;
  };

  const handleStartEdit = (field: 'hours' | 'minutes', currentValue: number) => {
    setEditing(field);
    setEditValue(currentValue.toString());
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (/^\d*$/.test(val)) {
      setEditValue(val);
    }
  };

  const handleEditBlur = () => {
    if (editing === 'hours') {
      const num = parseInt(editValue, 10);
      if (!isNaN(num)) {
        onHoursChange(Math.min(Math.max(num, 0), maxHours));
      }
    } else if (editing === 'minutes') {
      const num = parseInt(editValue, 10);
      if (!isNaN(num)) {
        onMinutesChange(Math.min(Math.max(num, 0), 59));
      }
    }
    setEditing(null);
  };

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleEditBlur();
    } else if (e.key === 'Escape') {
      setEditing(null);
    }
  };

  return (
    <div className="flex items-center justify-center gap-3">
      <div className="flex flex-col items-center gap-0.5">
        {showLabels && <span className="text-xs text-zinc-500 mb-0.5">{hourLabel}</span>}
        <button
          onMouseDown={() => startHold(incHours)}
          onMouseUp={stopHold}
          onMouseLeave={stopHold}
          onMouseOut={stopHold}
          className="w-14 h-7 bg-zinc-800 hover:bg-zinc-700 rounded-t-lg flex items-center justify-center text-zinc-400 transition-colors cursor-pointer"
        >
          <svg width="10" height="6" viewBox="0 0 10 6" fill="currentColor"><path d="M0 5L5 0L10 5H0Z"/></svg>
        </button>
        {editing === 'hours' ? (
          <input
            type="text"
            value={editValue}
            onChange={handleEditChange}
            onBlur={handleEditBlur}
            onKeyDown={handleEditKeyDown}
            autoFocus
            className="w-14 h-11 bg-zinc-800 border border-zinc-600 text-center text-xl font-mono text-zinc-100 outline-none"
          />
        ) : (
          <div
            onClick={() => handleStartEdit('hours', hours)}
            className="w-14 h-11 bg-zinc-800/50 border-y border-zinc-700/50 flex items-center justify-center select-none cursor-pointer hover:bg-zinc-800/70 transition-colors"
          >
            <span className="text-xl font-mono text-zinc-100">{hours.toString().padStart(2, '0')}</span>
          </div>
        )}
        <button
          onMouseDown={() => startHold(decHours)}
          onMouseUp={stopHold}
          onMouseLeave={stopHold}
          onMouseOut={stopHold}
          className="w-14 h-7 bg-zinc-800 hover:bg-zinc-700 rounded-b-lg flex items-center justify-center text-zinc-400 transition-colors cursor-pointer"
        >
          <svg width="10" height="6" viewBox="0 0 10 6" fill="currentColor"><path d="M0 1L5 6L10 1H0Z"/></svg>
        </button>
      </div>
      <span className="text-lg text-zinc-500 font-mono pt-5">:</span>
      <div className="flex flex-col items-center gap-0.5">
        {showLabels && <span className="text-xs text-zinc-500 mb-0.5">{minuteLabel}</span>}
        <button
          onMouseDown={() => startHold(incMinutes)}
          onMouseUp={stopHold}
          onMouseLeave={stopHold}
          onMouseOut={stopHold}
          className="w-14 h-7 bg-zinc-800 hover:bg-zinc-700 rounded-t-lg flex items-center justify-center text-zinc-400 transition-colors cursor-pointer"
        >
          <svg width="10" height="6" viewBox="0 0 10 6" fill="currentColor"><path d="M0 5L5 0L10 5H0Z"/></svg>
        </button>
        {editing === 'minutes' ? (
          <input
            type="text"
            value={editValue}
            onChange={handleEditChange}
            onBlur={handleEditBlur}
            onKeyDown={handleEditKeyDown}
            autoFocus
            className="w-14 h-11 bg-zinc-800 border border-zinc-600 text-center text-xl font-mono text-zinc-100 outline-none"
          />
        ) : (
          <div
            onClick={() => handleStartEdit('minutes', minutes)}
            className="w-14 h-11 bg-zinc-800/50 border-y border-zinc-700/50 flex items-center justify-center select-none cursor-pointer hover:bg-zinc-800/70 transition-colors"
          >
            <span className="text-xl font-mono text-zinc-100">{minutes.toString().padStart(2, '0')}</span>
          </div>
        )}
        <button
          onMouseDown={() => startHold(decMinutes)}
          onMouseUp={stopHold}
          onMouseLeave={stopHold}
          onMouseOut={stopHold}
          className="w-14 h-7 bg-zinc-800 hover:bg-zinc-700 rounded-b-lg flex items-center justify-center text-zinc-400 transition-colors cursor-pointer"
        >
          <svg width="10" height="6" viewBox="0 0 10 6" fill="currentColor"><path d="M0 1L5 6L10 1H0Z"/></svg>
        </button>
      </div>
    </div>
  );
}

interface LatencyPickerProps {
  totalMinutes: number;
  onChange: (minutes: number) => void;
  label?: string;
  maxHours?: number;
}

export function LatencyPicker({ totalMinutes, onChange, label, maxHours = 4 }: LatencyPickerProps) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  const setHours = (h: number) => onChange(h * 60 + minutes);
  const setMinutes = (m: number) => onChange(hours * 60 + m);

  return (
    <div>
      {label && <span className="block text-xs text-zinc-500 mb-1.5 text-center">{label}</span>}
      <DurationPicker
        hours={hours}
        minutes={minutes}
        onHoursChange={setHours}
        onMinutesChange={setMinutes}
        maxHours={maxHours}
        hourLabel="Hrs"
        minuteLabel="Min"
        showLabels={false}
      />
    </div>
  );
}
