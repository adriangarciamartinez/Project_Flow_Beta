import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Layers, ChevronDown, ExternalLink, Info, Eye } from 'lucide-react'
import { EXRMetadata, EXRPass } from '../../types'
import { PASS_COLORS, PASS_LABELS } from '../../utils/exrParser'

interface EXRViewerProps {
  filename: string
  filePath: string
  metadata?: EXRMetadata
  onOpenExternal?: () => void
}

export default function EXRViewer({ filename, filePath, metadata, onOpenExternal }: EXRViewerProps) {
  const [activePass, setActivePass] = useState<EXRPass | null>(
    metadata?.passes?.[0] ?? null
  )
  const [showMeta, setShowMeta] = useState(false)

  const passes = metadata?.passes ?? []

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--bg-void)' }}>
      {/* Preview area */}
      <div className="relative flex-1 flex items-center justify-center overflow-hidden">
        {/* EXR cannot be rendered natively in browser — show premium placeholder */}
        <EXRPreviewPlaceholder
          filename={filename}
          activePass={activePass}
          metadata={metadata}
          onOpenExternal={onOpenExternal}
        />
      </div>

      {/* Pass browser */}
      {passes.length > 0 && (
        <div className="flex-shrink-0 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
          {/* Pass header */}
          <div className="flex items-center gap-3 px-4 py-2.5">
            <Layers size={12} className="text-fg-muted" />
            <span className="text-xs font-mono text-fg-muted tracking-wide">
              {passes.length} PASS{passes.length !== 1 ? 'ES' : ''}
            </span>
            {metadata && (
              <span className="text-2xs font-mono text-fg-subtle ml-auto">
                {metadata.width} × {metadata.height} · {metadata.compression}
              </span>
            )}
          </div>

          {/* Pass chips scrollable row */}
          <div className="flex gap-1.5 px-4 pb-3 overflow-x-auto">
            {passes.map(pass => {
              const col = PASS_COLORS[pass.type]
              const isActive = activePass?.name === pass.name
              return (
                <motion.button
                  key={pass.name}
                  onClick={() => setActivePass(pass)}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-sm border flex-shrink-0 transition-all duration-150"
                  style={{
                    background: isActive ? col.bg : 'transparent',
                    borderColor: isActive ? col.dot + '60' : 'var(--border-subtle)',
                  }}
                >
                  <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: col.dot }} />
                  <span className="text-2xs font-mono whitespace-nowrap" style={{ color: isActive ? col.text : 'var(--fg-subtle)' }}>
                    {PASS_LABELS[pass.type]}
                  </span>
                  {pass.name !== pass.type && pass.name !== 'beauty' && (
                    <span className="text-2xs opacity-50 font-mono" style={{ color: col.text }}>
                      {pass.name}
                    </span>
                  )}
                  <span className="text-2xs opacity-40 font-mono" style={{ color: 'var(--fg-subtle)' }}>
                    {pass.channel}
                  </span>
                </motion.button>
              )
            })}
          </div>
        </div>
      )}

      {/* Metadata panel */}
      {metadata && Object.keys(metadata.rawHeader).length > 0 && (
        <div className="flex-shrink-0 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
          <button
            onClick={() => setShowMeta(v => !v)}
            className="flex items-center gap-2 w-full px-4 py-2 text-xs text-fg-subtle hover:text-fg-muted transition-colors"
          >
            <Info size={11} />
            <span className="font-mono">EXR Header</span>
            <ChevronDown size={11} className={`ml-auto transition-transform ${showMeta ? 'rotate-180' : ''}`} />
          </button>
          <AnimatePresence>
            {showMeta && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="px-4 pb-3 max-h-40 overflow-y-auto">
                  {Object.entries(metadata.rawHeader)
                    .filter(([k]) => k !== 'channels_raw')
                    .map(([key, val]) => (
                      <div key={key} className="flex gap-3 py-0.5">
                        <span className="text-2xs font-mono text-fg-subtle w-28 flex-shrink-0">{key}</span>
                        <span className="text-2xs font-mono text-fg-muted truncate">{val}</span>
                      </div>
                    ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}

/* ── EXR Preview Placeholder ── */
function EXRPreviewPlaceholder({ filename, activePass, metadata, onOpenExternal }: {
  filename: string
  activePass: EXRPass | null
  metadata?: EXRMetadata
  onOpenExternal?: () => void
}) {
  const col = activePass ? PASS_COLORS[activePass.type] : PASS_COLORS.beauty

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center gap-5 p-8">
      {/* Atmospheric background */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: `radial-gradient(ellipse at 50% 40%, ${col.dot}15 0%, transparent 70%)` }} />

      {/* EXR icon - geometric grid */}
      <svg width="80" height="80" viewBox="0 0 80 80" fill="none" opacity="0.35">
        <rect x="4" y="4" width="72" height="72" rx="4" stroke="white" strokeWidth="0.8" />
        <line x1="4" y1="22" x2="76" y2="22" stroke="white" strokeWidth="0.4" />
        <line x1="4" y1="40" x2="76" y2="40" stroke="white" strokeWidth="0.4" />
        <line x1="4" y1="58" x2="76" y2="58" stroke="white" strokeWidth="0.4" />
        <line x1="22" y1="4" x2="22" y2="76" stroke="white" strokeWidth="0.4" />
        <line x1="40" y1="4" x2="40" y2="76" stroke="white" strokeWidth="0.4" />
        <line x1="58" y1="4" x2="58" y2="76" stroke="white" strokeWidth="0.4" />
        {/* Active pass color indicator */}
        <rect x="22" y="22" width="18" height="18" fill={col.dot} opacity="0.6" />
        <rect x="40" y="22" width="18" height="18" fill={col.dot} opacity="0.3" />
        <rect x="22" y="40" width="18" height="18" fill={col.dot} opacity="0.2" />
      </svg>

      {/* File info */}
      <div className="text-center">
        <p className="text-sm font-mono text-fg-secondary truncate max-w-xs">{filename}</p>
        {metadata && (
          <p className="text-xs text-fg-muted mt-1">
            {metadata.width} × {metadata.height}px · {metadata.compression} compression
          </p>
        )}
      </div>

      {/* Active pass display */}
      {activePass && (
        <motion.div
          key={activePass.name}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center gap-2 px-3 py-2 rounded border"
          style={{ borderColor: col.dot + '40', background: col.bg }}
        >
          <div className="w-2 h-2 rounded-full" style={{ background: col.dot }} />
          <span className="text-xs font-mono" style={{ color: col.text }}>
            {PASS_LABELS[activePass.type]}
          </span>
          {activePass.name !== activePass.type && activePass.name !== 'beauty' && (
            <span className="text-xs font-mono opacity-60" style={{ color: col.text }}>
              · {activePass.name}
            </span>
          )}
          <span className="text-xs font-mono opacity-50" style={{ color: col.text }}>
            [{activePass.channel}]
          </span>
        </motion.div>
      )}

      {/* Open in external viewer CTA */}
      <div className="flex flex-col items-center gap-2 mt-2">
        <p className="text-xs text-fg-subtle text-center max-w-xs">
          EXR pixel data requires a native viewer for full quality display.
        </p>
        {onOpenExternal && (
          <motion.button
            onClick={onOpenExternal}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-2 h-8 px-4 rounded border text-xs transition-colors"
            style={{ borderColor: 'var(--border-emphasis)', color: 'var(--fg-secondary)', background: 'var(--bg-elevated)' }}
          >
            <ExternalLink size={11} />
            Open in System Viewer
          </motion.button>
        )}
      </div>
    </div>
  )
}
