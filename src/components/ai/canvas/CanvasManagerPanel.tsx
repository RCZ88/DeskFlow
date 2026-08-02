import { useState, useCallback } from 'react'
import { Save, FolderOpen, Trash2, Edit3, Check, X, Clock, Layers } from 'lucide-react'
import type { CanvasSnapshot } from '../../../services/canvasPersistence'

interface CanvasManagerPanelProps {
  canvases: CanvasSnapshot[]
  activeId: string | null
  onLoad: (id: string) => void
  onRename: (id: string, name: string) => void
  onDelete: (id: string) => void
  onSave: (name: string) => void
  onClose: () => void
}

function timeAgo(ts: number): string {
  if (!ts || !isFinite(ts)) return 'unknown'
  const diff = Date.now() - ts
  if (diff < 0) return 'just now'
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export function CanvasManagerPanel({ canvases, activeId, onLoad, onRename, onDelete, onSave, onClose }: CanvasManagerPanelProps) {
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  const handleSaveNew = useCallback(() => {
    const name = newName.trim() || `Canvas ${new Date().toLocaleDateString()}`
    onSave(name)
    setNewName('')
  }, [newName, onSave])

  const startEdit = useCallback((id: string, currentName: string) => {
    setEditingId(id)
    setEditName(currentName)
  }, [])

  const confirmEdit = useCallback(() => {
    if (editingId && editName.trim()) {
      onRename(editingId, editName.trim())
    }
    setEditingId(null)
  }, [editingId, editName, onRename])

  return (
    <div className="dk-canvas-manager">
      <div className="dk-canvas-manager-header">
        <div className="dk-canvas-manager-title">
          <Layers size={14} />
          <span>Saved Canvases</span>
        </div>
        <button className="dk-canvas-manager-close" onClick={onClose}>✕</button>
      </div>

      <div className="dk-canvas-manager-save-row">
        <input
          className="dk-canvas-manager-input"
          placeholder="Canvas name..."
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSaveNew()}
        />
        <button className="dk-canvas-manager-save-btn" onClick={handleSaveNew}>
          <Save size={13} />
          Save
        </button>
      </div>

      <div className="dk-canvas-manager-list">
        {canvases.length === 0 ? (
          <div className="dk-canvas-manager-empty">
            <FolderOpen size={24} />
            <span>No saved canvases</span>
          </div>
        ) : (
          canvases.map(c => (
            <div
              key={c.id}
              className={`dk-canvas-manager-item ${c.id === activeId ? 'active' : ''}`}
            >
              <div className="dk-canvas-manager-item-info">
                {editingId === c.id ? (
                  <div className="dk-canvas-manager-edit-row">
                    <input
                      className="dk-canvas-manager-input"
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && confirmEdit()}
                      autoFocus
                    />
                    <button className="dk-canvas-manager-icon-btn" onClick={confirmEdit}><Check size={12} /></button>
                    <button className="dk-canvas-manager-icon-btn" onClick={() => setEditingId(null)}><X size={12} /></button>
                  </div>
                ) : (
                  <>
                    <span className="dk-canvas-manager-name">{c.name}</span>
                    <span className="dk-canvas-manager-meta">
                      <Layers size={10} /> {c.cardCount}
                      <Clock size={10} /> {timeAgo(c.savedAt)}
                    </span>
                  </>
                )}
              </div>
              {editingId !== c.id && (
                <div className="dk-canvas-manager-item-actions">
                  <button className="dk-canvas-manager-icon-btn" onClick={() => onLoad(c.id)} title="Load">
                    <FolderOpen size={13} />
                  </button>
                  <button className="dk-canvas-manager-icon-btn" onClick={() => startEdit(c.id, c.name)} title="Rename">
                    <Edit3 size={13} />
                  </button>
                  <button className="dk-canvas-manager-icon-btn danger" onClick={() => onDelete(c.id)} title="Delete">
                    <Trash2 size={13} />
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
