import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { motion } from 'framer-motion'
import { Upload, X, MessageSquare, Film, SortAsc, Layers, Play } from 'lucide-react'
import { v4 as uuidv4 } from 'uuid'
import { Project, MediaFile } from '../../types'
import { useAppStore } from '../../store/appStore'
import { toast } from '../ui/Toast'
import MediaLightbox, { LightboxItem } from '../ui/MediaLightbox'
import { formatFileSize } from '../../utils'
import { isEXRBuffer, parseEXRHeader, PASS_COLORS, PASS_LABELS } from '../../utils/exrParser'
import { importFile, isBrokenSrc, toDisplaySrc, toNativePath } from '../../utils/mediaPersistence'
import { generateVideoPoster } from '../../utils/videoPoster'
import MissingMedia from '../ui/MissingMedia'
import { LocalImage, LocalVideo } from '../ui/LocalMedia'
import VideoCardFallback from '../ui/VideoCardFallback'
import EXRViewer from './EXRViewer'
import Modal from '../ui/Modal'

interface RenderFile extends MediaFile {
  isEXR?: boolean
  exrMetadata?: any
  // For EXR: we store the real absolute path from the File object
  absolutePath?: string
}

// Check if a path looks like a mov/video we should handle specially
function isMOV(filename: string) {
  return /\.(mov|mp4|webm|mkv|avi|mxf)$/i.test(filename)
}



