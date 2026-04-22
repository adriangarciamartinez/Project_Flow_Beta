interface ProgressRingProps {
  progress: number // 0-100
  size?: number
  strokeWidth?: number
  showLabel?: boolean
}

export default function ProgressRing({ 
  progress, 
  size = 32, 
  strokeWidth = 1.5,
  showLabel = false,
}: ProgressRingProps) {
  const r = (size - strokeWidth * 2) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (progress / 100) * circ
  const cx = size / 2
  const cy = size / 2

  return (
    <div className="relative inline-flex items-center justify-center flex-shrink-0">
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        {/* Track */}
        <circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={strokeWidth}
        />
        {/* Progress */}
        <circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke={progress === 100 ? 'var(--accent-green)' : progress > 0 ? 'var(--accent-green-dim)' : 'transparent'}
          strokeWidth={strokeWidth}
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.6s cubic-bezier(0.16,1,0.3,1)' }}
        />
      </svg>
      {showLabel && (
        <span className="absolute text-2xs font-mono text-fg-muted" style={{ fontSize: '9px' }}>
          {Math.round(progress)}
        </span>
      )}
    </div>
  )
}
