import { useState } from 'react'
import { AlertTriangle, FolderOpen, RefreshCw, X } from 'lucide-react'

interface MissingMediaProps {
  filename: string
  onRelink?: (newPath: string) => void
  onRemove?: () => void
  compact?: boolean
}

export default function MissingMedia({ filename, onRelink, onRemove, compact = false }: MissingMediaProps) {
  const [relinking, setRelinking] = useState(false)

  const handleRelink = async () => {
    if (!(window as any).electronAPI) return
    setRelinking(true)
    try {
      const ext = filename.split('.').pop()?.toLowerCase() || ''
      const imageExts = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'tiff', 'tif', 'bmp', 'exr']
      const videoExts = ['mp4', 'mov', 'webm', 'mkv', 'avi', 'mxf']
      const isImage = imageExts.includes(ext)
      const isVideo = videoExts.includes(ext)

      const result = await (window as any).electronAPI.openFile({
        properties: ['openFile'],
        filters: isImage
          ? [{ name: 'Images', extensions: imageExts }]
          : isVideo
          ? [{ name: 'Videos', extensions: videoExts }]
          : [{ name: 'All Files', extensions: ['*'] }],
      })

      if (!result.canceled && result.filePaths?.[0]) {
        onRelink?.(result.filePaths[0])
      }
    } finally {
      setRelinking(false)
    }
  }

  if (compact) {
    return (
      <div style={{
        width: '100%', height: '100%',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: 'var(--bg-elevated)',
        gap: 6,
      }}>
        <AlertTriangle size={16} style={{ color: 'var(--fg-subtle)' }} />
        <span style={{ fontSize: 9, fontFamily: 'DM Mono, monospace', color: 'var(--fg-subtle)', textAlign: 'center', padding: '0 8px' }}>
          File not found
        </span>
        {onRelink && (
          <button
            onClick={e => { e.stopPropagation(); handleRelink() }}
            disabled={relinking}
            style={{ fontSize: 9, padding: '2px 8px', borderRadius: 3, background: 'transparent', border: '1px solid var(--border-subtle)', color: 'var(--fg-muted)', cursor: 'pointer', fontFamily: 'DM Mono, monospace' }}>
            {relinking ? '…' : 'Relink'}
          </button>
        )}
      </div>
    )
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: 10, padding: 24,
      background: 'var(--bg-elevated)',
      border: '1px dashed var(--border-default)',
      borderRadius: 6,
      width: '100%', height: '100%',
    }}>
      <div style={{ width: 36, height: 36, borderRadius: '50%', border: '1px solid var(--border-default)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--fg-subtle)' }}>
        <AlertTriangle size={16} />
      </div>
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: 12, color: 'var(--fg-secondary)', marginBottom: 4 }}>File not found</p>
        <p style={{ fontSize: 10, fontFamily: 'DM Mono, monospace', color: 'var(--fg-subtle)', wordBreak: 'break-all', maxWidth: 200 }}>{filename}</p>
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        {onRelink && (
          <button onClick={handleRelink} disabled={relinking}
            style={{ display: 'flex', alignItems: 'center', gap: 5, height: 26, padding: '0 10px', borderRadius: 4, border: '1px solid var(--border-default)', fontSize: 11, color: 'var(--fg-muted)', background: 'transparent', cursor: 'pointer' }}>
            <RefreshCw size={10} /> {relinking ? 'Choosing…' : 'Relink'}
          </button>
        )}
        {onRemove && (
          <button onClick={onRemove}
            style={{ display: 'flex', alignItems: 'center', gap: 5, height: 26, padding: '0 10px', borderRadius: 4, border: '1px solid rgba(154,48,48,0.4)', fontSize: 11, color: '#d07070', background: 'transparent', cursor: 'pointer' }}>
            <X size={10} /> Remove
          </button>
        )}
      </div>
    </div>
  )
}
