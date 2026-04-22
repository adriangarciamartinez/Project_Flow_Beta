/**
 * mediaPersistence.ts — v7 (buffer-first import)
 *
 * ROOT CAUSE OF v6 FAILURES:
 * ──────────────────────────
 * file.path in Electron is unreliable in all these cases:
 *   - Relative path:     .\test.mp4   (dev mode CWD = project folder, not file's folder)
 *   - Filename only:     Captura de pantalla.png  (drag from certain Windows sources)
 *   - Temp location:     points to a temp copy that gets deleted
 *
 * path.resolve() on a relative path uses the Electron main process CWD,
 * which in dev is the project root — not where the file actually lives.
 * Result: exists: false → import fails.
 *
 * THE FIX (v7):
 * ─────────────
 * Use File.arrayBuffer() as the PRIMARY import strategy.
 * In Electron, File.arrayBuffer() ALWAYS works for any file the user
 * drags into the window — regardless of what file.path says.
 * We send the bytes to the main process via fs:writeBuffer IPC,
 * which writes them to userData/media/<uuid>.<ext> and returns a pf:// URL.
 *
 * file.path is now only used as an OPTIMIZATION for large files (>50MB),
 * where we prefer fs.copyFileSync over transferring the ArrayBuffer.
 * For files under 50MB, we always use the buffer approach.
 *
 * STORAGE FORMAT (unchanged from v6):
 *   pf://media/<encoded-absolute-path>   — all files on disk
 *   data:<mime>;base64,...               — small images stored inline (REMOVED in v7;
 *                                          we now write everything to disk for consistency)
 */

const BACKUP_SLOTS = 5
const BACKUP_PREFIX = 'pf_backup_'
const DB_KEY = 'projectflow_db'
const SETTINGS_KEY = 'projectflow_settings'

// Above this size, prefer fs.copyFile over ArrayBuffer transfer (avoids IPC overhead)
const BUFFER_COPY_MAX = 50 * 1024 * 1024  // 50 MB

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface ImportedMedia {
  /** pf:// URL — store this in the database, use directly as <video src> */
  storedSrc: string
  /** Native OS path of the stored file (inside userData/media/) */
  nativePath: string | null
  /** Original file.path before import (may be relative/wrong — for debug only) */
  originalPath: string | null
  strategy: 'buffer-write' | 'fs-copy' | 'base64'
  size: number
}

// ── pf:// URL utilities ───────────────────────────────────────────────────────

export function isPfUrl(src: string): boolean {
  return src?.startsWith('pf://media/')
}

