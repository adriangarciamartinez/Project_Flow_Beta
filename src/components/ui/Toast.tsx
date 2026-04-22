import { create } from 'zustand'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react'

type ToastType = 'success' | 'error' | 'info'

interface Toast { id: string; message: string; type: ToastType }

interface ToastStore {
  toasts: Toast[]
  add: (message: string, type?: ToastType) => void
  remove: (id: string) => void
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  add: (message, type = 'info') => {
    const id = Math.random().toString(36).slice(2)
    set(s => ({ toasts: [...s.toasts, { id, message, type }] }))
    setTimeout(() => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })), 3500)
  },
  remove: (id) => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })),
}))

export const toast = {
  success: (msg: string) => useToastStore.getState().add(msg, 'success'),
  error: (msg: string) => useToastStore.getState().add(msg, 'error'),
  info: (msg: string) => useToastStore.getState().add(msg, 'info'),
}

const ICONS: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle size={13} style={{ color: 'var(--accent-green)', flexShrink: 0 }} />,
  error: <AlertCircle size={13} style={{ color: '#d07070', flexShrink: 0 }} />,
  info: <Info size={13} style={{ color: 'var(--fg-muted)', flexShrink: 0 }} />,
}

export function ToastContainer() {
  const { toasts, remove } = useToastStore()
  return (
    <div style={{ position: 'fixed', bottom: 20, right: 20, zIndex: 100, display: 'flex', flexDirection: 'column', gap: 8, pointerEvents: 'none' }}>
      <AnimatePresence>
        {toasts.map(t => (
          <motion.div key={t.id}
            initial={{ opacity: 0, y: 10, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.96 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            style={{
              pointerEvents: 'all',
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 14px', borderRadius: 6,
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-emphasis)',
              boxShadow: 'var(--shadow-modal)',
              maxWidth: 320,
            }}>
            {ICONS[t.type]}
            <span style={{ fontSize: 12, color: 'var(--fg-secondary)', flex: 1 }}>{t.message}</span>
            <button onClick={() => remove(t.id)}
              style={{ color: 'var(--fg-subtle)', background: 'none', border: 'none', cursor: 'pointer', padding: 2, flexShrink: 0 }}>
              <X size={11} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
