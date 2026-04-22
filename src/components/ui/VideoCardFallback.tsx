/**
 * VideoCardFallback
 *
 * Shown in video cards when no poster has been generated yet.
 * Auto-attempts poster generation on mount.
 *
 * States:
 * - generating: spinner (trying ffmpeg then canvas)
 * - failed:     "Preview unavailable" + Retry + Open buttons
 */

import { useEffect, useState, useRef } from 'react'
import { RefreshCw, ExternalLink, Play } from 'lucide-react'
import { generateVideoPoster } from '../../utils/videoPoster'
import { toNativePath } from '../../utils/mediaPersistence'

interface VideoCardFallbackProps {
  filePath: string
  filename: string
  onPosterGenerated: (poster: string) => void
  /** Called when user clicks the card (to open lightbox) */
  onPlay?: () => void
}

export default function VideoCardFallback({
  filePath,
  filename,
  onPosterGenerated,
  onPlay,
}: VideoCardFallbackProps) {
  const [status, setStatus] = useState<'generating' | 'failed'>('generating')
  const attempted = useRef(false)

  const attempt = async () => {
    setStatus('generating')
    try {
      const poster = await generateVideoPoster(filePath)
      if (poster) {
        onPosterGenerated(poster)
      } else {
        setStatus('failed')
      }
    } catch {
      setStatus('failed')
    }
  }

  useEffect(() => {
    if (attempted.current) return
    attempted.current = true
    attempt()
  }, [filePath])

  const openExternal = async (e: React.MouseEvent) => {
    e.stopPropagation()
    const electronAPI = (window as any).electronAPI
    if (!electronAPI) return
    const nativePath = toNativePath(filePath)
    if (nativePath) await electronAPI.openPath(nativePath)
  }

  return (
    <div style={{
      width: '100%', height: '100%',
      background: 'var(--bg-elevated)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: 8, padding: 8,
    }}>
      {status === 'generating' ? (
        <>
          <div style={{
            width: 20, height: 20, borderRadius: '50%',
            border: '2px solid var(--border-emphasis)',
            borderTopColor: 'var(--accent-green)',
            animation: 'spin 0.8s linear infinite',
            flexShrink: 0,
          }} />
          <span style={{ fontSize: 9, color: 'var(--fg-subtle)', fontFamily: 'DM Mono, monospace', textAlign: 'center' }}>
            Generating preview…
          </span>
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </>
      ) : (
        <>
          {/* Play button — lets user open lightbox even without thumbnail */}
          {onPlay && (
            <button
              onClick={e => { e.stopPropagation(); onPlay() }}
              style={{
                width: 32, height: 32, borderRadius: '50%',
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: 'rgba(255,255,255,0.7)',
              }}>
              <Play size={12} style={{ marginLeft: 2 }} />
            </button>
          )}
          <span style={{ fontSize: 9, color: 'var(--fg-subtle)', fontFamily: 'DM Mono, monospace', textAlign: 'center', lineHeight: 1.5 }}>
            Preview unavailable
          </span>
          <div style={{ display: 'flex', gap: 4 }}>
            <button
              onClick={e => { e.stopPropagation(); attempted.current = false; attempt() }}
              style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '3px 6px', borderRadius: 3, border: '1px solid var(--border-subtle)', background: 'transparent', color: 'var(--fg-muted)', fontSize: 8, cursor: 'pointer', fontFamily: 'DM Mono, monospace' }}>
              <RefreshCw size={8} /> Retry
            </button>
            <button
              onClick={openExternal}
              style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '3px 6px', borderRadius: 3, border: '1px solid var(--border-subtle)', background: 'transparent', color: 'var(--fg-muted)', fontSize: 8, cursor: 'pointer', fontFamily: 'DM Mono, monospace' }}>
              <ExternalLink size={8} /> Open
            </button>
          </div>
        </>
      )}
    </div>
  )
}
