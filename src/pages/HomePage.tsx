import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Plus, SlidersHorizontal, LayoutGrid, List, ChevronDown } from 'lucide-react'
import { useAppStore, useProjects } from '../store/appStore'
import { ProjectStatus } from '../types'
import ProjectCard from '../components/project/ProjectCard'
import ProjectListRow from '../components/project/ProjectListRow'
import { EmptyStateGeometric } from '../components/ui/GeometricAccent'

const STATUS_FILTERS: { value: ProjectStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'idea', label: 'Idea' },
  { value: 'in-progress', label: 'In Progress' },
  { value: 'review', label: 'Review' },
  { value: 'completed', label: 'Completed' },
  { value: 'archived', label: 'Archived' },
]

const SORT_OPTIONS = [
  { value: 'updatedAt', label: 'Last Updated' },
  { value: 'createdAt', label: 'Date Created' },
  { value: 'title', label: 'Title' },
  { value: 'deadline', label: 'Deadline' },
]

export default function HomePage() {
  const navigate = useNavigate()
  const filters = useAppStore(s => s.filters)
  const setFilter = useAppStore(s => s.setFilter)
  const allProjects = useAppStore(s => s.projects)
  const filteredProjects = useProjects()
  const [showSort, setShowSort] = useState(false)

  return (
    <div className="h-full flex flex-col overflow-hidden" style={{ background: 'var(--bg-base)' }}>
      {/* Header */}
      <div className="flex-shrink-0 px-8 pt-8 pb-0">
        {/* Title row */}
        <div className="flex items-end justify-between mb-6">
          <div>
            <h1 className="font-display tracking-tightest leading-none mb-1"
              style={{ fontSize: 40, color: 'var(--fg-primary)', fontWeight: 400 }}>
              Projects
            </h1>
            <p className="text-xs font-mono" style={{ color: 'var(--fg-muted)' }}>
              {allProjects.length} total
              {filteredProjects.length !== allProjects.length && ` · ${filteredProjects.length} shown`}
            </p>
          </div>

          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate('/project/new')}
            className="flex items-center gap-2 h-9 px-4 rounded text-sm transition-colors"
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-emphasis)',
              color: 'var(--fg-primary)',
            }}
          >
            <Plus size={14} /> New Project
          </motion.button>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-3 mb-5">
          {/* Search */}
          <div className="relative flex-1 max-w-xs">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--fg-muted)' }} />
            <input
              value={filters.search}
              onChange={e => setFilter('search', e.target.value)}
              placeholder="Search projects..."
              className="w-full h-8 pl-9 pr-3 rounded text-sm"
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--fg-primary)',
                outline: 'none',
              }}
              onFocus={e => (e.target as HTMLInputElement).style.borderColor = 'var(--border-default)'}
              onBlur={e => (e.target as HTMLInputElement).style.borderColor = 'var(--border-subtle)'}
            />
          </div>

          {/* Status filter chips */}
          <div className="flex items-center gap-1">
            {STATUS_FILTERS.map(f => (
              <button
                key={f.value}
                onClick={() => setFilter('status', f.value)}
                className="h-7 px-3 rounded text-xs transition-all duration-150"
                style={{
                  background: filters.status === f.value ? 'var(--bg-elevated)' : 'transparent',
                  border: `1px solid ${filters.status === f.value ? 'var(--border-emphasis)' : 'transparent'}`,
                  color: filters.status === f.value ? 'var(--fg-primary)' : 'var(--fg-muted)',
                }}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="flex-1" />

          {/* Sort dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowSort(!showSort)}
              className="flex items-center gap-1.5 h-7 px-3 rounded text-xs transition-colors"
              style={{ border: '1px solid var(--border-subtle)', color: 'var(--fg-muted)' }}
            >
              <SlidersHorizontal size={11} />
              {SORT_OPTIONS.find(s => s.value === filters.sortField)?.label}
              <ChevronDown size={10} className={`transition-transform ${showSort ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
              {showSort && (
                <motion.div
                  initial={{ opacity: 0, y: -4, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.97 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-9 z-20 w-44 rounded py-1"
                  style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-modal)' }}
                  onMouseLeave={() => setShowSort(false)}
                >
                  {SORT_OPTIONS.map(opt => (
                    <button key={opt.value}
                      onClick={() => { setFilter('sortField', opt.value as any); setShowSort(false) }}
                      className="w-full text-left px-3 py-1.5 text-xs transition-colors"
                      style={{ color: filters.sortField === opt.value ? 'var(--fg-primary)' : 'var(--fg-muted)' }}>
                      {opt.label}
                    </button>
                  ))}
                  <div style={{ borderTop: '1px solid var(--border-subtle)', marginTop: 4, paddingTop: 4 }}>
                    <button
                      onClick={() => { setFilter('sortOrder', filters.sortOrder === 'asc' ? 'desc' : 'asc'); setShowSort(false) }}
                      className="w-full text-left px-3 py-1.5 text-xs"
                      style={{ color: 'var(--fg-muted)' }}>
                      {filters.sortOrder === 'asc' ? '↑ Ascending' : '↓ Descending'}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* View toggle */}
          <div className="flex items-center rounded overflow-hidden" style={{ border: '1px solid var(--border-subtle)' }}>
            {(['grid', 'list'] as const).map(mode => (
              <button key={mode}
                onClick={() => setFilter('viewMode', mode)}
                className="h-7 w-7 flex items-center justify-center transition-colors"
                style={{
                  background: filters.viewMode === mode ? 'var(--bg-elevated)' : 'transparent',
                  color: filters.viewMode === mode ? 'var(--fg-primary)' : 'var(--fg-muted)',
                }}>
                {mode === 'grid' ? <LayoutGrid size={12} /> : <List size={12} />}
              </button>
            ))}
          </div>
        </div>

        {/* Separator */}
        <div style={{ height: 1, background: 'var(--border-subtle)' }} />
      </div>

      {/* Project grid */}
      <div className="flex-1 overflow-y-auto px-8 py-6">
        <AnimatePresence mode="wait">
          {filteredProjects.length === 0 ? (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center h-full min-h-64 text-center">
              <EmptyStateGeometric />
              <p className="text-sm mt-4" style={{ color: 'var(--fg-muted)' }}>
                {filters.search || filters.status !== 'all' ? 'No projects match your filters' : 'No projects yet'}
              </p>
              <p className="text-xs mt-1 mb-6" style={{ color: 'var(--fg-subtle)' }}>
                {filters.search || filters.status !== 'all' ? 'Try adjusting filters' : 'Create your first project to get started'}
              </p>
              {filters.status === 'all' && !filters.search && (
                <button onClick={() => navigate('/project/new')}
                  className="flex items-center gap-2 h-9 px-4 rounded text-sm transition-colors"
                  style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-emphasis)', color: 'var(--fg-secondary)' }}>
                  <Plus size={13} /> New Project
                </button>
              )}
            </motion.div>
          ) : filters.viewMode === 'grid' ? (
            <motion.div key="grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="grid grid-cols-project-grid gap-5">
              {filteredProjects.map((project, i) => (
                <ProjectCard key={project.id} project={project} index={i} />
              ))}
            </motion.div>
          ) : (
            <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex flex-col" style={{ gap: 0 }}>
              {filteredProjects.map((project, i) => (
                <ProjectListRow key={project.id} project={project} index={i} />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
