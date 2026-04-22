import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, Image, X } from 'lucide-react'
import { LocalImage } from './LocalMedia'

interface ImageDropzoneProps {
  value: string | null
  onChange: (dataUrl: string | null) => void
  label?: string
  className?: string
}

export default function ImageDropzone({ value, onChange, label, className = '' }: ImageDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false)

  const onDrop = useCallback((files: File[]) => {
    const file = files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = e => onChange(e.target?.result as string)
    reader.readAsDataURL(file)
    setIsDragging(false)
  }, [onChange])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { 'image/*': [] }, multiple: false,
    onDragEnter: () => setIsDragging(true),
    onDragLeave: () => setIsDragging(false),
  })

  return (
    <div className={className} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {label && (
        <label style={{ fontSize: 11, color: 'var(--fg-muted)', fontFamily: 'DM Mono, monospace', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
          {label}
        </label>
      )}
      <div
        {...getRootProps()}
        style={{
          borderRadius: 6,
          border: `1px solid ${isDragActive || isDragging ? 'var(--accent-green-dim)' : 'var(--border-default)'}`,
          background: isDragActive ? 'var(--accent-green-ghost)' : 'var(--bg-surface)',
          overflow: 'hidden',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          aspectRatio: '16/7',
          position: 'relative',
        }}
      >
        <input {...getInputProps()} />
        <AnimatePresence mode="wait">
          {value ? (
            <motion.div key="img" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'absolute', inset: 0 }}>
              <LocalImage src={value} alt="Cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', opacity: 0, transition: 'opacity 0.2s' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.opacity = '1'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.opacity = '0'}>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)' }}>Click to change</span>
                </div>
              </div>
              <button type="button"
                onClick={e => { e.stopPropagation(); onChange(null) }}
                style={{
                  position: 'absolute', top: 8, right: 8, width: 24, height: 24,
                  borderRadius: '50%', background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'rgba(255,255,255,0.8)', cursor: 'pointer',
                }}>
                <X size={12} />
              </button>
            </motion.div>
          ) : (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <div style={{ color: isDragActive ? 'var(--accent-green)' : 'var(--fg-subtle)' }}>
                {isDragActive ? <Upload size={18} /> : <Image size={18} />}
              </div>
              <span style={{ fontSize: 12, color: 'var(--fg-subtle)', textAlign: 'center' }}>
                {isDragActive ? 'Drop image here' : 'Drag & drop or click to add cover image'}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
