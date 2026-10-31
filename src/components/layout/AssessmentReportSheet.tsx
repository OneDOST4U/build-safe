import type { ReactNode, RefObject } from 'react'
import { MessageSquareText, Minus, Sparkles, X } from 'lucide-react'
import { AssessmentResultsCard, type HighlightedFacilityInfo } from '@/components/layout/AssessmentResultsCard'
import { MapSiteInfoOverlay } from '@/components/layout/MapSiteInfoOverlay'
import {
  ProposedBuildingPreviewMap,
  type ProposedBuildingPreviewMapHandle,
} from '@/components/layout/ProposedBuildingPreviewMap'
import {
  A4_LANDSCAPE_RATIO,
  REPORT_HEADER,
  REPORT_LAYOUT,
} from '@/lib/assessment/reportLayout'
import { APP_LOGO_ALT, APP_LOGO_PATH } from '@/lib/constants'
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
  onOpenChatbot,
  isChatbotOpen = false,
  className = '',
}: AssessmentReportSheetProps) {
  const nearbyCount = nearbyBuildings.features.length

  return (
    <article
      className={`flex w-full flex-col overflow-hidden bg-white ${className}`}
      style={{ aspectRatio: String(A4_LANDSCAPE_RATIO) }}
    >
      {/* Header — compact centered logo + titles */}
      <header className="flex shrink-0 flex-col items-center border-b border-slate-200 px-3 py-1 text-center">
        <img
          src={APP_LOGO_PATH}
          alt={APP_LOGO_ALT}
          className="h-7 w-7 object-contain sm:h-8 sm:w-8"
        />
        <p className="mt-0.5 text-[11px] font-bold tracking-wide text-slate-900 leading-tight sm:text-xs">
          {REPORT_HEADER.titleLine1}
        </p>
      </header>

      {/* Body — map left, hazard tables right */}
      <div
        className="grid min-h-0 flex-1"
        style={{
          gridTemplateColumns: `${REPORT_LAYOUT.leftColRatio * 100}% ${(1 - REPORT_LAYOUT.leftColRatio) * 100}%`,
        }}
      >
        <div
          className={`relative min-h-0 border-r border-slate-200 bg-slate-100 ${
            onMinimize ? 'cursor-pointer' : ''
          }`}
          onClick={(e) => {
            if (!onMinimize) return
            // Don't minimize if user clicks on links or buttons inside overlays
            if ((e.target as HTMLElement).closest('button, a')) return
            onMinimize()
          }}
          title={onMinimize ? 'Click map to minimize report and explore on full live map' : undefined}
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
          <MapSiteInfoOverlay buildingType={displayTitle ?? buildingType} lat={lat} lng={lng} />
          <div className="absolute bottom-2.5 right-2.5 z-20 flex items-center gap-2">
            {onMinimize && (
              <button
                type="button"
                onClick={onMinimize}
                className="flex items-center gap-1.5 rounded-full border border-slate-300 bg-white/95 px-2.5 py-1 text-[10px] font-semibold text-slate-700 shadow-md backdrop-blur-xs transition hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-800 cursor-pointer"
                title="Minimize sheet to view and interact with live path on the main 3D map"
              >
                <Minus className="h-3 w-3 text-slate-500" />
                <span>Explore on Live Map</span>
              </button>
            )}
            {onOpenChatbot && (
              <button
                type="button"
                onClick={onOpenChatbot}
                className="group flex items-center gap-1.5 transition-transform hover:scale-102 active:scale-95 cursor-pointer animate-in fade-in slide-in-from-right-2 duration-200"
                title={isChatbotOpen ? 'Close BUILD-SAFE AI chat' : 'Chat with BUILD-SAFE AI'}
                aria-label={isChatbotOpen ? 'Close BUILD-SAFE AI chat' : 'Open BUILD-SAFE AI chat'}
              >
                {!isChatbotOpen && (
                  <div className="flex items-center gap-1.5 rounded-full bg-slate-900/90 text-white px-2.5 py-1 text-[10.5px] font-semibold shadow-lg backdrop-blur border border-slate-700/60 pointer-events-none select-none">
                    <Sparkles className="h-3 w-3 text-emerald-400" />
                    <span>BUILD-SAFE AI</span>
                  </div>
                )}
                <div
                  className={`relative flex h-9 w-9 items-center justify-center rounded-full text-white shadow-xl transition-all ${
                    isChatbotOpen
                      ? 'bg-slate-900 hover:bg-slate-800 ring-2 ring-slate-900/20'
                      : 'bg-gradient-to-tr from-emerald-700 via-teal-700 to-emerald-600 ring-4 ring-emerald-500/25 shadow-emerald-900/30'
                  }`}
                >
                  {isChatbotOpen ? (
                    <X className="h-4.5 w-4.5" />
                  ) : (
                    <>
                      <MessageSquareText className="h-4.5 w-4.5 transition-transform group-hover:scale-110 duration-200" />
                      {/* Online pulse indicator */}
                      <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border-2 border-white" />
                      </span>
                    </>
                  )}
                </div>
              </button>
            )}
          </div>
          {highlightedFacility && (
            <div className="absolute top-2.5 left-2.5 z-20 flex items-center justify-between gap-3 rounded-xl border border-emerald-300 bg-white/95 px-3 py-2 shadow-lg backdrop-blur-sm text-xs max-w-[85%]">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-[9.5px] font-bold text-emerald-700 uppercase tracking-wider">
                  <span>📍 Live Route Trace</span>
                  <span className="rounded bg-emerald-100 px-1 text-[8.5px] text-emerald-800">
                    {highlightedFacility.category?.replace(/_/g, ' ') ?? 'Facility'}
                  </span>
                </div>
                <div className="truncate font-bold text-slate-900 text-xs">
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
                className="shrink-0 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
                title="Reset view to proposed site"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
          {!mapReady && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-900/20 text-xs font-medium text-white">
              Loading site preview…
            </div>
          )}
        </div>

        <section className="flex min-h-0 flex-col">
          <div className="shrink-0 border-b border-slate-100 px-2.5 py-1.5 sm:px-3 sm:py-2">
            <h2 className="text-[11px] font-bold text-slate-900 sm:text-xs">AI Hazard Assessment</h2>
            <p className="text-[8px] text-slate-500 sm:text-[9px]">
              Demonstration report · not an official certificate
            </p>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-2 py-1.5 sm:px-2.5 sm:py-2">
            <AssessmentResultsCard
              result={result}
              report
              onSelectFacility={onSelectFacility}
              selectedFacilityName={highlightedFacility?.name ?? null}
            />
          </div>
        </section>
      </div>
    </article>
  )
}

/** Wrapper with border for modal preview */
export function AssessmentReportFrame({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-5xl overflow-hidden rounded border border-slate-300 bg-white shadow-md">
      {children}
    </div>
  )
}
