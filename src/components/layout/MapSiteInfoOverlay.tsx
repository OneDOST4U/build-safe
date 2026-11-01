import { GoogleEarthLink } from '@/components/layout/GoogleEarthLink'
import { Building2, Sprout } from 'lucide-react'

interface MapSiteInfoOverlayProps {
  buildingType: string
  lat: number
  lng: number
  className?: string
  isFarmLot?: boolean
}

/** Clean glassmorphism badge overlaid on the report map — site title, coordinates & 3D Earth link */
export function MapSiteInfoOverlay({
  buildingType,
  lat,
  lng,
  className = '',
  isFarmLot = false,
}: MapSiteInfoOverlayProps) {
  return (
    <div
      className={`absolute top-3 left-3 z-20 rounded-xl border border-slate-200/90 bg-white/95 px-3 py-2 shadow-md backdrop-blur-md transition-all max-w-[280px] ${className}`}
    >
      <div className="flex items-center gap-1.5">
        {isFarmLot ? (
          <Sprout className="h-4 w-4 text-emerald-600 shrink-0" />
        ) : (
          <Building2 className="h-4 w-4 text-sky-600 shrink-0" />
        )}
        <p className="text-xs font-bold leading-tight text-slate-900 truncate">
          {buildingType}
        </p>
      </div>
      <p className="mt-1 font-mono text-[9.5px] text-slate-500">
        {lat.toFixed(5)}° N, {lng.toFixed(5)}° E
      </p>
      <div className="mt-1.5 pt-1.5 border-t border-slate-100">
        <GoogleEarthLink lat={lat} lng={lng} siteTitle={buildingType} />
      </div>
    </div>
  )
}
