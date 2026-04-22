import { format, isPast, differenceInDays } from 'date-fns'
import { motion } from 'framer-motion'
import { Calendar, Clock, Folder, Tag, Cpu, FileText, FolderPlus } from 'lucide-react'
import { Project } from '../../types'
import { STATUS_CONFIG } from '../../store/appStore'
import GeometricAccent from '../ui/GeometricAccent'
import MixedCarousel from './MixedCarousel'

interface ProjectOverviewProps {
  project: Project
  onCreateFolderStructure?: () => void
}

export default function ProjectOverview({ project, onCreateFolderStructure }: ProjectOverviewProps) {
  const completedNodes = project.pipelineNodes.filter(n => n.completed)
  const progress = project.pipelineNodes.length
    ? Math.round((completedNodes.length / project.pipelineNodes.length) * 100)
    : 0

  const deadlineDate = project.deadline ? new Date(project.deadline) : null
  const daysUntil = deadlineDate ? differenceInDays(deadlineDate, new Date()) : null
  const overdue = deadlineDate ? isPast(deadlineDate) : false

  const hasMedia = project.renders.length > 0 || project.previews.length > 0

  const s = (i: number) => ({
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.4, delay: 0.05 * i, ease: [0.16, 1, 0.3, 1] as any },
  })

  return (
    <div className="h-full overflow-y-auto px-8 py-5">
      <div className="max-w-4xl">

        {/* Carousel - only if has media */}
        {hasMedia && (
          <motion.div {...s(0)} className="mb-6">
            <MixedCarousel renders={project.renders} previews={project.previews} />
          </motion.div>
        )}

        <div className="grid grid-cols-3 gap-5">
          {/* Main column */}
          <div className="col-span-2 flex flex-col gap-4">
            {project.description && (
              <motion.div {...s(1)} className="p-4 rounded-md bg-bg-surface border border-border-subtle">
                <p className="text-2xs text-fg-muted font-mono tracking-ultra-wide uppercase mb-2">Description</p>
                <p className="text-sm text-fg-secondary leading-relaxed">{project.description}</p>
              </motion.div>
            )}

            <motion.div {...s(2)} className="grid grid-cols-2 gap-2.5">
              <InfoTile icon={<div className="w-2 h-2 rounded-full flex-shrink-0" style={{background:STATUS_CONFIG[project.status].color}}/>}
                label="Status" value={STATUS_CONFIG[project.status].label}/>
              {project.client && <InfoTile icon={<Tag size={11}/>} label="Client" value={project.client}/>}
              {project.startDate && <InfoTile icon={<Calendar size={11}/>} label="Started" value={format(new Date(project.startDate),'MMM d, yyyy')}/>}
              {deadlineDate && (
                <InfoTile icon={<Clock size={11}/>} label="Deadline" value={format(deadlineDate,'MMM d, yyyy')}
                  sub={overdue?`${Math.abs(daysUntil!)}d overdue`:daysUntil!==null?`${daysUntil}d remaining`:undefined}
                  subColor={overdue?'var(--color-error, #e57373)':'var(--fg-muted)'}/>
              )}
            </motion.div>

            {project.folderPath && (
              <motion.div {...s(3)} className="p-3.5 rounded-md bg-bg-surface border border-border-subtle">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-2xs text-fg-muted font-mono tracking-ultra-wide uppercase flex items-center gap-1.5"><Folder size={10}/>Project Folder</p>
                  {onCreateFolderStructure && (
                    <button onClick={onCreateFolderStructure} className="flex items-center gap-1 text-2xs text-fg-subtle hover:text-fg-muted transition-colors">
                      <FolderPlus size={10}/> Create structure
                    </button>
                  )}
                </div>
                <p className="text-xs text-fg-secondary font-mono truncate">{project.folderPath}</p>
              </motion.div>
            )}

            {project.softwareTags.length>0 && (
              <motion.div {...s(4)} className="p-3.5 rounded-md bg-bg-surface border border-border-subtle">
                <p className="text-2xs text-fg-muted font-mono tracking-ultra-wide uppercase mb-3 flex items-center gap-1.5"><Cpu size={10}/>Software</p>
                <div className="flex flex-wrap gap-1.5">
                  {project.softwareTags.map(t=><span key={t} className="text-xs px-2.5 py-1 rounded-sm border border-border-default bg-bg-elevated text-fg-secondary font-mono">{t}</span>)}
                </div>
              </motion.div>
            )}

            {project.pipelineNodes.length>0 && (
              <motion.div {...s(5)} className="p-3.5 rounded-md bg-bg-surface border border-border-subtle">
                <div className="flex items-center justify-between mb-2.5">
                  <p className="text-2xs text-fg-muted font-mono tracking-ultra-wide uppercase">Pipeline</p>
                  <span className="text-xs font-mono text-fg-secondary">{progress}%</span>
                </div>
                <div className="h-px bg-border-subtle rounded-full overflow-hidden mb-3">
                  <motion.div initial={{width:0}} animate={{width:`${progress}%`}}
                    transition={{duration:0.9,ease:[0.16,1,0.3,1]}}
                    className="h-full bg-accent-green rounded-full"/>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {project.pipelineNodes.slice(0,10).map(node=>(
                    <span key={node.id} className={`text-2xs px-2 py-0.5 rounded-sm border transition-colors ${node.completed?'border-accent-greenDim bg-accent-greenGhost text-accent-green':'border-border-subtle text-fg-subtle'}`}>
                      {node.label}
                    </span>
                  ))}
                  {project.pipelineNodes.length>10&&<span className="text-2xs text-fg-subtle px-1">+{project.pipelineNodes.length-10} more</span>}
                </div>
              </motion.div>
            )}

            {project.notes && (
              <motion.div {...s(6)} className="p-3.5 rounded-md bg-bg-surface border border-border-subtle">
                <p className="text-2xs text-fg-muted font-mono tracking-ultra-wide uppercase mb-2 flex items-center gap-1.5"><FileText size={10}/>Notes Preview</p>
                <p className="text-xs text-fg-secondary leading-relaxed line-clamp-4 font-mono">
                  {project.notes.slice(0,320)}{project.notes.length>320?'…':''}
                </p>
              </motion.div>
            )}
          </div>

          {/* Side */}
          <div className="flex flex-col gap-4">
            <motion.div initial={{opacity:0}} animate={{opacity:1}} transition={{delay:0.2}} className="flex justify-center pt-2">
              <GeometricAccent variant="orbit" size={140} opacity={0.13}/>
            </motion.div>
            <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:0.25}} className="flex flex-col gap-1.5">
              <p className="text-2xs text-fg-muted font-mono tracking-ultra-wide uppercase mb-1">Files</p>
              <StatRow label="Renders" value={project.renders.length}/>
              <StatRow label="Previews" value={project.previews.length}/>
              <StatRow label="References" value={project.references.length}/>
            </motion.div>
            <motion.div initial={{opacity:0}} animate={{opacity:1}} transition={{delay:0.3}} className="pt-3 border-t border-border-subtle">
              <p className="text-2xs text-fg-muted font-mono tracking-ultra-wide uppercase mb-1.5">Created</p>
              <p className="text-xs text-fg-secondary font-mono">{format(new Date(project.createdAt),'MMM d, yyyy')}</p>
              <p className="text-2xs text-fg-subtle font-mono mt-0.5">Updated {format(new Date(project.updatedAt),'MMM d')}</p>
            </motion.div>
          </div>
        </div>
        <div className="h-8"/>
      </div>
    </div>
  )
}

function InfoTile({icon,label,value,sub,subColor}:{icon:React.ReactNode;label:string;value:string;sub?:string;subColor?:string}) {
  return (
    <div className="p-3 rounded-md bg-bg-surface border border-border-subtle">
      <div className="flex items-center gap-1.5 mb-1.5 text-fg-muted">{icon}<span className="text-2xs font-mono tracking-ultra-wide uppercase">{label}</span></div>
      <p className="text-sm text-fg-primary truncate">{value}</p>
      {sub&&<p className="text-xs mt-0.5" style={{color:subColor||'var(--fg-muted)'}}>{sub}</p>}
    </div>
  )
}

function StatRow({label,value}:{label:string;value:number}) {
  return (
    <div className="flex items-center justify-between px-3 py-1.5 rounded bg-bg-surface border border-border-subtle">
      <span className="text-xs text-fg-muted">{label}</span>
      <span className="text-xs font-mono text-fg-secondary">{value}</span>
    </div>
  )
}
