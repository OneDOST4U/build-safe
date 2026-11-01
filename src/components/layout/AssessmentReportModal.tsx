import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Download, Loader2, Minus, Sparkles, X, ZoomIn, ZoomOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  AssessmentReportFrame,
  AssessmentReportSheet,
} from '@/components/layout/AssessmentReportSheet'
import { type ProposedBuildingPreviewMapHandle } from '@/components/layout/ProposedBuildingPreviewMap'
import { exportAssessmentReportPdf } from '@/lib/assessment/exportAssessmentPdf'
import { getNearbyBuildings } from '@/lib/assessment/nearbyBuildings'
import { A4_LANDSCAPE_RATIO } from '@/lib/assessment/reportLayout'
import type { ProposedBuildingType } from '@/lib/assessment/buildingTypes'
import type { HighlightedFacilityInfo } from '@/components/layout/AssessmentResultsCard'
import type { BuildingCollection, SiteAssessmentResult } from '@/types'

const ZOOM_STEPS = [0.70, 0.80, 0.90, 1.0, 1.15, 1.30, 1.50]

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
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerSize, setContainerSize] = useState<{ width: number; height: number } | null>(null)
  const [zoomMode, setZoomMode] = useState<'fit' | number>('fit')
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
      setZoomMode('fit')
    }
  }, [open, result])

  // Track modal body container size for responsive fit-to-height scaling
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (entry && entry.contentRect.width > 0 && entry.contentRect.height > 0) {
        setContainerSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        })
      }
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [open])

  const currentZoomFactor = typeof zoomMode === 'number' ? zoomMode : 1.0

  const handleZoomIn = useCallback(() => {
    setZoomMode((prev) => {
      const current = typeof prev === 'number' ? prev : 1.0
      const next = ZOOM_STEPS.find((s) => s > current + 0.02)
      return next ?? 1.50
    })
  }, [])

  const handleZoomOut = useCallback(() => {
    setZoomMode((prev) => {
      const current = typeof prev === 'number' ? prev : 1.0
      const reversed = [...ZOOM_STEPS].reverse()
      const next = reversed.find((s) => s < current - 0.02)
      return next ?? 0.70
    })
  }, [])

  const handleResetZoom = useCallback(() => {
    setZoomMode('fit')
  }, [])

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

  // Compute responsive dimensions to fit cleanly within available viewport height & width
  const availW = Math.max(300, (containerSize?.width ?? 980) - 20)
  const availH = Math.max(220, (containerSize?.height ?? 540) - 20)

  // 0.96 buffer leaves a comfortable margin around the A4 sheet so it never touches edges
  const fitBaseW = Math.min(availW * 0.96, (availH * 0.96) * A4_LANDSCAPE_RATIO, 1080)
  const fitBaseH = fitBaseW / A4_LANDSCAPE_RATIO

  const sheetWidth = Math.round(fitBaseW * currentZoomFactor)
  const sheetHeight = Math.round(fitBaseH * currentZoomFactor)

  const isOverflowing = sheetWidth > availW || sheetHeight > availH

  return (
    <div
      className={`fixed top-0 bottom-0 left-0 ${
        isChatbotOpen
          ? 'right-0 sm:right-[420px] lg:right-[460px] xl:right-[480px]'
          : 'right-0'
      } z-[60] flex items-center justify-center bg-black/60 p-2 sm:p-3 transition-all duration-300`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="assessment-report-title"
    >
      <div className={`flex h-[94vh] max-h-[96vh] w-full ${isChatbotOpen ? 'max-w-5xl' : 'max-w-6xl'} flex-col overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-2xl transition-all duration-300`}>
        {/* Header with Title, Zoom Controls, AI Button & Actions */}
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 px-3.5 py-2.5 bg-slate-50/70">
          <div className="min-w-0">
            <h2 id="assessment-report-title" className="text-sm font-bold text-slate-900 truncate">
              Site Assessment Report
            </h2>
            <p className="text-[11px] text-slate-500">A4 landscape · official report layout</p>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap justify-end">
            {/* Interactive Zoom Controls */}
            <div className="flex items-center rounded-lg border border-slate-200 bg-white p-0.5 shadow-2xs">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                onClick={handleZoomOut}
                disabled={currentZoomFactor <= 0.72}
                title="Zoom out"
                aria-label="Zoom out"
              >
                <ZoomOut className="h-3.5 w-3.5" />
              </Button>
              <button
                type="button"
                onClick={handleResetZoom}
                className="px-2 py-0.5 text-[11px] font-semibold text-slate-700 hover:text-emerald-700 hover:bg-emerald-50 rounded transition-colors cursor-pointer select-none"
                title="Click to reset to Fit Screen"
              >
                {zoomMode === 'fit' ? 'Fit' : `${Math.round(currentZoomFactor * 100)}%`}
              </button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                onClick={handleZoomIn}
                disabled={currentZoomFactor >= 1.48}
                title="Zoom in"
                aria-label="Zoom in"
              >
                <ZoomIn className="h-3.5 w-3.5" />
              </Button>
            </div>

            {/* Direct Ask AI Button in Header */}
            {onOpenChatbot && (
              <Button
                size="sm"
                variant={isChatbotOpen ? 'secondary' : 'outline'}
                className={`h-8 gap-1.5 text-xs font-semibold shadow-2xs transition-all ${
                  isChatbotOpen
                    ? 'bg-slate-900 text-white hover:bg-slate-800'
                    : 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100 hover:text-emerald-900'
                }`}
                onClick={onOpenChatbot}
                title={isChatbotOpen ? 'Close BUILD-SAFE AI chat' : 'Open BUILD-SAFE AI chat assistant'}
              >
                <Sparkles className="h-3.5 w-3.5 text-emerald-500" />
                <span className="hidden sm:inline">BUILD-SAFE AI</span>
                <span className="sm:hidden">AI</span>
              </Button>
            )}

            {/* Save PDF (A4) */}
            <Button
              size="sm"
              className="h-8 gap-1.5 bg-sky-600 hover:bg-sky-700 text-white font-semibold shadow-xs text-xs"
              onClick={handleExportPdf}
              disabled={exporting || !mapReady}
              title={!mapReady ? 'Wait for map preview to load' : 'Save as A4 landscape PDF'}
            >
              {exporting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              <span>Save PDF</span>
            </Button>

            {/* Minimize */}
            {onMinimize && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-xs text-slate-700 hover:text-slate-900 border-slate-300 font-medium"
                onClick={onMinimize}
                title="Minimize report to explore on 3D map & road route"
              >
                <Minus className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Minimize</span>
              </Button>
            )}

            {/* Close */}
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

        {/* Modal Body: Automatically sized with zero vertical scroll in Fit mode */}
        <div
          ref={containerRef}
          className={`relative min-h-0 flex-1 bg-slate-100 flex items-center justify-center p-2 sm:p-3 ${
            isOverflowing ? 'overflow-auto custom-scrollbar' : 'overflow-hidden'
          }`}
        >
          <AssessmentReportFrame
            style={{
              width: `${sheetWidth}px`,
              height: `${sheetHeight}px`,
              maxWidth: isOverflowing ? undefined : '100%',
              maxHeight: isOverflowing ? undefined : '100%',
            }}
          >
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
