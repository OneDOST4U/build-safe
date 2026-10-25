import { Layers } from 'lucide-react'
import { HazardPanel } from '@/components/layout/HazardPanel'
import type { ComponentProps } from 'react'

type HazardPanelProps = ComponentProps<typeof HazardPanel>

interface MobileHazardDrawerProps extends HazardPanelProps {
  isOpen: boolean
  onToggle: () => void
}

/** Below app header (h-14) + spacing */
const PANEL_TOGGLE_TOP = 'top-[calc(3.5rem+0.75rem)]'

export function MobileHazardDrawer({ isOpen, onToggle, ...panelProps }: MobileHazardDrawerProps) {
  return (
    <>
      {/* Floating button when panel is closed (auto-closed by default) */}
      {!isOpen && (
        <button
          type="button"
          className={`fixed right-3 z-20 flex items-center gap-2 rounded-full border border-slate-200/90 bg-white/95 px-3.5 py-1.5 text-xs font-semibold text-slate-800 shadow-xl backdrop-blur-md transition-all hover:bg-slate-50 hover:text-slate-900 hover:scale-[1.02] ${PANEL_TOGGLE_TOP}`}
          onClick={onToggle}
          title="Open hazard & layers panel"
          aria-label="Open hazard panel"
        >
          <Layers className="h-3.5 w-3.5 text-teal-600" />
          <span>Hazard Layers</span>
        </button>
      )}

      {/* Mobile Drawer Backdrop */}
      {isOpen && (
        <button
          type="button"
          aria-label="Close hazard panel"
          className="fixed inset-0 z-30 bg-black/30 lg:hidden"
          onClick={onToggle}
        />
      )}

      {/* Mobile Drawer */}
      <div
        className={`fixed inset-y-0 right-0 z-40 w-full max-w-sm transform bg-white shadow-2xl transition-transform duration-300 lg:hidden ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex h-full flex-col overflow-hidden">
          <div className="min-h-0 flex-1 overflow-y-auto">
            <HazardPanel {...panelProps} onCollapse={onToggle} />
          </div>
        </div>
      </div>

      {/* Desktop Panel */}
      {isOpen && (
        <div className="hidden shrink-0 lg:flex animate-in slide-in-from-right duration-200">
          <HazardPanel {...panelProps} onCollapse={onToggle} />
        </div>
      )}
    </>
  )
}
