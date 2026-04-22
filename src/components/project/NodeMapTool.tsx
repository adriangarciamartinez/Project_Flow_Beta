import { useState, useRef, useCallback, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Plus, Trash2, Link, Unlink, RotateCcw, Info } from 'lucide-react'
import { v4 as uuidv4 } from 'uuid'
import { Project } from '../../types'
import { useAppStore } from '../../store/appStore'
import { toast } from '../ui/Toast'

interface MapNode {
  id: string
  x: number
  y: number
  label: string
  color: 'default' | 'accent' | 'muted' | 'warm'
}

interface MapEdge {
  id: string
  from: string
  to: string
}

interface NodeMap {
  nodes: MapNode[]
  edges: MapEdge[]
}

const NODE_COLORS: Record<MapNode['color'], { fill: string; stroke: string; text: string }> = {
  default: { fill: 'rgba(26,26,29,0.95)', stroke: 'rgba(255,255,255,0.15)', text: '#a8a8a4' },
  accent:  { fill: 'rgba(26,46,26,0.9)',  stroke: 'rgba(92,140,92,0.5)',    text: '#7ab87a' },
  muted:   { fill: 'rgba(20,20,22,0.9)',  stroke: 'rgba(255,255,255,0.08)', text: '#606060' },
  warm:    { fill: 'rgba(36,28,20,0.9)',  stroke: 'rgba(180,140,80,0.35)',  text: '#b08040' },
}

const COLORS: MapNode['color'][] = ['default', 'accent', 'muted', 'warm']

