/**
 * videoPoster.ts — v3
 *
 * Thumbnail generation for video cards.
 *
 * Stage 1: ffmpeg via main process (all codecs, always preferred)
 * Stage 2: canvas capture (Chromium-decodable codecs only, fallback)
 *
 * With the pf:// protocol properly set up, canvas capture now works for
 * H.264 MP4 as well, since Chromium can seek and decode frames correctly.
 */

import { toDisplaySrc, toNativePath } from './mediaPersistence'

const POSTER_WIDTH = 640
const POSTER_HEIGHT = 360
const CANVAS_TIMEOUT = 12000

export async function generateVideoPoster(storedSrc: string): Promise<string | null> {
  const label = storedSrc.split(/[/?]/).pop()?.slice(0, 40) || storedSrc.slice(-40)

  const ffmpegResult = await tryFfmpegThumbnail(storedSrc)
  if (ffmpegResult) {
    console.log('[videoPoster] ✓ ffmpeg:', label)
    return ffmpegResult
  }

  const canvasResult = await tryCanvasThumbnail(storedSrc)
  if (canvasResult) {
    console.log('[videoPoster] ✓ canvas:', label)
    return canvasResult
  }

  console.warn('[videoPoster] both stages failed for:', label)
  return null
}

async function tryFfmpegThumbnail(storedSrc: string): Promise<string | null> {
  const electronAPI = (window as any).electronAPI
  if (!electronAPI?.generateThumbnail || !electronAPI?.getPath) return null
  if (storedSrc.startsWith('data:') || storedSrc.startsWith('blob:')) return null

  try {
    const nativeSrc = toNativePath(storedSrc)
    if (!nativeSrc) return null

    const userData: string = await electronAPI.getPath('userData')
    if (!userData) return null

    const sep = userData.includes('\\') ? '\\' : '/'
    const thumbsDir = userData + sep + 'thumbnails'
    const uuid = (crypto as any).randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`
    const thumbPath = thumbsDir + sep + uuid + '.jpg'

    const result = await electronAPI.generateThumbnail(nativeSrc, thumbPath)
    if (!result?.success) {
      console.log('[videoPoster] ffmpeg not available:', result?.error?.slice(0, 60))
      return null
    }

    const readResult = await electronAPI.readFile(result.thumbnailPath)
    if (!readResult?.success || !readResult.data) return null
    return `data:image/jpeg;base64,${readResult.data}`
  } catch (err) {
    console.warn('[videoPoster] ffmpeg error:', err)
    return null
  }
}

async function tryCanvasThumbnail(storedSrc: string): Promise<string | null> {
  const displaySrc = toDisplaySrc(storedSrc)
  if (!displaySrc) return null

  return new Promise<string | null>((resolve) => {
    const video = document.createElement('video')
    // No crossOrigin — taints canvas with pf:// and file:// URLs
    video.muted = true
    video.playsInline = true
    video.preload = 'auto'
    video.style.cssText = 'position:fixed;left:-9999px;top:-9999px;width:320px;height:180px;opacity:0;pointer-events:none'
    document.body.appendChild(video)

    let settled = false
    const done = (r: string | null) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      video.pause(); video.removeAttribute('src'); video.load()
      try { document.body.removeChild(video) } catch {}
      resolve(r)
    }

    const timer = setTimeout(() => { console.warn('[videoPoster] canvas timeout'); done(null) }, CANVAS_TIMEOUT)

    const capture = () => {
      if (settled) return
      try {
        if (!video.videoWidth || !video.videoHeight) { done(null); return }
        const canvas = document.createElement('canvas')
        canvas.width = POSTER_WIDTH; canvas.height = POSTER_HEIGHT
        const ctx = canvas.getContext('2d')
        if (!ctx) { done(null); return }
        ctx.drawImage(video, 0, 0, POSTER_WIDTH, POSTER_HEIGHT)
        const dataUrl = canvas.toDataURL('image/jpeg', 0.80)
        if (dataUrl.length < 1500) { done(null); return }
        done(dataUrl)
      } catch (err) { console.warn('[videoPoster] canvas err:', err); done(null) }
    }

    video.addEventListener('loadeddata', () => {
      const seekTo = video.duration && isFinite(video.duration) ? video.duration * 0.1 : 2
      video.currentTime = Math.min(seekTo, video.duration || seekTo)
    }, { once: true })
    video.addEventListener('seeked', capture, { once: true })
    video.addEventListener('canplaythrough', () => { if (!settled && video.currentTime > 0) capture() }, { once: true })
    video.addEventListener('error', () => {
      console.log('[videoPoster] canvas codec error:', video.error?.code)
      done(null)
    })

    video.src = displaySrc
    video.load()
  })
}
