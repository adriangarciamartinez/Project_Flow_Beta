import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { motion, AnimatePresence } from 'framer-motion'
import { v4 as uuidv4 } from 'uuid'
import { importFile, toDisplaySrc } from '../../utils/mediaPersistence'
import { LocalImage } from '../ui/LocalMedia'
import { Plus, X, Link, FileText, Film, Image, Search, ExternalLink, Tag, Lightbulb } from 'lucide-react'
import { Project, DiscoveryItem } from '../../types'
import { useAppStore } from '../../store/appStore'
import { toast } from '../ui/Toast'

function parseYouTubeId(url: string): string | null {
  const patterns = [
    /youtu\.be\/([^?&]+)/,
    /youtube\.com\/watch\?v=([^&]+)/,
    /youtube\.com\/embed\/([^?&]+)/,
  ]
  for (const p of patterns) {
    const m = url.match(p)
    if (m) return m[1]
  }
  return null
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  note:    <FileText size={13} />,
  link:    <Link size={13} />,
  youtube: <Film size={13} />,
  video:   <Film size={13} />,
  image:   <Image size={13} />,
  file:    <FileText size={13} />,
}

const TYPE_COLORS: Record<string, string> = {
  note:    'rgba(180,140,80,0.7)',
  link:    'rgba(80,140,200,0.7)',
  youtube: 'rgba(200,60,60,0.7)',
  video:   'rgba(140,80,200,0.7)',
  image:   'rgba(80,180,120,0.7)',
  file:    'rgba(150,150,150,0.7)',
}

