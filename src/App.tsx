import { useEffect } from 'react'
import { HashRouter, Routes, Route } from 'react-router-dom'
import { useAppStore } from './store/appStore'
import { useThemeStore } from './store/themeStore'
import AppShell from './components/layout/AppShell'
import HomePage from './pages/HomePage'
import ProjectDetailPage from './pages/ProjectDetailPage'
import SettingsPage from './pages/SettingsPage'
import NewProjectPage from './pages/NewProjectPage'
import { ToastContainer } from './components/ui/Toast'
import { backupSystem } from './utils/mediaPersistence'

export default function App() {
  const loadProjects = useAppStore(s => s.loadProjects)
  const loadSettings = useAppStore(s => s.loadSettings)
  const { crystalBg } = useThemeStore()

  useEffect(() => {
    loadProjects()
    loadSettings()

    // ── Backup system ───────────────────────────────
    // Backup on startup (captures previous session's final state)
    backupSystem.createBackup('startup')

    // Periodic backup every 5 minutes
    const stopPeriodicBackup = backupSystem.startPeriodicBackup(5 * 60 * 1000)

    // Backup on window close / unload
    const handleBeforeUnload = () => backupSystem.createBackup('close')
    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      stopPeriodicBackup()
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [loadProjects, loadSettings])

  return (
    <HashRouter>
      {/* Crystal background layer */}
      <div id="crystal-bg">
        {crystalBg ? (
          <img src={crystalBg} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'saturate(0.7) brightness(0.6)' }} />
        ) : (
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, #0a0a18 0%, #0d1a0d 40%, #0a0a14 100%)' }} />
        )}
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 30% 50%, rgba(92,140,92,0.08) 0%, transparent 60%)' }} />
      </div>

      <AppShell>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/project/new" element={<NewProjectPage />} />
          <Route path="/project/:id" element={<ProjectDetailPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </AppShell>
      <ToastContainer />
    </HashRouter>
  )
}
