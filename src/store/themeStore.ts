import { create } from 'zustand'

export type Theme = 'dark' | 'light' | 'crystal'

interface ThemeStore {
  theme: Theme
  crystalBg: string | null // base64 or url for crystal background
  setTheme: (t: Theme) => void
  setCrystalBg: (bg: string | null) => void
}

export const useThemeStore = create<ThemeStore>((set) => ({
  theme: (localStorage.getItem('pf_theme') as Theme) || 'dark',
  crystalBg: localStorage.getItem('pf_crystal_bg') || null,
  setTheme: (theme) => {
    localStorage.setItem('pf_theme', theme)
    applyTheme(theme)
    set({ theme })
  },
  setCrystalBg: (bg) => {
    if (bg) localStorage.setItem('pf_crystal_bg', bg)
    else localStorage.removeItem('pf_crystal_bg')
    set({ crystalBg: bg })
  },
}))

export function applyTheme(theme: Theme) {
  const root = document.documentElement
  root.setAttribute('data-theme', theme)
}

// Apply on load
applyTheme((localStorage.getItem('pf_theme') as Theme) || 'dark')
