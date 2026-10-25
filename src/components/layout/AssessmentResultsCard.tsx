import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { GoogleEarthLink } from '@/components/layout/GoogleEarthLink'
import { Navigation } from 'lucide-react'
import type { AssessmentRow, SiteAssessmentResult } from '@/types'

export interface HighlightedFacilityInfo {
  name: string
  category?: string
  coords: [number, number]
  distanceM?: number
  valueText?: string
}

function ResultSection({
  title,
  rows,
  report,
  onSelectFacility,
  selectedFacilityName,
}: {
  title: string
  rows: AssessmentRow[]
  report?: boolean
  onSelectFacility?: (facility: HighlightedFacilityInfo | null) => void
  selectedFacilityName?: string | null
}) {
  return (
    <div className={report ? 'space-y-1' : 'space-y-1'}>
      <div className="flex items-center justify-between">
        <h4
          className={
            report
              ? 'text-[10px] font-bold tracking-wide text-teal-800'
              : 'text-[11px] font-bold tracking-wide text-teal-800'
          }
        >
          {title}
        </h4>
        {onSelectFacility && rows.some((r) => r.facilityCoords) && (
          <span className="text-[9px] font-semibold text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200/60">
            Click to trace on map
          </span>
        )}
      </div>
      <div className="overflow-hidden rounded border border-slate-200">
        {rows.map((row, index) => {
          const isProhibited = row.value.includes('🚫') || row.value.includes('PROHIBITED')
          const isRestricted =
            !isProhibited &&
            (row.value.includes('⚠️') ||
              row.value.includes('RESTRICTED') ||
              row.value.includes('Data Gap'))

          const isClickable = Boolean(row.facilityCoords && onSelectFacility)
          const isSelected = Boolean(
            selectedFacilityName &&
              (selectedFacilityName === row.facilityName || selectedFacilityName === row.label),
          )

          const cellContent = (
            <>
              <span
                className={`font-medium leading-snug flex items-center gap-1.5 ${
                  isProhibited
                    ? 'text-red-800 font-bold'
                    : isSelected
                    ? 'text-teal-900 font-bold'
                    : 'text-slate-600'
                }`}
              >
                {isClickable && (
                  <Navigation
                    className={`h-3 w-3 shrink-0 transition-transform ${
                      isSelected
                        ? 'text-teal-700 rotate-45 scale-110'
                        : 'text-slate-400 group-hover:text-teal-600 group-hover:scale-110'
                    }`}
                  />
                )}
                <span>{row.label}</span>
              </span>
              <span
                className={`text-right font-semibold leading-snug flex items-center justify-end gap-1.5 ${
                  isProhibited ? 'text-red-700' : isSelected ? 'text-teal-900' : 'text-slate-900'
                }`}
              >
                <span>{row.value}</span>
                {isSelected && (
                  <span className="rounded bg-teal-600 px-1.5 py-0.2 text-[8px] font-bold text-white shrink-0 tracking-wide">
                    Live Route
                  </span>
                )}
              </span>
            </>
          )

          if (isClickable) {
            return (
              <button
                type="button"
                key={row.label}
                onClick={() => {
                  if (isSelected) {
                    onSelectFacility?.(null)
                  } else if (row.facilityCoords) {
                    onSelectFacility?.({
                      name: row.facilityName || row.label,
                      category: row.category,
                      coords: row.facilityCoords,
                      distanceM: row.facilityDistanceM,
                      valueText: row.value,
                    })
                  }
                }}
                className={`group grid w-full grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] gap-2 border-b border-slate-100 px-2.5 text-left transition-all last:border-0 py-1.5 text-[11px] ${
                  isSelected
                    ? 'bg-teal-100/90 text-teal-950 ring-1 ring-inset ring-teal-500/60 shadow-inner'
                    : 'hover:bg-teal-50/80 hover:text-teal-950 cursor-pointer'
                }`}
                title={isSelected ? 'Click to clear live route' : 'Click to fly to this facility and trace connection line on map'}
              >
                {cellContent}
              </button>
            )
          }

          return (
            <div
              key={row.label}
              className={`grid grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] gap-2 border-b border-slate-100 px-2.5 last:border-0 ${
                report ? 'py-1.5 text-[10px]' : 'py-1.5 text-[11px]'
              } ${
                isProhibited
                  ? 'bg-red-50 text-red-950 font-medium'
                  : isRestricted
                    ? 'bg-amber-50/70 text-amber-950'
                    : report && index % 2 === 0
                      ? 'bg-slate-50'
                      : ''
              }`}
            >
              {cellContent}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export interface AssessmentResultsCardProps {
  result: SiteAssessmentResult | null
  /** Inline inside map popup — no outer Card wrapper */
  compact?: boolean
  /** Tighter rows for A4 report export */
  report?: boolean
  onSelectFacility?: (facility: HighlightedFacilityInfo | null) => void
  selectedFacilityName?: string | null
}

export function AssessmentResultsCard({
  result,
  compact = false,
  report = false,
  onSelectFacility,
  selectedFacilityName,
}: AssessmentResultsCardProps) {
  if (!result) {
    if (compact) {
      return (
        <p className="text-xs text-slate-500">
          Results appear here after you assess a site.
        </p>
      )
    }
    return (
      <Card>
        <CardHeader>
          <CardTitle>Assessment Results</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-500">
            Enter coordinates and building type, then click Assess site to generate a Hazard
            Hunter–style report for the proposed location.
          </p>
        </CardContent>
      </Card>
    )
  }

  const body = (
    <>
      {!report && (
        <div className="rounded-md border border-slate-200 bg-slate-50 p-2.5 text-[11px] text-slate-800 space-y-1.5">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="font-semibold text-slate-900">
              Municipality: {result.coverage?.municipality ?? 'Lasam'} ({result.coverage?.province ?? 'Cagayan'})
            </span>
            <span
              className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                result.coverage?.confidence === 'HIGH'
                  ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                  : result.coverage?.confidence === 'MODERATE'
                    ? 'bg-amber-100 text-amber-900 border border-amber-300'
                    : 'bg-red-100 text-red-900 border border-red-300'
              }`}
            >
              {result.coverage?.confidenceLabel ?? 'High Confidence'}
            </span>
          </div>

          {result.coverage && !result.coverage.isLasamLocal && (
            <div className="rounded border border-amber-300 bg-amber-50 p-2 text-[10px] text-amber-950 space-y-1">
              <p className="font-bold flex items-center gap-1">
                ⚠️ Dataset Coverage Alert ({result.coverage.municipality})
              </p>
              <p className="leading-snug">
                Regional seismic faults and volcanic data are active. Local DENR-MGB detailed flood and municipal CLUP layers are currently Lasam-specific.
              </p>
              <p className="font-semibold text-amber-900">
                Zero-Hallucination Policy: Unmapped layers are flagged as "Unsurveyed / Data Gap" — NOT "Safe" — to prevent false safety assumptions.
              </p>
            </div>
          )}

          <div className="flex items-center justify-between pt-1 border-t border-slate-200 text-[10px] text-slate-600">
            <span>
              Target:{' '}
              <strong>
                {result.input.category === 'farm_lot'
                  ? `🌾 ${result.input.cropType ?? 'Farm Lot'}`
                  : `🏢 ${result.input.buildingType ?? 'Building'}`}
              </strong>
            </span>
            <span>Coords: {result.input.lat.toFixed(5)}° N, {result.input.lng.toFixed(5)}° E</span>
          </div>
          <GoogleEarthLink
            lat={result.input.lat}
            lng={result.input.lng}
            siteTitle={result.input.category === 'farm_lot' ? `Proposed Farm Lot (${result.input.cropType})` : result.input.buildingType}
            className="pt-1 pointer-events-auto"
          />
        </div>
      )}
      {report && result.coverage && (
        <div className="rounded border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[9px] text-slate-700 flex items-center justify-between gap-2">
          <span>
            <strong>Location:</strong> {result.coverage.municipality}, Cagayan ·{' '}
            <span
              className={`font-semibold ${
                result.coverage.isLasamLocal ? 'text-teal-800' : 'text-amber-800'
              }`}
            >
              {result.coverage.confidenceLabel}
            </span>
          </span>
          <span className="text-[8px] text-slate-500">
            {result.coverage.isLasamLocal ? 'Full LGU datasets active' : 'Regional datasets active · local gaps flagged'}
          </span>
        </div>
      )}

      {result.input.category === 'farm_lot' && result.cropSuitability && (
        <div
          className={`rounded-xl border p-2.5 ${
            result.cropSuitability.level === 'HIGHLY_SUITABLE'
              ? 'border-emerald-300 bg-emerald-50/90 text-emerald-950'
              : result.cropSuitability.level === 'CONDITIONALLY_SUITABLE'
              ? 'border-amber-300 bg-amber-50/90 text-amber-950'
              : 'border-red-300 bg-red-50/90 text-red-950'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                Agro-Climatic Suitability Rating
              </span>
              <p className="text-xs font-bold leading-snug">{result.cropSuitability.title}</p>
            </div>
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-[9.5px] font-bold border ${result.cropSuitability.badgeClass}`}
            >
              {result.cropSuitability.badge}
            </span>
          </div>
        </div>
      )}

      {result.input.category === 'farm_lot' && result.farmAssessment && (
        <ResultSection
          title="FARM LOT & CROP HAZARD SUITABILITY"
          rows={result.farmAssessment}
          report={report}
        />
      )}

      <ResultSection title="HYDRO-METEOROLOGICAL HAZARD ASSESSMENT" rows={result.hydromet} report={report} />
      {result.input.category !== 'farm_lot' && (
        <>
          {result.lgu.some(
            (r) =>
              (r.label.includes('land use') || r.label.includes('Zoning')) &&
              r.value.includes('Agricultural Land') &&
              r.value.includes('🚫'),
          ) && (
            <div
              className={`rounded-xl border border-red-300 bg-red-50/95 p-3 text-red-950 space-y-1.5 shadow-sm ${
                report ? 'text-[9.5px]' : 'text-xs'
              }`}
            >
              <div className="flex items-center gap-1.5 font-bold text-red-900">
                <span className="text-sm">🚫</span>
                <span className="uppercase tracking-wider font-extrabold text-[10px] sm:text-[11px]">
                  CLUP Zoning Alert: Agricultural Land (Non-Conforming Land-Use)
                </span>
              </div>
              <p className="leading-snug">
                This parcel is officially designated for <strong>Agricultural Land Use</strong> under the Lasam Comprehensive Land Use Plan (CLUP 2020). Erecting a <strong>{result.input.buildingType ?? 'residential structure'}</strong> on agricultural land is a non-conforming use.
              </p>
              <div className="rounded border border-red-200 bg-white/80 p-2 text-[10px] sm:text-[10.5px] text-red-900 leading-relaxed">
                <strong>Statutory Requirements:</strong> Under <strong>RA 8435 (AFMA)</strong> and <strong>DAR Administrative Order No. 1 (2019)</strong>, agricultural land conversion requires formal <strong>DAR Land Use Conversion Clearance</strong> and a <strong>Sangguniang Bayan Reclassification Ordinance</strong> (RA 7160 Sec. 20) before any building permit can be lawfully granted.
              </div>
            </div>
          )}
          <ResultSection title="LGU DATASET ASSESSMENT" rows={result.lgu} report={report} />
        </>
      )}
      <ResultSection title="SEISMIC HAZARD ASSESSMENT" rows={result.seismic} report={report} />
      <ResultSection title="VOLCANIC HAZARD ASSESSMENT" rows={result.volcanic} report={report} />
      <div>
        <ResultSection
          title={
            result.input.category === 'farm_lot'
              ? 'NEAREST FARM BUSINESSES & AGRI FACILITIES'
              : 'CRITICAL FACILITIES'
          }
          rows={result.facilities}
          report={report}
          onSelectFacility={onSelectFacility}
          selectedFacilityName={selectedFacilityName}
        />
        <p className={`text-slate-500 italic ${report ? 'text-[8px] mt-0.5' : 'text-[9.5px] mt-1'}`}>
          {result.input.category === 'farm_lot'
            ? '🌾 Estimated hauling & travel times based on DPWH Region II rural road network (circuity factor ~1.30, avg. 30–45 km/h driving speed).'
            : '🚗 Travel times estimated by car based on DPWH Region II road network (circuity factor ~1.30, avg. 30–45 km/h driving speed).'}
        </p>
      </div>
    </>
  )

  if (report) {
    return <div className="space-y-2.5">{body}</div>
  }

  if (compact) {
    return (
      <div className="space-y-3">
        <p className="text-xs font-semibold text-slate-900">Assessment Results</p>
        {body}
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Assessment Results</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">{body}</CardContent>
    </Card>
  )
}
