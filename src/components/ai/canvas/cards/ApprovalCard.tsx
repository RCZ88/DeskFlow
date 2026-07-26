import { useState } from 'react'
import type { CanvasCard } from '../../../../types/canvas'

interface ApprovalCardProps {
  card: CanvasCard
  onApprove?: (cardId: string) => void
  onReject?: (cardId: string) => void
}

export function ApprovalCard({ card, onApprove, onReject }: ApprovalCardProps) {
  const [status, setStatus] = useState<'pending' | 'approved' | 'rejected'>('pending')
  const data = card.data || {}

  const handleApprove = () => {
    setStatus('approved')
    onApprove?.(card.id)
  }

  const handleReject = () => {
    setStatus('rejected')
    onReject?.(card.id)
  }

  if (status === 'approved') {
    return (
      <div className="card-approval card-approval-approved">
        <span className="card-approval-icon">✓</span>
        <span>Approved</span>
      </div>
    )
  }

  if (status === 'rejected') {
    return (
      <div className="card-approval card-approval-rejected">
        <span className="card-approval-icon">✕</span>
        <span>Rejected</span>
      </div>
    )
  }

  return (
    <div className="card-approval">
      <div className="card-approval-content">
        {data.title && <span className="card-approval-title">{data.title}</span>}
        {data.description && <span className="card-approval-desc">{data.description}</span>}
      </div>
      <div className="card-approval-actions">
        <button className="card-approval-btn approve" onClick={handleApprove}>Approve</button>
        <button className="card-approval-btn reject" onClick={handleReject}>Reject</button>
      </div>
    </div>
  )
}
