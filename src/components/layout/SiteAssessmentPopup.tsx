import { useMemo } from 'react'
import { AlertTriangle, Ban, ClipboardList, MapPin, RotateCcw, ShieldCheck, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { AssessmentResultsCard, type HighlightedFacilityInfo } from '@/components/layout/AssessmentResultsCard'
import { GoogleEarthLink } from '@/components/layout/GoogleEarthLink'
import type { FeatureCollection } from 'geojson'
import {
  PROPOSED_BUILDING_TYPE_GROUPS,
  type ProposedBuildingType,
} from '@/lib/assessment/buildingTypes'
import {
  type AssessmentTargetCategory,
  type FarmCropType,
  FARM_CROP_OPTIONS,
  DEFAULT_FARM_CROP,
} from '@/lib/assessment/farmLot'
import { identifyMunicipality, isPointInsideLasam } from '@/lib/assessment/coverage'
import { getLandUseAtPoint } from '@/lib/simulation/lguLayerQuery'
import type { WaterBodyCheckResult } from '@/lib/assessment/waterBody'
import type { SiteAssessmentResult } from '@/types'

export interface SiteAssessmentPopupProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  assessLat: string
  assessLng: string
  assessCategory?: AssessmentTargetCategory
  assessBuildingType: ProposedBuildingType
  assessCropType?: FarmCropType
  assessmentResult: SiteAssessmentResult | null
  assessError: string | null
  boundary?: FeatureCollection | null
  landUse?: FeatureCollection | null
  highlightedFacility?: HighlightedFacilityInfo | null
  onSelectFacility?: (facility: HighlightedFacilityInfo | null) => void
  onAssessLatChange: (v: string) => void
  onAssessLngChange: (v: string) => void
  onAssessCategoryChange?: (v: AssessmentTargetCategory) => void
  onAssessBuildingTypeChange: (v: ProposedBuildingType) => void
  onAssessCropTypeChange?: (v: FarmCropType) => void
  onAssessSite: () => void
  onPickSiteOnMap: () => void
  pickingOnMap?: boolean
  pendingSiteCoords?: [number, number] | null
  waterBodyCheck?: WaterBodyCheckResult | null
  onConfirmMapSite?: () => void
  onCancelPickOnMap?: () => void
  onRepickSite?: () => void
  onOpenReliability?: () => void
}

