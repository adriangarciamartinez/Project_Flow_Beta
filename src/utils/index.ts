// cn helper - no external dep

// Simple className merger (without clsx dep, inline)
export function cn(...inputs: (string | undefined | null | false | 0)[]): string {
  return inputs.filter(Boolean).join(' ')
}

/**
 * Format file size in human-readable form
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

/**
 * Truncate string to max length
 */
export function truncate(str: string, max = 60): string {
  if (str.length <= max) return str
  return str.slice(0, max) + '...'
}

/**
 * Get initials from a name
 */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

/**
 * Generate a muted random color from a string (deterministic)
 */
export function stringToMutedColor(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  const h = Math.abs(hash) % 360
  return `hsl(${h}, 15%, 35%)`
}

/**
 * Deep clone (simple JSON approach)
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj))
}

/**
 * Sleep promise
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Check if running in Electron
 */
export function isElectron(): boolean {
  return !!(window as any).electronAPI
}

/**
 * Get a placeholder gradient based on project id
 */
export function getProjectGradient(id: string): string {
  const gradients = [
    'from-bg-elevated to-bg-void',
    'from-bg-surface to-bg-void',
    'from-bg-overlay to-bg-surface',
  ]
  const index = id.charCodeAt(0) % gradients.length
  return gradients[index]
}
