import type { ComponentType } from 'react'
import { Hand } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { MapTool } from '@/types'

interface MapToolbarProps {
  activeTool: MapTool
  onToolChange: (tool: MapTool) => void
  onClearDrawings?: () => void
  onOpenLayers?: () => void
  layersActive?: boolean
  className?: string
}

const tools: { id: MapTool; label: string; icon: ComponentType<{ className?: string }> }[] = [
  { id: 'pan', label: 'Pan / Explore Map', icon: Hand },
]

export function MapToolbar({
  activeTool,
  onToolChange,
  className,
}: MapToolbarProps) {
  if (tools.length <= 1) {
    return null
  }

  return (
    <div
      className={cn(
        'absolute left-3 top-3 z-10 flex flex-col gap-1 rounded-2xl border border-slate-200/90 bg-white/95 p-1.5 shadow-xl backdrop-blur-md transition-all',
        className,
      )}
      role="toolbar"
      aria-label="Map Tools"
    >
      {tools.map(({ id, label, icon: Icon }) => {
        const isActive = activeTool === id
        return (
          <Button
            key={id}
            variant="ghost"
            size="icon"
            title={label}
            aria-label={label}
            onClick={() => onToolChange(id)}
            className={cn(
              'h-8 w-8 rounded-xl transition-all',
              isActive
                ? 'bg-slate-900 text-white shadow-sm hover:bg-slate-800 hover:text-white'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
            )}
          >
            <Icon className="h-4 w-4" />
          </Button>
        )
      })}
    </div>
  )
}

