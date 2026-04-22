/**
 * videoProxy.ts
 *
 * Fallback for videos that fail to play even with the pf:// protocol.
 * This handles .mov ProRes and other codecs Chromium cannot decode natively.
 *
 * When <video> fires MediaError code=3 (DECODE) or code=4 (FORMAT):
 *   1. Request ffmpeg transcode → WebM/VP9 proxy via main process
 *   2. Store proxy in userData/proxies/<hash>.webm
 *   3. Return pf:// URL of the proxy for <video src>
 *
 * Note: With the pf:// protocol properly streaming Range requests,
 * H.264 MP4 should now play without needing a proxy. Proxies are
 * only needed for ProRes .mov, HEVC, or other exotic formats.
 */

import { toNativePath, nativePathToPfUrl } from './mediaPersistence'

export interface ProxyResult {
  proxySrc: string       // pf:// URL of the WebM proxy
  proxyNativePath: string
}

export async function requestVideoProxy(storedSrc: string): Promise<ProxyResult | null> {
  const electronAPI = (window as any).electronAPI
  if (!electronAPI?.transcodeProxy || !electronAPI?.getPath) {
    console.warn('[videoProxy] transcodeProxy not available')
    return null
  }
  if (storedSrc.startsWith('data:') || storedSrc.startsWith('blob:')) return null

  const nativeSrc = toNativePath(storedSrc)
  if (!nativeSrc) {
    console.warn('[videoProxy] cannot get native path from:', storedSrc.slice(0, 80))
    return null
  }

  try {
    const userData: string = await electronAPI.getPath('userData')
    if (!userData) return null

    const sep = userData.includes('\\') ? '\\' : '/'
    const proxiesDir = userData + sep + 'proxies'
    const hash = simpleHash(storedSrc)
    const proxyPath = proxiesDir + sep + hash + '.webm'

    console.log('[videoProxy] requesting proxy for:', nativeSrc.slice(-50))
    const result = await electronAPI.transcodeProxy(nativeSrc, proxyPath)

    if (!result?.success) {
      console.warn('[videoProxy] transcode failed:', result?.error?.slice(0, 100))
      return null
    }

    const proxyNativePath = result.proxyPath
    const proxySrc = result.pfUrl || nativePathToPfUrl(proxyNativePath)
    console.log('[videoProxy] ✓ proxy ready:', proxySrc.slice(0, 80))
    return { proxySrc, proxyNativePath }
  } catch (err) {
    console.error('[videoProxy] exception:', err)
    return null
  }
}

export async function checkFfmpegAvailable(): Promise<boolean> {
  const electronAPI = (window as any).electronAPI
  if (!electronAPI?.checkFfmpeg) return false
  try {
    const result = await electronAPI.checkFfmpeg()
    return result?.available === true
  } catch { return false }
}

function simpleHash(str: string): string {
  let h = 0x811c9dc5
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = (h * 0x01000193) >>> 0 }
  return h.toString(16).padStart(8, '0')
}
