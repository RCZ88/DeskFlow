import { useMemo } from 'react'

interface HeatmapProps {
  data?: Record<string, any>
  accentColor?: string
}

// Generate mock activity data from profile signals
function generateHeatmapData(data: Record<string, any> | undefined): number[][] {
  const grid: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0))
  if (!data || Object.keys(data).length === 0) {
    // Default pattern: work hours (9-17, weekdays)
    for (let day = 0; day < 5; day++) {
      for (let hour = 9; hour < 18; hour++) {
        grid[day][hour] = 0.3 + Math.random() * 0.5
      }
    }
    // Some evening activity
    for (let day = 0; day < 7; day++) {
      for (let hour = 19; hour < 23; hour++) {
        grid[day][hour] = 0.1 + Math.random() * 0.3
      }
    }
    return grid
  }
  // Use actual signal data to influence patterns
  const signalCount = Object.keys(data).length
  for (let day = 0; day < 7; day++) {
    for (let hour = 0; hour < 24; hour++) {
      // Base: higher during work hours
      if (hour >= 9 && hour <= 17 && day < 5) grid[day][hour] = 0.4
      else if (hour >= 19 && hour <= 23) grid[day][hour] = 0.2
      // Add signal-based variation
      grid[day][hour] += (signalCount % (day + hour + 1)) * 0.02
      grid[day][hour] = Math.min(1, Math.max(0, grid[day][hour]))
    }
  }
  return grid
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const HOURS = ['12a', '', '3a', '', '6a', '', '9a', '', '12p', '', '3p', '', '6p', '', '9p', '', '11p']

export function ActivityHeatmap({ data, accentColor = '#a855f7' }: HeatmapProps) {
  const grid = useMemo(() => generateHeatmapData(data), [data])

  return (
    <div className="flex gap-1">
      {/* Day labels */}
      <div className="flex flex-col gap-0.5 pt-4">
        {DAYS.map((day, i) => (
          <div key={i} className="h-[14px] flex items-center">
            <span className="text-[8px] w-5 text-right" style={{ color: '#52525b' }}>{day}</span>
          </div>
        ))}
      </div>

      <div className="flex flex-col">
        {/* Hour labels */}
        <div className="flex gap-0.5 mb-0.5">
          {HOURS.map((h, i) => (
            <div key={i} className="w-[14px] text-center">
              {h && <span className="text-[7px]" style={{ color: '#52525b' }}>{h}</span>}
            </div>
          ))}
        </div>

        {/* Grid */}
        {grid.map((row, dayIdx) => (
          <div key={dayIdx} className="flex gap-0.5">
            {row.map((val, hourIdx) => (
              <div
                key={hourIdx}
                className="w-[14px] h-[14px] rounded-[2px] transition-colors"
                style={{
                  background: val > 0 ? `${accentColor}${Math.round(val * 200).toString(16).padStart(2, '0')}` : 'rgba(255,255,255,0.03)',
                }}
                title={`${DAYS[dayIdx]} ${HOURS[hourIdx] || ''}: ${Math.round(val * 100)}%`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
