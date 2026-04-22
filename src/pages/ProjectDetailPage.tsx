import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Edit2, Trash2, FolderOpen, LayoutDashboard, Film, Eye, BookImage, FileText, GitBranch, Network, Lightbulb } from 'lucide-react'
import { useAppStore } from '../store/appStore'
import StatusChip from '../components/ui/StatusChip'
import ProgressRing from '../components/ui/ProgressRing'
import ProjectOverview from '../components/project/ProjectOverview'
import RendersSection from '../components/project/RendersSection'
import PreviewsSection from '../components/project/PreviewsSection'
import ReferencesSection from '../components/project/ReferencesSection'
import NotesSection from '../components/project/NotesSection'
import PipelineMap from '../components/pipeline/PipelineMap'
import NodeMapTool from '../components/project/NodeMapTool'
import DiscoveriesSection from '../components/project/DiscoveriesSection'
import EditProjectModal from '../components/project/EditProjectModal'
import HorizontalPipelineTree from '../components/project/HorizontalPipelineTree'
import { LocalImage } from '../components/ui/LocalMedia'
import { GeometricBackground } from '../components/ui/GeometricAccent'
import { toast } from '../components/ui/Toast'

type Section = 'overview'|'renders'|'previews'|'references'|'notes'|'pipeline'|'map'|'discoveries'

const SECTIONS = [
  { id: 'overview' as Section,     label: 'Overview',     icon: <LayoutDashboard size={12} /> },
  { id: 'renders' as Section,      label: 'Renders',      icon: <Film size={12} />,       count: (p:any) => p.renders.length },
  { id: 'previews' as Section,     label: 'Previews',     icon: <Eye size={12} />,        count: (p:any) => p.previews.length },
  { id: 'references' as Section,   label: 'References',   icon: <BookImage size={12} />,  count: (p:any) => p.references.length },
  { id: 'notes' as Section,        label: 'Notes',        icon: <FileText size={12} /> },
  { id: 'pipeline' as Section,     label: 'Pipeline',     icon: <GitBranch size={12} /> },
  { id: 'map' as Section,          label: 'Node Map',     icon: <Network size={12} /> },
  { id: 'discoveries' as Section,  label: 'Discoveries',  icon: <Lightbulb size={12} />,  count: (p:any) => (p.discoveries||[]).length },
]

const calcProgress = (nodes: any[]) => !nodes.length ? 0 : Math.round(nodes.filter((n:any)=>n.completed).length/nodes.length*100)

