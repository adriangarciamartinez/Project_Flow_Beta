import { useRef, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { PipelineNode } from '../../types'

// ── Expanded phrase library ─────────────────────────
const STAGE_PHRASES: Record<string, string[]> = {
  'Concept': [
    'Every project starts with a signal.',
    'The idea is not the work. Start working.',
    'Still just a thought. Make it something.',
    'Concepts don\'t render themselves.',
  ],
  'References Gathered': [
    'The direction becomes clearer.',
    'You\'ve looked at enough. Now make something original.',
    'References collected. Vision still missing.',
    'Good taste is step one. Execution is the rest.',
  ],
  'Lookdev': [
    'Shape and mood are taking form.',
    'Almost elegant. Not yet.',
    'The material does not lie. Keep refining.',
    'Looking good is not the same as looking right.',
  ],
  'Modeling / Assets': [
    'Structure is emerging from intention.',
    'Every polygon is a decision. Make them count.',
    'The mesh won\'t model itself.',
    'Clean topology now. Thank yourself later.',
  ],
  'FX Setup': [
    'Systems begin to respond.',
    'Make it look real, not simulated.',
    'The simulation does not care about your deadline.',
    'Chaos is easy. Control is the craft.',
  ],
  'Simulation': [
    'Motion is becoming intention.',
    'The solver is running. Are you?',
    'Still caching. Unlike your excuses.',
    'Every frame is a commitment.',
  ],
  'Lighting': [
    'The image starts to breathe.',
    'Light is not decoration. It is the argument.',
    'Bad lighting hides nothing. Good lighting reveals everything.',
    'One more light tweak. Then render. Then one more.',
  ],
  'Rendering': [
    'The work is resolving into detail.',
    'The file won\'t save itself. But the farm is trying.',
    'Rendering is not a break. It is a deadline.',
    'Every sample is earned. Make them count.',
  ],
  'Compositing': [
    'Everything is finding its place.',
    'The comp is where excuses go to die.',
    'You wanted cinema. Earn it.',
    'Final layer. No miracles. Just good decisions.',
  ],
  'Preview Sent': [
    'The vision moves outward.',
    'Sent. Now wait for feedback you didn\'t ask for.',
    'You sent it. No taking it back.',
    'Shared. The work speaks now.',
  ],
  'Client Feedback': [
    'Refinement through another perspective.',
    'The client is not wrong. They just don\'t know why.',
    'Feedback is information. Use it.',
    'Make it cleaner. You know it needs it anyway.',
  ],
  'Final Render': [
    'The last pass. Nothing left but clarity.',
    'This is it. No more tweaks. You said that last time.',
    'Final. For real this time.',
    'The highest quality version of this frame. Commit to it.',
  ],
  'Delivery': [
    'The vision is ready to leave the studio.',
    'Delivered. The problem is no longer yours.',
    'You are closer. They will not know how close.',
    'It leaves your hands. It enters the world.',
  ],
  'Invoice Sent': [
    'The exchange is complete.',
    'The invoice does not negotiate.',
    'You built it. Now get paid for it.',
    'Sent. Follow up in five days.',
  ],
  'Paid': [
    'Closed with clarity.',
    'Paid. Onto the next one.',
    'The number cleared. The work mattered.',
    'Done. Start the next thing already.',
  ],
}

const DEFAULT_PHRASES = [
  'The work continues.',
  'Less excuses, more clarity.',
  'This stage will not solve itself.',
  'No miracles today. Just progress.',
  'You are closer than yesterday.',
  'Make it better. You know it needs it.',
  'The problem is obvious. Fix it.',
  'Still not magic. Keep working.',
]

function getPhrase(key: string): string {
  const pool = STAGE_PHRASES[key] || DEFAULT_PHRASES
  // Pick based on time so it rotates daily but stays stable per session
  const idx = Math.floor(Date.now() / (1000 * 60 * 60 * 24)) % pool.length
  return pool[idx]
}

interface Props { nodes: PipelineNode[] }

export default function HorizontalPipelineTree({ nodes }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number>(0)
  const mouseRef = useRef({ x: -1, y: -1 })

  const sorted = useMemo(() => [...nodes].sort((a, b) => a.order - b.order), [nodes])
  const completed = sorted.filter(n => n.completed).length
  const progress = sorted.length ? completed / sorted.length : 0

  const currentPhrase = useMemo(() => {
    const nextPending = sorted.find(n => !n.completed)
    const lastDone = [...sorted].reverse().find(n => n.completed)
    const key = nextPending?.label || lastDone?.label || ''
    return getPhrase(key)
  }, [sorted])

  // Canvas resize observer
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ro = new ResizeObserver(() => {
      const rect = canvas.parentElement!.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      canvas.style.width = rect.width + 'px'
      canvas.style.height = rect.height + 'px'
    })
    ro.observe(canvas.parentElement!)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const dpr = window.devicePixelRatio || 1
    let t0 = 0

    const draw = (t: number) => {
      if (!t0) t0 = t
      const elapsed = t - t0
      const W = canvas.width / dpr
      const H = canvas.height / dpr

      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.save()
      ctx.scale(dpr, dpr)

      const mx = mouseRef.current.x
      const my = mouseRef.current.y
      const hasMouse = mx >= 0

      // Layout — line sits in the LOWER 60% of the canvas
      // Upper area is reserved for the phrase text
      const PAD = 40
      const LINE_Y = H * 0.68        // line position — lower band
      const LABEL_Y = LINE_Y + 22    // labels below the line
      const USABLE = W - PAD * 2
      const N = Math.max(sorted.length, 1)
      const spacing = N > 1 ? USABLE / (N - 1) : 0

      // ── Main spine line ─────────────────────────────
      ctx.beginPath()
      ctx.moveTo(PAD, LINE_Y)
      ctx.lineTo(PAD + USABLE, LINE_Y)
      ctx.strokeStyle = 'rgba(255,255,255,0.07)'
      ctx.lineWidth = 1
      ctx.stroke()

      // Completed portion
      if (progress > 0 && N > 1) {
        ctx.beginPath()
        ctx.moveTo(PAD, LINE_Y)
        ctx.lineTo(PAD + progress * USABLE, LINE_Y)
        ctx.strokeStyle = 'rgba(92,140,92,0.4)'
        ctx.lineWidth = 1
        ctx.stroke()
      }

      // ── Node dots + labels (ALL nodes labeled) ──────
      for (let i = 0; i < N; i++) {
        const node = sorted[i]
        if (!node) continue
        const baseX = N > 1 ? PAD + i * spacing : PAD + USABLE / 2
        const isDone = i < completed
        const isCurrent = i === completed && i < N

        // Subtle float + mouse
        const floatY = Math.sin(elapsed * 0.0005 + i * 0.9) * 2
        let offsetY = 0
        if (hasMouse) {
          const proximity = Math.max(0, 1 - Math.abs(baseX - mx) / 160)
          offsetY = (my - LINE_Y) * proximity * 0.06
        }
        const x = baseX
        const y = LINE_Y + floatY + offsetY

        // Current node glow ring
        if (isCurrent) {
          ctx.beginPath()
          ctx.arc(x, y, 9, 0, Math.PI * 2)
          ctx.strokeStyle = `rgba(92,140,92,${0.15 + 0.08 * Math.sin(elapsed * 0.003)})`
          ctx.lineWidth = 1
          ctx.stroke()
        }

        // Node dot
        const r = isDone ? 4 : isCurrent ? 3.5 : 2.5
        ctx.beginPath()
        ctx.arc(x, y, r, 0, Math.PI * 2)
        ctx.fillStyle = isDone ? 'rgba(92,140,92,0.85)' : isCurrent ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.18)'
        ctx.fill()
        if (isDone) {
          ctx.beginPath()
          ctx.arc(x, y, 1.5, 0, Math.PI * 2)
          ctx.fillStyle = 'rgba(255,255,255,0.45)'
          ctx.fill()
        }

        // ── LABEL for every node ─────────────────────
        // Alternate above/below to prevent overlap on dense timelines
        const labelAbove = i % 2 === 0
        const labelY = labelAbove ? LINE_Y - 10 : LABEL_Y
        const maxLabelWidth = Math.max(spacing * 0.85, 40)

        ctx.save()
        ctx.font = `${N > 10 ? 7 : 8}px "DM Mono", monospace`
        ctx.fillStyle = isDone
          ? 'rgba(92,140,92,0.55)'
          : isCurrent
          ? 'rgba(255,255,255,0.6)'
          : 'rgba(255,255,255,0.2)'
        ctx.textAlign = i === 0 ? 'left' : i === N - 1 ? 'right' : 'center'

        // Truncate long labels
        let label = node.label.toUpperCase()
        const measured = ctx.measureText(label).width
        if (measured > maxLabelWidth && label.length > 4) {
          while (ctx.measureText(label + '…').width > maxLabelWidth && label.length > 2) {
            label = label.slice(0, -1)
          }
          label = label + '…'
        }

        ctx.fillText(label, x, labelY)
        ctx.restore()

        // Connector tick between node and label
        if (N <= 12) {
          ctx.beginPath()
          ctx.moveTo(x, labelAbove ? LINE_Y - 5 : LINE_Y + 5)
          ctx.lineTo(x, labelAbove ? LINE_Y - 8 : LINE_Y + 8)
          ctx.strokeStyle = isDone ? 'rgba(92,140,92,0.3)' : 'rgba(255,255,255,0.08)'
          ctx.lineWidth = 0.5
          ctx.stroke()
        }
      }

      ctx.restore()
      rafRef.current = requestAnimationFrame(draw)
    }

    rafRef.current = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(rafRef.current)
  }, [sorted, completed, progress])

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  return (
    // Height increased so phrase has room above the line
    <div style={{ width: '100%', height: 90, position: 'relative' }}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => { mouseRef.current = { x: -1, y: -1 } }}>
      <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, display: 'block' }} />

      {/* Phrase — sits in the TOP THIRD, well above the line */}
      <motion.div
        key={currentPhrase}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, ease: 'easeInOut' }}
        style={{
          position: 'absolute',
          top: 10,            // upper area — clear of the line at 68% height
          left: 0, right: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
        }}
      >
        <span style={{
          fontFamily: '"DM Mono", monospace',
          fontSize: 9,
          letterSpacing: '0.16em',
          color: 'rgba(255,255,255,0.22)',
          textTransform: 'uppercase',
        }}>
          {currentPhrase}
        </span>
      </motion.div>
    </div>
  )
}
