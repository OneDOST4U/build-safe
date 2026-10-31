import { ShieldCheck, CheckCircle2, Info, X, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MUNICIPALITY_PROFILES } from '@/lib/assessment/coverage'

interface DatasetReliabilityModalProps {
  open: boolean
  onClose: () => void
  isChatbotOpen?: boolean
}

interface DatasetRow {
  name: string
  agency: string
  vintage: string
  status: string
  statusColor: string
  details: string
}

const LASAM_DATASET_ROWS: DatasetRow[] = [
  {
    name: 'DENR-MGB Detailed Flood Susceptibility',
    agency: 'DENR-MGB Region II',
    vintage: '1:10,000 Scale',
    status: 'Verified Ingested',
    statusColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    details: 'Official 1:10,000 flood susceptibility zones (Very High, High, Moderate, Low) covering the Lasam River basin and floodplains.',
  },
  {
    name: 'Active Fault Traces & Safe Setbacks',
    agency: 'DOST-PHIVOLCS',
    vintage: 'National Fault Catalog',
    status: 'Active Verified',
    statusColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    details: '74 active fault segments with automated 5m structural setback, 50m warning zone, and 250m buffer safety screening.',
  },
  {
    name: 'Volcanic Hazards (Mt. Cagua Monitoring)',
    agency: 'DOST-PHIVOLCS',
    vintage: 'Continuous Monitoring',
    status: 'Active Verified',
    statusColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    details: 'Concentric danger radii, pyroclastic flow buffers, and ashfall trajectory tracking from the nearest active volcano.',
  },
  {
    name: 'CLUP Existing Land Use Zoning',
    agency: 'LGU Lasam (MPDC)',
    vintage: '2020–2029 CLUP',
    status: '2020 Approved',
    statusColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    details: 'Authentic 25 zoning features from official municipal CLUP shapefile (Residential, Commercial, Institutional, Agriculture, Forest, etc.).',
  },
  {
    name: 'Soil Erosion & Slope Stability',
    agency: 'LGU Lasam / DA',
    vintage: '2020 LGU Survey',
    status: 'Verified Ingested',
    statusColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    details: '77 municipal erosion susceptibility polygons classifying severe, moderate, slight, and un-eroded agricultural terrain.',
  },
  {
    name: 'Soil Liquefaction Susceptibility',
    agency: 'LGU Lasam / MGB',
    vintage: '2013 LGU GIS',
    status: 'Verified Ingested',
    statusColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    details: '55 localized liquefaction susceptibility polygons for alluvial basins, rice plains, and river channels across Lasam.',
  },
  {
    name: 'NPAAAD Prime Agricultural Lands',
    agency: 'DA-BSWM',
    vintage: '2022 Approved',
    status: 'Verified Ingested',
    statusColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    details: '2,459 protected agricultural parcels under Network of Protected Areas for Agriculture and Agro-industrial Development.',
  },
  {
    name: 'SAFDZ Strategic Agricultural Zones',
    agency: 'DA-BSWM',
    vintage: '2022 Approved',
    status: 'Verified Ingested',
    statusColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    details: '3,360 strategic crop and agro-fishery development polygons under Strategic Agriculture and Fisheries Development Zones.',
  },
  {
    name: '3D Building Footprints & Structural Heights',
    agency: 'OpenStreetMap / LGU',
    vintage: 'DEM Conditioned',
    status: 'Extruded 3D',
    statusColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    details: 'Over 8,800 digitized building structures with roof elevations, ground slope, and nearest river offset calculations.',
  },
  {
    name: 'Critical Facilities & Evacuation Centers',
    agency: 'LGU Lasam / DepEd / DOH',
    vintage: '43 Validated Sites',
    status: 'Active Verified',
    statusColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    details: 'Municipal Hall, MDRRMO EOC, RHU 1 & 2, BFP, PNP, 36 DepEd schools, and designated evacuation centers.',
  },
]

