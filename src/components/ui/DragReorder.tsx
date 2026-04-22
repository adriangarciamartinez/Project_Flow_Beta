import {
  useState,
  useRef,
  useCallback,
  ReactNode,
  DragEvent,
} from 'react'
import { motion } from 'framer-motion'

interface DragItem {
  id: string
}

interface DragReorderProps<T extends DragItem> {
  items: T[]
  onReorder: (newOrder: T[]) => void
  renderItem: (item: T, dragHandleProps: DragHandleProps) => ReactNode
  keyExtractor?: (item: T) => string
}

export interface DragHandleProps {
  draggable: boolean
  onDragStart: (e: DragEvent) => void
  onDragEnd: (e: DragEvent) => void
  style?: React.CSSProperties
  className?: string
}

export default function DragReorder<T extends DragItem>({
  items,
  onReorder,
  renderItem,
}: DragReorderProps<T>) {
  const [dragId, setDragId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)
  const dragNode = useRef<EventTarget | null>(null)

  const handleDragStart = useCallback((e: DragEvent, id: string) => {
    setDragId(id)
    dragNode.current = e.target
    e.dataTransfer.effectAllowed = 'move'
  }, [])

  const handleDragEnd = useCallback(() => {
    if (dragId && overId && dragId !== overId) {
      const from = items.findIndex(i => i.id === dragId)
      const to = items.findIndex(i => i.id === overId)
      if (from !== -1 && to !== -1) {
        const next = [...items]
        const [moved] = next.splice(from, 1)
        next.splice(to, 0, moved)
        onReorder(next)
      }
    }
    setDragId(null)
    setOverId(null)
  }, [dragId, overId, items, onReorder])

  const handleDragOver = useCallback((e: DragEvent, id: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (id !== overId) setOverId(id)
  }, [overId])

  return (
    <div className="flex flex-col">
      {items.map(item => {
        const isDragging = item.id === dragId
        const isOver = item.id === overId && dragId !== overId

        const dragHandleProps: DragHandleProps = {
          draggable: true,
          onDragStart: (e) => handleDragStart(e, item.id),
          onDragEnd: handleDragEnd,
        }

        return (
          <motion.div
            key={item.id}
            layout
            layoutId={item.id}
            onDragOver={(e) => handleDragOver(e as unknown as DragEvent, item.id)}
            onDrop={(e) => e.preventDefault()}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            style={{
              opacity: isDragging ? 0.4 : 1,
              borderTop: isOver ? '1px solid rgba(92,140,92,0.4)' : '1px solid transparent',
              transition: 'border-color 0.15s ease, opacity 0.15s ease',
            }}
          >
            {renderItem(item, dragHandleProps)}
          </motion.div>
        )
      })}
    </div>
  )
}
