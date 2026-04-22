import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Save, Eye, Edit2 } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Project } from '../../types'
import { useAppStore } from '../../store/appStore'

export default function NotesSection({ project }: { project: Project }) {
  const updateProject = useAppStore(s => s.updateProject)
  const [content, setContent] = useState(project.notes || '')
  const [mode, setMode] = useState<'edit' | 'preview'>('edit')
  const [saved, setSaved] = useState(true)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setContent(project.notes || '')
  }, [project.id])

  const handleChange = (val: string) => {
    setContent(val)
    setSaved(false)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      updateProject(project.id, { notes: val })
      setSaved(true)
    }, 600)
  }

  const handleSave = () => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    updateProject(project.id, { notes: content })
    setSaved(true)
  }

  return (
    <div style={{
      height: '100%', display: 'flex', flexDirection: 'column',
      overflow: 'hidden', padding: '24px 32px',
      background: 'var(--bg-base)',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexShrink: 0 }}>
        <div>
          <p style={{ fontSize: 10, color: 'var(--fg-muted)', fontFamily: 'DM Mono, monospace', letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 6 }}>Production</p>
          <h2 style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: 38, color: 'var(--fg-primary)', fontWeight: 400, letterSpacing: '-0.02em', lineHeight: 1 }}>Notes</h2>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <motion.span key={saved ? 'saved' : 'unsaved'} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{ fontSize: 10, fontFamily: 'DM Mono, monospace', color: 'var(--fg-subtle)' }}>
            {saved ? '✓ Saved' : 'Saving…'}
          </motion.span>

          {/* Mode toggle */}
          <div style={{ display: 'flex', borderRadius: 4, overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
            {(['edit', 'preview'] as const).map(m => (
              <button key={m} onClick={() => setMode(m)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  height: 28, padding: '0 12px', fontSize: 11, cursor: 'pointer',
                  background: mode === m ? 'var(--bg-elevated)' : 'transparent',
                  border: 'none',
                  color: mode === m ? 'var(--fg-primary)' : 'var(--fg-muted)',
                  transition: 'all 0.15s ease',
                }}>
                {m === 'edit' ? <Edit2 size={11} /> : <Eye size={11} />}
                {m === 'edit' ? 'Edit' : 'Preview'}
              </button>
            ))}
          </div>

          <button onClick={handleSave}
            style={{ display: 'flex', alignItems: 'center', gap: 5, height: 28, padding: '0 12px', borderRadius: 4, border: '1px solid var(--border-subtle)', fontSize: 11, color: 'var(--fg-muted)', background: 'transparent', cursor: 'pointer' }}>
            <Save size={11} /> Save
          </button>
        </div>
      </div>

      {/* Editor / Preview */}
      <div style={{
        flex: 1, overflow: 'hidden', borderRadius: 6, position: 'relative',
        border: '1px solid var(--border-subtle)',
        background: 'var(--bg-surface)',
        // Force background — overrides any Tailwind or browser defaults
      }}>
        {mode === 'edit' ? (
          <textarea
            value={content}
            onChange={e => handleChange(e.target.value)}
            placeholder={`# Project Notes\n\nWrite anything here…\n\n- Client feedback\n- Technical notes\n- Reminders\n- Delivery tasks\n\nSupports **Markdown** formatting.`}
            spellCheck={false}
            style={{
              // ✓ FIX: explicit inline styles override any conflicting CSS
              width: '100%',
              height: '100%',
              padding: '24px',
              background: 'var(--bg-surface)',          // matches container
              color: 'var(--fg-secondary)',              // readable dark text in dark mode
              caretColor: 'var(--fg-primary)',
              fontSize: 14,
              lineHeight: 1.8,
              fontFamily: '"DM Mono", monospace',
              border: 'none',
              outline: 'none',
              resize: 'none',
              display: 'block',
              boxSizing: 'border-box',
            }}
          />
        ) : (
          <div style={{ height: '100%', overflowY: 'auto', padding: '24px' }}>
            {content ? (
              <div className="markdown-preview">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
              </div>
            ) : (
              <p style={{ fontSize: 13, color: 'var(--fg-subtle)', fontStyle: 'italic' }}>
                No notes yet. Switch to Edit mode to start writing.
              </p>
            )}
          </div>
        )}

        {/* Bottom fade — same bg as container */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: 32,
          background: 'linear-gradient(to top, var(--bg-surface), transparent)',
          pointerEvents: 'none',
        }} />
      </div>

      {/* Markdown hints */}
      {mode === 'edit' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 8, flexShrink: 0 }}>
          <span style={{ fontSize: 10, color: 'var(--fg-subtle)', fontFamily: 'DM Mono, monospace' }}>Markdown supported</span>
          {['# Heading', '**bold**', '*italic*', '- list', '`code`'].map(hint => (
            <span key={hint} style={{ fontSize: 10, color: 'var(--fg-subtle)', fontFamily: 'DM Mono, monospace', opacity: 0.5 }}>{hint}</span>
          ))}
        </div>
      )}

      {/* Markdown preview styles */}
      <style>{`
        .markdown-preview h1 { font-family: 'Cormorant Garamond', serif; font-size: 1.875rem; color: var(--fg-primary); letter-spacing: -0.02em; margin: 0 0 0.75rem; font-weight: 400; }
        .markdown-preview h2 { font-family: 'Cormorant Garamond', serif; font-size: 1.5rem; color: var(--fg-primary); margin: 1.5rem 0 0.5rem; font-weight: 400; }
        .markdown-preview h3 { font-size: 0.75rem; color: var(--fg-muted); text-transform: uppercase; letter-spacing: 0.08em; font-family: 'DM Mono', monospace; margin: 1rem 0 0.5rem; }
        .markdown-preview p { color: var(--fg-secondary); line-height: 1.8; margin-bottom: 0.75rem; font-size: 0.9375rem; }
        .markdown-preview ul, .markdown-preview ol { color: var(--fg-secondary); padding-left: 1.5rem; margin-bottom: 0.75rem; }
        .markdown-preview li { line-height: 1.8; margin-bottom: 0.25rem; }
        .markdown-preview strong { color: var(--fg-primary); font-weight: 500; }
        .markdown-preview em { color: var(--fg-secondary); }
        .markdown-preview code { font-family: 'DM Mono', monospace; font-size: 0.8125rem; background: var(--bg-elevated); border: 1px solid var(--border-subtle); padding: 0 4px; border-radius: 2px; color: var(--accent-green); }
        .markdown-preview pre { background: var(--bg-elevated); border: 1px solid var(--border-subtle); border-radius: 4px; padding: 1rem; margin-bottom: 0.75rem; overflow-x: auto; }
        .markdown-preview pre code { background: none; border: none; padding: 0; }
        .markdown-preview hr { border: none; border-top: 1px solid var(--border-subtle); margin: 1.5rem 0; }
        .markdown-preview blockquote { border-left: 2px solid var(--accent-green-dim); padding-left: 1rem; color: var(--fg-muted); font-style: italic; margin: 0 0 0.75rem; }
        .markdown-preview a { color: var(--accent-green); text-decoration: none; }
        .markdown-preview a:hover { text-decoration: underline; }
      `}</style>
    </div>
  )
}
