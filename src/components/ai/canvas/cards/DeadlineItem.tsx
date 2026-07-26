import { CountdownRing } from './CountdownRing'
import { Plus, CheckCircle2, XCircle } from 'lucide-react'

interface DeadlineItemProps {
  id: string
  title: string
  course?: string
  dueDate: string
  priority: string
  status: string
  linkedGoalStatus?: string
  onCreateGoal?: (title: string) => void
}

export function DeadlineItem({ title, course, dueDate, priority, status, linkedGoalStatus, onCreateGoal }: DeadlineItemProps) {
  const daysLeft = Math.ceil((new Date(dueDate).getTime() - Date.now()) / 86400000)
  const isUrgent = daysLeft <= 3 && daysLeft >= 0 && status !== 'done'
  const isOverdue = daysLeft < 0 && status !== 'done'

  return (
    <div className={`dk-deadline-item ${isUrgent ? 'urgent' : ''} ${isOverdue ? 'overdue' : ''}`}>
      <CountdownRing daysLeft={daysLeft} size={28} />
      <div className="dk-deadline-item-main">
        <div className="dk-deadline-item-title-row">
          <span className={`dk-deadline-item-priority ${priority}`} />
          <span className="dk-deadline-item-name">{title}</span>
          {course && <span className="dk-deadline-item-course">{course}</span>}
        </div>
        <div className="dk-deadline-item-meta">
          <span className="dk-deadline-item-due">
            {isOverdue ? 'Overdue' : daysLeft === 0 ? 'Due today' : daysLeft === 1 ? '1 day left' : `${daysLeft} days left`}
          </span>
          <span className="dk-deadline-item-date">{dueDate.slice(0, 10)}</span>
        </div>
      </div>
      <div className="dk-deadline-item-actions">
        {linkedGoalStatus ? (
          <span className={`dk-deadline-item-goal-badge ${linkedGoalStatus}`}>
            {linkedGoalStatus === 'completed' && <CheckCircle2 size={10} />}
            {linkedGoalStatus === 'dismissed' && <XCircle size={10} />}
            {linkedGoalStatus}
          </span>
        ) : isUrgent ? (
          <button className="dk-deadline-item-link-btn" onClick={() => onCreateGoal?.(title)} aria-label="Create goal from deadline">
            <Plus size={12} />Goal
          </button>
        ) : null}
      </div>
    </div>
  )
}
