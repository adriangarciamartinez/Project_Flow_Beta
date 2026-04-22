import { useState, useEffect } from 'react'
import { Project, ProjectStatus, SoftwareTag } from '../../types'
import { useAppStore } from '../../store/appStore'
import Modal from '../ui/Modal'
import { Input, Textarea, Select } from '../ui/Input'
import Button from '../ui/Button'
import TagInput from '../ui/TagInput'
import ImageDropzone from '../ui/ImageDropzone'

const SOFTWARE_OPTIONS: SoftwareTag[] = [
  'Houdini','Nuke','Blender','Unreal Engine','Cinema 4D',
  'After Effects','DaVinci Resolve','Maya','ZBrush','Substance',
  'Katana','Arnold','Redshift','Octane',
]

const STATUS_OPTIONS = [
  { value: 'idea', label: 'Idea' }, { value: 'in-progress', label: 'In Progress' },
  { value: 'review', label: 'Review' }, { value: 'completed', label: 'Completed' },
  { value: 'archived', label: 'Archived' },
]

export default function EditProjectModal({ open, onClose, project }: { open: boolean; onClose: () => void; project: Project }) {
  const updateProject = useAppStore(s => s.updateProject)
  const [form, setForm] = useState({ ...project, startDate: project.startDate || '', deadline: project.deadline || '', folderPath: project.folderPath || '', accentColor: (project as any).accentColor || '' })

  useEffect(() => {
    if (open) setForm({ ...project, startDate: project.startDate || '', deadline: project.deadline || '', folderPath: project.folderPath || '', accentColor: (project as any).accentColor || '' })
  }, [open, project])

  const set = (k: string, v: any) => setForm(f => ({...f, [k]: v}))
  const toggleSW = (t: SoftwareTag) => set('softwareTags', form.softwareTags.includes(t) ? form.softwareTags.filter((x: string) => x !== t) : [...form.softwareTags, t])

  const handleBrowse = async () => {
    if ((window as any).electronAPI) {
      const r = await (window as any).electronAPI.openDirectory()
      if (!r.canceled && r.filePaths[0]) set('folderPath', r.filePaths[0])
    }
  }

  const handleSave = () => {
    if (!form.title.trim()) return
    updateProject(project.id, {
      title: form.title.trim(), description: form.description.trim(),
      client: form.client.trim(), status: form.status as ProjectStatus,
      startDate: form.startDate || null, deadline: form.deadline || null,
      coverImage: form.coverImage, folderPath: form.folderPath || null,
      tags: form.tags, softwareTags: form.softwareTags,
      accentColor: (form as any).accentColor || null,
    } as any)
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="Edit Project" size="lg">
      <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <ImageDropzone value={form.coverImage} onChange={v => set('coverImage', v)} label="Cover Image" />
        <Input label="Title" value={form.title} onChange={e => set('title', e.target.value)} />
        <Textarea label="Description" value={form.description} onChange={e => set('description', e.target.value)} rows={3} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Input label="Client" value={form.client} onChange={e => set('client', e.target.value)} />
          <Select label="Status" value={form.status} onChange={e => set('status', e.target.value)} options={STATUS_OPTIONS} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Input label="Start Date" type="date" value={form.startDate} onChange={e => set('startDate', e.target.value)} />
          <Input label="Deadline" type="date" value={form.deadline} onChange={e => set('deadline', e.target.value)} />
        </div>
        <TagInput label="Tags" tags={form.tags} onChange={v => set('tags', v)} />
        <div>
          <p style={{ fontSize: 11, color: 'var(--fg-muted)', fontFamily: 'DM Mono, monospace', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>Software</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {SOFTWARE_OPTIONS.map(sw => (
              <button key={sw} type="button" onClick={() => toggleSW(sw)}
                style={{
                  height: 26, padding: '0 10px', borderRadius: 4, fontSize: 11,
                  fontFamily: 'DM Mono, monospace', cursor: 'pointer',
                  background: form.softwareTags.includes(sw) ? 'var(--accent-green-ghost)' : 'transparent',
                  border: `1px solid ${form.softwareTags.includes(sw) ? 'var(--accent-green-dim)' : 'var(--border-subtle)'}`,
                  color: form.softwareTags.includes(sw) ? 'var(--accent-green)' : 'var(--fg-muted)',
                }}>
                {sw}
              </button>
            ))}
          </div>
        </div>
        {/* Accent color */}
        <div>
          <p style={{ fontSize: 11, color: 'var(--fg-muted)', fontFamily: 'DM Mono, monospace', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>Card Accent</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {['', '#5c8c5c', '#6a7a9a', '#8a7060', '#7a6a8a', '#708a70', '#9a7060'].map(color => (
                <button key={color} type="button"
                  onClick={() => set('accentColor', color)}
                  style={{
                    width: color === '' ? 'auto' : 22, height: 22,
                    padding: color === '' ? '0 8px' : 0,
                    borderRadius: 4,
                    background: color || 'transparent',
                    border: `1px solid ${(form as any).accentColor === color ? 'var(--fg-primary)' : color ? 'transparent' : 'var(--border-default)'}`,
                    cursor: 'pointer',
                    fontSize: 10,
                    color: 'var(--fg-muted)',
                  }}>
                  {color === '' ? 'None' : ''}
                </button>
              ))}
            </div>
            <input type="color" value={(form as any).accentColor || '#5c8c5c'}
              onChange={e => set('accentColor', e.target.value)}
              style={{ width: 28, height: 22, borderRadius: 3, border: '1px solid var(--border-default)', background: 'var(--bg-elevated)', cursor: 'pointer', padding: 1 }} />
          </div>
          <p style={{ fontSize: 10, color: 'var(--fg-subtle)', marginTop: 6 }}>Subtle border accent. Keep it muted.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input value={form.folderPath} onChange={e => set('folderPath', e.target.value)} placeholder="Project folder path..."
            style={{ flex: 1, height: 36, padding: '0 12px', borderRadius: 4, background: 'var(--bg-surface)', border: '1px solid var(--border-default)', color: 'var(--fg-primary)', fontSize: 11, outline: 'none', fontFamily: 'DM Mono, monospace' }} />
          <Button variant="secondary" size="sm" onClick={handleBrowse}>Browse</Button>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 8, borderTop: '1px solid var(--border-subtle)' }}>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={handleSave}>Save Changes</Button>
        </div>
      </div>
    </Modal>
  )
}
