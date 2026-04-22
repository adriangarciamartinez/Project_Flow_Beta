import { motion } from 'framer-motion'
import { Minus, Square, X } from 'lucide-react'

export default function Titlebar() {
  const api = (window as any).electronAPI

  return (
    <div
      className="titlebar-drag h-10 flex items-center justify-between flex-shrink-0"
      style={{
        background: 'var(--bg-base)',
        borderBottom: '1px solid var(--border-subtle)',
        position: 'relative',
        zIndex: 50,
      }}
    >
      {/* App name */}
      <div className="no-drag flex items-center gap-2 px-4">
        {/* Minimal geometric dot mark */}
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <circle cx="6" cy="6" r="5" stroke="var(--border-bright)" strokeWidth="0.8" />
          <circle cx="6" cy="6" r="2" fill="var(--accent-green)" opacity="0.7" />
        </svg>
        <span style={{ fontFamily: '"DM Mono", monospace', fontSize: 10, color: 'var(--fg-subtle)', letterSpacing: '0.18em' }}>
          PROJECT FLOW
        </span>
      </div>

      {/* Window controls */}
      <div className="no-drag flex items-center h-full">
        <WinButton onClick={() => api?.minimize()} title="Minimize" hoverBg="var(--bg-elevated)">
          <Minus size={10} strokeWidth={1.5} />
        </WinButton>
        <WinButton onClick={() => api?.maximize()} title="Maximize" hoverBg="var(--bg-elevated)">
          <Square size={9} strokeWidth={1.5} />
        </WinButton>
        <WinButton onClick={() => api?.close()} title="Close" hoverBg="rgba(180,50,50,0.3)">
          <X size={10} strokeWidth={1.5} />
        </WinButton>
      </div>
    </div>
  )
}

function WinButton({ children, onClick, title, hoverBg }: {
  children: React.ReactNode; onClick?: () => void; title?: string; hoverBg: string
}) {
  return (
    <motion.button
      onClick={onClick} title={title}
      whileTap={{ scale: 0.9 }}
      className="w-11 h-10 flex items-center justify-center transition-colors duration-100"
      style={{ color: 'var(--fg-muted)' }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = hoverBg; (e.currentTarget as HTMLElement).style.color = 'var(--fg-primary)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--fg-muted)' }}
    >
      {children}
    </motion.button>
  )
}
