import { ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { LayoutGrid, Settings, Plus, ChevronLeft } from 'lucide-react'
import Titlebar from './Titlebar'

interface AppShellProps {
  children: ReactNode
}

export default function AppShell({ children }: AppShellProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const isProjectDetail = location.pathname.startsWith('/project/') && location.pathname !== '/project/new'

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: 'var(--bg-base)' }}>
      <Titlebar />
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <nav
          className="w-14 flex flex-col items-center py-3 gap-0.5 flex-shrink-0 border-r"
          style={{ background: 'var(--bg-base)', borderColor: 'var(--border-subtle)' }}
        >
          <NavItem icon={<LayoutGrid size={15} />} label="Projects"
            active={location.pathname === '/'} onClick={() => navigate('/')} />
          <NavItem icon={<Plus size={15} />} label="New Project"
            active={location.pathname === '/project/new'} onClick={() => navigate('/project/new')} />
          {isProjectDetail && (
            <>
              <div className="w-8 my-2" style={{ height: 1, background: 'var(--border-subtle)' }} />
              <NavItem icon={<ChevronLeft size={15} />} label="Back"
                active={false} onClick={() => navigate('/')} />
            </>
          )}
          <div className="flex-1" />
          <NavItem icon={<Settings size={15} />} label="Settings"
            active={location.pathname === '/settings'} onClick={() => navigate('/settings')} />
        </nav>

        <main className="flex-1 overflow-hidden relative" style={{ background: 'var(--bg-base)' }}>
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="h-full"
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  )
}

function NavItem({ icon, label, active, onClick }: {
  icon: ReactNode; label: string; active: boolean; onClick: () => void
}) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      title={label}
      className="relative w-10 h-10 flex items-center justify-center rounded transition-colors duration-150"
      style={{
        color: active ? 'var(--fg-primary)' : 'var(--fg-muted)',
        background: active ? 'var(--bg-elevated)' : 'transparent',
      }}
      onMouseEnter={e => {
        if (!active) (e.currentTarget as HTMLElement).style.color = 'var(--fg-secondary)'
        if (!active) (e.currentTarget as HTMLElement).style.background = 'var(--bg-surface)'
      }}
      onMouseLeave={e => {
        if (!active) (e.currentTarget as HTMLElement).style.color = 'var(--fg-muted)'
        if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'
      }}
    >
      {icon}
      {active && (
        <motion.div
          layoutId="nav-indicator"
          className="absolute left-0 top-1/2 -translate-y-1/2 rounded-r"
          style={{ width: 2, height: 16, background: 'var(--accent-green)' }}
        />
      )}
    </motion.button>
  )
}
