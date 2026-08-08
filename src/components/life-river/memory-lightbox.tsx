"use client"

import * as React from 'react'
import { useEffect } from 'react'

import { X } from 'lucide-react'

import type { LoadedMemory } from '../../features/memories/useMemories'

interface MemoryLightboxProps {
  memory: LoadedMemory
  onClose: () => void
}

export function MemoryLightbox({ memory, onClose }: MemoryLightboxProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      data-lifephase="memory-lightbox"
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-sm p-6"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        aria-label="Close"
        className="absolute top-4 right-4 rounded-full bg-white/10 p-2 text-zinc-300 transition-colors hover:bg-white/20"
      >
        <X size={16} />
      </button>
      {memory.meta.kind === 'video' ? (
        <video
          src={memory.url}
          controls
          autoPlay
          className="max-h-[85vh] max-w-full rounded-xl"
          onClick={e => e.stopPropagation()}
        />
      ) : (
        <img
          src={memory.url}
          alt={memory.meta.caption || ''}
          className="max-h-[85vh] max-w-full rounded-xl object-contain"
          onClick={e => e.stopPropagation()}
        />
      )}
      {memory.meta.caption && (
        <p className="absolute bottom-6 left-1/2 -translate-x-1/2 text-[13px] text-white/90">
          {memory.meta.caption}
        </p>
      )}
    </div>
  )
}
