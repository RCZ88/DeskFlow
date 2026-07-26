import { useMemo } from 'react'

interface ScheduleEntry {
  id: string
  title: string
  start_time: string
  end_time: string
  color?: string
  category?: string
}

interface TimelineGoal {
  id: string
  title: string
  match_category?: string
  progress_seconds: number
  target_seconds: number
  category: string
}

interface GoalTimelineProps {
  schedule: ScheduleEntry[]
  goals: TimelineGoal[]
  currentTime?: Date
}

const START_HOUR = 6
const END_HOUR = 24
const HOUR_HEIGHT = 40
const TOTAL_HOURS = END_HOUR - START_HOUR

export function GoalTimeline({ schedule, goals, currentTime = new Date() }: GoalTimelineProps) {
  const currentHour = currentTime.getHours() + currentTime.getMinutes() / 60
  const showCurrentTime = currentHour >= START_HOUR && currentHour <= END_HOUR

  const scheduleBlocks = useMemo(() => {
    return schedule.map(entry => {
      const [sh, sm] = entry.start_time.split(':').map(Number)
      const [eh, em] = entry.end_time.split(':').map(Number)
      const start = sh + sm / 60
      const end = eh + em / 60
      const top = Math.max(0, (start - START_HOUR) * HOUR_HEIGHT)
      const height = Math.min((end - start) * HOUR_HEIGHT, (END_HOUR - Math.max(start, START_HOUR)) * HOUR_HEIGHT)
      return { ...entry, top, height, start, end }
    }).filter(b => b.end > START_HOUR && b.start < END_HOUR)
  }, [schedule])

  const categoryColors: Record<string, string> = {
    work: '#22d3ee', personal: '#4ade80', health: '#f87171',
    learning: '#a78bfa', class: '#fbbf24', lab: '#fb923c', study: '#a78bfa',
  }

  return (
    <div className="dk-goal-timeline">
      <div className="dk-goal-timeline-labels">
        {Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => (
          <div key={i} className="dk-goal-timeline-hour" style={{ top: i * HOUR_HEIGHT }}>
            <span>{START_HOUR + i > 12 ? START_HOUR + i - 12 : START_HOUR + i}{START_HOUR + i >= 12 ? 'pm' : 'am'}</span>
          </div>
        ))}
      </div>
      <div className="dk-goal-timeline-body">
        {Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => (
          <div key={i} className="dk-goal-timeline-line" style={{ top: i * HOUR_HEIGHT }} />
        ))}

        {scheduleBlocks.map(block => (
          <div
            key={block.id}
            className="dk-goal-timeline-block"
            style={{
              top: block.top,
              height: Math.max(block.height, 20),
              background: (block.color || categoryColors[block.category || 'class'] || '#22d3ee') + '25',
              borderLeft: `3px solid ${block.color || categoryColors[block.category || 'class'] || '#22d3ee'}`,
            }}
          >
            <span className="dk-goal-timeline-block-title">{block.title}</span>
            <span className="dk-goal-timeline-block-time">{block.start_time}-{block.end_time}</span>
          </div>
        ))}

        {findGaps(scheduleBlocks).map((gap, i) => (
          <div key={`gap-${i}`} className="dk-goal-timeline-gap" style={{ top: gap.top, height: gap.height }}>
            <span>Available for goals</span>
          </div>
        ))}

        {showCurrentTime && (
          <div className="dk-goal-timeline-now" style={{ top: (currentHour - START_HOUR) * HOUR_HEIGHT }}>
            <div className="dk-goal-timeline-now-dot" />
            <div className="dk-goal-timeline-now-line" />
          </div>
        )}
      </div>
    </div>
  )
}

function findGaps(blocks: Array<{ top: number; height: number }>): Array<{ top: number; height: number }> {
  if (blocks.length === 0) return [{ top: 0, height: TOTAL_HOURS * HOUR_HEIGHT }]
  const sorted = [...blocks].sort((a, b) => a.top - b.top)
  const gaps: Array<{ top: number; height: number }> = []
  let y = 0
  for (const block of sorted) {
    if (block.top > y + 2) gaps.push({ top: y, height: block.top - y })
    y = Math.max(y, block.top + block.height)
  }
  if (y < TOTAL_HOURS * HOUR_HEIGHT - 2) gaps.push({ top: y, height: TOTAL_HOURS * HOUR_HEIGHT - y })
  return gaps
}
