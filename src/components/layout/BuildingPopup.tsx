import { X, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { SelectedBuilding } from '@/types'

interface BuildingPopupProps {
  building: SelectedBuilding
  onClose: () => void
}

export function BuildingPopup({ building, onClose }: BuildingPopupProps) {
  return (
    <div className="absolute bottom-4 left-1/2 z-20 w-[min(92vw,410px)] -translate-x-1/2 rounded-2xl border border-slate-200/90 bg-white/95 p-4 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 duration-150">
      <div className="mb-3 flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
        <div className="flex items-start gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-50 text-teal-700 border border-teal-200/60 shrink-0 mt-0.5">
            <Building2 className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded">
                Building Inspection
              </span>
            </div>
            <h3 className="text-xs font-bold text-slate-900 mt-0.5">{building.id}</h3>
            {building.name && <p className="text-[11px] text-slate-500 font-medium">{building.name}</p>}
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 rounded-lg text-slate-400 hover:text-slate-700"
          onClick={onClose}
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-lg bg-slate-50/80 border border-slate-100 p-2">
          <span className="text-[10.5px] text-slate-500 block">Building type</span>
          <p className="font-semibold text-slate-800">{building.type}</p>
        </div>
        <div className="rounded-lg bg-slate-50/80 border border-slate-100 p-2">
          <span className="text-[10.5px] text-slate-500 block">Barangay</span>
          <p className="font-semibold text-slate-800">{building.barangay}</p>
        </div>
        <div className="rounded-lg bg-slate-50/80 border border-slate-100 p-2">
          <span className="text-[10.5px] text-slate-500 block">Floors (est.)</span>
          <p className="font-semibold text-slate-800">{building.floors}</p>
        </div>
        <div className="rounded-lg bg-slate-50/80 border border-slate-100 p-2">
          <span className="text-[10.5px] text-slate-500 block">Height (est.)</span>
          <p className="font-semibold text-slate-800">
            {building.height.toFixed(1)} m
            {building.heightEstimated && <span className="text-slate-400 font-normal"> · simulated</span>}
          </p>
        </div>
        <div className="rounded-lg bg-slate-50/80 border border-slate-100 p-2">
          <span className="text-[10.5px] text-slate-500 block">Ground elev.</span>
          <p className="font-semibold text-slate-800">
            {building.groundElevation != null ? `${building.groundElevation.toFixed(1)} m` : '—'}
          </p>
        </div>
        <div className="rounded-lg bg-slate-50/80 border border-slate-100 p-2">
          <span className="text-[10.5px] text-slate-500 block">Flood note</span>
          <p className="font-semibold text-sky-800">{building.floodDepth}</p>
        </div>
        <div className="rounded-lg bg-slate-50/80 border border-slate-100 p-2">
          <span className="text-[10.5px] text-slate-500 block">Flood status</span>
          <p className="font-semibold text-slate-800">{building.floodStatus}</p>
        </div>
        <div className="rounded-lg bg-slate-50/80 border border-slate-100 p-2">
          <span className="text-[10.5px] text-slate-500 block">Earthquake</span>
          <p className="font-semibold text-slate-800">{building.earthquakeStatus}</p>
        </div>
        <div className="rounded-lg bg-slate-50/80 border border-slate-100 p-2">
          <span className="text-[10.5px] text-slate-500 block">Fault distance</span>
          <p className="font-semibold text-slate-800">{building.faultDistance}</p>
        </div>
        <div className="rounded-lg bg-slate-50/80 border border-slate-100 p-2">
          <span className="text-[10.5px] text-slate-500 block">Data source</span>
          <p className="font-semibold text-slate-800">{building.dataSource}</p>
        </div>
      </div>

      <p className="mt-2.5 text-[10px] leading-relaxed text-slate-400">
        Cadastral building footprint from OpenStreetMap / LGU inventory. Heights & hazard values are calculated for planning demonstration.
      </p>
    </div>
  )
}
