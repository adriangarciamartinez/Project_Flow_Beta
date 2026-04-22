/**
 * LocalMedia.tsx
 *
 * Uses pf:// URLs served by the custom protocol handler in main.js.
 * The protocol handler streams files with proper Range/206 support,
 * enabling correct codec detection, seeking, and buffering.
 *
 * toDisplaySrc() converts any stored format to the correct URL.
 * For new imports: storedSrc is already a pf:// URL.
 * For legacy data stored as raw paths: toDisplaySrc() converts them.
 */

import { ImgHTMLAttributes, VideoHTMLAttributes, useState, forwardRef } from 'react'
import { toDisplaySrc } from '../../utils/mediaPersistence'

interface LocalImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src: string
  fallback?: React.ReactNode
  fileSize?: number
}

export function LocalImage({ src: stored, fallback, onError, fileSize, ...props }: LocalImageProps) {
  const [errored, setErrored] = useState(false)
  const displaySrc = toDisplaySrc(stored)

  if (!displaySrc || errored) return fallback ? <>{fallback}</> : null

  return (
    <img
      {...props}
      src={displaySrc}
      onError={(e) => {
        console.warn('[LocalImage] failed:', { stored: stored.slice(0, 80), displaySrc: displaySrc.slice(0, 80) })
        setErrored(true)
        onError?.(e)
      }}
    />
  )
}

interface LocalVideoProps extends Omit<VideoHTMLAttributes<HTMLVideoElement>, 'src'> {
  src: string
  poster?: string
}

export const LocalVideo = forwardRef<HTMLVideoElement, LocalVideoProps>(
  function LocalVideo({ src: stored, poster: storedPoster, onError, ...props }, ref) {
    const displaySrc = toDisplaySrc(stored)
    const displayPoster = storedPoster
      ? (storedPoster.startsWith('data:') ? storedPoster : toDisplaySrc(storedPoster))
      : undefined

    if (!displaySrc) {
      console.warn('[LocalVideo] no displaySrc for:', stored?.slice(0, 80))
      return null
    }

    return (
      <video
        ref={ref}
        {...props}
        src={displaySrc}
        poster={displayPoster}
        onError={(e) => {
          const el = e.target as HTMLVideoElement
          console.warn('[LocalVideo] error:', {
            stored: stored.slice(0, 80),
            displaySrc: displaySrc.slice(0, 80),
            code: el.error?.code,
            msg: el.error?.message,
          })
          onError?.(e)
        }}
      />
    )
  }
)
