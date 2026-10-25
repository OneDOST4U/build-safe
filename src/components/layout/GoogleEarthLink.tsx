import { ExternalLink, MapPin } from 'lucide-react'
import { getGoogleMapsUrl } from '@/lib/assessment/googleEarth'

export interface GoogleEarthLinkProps {
  lat: number
  lng: number
  className?: string
  label?: string
  siteTitle?: string
  showAlternatives?: boolean
}

export function GoogleEarthLink({
  lat,
  lng,
  className = '',
  label = 'View in Google Maps',
}: GoogleEarthLinkProps) {
  const mapsUrl = getGoogleMapsUrl(lat, lng)
  const displayLabel = label === 'View in Google Earth' ? 'View in Google Maps' : label

  return (
    <div className={`relative inline-flex flex-wrap items-center gap-1.5 ${className}`}>
      {/* View in Google Maps with Dropped Pin */}
      <a
        href={mapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="group inline-flex items-center gap-1.5 text-[11px] font-semibold text-sky-700 underline-offset-2 hover:text-sky-900 hover:underline transition-colors cursor-pointer"
        title={`Open ${lat.toFixed(5)}° N, ${lng.toFixed(5)}° E with dropped pin in Google Maps`}
      >
        <MapPin className="h-3.5 w-3.5 text-red-500 shrink-0 group-hover:scale-110 transition-transform" aria-hidden />
        <span>{displayLabel}</span>
        <ExternalLink className="h-2.5 w-2.5 text-sky-500 shrink-0 opacity-70 group-hover:opacity-100" aria-hidden />
      </a>
    </div>
  )
}