export function pfUrlToNativePath(pfUrl: string): string {
  if (!pfUrl?.startsWith('pf://media/')) return ''
  const encoded = pfUrl.slice('pf://media/'.length)
  const decoded = decodeURIComponent(encoded)
  if (/^[A-Za-z]:/.test(decoded)) return decoded.replace(/\//g, '\\')
  return decoded
}

export function nativePathToPfUrl(nativePath: string): string {
  if (!nativePath) return ''
  const forward = nativePath.replace(/\\/g, '/')
  const encoded = forward.split('/').map((seg, i) => {
    if (i === 0 && /^[A-Za-z]:$/.test(seg)) return seg
    if (seg === '') return ''
    return encodeURIComponent(seg)
  }).join('/')
  return `pf://media/${encoded}`
}

// ── toDisplaySrc ──────────────────────────────────────────────────────────────

export function toDisplaySrc(stored: string): string {
  if (!stored) return ''
  if (stored.startsWith('pf://')) return stored
  if (stored.startsWith('data:')) return stored
  if (stored.startsWith('blob:')) return ''

  // Legacy file:// URL → convert to pf://
  if (stored.startsWith('file:///')) {
    const decoded = decodeURIComponent(stored.slice('file:///'.length))
    const nativePath = /^[A-Za-z]:/.test(decoded) ? decoded : '/' + decoded
    return nativePathToPfUrl(nativePath)
  }
  if (stored.startsWith('file://')) {
    return nativePathToPfUrl(decodeURIComponent(stored.slice('file://'.length)))
  }

  // Legacy Windows absolute path C:\...
  if (/^[A-Za-z]:[/\\]/.test(stored)) return nativePathToPfUrl(stored)

  // Legacy Unix absolute path /home/...
  if (stored.startsWith('/')) return nativePathToPfUrl(stored)

  console.warn('[mediaPersistence] unknown stored format:', stored.slice(0, 80))
  return stored
}

export function toNativePath(stored: string): string {
  if (!stored) return ''
  if (stored.startsWith('data:') || stored.startsWith('blob:')) return ''
  if (stored.startsWith('pf://media/')) return pfUrlToNativePath(stored)
  if (stored.startsWith('pf:///')) {
    const p = decodeURIComponent(stored.slice('pf:///'.length))
    return /^[A-Za-z]:/.test(p) ? p.replace(/\//g, '\\') : p
  }
  if (stored.startsWith('file:///')) {
    const decoded = decodeURIComponent(stored.slice('file:///'.length))
    if (/^[A-Za-z]:/.test(decoded)) return decoded.replace(/\//g, '\\')
    return '/' + decoded
  }
  if (/^[A-Za-z]:[/\\]/.test(stored)) return stored.replace(/\//g, '\\')
  if (stored.startsWith('/')) return stored
  return stored
}

export function isBrokenSrc(stored: string): boolean {
  if (!stored) return true
  if (stored.startsWith('blob:')) return true
  return false
}

// Legacy aliases
export const resolveMediaSrc = toDisplaySrc
export const absolutePathToFileSrc = (p: string) => toDisplaySrc(p)
export const pfUrlToAbsolutePath = toNativePath

// ── Import strategies ─────────────────────────────────────────────────────────

/**
 * Strategy 1 (PRIMARY): Write file buffer to userData/media/ via IPC.
 * Works for ALL files regardless of what file.path says.
 * IPC overhead is acceptable up to ~50MB.
 */
async function importViaBuffer(file: File): Promise<{ pfUrl: string; nativePath: string } | null> {
  const electronAPI = (window as any).electronAPI
  if (!electronAPI?.writeBuffer) {
    console.warn('[mediaPersistence] writeBuffer not available')
    return null
  }

  try {
    const ext = file.name.split('.').pop()?.toLowerCase() || 'bin'
    const uuid = (crypto as any).randomUUID?.() ??
      `${Date.now()}-${Math.random().toString(36).slice(2)}`
    const destFileName = `${uuid}.${ext}`

    console.log('[mediaPersistence] reading buffer for:', file.name, `(${(file.size / 1024 / 1024).toFixed(2)}MB)`)

    // Read file as ArrayBuffer, convert to base64 for IPC transfer
    const arrayBuffer = await file.arrayBuffer()
    const base64 = arrayBufferToBase64(arrayBuffer)

    const result = await electronAPI.writeBuffer(base64, destFileName)
    if (!result?.success) {
      console.error('[mediaPersistence] writeBuffer failed:', result?.error)
      return null
    }

    return { pfUrl: result.pfUrl, nativePath: result.destPath }
  } catch (err) {
    console.error('[mediaPersistence] importViaBuffer exception:', err)
    return null
  }
}

/**
 * Strategy 2 (LARGE FILES): fs.copyFile via IPC when file.path is a real absolute path.
 * Preferred for files >50MB to avoid IPC memory pressure.
 */
async function importViaCopy(
  file: File,
  absoluteSourcePath: string
): Promise<{ pfUrl: string; nativePath: string } | null> {
  const electronAPI = (window as any).electronAPI
  if (!electronAPI?.copyFile || !electronAPI?.getMediaDir) return null

  try {
    const mediaDir: string = await electronAPI.getMediaDir()
    if (!mediaDir) return null

    const ext = file.name.split('.').pop()?.toLowerCase() || 'bin'
    const uuid = (crypto as any).randomUUID?.() ??
      `${Date.now()}-${Math.random().toString(36).slice(2)}`
    const destName = `${uuid}.${ext}`
    const sep = mediaDir.includes('\\') ? '\\' : '/'
    const destPath = `${mediaDir}${sep}${destName}`

    console.log('[mediaPersistence] fs.copy:', absoluteSourcePath.slice(-50), '→', destName)
    const result = await electronAPI.copyFile(absoluteSourcePath, destPath)

    if (!result?.success) {
      console.error('[mediaPersistence] copyFile failed:', result?.error)
      return null
    }

    const pfUrl = result.pfUrl || nativePathToPfUrl(result.destPath)
    return { pfUrl, nativePath: result.destPath }
  } catch (err) {
    console.error('[mediaPersistence] importViaCopy exception:', err)
    return null
  }
}

/**
 * Get an absolute native path from file.path if it's genuinely absolute.
 * Returns null if the path is relative, filename-only, or missing.
 */
function getAbsoluteFilePath(file: File): string | null {
  const p = (file as any).path as string | undefined
  if (!p || p.length < 3) return null

  // Must look like a Windows or Unix absolute path
  if (/^[A-Za-z]:[/\\]/.test(p)) return p   // C:\... or C:/...
  if (p.startsWith('/') && p.length > 1) return p  // /home/...

  // Anything else (relative, filename-only) is unreliable
  console.log('[mediaPersistence] ignoring unreliable file.path:', p.slice(0, 60))
  return null
}

// ── Core: importFile ──────────────────────────────────────────────────────────

export async function importFile(file: File): Promise<ImportedMedia> {
  const size = file.size
  const isVideo = /\.(mp4|mov|webm|mkv|avi|mxf|m4v|wmv)$/i.test(file.name) ||
    file.type.startsWith('video/')

  const absolutePath = getAbsoluteFilePath(file)

  console.log('[mediaPersistence] importFile:', file.name, {
    size: `${(size / 1024 / 1024).toFixed(2)}MB`,
    isVideo,
    absolutePath: absolutePath ? absolutePath.slice(-50) : '(none/relative)',
  })

  // ── Strategy 1: Buffer write (PRIMARY — works always) ──────────────────────
  // Use for all files under 50MB. Reliable regardless of file.path quality.
  if (size <= BUFFER_COPY_MAX) {
    const result = await importViaBuffer(file)
    if (result) {
      return {
        storedSrc: result.pfUrl,
        nativePath: result.nativePath,
        originalPath: absolutePath,
        strategy: 'buffer-write',
        size,
      }
    }
    console.warn('[mediaPersistence] buffer write failed, trying fallback for:', file.name)
  }

  // ── Strategy 2: fs.copy for large files (requires real absolute path) ──────
  if (absolutePath) {
    const result = await importViaCopy(file, absolutePath)
    if (result) {
      return {
        storedSrc: result.pfUrl,
        nativePath: result.nativePath,
        originalPath: absolutePath,
        strategy: 'fs-copy',
        size,
      }
    }
  }

  // ── Strategy 3: Buffer write even for large files (last resort) ────────────
  if (size > BUFFER_COPY_MAX) {
    console.warn('[mediaPersistence] large file (>50MB) with no absolute path, trying buffer write...')
    const result = await importViaBuffer(file)
    if (result) {
      return {
        storedSrc: result.pfUrl,
        nativePath: result.nativePath,
        originalPath: absolutePath,
        strategy: 'buffer-write',
        size,
      }
    }
  }

  // ── All strategies failed ──────────────────────────────────────────────────
  const hasElectronAPI = !!(window as any).electronAPI
  throw new Error(
    `Cannot import "${file.name}" (${(size / 1024 / 1024).toFixed(1)}MB): ` +
    (hasElectronAPI
      ? `writeBuffer IPC failed and no valid absolute path available`
      : `electronAPI not available — are you in a web browser instead of Electron?`)
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  // Process in chunks to avoid stack overflow on large files
  const chunkSize = 8192
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize))
  }
  return btoa(binary)
}

// ── Legacy compat ─────────────────────────────────────────────────────────────

export const fileToDurableSrc = async (file: File) => {
  const result = await importFile(file)
  return {
    src: result.storedSrc,
    absolutePath: result.nativePath,
    size: result.size,
    isDataUrl: false,
    strategy: result.strategy,
  }
}

// ── Backup system ─────────────────────────────────────────────────────────────

interface BackupEntry { timestamp: string; label: string; db: string; settings: string }

export const backupSystem = {
  createBackup(label = 'auto'): void {
    try {
      const dbData = localStorage.getItem(DB_KEY)
      const settings = localStorage.getItem(SETTINGS_KEY)
      if (!dbData) return
      const entry: BackupEntry = {
        timestamp: new Date().toISOString(), label, db: dbData, settings: settings || '{}'
      }
      const slots = this.getBackupSlots()
      const updated = [entry, ...slots].slice(0, BACKUP_SLOTS)
      updated.forEach((b, i) => localStorage.setItem(`${BACKUP_PREFIX}${i}`, JSON.stringify(b)))
    } catch (e) { console.warn('[backup] Failed:', e) }
  },
  getBackupSlots(): BackupEntry[] {
    const slots: BackupEntry[] = []
    for (let i = 0; i < BACKUP_SLOTS; i++) {
      const raw = localStorage.getItem(`${BACKUP_PREFIX}${i}`)
      if (raw) { try { slots.push(JSON.parse(raw)) } catch {} }
    }
    return slots
  },
  restoreBackup(index: number): boolean {
    try {
      const raw = localStorage.getItem(`${BACKUP_PREFIX}${index}`)
      if (!raw) return false
      const entry: BackupEntry = JSON.parse(raw)
      localStorage.setItem(DB_KEY, entry.db)
      if (entry.settings) localStorage.setItem(SETTINGS_KEY, entry.settings)
      return true
    } catch { return false }
  },
  exportBackup(index: number): void {
    const raw = localStorage.getItem(`${BACKUP_PREFIX}${index}`)
    if (!raw) return
    const entry: BackupEntry = JSON.parse(raw)
    const blob = new Blob(
      [JSON.stringify({ db: JSON.parse(entry.db), settings: JSON.parse(entry.settings), exportedAt: entry.timestamp }, null, 2)],
      { type: 'application/json' }
    )
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `projectflow-backup-${entry.timestamp.slice(0, 19).replace(/[T:]/g, '-')}.json`
    a.click()
    URL.revokeObjectURL(url)
  },
  startPeriodicBackup(intervalMs = 5 * 60 * 1000): () => void {
    const timer = setInterval(() => this.createBackup('periodic'), intervalMs)
    return () => clearInterval(timer)
  },
}
