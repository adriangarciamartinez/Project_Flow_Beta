import { ProjectStatus } from '../../types'
import { STATUS_CONFIG } from '../../store/appStore'

interface StatusChipProps {
  status: ProjectStatus
  size?: 'sm' | 'md'
}

export default function StatusChip({ status, size = 'sm' }: StatusChipProps) {
  const config = STATUS_CONFIG[status]
  return (
    <span
      className={`status-chip inline-flex items-center rounded-sm font-mono tracking-widest uppercase ${
        size === 'sm' ? 'text-2xs px-1.5 py-0.5' : 'text-xs px-2 py-1'
      }`}
      style={{ color: config.color, background: config.bg }}
    >
      {config.label}
    </span>
  )
}
