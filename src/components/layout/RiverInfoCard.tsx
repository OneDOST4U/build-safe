import { AlertTriangle, Ban, Droplets, Info, ShieldAlert, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

export interface SelectedRiver {
  id: string
  name: string
  waterway: string
  className: string
  lengthKm?: number
  bankElevationM?: number | null
  isWaterBody?: boolean
  advisory?: string
}

interface RiverInfoCardProps {
  river: SelectedRiver
  onClose: () => void
  hazardPanelOpen?: boolean
}

export function RiverInfoCard({ river, onClose, hazardPanelOpen = false }: RiverInfoCardProps) {
  const displayName =
    river.name && river.name.toLowerCase() !== 'river' && river.name.toLowerCase() !== 'waterway'
      ? river.name
      : river.waterway && river.waterway !== 'stream'
        ? `${river.waterway.charAt(0).toUpperCase() + river.waterway.slice(1)} Segment`
        : 'Waterway / River Segment'

  return (
    <div
      className={`absolute top-3 z-30 w-[min(94vw,340px)] rounded-2xl border border-red-200/90 bg-white/95 p-4 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-200 ${
        hazardPanelOpen
          ? 'right-3 lg:right-[21rem] xl:right-[25rem]'
          : 'right-3'
      }`}
    >
      {/* Header with Warning Banner */}
      <div className="mb-2.5 flex items-start justify-between gap-2 border-b border-red-100 pb-2.5">
        <div className="flex items-start gap-2">
          <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-700">
            <Ban className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="rounded bg-red-600 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
                No-Build Zone
              </span>
              <span className="text-[10px] font-semibold text-slate-500">Water Body</span>
            </div>
            <h3 className="mt-0.5 text-sm font-bold text-slate-900 leading-snug">{displayName}</h3>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0 text-slate-400 hover:text-slate-700"
          onClick={onClose}
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Primary Construction Prohibition Warning */}
      <div className="mb-3 rounded-lg border border-red-200 bg-red-50/90 p-2.5 text-xs text-red-950">
        <div className="flex items-center gap-1.5 font-bold text-red-700">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          <span>Construction Strictly Prohibited</span>
        </div>
        <p className="mt-1 text-[11px] leading-relaxed text-red-900">
          Under <strong>Presidential Decree No. 1067</strong> (Water Code of the Philippines, Art. 51) and the <strong>National Building Code</strong> (PD 1096), erecting any building or structure on or within water bodies, riverbeds, and statutory riparian easements is <strong>unlawful</strong>.
        </p>
      </div>

      {/* Mandatory Riparian Easements Breakdown */}
      <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50/60 p-2 text-[11px] text-amber-950">
        <div className="flex items-center gap-1 font-semibold text-amber-800 mb-1">
          <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
          <span>Mandatory Riparian Easements (PD 1067)</span>
        </div>
        <div className="grid grid-cols-3 gap-1.5 text-center text-[10.5px]">
          <div className="rounded bg-white/90 border border-amber-200/80 p-1">
            <span className="block font-bold text-slate-800">3 meters</span>
            <span className="text-[9.5px] text-slate-500">Urban Areas</span>
          </div>
          <div className="rounded bg-white/90 border border-amber-200/80 p-1">
            <span className="block font-bold text-slate-800">20 meters</span>
            <span className="text-[9.5px] text-slate-500">Agricultural</span>
          </div>
          <div className="rounded bg-white/90 border border-amber-200/80 p-1">
            <span className="block font-bold text-slate-800">40 meters</span>
            <span className="text-[9.5px] text-slate-500">Forest / Protected</span>
          </div>
        </div>
        <p className="mt-1.5 text-[9.5px] text-amber-800 leading-tight">
          No building permits can be granted within these margins. Structures are subject to summary removal.
        </p>
      </div>

      {/* Waterway Physical Attributes */}
      <div className="grid grid-cols-2 gap-2 rounded-lg border border-slate-100 bg-slate-50/80 p-2 text-xs">
        <div>
          <span className="text-[10px] text-slate-500">Waterway Type</span>
          <p className="font-semibold capitalize text-slate-800 flex items-center gap-1">
            <Droplets className="h-3 w-3 text-sky-600" />
            {river.waterway || 'River'}
          </p>
        </div>
        <div>
          <span className="text-[10px] text-slate-500">Classification</span>
          <p className="font-semibold capitalize text-slate-800">{river.className || 'Stream'}</p>
        </div>
        <div>
          <span className="text-[10px] text-slate-500">Segment Length</span>
          <p className="font-semibold text-slate-800">
            {river.lengthKm != null ? `${river.lengthKm} km` : '—'}
          </p>
        </div>
        <div>
          <span className="text-[10px] text-slate-500">Bank Elevation</span>
          <p className="font-semibold text-slate-800">
            {river.bankElevationM != null ? `${river.bankElevationM.toFixed(1)} m` : '—'}
          </p>
        </div>
      </div>

      {/* Bottom Footer Note */}
      <div className="mt-2.5 flex items-center justify-between border-t border-slate-100 pt-2 text-[10px] text-slate-400">
        <span className="flex items-center gap-1">
          <Info className="h-3 w-3" />
          Water Code & NBCP Compliant
        </span>
        <span>DENR · DPWH · LGU</span>
      </div>
    </div>
  )
}
