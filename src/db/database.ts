import { Project, AppSettings, DefaultPipelineNode } from '../types'
import { v4 as uuidv4 } from 'uuid'

const DB_KEY = 'projectflow_db'
const SETTINGS_KEY = 'projectflow_settings'

const DEFAULT_PIPELINE_TEMPLATE: DefaultPipelineNode[] = [
  { id: uuidv4(), label: 'Concept', order: 0 },
  { id: uuidv4(), label: 'References Gathered', order: 1 },
  { id: uuidv4(), label: 'Lookdev', order: 2 },
  { id: uuidv4(), label: 'Modeling / Assets', order: 3 },
  { id: uuidv4(), label: 'FX Setup', order: 4 },
  { id: uuidv4(), label: 'Simulation', order: 5 },
  { id: uuidv4(), label: 'Lighting', order: 6 },
  { id: uuidv4(), label: 'Rendering', order: 7 },
  { id: uuidv4(), label: 'Compositing', order: 8 },
  { id: uuidv4(), label: 'Preview Sent', order: 9 },
  { id: uuidv4(), label: 'Client Feedback', order: 10 },
  { id: uuidv4(), label: 'Final Render', order: 11 },
  { id: uuidv4(), label: 'Delivery', order: 12 },
  { id: uuidv4(), label: 'Invoice Sent', order: 13 },
  { id: uuidv4(), label: 'Paid', order: 14 },
]

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark',
  defaultFolderStructure: ['/renders', '/previews', '/references', '/scenes', '/exports', '/notes'],
  defaultPipelineTemplate: DEFAULT_PIPELINE_TEMPLATE,
  importBehavior: 'link',
  dataDirectory: '',
}

interface Database {
  projects: Project[]
  version: number
}

function getDB(): Database {
  try {
    const raw = localStorage.getItem(DB_KEY)
    if (!raw) return { projects: [], version: 1 }
    return JSON.parse(raw)
  } catch {
    return { projects: [], version: 1 }
  }
}

function saveDB(db: Database): void {
  localStorage.setItem(DB_KEY, JSON.stringify(db))
}

export const db = {
  // Projects
  getAllProjects(): Project[] {
    return getDB().projects
  },

  getProject(id: string): Project | null {
    const db = getDB()
    return db.projects.find(p => p.id === id) || null
  },

  createProject(data: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Project {
    const now = new Date().toISOString()
    const project: Project = {
      ...data,
      id: uuidv4(),
      createdAt: now,
      updatedAt: now,
    }
    const database = getDB()
    database.projects.unshift(project)
    saveDB(database)
    return project
  },

  updateProject(id: string, updates: Partial<Project>): Project | null {
    const database = getDB()
    const index = database.projects.findIndex(p => p.id === id)
    if (index === -1) return null

    const updated = {
      ...database.projects[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    }
    database.projects[index] = updated
    saveDB(database)
    return updated
  },

  deleteProject(id: string): boolean {
    const database = getDB()
    const index = database.projects.findIndex(p => p.id === id)
    if (index === -1) return false

    database.projects.splice(index, 1)
    saveDB(database)
    return true
  },

  // Settings
  getSettings(): AppSettings {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY)
      if (!raw) return DEFAULT_SETTINGS
      return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) }
    } catch {
      return DEFAULT_SETTINGS
    }
  },

  saveSettings(settings: Partial<AppSettings>): AppSettings {
    const current = this.getSettings()
    const updated = { ...current, ...settings }
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated))
    return updated
  },

  // Import / Export
  exportDatabase(): string {
    return JSON.stringify({
      db: getDB(),
      settings: this.getSettings(),
      exportedAt: new Date().toISOString(),
    }, null, 2)
  },

  importDatabase(jsonString: string): boolean {
    try {
      const data = JSON.parse(jsonString)
      if (data.db) saveDB(data.db)
      if (data.settings) localStorage.setItem(SETTINGS_KEY, JSON.stringify(data.settings))
      return true
    } catch {
      return false
    }
  },

  getDefaultPipelineNodes(): typeof DEFAULT_PIPELINE_TEMPLATE {
    return DEFAULT_PIPELINE_TEMPLATE.map(n => ({ ...n, id: uuidv4() }))
  },
}
