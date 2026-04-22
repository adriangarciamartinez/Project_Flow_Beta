import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { motion } from 'framer-motion'
import { Eye, X, Play } from 'lucide-react'
import { v4 as uuidv4 } from 'uuid'
import { Project, MediaFile } from '../../types'
import { useAppStore } from '../../store/appStore'
import { toast } from '../ui/Toast'
import MediaLightbox, { LightboxItem } from '../ui/MediaLightbox'
import { formatFileSize } from '../../utils'
import { importFile, isBrokenSrc, toDisplaySrc } from '../../utils/mediaPersistence'
import { generateVideoPoster } from '../../utils/videoPoster'
import MissingMedia from '../ui/MissingMedia'
import { LocalImage, LocalVideo } from '../ui/LocalMedia'
import VideoCardFallback from '../ui/VideoCardFallback'

export default function PreviewsSection({ project }: { project: Project }) {
  const updateProject = useAppStore(s => s.updateProject)
  const [lightboxId, setLightboxId] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)

  const lightboxItems: LightboxItem[] = project.previews.map(r => ({
    id: r.id, src: r.filePath, type: r.type, title: r.filename, versionLabel: r.versionLabel,
    thumbnailPath: r.thumbnailPath,
  }))

  const doImport = useCallback(async (files: File[]) => {
    if (!files.length) return
    setImporting(true)
    const added: MediaFile[] = []
    const failed: string[] = []

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        try {
          const { storedSrc, size } = await importFile(file)
          const isVideo = /\.(mp4|mov|webm|mkv|avi|mxf)$/i.test(file.name) || file.type.startsWith('video/')

          let thumbnailPath: string | undefined
          if (isVideo) {
            console.log('[previews] generating poster for:', file.name)
            const poster = await generateVideoPoster(storedSrc)
            if (poster) {
              thumbnailPath = poster
              console.log('[previews] poster ready for:', file.name)
            } else {
              console.warn('[previews] poster generation failed for:', file.name)
            }
          }

          added.push({
            id: uuidv4(),
            filePath: storedSrc,
            filename: file.name,
            type: isVideo ? 'video' : 'image',
            comment: '',
            versionLabel: `wip_${String(project.previews.length + i + 1).padStart(2, '0')}`,
            addedAt: new Date().toISOString(),
            size,
            thumbnailPath,
          })
        } catch (err: any) {
          failed.push(file.name)
          console.error('[previews] import failed:', file.name, err.message)
        }
      }

      if (added.length) {
        updateProject(project.id, { previews: [...project.previews, ...added] })
        toast.success(`${added.length} preview${added.length > 1 ? 's' : ''} added`)
      }
      if (failed.length) toast.error(`${failed.length} file(s) could not be imported`)
    } catch (outerErr: any) {
      console.error('[previews] unexpected import error:', outerErr)
      toast.error('Import failed unexpectedly')
    } finally {
      setImporting(false)
    }
  }, [project, updateProject])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: doImport,
    accept: { 'image/*': [], 'video/*': [], 'application/octet-stream': [] },
    multiple: true,
  })

  const removeFile = (id: string) => {
    updateProject(project.id, { previews: project.previews.filter(r => r.id !== id) })
  }

  return (
    <div className="h-full overflow-y-auto px-8 py-6" style={{ background: 'var(--bg-base)' }}>
      <div style={{ maxWidth: 900 }}>
        <div className="flex items-end justify-between mb-6">
          <div>
            <p style={{ fontSize: 10, color: 'var(--fg-muted)', fontFamily: 'DM Mono, monospace', letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 6 }}>Work In Progress</p>
            <h2 style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: 38, color: 'var(--fg-primary)', fontWeight: 400, letterSpacing: '-0.02em', lineHeight: 1 }}>Previews</h2>
          </div>
          <span style={{ fontSize: 11, fontFamily: 'DM Mono, monospace', color: 'var(--fg-muted)' }}>{project.previews.length} file{project.previews.length !== 1 ? 's' : ''}</span>
        </div>

        <div {...getRootProps()} style={{
          border: `1px solid ${isDragActive ? 'var(--accent-green-dim)' : 'var(--border-subtle)'}`,
          background: isDragActive ? 'var(--accent-green-ghost)' : 'var(--bg-surface)',
          borderRadius: 6, padding: '20px 24px', marginBottom: 20, cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 16, transition: 'all 0.2s ease',
        }}>
          <input {...getInputProps()} />
          <Eye size={16} style={{ color: isDragActive ? 'var(--accent-green)' : 'var(--fg-subtle)', flexShrink: 0 }} />
          <div>
            <p style={{ fontSize: 13, color: 'var(--fg-secondary)', marginBottom: 3 }}>
              {importing ? 'Importing…' : isDragActive ? 'Drop previews here' : 'Drag & drop previews'}
            </p>
            <p style={{ fontSize: 11, color: 'var(--fg-subtle)' }}>Images and videos (.mp4, .mov, .webm…) — or click to browse</p>
          </div>
        </div>

        {project.previews.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {project.previews.map((file, i) => {
              const broken = isBrokenSrc(file.filePath)
              return (
                <motion.div key={file.id}
                  initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: Math.min(i * 0.03, 0.15) }}
                  className="group"
                  style={{ borderRadius: 6, overflow: 'hidden', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)', transition: 'border-color 0.15s' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-emphasis)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-subtle)'}
                >
                  <div style={{ position: 'relative', aspectRatio: '16/9', cursor: broken ? 'default' : 'pointer', overflow: 'hidden' }}
                    onClick={() => !broken && setLightboxId(file.id)}>
                    {broken ? (
                      <MissingMedia filename={file.filename} compact onRemove={() => removeFile(file.id)} />
                    ) : file.type === 'video' ? (
                      <div style={{ position: 'relative', width: '100%', height: '100%', background: 'var(--bg-elevated)' }}>
                        {/* Show poster thumbnail if available, otherwise use video element */}
                        {file.thumbnailPath ? (
                          <img src={file.thumbnailPath} alt={file.filename}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <VideoCardFallback
                            filePath={file.filePath}
                            filename={file.filename}
                            onPosterGenerated={(poster) => {
                              updateProject(project.id, {
                                previews: project.previews.map(p => p.id === file.id ? { ...p, thumbnailPath: poster } : p)
                              })
                            }}
                            onPlay={() => setLightboxId(file.id)}
                          />
                        )}
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                          <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Play size={14} style={{ color: 'rgba(255,255,255,0.8)', marginLeft: 2 }} />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <LocalImage src={file.filePath} alt={file.filename} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    )}
                    {!broken && <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', opacity: 0, transition: 'opacity 0.2s' }} className="group-hover:opacity-100" />}
                    <div style={{ position: 'absolute', top: 8, left: 8 }}>
                      <span style={{ fontSize: 9, fontFamily: 'DM Mono, monospace', padding: '2px 6px', borderRadius: 3, background: 'rgba(0,0,0,0.8)', border: '1px solid var(--border-subtle)', color: 'var(--fg-muted)' }}>{file.versionLabel}</span>
                    </div>
                    <button onClick={e => { e.stopPropagation(); removeFile(file.id) }}
                      style={{ position: 'absolute', top: 8, right: 8, width: 22, height: 22, borderRadius: '50%', background: 'rgba(0,0,0,0.8)', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--fg-muted)', cursor: 'pointer', opacity: 0, transition: 'opacity 0.2s' }}
                      className="group-hover:opacity-100"><X size={10} /></button>
                  </div>
                  <div style={{ padding: 12 }}>
                    <p style={{ fontSize: 11, color: 'var(--fg-secondary)', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.filename}</p>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
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
            <div style={{ width: 48, height: 48, borderRadius: '50%', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12, color: 'var(--fg-subtle)' }}><Eye size={18} /></div>
            <p style={{ fontSize: 13, color: 'var(--fg-muted)' }}>No previews yet</p>
            <p style={{ fontSize: 11, color: 'var(--fg-subtle)', marginTop: 4 }}>Import WIP images or videos above</p>
          </div>
        )}
      </div>
      {lightboxId && <MediaLightbox items={lightboxItems} initialId={lightboxId} onClose={() => setLightboxId(null)} />}
    </div>
  )
}
