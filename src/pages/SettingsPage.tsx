import { useState } from 'react'
import { motion } from 'framer-motion'
import { Download, Upload, RotateCcw, Sun, Moon, Gem } from 'lucide-react'
import { useAppStore } from '../store/appStore'
import { db } from '../db/database'
import Button from '../components/ui/Button'
import { useThemeStore, Theme } from '../store/themeStore'
import { backupSystem } from '../utils/mediaPersistence'

const THEMES: { id: Theme; label: string; desc: string; icon: React.ReactNode }[] = [
  { id: 'dark',    label: 'Dark',    desc: 'Near-black, graphite. Default.',         icon: <Moon size={14}/> },
  { id: 'light',   label: 'Light',   desc: 'Warm off-white. Editorial and clean.',   icon: <Sun size={14}/> },
  { id: 'crystal', label: 'Crystal', desc: 'Glass blur over a background image.',    icon: <Gem size={14}/> },
]

const row = (label: string, value: string) => (
  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, paddingBottom: 8, borderBottom: '1px solid var(--border-subtle)' }}>
    <span style={{ fontSize: 13, color: 'var(--fg-muted)' }}>{label}</span>
    <span style={{ fontSize: 12, color: 'var(--fg-secondary)', fontFamily: 'DM Mono, monospace' }}>{value}</span>
  </div>
)

