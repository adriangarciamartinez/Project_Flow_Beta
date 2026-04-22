/**
 * MediaLightbox.tsx — v2 (pf:// protocol)
 *
 * Video playback flow:
 * 1. Play via pf:// URL (proper Range streaming → H.264 MP4 works natively)
 * 2. If still MediaError code=3/4 (ProRes .mov, HEVC, etc.):
 *    → Request WebM/VP9 proxy via ffmpeg
 * 3. If ffmpeg not available: show "Open in System Player"
 */

import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { LocalImage } from './LocalMedia'
import { toDisplaySrc, toNativePath } from '../../utils/mediaPersistence'
import { requestVideoProxy } from '../../utils/videoProxy'

export interface LightboxItem {
  id: string
  src: string
  type: 'image' | 'video'
  title?: string
  caption?: string
  versionLabel?: string
  thumbnailPath?: string
}

interface Props {
  items: LightboxItem[]
  initialId: string | null
  onClose: () => void
}

type VideoState =
  | { status: 'playing'; src: string }
  | { status: 'proxying' }
  | { status: 'proxy-playing'; src: string }
  | { status: 'no-ffmpeg' }
  | { status: 'error'; detail: string }

export default function MediaLightbox({ items, initialId, onClose }: Props) {
  const [currentId, setCurrentId] = useState(initialId)
  const [videoState, setVideoState] = useState<VideoState | null>(null)

  const idx = items.findIndex(i => i.id === currentId)
  const item = items[idx] ?? null

  const go = useCallback((newIdx: number) => {
    const clamped = Math.max(0, Math.min(items.length - 1, newIdx))
    setCurrentId(items[clamped].id)
    setVideoState(null)
  }, [items])

  // Initialize video state when item changes
  useEffect(() => {
    if (!item) return
    if (item.type === 'video') {
      const src = toDisplaySrc(item.src)
      setVideoState(src ? { status: 'playing', src } : { status: 'error', detail: 'Cannot resolve video path' })
    } else {
      setVideoState(null)
    }
  }, [item?.id])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft' && idx > 0) go(idx - 1)
      if (e.key === 'ArrowRight' && idx < items.length - 1) go(idx + 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [idx, go, onClose])

  if (!item) return null

  const isMOV = /\.mov$/i.test(item.src)

  const openExternal = async () => {
    const api = (window as any).electronAPI
    if (!api) return
    const nativePath = toNativePath(item.src)
    if (!nativePath) return
    const exists = await api.fileExists(nativePath)
    if (!exists) { console.error('[lightbox] not found:', nativePath); return }
    const err = await api.openPath(nativePath)
    if (err) console.error('[lightbox] openPath error:', err)
  }

  const handleVideoError = async (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const el = e.target as HTMLVideoElement
    const code = el.error?.code
    const msg = el.error?.message || 'unknown'
    console.warn('[lightbox] video error:', { src: item.src.slice(-60), code, msg })

    if (code === 3 || code === 4) {
      // DECODE or FORMAT error — try proxy transcode
      console.log('[lightbox] requesting WebM proxy for codec-unsupported video...')
      setVideoState({ status: 'proxying' })
      const proxy = await requestVideoProxy(item.src)
      if (proxy) {
        console.log('[lightbox] ✓ proxy ready:', proxy.proxySrc.slice(0, 80))
        setVideoState({ status: 'proxy-playing', src: proxy.proxySrc })
      } else {
        setVideoState({ status: 'no-ffmpeg' })
      }
    } else {
      setVideoState({ status: 'error', detail: `MediaError code=${code}: ${msg}` })
    }
  }

  const renderVideo = () => {
    if (!videoState) return <div style={{ height: 300 }} />

    switch (videoState.status) {
      case 'playing':
      case 'proxy-playing':
        return (
          <video
            key={videoState.src}
            src={videoState.src}
            controls autoPlay playsInline
            style={{ maxWidth: '100%', maxHeight: '76vh', borderRadius: 4, outline: 'none', background: '#000' }}
            onError={videoState.status === 'playing' ? handleVideoError : (e) => {
              const el = e.target as HTMLVideoElement
              setVideoState({ status: 'error', detail: `Proxy error code=${el.error?.code}` })
            }}
            onLoadedMetadata={(e) => {
              const el = e.target as HTMLVideoElement
              console.log('[lightbox] ✓ playing:', el.videoWidth + 'x' + el.videoHeight, el.duration.toFixed(1) + 's')
            }}
          />
        )

      case 'proxying':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 300, gap: 12 }}>
            <Loader2 size={24} style={{ color: 'var(--accent-green)', animation: 'spin 1s linear infinite' }} />
            <p style={{ fontSize: 12, color: 'var(--fg-secondary)' }}>Converting for playback…</p>
            <p style={{ fontSize: 10, color: 'var(--fg-muted)', fontFamily: 'DM Mono, monospace' }}>Transcoding to WebM/VP9 via ffmpeg</p>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </div>
        )

      case 'no-ffmpeg':
        return (
          <div style={{ padding: 40, textAlign: 'center', border: '1px solid var(--border-subtle)', borderRadius: 6, background: 'var(--bg-elevated)', maxWidth: 440 }}>
            <p style={{ fontSize: 13, color: 'var(--fg-secondary)', marginBottom: 8 }}>Codec not supported</p>
            <p style={{ fontSize: 11, color: 'var(--fg-muted)', marginBottom: 8 }}>
              {isMOV ? 'ProRes .MOV requires ffmpeg for in-app playback.' : 'This codec is not supported in Electron without ffmpeg.'}
            </p>
            <p style={{ fontSize: 10, color: 'var(--fg-subtle)', marginBottom: 20, fontFamily: 'DM Mono, monospace' }}>
              Install ffmpeg and restart the app.
            </p>
            <button onClick={openExternal}
              style={{ padding: '8px 20px', borderRadius: 4, background: 'var(--bg-overlay)', border: '1px solid var(--border-emphasis)', color: 'var(--fg-secondary)', fontSize: 12, cursor: 'pointer' }}>
              Open in System Player
            </button>
          </div>
        )

      case 'error':
        return (
          <div style={{ padding: 40, textAlign: 'center', border: '1px solid var(--border-subtle)', borderRadius: 6, background: 'var(--bg-elevated)', maxWidth: 440 }}>
            <p style={{ fontSize: 13, color: 'var(--fg-secondary)', marginBottom: 8 }}>Cannot play video</p>
            <p style={{ fontSize: 10, color: 'var(--fg-subtle)', marginBottom: 20, fontFamily: 'DM Mono, monospace' }}>{videoState.detail}</p>
            <button onClick={openExternal}
              style={{ padding: '8px 20px', borderRadius: 4, background: 'var(--bg-overlay)', border: '1px solid var(--border-emphasis)', color: 'var(--fg-secondary)', fontSize: 12, cursor: 'pointer' }}>
              Open in System Player
            </button>
          </div>
        )
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(8px)' }}
        onClick={onClose}
      >
        <motion.div
          key={item.id}
          initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          style={{ position: 'relative', zIndex: 10, maxWidth: '90vw', width: '100%', maxHeight: '85vh', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
          onClick={e => e.stopPropagation()}
        >
          <div style={{ position: 'relative', width: '100%', maxHeight: '76vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {item.type === 'video' ? renderVideo() : (
              <LocalImage src={item.src} alt={item.title || ''}
                style={{ maxWidth: '100%', maxHeight: '76vh', borderRadius: 4, objectFit: 'contain', display: 'block' }}
                draggable={false} />
            )}

            {items.length > 1 && (
              <>
                <button onClick={() => go(idx - 1)} disabled={idx === 0}
                  style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 36, height: 36, borderRadius: '50%', background: 'rgba(0,0,0,0.6)', border: '1px solid var(--border-default)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', opacity: idx === 0 ? 0.3 : 1 }}>
                  <ChevronLeft size={16} />
                </button>
                <button onClick={() => go(idx + 1)} disabled={idx === items.length - 1}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', width: 36, height: 36, borderRadius: '50%', background: 'rgba(0,0,0,0.6)', border: '1px solid var(--border-default)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', opacity: idx === items.length - 1 ? 0.3 : 1 }}>
                  <ChevronRight size={16} />
                </button>
              </>
            )}
          </div>

          <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, padding: '0 4px' }}>
            <div>{item.title && <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>{item.title}</p>}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {videoState?.status === 'proxy-playing' && (
                <span style={{ fontSize: 9, fontFamily: 'DM Mono, monospace', color: 'var(--fg-subtle)', padding: '2px 6px', border: '1px solid var(--border-subtle)', borderRadius: 3 }}>WebM proxy</span>
              )}
              {item.versionLabel && (
                <span style={{ fontSize: 10, fontFamily: 'DM Mono, monospace', color: 'rgba(255,255,255,0.4)', padding: '2px 8px', borderRadius: 3, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)' }}>{item.versionLabel}</span>
              )}
              {items.length > 1 && (
                <span style={{ fontSize: 10, fontFamily: 'DM Mono, monospace', color: 'rgba(255,255,255,0.35)' }}>{idx + 1} / {items.length}</span>
              )}
            </div>
          </div>

          {items.length > 1 && (
            <div style={{ display: 'flex', gap: 6, marginTop: 10, overflowX: 'auto', maxWidth: '100%', paddingBottom: 4 }}>
              {items.map((it, i) => (
                <button key={it.id} onClick={() => go(i)}
                  style={{ flexShrink: 0, width: 52, height: 34, borderRadius: 3, overflow: 'hidden', border: `1px solid ${it.id === currentId ? 'var(--accent-green)' : 'var(--border-subtle)'}`, opacity: it.id === currentId ? 1 : 0.4, cursor: 'pointer', transition: 'all 0.15s', background: 'var(--bg-elevated)' }}>
                  {it.type === 'video' && it.thumbnailPath ? (
                    <img src={it.thumbnailPath} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : it.type === 'image' ? (
                    <LocalImage src={it.src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, color: 'var(--fg-muted)', fontFamily: 'DM Mono, monospace' }}>VID</div>
                  )}
                </button>
              ))}
            </div>
          )}
        </motion.div>

        <button onClick={onClose}
          style={{ position: 'absolute', top: 16, right: 16, zIndex: 20, width: 36, height: 36, borderRadius: '50%', background: 'rgba(0,0,0,0.6)', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.7)', cursor: 'pointer' }}>
          <X size={15} />
        </button>
      </motion.div>
    </AnimatePresence>
  )
}
