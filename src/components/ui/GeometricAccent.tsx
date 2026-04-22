import { motion } from 'framer-motion'

interface GeometricAccentProps {
  size?: number
  variant?: 'circles' | 'orbit' | 'node' | 'sphere'
  animated?: boolean
  className?: string
  opacity?: number
}

export default function GeometricAccent({ 
  size = 40, 
  variant = 'circles',
  animated = false,
  className = '',
  opacity = 1,
}: GeometricAccentProps) {
  const strokeColor = 'rgba(255,255,255,0.35)'
  const strokeWidth = '0.5'

  const renderVariant = () => {
    switch (variant) {
      case 'circles':
        return (
          <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
            <circle cx="20" cy="20" r="18" stroke={strokeColor} strokeWidth={strokeWidth} />
            <circle cx="14" cy="20" r="8" stroke={strokeColor} strokeWidth={strokeWidth} />
            <circle cx="26" cy="20" r="8" stroke={strokeColor} strokeWidth={strokeWidth} />
            <circle cx="20" cy="14" r="8" stroke={strokeColor} strokeWidth={strokeWidth} />
            <circle cx="20" cy="20" r="3" stroke={strokeColor} strokeWidth={strokeWidth} />
            <circle cx="14" cy="20" r="1" fill={strokeColor} />
            <circle cx="26" cy="20" r="1" fill={strokeColor} />
            <circle cx="20" cy="14" r="1" fill={strokeColor} />
          </svg>
        )

      case 'orbit':
        return (
          <svg width={size} height={size} viewBox="0 0 60 60" fill="none">
            <circle cx="30" cy="30" r="28" stroke={strokeColor} strokeWidth={strokeWidth} />
            <circle cx="30" cy="30" r="18" stroke={strokeColor} strokeWidth={strokeWidth} />
            <circle cx="30" cy="30" r="10" stroke={strokeColor} strokeWidth={strokeWidth} />
            <circle cx="30" cy="30" r="3" stroke={strokeColor} strokeWidth={strokeWidth} />
            <circle cx="30" cy="2" r="2" fill={strokeColor} />
            <circle cx="58" cy="30" r="2" fill={strokeColor} />
            <circle cx="30" cy="58" r="2" fill={strokeColor} />
            <circle cx="2" cy="30" r="2" fill={strokeColor} />
            {/* Cross lines */}
            <line x1="30" y1="0" x2="30" y2="60" stroke={strokeColor} strokeWidth="0.3" strokeDasharray="2 4" />
            <line x1="0" y1="30" x2="60" y2="30" stroke={strokeColor} strokeWidth="0.3" strokeDasharray="2 4" />
          </svg>
        )

      case 'node':
        return (
          <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
            <circle cx="16" cy="16" r="14" stroke={strokeColor} strokeWidth={strokeWidth} />
            <circle cx="16" cy="16" r="6" stroke={strokeColor} strokeWidth={strokeWidth} />
            <circle cx="16" cy="16" r="2" fill={strokeColor} />
            <circle cx="16" cy="2" r="1.5" stroke={strokeColor} strokeWidth={strokeWidth} />
            <circle cx="30" cy="16" r="1.5" stroke={strokeColor} strokeWidth={strokeWidth} />
            <circle cx="16" cy="30" r="1.5" stroke={strokeColor} strokeWidth={strokeWidth} />
            <circle cx="2" cy="16" r="1.5" stroke={strokeColor} strokeWidth={strokeWidth} />
            <line x1="16" y1="4" x2="16" y2="10" stroke={strokeColor} strokeWidth="0.5" />
            <line x1="28" y1="16" x2="22" y2="16" stroke={strokeColor} strokeWidth="0.5" />
            <line x1="16" y1="28" x2="16" y2="22" stroke={strokeColor} strokeWidth="0.5" />
            <line x1="4" y1="16" x2="10" y2="16" stroke={strokeColor} strokeWidth="0.5" />
          </svg>
        )

      case 'sphere':
        return (
          <svg width={size} height={size} viewBox="0 0 60 60" fill="none">
            {/* Sphere grid */}
            <circle cx="30" cy="30" r="28" stroke={strokeColor} strokeWidth={strokeWidth} />
            {/* Latitude lines */}
            {[20, 30, 40, 50, 15, 45].map((y, i) => {
              const dy = Math.abs(y - 30)
              const rx = Math.sqrt(28*28 - dy*dy)
              return (
                <ellipse key={i} cx="30" cy={y} rx={rx} ry={rx * 0.3} 
                  stroke={strokeColor} strokeWidth={strokeWidth} fill="none" />
              )
            })}
            {/* Longitude lines */}
            <ellipse cx="30" cy="30" rx="8" ry="28" stroke={strokeColor} strokeWidth={strokeWidth} fill="none" />
            <ellipse cx="30" cy="30" rx="22" ry="28" stroke={strokeColor} strokeWidth={strokeWidth} fill="none" />
          </svg>
        )

      default:
        return null
    }
  }

  return (
    <motion.div 
      className={`inline-flex items-center justify-center flex-shrink-0 ${className}`}
      style={{ opacity }}
      whileHover={animated ? { scale: 1.05, opacity: 1 } : undefined}
    >
      {renderVariant()}
    </motion.div>
  )
}

