import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { v4 as uuidv4 } from 'uuid'
import { useAppStore } from '../store/appStore'
import { ProjectStatus, SoftwareTag } from '../types'
import { db } from '../db/database'
import { Input, Textarea, Select } from '../components/ui/Input'
import Button from '../components/ui/Button'
import TagInput from '../components/ui/TagInput'
import ImageDropzone from '../components/ui/ImageDropzone'

const SOFTWARE_OPTIONS: SoftwareTag[] = [
  'Houdini','Nuke','Blender','Unreal Engine','Cinema 4D',
  'After Effects','DaVinci Resolve','Maya','ZBrush','Substance',
  'Katana','Arnold','Redshift','Octane',
]

const STATUS_OPTIONS = [
  { value: 'idea', label: 'Idea' },
  { value: 'in-progress', label: 'In Progress' },
  { value: 'review', label: 'Review' },
  { value: 'completed', label: 'Completed' },
  { value: 'archived', label: 'Archived' },
]

export default function NewProjectPage() {
  const navigate = useNavigate()
  const createProject = useAppStore(s => s.createProject)
  const [form, setForm] = useState({
    title: '', description: '', client: '',
    status: 'idea' as ProjectStatus,
    startDate: '', deadline: '',
    coverImage: null as string | null,
    folderPath: '', tags: [] as string[], softwareTags: [] as SoftwareTag[],
  })
  const [errors, setErrors] = useState<Record<string,string>>({})
  const [saving, setSaving] = useState(false)

  const set = (k: string, v: any) => { setForm(f => ({...f, [k]: v})); setErrors(e => ({...e, [k]: ''})) }
  const toggleSW = (t: SoftwareTag) => set('softwareTags', form.softwareTags.includes(t) ? form.softwareTags.filter(x=>x!==t) : [...form.softwareTags, t])

  const handleBrowse = async () => {
    if ((window as any).electronAPI) {
      const r = await (window as any).electronAPI.openDirectory()
      if (!r.canceled && r.filePaths[0]) set('folderPath', r.filePaths[0])
    }
  }

  const handleSubmit = async () => {
    if (!form.title.trim()) { setErrors({ title: 'Title is required' }); return }
    setSaving(true)
    const project = createProject({
      title: form.title.trim(), description: form.description.trim(),
      client: form.client.trim(), status: form.status,
      startDate: form.startDate || null, deadline: form.deadline || null,
      coverImage: form.coverImage, folderPath: form.folderPath || null,
      notes: '', tags: form.tags, softwareTags: form.softwareTags,
      pipelineNodes: db.getDefaultPipelineNodes(),
      renders: [], previews: [], references: [],
    })
    setSaving(false)
    navigate(`/project/${project.id}`)
  }

  const sectionHead = (label: string) => (
    <p style={{ fontSize: 10, color: 'var(--fg-muted)', fontFamily: 'DM Mono, monospace', letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 12, marginTop: 4 }}>
      {label}
    </p>
  )

  return (
    <div className="h-full overflow-y-auto" style={{ background: 'var(--bg-base)' }}>
      <div style={{ maxWidth: 600, margin: '0 auto', padding: '40px 32px 60px' }}>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} style={{ marginBottom: 36 }}>
          <p style={{ fontSize: 11, color: 'var(--fg-muted)', fontFamily: 'DM Mono, monospace', letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 8 }}>New Project</p>
          <h1 style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: 42, color: 'var(--fg-primary)', fontWeight: 400, letterSpacing: '-0.02em', lineHeight: 1 }}>
            Create Project
          </h1>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}
          style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          <ImageDropzone value={form.coverImage} onChange={v => set('coverImage', v)} label="Cover Image" />

          <Input label="Title" value={form.title} onChange={e => set('title', e.target.value)}
            placeholder="Project title" error={errors.title} autoFocus />

          <Textarea label="Description" value={form.description} onChange={e => set('description', e.target.value)}
            placeholder="Brief project description..." rows={3} />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Input label="Client" value={form.client} onChange={e => set('client', e.target.value)} placeholder="Client name" />
            <Select label="Status" value={form.status} onChange={e => set('status', e.target.value as ProjectStatus)} options={STATUS_OPTIONS} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Input label="Start Date" type="date" value={form.startDate} onChange={e => set('startDate', e.target.value)} />
            <Input label="Deadline" type="date" value={form.deadline} onChange={e => set('deadline', e.target.value)} />
          </div>

          <TagInput label="Tags" tags={form.tags} onChange={v => set('tags', v)} placeholder="Add tag..." />

          <div>
            {sectionHead('Software')}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {SOFTWARE_OPTIONS.map(sw => (
                <button key={sw} type="button" onClick={() => toggleSW(sw)}
                  style={{
                    height: 28, padding: '0 12px', borderRadius: 4, fontSize: 12,
                    fontFamily: 'DM Mono, monospace', cursor: 'pointer',
                    background: form.softwareTags.includes(sw) ? 'var(--accent-green-ghost)' : 'transparent',
                    border: `1px solid ${form.softwareTags.includes(sw) ? 'var(--accent-green-dim)' : 'var(--border-subtle)'}`,
                    color: form.softwareTags.includes(sw) ? 'var(--accent-green)' : 'var(--fg-muted)',
                    transition: 'all 0.15s ease',
                  }}>
                  {sw}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 11, color: 'var(--fg-muted)', fontFamily: 'DM Mono, monospace', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              Project Folder
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input value={form.folderPath} onChange={e => set('folderPath', e.target.value)}
                placeholder="Path to project folder..."
                style={{
                  flex: 1, height: 36, padding: '0 12px', borderRadius: 4,
                  background: 'var(--bg-surface)', border: '1px solid var(--border-default)',
                  color: 'var(--fg-primary)', fontSize: 11, outline: 'none',
                  fontFamily: 'DM Mono, monospace',
                }} />
              <Button variant="secondary" size="sm" onClick={handleBrowse}>Browse</Button>
            </div>
          </div>

          <div style={{ height: 1, background: 'var(--border-subtle)', margin: '4px 0' }} />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
            <Button variant="ghost" onClick={() => navigate('/')}>Cancel</Button>
            <Button variant="primary" onClick={handleSubmit} disabled={saving}>
              {saving ? 'Creating...' : 'Create Project'}
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