export default function RendersSection({ project }: { project: Project }) {
  const updateProject = useAppStore(s => s.updateProject)
  const [lightboxId, setLightboxId] = useState<string | null>(null)
  const [exrModalId, setExrModalId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editComment, setEditComment] = useState('')
  const [editVersion, setEditVersion] = useState('')
  const [sortDesc, setSortDesc] = useState(true)

  const renders = project.renders as RenderFile[]
  const sorted = [...renders].sort((a, b) => {
    const d = new Date(a.addedAt).getTime() - new Date(b.addedAt).getTime()
    return sortDesc ? -d : d
  })

  const lightboxItems: LightboxItem[] = sorted
    .filter(r => !r.isEXR)
    .map(r => ({
      id: r.id, src: r.filePath, type: r.type,
      title: r.filename, caption: r.comment || undefined, versionLabel: r.versionLabel,
      thumbnailPath: r.thumbnailPath,
    }))

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (!acceptedFiles.length) return
    const newFiles: RenderFile[] = []
    const errors: string[] = []

    for (let i = 0; i < acceptedFiles.length; i++) {
      const file = acceptedFiles[i]
      try {
        const isEXR = file.name.toLowerCase().endsWith('.exr')
        let filePath = ''
        let absolutePath: string | undefined
        let exrMetadata: any = undefined

        if (isEXR) {
          const imported = await importFile(file)
          filePath = imported.storedSrc
          absolutePath = imported.storedPath ?? undefined
          try {
            const buf = await file.arrayBuffer()
            if (isEXRBuffer(buf)) exrMetadata = parseEXRHeader(buf)
          } catch {}
        } else {
          const imported = await importFile(file)
          filePath = imported.storedSrc
          absolutePath = imported.storedPath ?? undefined
        }

        if (!filePath) { errors.push(file.name); continue }

        const isVideo = !isEXR && (file.type.startsWith('video/') || isMOV(file.name))
        let thumbnailPath: string | undefined
        if (isVideo) {
          console.log('[renders] generating poster for:', file.name)
          const poster = await generateVideoPoster(filePath)
          if (poster) thumbnailPath = poster
          else console.warn('[renders] poster failed for:', file.name)
        }

        newFiles.push({
          id: uuidv4(), filePath, filename: file.name,
          type: isEXR ? 'image' as const : isVideo ? 'video' as const : 'image' as const,
          comment: '',
          versionLabel: `v${String(renders.length + i + 1).padStart(2, '0')}`,
          addedAt: new Date().toISOString(), size: file.size,
          isEXR, exrMetadata, absolutePath, thumbnailPath,
        })
      } catch (err: any) {
        errors.push(file.name)
        console.error(`[renders] ✗ ${file.name}:`, err.message)
      }
    }

    if (newFiles.length) {
      updateProject(project.id, { renders: [...renders, ...newFiles] })
      const exrCount = newFiles.filter(f => f.isEXR).length
      const parts = []
      if (newFiles.length - exrCount > 0) parts.push(`${newFiles.length - exrCount} file(s)`)
      if (exrCount > 0) parts.push(`${exrCount} EXR`)
      toast.success(`${parts.join(' + ')} imported`)
    }
    if (errors.length) toast.error(`${errors.length} file(s) failed`)
  }, [renders, project.id, updateProject])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [], 'video/*': [], 'application/octet-stream': ['.exr'], '.mov': [] },
  })

  const removeFile = (id: string) => {
    updateProject(project.id, { renders: renders.filter(r => r.id !== id) })
    toast.info('Removed')
  }

  const saveEdit = (id: string) => {
    updateProject(project.id, { renders: renders.map(r => r.id === id ? { ...r, comment: editComment, versionLabel: editVersion } : r) })
    setEditingId(null)
  }

  const openEXRExternal = async (file: RenderFile) => {
    // absolutePath is the real filesystem path; fall back to decoding the stored src
    const pathToOpen = file.absolutePath && !file.absolutePath.startsWith("data:") && !file.absolutePath.startsWith("blob:") ? toNativePath(file.absolutePath) : toNativePath(file.filePath)
    if (!pathToOpen || pathToOpen.startsWith('data:')) {
      toast.error('Cannot open: file path not available')
      return
    }
    if ((window as any).electronAPI) {
      const result = await (window as any).electronAPI.openPath(pathToOpen)
      if (result) toast.error(`Could not open file: ${result}`)
    } else {
      toast.info('Open in system viewer requires the desktop app')
    }
  }

  const exrFile = exrModalId ? sorted.find(r => r.id === exrModalId) as RenderFile | undefined : undefined
  const exrCount = renders.filter(r => r.isEXR).length

  return (
    <div className="h-full overflow-y-auto px-8 py-6" style={{ background: 'var(--bg-base)' }}>
      <div style={{ maxWidth: 900 }}>
        {/* Header */}
        <div className="flex items-end justify-between mb-6">
          <div>
            <p style={{ fontSize: 10, color: 'var(--fg-muted)', fontFamily: 'DM Mono, monospace', letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 6 }}>Output</p>
            <h2 style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: 38, color: 'var(--fg-primary)', fontWeight: 400, letterSpacing: '-0.02em', lineHeight: 1 }}>Renders</h2>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setSortDesc(s => !s)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, height: 28, padding: '0 12px', borderRadius: 4, border: '1px solid var(--border-subtle)', fontSize: 11, color: 'var(--fg-muted)', background: 'transparent', cursor: 'pointer' }}>
              <SortAsc size={11} style={{ transform: sortDesc ? 'none' : 'rotate(180deg)' }} />
              {sortDesc ? 'Newest' : 'Oldest'}
            </button>
            <span style={{ fontSize: 11, fontFamily: 'DM Mono, monospace', color: 'var(--fg-muted)' }}>
              {renders.length} file{renders.length !== 1 ? 's' : ''}
              {exrCount > 0 && <span style={{ color: 'var(--fg-subtle)' }}> · {exrCount} EXR</span>}
            </span>
          </div>
        </div>

        {/* Drop zone */}
        <div {...getRootProps()}
          style={{
            border: `1px solid ${isDragActive ? 'var(--accent-green-dim)' : 'var(--border-subtle)'}`,
            background: isDragActive ? 'var(--accent-green-ghost)' : 'var(--bg-surface)',
            borderRadius: 6, padding: '20px 24px', marginBottom: 20, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 16, transition: 'all 0.2s ease',
          }}>
          <input {...getInputProps()} />
          <Upload size={16} style={{ color: isDragActive ? 'var(--accent-green)' : 'var(--fg-subtle)', flexShrink: 0 }} />
          <div>
            <p style={{ fontSize: 13, color: 'var(--fg-secondary)', marginBottom: 3 }}>
              {isDragActive ? 'Drop renders here' : 'Drag & drop renders'}
            </p>
            <p style={{ fontSize: 11, color: 'var(--fg-subtle)' }}>
              Images, videos (.mov, .mp4, .webm) &amp; <span style={{ fontFamily: 'DM Mono, monospace' }}>.exr</span> with AOV detection
            </p>
          </div>
        </div>

        {/* Grid */}
        {sorted.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {sorted.map((file, i) => {
              const topPass = file.exrMetadata?.passes?.[0]
              const passCol = topPass ? PASS_COLORS[topPass.type] : null

              return (
                <motion.div key={file.id}
                  initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: i * 0.04 }}
                  className="group"
                  style={{ borderRadius: 6, overflow: 'hidden', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)', transition: 'border-color 0.15s' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-emphasis)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-subtle)'}
                >
                  {/* Thumbnail */}
                  <div style={{ position: 'relative', aspectRatio: '16/9', cursor: 'pointer', overflow: 'hidden' }}
                    onClick={() => file.isEXR ? setExrModalId(file.id) : setLightboxId(file.id)}>

                    {file.isEXR ? (
                      // EXR thumbnail
                      <div style={{ width: '100%', height: '100%', background: 'var(--bg-elevated)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, position: 'relative' }}>
                        <div style={{ position: 'absolute', inset: 0, background: passCol ? `radial-gradient(ellipse, ${passCol.dot}20 0%, transparent 70%)` : undefined }} />
                        <svg width="32" height="32" viewBox="0 0 32 32" fill="none" opacity="0.45">
                          <rect x="2" y="2" width="28" height="28" rx="2" stroke="white" strokeWidth="0.7"/>
                          <line x1="2" y1="11" x2="30" y2="11" stroke="white" strokeWidth="0.4"/>
                          <line x1="2" y1="21" x2="30" y2="21" stroke="white" strokeWidth="0.4"/>
                          <line x1="11" y1="2" x2="11" y2="30" stroke="white" strokeWidth="0.4"/>
                          <line x1="21" y1="2" x2="21" y2="30" stroke="white" strokeWidth="0.4"/>
                          {passCol && <rect x="11" y="11" width="10" height="10" fill={passCol.dot} opacity="0.65"/>}
                        </svg>
                        <span style={{ fontSize: 10, fontFamily: 'DM Mono, monospace', color: 'var(--fg-subtle)' }}>EXR</span>
                        {file.exrMetadata?.passes?.length > 0 && (
                          <span style={{ fontSize: 10, fontFamily: 'DM Mono, monospace', color: passCol?.text ?? 'var(--fg-subtle)' }}>
                            {file.exrMetadata.passes.length} pass{file.exrMetadata.passes.length !== 1 ? 'es' : ''}
                          </span>
                        )}
                      </div>
                    ) : file.type === 'video' ? (
                      // Video thumbnail — use generated thumbnail or show player icon
                      <div style={{ position: 'relative', width: '100%', height: '100%', background: 'var(--bg-elevated)' }}>
                        {file.thumbnailPath ? (
                          <img src={file.thumbnailPath} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <VideoCardFallback
                            filePath={file.filePath}
                            filename={file.filename}
                            onPosterGenerated={(poster) => {
                              updateProject(project.id, { renders: renders.map(r => r.id === file.id ? { ...r, thumbnailPath: poster } : r) })
                            }}
                            onPlay={() => setLightboxId(file.id)}
                          />
                        )}
                        {/* Play overlay */}
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Play size={14} style={{ color: 'rgba(255,255,255,0.8)', marginLeft: 2 }} />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <LocalImage src={file.filePath} fileSize={file.size} alt={file.filename}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.5s ease' }} />
                    )}

                    {/* Hover overlay */}
                    <div className="group-hover:opacity-100"
                      style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', opacity: 0, transition: 'opacity 0.2s' }} />

                    {/* Badges */}
                    <div style={{ position: 'absolute', top: 8, left: 8, display: 'flex', gap: 4 }}>
                      {file.isEXR && (
                        <span style={{ fontSize: 9, fontFamily: 'DM Mono, monospace', padding: '2px 6px', borderRadius: 3, background: 'rgba(0,0,0,0.8)', border: '1px solid var(--border-subtle)', color: passCol?.dot ?? 'var(--fg-muted)' }}>EXR</span>
                      )}
                      {file.type === 'video' && !file.isEXR && (
                        <span style={{ fontSize: 9, fontFamily: 'DM Mono, monospace', padding: '2px 6px', borderRadius: 3, background: 'rgba(0,0,0,0.8)', border: '1px solid var(--border-subtle)', color: 'var(--fg-muted)' }}>
                          {file.filename.split('.').pop()?.toUpperCase()}
                        </span>
                      )}
                      <span style={{ fontSize: 9, fontFamily: 'DM Mono, monospace', padding: '2px 6px', borderRadius: 3, background: 'rgba(0,0,0,0.8)', border: '1px solid var(--border-subtle)', color: 'var(--fg-muted)' }}>{file.versionLabel}</span>
                    </div>

                    {/* Remove button */}
                    <button onClick={e => { e.stopPropagation(); removeFile(file.id) }}
                      style={{ position: 'absolute', top: 8, right: 8, width: 22, height: 22, borderRadius: '50%', background: 'rgba(0,0,0,0.8)', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--fg-muted)', cursor: 'pointer', opacity: 0, transition: 'opacity 0.2s' }}
                      className="group-hover:opacity-100">
                      <X size={10} />
                    </button>
                  </div>

                  {/* EXR pass chips */}
                  {file.isEXR && file.exrMetadata?.passes?.length > 0 && (
                    <div style={{ padding: '8px 12px 4px', display: 'flex', gap: 4, overflowX: 'auto' }}>
                      {file.exrMetadata.passes.slice(0, 4).map((p: any) => {
                        const c = PASS_COLORS[p.type]
                        return (
                          <span key={p.name} style={{ fontSize: 9, fontFamily: 'DM Mono, monospace', padding: '2px 6px', borderRadius: 3, border: `1px solid ${c.dot}40`, background: c.bg, color: c.text, flexShrink: 0 }}>
                            {PASS_LABELS[p.type]}
                          </span>
                        )
                      })}
                      {file.exrMetadata.passes.length > 4 && <span style={{ fontSize: 9, color: 'var(--fg-subtle)', fontFamily: 'DM Mono, monospace', alignSelf: 'center' }}>+{file.exrMetadata.passes.length - 4}</span>}
                    </div>
                  )}

                  {/* Info */}
                  <div style={{ padding: 12 }}>
                    <p style={{ fontSize: 11, color: 'var(--fg-secondary)', marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.filename}</p>

                    {editingId === file.id ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <input value={editVersion} onChange={e => setEditVersion(e.target.value)} placeholder="Version"
                          style={{ height: 24, padding: '0 8px', borderRadius: 3, background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', fontSize: 11, color: 'var(--fg-primary)', outline: 'none', fontFamily: 'DM Mono, monospace' }} />
                        <input autoFocus value={editComment} onChange={e => setEditComment(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') saveEdit(file.id); if (e.key === 'Escape') setEditingId(null) }}
                          placeholder="Comment..." style={{ height: 24, padding: '0 8px', borderRadius: 3, background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', fontSize: 11, color: 'var(--fg-primary)', outline: 'none' }} />
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button onClick={() => saveEdit(file.id)} style={{ fontSize: 10, color: 'var(--accent-green)', background: 'none', border: 'none', cursor: 'pointer' }}>Save</button>
                          <button onClick={() => setEditingId(null)} style={{ fontSize: 10, color: 'var(--fg-subtle)', background: 'none', border: 'none', cursor: 'pointer' }}>Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 4 }}>
                        <p style={{ fontSize: 10, color: 'var(--fg-subtle)', flex: 1, lineHeight: 1.5 }}>
                          {file.comment || <span style={{ opacity: 0.4, fontStyle: 'italic' }}>No comment</span>}
                        </p>
                        <button onClick={() => { setEditingId(file.id); setEditComment(file.comment); setEditVersion(file.versionLabel) }}
                          style={{ color: 'var(--fg-subtle)', background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0 }}>
                          <MessageSquare size={10} />
                        </button>
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border-subtle)' }}>
                      <span style={{ fontSize: 10, color: 'var(--fg-subtle)', fontFamily: 'DM Mono, monospace' }}>{new Date(file.addedAt).toLocaleDateString('en', { month: 'short', day: 'numeric' })}</span>
                      {file.size && <span style={{ fontSize: 10, color: 'var(--fg-subtle)', fontFamily: 'DM Mono, monospace' }}>{formatFileSize(file.size)}</span>}
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 0', textAlign: 'center' }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12, color: 'var(--fg-subtle)' }}>
              <Film size={18} />
            </div>
            <p style={{ fontSize: 13, color: 'var(--fg-muted)' }}>No renders yet</p>
            <p style={{ fontSize: 11, color: 'var(--fg-subtle)', marginTop: 4 }}>Import images, videos, or .exr files</p>
          </div>
        )}
      </div>

      {/* Video lightbox — supports .mov playback */}
      {lightboxId && <MediaLightbox items={lightboxItems} initialId={lightboxId} onClose={() => setLightboxId(null)} />}

      {/* EXR modal */}
      <Modal open={!!exrFile} onClose={() => setExrModalId(null)} title={exrFile?.filename} size="xl">
        {exrFile && (
          <div style={{ height: 520 }}>
            <EXRViewer
              filename={exrFile.filename}
              filePath={exrFile.absolutePath || toDisplaySrc(exrFile.filePath)}
              metadata={exrFile.exrMetadata}
              onOpenExternal={() => openEXRExternal(exrFile)}
            />
          </div>
        )}
      </Modal>
    </div>
  )
}