export function SiteAssessmentPopup({
  open,
  onOpenChange,
  assessLat,
  assessLng,
  assessCategory = 'building',
  assessBuildingType,
  assessCropType = DEFAULT_FARM_CROP,
  assessmentResult,
  assessError,
  boundary = null,
  landUse = null,
  highlightedFacility = null,
  onSelectFacility,
  onAssessLatChange,
  onAssessLngChange,
  onAssessCategoryChange,
  onAssessBuildingTypeChange,
  onAssessCropTypeChange,
  onAssessSite,
  onPickSiteOnMap,
  pickingOnMap = false,
  pendingSiteCoords = null,
  waterBodyCheck = null,
  onConfirmMapSite,
  onCancelPickOnMap,
  onRepickSite,
  onOpenReliability,
}: SiteAssessmentPopupProps) {
  const isPendingInsideLasam = pendingSiteCoords
    ? isPointInsideLasam(pendingSiteCoords[0], pendingSiteCoords[1], boundary)
    : true

  const numLat = Number(assessLat)
  const numLng = Number(assessLng)
  const isInputValidNumber = Number.isFinite(numLat) && Number.isFinite(numLng)
  const isInputInsideLasam = isInputValidNumber
    ? isPointInsideLasam(numLng, numLat, boundary)
    : true

  const pendingLandUse = useMemo(() => {
    if (!pendingSiteCoords || !landUse) return null
    return getLandUseAtPoint(pendingSiteCoords, landUse)
  }, [pendingSiteCoords, landUse])

  const pendingLandUseClass = String(pendingLandUse?.properties?.land_use_class ?? '').toLowerCase().trim()
  const pendingLandUseLabel = String(pendingLandUse?.properties?.land_use_label ?? '').trim()
  const isPendingAgri =
    pendingLandUseClass === 'agriculture' ||
    pendingLandUseClass === 'crops' ||
    pendingLandUseLabel.toLowerCase().includes('agri') ||
    pendingLandUseLabel.toLowerCase().includes('crop')

  const isAgriConflictPending =
    isPendingAgri &&
    assessCategory === 'building' &&
    assessBuildingType !== 'Agricultural structure (barn, poultry shed)'

  const inputLandUse = useMemo(() => {
    if (!isInputValidNumber || !landUse) return null
    return getLandUseAtPoint([numLng, numLat], landUse)
  }, [isInputValidNumber, numLng, numLat, landUse])

  const inputLandUseClass = String(inputLandUse?.properties?.land_use_class ?? '').toLowerCase().trim()
  const inputLandUseLabel = String(inputLandUse?.properties?.land_use_label ?? '').trim()
  const isInputAgri =
    inputLandUseClass === 'agriculture' ||
    inputLandUseClass === 'crops' ||
    inputLandUseLabel.toLowerCase().includes('agri') ||
    inputLandUseLabel.toLowerCase().includes('crop')

  const isAgriConflictInput =
    isInputAgri &&
    assessCategory === 'building' &&
    assessBuildingType !== 'Agricultural structure (barn, poultry shed)'

  return (
    <>
      <div className="pointer-events-none absolute left-3 top-3 z-20 flex flex-col items-start gap-2">
        <button
          type="button"
          className={`pointer-events-auto flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-semibold shadow-xl backdrop-blur-md transition-all hover:scale-[1.02] ${
            open || pickingOnMap
              ? 'border-slate-900 bg-slate-900 text-white shadow-slate-900/20'
              : 'border-slate-200/90 bg-white/95 text-slate-800 hover:bg-slate-50 hover:text-slate-900'
          }`}
          onClick={() => {
            if (pickingOnMap) {
              onCancelPickOnMap?.()
              onOpenChange(true)
              return
            }
            onOpenChange(!open)
          }}
          aria-expanded={open}
        >
          <ClipboardList className={`h-3.5 w-3.5 ${open || pickingOnMap ? 'text-teal-400' : 'text-teal-600'}`} />
          <span>Site Assessment</span>
        </button>

        {pickingOnMap && !open && !pendingSiteCoords && (
          <div className="pointer-events-auto flex max-w-[min(92vw,20rem)] items-center gap-2 rounded-2xl border border-sky-200/90 bg-sky-50/95 px-3.5 py-2 text-xs text-sky-950 shadow-xl backdrop-blur-md">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-sky-700" />
            <span className="flex-1 leading-snug">
              Click map inside Lasam to drop {assessCategory === 'farm_lot' ? 'farm lot' : 'building site'}.
            </span>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 shrink-0 px-2 text-sky-800 hover:bg-sky-100 rounded-lg text-xs"
              onClick={() => {
                onCancelPickOnMap?.()
                onOpenChange(true)
              }}
            >
              Cancel
            </Button>
          </div>
        )}

        {pickingOnMap && !open && pendingSiteCoords && (
          <div className="pointer-events-auto w-[min(92vw,21.5rem)] rounded-2xl border border-slate-200/90 bg-white/95 p-4 shadow-2xl backdrop-blur-md space-y-3 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start gap-2.5">
              <div className="relative mt-0.5">
                <span className={`absolute -inset-1 rounded-full animate-ping ${isPendingInsideLasam ? 'bg-sky-400/30' : 'bg-amber-400/30'}`} />
                <img
                  src="/markers/site-pin.svg"
                  alt=""
                  className={`relative h-8 w-6 shrink-0 object-contain drop-shadow ${!isPendingInsideLasam ? 'grayscale contrast-125' : ''}`}
                  aria-hidden
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <p className="text-xs font-bold text-slate-900">
                    {assessCategory === 'farm_lot' ? `Proposed Farm Lot (${assessCropType.split(' ')[0]})` : 'Proposed Site Point'}
                  </p>
                  <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${
                    isPendingInsideLasam
                      ? 'bg-sky-100 text-sky-800'
                      : 'bg-amber-100 text-amber-900 border border-amber-300'
                  }`}>
                    {identifyMunicipality(pendingSiteCoords[0], pendingSiteCoords[1], boundary)}
                  </span>
                </div>
                <p className="mt-0.5 font-mono text-[11px] text-slate-700">
                  {pendingSiteCoords[1].toFixed(5)}° N, {pendingSiteCoords[0].toFixed(5)}° E
                </p>
                <GoogleEarthLink
                  lat={pendingSiteCoords[1]}
                  lng={pendingSiteCoords[0]}
                  siteTitle={assessCategory === 'farm_lot' ? `Proposed Farm Lot (${assessCropType})` : assessBuildingType}
                  className="mt-1.5"
                />
              </div>
            </div>

            {/* Outside Lasam Municipal Boundary Alert */}
            {!isPendingInsideLasam && (
              <div className="rounded-lg border border-amber-300 bg-amber-50 p-2.5 text-xs text-amber-950">
                <div className="flex items-center gap-1.5 font-bold text-amber-800">
                  <Ban className="h-4 w-4 shrink-0 text-amber-700" />
                  <span>Outside Lasam Boundary — Confirmation Disabled</span>
                </div>
                <p className="mt-1 text-[10.5px] leading-relaxed text-amber-900">
                  Location is in <strong>{identifyMunicipality(pendingSiteCoords[0], pendingSiteCoords[1], boundary)}</strong>. Site assessment and confirmation are strictly restricted to the official municipal territory of Lasam.
                </p>
              </div>
            )}

            {/* Prohibited Water Body Warning Alert */}
            {waterBodyCheck?.isWaterBody && (
              <div className="rounded-lg border border-red-300 bg-red-50 p-2.5 text-xs text-red-950">
                <div className="flex items-center gap-1.5 font-bold text-red-700">
                  <Ban className="h-4 w-4 shrink-0" />
                  <span>Water Body — Construction Prohibited</span>
                </div>
                <p className="mt-1 text-[10.5px] leading-relaxed text-red-900">
                  Location is directly inside <strong>{waterBodyCheck.nearestWaterBodyName}</strong>. Under Presidential Decree No. 1067 (Water Code, Art. 51), construction of any structure is strictly prohibited.
                </p>
              </div>
            )}

            {/* Within Legal Riparian Easement Alert */}
            {waterBodyCheck?.isWithinEasement && !waterBodyCheck?.isWaterBody && (
              <div className="rounded-lg border border-amber-300 bg-amber-50 p-2.5 text-xs text-amber-950">
                <div className="flex items-center gap-1.5 font-bold text-amber-800">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>Within Riparian Easement ({waterBodyCheck.nearestDistanceM}m)</span>
                </div>
                <p className="mt-1 text-[10.5px] leading-relaxed text-amber-900">
                  Location is within statutory easement margin of {waterBodyCheck.nearestWaterBodyName}. Protected under PD 1067.
                </p>
              </div>
            )}

            {/* CLUP Agricultural Land Conflict Alert */}
            {isAgriConflictPending && (
              <div className="rounded-lg border border-red-300 bg-red-50 p-2.5 text-xs text-red-950">
                <div className="flex items-center gap-1.5 font-bold text-red-700">
                  <span className="text-sm">🚫</span>
                  <span>CLUP Land Use: Agricultural Land</span>
                </div>
                <p className="mt-1 text-[10.5px] leading-relaxed text-red-900">
                  Parcel is officially designated as <strong>Agricultural Land</strong> under Lasam CLUP (2020). Constructing a <strong>{assessBuildingType}</strong> here is a non-conforming use requiring DAR conversion clearance.
                </p>
              </div>
            )}

            {isPendingAgri && assessCategory === 'farm_lot' && (
              <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-2 text-xs text-emerald-950">
                <p className="text-[10.5px] leading-snug text-emerald-900 font-medium">
                  🌾 <strong>CLUP Agricultural Land:</strong> 100% conforming with designated agricultural zoning.
                </p>
              </div>
            )}

            <p className="text-[10px] leading-tight text-slate-500">
              {!isPendingInsideLasam
                ? '⚠️ Placement disabled outside boundary. Click inside Lasam to relocate.'
                : '📍 Point dropped on map. Click elsewhere to relocate.'}
            </p>

            <div className="flex items-center gap-1.5 pt-1 border-t border-slate-100">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 px-2.5 text-xs text-slate-600 hover:bg-slate-100"
                onClick={() => {
                  onCancelPickOnMap?.()
                  onOpenChange(true)
                }}
              >
                Cancel
              </Button>
              {onRepickSite && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  title="Pick up pin and attach back to cursor"
                  className="h-8 px-2.5 text-xs text-sky-700 hover:bg-sky-50 border-sky-200"
                  onClick={onRepickSite}
                >
                  <RotateCcw className="h-3 w-3 mr-1" />
                  Re-pick
                </Button>
              )}
              <Button
                type="button"
                size="sm"
                disabled={!isPendingInsideLasam}
                className={`h-8 flex-1 text-xs font-semibold ${
                  !isPendingInsideLasam
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed hover:bg-slate-200 opacity-60'
                    : waterBodyCheck?.isWaterBody
                    ? 'bg-red-700 hover:bg-red-800 text-white'
                    : 'bg-teal-700 hover:bg-teal-800 text-white'
                }`}
                onClick={onConfirmMapSite}
              >
                {!isPendingInsideLasam
                  ? 'Disabled (Outside)'
                  : waterBodyCheck?.isWaterBody
                  ? 'Confirm (Flagged)'
                  : 'Confirm Point'}
              </Button>
            </div>
          </div>
        )}
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
          aria-labelledby="site-assessment-title"
          onClick={() => onOpenChange(false)}
        >
          <div
            className="flex max-h-[min(90vh,42rem)] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-2xl animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-5 py-3.5">
              <div>
                <h3 id="site-assessment-title" className="text-sm font-bold text-slate-900">
                  {assessCategory === 'farm_lot'
                    ? 'Proposed Farm Lot & Crop Assessment'
                    : 'Proposed Building Site Assessment'}
                </h3>
                <p className="text-[11px] text-slate-500">
                  {assessCategory === 'farm_lot'
                    ? 'Crop resilience screening against flood, erosion & soil hazards'
                    : 'Screening against hazards & zoning rules'}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-lg text-slate-400 hover:text-slate-700"
                onClick={() => onOpenChange(false)}
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="min-h-0 flex-1 space-y-3.5 overflow-y-auto p-5">
              <div className="flex items-center justify-between gap-1 text-[11px] text-slate-500">
                <span>Supports Lasam, Lal-lo, and Northern Cagayan corridor.</span>
                {onOpenReliability && (
                  <button
                    type="button"
                    onClick={() => {
                      onOpenChange(false)
                      onOpenReliability()
                    }}
                    className="inline-flex items-center gap-1 font-semibold text-teal-700 hover:text-teal-900 underline text-[10.5px]"
                  >
                    <ShieldCheck className="h-3 w-3" />
                    Coverage info
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Latitude</Label>
                  <input
                    className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
                    value={assessLat}
                    onChange={(e) => onAssessLatChange(e.target.value)}
                    placeholder="18.0645"
                    inputMode="decimal"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Longitude</Label>
                  <input
                    className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
                    value={assessLng}
                    onChange={(e) => onAssessLngChange(e.target.value)}
                    placeholder="121.6015"
                    inputMode="decimal"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Site Land-Use Purpose</Label>
                <div className="grid grid-cols-2 gap-1.5 rounded-xl border border-slate-200 bg-slate-100/80 p-1">
                  <button
                    type="button"
                    onClick={() => onAssessCategoryChange?.('building')}
                    className={`flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-semibold transition-all ${
                      assessCategory === 'building'
                        ? 'bg-white text-slate-900 shadow-sm border border-slate-200/60'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <span>🏢</span>
                    <span>Building Structure</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onAssessCategoryChange?.('farm_lot')}
                    className={`flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-semibold transition-all ${
                      assessCategory === 'farm_lot'
                        ? 'bg-emerald-700 text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <span>🌾</span>
                    <span>Farm Lot / Crops</span>
                  </button>
                </div>
              </div>

              {assessCategory === 'building' ? (
                <div className="space-y-1">
                  <Label className="text-xs">Building / establishment type</Label>
                  <select
                    className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
                    value={assessBuildingType}
                    onChange={(e) =>
                      onAssessBuildingTypeChange(e.target.value as ProposedBuildingType)
                    }
                  >
                    {PROPOSED_BUILDING_TYPE_GROUPS.map((group) => (
                      <optgroup key={group.label} label={group.label}>
                        {group.types.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="space-y-1.5 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold text-slate-900">Intended Crop Variety</Label>
                    <span className="text-[10px] text-emerald-800 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                      DA-BSWM & MGB Screening
                    </span>
                  </div>
                  <select
                    className="w-full rounded-md border border-emerald-300 bg-white px-2 py-1.5 text-sm font-medium focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    value={assessCropType}
                    onChange={(e) => onAssessCropTypeChange?.(e.target.value as FarmCropType)}
                  >
                    {FARM_CROP_OPTIONS.map((crop) => (
                      <option key={crop.value} value={crop.value}>
                        {crop.icon} {crop.label}
                      </option>
                    ))}
                  </select>
                  {(() => {
                    const selected = FARM_CROP_OPTIONS.find((c) => c.value === assessCropType) ?? FARM_CROP_OPTIONS[0]
                    return (
                      <div className="rounded-lg border border-emerald-200/80 bg-emerald-50/60 p-2 text-[10.5px] leading-relaxed text-emerald-950">
                        <strong>Crop Profile:</strong> {selected.description}
                      </div>
                    )
                  })()}
                </div>
              )}

              {isInputValidNumber && !isInputInsideLasam && (
                <div className="rounded-md border border-amber-300 bg-amber-50 p-2 text-xs text-amber-950">
                  <div className="flex items-center gap-1 font-semibold text-amber-800">
                    <Ban className="h-3.5 w-3.5 shrink-0 text-amber-700" />
                    <span>Outside Lasam ({identifyMunicipality(numLng, numLat, boundary)})</span>
                  </div>
                  <p className="mt-0.5 text-[10.5px] text-amber-900 leading-snug">
                    Entered coordinates fall outside the official Lasam municipal boundary. Planning assessments are restricted to Lasam.
                  </p>
                </div>
              )}

              {isInputValidNumber && isInputInsideLasam && isAgriConflictInput && (
                <div className="rounded-md border border-red-300 bg-red-50 p-2 text-xs text-red-950 space-y-0.5">
                  <div className="flex items-center gap-1 font-semibold text-red-800">
                    <span className="text-sm">🚫</span>
                    <span>CLUP Land Use: Agricultural Land (Non-Conforming)</span>
                  </div>
                  <p className="text-[10.5px] text-red-900 leading-snug">
                    Entered coordinates fall on designated <strong>Agricultural Land</strong> under Lasam CLUP (2020). Developing a {assessBuildingType} requires DAR conversion clearance and SB zoning reclassification.
                  </p>
                </div>
              )}

              {isInputValidNumber && isInputInsideLasam && isInputAgri && assessCategory === 'farm_lot' && (
                <div className="rounded-md border border-emerald-300 bg-emerald-50/70 p-1.5 text-xs text-emerald-950">
                  <p className="text-[10.5px] text-emerald-900 leading-snug font-medium">
                    🌾 <strong>CLUP Zoning:</strong> Confirmed Agricultural Land (100% conforming for farm lot).
                  </p>
                </div>
              )}

              {assessError && <p className="text-[11px] text-red-600">{assessError}</p>}

              <div className="flex flex-col gap-2 pt-1">
                <Button
                  size="sm"
                  className={`w-full h-9 rounded-xl font-medium shadow-xs transition-all ${
                    isInputValidNumber && !isInputInsideLasam
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed hover:bg-slate-200'
                      : assessCategory === 'farm_lot'
                      ? 'bg-emerald-700 hover:bg-emerald-800 text-white'
                      : 'bg-slate-900 hover:bg-slate-800 text-white'
                  }`}
                  onClick={onAssessSite}
                  disabled={isInputValidNumber && !isInputInsideLasam}
                >
                  {isInputValidNumber && !isInputInsideLasam
                    ? 'Assessment Disabled (Outside Lasam)'
                    : assessCategory === 'farm_lot'
                    ? 'Run Farm Lot & Crop Hazard Assessment'
                    : 'Run Site Hazard Assessment'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full h-9 rounded-xl gap-2 border-slate-200 text-slate-700 hover:bg-slate-50 font-medium text-xs"
                  onClick={onPickSiteOnMap}
                >
                  <MapPin className="h-3.5 w-3.5 text-teal-600" />
                  {assessCategory === 'farm_lot' ? 'Pick Farm Lot Directly on Map' : 'Pick Point Directly on Map'}
                </Button>
              </div>

              {assessmentResult && (
                <div className="border-t border-slate-100 pt-3">
                  <AssessmentResultsCard
                    result={assessmentResult}
                    compact
                    onSelectFacility={onSelectFacility}
                    selectedFacilityName={highlightedFacility?.name ?? null}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
