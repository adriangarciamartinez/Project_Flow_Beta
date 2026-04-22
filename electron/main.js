/**
 * main.js — ProjectFlow
 *
 * VIDEO ARCHITECTURE (inspired by Electron Video Player reference):
 * ─────────────────────────────────────────────────────────────────
 * We register a custom `pf://` protocol with full streaming privileges.
 * The protocol handler streams files via fs.createReadStream with proper
 * HTTP Range / 206 Partial Content responses.
 *
 * WHY THIS IS THE RIGHT APPROACH:
 *   - file:// URLs work for images but Chromium's video decoder requires
 *     proper HTTP Range semantics to determine codec, duration, and seek.
 *   - Without Range/206 responses, Chromium can't detect the codec →
 *     falls back to ffmpeg software decode → fails for H.264 if not
 *     compiled with proprietary_codecs → MediaError code=4.
 *   - With pf:// streaming + Range responses, Chromium gets the full
 *     HTTP video contract: Content-Length, Accept-Ranges, 206 on range
 *     requests → hardware decode path kicks in → H.264 MP4 plays.
 *   - webSecurity: false is removed (not needed with the protocol).
 *
 * SOURCES:
 *   - Electron Video Player (BillelMessaadi/electronjs-local-video-player)
 *   - https://copyprogramming.com/howto/play-local-video-file-in-electron-html5-video-player-using-node-js-fs-readstream
 *   - Electron protocol docs: protocol.registerSchemesAsPrivileged + protocol.handle
 */

const { app, BrowserWindow, ipcMain, dialog, shell, protocol, net } = require('electron')
const path = require('path')
const fs = require('fs')
const { spawn } = require('child_process')
const { pathToFileURL } = require('url')

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

// ── MUST happen before app.whenReady() ────────────────────────────────────────
// Register our custom media protocol with full streaming privileges.
// standard: true  → Chromium treats it like http (enables Range, caching, CORS)
// stream: true    → enables ReadableStream responses
// supportFetchAPI → renderer can use fetch() with this scheme
// bypassCSP       → no CSP blocks on media from this scheme
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'pf',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      bypassCSP: true,
      stream: true,
    },
  },
])

let mainWindow = null

