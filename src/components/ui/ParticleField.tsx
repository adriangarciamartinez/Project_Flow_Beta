import { useRef, useEffect, useCallback } from 'react'

// Particle types — sparse, elegant, like the reference images
interface Dot {
  x: number; y: number
  vx: number; vy: number
  r: number
  opacity: number
  ring: boolean       // whether this dot also draws a ring
  ringR: number
  phase: number       // animation phase offset
}

interface LineSegment {
  // A thin line between two points, with a dot at one end
  x1: number; y1: number
  x2: number; y2: number
  opacity: number
  progress: number    // animation progress 0→1→0
  speed: number
}

interface ParticleFieldProps {
  progress: number    // 0-1, affects green vs white ratio
  width: number
  height: number
}

export default function ParticleField({ progress, width, height }: ParticleFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const mouseRef = useRef({ x: -1, y: -1 })
  const rafRef = useRef<number>(0)
  const stateRef = useRef<{ dots: Dot[]; lines: LineSegment[]; t0: number }>({
    dots: [], lines: [], t0: 0,
  })

  const init = useCallback(() => {
    const W = width, H = height

    // Very sparse dots — like reference image 5
    // Mix of small dots and occasional circle-rings
    const DOT_COUNT = Math.max(8, Math.floor((W * H) / 18000))

    const dots: Dot[] = Array.from({ length: DOT_COUNT }, () => {
      const ring = Math.random() < 0.18  // ~18% have rings
      return {
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.12,
        vy: (Math.random() - 0.5) * 0.08,
        r: ring ? 2.5 + Math.random() * 2 : 1 + Math.random() * 1.5,
        opacity: 0.2 + Math.random() * 0.5,
        ring,
        ringR: 8 + Math.random() * 14,
        phase: Math.random() * Math.PI * 2,
      }
    })

    // Sparse line segments — like reference image 6
    const LINE_COUNT = Math.max(3, Math.floor((W * H) / 35000))
    const lines: LineSegment[] = Array.from({ length: LINE_COUNT }, () => {
      const angle = (Math.random() - 0.5) * Math.PI * 0.5 + Math.PI * 0.25 // roughly diagonal
      const len = 30 + Math.random() * 60
      const x = Math.random() * W
      const y = Math.random() * H
      return {
        x1: x, y1: y,
        x2: x + Math.cos(angle) * len,
        y2: y + Math.sin(angle) * len,
        opacity: 0.12 + Math.random() * 0.12,
        progress: Math.random(),
        speed: 0.0003 + Math.random() * 0.0004,
      }
    })

    stateRef.current = { dots, lines, t0: 0 }
  }, [width, height])

  useEffect(() => {
    init()
  }, [init])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const { dots, lines } = stateRef.current
    const dpr = window.devicePixelRatio || 1

    const draw = (t: number) => {
      if (!stateRef.current.t0) stateRef.current.t0 = t
      const elapsed = t - stateRef.current.t0

      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.save()
      ctx.scale(dpr, dpr)

      const W = width, H = height
      const mx = mouseRef.current.x
      const my = mouseRef.current.y
      const hasMouse = mx >= 0

      // ── Draw line segments (ref image 6 style) ───────
      for (const line of lines) {
        line.progress += line.speed
        if (line.progress > 1) {
          // Respawn at new position
          const angle = (Math.random() - 0.5) * Math.PI * 0.5 + Math.PI * 0.25
          const len = 30 + Math.random() * 60
          const x = Math.random() * W, y = Math.random() * H
          line.x1 = x; line.y1 = y
          line.x2 = x + Math.cos(angle) * len
          line.y2 = y + Math.sin(angle) * len
          line.progress = 0
          line.opacity = 0.1 + Math.random() * 0.12
        }

        // Fade in → hold → fade out
        const p = line.progress
        const alpha = p < 0.2 ? p / 0.2 : p > 0.8 ? (1 - p) / 0.2 : 1
        const finalAlpha = line.opacity * alpha

        ctx.beginPath()
        ctx.moveTo(line.x1, line.y1)
        ctx.lineTo(line.x2, line.y2)
        ctx.strokeStyle = `rgba(255,255,255,${finalAlpha})`
        ctx.lineWidth = 0.5
        ctx.stroke()

        // Dot at end of line
        ctx.beginPath()
        ctx.arc(line.x2, line.y2, 1.5, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255,255,255,${finalAlpha * 1.5})`
        ctx.fill()
      }

      // ── Draw dots (ref image 5 style) ──────────────
      for (const dot of dots) {
        // Gentle drift
        dot.x += dot.vx
        dot.y += dot.vy

        // Wrap
        if (dot.x < -20) dot.x = W + 20
        if (dot.x > W + 20) dot.x = -20
        if (dot.y < -20) dot.y = H + 20
        if (dot.y > H + 20) dot.y = -20

        // Very gentle mouse repulsion — barely perceptible
        if (hasMouse) {
          const dx = dot.x - mx, dy = dot.y - my
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 100 && dist > 0) {
            const force = (1 - dist / 100) * 0.006
            dot.vx += (dx / dist) * force
            dot.vy += (dy / dist) * force
          }
        }

        // Speed limit
        const spd = Math.sqrt(dot.vx * dot.vx + dot.vy * dot.vy)
        if (spd > 0.25) { dot.vx *= 0.25 / spd; dot.vy *= 0.25 / spd }

        // Slow breathing opacity
        const breathe = 0.7 + 0.3 * Math.sin(elapsed * 0.0008 + dot.phase)
        const finalOpacity = dot.opacity * breathe

        // Color: green tint for completed fraction
        const isGreen = Math.random() < progress * 0.6
        const color = isGreen
          ? `rgba(92,140,92,${finalOpacity * 0.8})`
          : `rgba(255,255,255,${finalOpacity})`

        // Main dot
        ctx.beginPath()
        ctx.arc(dot.x, dot.y, dot.r, 0, Math.PI * 2)
        ctx.fillStyle = color
        ctx.fill()

        // Ring (like the larger circles in ref image 5)
        if (dot.ring) {
          const ringPulse = 0.6 + 0.4 * Math.sin(elapsed * 0.001 + dot.phase)
          ctx.beginPath()
          ctx.arc(dot.x, dot.y, dot.ringR, 0, Math.PI * 2)
          ctx.strokeStyle = isGreen
            ? `rgba(92,140,92,${finalOpacity * 0.25 * ringPulse})`
            : `rgba(255,255,255,${finalOpacity * 0.18 * ringPulse})`
          ctx.lineWidth = 0.7
          ctx.stroke()
        }
      }

      ctx.restore()
      rafRef.current = requestAnimationFrame(draw)
    }

    rafRef.current = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(rafRef.current)
  }, [width, height, progress])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }, [])

  const handleMouseLeave = useCallback(() => {
    mouseRef.current = { x: -1, y: -1 }
  }, [])

  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1

  return (
    <canvas
      ref={canvasRef}
      width={width * dpr}
      height={height * dpr}
      style={{ width, height, display: 'block' }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    />
  )
}