export function DatasetReliabilityModal({ open, onClose, isChatbotOpen = false }: DatasetReliabilityModalProps) {
  if (!open) return null

  const lasamProfile = MUNICIPALITY_PROFILES.Lasam

  return (
    <div
      className={`fixed top-0 bottom-0 left-0 ${
        isChatbotOpen
          ? 'right-0 sm:right-[420px] lg:right-[460px] xl:right-[480px]'
          : 'right-0'
      } z-[70] flex items-center justify-center bg-slate-950/50 backdrop-blur-sm p-4 transition-all duration-300 animate-in fade-in`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="reliability-modal-title"
    >
      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-2xl animate-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-5 py-3.5 bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-600 text-white shadow-sm">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 id="reliability-modal-title" className="text-sm font-bold text-slate-900">
                Dataset Reliability & Data Provenance (Municipality of Lasam)
              </h2>
              <p className="text-[11px] text-slate-500">
                Official spatial data provenance, validation status, and reliability safeguards for Lasam, Cagayan
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs text-slate-700">
          {/* Zero-Hallucination Policy Alert */}
          <div className="rounded-xl border border-teal-200 bg-teal-50/80 p-4 space-y-2">
            <div className="flex items-center gap-2 text-teal-900 font-bold text-xs uppercase tracking-wider">
              <CheckCircle2 className="h-4 w-4 text-teal-700" />
              BUILD-SAFE Lasam Spatial Data Reliability Standard
            </div>
            <p className="text-[11.5px] leading-relaxed text-teal-950">
              In GIS site intelligence, <strong>Absence of Data is NEVER Absence of Hazard</strong>. All hazard assessments, zoning checks, and building permit verifications are conducted strictly within the official Philippine Statistics Authority (PSA) boundary for <strong>Lasam, Cagayan (PSGC 0201517000)</strong> using authentic local GIS shapefiles and national regulatory datasets.
            </p>
          </div>

          {/* Lasam Dataset Coverage Matrix Table */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
              <Info className="h-4 w-4 text-teal-600" />
              Lasam Municipal GIS Dataset Provenance Matrix
            </h3>
            <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-2xs">
              <table className="w-full border-collapse text-left text-[11px]">
                <thead className="bg-slate-100 text-slate-800 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-2.5">Hazard / Dataset Layer</th>
                    <th className="p-2.5">Source Agency</th>
                    <th className="p-2.5">Vintage / Resolution</th>
                    <th className="p-2.5">Lasam Status</th>
                    <th className="p-2.5">Coverage & Implementation Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {LASAM_DATASET_ROWS.map((row) => (
                    <tr key={row.name} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-2.5 font-medium text-slate-900">{row.name}</td>
                      <td className="p-2.5 text-slate-600 font-medium">{row.agency}</td>
                      <td className="p-2.5 text-slate-500">{row.vintage}</td>
                      <td className="p-2.5">
                        <Badge className={`${row.statusColor} text-[10px] font-semibold border`}>
                          {row.status}
                        </Badge>
                      </td>
                      <td className="p-2.5 text-[10px] text-slate-600 leading-snug">
                        {row.details}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Lasam Profile Card */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2.5 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-teal-600" />
                  Municipality: Lasam (PSGC {lasamProfile.psgc})
                </span>
                <Badge className="bg-emerald-100 text-emerald-800 border border-emerald-200 font-semibold">
                  Tier 1 · Full Local Coverage
                </Badge>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">{lasamProfile.description}</p>
              <div className="text-[10.5px] text-emerald-950 bg-emerald-50/80 rounded-lg p-2.5 border border-emerald-200 font-medium">
                ✅ Complete high-resolution local layers: DENR-MGB 1:10k flood, LGU Lasam CLUP (2020), 3D building heights, local river network, liquefaction, erosion, and DA-BSWM NPAAAD/SAFDZ.
              </div>
            </div>

            <div className="rounded-xl border border-teal-200 bg-teal-50/40 p-4 space-y-2.5 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-teal-950 text-xs flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-teal-700" />
                  Spatial Decision Support Framework
                </span>
                <Badge className="bg-teal-100 text-teal-900 border border-teal-300 font-semibold">
                  Zero Hallucination
                </Badge>
              </div>
              <p className="text-[11px] text-teal-900 leading-relaxed">
                All assessments are computed strictly from spatial polygon intersections with official shapefiles. The system never extrapolates, assumes, or hallucinates safety in unmapped zones.
              </p>
              <div className="text-[10.5px] text-teal-950 bg-white/80 rounded-lg p-2.5 border border-teal-200 font-medium">
                ⚖️ <strong>Regulatory Standards:</strong> Enforces PD 1096 (National Building Code of the Philippines) and PD 1067 (Water Code riverbank easements).
              </div>
            </div>
          </div>

          {/* Legal and Engineering Disclaimer */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-[10.5px] text-slate-600 space-y-1">
            <p className="font-semibold text-slate-800">Important Governance & Planning Notice:</p>
            <p className="leading-relaxed">
              This system is an AI-assisted site intelligence decision support tool designed to facilitate pre-feasibility planning and building permit reviews in the Municipality of Lasam. Official zoning certificates and building clearances must always be issued by the Lasam Local Government Unit (MPDC / MDRRMO) and official regulatory agencies (DENR-MGB, DOST-PHIVOLCS, DPWH).
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex shrink-0 items-center justify-end border-t border-slate-200 px-5 py-3 bg-slate-50">
          <Button size="sm" onClick={onClose} className="rounded-xl font-medium">
            Got it, close
          </Button>
        </div>
      </div>
    </div>
  )
}
