import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import { ArrowUpRight } from 'lucide-react'
import { LocalImage } from '../ui/LocalMedia'
import { Project } from '../../types'
import StatusChip from '../ui/StatusChip'
import ProgressRing from '../ui/ProgressRing'

function calcProgress(p: Project) {
  if (!p.pipelineNodes.length) return 0
  return Math.round(p.pipelineNodes.filter(n => n.completed).length / p.pipelineNodes.length * 100)
}

export default function ProjectListRow({ project, index = 0 }: { project: Project; index?: number }) {
  const navigate = useNavigate()
  const progress = calcProgress(project)
  return (
    <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: index * 0.03 }}
      onClick={() => navigate(`/project/${project.id}`)}
      className="group flex items-center gap-4 py-3 px-2 cursor-pointer rounded transition-colors"
      style={{ borderBottom: '1px solid var(--border-subtle)' }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-surface)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}>
      <div className="w-12 h-8 rounded overflow-hidden flex-shrink-0"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
        {project.coverImage ? <LocalImage src={project.coverImage || ''} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <div className="w-full h-full" style={{ background: 'var(--bg-overlay)' }} />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm truncate" style={{ color: 'var(--fg-primary)' }}>{project.title}</p>
        {project.client && <p className="text-xs truncate" style={{ color: 'var(--fg-muted)' }}>{project.client}</p>}
      </div>
      <div className="hidden md:flex items-center gap-1 flex-shrink-0">
        {project.tags.slice(0, 2).map(t => (
          <span key={t} className="text-2xs px-1.5 py-0.5 rounded-sm"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', color: 'var(--fg-muted)' }}>{t}</span>
        ))}
      </div>
      <div className="flex-shrink-0"><StatusChip status={project.status} /></div>
      <div className="flex items-center gap-2 flex-shrink-0 w-16">
        <ProgressRing progress={progress} size={20} />
        <span className="text-xs font-mono" style={{ color: 'var(--fg-muted)' }}>{progress}%</span>
      </div>
      <div className="hidden lg:block w-28 text-right flex-shrink-0">
        <span className="text-xs" style={{ color: 'var(--fg-subtle)' }}>
          {formatDistanceToNow(new Date(project.updatedAt), { addSuffix: true })}
        </span>
      </div>
      <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <ArrowUpRight size={12} style={{ color: 'var(--fg-muted)' }} />
      </div>
    </motion.div>
  )
}
