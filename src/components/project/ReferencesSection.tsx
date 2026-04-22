import { useState, useRef, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { v4 as uuidv4 } from 'uuid'
import { Upload, X, Link, Plus, ZoomIn, ZoomOut, Maximize2, Edit3, Move, MousePointer, Minus, ArrowRight, Type, Trash2, BookImage } from 'lucide-react'
import { useDropzone } from 'react-dropzone'
import { importFile, isBrokenSrc } from '../../utils/mediaPersistence'
import MissingMedia from '../ui/MissingMedia'
import { LocalImage } from '../ui/LocalMedia'
import { Project, ReferenceItem } from '../../types'
import { useAppStore } from '../../store/appStore'
import { toast } from '../ui/Toast'

interface BoardItem { id: string; refId: string; x: number; y: number; w: number; h: number; zIndex: number }
interface BoardConn { id: string; fromId: string; toId: string }
interface BoardAnnot { id: string; x: number; y: number; text: string }
interface DrawStroke { id: string; pts: { x: number; y: number }[]; color: string }
interface Board { items: BoardItem[]; conns: BoardConn[]; annots: BoardAnnot[]; strokes: DrawStroke[]; scale: number; panX: number; panY: number }

type Tool = 'select' | 'move' | 'draw' | 'text' | 'connect'
const DRAW_COLORS = ['rgba(255,255,255,0.55)', 'rgba(92,140,92,0.7)', 'rgba(200,150,80,0.7)', 'rgba(150,100,200,0.7)', 'rgba(200,80,80,0.65)']

function loadBoard(id: string): Board {
  try { const r = localStorage.getItem(`pf_board_${id}`); if (r) return JSON.parse(r) } catch {}
  return { items: [], conns: [], annots: [], strokes: [], scale: 1, panX: 0, panY: 0 }
}

export default function ReferencesSection({ project }: { project: Project }) {
  const updateProject = useAppStore(s => s.updateProject)
  const [board, setBoard] = useState<Board>(() => loadBoard(project.id))
  const [tool, setTool] = useState<Tool>('select')
  const [selected, setSelected] = useState<string | null>(null)
  const [connecting, setConnecting] = useState<string | null>(null)
  const [drawColor, setDrawColor] = useState(DRAW_COLORS[0])
  const [curStroke, setCurStroke] = useState<DrawStroke | null>(null)
  const [dragging, setDragging] = useState<{ id: string; ox: number; oy: number; bx: number; by: number } | null>(null)
  const [panning, setPanning] = useState<{ ox: number; oy: number; px: number; py: number } | null>(null)
  const [editAnnot, setEditAnnot] = useState<{ id: string; text: string } | null>(null)
  const [resizing, setResizing] = useState<{ id: string; startW: number; startH: number; startX: number; startY: number } | null>(null)
  const [addingLink, setAddingLink] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const boardRef = useRef<HTMLDivElement>(null)

  const save = useCallback((b: Board) => { setBoard(b); localStorage.setItem(`pf_board_${project.id}`, JSON.stringify(b)) }, [project.id])

  const onDrop = useCallback(async (files: File[]) => {
    if (!files.length) return
    const newRefs: ReferenceItem[] = []
    const errors: string[] = []

    for (const f of files) {
      try {
        const { storedSrc } = await importFile(f)
        newRefs.push({
          id: uuidv4(),
          type: f.type.startsWith('image/') ? 'image' as const : 'video' as const,
          filePath: storedSrc,
          title: f.name,
          tags: [],
          addedAt: new Date().toISOString(),
        })
      } catch (err: any) {
        errors.push(f.name)
        console.error(`[references] ✗ ${f.name}:`, err.message)
      }
    }

    if (newRefs.length) {
      updateProject(project.id, { references: [...project.references, ...newRefs] })
      const cx = (-board.panX + 300) / board.scale
      const cy = (-board.panY + 200) / board.scale
      const newItems: BoardItem[] = newRefs.map((r, i) => ({
        id: uuidv4(), refId: r.id,
        x: cx + (i % 3) * 220, y: cy + Math.floor(i / 3) * 160,
        w: 200, h: 140, zIndex: board.items.length + i + 1,
      }))
      save({ ...board, items: [...board.items, ...newItems] })
      toast.success(`${newRefs.length} reference${newRefs.length > 1 ? 's' : ''} added`)
    }
    if (errors.length) toast.error(`${errors.length} file(s) failed`)
  }, [board, project, updateProject, save])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [], 'video/*': [], 'application/octet-stream': [] },
    noClick: true,
    multiple: true,
  })

  const toBoard = useCallback((cx: number, cy: number) => {
    const rect = boardRef.current?.getBoundingClientRect()
    if (!rect) return { x: 0, y: 0 }
    return { x: (cx - rect.left - board.panX) / board.scale, y: (cy - rect.top - board.panY) / board.scale }
  }, [board.panX, board.panY, board.scale])

  const handleBgMouseDown = useCallback((e: React.MouseEvent) => {
    if (tool === 'move') { setPanning({ ox: e.clientX, oy: e.clientY, px: board.panX, py: board.panY }); return }
    if (tool === 'draw') { const p = toBoard(e.clientX, e.clientY); setCurStroke({ id: uuidv4(), pts: [p], color: drawColor }); return }
    if (tool === 'text') {
      const p = toBoard(e.clientX, e.clientY)
      const a: BoardAnnot = { id: uuidv4(), x: p.x, y: p.y, text: 'Annotation' }
      const next = { ...board, annots: [...board.annots, a] }; save(next)
      setEditAnnot({ id: a.id, text: 'Annotation' }); return
    }
    if (tool === 'select') setSelected(null)
  }, [tool, board, toBoard, drawColor, save])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (panning) { save({ ...board, panX: panning.px + e.clientX - panning.ox, panY: panning.py + e.clientY - panning.oy }); return }
    if (dragging) {
      const dx = (e.clientX - dragging.ox) / board.scale, dy = (e.clientY - dragging.oy) / board.scale
      setBoard(prev => ({ ...prev, items: prev.items.map(it => it.id === dragging.id ? { ...it, x: dragging.bx + dx, y: dragging.by + dy } : it) }))
      return
    }
    if (resizing) {
      const dx = (e.clientX - resizing.startX) / board.scale
      const dy = (e.clientY - resizing.startY) / board.scale
      const newW = Math.max(80, resizing.startW + dx)
      const newH = Math.max(60, resizing.startH + dy)
      setBoard(prev => ({ ...prev, items: prev.items.map(it => it.id === resizing.id ? { ...it, w: newW, h: newH } : it) }))
      return
    }
    if (curStroke) { const p = toBoard(e.clientX, e.clientY); setCurStroke(prev => prev ? { ...prev, pts: [...prev.pts, p] } : null) }
  }, [panning, dragging, resizing, curStroke, board, save, toBoard])

  const handleMouseUp = useCallback(() => {
    if (panning) setPanning(null)
    if (dragging) { save(board); setDragging(null) }
    if (resizing) { save(board); setResizing(null) }
    if (curStroke && curStroke.pts.length > 1) { save({ ...board, strokes: [...board.strokes, curStroke] }); setCurStroke(null) }
    else if (curStroke) setCurStroke(null)
  }, [panning, dragging, resizing, curStroke, board, save])

  const startResize = useCallback((e: React.MouseEvent, item: BoardItem) => {
    e.stopPropagation()
    e.preventDefault()
    setResizing({ id: item.id, startW: item.w, startH: item.h, startX: e.clientX, startY: e.clientY })
  }, [])

  const handleItemDown = useCallback((e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    if (tool === 'connect') {
      if (!connecting) { setConnecting(id); return }
      if (connecting !== id) {
        const exists = board.conns.some(c => (c.fromId === connecting && c.toId === id) || (c.fromId === id && c.toId === connecting))
        if (!exists) { save({ ...board, conns: [...board.conns, { id: uuidv4(), fromId: connecting, toId: id }] }); toast.success('Connected') }
      }
      setConnecting(null); return
    }
    setSelected(id)
    const item = board.items.find(i => i.id === id)
    if (item) setDragging({ id, ox: e.clientX, oy: e.clientY, bx: item.x, by: item.y })
  }, [tool, connecting, board, save])

  const addLink = useCallback(() => {
    if (!linkUrl.trim()) return
    const ref: ReferenceItem = { id: uuidv4(), type: 'link', url: linkUrl.trim(), title: linkUrl.trim(), tags: [], addedAt: new Date().toISOString() }
    updateProject(project.id, { references: [...project.references, ref] })
    const cx = (-board.panX + 300) / board.scale, cy = (-board.panY + 200) / board.scale
    save({ ...board, items: [...board.items, { id: uuidv4(), refId: ref.id, x: cx, y: cy, w: 180, h: 100, zIndex: board.items.length + 1 }] })
    setLinkUrl(''); setAddingLink(false); toast.success('Link added')
  }, [linkUrl, board, project, updateProject, save])

  const getRef = (id: string) => project.references.find(r => r.id === id)
  const getItem = (id: string) => board.items.find(i => i.id === id)
  const zoom = (d: number) => save({ ...board, scale: Math.min(3, Math.max(0.2, board.scale + d)) })
  const resetView = () => save({ ...board, scale: 1, panX: 0, panY: 0 })

  const refsNotOnBoard = useMemo(() => {
    const onBoard = new Set(board.items.map(i => i.refId))
    return project.references.filter(r => !onBoard.has(r.id))
  }, [project.references, board.items])

  const pathFromPts = (pts: { x: number; y: number }[], ox: number, oy: number) => {
    if (pts.length < 2) return ''
    return `M ${pts[0].x + ox} ${pts[0].y + oy}` + pts.slice(1).map(p => ` L ${p.x + ox} ${p.y + oy}`).join('')
  }

  const svgOX = 2000, svgOY = 2000

  return (
    <div className="h-full flex overflow-hidden bg-bg-base">
      {/* Sidebar */}
      <div className="w-52 flex-shrink-0 border-r border-border-subtle bg-bg-surface flex flex-col">
        {/* Tool palette */}
        <div className="p-3 border-b border-border-subtle">
          <p className="text-2xs font-mono text-fg-subtle tracking-ultra-wide uppercase mb-2">Tools</p>
          <div className="grid grid-cols-5 gap-0.5">
            {([['select', <MousePointer size={12}/>], ['move', <Move size={12}/>], ['draw', <Edit3 size={12}/>], ['text', <Type size={12}/>], ['connect', <ArrowRight size={12}/>]] as [Tool, React.ReactNode][]).map(([t, icon]) => (
              <button key={t} onClick={() => { setTool(t); setConnecting(null) }} title={t.charAt(0).toUpperCase() + t.slice(1)}
                className={`h-8 flex items-center justify-center rounded transition-all text-xs ${tool === t ? 'bg-bg-elevated text-fg-primary border border-border-emphasis' : 'text-fg-muted hover:text-fg-secondary border border-transparent hover:bg-bg-elevated'}`}>
                {icon}
              </button>
            ))}
          </div>
          {tool === 'draw' && (
            <div className="flex gap-1.5 mt-2">
              {DRAW_COLORS.map(c => (
                <button key={c} onClick={() => setDrawColor(c)} className="w-5 h-5 rounded-full border-2 transition-all flex-shrink-0"
                  style={{ background: c, borderColor: drawColor === c ? 'white' : 'transparent' }}/>
              ))}
            </div>
          )}
        </div>

        {/* Add */}
        <div className="p-3 border-b border-border-subtle">
          <div {...getRootProps()} className={`rounded border border-dashed p-2.5 text-center mb-2 transition-colors ${isDragActive ? 'border-accent-greenDim bg-accent-greenGhost' : 'border-border-subtle'}`}>
            <input {...getInputProps()}/>
            <Upload size={13} className="mx-auto mb-1 text-fg-subtle"/>
            <p className="text-2xs text-fg-subtle">Drop images</p>
          </div>
          <button onClick={() => setAddingLink(v => !v)}
            className={`flex items-center gap-1.5 w-full h-7 px-2 rounded border text-xs transition-colors ${addingLink ? 'border-accent-greenDim text-accent-green' : 'border-border-subtle text-fg-muted hover:text-fg-secondary'}`}>
            <Link size={10}/> Add link
          </button>
          <AnimatePresence>
            {addingLink && (
              <motion.div initial={{height:0,opacity:0}} animate={{height:'auto',opacity:1}} exit={{height:0,opacity:0}} className="overflow-hidden">
                <div className="flex flex-col gap-1 pt-2">
                  <input autoFocus value={linkUrl} onChange={e=>setLinkUrl(e.target.value)}
                    onKeyDown={e=>{if(e.key==='Enter')addLink();if(e.key==='Escape')setAddingLink(false)}}
                    placeholder="https://..." className="h-7 px-2 rounded border border-border-default text-xs text-fg-primary placeholder-fg-subtle outline-none bg-bg-elevated font-mono"/>
                  <button onClick={addLink} className="text-2xs text-accent-green text-left px-1">Add →</button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Refs not on board */}
        {refsNotOnBoard.length > 0 && (
          <div className="flex-1 overflow-y-auto p-3">
            <p className="text-2xs font-mono text-fg-subtle tracking-ultra-wide uppercase mb-2">Add to board</p>
            <div className="flex flex-col gap-1">
              {refsNotOnBoard.map(ref => (
                <button key={ref.id} onClick={() => {
                  const cx = (-board.panX + 300) / board.scale, cy = (-board.panY + 200) / board.scale
                  save({ ...board, items: [...board.items, { id: uuidv4(), refId: ref.id, x: cx, y: cy, w: 200, h: 140, zIndex: board.items.length + 1 }] })
                }} className="flex items-center gap-2 h-8 px-2 rounded border border-border-subtle text-xs text-fg-muted hover:text-fg-secondary hover:border-border-default transition-colors text-left">
                  <Plus size={10} className="flex-shrink-0"/>
                  <span className="truncate">{ref.title}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="p-3 border-t border-border-subtle mt-auto flex flex-col gap-1">
          {selected && (
            <button onClick={() => { save({ ...board, items: board.items.filter(i => i.id !== selected), conns: board.conns.filter(c => c.fromId !== selected && c.toId !== selected) }); setSelected(null) }}
              className="flex items-center gap-1.5 w-full h-7 px-2 rounded border border-red-900/40 text-xs text-red-400/70 hover:text-red-400 transition-colors">
              <Trash2 size={10}/> Delete selected
            </button>
          )}
          {board.strokes.length > 0 && (
            <button onClick={() => save({ ...board, strokes: [] })} className="flex items-center gap-1.5 w-full h-7 px-2 rounded border border-border-subtle text-xs text-fg-subtle hover:text-fg-muted transition-colors">
              <Minus size={10}/> Clear drawings
            </button>
          )}
        </div>
      </div>

      {/* Canvas */}
      <div ref={boardRef} className="flex-1 relative overflow-hidden bg-bg-void"
        style={{ cursor: tool === 'move' ? 'grab' : tool === 'draw' ? 'crosshair' : tool === 'text' ? 'text' : 'default' }}
        onMouseDown={handleBgMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>

        {board.items.length === 0 && !isDragActive && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-fg-subtle">
            <BookImage size={28} className="mb-3 opacity-20"/>
            <p className="text-sm opacity-50">Drop images or use the sidebar to add references</p>
            <p className="text-xs opacity-30 mt-1">Draw · annotate · connect · organize</p>
          </div>
        )}

        {/* Scaled board */}
        <div className="absolute inset-0" style={{ transform: `translate(${board.panX}px,${board.panY}px) scale(${board.scale})`, transformOrigin: '0 0' }}>

          {/* SVG overlay */}
          <svg className="absolute pointer-events-none overflow-visible" style={{ left: -svgOX, top: -svgOY, width: '10000px', height: '10000px', zIndex: 1 }}>
            {board.conns.map(c => {
              const a = getItem(c.fromId), b = getItem(c.toId)
              if (!a || !b) return null
              const ax = a.x + a.w/2 + svgOX, ay = a.y + a.h/2 + svgOY
              const bx = b.x + b.w/2 + svgOX, by = b.y + b.h/2 + svgOY
              const mx = (ax+bx)/2, my = Math.min(ay,by) - 50
              return (
                <g key={c.id}>
                  <path d={`M ${ax} ${ay} Q ${mx} ${my} ${bx} ${by}`} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1"/>
                  <circle cx={mx} cy={my} r="2" fill="rgba(255,255,255,0.2)"/>
                  <path d={`M ${ax} ${ay} Q ${mx} ${my} ${bx} ${by}`} fill="none" stroke="transparent" strokeWidth="12"
                    className="pointer-events-auto cursor-pointer"
                    onDoubleClick={() => save({ ...board, conns: board.conns.filter(x => x.id !== c.id) })}/>
                </g>
              )
            })}
            {board.strokes.map(s => (
              <path key={s.id} d={pathFromPts(s.pts, svgOX, svgOY)} fill="none" stroke={s.color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            ))}
            {curStroke && (
              <path d={pathFromPts(curStroke.pts, svgOX, svgOY)} fill="none" stroke={curStroke.color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            )}
          </svg>

          {/* Items */}
          {board.items.map(item => {
            const ref = getRef(item.refId)
            if (!ref) return null
            const isSel = selected === item.id
            const isCon = connecting === item.id
            return (
              <div key={item.id} className={`group absolute rounded border overflow-hidden transition-all duration-150 ${isSel ? 'border-border-bright shadow-modal' : isCon ? 'border-accent-greenDim' : 'border-border-subtle hover:border-border-emphasis'}`}
                style={{ left: item.x, top: item.y, width: item.w, height: item.h, zIndex: item.zIndex + (isSel ? 1000 : 0), background: 'var(--bg-elevated)', cursor: tool === 'move' ? 'default' : 'grab' } as any}
                onMouseDown={e => handleItemDown(e, item.id)}>
                {ref.type === 'image' && ref.filePath && (
                  isBrokenSrc(ref.filePath)
                    ? <MissingMedia filename={ref.title} compact />
                    : <LocalImage src={ref.filePath} alt={ref.title} style={{ width: '100%', height: '100%', objectFit: item.w / item.h > 2 || item.h / item.w > 2 ? 'contain' : 'cover', pointerEvents: 'none' }} draggable={false} fallback={<MissingMedia filename={ref.title} compact />} />
                )}
                {ref.type === 'link' && (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 p-2" style={{ background: 'var(--bg-elevated)' }}>
                    <Link size={14} className="text-fg-muted"/>
                    <p className="text-2xs text-fg-subtle text-center break-all line-clamp-3">{ref.url}</p>
                  </div>
                )}
                {ref.type === 'note' && (
                  <div className="w-full h-full p-2.5" style={{ background: 'var(--bg-elevated)' }}>
                    <p className="text-2xs font-mono text-fg-muted mb-1">{ref.title}</p>
                    <p className="text-2xs text-fg-subtle line-clamp-5 leading-relaxed">{ref.content}</p>
                  </div>
                )}
                <button onMouseDown={e=>e.stopPropagation()}
                  onClick={() => save({ ...board, items: board.items.filter(i => i.id !== item.id), conns: board.conns.filter(c => c.fromId !== item.id && c.toId !== item.id) })}
                  className="absolute top-1 right-1 w-5 h-5 rounded-full bg-bg-void/70 border border-border-subtle flex items-center justify-center text-fg-muted hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all" style={{ pointerEvents: 'all' }}>
                  <X size={9}/>
                </button>
                {/* Resize handle — bottom-right corner */}
                <div
                  onMouseDown={e => startResize(e, item)}
                  className="absolute bottom-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ width: 14, height: 14, cursor: 'nwse-resize', pointerEvents: 'all', display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end', padding: 2 }}>
                  <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                    <line x1="1" y1="7" x2="7" y2="1" stroke="rgba(255,255,255,0.3)" strokeWidth="1" strokeLinecap="round"/>
                    <line x1="4" y1="7" x2="7" y2="4" stroke="rgba(255,255,255,0.2)" strokeWidth="1" strokeLinecap="round"/>
                  </svg>
                </div>
                {isCon && <div className="absolute inset-0 border-2 border-accent-greenDim rounded pointer-events-none"/>}
              </div>
            )
          })}

          {/* Annotations */}
          {board.annots.map(a => (
            <div key={a.id} className="absolute" style={{ left: a.x, top: a.y, zIndex: 5000 }}>
              {editAnnot?.id === a.id ? (
                <input autoFocus value={editAnnot.text} onChange={e => setEditAnnot({...editAnnot, text: e.target.value})}
                  onBlur={() => { save({ ...board, annots: board.annots.map(x => x.id === a.id ? { ...x, text: editAnnot.text } : x) }); setEditAnnot(null) }}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') (e.target as HTMLInputElement).blur() }}
                  className="bg-transparent border-b border-border-emphasis text-xs text-fg-primary outline-none min-w-24 font-mono"/>
              ) : (
                <div className="flex items-center gap-1 group/a">
                  <span className="text-xs font-mono cursor-text select-none text-fg-muted" onDoubleClick={() => setEditAnnot({ id: a.id, text: a.text })}>{a.text}</span>
                  <button onClick={() => save({ ...board, annots: board.annots.filter(x => x.id !== a.id) })} className="opacity-0 group-hover/a:opacity-100 text-fg-subtle hover:text-red-400 transition-opacity"><X size={9}/></button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Zoom controls */}
        <div className="absolute bottom-4 right-4 flex flex-col gap-1 z-10">
          <button onClick={() => zoom(0.15)} className="w-8 h-8 flex items-center justify-center rounded border border-border-subtle bg-bg-elevated text-fg-muted hover:text-fg-secondary transition-colors"><ZoomIn size={13}/></button>
          <button onClick={() => zoom(-0.15)} className="w-8 h-8 flex items-center justify-center rounded border border-border-subtle bg-bg-elevated text-fg-muted hover:text-fg-secondary transition-colors"><ZoomOut size={13}/></button>
          <button onClick={resetView} className="w-8 h-8 flex items-center justify-center rounded border border-border-subtle bg-bg-elevated text-fg-muted hover:text-fg-secondary transition-colors"><Maximize2 size={11}/></button>
        </div>
        <div className="absolute bottom-4 left-4 z-10"><span className="text-2xs font-mono text-fg-subtle">{Math.round(board.scale * 100)}%</span></div>

        {isDragActive && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20" style={{ background: 'rgba(92,140,92,0.08)', border: '1px solid rgba(92,140,92,0.3)' }}>
            <p className="text-sm text-accent-green font-mono">Drop references here</p>
          </div>
        )}
      </div>
    </div>
  )
}
