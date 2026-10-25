import { GoogleEarthLink } from '@/components/layout/GoogleEarthLink'

interface MapSiteInfoOverlayProps {
  buildingType: string
  lat: number
  lng: number
  className?: string
}

/** White card overlaid on the report map — building type + site coordinates */
export function MapSiteInfoOverlay({
  buildingType,
  lat,
  lng,
  className = '',
}: MapSiteInfoOverlayProps) {
  return (
    <div
      className={`absolute bottom-3 left-3 z-20 max-w-[70%] rounded-sm bg-white px-3 py-2 shadow-md ${className}`}
    >
      <p className="text-sm font-bold leading-tight text-[#1e3a8a]">{buildingType}</p>
      <p className="mt-0.5 font-mono text-[10px] text-slate-500">
        {lat.toFixed(5)} N, {lng.toFixed(5)} E
      </p>
      <GoogleEarthLink lat={lat} lng={lng} siteTitle={buildingType} className="mt-1" />
    </div>
  )
}
