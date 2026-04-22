import { useRef } from 'react'
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import { Calendar, ArrowUpRight } from 'lucide-react'
import { Project } from '../../types'
import StatusChip from '../ui/StatusChip'
import ProgressRing from '../ui/ProgressRing'
import GeometricAccent from '../ui/GeometricAccent'
import { LocalImage } from '../ui/LocalMedia'

function calcProgress(project: Project): number {
  const nodes = project.pipelineNodes
  if (!nodes.length) return 0
  return Math.round((nodes.filter(n => n.completed).length / nodes.length) * 100)
}

export default function ProjectCard({ project, index = 0 }: { project: Project; index?: number }) {
  const navigate = useNavigate()
  const cardRef = useRef<HTMLDivElement>(null)
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)
  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [1.2, -1.2]), { stiffness: 260, damping: 28 })
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-1.2, 1.2]), { stiffness: 260, damping: 28 })

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = cardRef.current?.getBoundingClientRect()
    if (!rect) return
    mouseX.set((e.clientX - rect.left) / rect.width - 0.5)
    mouseY.set((e.clientY - rect.top) / rect.height - 0.5)
  }

  const progress = calcProgress(project)
  const isCompleted = project.status === 'completed'

  // Accent color — project-specific or completion green
  const accentColor = (project as any).accentColor || null
  const borderColor = isCompleted
    ? (accentColor || 'rgba(92,140,92,0.45)')
    : (accentColor ? accentColor + '60' : 'var(--border-subtle)')

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.04, ease: [0.16, 1, 0.3, 1] }}
      style={{ rotateX, rotateY, transformStyle: 'preserve-3d', perspective: 900 }}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => { mouseX.set(0); mouseY.set(0) }}
      onClick={() => navigate(`/project/${project.id}`)}
      className="project-card group cursor-pointer"
    >
      <div
        style={{
          borderRadius: 8,
          overflow: 'hidden',
          background: 'var(--bg-surface)',
          border: `1px solid ${borderColor}`,
          boxShadow: isCompleted
            ? `0 0 0 1px ${accentColor || 'rgba(92,140,92,0.3)'}, var(--shadow-card)`
            : 'var(--shadow-card)',
          transition: 'border-color 0.3s ease, box-shadow 0.3s ease',
        }}
        onMouseEnter={e => {
          const el = e.currentTarget as HTMLDivElement
          el.style.borderColor = isCompleted
            ? (accentColor || 'rgba(92,140,92,0.65)')
            : (accentColor ? accentColor + '90' : 'var(--border-emphasis)')
          el.style.boxShadow = isCompleted
            ? `0 0 0 1px ${accentColor || 'rgba(92,140,92,0.45)'}, 0 4px 24px rgba(0,0,0,0.4)`
            : '0 4px 24px rgba(0,0,0,0.4)'
        }}
        onMouseLeave={e => {
          const el = e.currentTarget as HTMLDivElement
          el.style.borderColor = borderColor
          el.style.boxShadow = isCompleted
            ? `0 0 0 1px ${accentColor || 'rgba(92,140,92,0.3)'}, var(--shadow-card)`
            : 'var(--shadow-card)'
        }}
      >
        {/* Completed accent line at top */}
        {isCompleted && (
          <div style={{
            height: 1,
            background: accentColor
              ? `linear-gradient(90deg, transparent, ${accentColor}, transparent)`
              : 'linear-gradient(90deg, transparent, rgba(92,140,92,0.5), transparent)',
          }} />
        )}

        {/* Cover image */}
        <div style={{ position: 'relative', overflow: 'hidden', aspectRatio: '16/10' }}>
          {project.coverImage ? (
            <>
              <LocalImage src={project.coverImage} alt={project.title}
                style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.6s cubic-bezier(0.16,1,0.3,1)' }} />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 50%)' }} />
            </>
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-elevated)', position: 'relative', overflow: 'hidden' }}>
              <GeometricAccent variant={(['circles','orbit','node','sphere'] as const)[index % 4]} size={72} opacity={0.15} />
            </div>
          )}

          <div style={{ position: 'absolute', top: 10, left: 10 }}>
            <StatusChip status={project.status} />
          </div>

          <div style={{ position: 'absolute', top: 10, right: 10, opacity: 0, transition: 'opacity 0.2s' }} className="group-hover:opacity-100">
            <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ArrowUpRight size={10} style={{ color: 'rgba(255,255,255,0.8)' }} />
            </div>
          </div>
        </div>

        {/* Card body */}
        <div style={{ padding: '14px 16px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 8 }}>
            <h3 style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg-primary)', lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
              {project.title}
            </h3>
            <ProgressRing progress={progress} size={26} showLabel />
          </div>

          {project.client && (
            <p style={{ fontSize: 11, color: 'var(--fg-muted)', marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {project.client}
            </p>
          )}

          {project.tags.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
              {project.tags.slice(0, 3).map(tag => (
                <span key={tag} style={{ fontSize: 10, padding: '2px 6px', borderRadius: 3, background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', color: 'var(--fg-muted)' }}>
                  {tag}
                </span>
              ))}
              {project.tags.length > 3 && <span style={{ fontSize: 10, color: 'var(--fg-subtle)', padding: '2px 2px' }}>+{project.tags.length - 3}</span>}
            </div>
          )}

          {/* Progress bar */}
          {project.pipelineNodes.length > 0 && (
            <div style={{ height: 1, background: 'var(--border-subtle)', borderRadius: 1, overflow: 'hidden', marginBottom: 10 }}>
              <div style={{
                height: '100%',
                width: `${progress}%`,
                background: accentColor || 'var(--accent-green)',
                borderRadius: 1,
                transition: 'width 0.6s cubic-bezier(0.16,1,0.3,1)',
              }} />
            </div>
          )}

          {/* Footer */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--fg-subtle)' }}>
              <Calendar size={10} />
              <span style={{ fontSize: 10 }}>{formatDistanceToNow(new Date(project.updatedAt), { addSuffix: true })}</span>
            </div>
            {project.deadline && (
              <span style={{ fontSize: 10, fontFamily: 'DM Mono, monospace', color: 'var(--fg-subtle)' }}>
                Due {new Date(project.deadline).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
