import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, Plus, X, GripVertical, Edit2, RotateCcw, Layers } from 'lucide-react'
import { v4 as uuidv4 } from 'uuid'
import { Project, PipelineNode } from '../../types'
import { useAppStore } from '../../store/appStore'
import { db } from '../../db/database'
import { toast } from '../ui/Toast'
import DragReorder from '../ui/DragReorder'

export default function PipelineMap({ project }: { project: Project }) {
  const updateProject = useAppStore(s => s.updateProject)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editLabel, setEditLabel] = useState('')
  const [addingNew, setAddingNew] = useState(false)
  const [newLabel, setNewLabel] = useState('')

  const nodes = [...project.pipelineNodes].sort((a, b) => a.order - b.order)
  const completed = nodes.filter(n => n.completed).length
  const total = nodes.length
  const progress = total ? completed / total : 0
  const pct = Math.round(progress * 100)

  const updateNodes = useCallback((updated: PipelineNode[]) => {
    updateProject(project.id, { pipelineNodes: updated })
  }, [project.id, updateProject])

  const toggleNode = (id: string) => {
    updateNodes(nodes.map(n =>
      n.id === id
        ? { ...n, completed: !n.completed, completedAt: !n.completed ? new Date().toISOString() : null }
        : n
    ))
  }

  const addNode = () => {
    const label = newLabel.trim()
    if (!label) return
    updateNodes([...nodes, { id: uuidv4(), label, completed: false, order: nodes.length, completedAt: null }])
    setNewLabel(''); setAddingNew(false)
    toast.success(`"${label}" added`)
  }

  const removeNode = (id: string) => {
    const label = nodes.find(n => n.id === id)?.label
    updateNodes(nodes.filter(n => n.id !== id).map((n, i) => ({ ...n, order: i })))
    toast.info(`"${label}" removed`)
  }

  const saveEdit = (id: string) => {
    const label = editLabel.trim()
    if (!label) return setEditingId(null)
    updateNodes(nodes.map(n => n.id === id ? { ...n, label } : n))
    setEditingId(null)
  }

  return (
    <div className="h-full overflow-y-auto" style={{ background: 'var(--bg-base)' }}>
      <div className="max-w-2xl mx-auto px-8 py-8">

        {/* Header */}
        <div className="flex items-end justify-between mb-10">
          <div>
            <p className="text-2xs font-mono tracking-ultra-wide uppercase mb-1.5"
              style={{ color: 'var(--fg-muted)', letterSpacing: '0.18em' }}>
              PIPELINE
            </p>
            <h2 className="font-display tracking-tightest leading-none"
              style={{ fontSize: 42, color: 'var(--fg-primary)', fontWeight: 400 }}>
              Progress Map
            </h2>
          </div>
          <div className="text-right">
            <div className="font-display leading-none flex items-baseline gap-1"
              style={{ fontSize: 56, color: 'var(--fg-primary)' }}>
              {pct}
              <span className="font-sans font-light" style={{ fontSize: 22, color: 'var(--fg-muted)' }}>%</span>
            </div>
            <p className="text-xs font-mono mt-1" style={{ color: 'var(--fg-muted)' }}>
              {completed} / {total} complete
            </p>
          </div>
        </div>

        {/* Circular progress map — restored V1 style */}
        <CircularProgressMap nodes={nodes} completed={completed} progress={progress} />

        {/* Node list */}
        <div className="mt-10 relative">
          {/* Spine */}
          <div className="absolute left-[21px] top-0 bottom-0 w-px" style={{ background: 'var(--border-subtle)' }} />
          <motion.div
            className="absolute left-[21px] top-0 w-px"
            style={{ background: 'linear-gradient(to bottom, var(--accent-green), rgba(92,140,92,0.1))' }}
            initial={{ height: 0 }}
            animate={{ height: total > 0 ? `${Math.min(pct, 95)}%` : 0 }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.4 }}
          />

          <DragReorder
            items={nodes}
            onReorder={reordered => updateNodes(reordered.map((n, i) => ({ ...n, order: i })))}
            renderItem={(node, dragHandle) => {
              const idx = nodes.findIndex(n => n.id === node.id)
              const isEditing = editingId === node.id

              return (
                <motion.div
                  layout
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: idx * 0.02 }}
                  className="group relative flex items-center gap-3 py-2 pr-2"
                >
                  {/* Drag handle */}
                  <div {...dragHandle}
                    className="opacity-0 group-hover:opacity-100 cursor-grab transition-opacity w-3 flex-shrink-0"
                    style={{ color: 'var(--fg-subtle)' }}>
                    <GripVertical size={12} />
                  </div>

                  {/* Node button — V1 style double-ring */}
                  <motion.button
                    onClick={() => toggleNode(node.id)}
                    whileHover={{ scale: 1.06 }}
                    whileTap={{ scale: 0.92 }}
                    className="relative z-10 flex-shrink-0 rounded-full flex items-center justify-center"
                    style={{
                      width: 40, height: 40,
                      border: `1px solid ${node.completed ? 'rgba(92,140,92,0.5)' : 'var(--border-default)'}`,
                      background: node.completed ? 'rgba(92,140,92,0.12)' : 'var(--bg-surface)',
                      boxShadow: node.completed ? '0 0 12px rgba(92,140,92,0.15)' : 'none',
                      transition: 'all 0.4s cubic-bezier(0.16,1,0.3,1)',
                    }}
                  >
                    {/* Inner ring */}
                    <div style={{
                      width: 20, height: 20,
                      borderRadius: '50%',
                      border: `1px solid ${node.completed ? 'rgba(92,140,92,0.7)' : 'var(--border-emphasis)'}`,
                      background: node.completed ? 'rgba(92,140,92,0.3)' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 0.4s cubic-bezier(0.16,1,0.3,1)',
                    }}>
                      <AnimatePresence mode="wait">
                        {node.completed && (
                          <motion.div
                            key="check"
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0, opacity: 0 }}
                            transition={{ duration: 0.25, ease: [0.34, 1.56, 0.64, 1] }}
                          >
                            <Check size={8} strokeWidth={3} style={{ color: 'var(--accent-green)' }} />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Step number */}
                    {!node.completed && (
                      <span
                        className="absolute font-mono"
                        style={{
                          top: -2, right: -2,
                          width: 14, height: 14,
                          borderRadius: '50%',
                          background: 'var(--bg-overlay)',
                          border: '1px solid var(--border-subtle)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 7, color: 'var(--fg-subtle)',
                        }}
                      >
                        {idx + 1}
                      </span>
                    )}
                  </motion.button>

                  {/* Label */}
                  <div className="flex-1 min-w-0">
                    {isEditing ? (
                      <input
                        autoFocus
                        value={editLabel}
                        onChange={e => setEditLabel(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') saveEdit(node.id)
                          if (e.key === 'Escape') setEditingId(null)
                        }}
                        onBlur={() => saveEdit(node.id)}
                        style={{
                          width: '100%', background: 'transparent', outline: 'none',
                          borderBottom: '1px solid var(--border-emphasis)',
                          color: 'var(--fg-primary)', fontSize: 14,
                          fontFamily: 'DM Sans, sans-serif', padding: '2px 0',
                        }}
                      />
                    ) : (
                      <div>
                        <span style={{
                          fontSize: 14,
                          color: node.completed ? 'var(--fg-muted)' : 'var(--fg-secondary)',
                          textDecoration: node.completed ? 'line-through' : 'none',
                          textDecorationColor: 'var(--border-emphasis)',
                          transition: 'all 0.4s ease',
                        }}>
                          {node.label}
                        </span>
                        {node.completedAt && node.completed && (
                          <p style={{ fontSize: 11, color: 'var(--fg-subtle)', fontFamily: 'DM Mono, monospace', marginTop: 2 }}>
                            {new Date(node.completedAt).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    <button onClick={() => { setEditingId(node.id); setEditLabel(node.label) }}
                      className="w-6 h-6 flex items-center justify-center rounded transition-colors"
                      style={{ color: 'var(--fg-subtle)' }}>
                      <Edit2 size={10} />
                    </button>
                    <button onClick={() => removeNode(node.id)}
                      className="w-6 h-6 flex items-center justify-center rounded transition-colors"
                      style={{ color: 'var(--fg-subtle)' }}>
                      <X size={10} />
                    </button>
                  </div>
                </motion.div>
              )
            }}
          />

          {/* Add new node */}
          <div className="relative z-10 ml-11 mt-2">
            <AnimatePresence mode="wait">
              {addingNew ? (
                <motion.div key="inp" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="flex items-center gap-2">
                  <input
                    autoFocus value={newLabel} onChange={e => setNewLabel(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') addNode(); if (e.key === 'Escape') { setAddingNew(false); setNewLabel('') } }}
                    placeholder="Step name..."
                    style={{
                      flex: 1, height: 32, paddingLeft: 12, paddingRight: 12,
                      borderRadius: 4, background: 'var(--bg-surface)',
                      border: '1px solid var(--border-emphasis)',
                      color: 'var(--fg-primary)', fontSize: 13, outline: 'none',
                      fontFamily: 'DM Sans, sans-serif',
                    }}
                  />
                  <button onClick={addNode}
                    style={{ fontSize: 12, color: 'var(--accent-green)', padding: '4px 12px', borderRadius: 4, border: '1px solid var(--accent-green-dim)', cursor: 'pointer', background: 'transparent' }}>
                    Add
                  </button>
                  <button onClick={() => { setAddingNew(false); setNewLabel('') }}
                    style={{ color: 'var(--fg-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
                    <X size={14} />
                  </button>
                </motion.div>
              ) : (
                <motion.button key="btn" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  onClick={() => setAddingNew(true)}
                  className="flex items-center gap-2 py-2 transition-colors"
                  style={{ fontSize: 12, color: 'var(--fg-subtle)', background: 'none', border: 'none', cursor: 'pointer' }}>
                  <Plus size={12} /> Add step
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-4 mt-8 pt-5" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          <button
            onClick={() => { if (confirm('Load default template?')) { updateNodes(db.getDefaultPipelineNodes()); toast.success('Template loaded') } }}
            className="flex items-center gap-1.5 text-xs transition-colors"
            style={{ color: 'var(--fg-subtle)', background: 'none', border: 'none', cursor: 'pointer' }}>
            <Layers size={11} /> Load default template
          </button>
          <div className="flex-1" />
          {completed > 0 && (
            <button
              onClick={() => { updateNodes(nodes.map(n => ({ ...n, completed: false, completedAt: null }))); toast.info('Pipeline reset') }}
              className="flex items-center gap-1.5 text-xs transition-colors"
              style={{ color: 'var(--fg-subtle)', background: 'none', border: 'none', cursor: 'pointer' }}>
              <RotateCcw size={11} /> Reset all
            </button>
          )}
        </div>
        <div style={{ height: 40 }} />
      </div>
    </div>
  )
}

/* ──────────────────────────────────────────────────────
   Circular Progress Map — restored V1 style (image 3)
   Concentric rings + node dots on outer ring
────────────────────────────────────────────────────── */
function CircularProgressMap({
  nodes, completed, progress
}: {
  nodes: PipelineNode[]
  completed: number
  progress: number
}) {
  const SIZE = 260
  const CX = SIZE / 2
  const CY = SIZE / 2

  // Ring radii (from outer to inner)
  const R_OUTER = 110
  const R_MID   = 88
  const R_INNER = 65
  const R_CORE  = 42

  const total = nodes.length
  const circ = 2 * Math.PI * R_OUTER

  return (
    <div className="flex justify-center">
      <div className="relative" style={{ width: SIZE, height: SIZE }}>
        <svg
          width={SIZE} height={SIZE}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          style={{ overflow: 'visible' }}
        >
          {/* Outer ring — track */}
          <circle cx={CX} cy={CY} r={R_OUTER}
            fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />

          {/* Outer ring — progress arc */}
          <motion.circle
            cx={CX} cy={CY} r={R_OUTER}
            fill="none"
            stroke={progress === 1 ? 'rgba(92,140,92,0.7)' : 'rgba(92,140,92,0.55)'}
            strokeWidth="1.2"
            strokeLinecap="round"
            style={{ transformOrigin: `${CX}px ${CY}px`, transform: 'rotate(-90deg)' }}
            initial={{ strokeDasharray: `${circ}`, strokeDashoffset: circ }}
            animate={{ strokeDashoffset: circ * (1 - progress) }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
          />

          {/* Mid ring */}
          <circle cx={CX} cy={CY} r={R_MID}
            fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />

          {/* Inner ring */}
          <circle cx={CX} cy={CY} r={R_INNER}
            fill="none" stroke="rgba(255,255,255,0.035)" strokeWidth="0.8" />

          {/* Core ring */}
          <circle cx={CX} cy={CY} r={R_CORE}
            fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="0.6" />

          {/* Node dots on outer ring */}
          {total > 0 && nodes.map((node, i) => {
            const angle = (i / total) * 2 * Math.PI - Math.PI / 2
            const x = CX + R_OUTER * Math.cos(angle)
            const y = CY + R_OUTER * Math.sin(angle)
            const isDone = i < completed
            const isCurrent = i === completed && i < total

            return (
              <g key={node.id}>
                {isCurrent && (
                  <motion.circle
                    cx={x} cy={y} r={9}
                    fill="none"
                    stroke="rgba(92,140,92,0.25)"
                    strokeWidth="1"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.6, repeat: Infinity, repeatType: 'reverse' }}
                    style={{ transformOrigin: `${x}px ${y}px` }}
                  />
                )}
                <motion.circle
                  cx={x} cy={y}
                  r={isDone ? 4.5 : isCurrent ? 4 : 3}
                  fill={isDone ? 'rgba(92,140,92,0.85)' : isCurrent ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.15)'}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.4, delay: 0.5 + i * 0.04, ease: [0.16, 1, 0.3, 1] }}
                  style={{ transformOrigin: `${x}px ${y}px` }}
                />
                {isDone && (
                  <circle cx={x} cy={y} r={1.5} fill="rgba(255,255,255,0.5)" />
                )}
              </g>
            )
          })}

          {/* Spoke lines to a few cardinal points */}
          {[0, 0.25, 0.5, 0.75].map((frac, i) => {
            const angle = frac * 2 * Math.PI - Math.PI / 2
            const x1 = CX + R_INNER * Math.cos(angle)
            const y1 = CY + R_INNER * Math.sin(angle)
            const x2 = CX + R_CORE * Math.cos(angle)
            const y2 = CY + R_CORE * Math.sin(angle)
            return (
              <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
                stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />
            )
          })}

          {/* Center dot */}
          <circle cx={CX} cy={CY} r={3} fill="rgba(92,140,92,0.4)" />
          <circle cx={CX} cy={CY} r={1.2} fill="rgba(92,140,92,0.8)" />
        </svg>

        {/* Center text */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
          style={{ fontFamily: '"Cormorant Garamond", Georgia, serif' }}
        >
          <span style={{ fontSize: 36, color: 'var(--fg-primary)', fontWeight: 400, lineHeight: 1 }}>
            {completed}
          </span>
          <span style={{ fontSize: 11, color: 'var(--fg-muted)', fontFamily: 'DM Mono, monospace', letterSpacing: '0.1em', marginTop: 4 }}>
            done
          </span>
        </div>
      </div>
    </div>
  )
}