export default function NodeMapTool({ project }: { project: Project }) {
  const updateProject = useAppStore(s => s.updateProject)
  const svgRef = useRef<SVGSVGElement>(null)
  const [map, setMap] = useState<NodeMap>(() => {
    try {
      const saved = localStorage.getItem(`pf_nodemap_${project.id}`)
      return saved ? JSON.parse(saved) : { nodes: [], edges: [] }
    } catch { return { nodes: [], edges: [] } }
  })

  const [selected, setSelected] = useState<string | null>(null)
  const [connecting, setConnecting] = useState<string | null>(null)
  const [dragging, setDragging] = useState<{ id: string; ox: number; oy: number } | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editLabel, setEditLabel] = useState('')
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [panStart, setPanStart] = useState<{ x: number; y: number; px: number; py: number } | null>(null)

  const saveMap = useCallback((m: NodeMap) => {
    localStorage.setItem(`pf_nodemap_${project.id}`, JSON.stringify(m))
    setMap(m)
  }, [project.id])

  const addNode = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (e.target !== svgRef.current) return
    const rect = svgRef.current!.getBoundingClientRect()
    const x = e.clientX - rect.left - pan.x
    const y = e.clientY - rect.top - pan.y
    const node: MapNode = { id: uuidv4(), x, y, label: 'Node', color: 'default' }
    const next = { ...map, nodes: [...map.nodes, node] }
    saveMap(next)
    setEditingId(node.id); setEditLabel('Node')
  }, [map, pan, saveMap])

  const startDrag = useCallback((e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    if (connecting) {
      if (connecting !== id) {
        const edgeExists = map.edges.some(e => (e.from === connecting && e.to === id) || (e.from === id && e.to === connecting))
        if (!edgeExists) {
          saveMap({ ...map, edges: [...map.edges, { id: uuidv4(), from: connecting, to: id }] })
          toast.success('Connected')
        }
      }
      setConnecting(null)
      return
    }
    setSelected(id)
    setDragging({ id, ox: e.clientX, oy: e.clientY })
  }, [connecting, map, saveMap])

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (dragging) {
      const dx = e.clientX - dragging.ox
      const dy = e.clientY - dragging.oy
      setMap(prev => ({
        ...prev,
        nodes: prev.nodes.map(n => n.id === dragging.id ? { ...n, x: n.x + dx, y: n.y + dy } : n)
      }))
      setDragging(d => d ? { ...d, ox: e.clientX, oy: e.clientY } : null)
    } else if (panStart) {
      setPan({ x: panStart.px + e.clientX - panStart.x, y: panStart.py + e.clientY - panStart.y })
    }
  }, [dragging, panStart])

  const onMouseUp = useCallback(() => {
    if (dragging) {
      saveMap(map)
      setDragging(null)
    }
    setPanStart(null)
  }, [dragging, map, saveMap])

  const startPan = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (e.target !== svgRef.current) return
    setPanStart({ x: e.clientX, y: e.clientY, px: pan.x, py: pan.y })
  }, [pan])

  const deleteSelected = () => {
    if (!selected) return
    saveMap({
      nodes: map.nodes.filter(n => n.id !== selected),
      edges: map.edges.filter(e => e.from !== selected && e.to !== selected),
    })
    setSelected(null)
  }

  const cycleColor = (id: string) => {
    const node = map.nodes.find(n => n.id === id)
    if (!node) return
    const next = COLORS[(COLORS.indexOf(node.color) + 1) % COLORS.length]
    saveMap({ ...map, nodes: map.nodes.map(n => n.id === id ? { ...n, color: next } : n) })
  }

  const saveLabel = (id: string) => {
    saveMap({ ...map, nodes: map.nodes.map(n => n.id === id ? { ...n, label: editLabel || n.label } : n) })
    setEditingId(null)
  }

  const removeEdgesOf = (fromId: string, toId: string) => {
    saveMap({ ...map, edges: map.edges.filter(e => !(e.from === fromId && e.to === toId) && !(e.from === toId && e.to === fromId)) })
  }

  const getNode = (id: string) => map.nodes.find(n => n.id === id)

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-6 py-3 border-b flex-shrink-0" style={{ borderColor: 'var(--border-subtle)' }}>
        <span className="text-xs font-mono tracking-wider" style={{ color: 'var(--fg-muted)' }}>NODE MAP</span>
        <div className="w-px h-4" style={{ background: 'var(--border-subtle)' }} />

        <button onClick={() => setConnecting(c => c ? null : selected || null)}
          disabled={!selected && !connecting}
          className={`flex items-center gap-1.5 h-7 px-3 rounded border text-xs transition-colors ${
            connecting ? 'border-accent-greenDim text-accent-green bg-accent-greenGhost' : 'border-border-subtle text-fg-muted hover:text-fg-secondary disabled:opacity-30'
          }`}>
          <Link size={11} /> {connecting ? 'Click target node' : 'Connect'}
        </button>

        {selected && (
          <>
            <button onClick={() => cycleColor(selected)}
              className="flex items-center gap-1.5 h-7 px-3 rounded border border-border-subtle text-xs text-fg-muted hover:text-fg-secondary transition-colors">
              Color
            </button>
            <button onClick={deleteSelected}
              className="flex items-center gap-1.5 h-7 px-3 rounded border border-border-subtle text-xs text-fg-muted hover:text-red-400 transition-colors">
              <Trash2 size={11} /> Delete
            </button>
          </>
        )}

        <div className="flex-1" />

        <span className="text-2xs font-mono" style={{ color: 'var(--fg-subtle)' }}>
          {map.nodes.length} nodes · {map.edges.length} connections
        </span>

        <button onClick={() => { if (confirm('Clear canvas?')) { saveMap({ nodes: [], edges: [] }); setSelected(null) } }}
          className="flex items-center gap-1.5 h-7 px-2 rounded border border-border-subtle text-xs text-fg-subtle hover:text-fg-muted transition-colors">
          <RotateCcw size={11} />
        </button>
      </div>

      {/* Canvas */}
      <div className="flex-1 relative overflow-hidden" style={{ background: 'var(--bg-void)', cursor: connecting ? 'crosshair' : 'default' }}>
        {map.nodes.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none" style={{ color: 'var(--fg-subtle)' }}>
            <div className="mb-3 opacity-20">
              <svg width="60" height="60" viewBox="0 0 60 60" fill="none">
                <circle cx="10" cy="30" r="4" stroke="white" strokeWidth="0.8" />
                <circle cx="30" cy="15" r="4" stroke="white" strokeWidth="0.8" />
                <circle cx="30" cy="45" r="4" stroke="white" strokeWidth="0.8" />
                <circle cx="50" cy="30" r="4" stroke="white" strokeWidth="0.8" />
                <line x1="14" y1="30" x2="26" y2="17" stroke="white" strokeWidth="0.6" opacity="0.5" />
                <line x1="14" y1="30" x2="26" y2="43" stroke="white" strokeWidth="0.6" opacity="0.5" />
                <line x1="34" y1="17" x2="46" y2="28" stroke="white" strokeWidth="0.6" opacity="0.5" />
                <line x1="34" y1="43" x2="46" y2="32" stroke="white" strokeWidth="0.6" opacity="0.5" />
              </svg>
            </div>
            <p className="text-sm">Double-click canvas to add nodes</p>
            <p className="text-xs mt-1 opacity-60">Drag to move · Connect to link · Right-click for options</p>
          </div>
        )}

        <svg
          ref={svgRef}
          className="w-full h-full"
          onDoubleClick={addNode}
          onMouseDown={startPan}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
        >
          <g transform={`translate(${pan.x},${pan.y})`}>
            {/* Edges */}
            {map.edges.map(edge => {
              const a = getNode(edge.from)
              const b = getNode(edge.to)
              if (!a || !b) return null
              const mx = (a.x + b.x) / 2
              const my = (a.y + b.y) / 2 - Math.abs(a.x - b.x) * 0.2
              return (
                <g key={edge.id}>
                  <path
                    d={`M ${a.x} ${a.y} Q ${mx} ${my} ${b.x} ${b.y}`}
                    fill="none"
                    stroke="rgba(255,255,255,0.12)"
                    strokeWidth="1"
                    strokeDasharray="none"
                  />
                  {/* Edge delete hitbox */}
                  <path
                    d={`M ${a.x} ${a.y} Q ${mx} ${my} ${b.x} ${b.y}`}
                    fill="none"
                    stroke="transparent"
                    strokeWidth="12"
                    className="cursor-pointer"
                    onDoubleClick={() => removeEdgesOf(edge.from, edge.to)}
                  />
                  {/* Midpoint dot */}
                  <circle cx={(a.x + b.x) / 2} cy={(a.y + b.y) / 2} r="2" fill="rgba(255,255,255,0.15)" />
                </g>
              )
            })}

            {/* Connecting preview line */}
            {connecting && (
              <circle cx={getNode(connecting)?.x} cy={getNode(connecting)?.y} r="16"
                fill="none" stroke="rgba(92,140,92,0.3)" strokeWidth="1" strokeDasharray="4 4" />
            )}

            {/* Nodes */}
            {map.nodes.map(node => {
              const col = NODE_COLORS[node.color]
              const isSelected = selected === node.id
              const isConnecting = connecting === node.id

              return (
                <g key={node.id} transform={`translate(${node.x},${node.y})`}
                  onMouseDown={e => startDrag(e, node.id)}
                  style={{ cursor: dragging?.id === node.id ? 'grabbing' : 'grab' }}>

                  {/* Selection ring */}
                  {(isSelected || isConnecting) && (
                    <circle r="24" fill="none"
                      stroke={isConnecting ? 'rgba(92,140,92,0.6)' : 'rgba(255,255,255,0.2)'}
                      strokeWidth="1" strokeDasharray="3 3" />
                  )}

                  {/* Node body */}
                  <rect x="-50" y="-16" width="100" height="32" rx="4"
                    fill={col.fill} stroke={col.stroke} strokeWidth="1" />

                  {/* Label */}
                  {editingId === node.id ? (
                    <foreignObject x="-48" y="-12" width="96" height="24">
                      <input
                        autoFocus
                        value={editLabel}
                        onChange={e => setEditLabel(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') saveLabel(node.id) }}
                        onBlur={() => saveLabel(node.id)}
                        style={{
                          width: '100%', height: '100%', background: 'transparent',
                          border: 'none', outline: 'none', textAlign: 'center',
                          color: col.text, fontSize: '11px', fontFamily: 'DM Sans, sans-serif',
                        }}
                      />
                    </foreignObject>
                  ) : (
                    <text
                      textAnchor="middle" dominantBaseline="middle"
                      fill={col.text}
                      style={{ fontSize: '11px', fontFamily: 'DM Sans, sans-serif', pointerEvents: 'none' }}>
                      {node.label.length > 14 ? node.label.slice(0, 13) + '…' : node.label}
                    </text>
                  )}

                  {/* Double click to edit */}
                  <rect x="-50" y="-16" width="100" height="32" rx="4"
                    fill="transparent"
                    onDoubleClick={e => { e.stopPropagation(); setEditingId(node.id); setEditLabel(node.label) }}
                  />

                  {/* Port dots */}
                  <circle cx="-52" cy="0" r="3" fill={col.stroke} />
                  <circle cx="52" cy="0" r="3" fill={col.stroke} />
                </g>
              )
            })}
          </g>
        </svg>

        {/* Help */}
        <div className="absolute bottom-3 left-3 flex items-center gap-1" style={{ color: 'var(--fg-subtle)' }}>
          <Info size={10} />
          <span className="text-2xs font-mono">Double-click canvas: add node · Double-click node: rename · Double-click edge: remove</span>
        </div>
      </div>
    </div>
  )
}