app.whenReady().then(() => {
  // ── Register pf:// protocol handler ─────────────────────────────────────────
  // pf://media/<encoded-absolute-path>
  // Streams the file from the filesystem with proper Range/206 support.
  protocol.handle('pf', async (request) => {
    try {
      const url = new URL(request.url)

      // host = 'media', pathname = /<encoded path>
      if (url.host !== 'media') {
        return new Response('Not found', { status: 404 })
      }

      // Decode the file path: remove leading '/'
      const encoded = url.pathname.slice(1)
      const filePath = decodeURIComponent(encoded)

      // Security: must be an absolute path (no traversal tricks)
      if (!path.isAbsolute(filePath)) {
        console.warn('[pf://] rejected non-absolute path:', filePath)
        return new Response('Forbidden', { status: 403 })
      }

      if (!fs.existsSync(filePath)) {
        console.warn('[pf://] file not found:', filePath)
        return new Response('Not found', { status: 404 })
      }

      const stat = fs.statSync(filePath)
      const fileSize = stat.size
      const ext = path.extname(filePath).toLowerCase()
      const mimeType = getMimeType(ext)

      // ── Range request handling (critical for video seeking) ──────────────────
      const rangeHeader = request.headers.get('range')

      if (rangeHeader) {
        const match = rangeHeader.match(/bytes=(\d*)-(\d*)/)
        if (!match) {
          return new Response('Invalid range', { status: 400 })
        }

        const start = match[1] ? parseInt(match[1], 10) : 0
        const end = match[2] ? parseInt(match[2], 10) : fileSize - 1
        const clampedEnd = Math.min(end, fileSize - 1)

        if (start > clampedEnd || start >= fileSize) {
          return new Response('Range Not Satisfiable', {
            status: 416,
            headers: { 'Content-Range': `bytes */${fileSize}` },
          })
        }

        const contentLength = clampedEnd - start + 1
        const stream = fs.createReadStream(filePath, { start, end: clampedEnd })

        console.log(`[pf://] 206 ${path.basename(filePath)} bytes=${start}-${clampedEnd}/${fileSize}`)

        return new Response(stream, {
          status: 206,
          headers: {
            'Content-Range': `bytes ${start}-${clampedEnd}/${fileSize}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': String(contentLength),
            'Content-Type': mimeType,
            'Cache-Control': 'no-cache',
          },
        })
      }

      // ── Full file response ───────────────────────────────────────────────────
      const stream = fs.createReadStream(filePath)
      console.log(`[pf://] 200 ${path.basename(filePath)} (${(fileSize / 1024 / 1024).toFixed(1)}MB)`)

      return new Response(stream, {
        status: 200,
        headers: {
          'Content-Length': String(fileSize),
          'Content-Type': mimeType,
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'no-cache',
        },
      })
    } catch (err) {
      console.error('[pf://] handler error:', err)
      return new Response('Internal error', { status: 500 })
    }
  })

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

function getMimeType(ext) {
  const types = {
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.mov': 'video/quicktime',
    '.mkv': 'video/x-matroska',
    '.avi': 'video/x-msvideo',
    '.m4v': 'video/mp4',
    '.mxf': 'video/mxf',
    '.wmv': 'video/x-ms-wmv',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
    '.exr': 'image/x-exr',
    '.jpg': 'image/jpeg',
  }
  return types[ext] || 'application/octet-stream'
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    backgroundColor: '#0e0e10',
    frame: false,
    titleBarStyle: process.platform === 'darwin' ? 'hidden' : 'default',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      // webSecurity: true (default) — pf:// protocol handles security correctly
      // We no longer need webSecurity:false
    },
    show: false,
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.once('ready-to-show', () => { mainWindow.show(); mainWindow.focus() })
  mainWindow.on('closed', () => { mainWindow = null })
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// ── Path normalization ────────────────────────────────────────────────────────
function normalizeToAbsolutePath(inputPath) {
  if (!inputPath) return ''
  let p = inputPath.trim()

  // Strip pf:// or file:// scheme → get raw path
  if (p.startsWith('pf://media/')) {
    p = decodeURIComponent(p.slice('pf://media/'.length))
  } else if (p.startsWith('file:///')) {
    p = decodeURIComponent(p.slice('file:///'.length))
    if (!/^[A-Za-z]:/.test(p)) p = '/' + p
  } else if (p.startsWith('file://')) {
    p = decodeURIComponent(p.slice('file://'.length))
  } else if (p.startsWith('pf://')) {
    p = decodeURIComponent(p.slice('pf://'.length))
  }

  p = p.replace(/^\/+([A-Za-z]:)/, '$1')
  p = p.split(/[/\\]/).join(path.sep)

  if (!path.isAbsolute(p)) {
    const resolved = path.resolve(p)
    console.log('[main] relative path resolved:', p, '→', resolved)
    p = resolved
  }

  return p
}

/**
 * Convert an absolute native path to a pf://media/ URL.
 * This is what the renderer should use as <video src>.
 */
function nativePathToPfUrl(nativePath) {
  // Use forward slashes, encode each path segment
  const forward = nativePath.replace(/\\/g, '/')
  const encoded = forward.split('/').map((seg, i) => {
    if (i === 0 && /^[A-Za-z]:$/.test(seg)) return seg  // drive letter
    if (seg === '') return ''
    return encodeURIComponent(seg)
  }).join('/')
  return `pf://media/${encoded}`
}

// ── IPC Handlers ──────────────────────────────────────────────────────────────

ipcMain.handle('dialog:openFile', async (_, options) =>
  dialog.showOpenDialog(mainWindow, { ...options, properties: options?.properties || ['openFile'] })
)
ipcMain.handle('dialog:openDirectory', async () =>
  dialog.showOpenDialog(mainWindow, { properties: ['openDirectory'] })
)

ipcMain.handle('shell:openPath', async (_, filePath) => {
  const normalized = normalizeToAbsolutePath(filePath)
  console.log('[main] shell:openPath:', filePath, '→', normalized)
  if (!fs.existsSync(normalized)) {
    return `File not found: ${normalized}`
  }
  return shell.openPath(normalized)
})

ipcMain.handle('shell:showItemInFolder', async (_, filePath) => {
  shell.showItemInFolder(normalizeToAbsolutePath(filePath))
})

ipcMain.handle('fs:readFile', async (_, filePath) => {
  try { return { success: true, data: fs.readFileSync(filePath).toString('base64') } }
  catch (err) { return { success: false, error: String(err) } }
})

ipcMain.handle('fs:exists', async (_, filePath) => {
  return fs.existsSync(normalizeToAbsolutePath(filePath))
})

ipcMain.handle('fs:createDir', async (_, dirPath) => {
  try { fs.mkdirSync(dirPath, { recursive: true }); return { success: true } }
  catch (err) { return { success: false, error: String(err) } }
})

ipcMain.handle('fs:resolvePath', async (_, inputPath) => {
  const resolved = normalizeToAbsolutePath(inputPath)
  const exists = fs.existsSync(resolved)
  const pfUrl = exists ? nativePathToPfUrl(resolved) : null
  console.log('[main] fs:resolvePath:', inputPath, '→', resolved, '| exists:', exists)
  return { resolved, exists, pfUrl }
})

ipcMain.handle('fs:copyFile', async (_, sourcePath, destPath) => {
  try {
    const src = normalizeToAbsolutePath(sourcePath)
    const dst = normalizeToAbsolutePath(destPath)
    console.log('[main] fs:copyFile:', src, '→', dst)
    if (!fs.existsSync(src)) return { success: false, error: `Source not found: ${src}` }
    fs.mkdirSync(path.dirname(dst), { recursive: true })
    fs.copyFileSync(src, dst)
    const pfUrl = nativePathToPfUrl(dst)
    console.log('[main] fs:copyFile ✓ pfUrl:', pfUrl)
    return { success: true, destPath: dst, pfUrl }
  } catch (err) {
    console.error('[main] fs:copyFile error:', err)
    return { success: false, error: String(err) }
  }
})

ipcMain.handle('app:getMediaDir', async () => {
  const mediaDir = path.join(app.getPath('userData'), 'media')
  fs.mkdirSync(mediaDir, { recursive: true })
  return mediaDir
})

/**
 * Write raw file bytes (from File.arrayBuffer()) to userData/media/<uuid>.<ext>.
 *
 * WHY THIS EXISTS:
 *   file.path in Electron is unreliable — it can be relative (.\file.mp4),
 *   filename-only (file.mp4), or point to a temp location that doesn't exist.
 *   File.arrayBuffer() ALWAYS works for any file dragged into the app.
 *   This handler receives the buffer and writes it to a stable absolute location.
 *
 * Returns: { success, destPath, pfUrl }
 */
ipcMain.handle('fs:writeBuffer', async (_, base64Data, destFileName) => {
  try {
    const mediaDir = path.join(app.getPath('userData'), 'media')
    fs.mkdirSync(mediaDir, { recursive: true })

    const destPath = path.join(mediaDir, destFileName)
    const buffer = Buffer.from(base64Data, 'base64')
    fs.writeFileSync(destPath, buffer)

    const pfUrl = nativePathToPfUrl(destPath)
    console.log('[main] fs:writeBuffer ✓', destFileName, `${(buffer.length / 1024 / 1024).toFixed(2)}MB`, '→', pfUrl.slice(0, 80))
    return { success: true, destPath, pfUrl }
  } catch (err) {
    console.error('[main] fs:writeBuffer error:', err)
    return { success: false, error: String(err) }
  }
})

// Convert a native absolute path → pf:// URL (for renderer use)
ipcMain.handle('media:toPfUrl', async (_, nativePath) => {
  const normalized = normalizeToAbsolutePath(nativePath)
  if (!normalized) return null
  return nativePathToPfUrl(normalized)
})

// ── ffmpeg helpers ────────────────────────────────────────────────────────────

function findFfmpeg() {
  const candidates = [
    path.join(path.dirname(app.getPath('exe')), 'ffmpeg.exe'),
    path.join(path.dirname(app.getPath('exe')), 'ffmpeg'),
    path.join(app.getAppPath(), '..', 'ffmpeg.exe'),
    path.join(app.getAppPath(), '..', 'ffmpeg'),
  ]
  for (const c of candidates) {
    if (fs.existsSync(c)) return c
  }
  return process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg'
}

function runFfmpeg(args, timeout = 30000) {
  return new Promise((resolve) => {
    const ffmpegCmd = findFfmpeg()
    let stderr = ''
    const proc = spawn(ffmpegCmd, args, { timeout })
    proc.stderr.on('data', d => { stderr += d.toString() })
    proc.on('close', code => resolve({ success: code === 0, code, stderr: stderr.slice(-500) }))
    proc.on('error', err => resolve({ success: false, code: -1, stderr: err.message }))
  })
}

ipcMain.handle('media:generateThumbnail', async (_, videoPath, outputPath) => {
  const src = normalizeToAbsolutePath(videoPath)
  const dst = normalizeToAbsolutePath(outputPath)
  if (!fs.existsSync(src)) return { success: false, error: `Source not found: ${src}` }
  fs.mkdirSync(path.dirname(dst), { recursive: true })

  const result = await runFfmpeg([
    '-y', '-ss', '00:00:01.000', '-i', src,
    '-vframes', '1',
    '-vf', 'scale=640:360:force_original_aspect_ratio=decrease,pad=640:360:(ow-iw)/2:(oh-ih)/2:black',
    '-q:v', '2', dst,
  ], 20000)

  if (result.success && fs.existsSync(dst)) {
    return { success: true, thumbnailPath: dst }
  }
  return { success: false, error: result.stderr?.slice(0, 200) }
})

ipcMain.handle('media:transcodeProxy', async (_, videoPath, proxyOutputPath) => {
  const src = normalizeToAbsolutePath(videoPath)
  const dst = normalizeToAbsolutePath(proxyOutputPath)
  if (!fs.existsSync(src)) return { success: false, error: `Source not found: ${src}` }
  if (fs.existsSync(dst) && fs.statSync(dst).size > 1000) {
    return { success: true, proxyPath: dst, pfUrl: nativePathToPfUrl(dst) }
  }
  fs.mkdirSync(path.dirname(dst), { recursive: true })

  const result = await runFfmpeg([
    '-y', '-i', src,
    '-c:v', 'libvpx-vp9', '-crf', '35', '-b:v', '0',
    '-vf', "scale='min(854,iw)':'min(480,ih)':force_original_aspect_ratio=decrease",
    '-deadline', 'realtime', '-cpu-used', '8',
    '-c:a', 'libopus', '-b:a', '96k', '-ac', '2',
    dst,
  ], 120000)

  if (result.success && fs.existsSync(dst) && fs.statSync(dst).size > 1000) {
    return { success: true, proxyPath: dst, pfUrl: nativePathToPfUrl(dst) }
  }
  return { success: false, error: result.stderr?.slice(0, 300) }
})

ipcMain.handle('media:checkFfmpeg', async () => {
  const result = await runFfmpeg(['-version'], 5000)
  const available = result.success || (result.stderr && result.stderr.includes('ffmpeg version'))
  return { available, version: result.stderr?.split('\n')[0] || '' }
})

ipcMain.handle('app:getPath', async (_, name) => app.getPath(name))
ipcMain.handle('window:minimize', () => mainWindow?.minimize())
ipcMain.handle('window:maximize', () => mainWindow?.isMaximized() ? mainWindow.unmaximize() : mainWindow?.maximize())
ipcMain.handle('window:close', () => mainWindow?.close())
