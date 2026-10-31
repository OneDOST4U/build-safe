import { useMemo } from 'react'
import { AlertTriangle, Ban, ClipboardList, Crosshair, FileText, MapPin, RotateCcw, ShieldCheck, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { AssessmentResultsCard, type HighlightedFacilityInfo } from '@/components/layout/AssessmentResultsCard'
import { GoogleEarthLink } from '@/components/layout/GoogleEarthLink'
import { BrandLogo } from '@/components/layout/BrandLogo'
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
  onAssessSite?: () => void
  onPickSiteOnMap: () => void
  pickingOnMap?: boolean
  pendingSiteCoords?: [number, number] | null
  waterBodyCheck?: WaterBodyCheckResult | null
  onConfirmMapSite?: () => void
  onCancelPickOnMap?: () => void
  onRepickSite?: () => void
  onOpenReliability?: () => void
  onOpenReport?: () => void
  isChatbotOpen?: boolean
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
  onAssessCategoryChange,
  onAssessBuildingTypeChange,
  onAssessCropTypeChange,
  onPickSiteOnMap,
  pickingOnMap = false,
  pendingSiteCoords = null,
  waterBodyCheck = null,
  onConfirmMapSite,
  onCancelPickOnMap,
  onRepickSite,
  onOpenReliability,
  onOpenReport,
  isChatbotOpen = false,
}: SiteAssessmentPopupProps) {
  const isPendingInsideLasam = pendingSiteCoords
    ? isPointInsideLasam(pendingSiteCoords[0], pendingSiteCoords[1], boundary)
    : true

  const hasCoordinates = Boolean(
    assessLat &&
    assessLng &&
    assessLat.trim() !== '' &&
    assessLng.trim() !== '' &&
    Number.isFinite(Number(assessLat)) &&
    Number.isFinite(Number(assessLng))
  )

  const numLat = hasCoordinates ? Number(assessLat) : NaN
  const numLng = hasCoordinates ? Number(assessLng) : NaN
  const isInputValidNumber = hasCoordinates
  const isInputInsideLasam = isInputValidNumber
    ? isPointInsideLasam(numLng, numLat, boundary)
    : true

  const pendingLandUse = useMemo(() => {
    if (!pendingSiteCoords || !landUse) return null
    return getLandUseAtPoint(pendingSiteCoords, landUse)
  }, [pendingSiteCoords, landUse])

  const pendingLandUseClass = String(pendingLandUse?.properties?.land_use_class ?? '').toLowerCase().trim()
  const pendingLandUseLabel = String(pendingLandUse?.properties?.land_use_label ?? '').trim()
  const pendingRemarks = String(pendingLandUse?.properties?.remarks ?? '').toLowerCase().trim()

  const isPendingResidential =
    pendingLandUseClass === 'residential' ||
    pendingLandUseClass === 'socialized_housing' ||
    pendingLandUseLabel.toLowerCase().includes('residential') ||
    pendingLandUseLabel.toLowerCase().includes('socialized housing')

  const isPendingCommercial =
    pendingLandUseClass === 'commercial' ||
    pendingLandUseLabel.toLowerCase().includes('commercial')

  const isPendingParks =
    pendingLandUseClass === 'parks' ||
    pendingLandUseLabel.toLowerCase().includes('parks') ||
    pendingLandUseLabel.toLowerCase().includes('recreation')

  const isPendingCemetery =
    pendingLandUseClass === 'cemetery' ||
    pendingLandUseLabel.toLowerCase().includes('cemetery') ||
    pendingRemarks.includes('cemetery') ||
    pendingRemarks.includes('memorial')

  const isPendingInstitutional =
    pendingLandUseClass === 'institutional' ||
    pendingLandUseLabel.toLowerCase().includes('institutional') ||
    pendingRemarks.includes('school') ||
    pendingRemarks.includes('afp camp')

  const isPendingWaterBody = Boolean(waterBodyCheck?.isWaterBody)

  const isPendingAgri =
    pendingLandUseClass === 'agriculture' ||
    pendingLandUseClass === 'crops' ||
    pendingLandUseLabel.toLowerCase().includes('agri') ||
    pendingLandUseLabel.toLowerCase().includes('crop')

  // Building structures: Conforming in Residential and Commercial zones; Agricultural land allowed as Non-Conforming
  const isBuildingConforming = isPendingResidential || isPendingCommercial
  const isBuildingAllowed = isBuildingConforming || isPendingAgri
  // Farm lots: strictly restricted to designated Agricultural zones only
  const isFarmAllowed =
    isPendingAgri &&
    !isPendingParks &&
    !isPendingCemetery &&
    !isPendingInstitutional &&
    !isPendingWaterBody

  const isPendingProhibited =
    !isPendingInsideLasam ||
    isPendingWaterBody ||
    isPendingParks ||
    isPendingCemetery ||
    isPendingInstitutional ||
    (assessCategory === 'building' && !isBuildingAllowed) ||
    (assessCategory === 'farm_lot' && !isFarmAllowed)

  let confirmDisabledLabel = 'Confirm Point'
  if (!isPendingInsideLasam) {
    confirmDisabledLabel = 'Disabled (Outside)'
  } else if (isPendingWaterBody) {
    confirmDisabledLabel = 'Disabled (Water Body)'
  } else if (isPendingParks) {
    confirmDisabledLabel = 'Disabled (Parks & Rec)'
  } else if (isPendingCemetery) {
    confirmDisabledLabel = 'Disabled (Cemetery)'
  } else if (isPendingInstitutional) {
    confirmDisabledLabel = 'Disabled (Institutional)'
  } else if (assessCategory === 'building' && !isBuildingAllowed) {
    confirmDisabledLabel = 'Disabled (Non-Permitted)'
  } else if (assessCategory === 'farm_lot' && !isFarmAllowed) {
    confirmDisabledLabel = 'Disabled (Non-Agri)'
  } else if (assessCategory === 'building' && isPendingAgri && !isBuildingConforming) {
    confirmDisabledLabel = 'Confirm Point (Non-Conforming)'
  }

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

      </div>

      {/* Centered Confirmation & Hazard Notice Card upon Dropping Pin on Map */}
      {pickingOnMap && !open && pendingSiteCoords && (
        <div
          className={`fixed top-0 bottom-0 left-0 ${
            isChatbotOpen
              ? 'right-0 sm:right-[420px] lg:right-[460px] xl:right-[480px]'
              : 'right-0'
          } z-40 flex items-center justify-center p-4 pointer-events-none transition-all duration-300 animate-in fade-in`}
          role="dialog"
          aria-modal="false"
        >
          <div className="pointer-events-auto w-[min(92vw,23rem)] rounded-2xl border border-slate-200/90 bg-white/98 p-4.5 shadow-2xl backdrop-blur-md space-y-3 animate-in zoom-in-95 duration-150 ring-1 ring-slate-900/5">
            <div className="flex items-start gap-2.5">
              <div className="relative mt-0.5">
                {isPendingProhibited ? (
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-red-100 text-red-600 font-bold text-base shadow-sm border border-red-200">
                    🚫
                  </div>
                ) : (
                  <>
                    <span className="absolute -inset-1 rounded-full animate-ping bg-sky-400/30" />
                    <img
                      src="/markers/site-pin.svg"
                      alt=""
                      className="relative h-8 w-6 shrink-0 object-contain drop-shadow"
                      aria-hidden
                    />
                  </>
                )}
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

            {/* Prohibited Parks & Recreation Alert */}
            {isPendingParks && (
              <div className="rounded-lg border border-red-300 bg-red-50 p-2.5 text-xs text-red-950">
                <div className="flex items-center gap-1.5 font-bold text-red-700">
                  <Ban className="h-4 w-4 shrink-0" />
                  <span>Parks & Recreation — Development Prohibited</span>
                </div>
                <p className="mt-1 text-[10.5px] leading-relaxed text-red-900">
                  Parcel is designated as <strong>Parks & Recreation</strong> under Lasam CLUP (2020). Building construction and establishing farm lots are strictly prohibited in public recreational spaces.
                </p>
              </div>
            )}

            {/* Prohibited Cemetery Alert */}
            {isPendingCemetery && (
              <div className="rounded-lg border border-red-300 bg-red-50 p-2.5 text-xs text-red-950">
                <div className="flex items-center gap-1.5 font-bold text-red-700">
                  <Ban className="h-4 w-4 shrink-0" />
                  <span>Cemetery Grounds — Development Prohibited</span>
                </div>
                <p className="mt-1 text-[10.5px] leading-relaxed text-red-900">
                  Parcel is designated as a <strong>Cemetery / Memorial Park</strong> under Lasam CLUP (2020). Constructing buildings and establishing farm lots are strictly prohibited.
                </p>
              </div>
            )}

            {/* Prohibited Institutional Zone Alert */}
            {isPendingInstitutional && (
              <div className="rounded-lg border border-purple-300 bg-purple-50 p-2.5 text-xs text-purple-950">
                <div className="flex items-center gap-1.5 font-bold text-purple-800">
                  <Ban className="h-4 w-4 shrink-0 text-purple-700" />
                  <span>Institutional Zone — Development Prohibited</span>
                </div>
                <p className="mt-1 text-[10.5px] leading-relaxed text-purple-900">
                  Parcel is officially designated as <strong>Institutional Land Use</strong> under Lasam CLUP (2020) for government, educational, and public facilities. Constructing a private building structure or establishing a farm lot here is strictly prohibited.
                </p>
              </div>
            )}

            {/* Prohibited Water Body Warning Alert */}
            {isPendingWaterBody && (
              <div className="rounded-lg border border-red-300 bg-red-50 p-2.5 text-xs text-red-950">
                <div className="flex items-center gap-1.5 font-bold text-red-700">
                  <Ban className="h-4 w-4 shrink-0" />
                  <span>Water Body — Construction & Farming Prohibited</span>
                </div>
                <p className="mt-1 text-[10.5px] leading-relaxed text-red-900">
                  Location is directly inside <strong>{waterBodyCheck?.nearestWaterBodyName || 'water body'}</strong>. Under Presidential Decree No. 1067 (Water Code, Art. 51) and PD 1096, establishing building structures or farm lots inside water bodies is strictly prohibited.
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

            {/* Building Prohibited Alert */}
            {assessCategory === 'building' && !isBuildingAllowed && !isPendingParks && !isPendingCemetery && !isPendingInstitutional && !isPendingWaterBody && (
              <div className="rounded-lg border border-red-300 bg-red-50 p-2.5 text-xs text-red-950">
                <div className="flex items-center gap-1.5 font-bold text-red-700">
                  <Ban className="h-4 w-4 shrink-0" />
                  <span>Non-Permitted Zone — Building Prohibited</span>
                </div>
                <p className="mt-1 text-[10.5px] leading-relaxed text-red-900">
                  Under Lasam CLUP (2020), building structures are strictly restricted to <strong>Residential</strong> and <strong>Commercial</strong> areas (with Agricultural land strictly non-conforming). Constructing on this parcel is prohibited.
                </p>
              </div>
            )}

            {/* Building Non-Conforming in Agricultural Land Alert */}
            {assessCategory === 'building' && isPendingAgri && !isBuildingConforming && !isPendingParks && !isPendingCemetery && !isPendingInstitutional && !isPendingWaterBody && (
              <div className="rounded-lg border border-amber-300 bg-amber-50 p-2.5 text-xs text-amber-950">
                <div className="flex items-center gap-1.5 font-bold text-amber-800">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>⚠️ Non-Conforming (Agricultural Land)</span>
                </div>
                <p className="mt-1 text-[10.5px] leading-relaxed text-amber-900">
                  Location is zoned as <strong>Agricultural Land</strong> under Lasam CLUP (2020). Developing a {assessBuildingType} is <strong>non-conforming</strong> (only Residential and Commercial areas are conforming) and requires mandatory DAR land-use conversion clearance & Sangguniang Bayan reclassification.
                </p>
              </div>
            )}

            {assessCategory === 'building' && isBuildingConforming && (
              <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-2 text-xs text-emerald-950">
                <p className="text-[10.5px] leading-snug text-emerald-900 font-medium">
                  ✅ <strong>CLUP Zoning Clearance:</strong> Confirmed {isPendingResidential ? 'Residential' : 'Commercial'} Zone (100% conforming for proposed building structure).
                </p>
              </div>
            )}

            {isPendingAgri && assessCategory === 'farm_lot' && !isPendingInstitutional && !isPendingWaterBody && !isPendingParks && !isPendingCemetery && (
              <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-2 text-xs text-emerald-950">
                <p className="text-[10.5px] leading-snug text-emerald-900 font-medium">
                  🌾 <strong>CLUP Agricultural Land:</strong> 100% conforming with designated agricultural zoning.
                </p>
              </div>
            )}

            {/* Farm Lots Allowed in Agricultural Land only Alert */}
            {assessCategory === 'farm_lot' && !isPendingAgri && !isPendingParks && !isPendingCemetery && !isPendingInstitutional && !isPendingWaterBody && (
              <div className="rounded-lg border border-red-300 bg-red-50 p-2.5 text-xs text-red-950">
                <div className="flex items-center gap-1.5 font-bold text-red-700">
                  <Ban className="h-4 w-4 shrink-0" />
                  <span>Non-Agricultural Land — Farming Prohibited</span>
                </div>
                <p className="mt-1 text-[10.5px] leading-relaxed text-red-900">
                  Under Lasam CLUP (2020), agricultural farm lots and crop cultivation are strictly restricted to designated <strong>Agricultural</strong> areas only. Farming on {pendingLandUseLabel || 'non-agricultural land'} is prohibited.
                </p>
              </div>
            )}

            <p className="text-[10px] leading-tight text-slate-500">
              {!isPendingInsideLasam
                ? '⚠️ Placement disabled outside boundary. Click inside Lasam to relocate.'
                : isPendingWaterBody
                ? '🚫 Construction and farming prohibited in water bodies (PD 1067). Click elsewhere to relocate.'
                : isPendingParks
                ? '🚫 Construction and farming prohibited in parks & recreation. Click elsewhere to relocate.'
                : isPendingCemetery
                ? '🚫 Construction and farming prohibited in cemetery grounds. Click elsewhere to relocate.'
                : isPendingInstitutional
                ? '🚫 Construction and farming prohibited in institutional zones. Click elsewhere to relocate.'
                : assessCategory === 'building' && isPendingAgri && !isBuildingConforming
                ? '⚠️ Non-conforming site (Agricultural Land). Click Confirm to proceed with clearance review.'
                : assessCategory === 'building' && !isBuildingAllowed
                ? '🚫 Buildings are only permitted in Residential and Commercial zones (or Agricultural as Non-Conforming). Click elsewhere to relocate.'
                : assessCategory === 'farm_lot' && !isPendingAgri
                ? '🚫 Farm lots are only permitted in designated Agricultural areas. Click elsewhere to relocate.'
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
                disabled={isPendingProhibited}
                className={`h-8 flex-1 text-xs font-semibold ${
                  isPendingProhibited
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed hover:bg-slate-200 opacity-60'
                    : assessCategory === 'building' && isPendingAgri && !isBuildingConforming
                    ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-sm'
                    : 'bg-teal-700 hover:bg-teal-800 text-white'
                }`}
                onClick={onConfirmMapSite}
              >
                {confirmDisabledLabel}
              </Button>
            </div>
          </div>
        </div>
      )}

      {open && (
        <div
          className={`fixed top-0 bottom-0 left-0 ${
            isChatbotOpen
              ? 'right-0 sm:right-[420px] lg:right-[460px] xl:right-[480px]'
              : 'right-0'
          } z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-sm p-4 transition-all duration-300 animate-in fade-in`}
          role="dialog"
          aria-modal="true"
          aria-labelledby="site-assessment-title"
          onClick={() => onOpenChange(false)}
        >
          <div
            className="flex max-h-[min(92vh,46rem)] w-full max-w-[460px] flex-col overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-2xl shadow-slate-900/20 animate-in zoom-in-95 duration-150 font-sans"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top gradient highlight strip */}
            <div className="h-1.5 w-full bg-gradient-to-r from-teal-600 via-emerald-600 to-sky-600" />

            {/* Header: Centered Logo and BUILD-SAFE Title */}
            <div className="relative flex shrink-0 flex-col items-center justify-center border-b border-slate-100 px-6 pt-5 pb-3.5 bg-gradient-to-b from-slate-50/80 to-white text-center">
              {/* Close button at top right */}
              <button
                type="button"
                className="absolute right-4 top-4 h-8 w-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                onClick={() => onOpenChange(false)}
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>

              {/* Top Center Logo */}
              <div className="mb-2 flex items-center justify-center">
                <BrandLogo size="lg" className="h-12 w-12 object-contain drop-shadow-sm select-none" />
              </div>

              {/* Title: BUILD-SAFE only */}
              <h3 id="site-assessment-title" className="text-base font-extrabold tracking-tight text-slate-900">
                BUILD-SAFE
              </h3>

              {/* Badges / Links */}
              <div className="flex items-center gap-2 mt-1.5">
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 text-[10.5px] font-bold text-emerald-800">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Lasam LGU
                </span>
                {onOpenReliability && (
                  <button
                    type="button"
                    onClick={() => {
                      onOpenChange(false)
                      onOpenReliability()
                    }}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal-700 hover:text-teal-900 hover:underline cursor-pointer"
                    title="View data reliability & coverage details"
                  >
                    <ShieldCheck className="h-3.5 w-3.5" />
                    <span>Data Info</span>
                  </button>
                )}
              </div>
            </div>

            {/* Scrollable Body */}
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5 text-slate-800">
              {/* Only display Geographic Coordinates & Coverage when a site point has been confirmed */}
              {hasCoordinates && (
                <div className="space-y-2 rounded-2xl border border-slate-200/90 bg-slate-50/80 p-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Crosshair className="h-3.5 w-3.5 text-teal-600" />
                      <span>Selected Site Coordinates</span>
                    </Label>
                    <span className="text-[10px] text-teal-700 font-semibold bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
                      📍 Lasam (PSGC 0201517000)
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-xl border border-slate-200 bg-white p-2">
                      <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider block">Latitude</span>
                      <span className="font-mono text-xs font-bold text-slate-900">{numLat.toFixed(5)}° N</span>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-2">
                      <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider block">Longitude</span>
                      <span className="font-mono text-xs font-bold text-slate-900">{numLng.toFixed(5)}° E</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Site Land-Use Purpose Selector */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-800">
                  Land-Use Purpose Classification
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => onAssessCategoryChange?.('building')}
                    className={`flex flex-col items-start p-2.5 rounded-2xl border text-left transition-all cursor-pointer ${
                      assessCategory === 'building'
                        ? 'border-slate-900 bg-slate-900 text-white shadow-md ring-2 ring-slate-900/10'
                        : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-base">🏢</span>
                      <span className="text-xs font-bold">Building Structure</span>
                    </div>
                    <span className={`text-[10px] leading-tight ${assessCategory === 'building' ? 'text-slate-300' : 'text-slate-500'}`}>
                      Residential, Commercial, Industrial, Public Facilities
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onAssessCategoryChange?.('farm_lot')}
                    className={`flex flex-col items-start p-2.5 rounded-2xl border text-left transition-all cursor-pointer ${
                      assessCategory === 'farm_lot'
                        ? 'border-emerald-700 bg-gradient-to-tr from-emerald-800 to-teal-700 text-white shadow-md ring-2 ring-emerald-600/15'
                        : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-base">🌾</span>
                      <span className="text-xs font-bold">Farm Lot & Crops</span>
                    </div>
                    <span className={`text-[10px] leading-tight ${assessCategory === 'farm_lot' ? 'text-emerald-100' : 'text-slate-500'}`}>
                      Palay, Corn, Vegetables & Agribusiness Logistics
                    </span>
                  </button>
                </div>
              </div>

              {/* Specific Establishment or Crop Variety Selector */}
              {assessCategory === 'building' ? (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-slate-800">
                      Proposed Building / Establishment Type
                    </Label>
                    <span className="text-[10px] text-slate-500 font-medium">PD 1096 National Building Code</span>
                  </div>
                  <div className="relative">
                    <select
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2 text-xs font-semibold text-slate-800 focus:border-teal-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-600 cursor-pointer"
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
                </div>
              ) : (
                <div className="space-y-1.5 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-slate-800">Intended Crop Variety</Label>
                    <span className="text-[10px] text-emerald-800 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      DA-BSWM & MGB Validated
                    </span>
                  </div>
                  <select
                    className="w-full rounded-xl border border-emerald-300 bg-emerald-50/40 px-3 py-2 text-xs font-bold text-emerald-950 focus:border-emerald-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600 cursor-pointer"
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
                      <div className="rounded-xl border border-emerald-200/90 bg-emerald-50/70 p-2.5 text-[11px] leading-relaxed text-emerald-950 shadow-2xs">
                        <strong className="text-emerald-900">Crop Profile:</strong> {selected.description}
                      </div>
                    )
                  })()}
                </div>
              )}

              {/* Status alerts based on input */}

              {isInputValidNumber && isInputInsideLasam && isAgriConflictInput && (
                <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-950 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-amber-800">
                    <span className="text-base">⚠️</span>
                    <span>CLUP 2020: Agricultural Zone (Non-Conforming)</span>
                  </div>
                  <p className="text-[11px] text-amber-900 leading-relaxed">
                    Location is zoned as <strong>Agricultural Land</strong> under Lasam CLUP (2020). Developing a {assessBuildingType} is <strong>non-conforming</strong> (only Residential and Commercial zones are conforming) and requires mandatory DAR conversion clearance and Sangguniang Bayan reclassification.
                  </p>
                </div>
              )}

              {isInputValidNumber && isInputInsideLasam && isInputAgri && assessCategory === 'farm_lot' && (
                <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-2.5 text-xs text-emerald-950">
                  <p className="text-[11px] text-emerald-900 font-medium">
                    🌾 <strong>CLUP Zoning Clearance:</strong> Confirmed Agricultural Land (100% conforming for proposed farm lot).
                  </p>
                </div>
              )}

              {isInputValidNumber && isInputInsideLasam && !isInputAgri && assessCategory === 'farm_lot' && (
                <div className="rounded-xl border border-red-300 bg-red-50 p-3 text-xs text-red-950 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-red-800">
                    <span className="text-base">🚫</span>
                    <span>CLUP 2020: Non-Agricultural Zone (Farming Prohibited)</span>
                  </div>
                  <p className="text-[11px] text-red-900 leading-relaxed">
                    Under Lasam CLUP (2020), agricultural farm lots and crops are strictly restricted to designated <strong>Agricultural</strong> areas only. Cultivation or farming in {inputLandUseLabel || 'non-agricultural zones'} is prohibited.
                  </p>
                </div>
              )}

              {assessError && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-2 text-xs text-red-700 font-medium">
                  {assessError}
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 space-y-2">
                {assessmentResult && onOpenReport && (
                  <Button
                    type="button"
                    onClick={onOpenReport}
                    className="w-full h-11 rounded-2xl gap-2 font-bold shadow-md transition-all text-xs cursor-pointer bg-gradient-to-r from-teal-700 via-emerald-700 to-teal-800 hover:from-teal-800 hover:to-emerald-800 text-white shadow-teal-900/20"
                  >
                    <FileText className="h-4 w-4" />
                    <span>View Full A4 Assessment Report</span>
                  </Button>
                )}

                <Button
                  type="button"
                  size="lg"
                  variant={assessmentResult ? 'outline' : 'default'}
                  className={`w-full h-11 rounded-2xl gap-2 font-bold shadow-md transition-all text-xs cursor-pointer ${
                    assessmentResult
                      ? 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs'
                      : assessCategory === 'farm_lot'
                      ? 'bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-800 hover:from-emerald-800 hover:to-teal-800 text-white shadow-emerald-900/20'
                      : 'bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 hover:bg-slate-800 text-white shadow-slate-900/25'
                  }`}
                  onClick={onPickSiteOnMap}
                >
                  <MapPin className="h-4 w-4" />
                  <span>
                    {hasCoordinates
                      ? assessCategory === 'farm_lot' ? 'Re-pick Farm Lot on Map' : 'Re-pick Point on Map'
                      : assessCategory === 'farm_lot' ? 'Pick Farm Lot Directly on Map' : 'Pick Point Directly on Map'}
                  </span>
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