export default function SettingsPage() {
  const settings = useAppStore(s => s.settings)
  const updateSettings = useAppStore(s => s.updateSettings)
  const { theme, crystalBg, setTheme, setCrystalBg } = useThemeStore()
  const [exportMsg, setExportMsg] = useState('')
  const [importMsg, setImportMsg] = useState('')
  const [backups, setBackups] = useState(() => backupSystem.getBackupSlots())
  const [restoreMsg, setRestoreMsg] = useState('')

  const handleExport = () => {
    const blob = new Blob([db.exportDatabase()], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `projectflow-backup-${new Date().toISOString().slice(0,10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    setExportMsg('Exported successfully')
    setTimeout(() => setExportMsg(''), 3000)
  }

  const handleImport = () => {
    const input = document.createElement('input')
    input.type = 'file'; input.accept = '.json'
    input.onchange = e => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = ev => {
        const ok = db.importDatabase(ev.target?.result as string)
        setImportMsg(ok ? 'Imported. Please restart.' : 'Import failed.')
        setTimeout(() => setImportMsg(''), 4000)
      }
      reader.readAsText(file)
    }
    input.click()
  }

  const handleCrystalBg = () => {
    const input = document.createElement('input')
    input.type = 'file'; input.accept = 'image/*'
    input.onchange = e => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = ev => setCrystalBg(ev.target?.result as string)
      reader.readAsDataURL(file)
    }
    input.click()
  }

  const sep = (label: string) => (
    <div style={{ marginBottom: 16 }}>
      <p style={{ fontSize: 10, color: 'var(--fg-muted)', fontFamily: 'DM Mono, monospace', letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 10 }}>{label}</p>
      <div style={{ height: 1, background: 'var(--border-subtle)' }} />
    </div>
  )

  const card = (children: React.ReactNode) => (
    <div style={{ padding: 16, borderRadius: 6, background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', marginBottom: 10 }}>
      {children}
    </div>
  )

  return (
    <div className="h-full overflow-y-auto" style={{ background: 'var(--bg-base)' }}>
      <div style={{ maxWidth: 520, margin: '0 auto', padding: '40px 32px 60px' }}>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} style={{ marginBottom: 36 }}>
          <p style={{ fontSize: 11, color: 'var(--fg-muted)', fontFamily: 'DM Mono, monospace', letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 8 }}>Configuration</p>
          <h1 style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: 42, color: 'var(--fg-primary)', fontWeight: 400, letterSpacing: '-0.02em', lineHeight: 1 }}>Settings</h1>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}
          style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>

          {/* Appearance */}
          <div>
            {sep('Appearance')}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {THEMES.map(t => (
                <button key={t.id} onClick={() => setTheme(t.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px',
                    borderRadius: 6, cursor: 'pointer', textAlign: 'left',
                    background: theme === t.id ? 'var(--bg-elevated)' : 'var(--bg-surface)',
                    border: `1px solid ${theme === t.id ? 'var(--border-emphasis)' : 'var(--border-subtle)'}`,
                    transition: 'all 0.15s ease',
                  }}>
                  <span style={{ color: theme === t.id ? 'var(--fg-primary)' : 'var(--fg-muted)', flexShrink: 0 }}>{t.icon}</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13, color: theme === t.id ? 'var(--fg-primary)' : 'var(--fg-secondary)', marginBottom: 2 }}>{t.label}</p>
                    <p style={{ fontSize: 11, color: 'var(--fg-muted)' }}>{t.desc}</p>
                  </div>
                  {theme === t.id && <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-green)', flexShrink: 0 }} />}
                </button>
              ))}
            </div>
            {theme === 'crystal' && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} style={{ marginTop: 12, overflow: 'hidden' }}>
                {card(
                  <>
                    <p style={{ fontSize: 13, color: 'var(--fg-secondary)', marginBottom: 4 }}>Crystal Background</p>
                    <p style={{ fontSize: 11, color: 'var(--fg-muted)', marginBottom: 12 }}>Image displayed behind the glass panels.</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Button variant="secondary" size="sm" onClick={handleCrystalBg}>
                        {crystalBg ? 'Change image' : 'Choose image'}
                      </Button>
                      {crystalBg && <button onClick={() => setCrystalBg(null)} style={{ fontSize: 11, color: 'var(--fg-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>Remove</button>}
                    </div>
                    {crystalBg && <div style={{ marginTop: 10, borderRadius: 4, overflow: 'hidden', height: 48, border: '1px solid var(--border-subtle)' }}><img src={crystalBg} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.6 }} /></div>}
                  </>
                )}
              </motion.div>
            )}
          </div>

          {/* File handling */}
          <div>
            {sep('File Handling')}
            <div style={{ display: 'flex', gap: 8 }}>
              {(['link', 'copy'] as const).map(b => (
                <button key={b} onClick={() => updateSettings({ importBehavior: b })}
                  style={{
                    height: 36, padding: '0 16px', borderRadius: 4, fontSize: 13, cursor: 'pointer',
                    background: settings.importBehavior === b ? 'var(--bg-elevated)' : 'transparent',
                    border: `1px solid ${settings.importBehavior === b ? 'var(--border-emphasis)' : 'var(--border-subtle)'}`,
                    color: settings.importBehavior === b ? 'var(--fg-primary)' : 'var(--fg-muted)',
                    transition: 'all 0.15s ease',
                  }}>
                  {b === 'link' ? 'Link to files' : 'Copy files'}
                </button>
              ))}
            </div>
            <p style={{ fontSize: 11, color: 'var(--fg-subtle)', marginTop: 8 }}>
              {settings.importBehavior === 'link' ? 'Files remain in their original location.' : 'Files are copied into the app data directory.'}
            </p>
          </div>

          {/* Data */}
          <div>
            {sep('Data Management')}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {card(<>
                <p style={{ fontSize: 13, color: 'var(--fg-secondary)', marginBottom: 4 }}>Export Database</p>
                <p style={{ fontSize: 11, color: 'var(--fg-muted)', marginBottom: 12 }}>Download all projects and settings as JSON.</p>
                <Button variant="secondary" size="sm" icon={<Download size={12}/>} onClick={handleExport}>Export Backup</Button>
                {exportMsg && <p style={{ fontSize: 11, color: 'var(--accent-green)', marginTop: 8 }}>{exportMsg}</p>}
              </>)}
              {card(<>
                <p style={{ fontSize: 13, color: 'var(--fg-secondary)', marginBottom: 4 }}>Import Database</p>
                <p style={{ fontSize: 11, color: 'var(--fg-muted)', marginBottom: 12 }}>Restore from a previously exported backup.</p>
                <Button variant="secondary" size="sm" icon={<Upload size={12}/>} onClick={handleImport}>Import Backup</Button>
                {importMsg && <p style={{ fontSize: 11, color: 'var(--accent-green)', marginTop: 8 }}>{importMsg}</p>}
              </>)}
              <div style={{ padding: 16, borderRadius: 6, background: 'var(--bg-surface)', border: '1px solid rgba(180,60,60,0.25)' }}>
                <p style={{ fontSize: 13, color: 'rgba(200,80,80,0.7)', marginBottom: 4 }}>Clear All Data</p>
                <p style={{ fontSize: 11, color: 'var(--fg-muted)', marginBottom: 12 }}>Permanently delete all projects and settings.</p>
                <Button variant="danger" size="sm" icon={<RotateCcw size={12}/>}
                  onClick={() => { if (confirm('This will permanently delete all data. Continue?')) { localStorage.clear(); window.location.reload() } }}>
                  Clear All Data
                </Button>
              </div>
            </div>
          </div>

          {/* Backups */}
          <div>
            {sep('Automatic Backups')}
            <p style={{ fontSize: 11, color: 'var(--fg-muted)', marginBottom: 12, lineHeight: 1.6 }}>
              The app saves automatic backups every 5 minutes and on close. Up to {backups.length > 0 ? backups.length : 5} recent backups are kept.
            </p>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <button onClick={() => { backupSystem.createBackup('manual'); setBackups(backupSystem.getBackupSlots()); setRestoreMsg('Backup created'); setTimeout(() => setRestoreMsg(''), 3000) }}
                style={{ height: 28, padding: '0 12px', borderRadius: 4, border: '1px solid var(--border-subtle)', fontSize: 11, color: 'var(--fg-muted)', background: 'transparent', cursor: 'pointer' }}>
                Create Backup Now
              </button>
              {restoreMsg && <span style={{ fontSize: 11, color: 'var(--accent-green)', alignSelf: 'center' }}>{restoreMsg}</span>}
            </div>
            {backups.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {backups.map((b, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 4, background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 11, color: 'var(--fg-secondary)' }}>{b.label} backup</p>
                      <p style={{ fontSize: 10, fontFamily: 'DM Mono, monospace', color: 'var(--fg-subtle)' }}>
                        {new Date(b.timestamp).toLocaleString('en', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <button onClick={() => backupSystem.exportBackup(i)}
                      style={{ fontSize: 10, padding: '3px 8px', borderRadius: 3, border: '1px solid var(--border-subtle)', color: 'var(--fg-muted)', background: 'transparent', cursor: 'pointer' }}>
                      Export
                    </button>
                    <button onClick={() => { if (confirm('Restore this backup? Current data will be replaced.')) { backupSystem.restoreBackup(i); window.location.reload() } }}
                      style={{ fontSize: 10, padding: '3px 8px', borderRadius: 3, border: '1px solid var(--border-subtle)', color: 'var(--fg-muted)', background: 'transparent', cursor: 'pointer' }}>
                      Restore
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: 11, color: 'var(--fg-subtle)' }}>No backups yet. They will appear here automatically.</p>
            )}
          </div>

          {/* About */}
          <div>
            {sep('About')}
            {[['App','Project Flow'],['Version','3.0.0'],['Stack','Electron · React · TypeScript'],['Security','Electron 33 · Vite 6 · electron-builder 26']].map(([k,v]) => row(k,v))}
            <div style={{ marginTop: 16, padding: 14, borderRadius: 6, background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
              <p style={{ fontSize: 11, fontFamily: 'DM Mono, monospace', color: 'var(--fg-muted)', lineHeight: 1.7 }}>
                Security: Electron 33 resolves ASAR integrity, IPC scoping, and UAF vulnerabilities from ≤39.8. Vite 6 ships esbuild 0.25+ fixing the moderate GHSA-67mh dev-server advisory. electron-builder 26 uses tar 8+ resolving 6 high-severity node-tar path traversal advisories.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
