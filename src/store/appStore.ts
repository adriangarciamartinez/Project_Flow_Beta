import { create } from 'zustand'
import { Project, FilterState, AppSettings, ProjectStatus } from '../types'
import { db } from '../db/database'

interface AppStore {
  // Projects
  projects: Project[]
  selectedProjectId: string | null
  
  // Filters
  filters: FilterState
  
  // Settings
  settings: AppSettings
  
  // UI
  isLoading: boolean
  sidebarOpen: boolean
  
  // Actions
  loadProjects: () => void
  createProject: (data: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => Project
  updateProject: (id: string, updates: Partial<Project>) => void
  deleteProject: (id: string) => void
  selectProject: (id: string | null) => void
  
  // Filters
  setFilter: (key: keyof FilterState, value: FilterState[keyof FilterState]) => void
  resetFilters: () => void
  
  // Settings
  loadSettings: () => void
  updateSettings: (settings: Partial<AppSettings>) => void
  
  // UI
  setSidebarOpen: (open: boolean) => void
  
  // Computed
  filteredProjects: () => Project[]
}

const DEFAULT_FILTERS: FilterState = {
  status: 'all',
  search: '',
  sortField: 'updatedAt',
  sortOrder: 'desc',
  viewMode: 'grid',
}

export const useAppStore = create<AppStore>((set, get) => ({
  projects: [],
  selectedProjectId: null,
  filters: DEFAULT_FILTERS,
  settings: db.getSettings(),
  isLoading: false,
  sidebarOpen: false,

  loadProjects: () => {
    const projects = db.getAllProjects()
    set({ projects })
  },

  createProject: (data) => {
    const project = db.createProject(data)
    set(state => ({ projects: [project, ...state.projects] }))
    return project
  },

  updateProject: (id, updates) => {
    const updated = db.updateProject(id, updates)
    if (updated) {
      set(state => ({
        projects: state.projects.map(p => p.id === id ? updated : p)
      }))
    }
  },

  deleteProject: (id) => {
    db.deleteProject(id)
    set(state => ({
      projects: state.projects.filter(p => p.id !== id),
      selectedProjectId: state.selectedProjectId === id ? null : state.selectedProjectId,
    }))
  },

  selectProject: (id) => {
    set({ selectedProjectId: id })
  },

  setFilter: (key, value) => {
    set(state => ({
      filters: { ...state.filters, [key]: value }
    }))
  },

  resetFilters: () => {
    set({ filters: DEFAULT_FILTERS })
  },

  loadSettings: () => {
    const settings = db.getSettings()
    set({ settings })
  },

  updateSettings: (settings) => {
    const updated = db.saveSettings(settings)
    set({ settings: updated })
  },

  setSidebarOpen: (open) => {
    set({ sidebarOpen: open })
  },

  filteredProjects: () => {
    const { projects, filters } = get()
    let filtered = [...projects]

    // Filter by status
    if (filters.status !== 'all') {
      filtered = filtered.filter(p => p.status === filters.status)
    }

    // Search
    if (filters.search.trim()) {
      const q = filters.search.toLowerCase()
      filtered = filtered.filter(p =>
        p.title.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.client.toLowerCase().includes(q) ||
        p.tags.some(t => t.toLowerCase().includes(q))
      )
    }

    // Sort
    filtered.sort((a, b) => {
      const aVal = a[filters.sortField] || ''
      const bVal = b[filters.sortField] || ''
      const cmp = String(aVal).localeCompare(String(bVal))
      return filters.sortOrder === 'asc' ? cmp : -cmp
    })

    return filtered
  },
}))

// Selector hooks for performance
export const useProjects = () => useAppStore(s => s.filteredProjects())
export const useProject = (id: string) => useAppStore(s => s.projects.find(p => p.id === id))
export const useFilters = () => useAppStore(s => s.filters)
export const useSettings = () => useAppStore(s => s.settings)
export const useSelectedProjectId = () => useAppStore(s => s.selectedProjectId)

// Status display helpers
export const STATUS_CONFIG: Record<ProjectStatus, { label: string; color: string; bg: string }> = {
  idea:          { label: 'Idea',        color: '#8a8a9a', bg: 'rgba(90,90,100,0.18)' },
  'in-progress': { label: 'In Progress', color: '#a0a060', bg: 'rgba(100,100,60,0.18)' },
  review:        { label: 'Review',      color: '#9a9a50', bg: 'rgba(120,120,50,0.15)' },
  completed:     { label: 'Completed',   color: '#5c8c5c', bg: 'rgba(60,100,60,0.18)' },
  archived:      { label: 'Archived',    color: '#5a5a5a', bg: 'rgba(60,60,60,0.18)' },
}
