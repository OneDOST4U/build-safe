import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Download, Loader2, Minus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  AssessmentReportFrame,
  AssessmentReportSheet,
} from '@/components/layout/AssessmentReportSheet'
import { type ProposedBuildingPreviewMapHandle } from '@/components/layout/ProposedBuildingPreviewMap'
import { exportAssessmentReportPdf } from '@/lib/assessment/exportAssessmentPdf'
import { getNearbyBuildings } from '@/lib/assessment/nearbyBuildings'
import type { ProposedBuildingType } from '@/lib/assessment/buildingTypes'
import type { HighlightedFacilityInfo } from '@/components/layout/AssessmentResultsCard'
import type { BuildingCollection, SiteAssessmentResult } from '@/types'

interface AssessmentReportModalProps {
  open: boolean
  result: SiteAssessmentResult | null
  buildings: BuildingCollection | null
  onClose: () => void
  onMinimize?: () => void
  highlightedFacility?: HighlightedFacilityInfo | null
  onSelectFacility?: (facility: HighlightedFacilityInfo | null) => void
  onOpenChatbot?: () => void
  isChatbotOpen?: boolean
}

export function AssessmentReportModal({
  open,
  result,
  buildings,
  onClose,
  onMinimize,
  highlightedFacility = null,
  onSelectFacility,
  onOpenChatbot,
  isChatbotOpen = false,
}: AssessmentReportModalProps) {
  const mapRef = useRef<ProposedBuildingPreviewMapHandle>(null)
  const [mapReady, setMapReady] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)

  const nearbyBuildings = useMemo(() => {
    if (!result) return { type: 'FeatureCollection' as const, features: [] }
    return getNearbyBuildings(buildings, result.input.lng, result.input.lat)
  }, [buildings, result])

  useEffect(() => {
    if (open && result) {
      setMapReady(false)
      setExportError(null)
    }
  }, [open, result])

  const handleExportPdf = useCallback(async () => {
    if (!result) return
    setExporting(true)
    setExportError(null)

    try {
      const mapDataUrl = await mapRef.current?.captureSnapshot()
      if (!mapDataUrl) throw new Error('Map snapshot failed')

      await exportAssessmentReportPdf({ mapDataUrl, result })
    } catch (err) {
      console.error(err)
      setExportError('Could not export PDF. Wait for the map preview to finish loading, then try again.')
    } finally {
      setExporting(false)
    }
  }, [result])

  if (!open || !result) return null

  const isFarmLot = result.input.category === 'farm_lot'
  const displayTitle = isFarmLot
    ? `Farm Lot: ${result.cropSuitability?.cropLabel ?? result.input.cropType ?? 'Agricultural Crop'}`
    : (result.input.buildingType ?? 'Proposed Building')
  const buildingType = (result.input.buildingType ?? 'Residential (Single-family)') as ProposedBuildingType
  const { lng, lat } = result.input

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/55 p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="assessment-report-title"
    >
      <div className="flex max-h-[96vh] w-full max-w-6xl flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xl">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
          <div>
            <h2 id="assessment-report-title" className="text-sm font-semibold text-slate-900">
              Site Assessment Report
            </h2>
            <p className="text-[11px] text-slate-500">A4 landscape · matches official report layout</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              className="gap-2 bg-sky-600 hover:bg-sky-700 text-white font-semibold shadow-xs"
              onClick={handleExportPdf}
              disabled={exporting || !mapReady}
              title={!mapReady ? 'Wait for map preview to load' : 'Save as A4 landscape PDF'}
            >
              {exporting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Save PDF (A4)
            </Button>
            {onMinimize && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-xs text-slate-700 hover:text-slate-900 border-slate-300 font-medium"
                onClick={onMinimize}
                title="Minimize report to explore the full live map & route"
              >
                <Minus className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Minimize</span>
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors"
              onClick={onClose}
              title="Exit and close entire site assessment & map route"
              aria-label="Exit assessment"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {exportError && (
          <p className="border-b border-red-100 bg-red-50 px-4 py-2 text-[11px] text-red-700">{exportError}</p>
        )}

        <div className="min-h-0 flex-1 overflow-auto bg-slate-100 p-3">
          <AssessmentReportFrame>
            <AssessmentReportSheet
              buildingType={buildingType}
              displayTitle={displayTitle}
              lat={lat}
              lng={lng}
              result={result}
              nearbyBuildings={nearbyBuildings}
              mapRef={mapRef}
              mapReady={mapReady}
              onMapReady={() => setMapReady(true)}
              highlightedFacility={highlightedFacility}
              onSelectFacility={onSelectFacility}
              onMinimize={onMinimize}
              onOpenChatbot={onOpenChatbot}
              isChatbotOpen={isChatbotOpen}
            />
          </AssessmentReportFrame>
        </div>
      </div>
    </div>
  )
}
