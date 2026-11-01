import type { ReactNode, RefObject } from 'react'
import { Navigation, X } from 'lucide-react'
import { AssessmentResultsCard, type HighlightedFacilityInfo } from '@/components/layout/AssessmentResultsCard'
import { MapSiteInfoOverlay } from '@/components/layout/MapSiteInfoOverlay'
import {
  ProposedBuildingPreviewMap,
  type ProposedBuildingPreviewMapHandle,
} from '@/components/layout/ProposedBuildingPreviewMap'
import { REPORT_LAYOUT } from '@/lib/assessment/reportLayout'
import type { ProposedBuildingType } from '@/lib/assessment/buildingTypes'
import type { FeatureCollection } from 'geojson'
import type { SiteAssessmentResult } from '@/types'

interface AssessmentReportSheetProps {
  buildingType: ProposedBuildingType
  displayTitle?: string
  lat: number
  lng: number
  result: SiteAssessmentResult
  nearbyBuildings: FeatureCollection
  mapRef?: RefObject<ProposedBuildingPreviewMapHandle | null>
  mapReady?: boolean
  onMapReady?: () => void
  highlightedFacility?: HighlightedFacilityInfo | null
  onSelectFacility?: (facility: HighlightedFacilityInfo | null) => void
  onMinimize?: () => void
  onOpenChatbot?: () => void
  isChatbotOpen?: boolean
  className?: string
}

export function AssessmentReportSheet({
  buildingType,
  displayTitle,
  lat,
  lng,
  result,
  nearbyBuildings,
  mapRef,
  mapReady = true,
  onMapReady,
  highlightedFacility = null,
  onSelectFacility,
  onMinimize,
  className = '',
}: AssessmentReportSheetProps) {
  const nearbyCount = nearbyBuildings.features.length
  const isFarmLot = result.input.category === 'farm_lot'

  return (
    <div className={`grid h-full w-full min-h-0 ${className}`}
      style={{
        gridTemplateColumns: `${REPORT_LAYOUT.leftColRatio * 100}% ${(1 - REPORT_LAYOUT.leftColRatio) * 100}%`,
      }}
    >
      {/* Left Column: Expansive 3D Preview Map */}
      <div
        className={`relative min-h-0 h-full border-r border-slate-200 bg-slate-100 ${
          onMinimize ? 'cursor-pointer' : ''
        }`}
        onClick={(e) => {
          if (!onMinimize) return
          if ((e.target as HTMLElement).closest('button, a')) return
          onMinimize()
        }}
        title={onMinimize ? 'Click map to minimize report and explore on interactive 3D map' : undefined}
      >
        <ProposedBuildingPreviewMap
          ref={mapRef}
          key={`${lng}-${lat}-${buildingType}-${nearbyCount}`}
          lng={lng}
          lat={lat}
          buildingType={buildingType}
          nearbyBuildings={nearbyBuildings}
          highlightedFacility={highlightedFacility}
          className="absolute inset-0 h-full w-full"
          onReady={onMapReady}
        />

        {/* Top-Left: Site Information Overlay */}
        {!highlightedFacility && (
          <MapSiteInfoOverlay
            buildingType={displayTitle ?? buildingType}
            lat={lat}
            lng={lng}
            isFarmLot={isFarmLot}
          />
        )}

        {/* Top-Left: Active Road Route Trace Overlay */}
        {highlightedFacility && (
          <div className="absolute top-3 left-3 z-20 flex items-center justify-between gap-3 rounded-xl border border-emerald-300 bg-white/95 px-3.5 py-2.5 shadow-lg backdrop-blur-md text-xs max-w-[340px] animate-in fade-in duration-200">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-[9.5px] font-bold text-emerald-700 uppercase tracking-wider">
                <span>📍 Road Route Trace</span>
                <span className="rounded bg-emerald-100 px-1.5 py-0.2 text-[8.5px] text-emerald-800">
                  {highlightedFacility.category?.replace(/_/g, ' ') ?? 'Facility'}
                </span>
              </div>
              <div className="truncate font-bold text-slate-900 text-xs mt-0.5">
                {highlightedFacility.name}
              </div>
              <div className="text-[10px] text-slate-500">
                {highlightedFacility.distanceM != null
                  ? highlightedFacility.distanceM >= 1000
                    ? `${(highlightedFacility.distanceM / 1000).toFixed(2)} km straight-line`
                    : `${Math.round(highlightedFacility.distanceM)} m straight-line`
                  : ''}
                {highlightedFacility.valueText ? ` · ${highlightedFacility.valueText}` : ''}
              </div>
            </div>
            <button
              type="button"
              onClick={() => onSelectFacility?.(null)}
              className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
              title="Clear road route and reset view to site"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Bottom-Right: Single clean Explore on 3D Map Action */}
        {onMinimize && (
          <div className="absolute bottom-3 right-3 z-20">
            <button
              type="button"
              onClick={onMinimize}
              className="flex items-center gap-1.5 rounded-full border border-slate-300/90 bg-white/95 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-md backdrop-blur-md transition hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-800 cursor-pointer"
              title="Minimize sheet to view and explore road route on the main 3D map"
            >
              <Navigation className="h-3.5 w-3.5 text-emerald-600" />
              <span>Explore on 3D Map</span>
            </button>
          </div>
        )}

        {!mapReady && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-900/20 text-xs font-medium text-white">
            Loading site preview…
          </div>
        )}
      </div>

      {/* Right Column: AI Hazard Assessment Results */}
      <section className="flex min-h-0 flex-col bg-white">
        <div className="shrink-0 border-b border-slate-100 px-4 py-2.5 bg-slate-50/60 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              AI Hazard Assessment
            </h3>
            <p className="text-[10px] text-slate-500">
              Demonstration screening · not an official certificate
            </p>
          </div>
          {result.coverage && (
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-[9.5px] font-bold border ${
                result.coverage.isLasamLocal
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}
            >
              {result.coverage.confidenceLabel}
            </span>
          )}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-3 pb-16 custom-scrollbar">
          <AssessmentResultsCard
            result={result}
            report
            onSelectFacility={onSelectFacility}
            selectedFacilityName={highlightedFacility?.name ?? null}
          />
        </div>
      </section>
    </div>
  )
}

/** Wrapper for backward compatibility */
export function AssessmentReportFrame({
  children,
  className = '',
}: {
  children: ReactNode
  style?: React.CSSProperties
  className?: string
}) {
  return <div className={`h-full w-full ${className}`}>{children}</div>
}