export default function ProjectDetailPage() {
  const { id } = useParams<{id:string}>()
  const navigate = useNavigate()
  const project = useAppStore(s => s.projects.find(p => p.id === id))
  const deleteProject = useAppStore(s => s.deleteProject)
  const [activeSection, setActiveSection] = useState<Section>('overview')
  const [editOpen, setEditOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  if (!project) return (
    <div className="h-full flex items-center justify-center">
      <p style={{ fontSize: 13, color: 'var(--fg-muted)' }}>Project not found</p>
    </div>
  )

  const progress = calcProgress(project.pipelineNodes)

  const handleDelete = () => {
    if (confirmDelete) { deleteProject(project.id); toast.info(`"${project.title}" deleted`); navigate('/') }
    else { setConfirmDelete(true); setTimeout(() => setConfirmDelete(false), 3000) }
  }

  const handleCreateFolders = async () => {
    if (!project.folderPath) { toast.error('Set a folder path in Edit first'); return }
    if (!(window as any).electronAPI) { toast.error('Requires desktop app'); return }
    const subs = ['renders','previews','references','scenes','exports','notes']
    try {
      for (const sub of subs) {
        const sep = project.folderPath.includes('/') ? '/' : '\\'
        await (window as any).electronAPI.createDirectory(project.folderPath + sep + sub)
      }
      toast.success('Folder structure created')
    } catch { toast.error('Failed to create folders') }
  }

  return (
    <div className="h-full flex flex-col overflow-hidden" style={{ background: 'var(--bg-base)' }}>
      {/* Hero header */}
      <div style={{ position: 'relative', flexShrink: 0, borderBottom: '1px solid var(--border-subtle)', overflow: 'hidden' }}>
        {project.coverImage && (
          <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
<LocalImage src={project.coverImage || ''} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.1, filter: 'blur(2px) saturate(0.2)' }} />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, var(--bg-base) 40%, transparent)' }} />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, var(--bg-base), transparent)' }} />
          </div>
        )}
        {!project.coverImage && <GeometricBackground className="right-0 top-0 opacity-6" />}

        <div style={{ position: 'relative', zIndex: 10, padding: '20px 32px 0' }}>
          {/* Project info + stats row */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 32 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                <StatusChip status={project.status} size="md" />
                {project.client && <span style={{ fontSize: 11, fontFamily: 'DM Mono, monospace', color: 'var(--fg-muted)' }}>{project.client}</span>}
                {project.deadline && <span style={{ fontSize: 11, fontFamily: 'DM Mono, monospace', color: 'var(--fg-subtle)' }}>Due {new Date(project.deadline).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}</span>}
              </div>
              <h1 style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: 44, color: 'var(--fg-primary)', fontWeight: 400, letterSpacing: '-0.02em', lineHeight: 1.05, marginBottom: 6 }}>
                {project.title}
              </h1>
              {project.description && <p style={{ fontSize: 13, color: 'var(--fg-secondary)', maxWidth: 520, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{project.description}</p>}
              {(project.tags.length > 0 || project.softwareTags.length > 0) && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                  {project.tags.map(t => <span key={t} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 3, background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', color: 'var(--fg-muted)' }}>{t}</span>)}
                  {project.softwareTags.map(t => <span key={t} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 3, border: '1px solid var(--border-subtle)', color: 'var(--fg-subtle)', fontFamily: 'DM Mono, monospace' }}>{t}</span>)}
                </div>
              )}
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 12, flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: 11, fontFamily: 'DM Mono, monospace', color: 'var(--fg-muted)' }}>{progress}% complete</p>
                  <p style={{ fontSize: 10, fontFamily: 'DM Mono, monospace', color: 'var(--fg-subtle)' }}>{project.pipelineNodes.filter(n=>n.completed).length}/{project.pipelineNodes.length} steps</p>
                </div>
                <ProgressRing progress={progress} size={50} showLabel />
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {project.folderPath && (
                  <button onClick={() => (window as any).electronAPI?.showInFolder(project.folderPath)}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, height: 28, padding: '0 10px', borderRadius: 4, border: '1px solid var(--border-subtle)', fontSize: 11, color: 'var(--fg-muted)', background: 'transparent', cursor: 'pointer' }}>
                    <FolderOpen size={11} /> Folder
                  </button>
                )}
                <button onClick={() => setEditOpen(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, height: 28, padding: '0 10px', borderRadius: 4, border: '1px solid var(--border-subtle)', fontSize: 11, color: 'var(--fg-muted)', background: 'transparent', cursor: 'pointer' }}>
                  <Edit2 size={11} /> Edit
                </button>
                <button onClick={handleDelete}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, height: 28, padding: '0 10px', borderRadius: 4, border: `1px solid ${confirmDelete ? '#9a3030' : 'var(--border-subtle)'}`, fontSize: 11, color: confirmDelete ? '#d07070' : 'var(--fg-muted)', background: confirmDelete ? 'rgba(154,48,48,0.15)' : 'transparent', cursor: 'pointer' }}>
                  <Trash2 size={11} /> {confirmDelete ? 'Confirm?' : 'Delete'}
                </button>
              </div>
            </div>
          </div>

          {/* Horizontal pipeline tree — gets its own full-width row */}
          {project.pipelineNodes.length > 0 && (
            <div style={{ marginLeft: -32, marginRight: -32, marginTop: 12 }}>
              <HorizontalPipelineTree nodes={project.pipelineNodes} />
            </div>
          )}

          {/* Section tabs */}
          <div style={{ display: 'flex', alignItems: 'center', marginTop: project.pipelineNodes.length > 0 ? 0 : 16 }}>
            {SECTIONS.map(s => {
              const cnt = s.count?.(project)
              return (
                <button key={s.id} onClick={() => setActiveSection(s.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, height: 36, padding: '0 12px', fontSize: 11, cursor: 'pointer', border: 'none', background: 'transparent', color: activeSection === s.id ? 'var(--fg-primary)' : 'var(--fg-muted)', position: 'relative', transition: 'color 0.15s' }}>
                  {s.icon} {s.label}
                  {cnt !== undefined && cnt > 0 && (
                    <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 3, background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', color: 'var(--fg-subtle)', fontFamily: 'DM Mono, monospace' }}>{cnt}</span>
                  )}
                  {activeSection === s.id && (
                    <motion.div layoutId="section-underline"
                      style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 1, background: 'var(--accent-green)' }} />
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Section content */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <AnimatePresence mode="wait">
          <motion.div key={activeSection} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }} style={{ height: '100%' }}>
            {activeSection === 'overview'    && <ProjectOverview project={project} onCreateFolderStructure={handleCreateFolders} />}
            {activeSection === 'renders'     && <RendersSection project={project} />}
            {activeSection === 'previews'    && <PreviewsSection project={project} />}
            {activeSection === 'references'  && <ReferencesSection project={project} />}
            {activeSection === 'notes'       && <NotesSection project={project} />}
            {activeSection === 'pipeline'    && <PipelineMap project={project} />}
            {activeSection === 'map'         && <NodeMapTool project={project} />}
            {activeSection === 'discoveries' && <DiscoveriesSection project={project} />}
          </motion.div>
        </AnimatePresence>
      </div>

      <EditProjectModal open={editOpen} onClose={() => setEditOpen(false)} project={project} />
    </div>
  )
}