// Large decorative background geometric
export function GeometricBackground({ className = '' }: { className?: string }) {
  return (
    <div className={`absolute pointer-events-none select-none ${className}`}>
      <svg width="500" height="500" viewBox="0 0 500 500" fill="none" opacity="0.04">
        <circle cx="250" cy="250" r="240" stroke="white" strokeWidth="0.5" />
        <circle cx="250" cy="250" r="180" stroke="white" strokeWidth="0.5" />
        <circle cx="250" cy="250" r="120" stroke="white" strokeWidth="0.5" />
        <circle cx="250" cy="250" r="60" stroke="white" strokeWidth="0.5" />
        <circle cx="250" cy="250" r="20" stroke="white" strokeWidth="0.5" />
        <line x1="250" y1="10" x2="250" y2="490" stroke="white" strokeWidth="0.3" strokeDasharray="4 8" />
        <line x1="10" y1="250" x2="490" y2="250" stroke="white" strokeWidth="0.3" strokeDasharray="4 8" />
        <line x1="80" y1="80" x2="420" y2="420" stroke="white" strokeWidth="0.3" strokeDasharray="4 8" />
        <line x1="420" y1="80" x2="80" y2="420" stroke="white" strokeWidth="0.3" strokeDasharray="4 8" />
        <circle cx="250" cy="10" r="3" fill="white" />
        <circle cx="490" cy="250" r="3" fill="white" />
        <circle cx="250" cy="490" r="3" fill="white" />
        <circle cx="10" cy="250" r="3" fill="white" />
      </svg>
    </div>
  )
}

// Empty state geometric illustration
export function EmptyStateGeometric() {
  return (
    <div className="flex flex-col items-center gap-6 py-16">
      <div className="relative">
        <svg width="120" height="120" viewBox="0 0 120 120" fill="none" opacity="0.3">
          <circle cx="60" cy="60" r="55" stroke="white" strokeWidth="0.8" />
          <circle cx="60" cy="60" r="35" stroke="white" strokeWidth="0.8" />
          <circle cx="60" cy="60" r="15" stroke="white" strokeWidth="0.8" />
          <circle cx="60" cy="60" r="4" fill="white" opacity="0.6" />
          <circle cx="60" cy="5" r="2.5" fill="white" opacity="0.6" />
          <circle cx="115" cy="60" r="2.5" fill="white" opacity="0.6" />
          <circle cx="60" cy="115" r="2.5" fill="white" opacity="0.6" />
          <circle cx="5" cy="60" r="2.5" fill="white" opacity="0.6" />
          <line x1="60" y1="8" x2="60" y2="25" stroke="white" strokeWidth="0.6" opacity="0.4" />
          <line x1="112" y1="60" x2="95" y2="60" stroke="white" strokeWidth="0.6" opacity="0.4" />
          <line x1="60" y1="112" x2="60" y2="95" stroke="white" strokeWidth="0.6" opacity="0.4" />
          <line x1="8" y1="60" x2="25" y2="60" stroke="white" strokeWidth="0.6" opacity="0.4" />
        </svg>
      </div>
    </div>
  )
}
