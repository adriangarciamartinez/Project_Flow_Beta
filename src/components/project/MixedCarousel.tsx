import { toDisplaySrc, isBrokenSrc } from '../../utils/mediaPersistence'
import { LocalImage, LocalVideo } from '../ui/LocalMedia'
import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, Play, Pause, Film } from 'lucide-react'
import { MediaFile } from '../../types'

interface MixedCarouselProps {
  renders: MediaFile[]
  previews: MediaFile[]
}

interface CarouselItem extends MediaFile {
  sourceType: 'render' | 'preview'
}

export default function MixedCarousel({ renders, previews }: MixedCarouselProps) {
  const items: CarouselItem[] = [
    ...renders.map(r => ({ ...r, sourceType: 'render' as const })),
    ...previews.map(p => ({ ...p, sourceType: 'preview' as const })),
  ].filter(i => i.filePath && !i.filePath.startsWith('blob:'))

  const [idx, setIdx] = useState(0)
  const [autoplay, setAutoplay] = useState(true)
  const [direction, setDirection] = useState(1)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  const current = items[idx]

  const go = useCallback((newIdx: number, dir: number) => {
    setDirection(dir)
    setIdx(((newIdx % items.length) + items.length) % items.length)
  }, [items.length])

  const prev = () => go(idx - 1, -1)
  const next = useCallback(() => go(idx + 1, 1), [go, idx])

  useEffect(() => {
    if (autoplay && items.length > 1) {
      intervalRef.current = setInterval(next, 4000)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [autoplay, next, items.length])

  if (items.length === 0) return null

  const variants = {
    enter: (dir: number) => ({ x: dir > 0 ? 60 : -60, opacity: 0, scale: 0.98 }),
    center: { x: 0, opacity: 1, scale: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -60 : 60, opacity: 0, scale: 0.98 }),
  }

  return (
    <div className="rounded-md overflow-hidden border border-border-subtle bg-bg-void relative group"
      style={{ aspectRatio: '16/7' }}>
      {/* Main media */}
      <AnimatePresence custom={direction} mode="wait">
        <motion.div
          key={current.id}
          custom={direction}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="absolute inset-0"
        >
          {current.type === 'video' ? (
            <LocalVideo
              ref={videoRef}
              src={current.filePath}
              className="w-full h-full object-cover"
              autoPlay muted loop playsInline
              poster={current.thumbnailPath}
            />
          ) : (
            <LocalImage src={current.filePath} alt={current.filename} className="w-full h-full object-cover" />
          )}
        </motion.div>
      </AnimatePresence>

      {/* Cinematic overlay */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 40%, transparent 70%, rgba(0,0,0,0.3) 100%)' }} />

      {/* Top bar - source type badge */}
      <div className="absolute top-3 left-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <span className="text-2xs font-mono px-2 py-0.5 rounded-sm border tracking-wider"
          style={{ background: 'rgba(0,0,0,0.6)', borderColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)' }}>
          {current.sourceType.toUpperCase()} · {current.versionLabel}
        </span>
      </div>

      {/* Autoplay toggle */}
      <button
        onClick={() => setAutoplay(a => !a)}
        className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center rounded-full transition-all duration-200 opacity-0 group-hover:opacity-100"
        style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)' }}
      >
        {autoplay ? <Pause size={10} style={{ color: 'rgba(255,255,255,0.7)' }} /> : <Play size={10} style={{ color: 'rgba(255,255,255,0.7)' }} />}
      </button>

      {/* Nav arrows */}
      {items.length > 1 && (
        <>
          <button onClick={prev}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full transition-all duration-200 opacity-0 group-hover:opacity-100"
            style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <ChevronLeft size={14} style={{ color: 'rgba(255,255,255,0.8)' }} />
          </button>
          <button onClick={next}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full transition-all duration-200 opacity-0 group-hover:opacity-100"
            style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <ChevronRight size={14} style={{ color: 'rgba(255,255,255,0.8)' }} />
          </button>
        </>
      )}

      {/* Bottom info + dots */}
      <div className="absolute bottom-0 left-0 right-0 px-4 pb-3 flex items-end justify-between">
        <div>
          <p className="text-xs font-sans truncate max-w-xs" style={{ color: 'rgba(255,255,255,0.65)' }}>
            {current.filename}
          </p>
          {current.comment && (
            <p className="text-2xs font-mono mt-0.5 truncate max-w-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
              {current.comment}
            </p>
          )}
        </div>

        {/* Dot nav */}
        {items.length > 1 && (
          <div className="flex gap-1">
            {items.map((_, i) => (
              <button
                key={i}
                onClick={() => go(i, i > idx ? 1 : -1)}
                className="rounded-full transition-all duration-300"
                style={{
                  width: i === idx ? 16 : 4,
                  height: 4,
                  background: i === idx ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.25)',
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
