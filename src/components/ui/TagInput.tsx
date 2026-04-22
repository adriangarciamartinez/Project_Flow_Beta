import { useState, KeyboardEvent } from 'react'
import { X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface TagInputProps {
  tags: string[]
  onChange: (tags: string[]) => void
  placeholder?: string
  label?: string
  suggestions?: string[]
}

export default function TagInput({ tags, onChange, placeholder = 'Add tag...', label, suggestions = [] }: TagInputProps) {
  const [input, setInput] = useState('')
  const [focused, setFocused] = useState(false)

  const addTag = (tag: string) => {
    const t = tag.trim()
    if (t && !tags.includes(t)) onChange([...tags, t])
    setInput('')
  }

  const removeTag = (i: number) => onChange(tags.filter((_, idx) => idx !== i))

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(input) }
    else if (e.key === 'Backspace' && !input && tags.length) removeTag(tags.length - 1)
  }

  const filtered = suggestions.filter(s => s.toLowerCase().includes(input.toLowerCase()) && !tags.includes(s))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {label && (
        <label style={{ fontSize: 11, color: 'var(--fg-muted)', fontFamily: 'DM Mono, monospace', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
          {label}
        </label>
      )}
      <div
        style={{
          minHeight: 36,
          padding: '6px 8px',
          borderRadius: 4,
          background: 'var(--bg-surface)',
          border: `1px solid ${focused ? 'var(--border-emphasis)' : 'var(--border-default)'}`,
          display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center',
          transition: 'border-color 0.15s ease',
        }}
      >
        <AnimatePresence>
          {tags.map((tag, i) => (
            <motion.span key={tag} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: '2px 8px', borderRadius: 3,
                background: 'var(--bg-overlay)', border: '1px solid var(--border-subtle)',
                fontSize: 12, color: 'var(--fg-secondary)',
              }}>
              {tag}
              <button type="button" onClick={() => removeTag(i)}
                style={{ color: 'var(--fg-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}>
                <X size={10} />
              </button>
            </motion.span>
          ))}
        </AnimatePresence>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          onFocus={() => setFocused(true)}
          onBlur={() => { setFocused(false); if (input.trim()) addTag(input) }}
          placeholder={tags.length === 0 ? placeholder : ''}
          style={{
            flex: 1, minWidth: 80, background: 'transparent',
            border: 'none', outline: 'none',
            fontSize: 13, color: 'var(--fg-primary)',
            fontFamily: 'DM Sans, sans-serif',
          }}
        />
      </div>
      {focused && input && filtered.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {filtered.slice(0, 8).map(s => (
            <button key={s} type="button"
              onMouseDown={e => { e.preventDefault(); addTag(s) }}
              style={{
                fontSize: 11, padding: '3px 8px', borderRadius: 3,
                border: '1px solid var(--border-subtle)', color: 'var(--fg-muted)',
                background: 'transparent', cursor: 'pointer',
              }}>
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