export default function DiscoveriesSection({ project }: { project: Project }) {
  const updateProject = useAppStore(s => s.updateProject)
  const [search, setSearch] = useState('')
  const [addType, setAddType] = useState<string | null>(null)
  const [form, setForm] = useState({ title: '', url: '', content: '', tags: '' })
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [filterType, setFilterType] = useState<string | null>(null)

  const discoveries: DiscoveryItem[] = (project as any).discoveries || []

  const save = (updated: DiscoveryItem[]) => {
    updateProject(project.id, { discoveries: updated } as any)
  }

  const addItem = (item: DiscoveryItem) => {
    save([...discoveries, item])
    setForm({ title: '', url: '', content: '', tags: '' })
    setAddType(null)
    toast.success('Discovery saved')
  }

  const removeItem = (id: string) => {
    save(discoveries.filter(d => d.id !== id))
    toast.info('Removed')
  }

  // Drop files onto the section
  const onDrop = useCallback(async (files: File[]) => {
    if (files.length === 0) return
    const newItems: DiscoveryItem[] = []
    for (const file of files) {
      try {
        const isImage = file.type.startsWith('image/')
        const isVideo = file.type.startsWith('video/')
        const isHIP = /\.(hip|hipnc)$/i.test(file.name)
        const isHDA = /\.(hda|hdanc|otl)$/i.test(file.name)
        const type: DiscoveryItem['type'] = isImage ? 'image' : isVideo ? 'video' : 'file'

        let filePath: string
        if (isImage || isVideo) {
          // Use durable src for media files
          const { storedSrc: src } = await importFile(file)
          filePath = src
        } else {
          // For binary files (HIP, HDA, etc.) use the absolute path via file://
          const absPath = (file as any).path || file.name
          filePath = toDisplaySrc(absPath)
        }

        newItems.push({
          id: uuidv4(),
          type,
          title: file.name,
          filePath,
          tags: isHIP ? ['houdini', 'hip'] : isHDA ? ['houdini', 'hda'] : [],
          addedAt: new Date().toISOString(),
          content: isHIP ? 'Houdini scene file' : isHDA ? 'Houdini Digital Asset' : undefined,
        })
      } catch (err) {
        console.error('[discoveries] import error:', file.name, err)
      }
    }
    if (newItems.length > 0) {
      save([...discoveries, ...newItems])
      toast.success(`${newItems.length} file${newItems.length > 1 ? 's' : ''} added to discoveries`)
    }
  }, [discoveries, save])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, noClick: true })

  const submitLink = () => {
    if (!form.url.trim()) return
    const youtubeId = parseYouTubeId(form.url)
    const type = youtubeId ? 'youtube' : 'link'
    addItem({
      id: uuidv4(), type,
      title: form.title.trim() || form.url,
      url: form.url.trim(),
      youtubeId: youtubeId || undefined,
      tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
      addedAt: new Date().toISOString(),
    })
  }

  const submitNote = () => {
    if (!form.content.trim() && !form.title.trim()) return
    addItem({
      id: uuidv4(), type: 'note',
      title: form.title.trim() || 'Discovery',
      content: form.content.trim(),
      tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
      addedAt: new Date().toISOString(),
    })
  }

  const filtered = discoveries.filter(d => {
    const matchSearch = !search || d.title.toLowerCase().includes(search.toLowerCase()) || d.content?.toLowerCase().includes(search.toLowerCase()) || d.tags.some(t => t.toLowerCase().includes(search.toLowerCase()))
    const matchType = !filterType || d.type === filterType
    return matchSearch && matchType
  }).sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime())

  const allTypes = Array.from(new Set(discoveries.map(d => d.type)))

  return (
    <div {...getRootProps()} className="h-full overflow-y-auto" style={{ background: 'var(--bg-base)', position: 'relative' }}>
      <input {...getInputProps()} />
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 32px 60px' }}>

        {/* Header */}
        <div className="flex items-end justify-between mb-6">
          <div>
            <p style={{ fontSize: 10, color: 'var(--fg-muted)', fontFamily: 'DM Mono, monospace', letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 6 }}>Project Memory</p>
            <h2 style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: 38, color: 'var(--fg-primary)', fontWeight: 400, letterSpacing: '-0.02em', lineHeight: 1 }}>Discoveries</h2>
          </div>
          <span style={{ fontSize: 11, fontFamily: 'DM Mono, monospace', color: 'var(--fg-muted)' }}>{discoveries.length} saved</span>
        </div>

        {/* Toolbar */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
          {/* Search */}
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={12} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-muted)' }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search discoveries..."
              style={{ width: '100%', height: 32, paddingLeft: 30, paddingRight: 12, borderRadius: 4, background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', color: 'var(--fg-primary)', fontSize: 12, outline: 'none' }} />
          </div>

          {/* Type filters */}
          {allTypes.map(type => (
            <button key={type} onClick={() => setFilterType(filterType === type ? null : type)}
              style={{ height: 28, padding: '0 10px', borderRadius: 4, fontSize: 11, cursor: 'pointer', border: `1px solid ${filterType === type ? 'var(--border-emphasis)' : 'var(--border-subtle)'}`, background: filterType === type ? 'var(--bg-elevated)' : 'transparent', color: filterType === type ? 'var(--fg-primary)' : 'var(--fg-muted)' }}>
              {type}
            </button>
          ))}

          <div style={{ flex: 1 }} />

          {/* Add buttons */}
          <button onClick={() => setAddType(addType === 'link' ? null : 'link')}
            style={{ display: 'flex', alignItems: 'center', gap: 6, height: 28, padding: '0 12px', borderRadius: 4, border: '1px solid var(--border-subtle)', fontSize: 11, color: 'var(--fg-muted)', background: 'transparent', cursor: 'pointer' }}>
            <Link size={11} /> Link / YouTube
          </button>
          <button onClick={() => setAddType(addType === 'note' ? null : 'note')}
            style={{ display: 'flex', alignItems: 'center', gap: 6, height: 28, padding: '0 12px', borderRadius: 4, border: '1px solid var(--border-subtle)', fontSize: 11, color: 'var(--fg-muted)', background: 'transparent', cursor: 'pointer' }}>
            <FileText size={11} /> Note
          </button>
        </div>

        {/* Add form */}
        <AnimatePresence>
          {addType && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              style={{ overflow: 'hidden', marginBottom: 16 }}>
              <div style={{ padding: 16, borderRadius: 6, background: 'var(--bg-surface)', border: '1px solid var(--border-default)', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <p style={{ fontSize: 11, color: 'var(--fg-muted)', fontFamily: 'DM Mono, monospace', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                  {addType === 'link' ? 'Add Link or YouTube' : 'Add Note / Discovery'}
                </p>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Title (optional)"
                  style={{ height: 32, padding: '0 10px', borderRadius: 4, background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', color: 'var(--fg-primary)', fontSize: 12, outline: 'none' }} />
                {addType === 'link' ? (
                  <input value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
                    onKeyDown={e => { if (e.key === 'Enter') submitLink(); if (e.key === 'Escape') setAddType(null) }}
                    placeholder="https://... or YouTube URL"
                    autoFocus
                    style={{ height: 32, padding: '0 10px', borderRadius: 4, background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', color: 'var(--fg-primary)', fontSize: 12, outline: 'none', fontFamily: 'DM Mono, monospace' }} />
                ) : (
                  <textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                    placeholder="What did you discover? Houdini tip, sim trick, compositing idea, render setting..."
                    autoFocus rows={4}
                    style={{ padding: 10, borderRadius: 4, background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', color: 'var(--fg-primary)', fontSize: 12, outline: 'none', resize: 'vertical', fontFamily: 'DM Sans, sans-serif' }} />
                )}
                <input value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} placeholder="Tags: houdini, sim, lighting..."
                  style={{ height: 28, padding: '0 10px', borderRadius: 4, background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', color: 'var(--fg-primary)', fontSize: 11, outline: 'none' }} />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={addType === 'link' ? submitLink : submitNote}
                    style={{ height: 28, padding: '0 16px', borderRadius: 4, background: 'var(--accent-green-ghost)', border: '1px solid var(--accent-green-dim)', color: 'var(--accent-green)', fontSize: 11, cursor: 'pointer' }}>
                    Save Discovery
                  </button>
                  <button onClick={() => setAddType(null)}
                    style={{ fontSize: 11, color: 'var(--fg-subtle)', background: 'none', border: 'none', cursor: 'pointer' }}>Cancel</button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Drop zone hint */}
        {isDragActive && (
          <div style={{ padding: '20px', border: '1px solid var(--accent-green-dim)', borderRadius: 6, background: 'var(--accent-green-ghost)', textAlign: 'center', marginBottom: 16 }}>
            <p style={{ fontSize: 13, color: 'var(--accent-green)', fontFamily: 'DM Mono, monospace' }}>Drop files here — images, videos, .hip, .hda, anything</p>
          </div>
        )}

        {/* Discovery cards */}
        {filtered.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
            {filtered.map((item, i) => (
              <DiscoveryCard key={item.id} item={item} index={i}
                expanded={expandedId === item.id}
                onToggle={() => setExpandedId(expandedId === item.id ? null : item.id)}
                onRemove={() => removeItem(item.id)} />
            ))}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 0', textAlign: 'center' }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14, color: 'var(--fg-subtle)' }}>
              <Lightbulb size={20} />
            </div>
            <p style={{ fontSize: 13, color: 'var(--fg-muted)', marginBottom: 6 }}>No discoveries yet</p>
            <p style={{ fontSize: 11, color: 'var(--fg-subtle)', maxWidth: 300, lineHeight: 1.6 }}>
              Drop files here or use the buttons above to save links, YouTube tutorials, Houdini tips, HIP files, notes — anything you learned on this project.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

function DiscoveryCard({ item, index, expanded, onToggle, onRemove }: {
  item: DiscoveryItem; index: number; expanded: boolean; onToggle: () => void; onRemove: () => void
}) {
  const iconColor = TYPE_COLORS[item.type] || 'rgba(150,150,150,0.7)'

  const openFile = () => {
    if (item.filePath && (window as any).electronAPI) {
      (window as any).electronAPI.openPath(item.filePath)
    } else if (item.url) {
      window.open(item.url, '_blank')
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: index * 0.03 }}
      className="group"
      style={{ borderRadius: 6, border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)', overflow: 'hidden', transition: 'border-color 0.15s' }}
      onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-emphasis)'}
      onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-subtle)'}
    >
      {/* YouTube embed */}
      {item.type === 'youtube' && item.youtubeId && expanded && (
        <div style={{ position: 'relative', paddingBottom: '56.25%', background: '#000' }}>
          <iframe
            src={`https://www.youtube.com/embed/${item.youtubeId}`}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }}
            allowFullScreen title={item.title}
          />
        </div>
      )}

      {/* Image preview */}
      {item.type === 'image' && item.filePath && expanded && (
        <LocalImage src={item.filePath || ''} alt={item.title}
          style={{ width: '100%', maxHeight: 200, objectFit: 'contain', background: 'var(--bg-void)' }} />
      )}

      {/* YouTube thumbnail (collapsed) */}
      {item.type === 'youtube' && item.youtubeId && !expanded && (
        <div style={{ position: 'relative', cursor: 'pointer' }} onClick={onToggle}>
          <img src={`https://img.youtube.com/vi/${item.youtubeId}/mqdefault.jpg`} alt=""
            style={{ width: '100%', height: 120, objectFit: 'cover' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(200,40,40,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Film size={14} style={{ color: 'white', marginLeft: 2 }} />
            </div>
          </div>
        </div>
      )}

      {/* Card body */}
      <div style={{ padding: 14 }} onClick={onToggle}>
        {/* Type badge + title */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
          <div style={{ flexShrink: 0, width: 22, height: 22, borderRadius: 4, background: iconColor + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', color: iconColor, marginTop: 1 }}>
            {TYPE_ICONS[item.type]}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 12, color: 'var(--fg-primary)', lineHeight: 1.4, wordBreak: 'break-word' }}>{item.title}</p>
            {item.url && item.type !== 'youtube' && (
              <p style={{ fontSize: 10, color: 'var(--fg-subtle)', fontFamily: 'DM Mono, monospace', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {item.url.replace(/^https?:\/\/(www\.)?/, '').slice(0, 40)}
              </p>
            )}
          </div>
        </div>

        {/* Note content */}
        {item.content && (
          <p style={{ fontSize: 11, color: 'var(--fg-secondary)', lineHeight: 1.6, marginBottom: 8, maxHeight: expanded ? 'none' : 48, overflow: 'hidden' }}>
            {item.content}
          </p>
        )}

        {/* Tags */}
        {item.tags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
            {item.tags.map(t => (
              <span key={t} style={{ fontSize: 9, padding: '2px 6px', borderRadius: 3, background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', color: 'var(--fg-muted)', fontFamily: 'DM Mono, monospace' }}>
                {t}
              </span>
            ))}
          </div>
        )}

        {/* Footer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 10, color: 'var(--fg-subtle)', fontFamily: 'DM Mono, monospace' }}>
            {new Date(item.addedAt).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
          </span>
          <div style={{ display: 'flex', gap: 6, opacity: 0 }} className="group-hover:opacity-100" style2={{ transition: 'opacity 0.15s' }}>
            {(item.url || item.filePath) && (
              <button onClick={e => { e.stopPropagation(); openFile() }}
                style={{ color: 'var(--fg-subtle)', background: 'none', border: 'none', cursor: 'pointer' }}>
                <ExternalLink size={11} />
              </button>
            )}
            <button onClick={e => { e.stopPropagation(); onRemove() }}
              style={{ color: 'var(--fg-subtle)', background: 'none', border: 'none', cursor: 'pointer' }}>
              <X size={11} />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
