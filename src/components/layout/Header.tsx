import { useState } from 'react'
import { Maximize2, RotateCcw, ShieldCheck, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { BrandLogo } from '@/components/layout/BrandLogo'
import { APP_BRAND, APP_DEMO_SUBTITLE } from '@/lib/constants'

interface HeaderProps {
  is3D: boolean
  onToggle3D: () => void
  onReset: () => void
  onFullscreen: () => void
  onOpenReliability?: () => void
}

export function Header({
  is3D,
  onToggle3D,
  onReset,
  onFullscreen,
  onOpenReliability,
}: HeaderProps) {
  const [showInfo, setShowInfo] = useState(false)

  return (
    <header className="relative z-30 flex h-14 shrink-0 items-center justify-between border-b border-slate-200/80 bg-white/95 px-4 backdrop-blur-md shadow-xs">
      {/* Left: Modern Brand & Purpose */}
      <div className="flex items-center gap-3">
        <BrandLogo size="md" />

        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <div className="flex items-baseline font-black tracking-tight text-slate-900">
              <span className="text-sm sm:text-base font-extrabold text-slate-900">BUILD</span>
              <span className="text-sm sm:text-base font-extrabold text-teal-600">SAFE</span>
              <span className="ml-1 text-[11px] font-semibold text-slate-400">/ Lasam</span>
            </div>

            <button
              type="button"
              onClick={() => setShowInfo((v) => !v)}
              className="text-slate-400 hover:text-slate-600 transition-colors"
              title="Click for full platform title and research context"
              aria-label="Platform information"
            >
              <Info className="h-3.5 w-3.5" />
            </button>

            <span className="hidden xl:inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10.5px] font-medium text-emerald-800 border border-emerald-200/60">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              LGU Decision Support
            </span>
          </div>

          <p className="hidden sm:block text-[11px] font-medium text-slate-500 leading-tight">
            Multi-Hazard Site Intelligence · Planning & Building Permit Verification
          </p>
        </div>

        {/* Hover / Click Info Tooltip Flyout */}
        {showInfo && (
          <div
            className="absolute left-4 top-14 z-50 w-[min(92vw,28rem)] rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xl animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2">
              <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900">
                <BrandLogo size="sm" />
                <span>{APP_BRAND.name}</span>
              </div>
              <button
                type="button"
                onClick={() => setShowInfo(false)}
                className="text-slate-400 hover:text-slate-600 text-xs px-1"
              >
                ✕
              </button>
            </div>
            <p className="mt-2 text-xs font-semibold text-slate-800 leading-relaxed">
              {APP_BRAND.tagline}
            </p>
            <p className="mt-1 text-[11px] text-slate-500">
              {APP_DEMO_SUBTITLE}
            </p>
            <div className="mt-2.5 rounded-lg bg-slate-50 p-2 text-[10.5px] text-slate-600 border border-slate-100 space-y-0.5">
              <div>• <strong>Municipality:</strong> Lasam, Cagayan (PSA 0201517000)</div>
              <div>• <strong>Primary Datasets:</strong> DENR-MGB 1:10k Flood, PHIVOLCS Faults, Cagua Volcano, DA-BSWM Soil/SAFDZ</div>
              <div>• <strong>Framework:</strong> Spatial decision support for PD 1096 Building Code & PD 1067 Water Code</div>
            </div>
          </div>
        )}
      </div>

      {/* Right: Modern Simplified Action Controls */}
      <div className="flex items-center gap-2">
        {onOpenReliability && (
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenReliability}
            className="h-8 gap-1.5 rounded-lg border-teal-200/80 bg-teal-50/50 text-teal-800 hover:bg-teal-100/70 font-medium text-xs shadow-xs"
            title="Dataset Reliability, Provenance & Multi-LGU Coverage"
          >
            <ShieldCheck className="h-3.5 w-3.5 text-teal-600" />
            <span className="hidden sm:inline">Data Reliability</span>
          </Button>
        )}

        {/* 2D / 3D Segmented Control Toggle */}
        <div className="flex items-center rounded-lg border border-slate-200 bg-slate-100/80 p-0.5 shadow-xs">
          <button
            type="button"
            onClick={is3D ? onToggle3D : undefined}
            className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-all ${
              !is3D
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-900'
            }`}
            title="Switch to 2D Top-down Map View"
          >
            2D
          </button>
          <button
            type="button"
            onClick={!is3D ? onToggle3D : undefined}
            className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-all ${
              is3D
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-900'
            }`}
            title="Switch to 3D Extruded Terrain & Building View"
          >
            3D
          </button>
        </div>

        {/* Reset View & Settings */}
        <Button
          variant="outline"
          size="sm"
          onClick={onReset}
          className="h-8 gap-1.5 rounded-lg border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-medium shadow-xs"
          title="Reset Map View, Layers and Filters"
        >
          <RotateCcw className="h-3.5 w-3.5 text-slate-500" />
          <span className="hidden sm:inline">Reset</span>
        </Button>

        {/* Fullscreen Toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onFullscreen}
          className="h-8 w-8 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          title="Toggle Fullscreen"
          aria-label="Toggle Fullscreen"
        >
          <Maximize2 className="h-4 w-4" />
        </Button>
      </div>
    </header>
  )
}
