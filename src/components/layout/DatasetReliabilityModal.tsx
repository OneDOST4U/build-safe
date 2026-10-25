import { ShieldCheck, CheckCircle2, Info, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MUNICIPALITY_PROFILES } from '@/lib/assessment/coverage'

interface DatasetReliabilityModalProps {
  open: boolean
  onClose: () => void
}

export function DatasetReliabilityModal({ open, onClose }: DatasetReliabilityModalProps) {
  if (!open) return null

  const lasamProfile = MUNICIPALITY_PROFILES.Lasam
  const lalloProfile = MUNICIPALITY_PROFILES['Lal-lo']

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/50 backdrop-blur-sm p-4 animate-in fade-in duration-200"
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
                Dataset Reliability & Multi-Municipality Coverage
              </h2>
              <p className="text-[11px] text-slate-500">
                Data provenance, coverage extents, and anti-hallucination safeguards
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
          <div className="rounded-lg border border-teal-200 bg-teal-50/80 p-4 space-y-2">
            <div className="flex items-center gap-2 text-teal-900 font-bold text-xs uppercase tracking-wider">
              <CheckCircle2 className="h-4 w-4 text-teal-700" />
              BUILD-SAFE Zero-Hallucination Spatial Policy
            </div>
            <p className="text-[11.5px] leading-relaxed text-teal-950">
              In GIS site intelligence, <strong>Absence of Data is NEVER Absence of Hazard</strong>. When map coverage expands to neighboring areas such as <strong>Lal-lo</strong>, municipalities without ingested local flood maps or CLUP shapefiles are strictly tagged as <strong>"Unsurveyed / Data Gap"</strong> — never labeled as "Safe" or "No Hazard" — preventing false-negative safety illusions.
            </p>
          </div>

          {/* Municipality Coverage Comparison Table */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
              <Info className="h-4 w-4 text-sky-600" />
              Municipality Coverage Matrix (Lasam vs. Lal-lo & Corridor)
            </h3>
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full border-collapse text-left text-[11px]">
                <thead className="bg-slate-100 text-slate-800 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-2.5">Hazard / Dataset Layer</th>
                    <th className="p-2.5">Source Agency</th>
                    <th className="p-2.5">Lasam Status</th>
                    <th className="p-2.5">Lal-lo Status</th>
                    <th className="p-2.5">Hallucination Prevention Rule</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="p-2.5 font-medium text-slate-900">MGB Detailed Flood (1:10k)</td>
                    <td className="p-2.5 text-slate-600">DENR-MGB</td>
                    <td className="p-2.5">
                      <Badge className="bg-emerald-100 text-emerald-800 text-[10px]">Verified Ingested</Badge>
                    </td>
                    <td className="p-2.5">
                      <Badge className="bg-amber-100 text-amber-800 text-[10px]">Pending Ingestion</Badge>
                    </td>
                    <td className="p-2.5 text-[10px] text-slate-500">
                      Unmapped Lal-lo areas return "Data Gap", preventing false "Safe" rating.
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-medium text-slate-900">Active Faults (50km)</td>
                    <td className="p-2.5 text-slate-600">PHIVOLCS</td>
                    <td className="p-2.5">
                      <Badge className="bg-emerald-100 text-emerald-800 text-[10px]">Active Regional</Badge>
                    </td>
                    <td className="p-2.5">
                      <Badge className="bg-emerald-100 text-emerald-800 text-[10px]">Active Regional</Badge>
                    </td>
                    <td className="p-2.5 text-[10px] text-slate-500">
                      Evaluated from regional PHIVOLCS fault catalog; 250m buffer applied.
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-medium text-slate-900">Volcano Hazards (Cagua)</td>
                    <td className="p-2.5 text-slate-600">GVP / PHIVOLCS</td>
                    <td className="p-2.5">
                      <Badge className="bg-emerald-100 text-emerald-800 text-[10px]">Active Regional</Badge>
                    </td>
                    <td className="p-2.5">
                      <Badge className="bg-emerald-100 text-emerald-800 text-[10px]">Active Regional</Badge>
                    </td>
                    <td className="p-2.5 text-[10px] text-slate-500">
                      Concentric buffer calculation (summit is in Gonzaga).
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-medium text-slate-900">CLUP Land Use Zoning</td>
                    <td className="p-2.5 text-slate-600">LGU MPDC</td>
                    <td className="p-2.5">
                      <Badge className="bg-emerald-100 text-emerald-800 text-[10px]">2020 Approved</Badge>
                    </td>
                    <td className="p-2.5">
                      <Badge className="bg-amber-100 text-amber-800 text-[10px]">Pending Ingestion</Badge>
                    </td>
                    <td className="p-2.5 text-[10px] text-slate-500">
                      Lal-lo queries marked "CLUP pending"; prevents misclassifying land use.
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-medium text-slate-900">Liquefaction / Erosion</td>
                    <td className="p-2.5 text-slate-600">LGU / MGB</td>
                    <td className="p-2.5">
                      <Badge className="bg-emerald-100 text-emerald-800 text-[10px]">2013/2020 Survey</Badge>
                    </td>
                    <td className="p-2.5">
                      <Badge className="bg-amber-100 text-amber-800 text-[10px]">Pending Ingestion</Badge>
                    </td>
                    <td className="p-2.5 text-[10px] text-slate-500">
                      Local hazard layers clipped to Lasam; Lal-lo flagged as unsurveyed.
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-medium text-slate-900">3D Building Footprints</td>
                    <td className="p-2.5 text-slate-600">OSM / Local Survey</td>
                    <td className="p-2.5">
                      <Badge className="bg-emerald-100 text-emerald-800 text-[10px]">Extruded 3D</Badge>
                    </td>
                    <td className="p-2.5">
                      <Badge className="bg-slate-100 text-slate-700 text-[10px]">Basemap Only</Badge>
                    </td>
                    <td className="p-2.5 text-[10px] text-slate-500">
                      Absence of 3D footprints in Lal-lo does not imply vacant land.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Lal-lo Profile & Expansion Blueprint */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-lg border border-slate-200 bg-white p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 text-[11.5px]">Municipality: Lasam (PSGC {lasamProfile.psgc})</span>
                <Badge className="bg-emerald-100 text-emerald-800">Tier 1 · Full Coverage</Badge>
              </div>
              <p className="text-[11px] text-slate-600">{lasamProfile.description}</p>
              <div className="text-[10.5px] text-emerald-900 bg-emerald-50 rounded p-2 border border-emerald-200">
                ✅ Complete high-resolution local layers: MGB 1:10k flood, LGU CLUP, 3D building heights, local hydrology, NPAAAD/SAFDZ.
              </div>
            </div>

            <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-amber-950 text-[11.5px]">Municipality: Lal-lo (PSGC {lalloProfile.psgc})</span>
                <Badge className="bg-amber-100 text-amber-900 border border-amber-300">Tier 2 · Regional Only</Badge>
              </div>
              <p className="text-[11px] text-amber-900 leading-snug">{lalloProfile.hallucinationNotice}</p>
              <div className="text-[10.5px] text-amber-950 bg-amber-100/70 rounded p-2 border border-amber-200">
                ⏳ Ingestion Roadmap: Municipal boundary, regional faults and volcanoes are active. Ingestion pipeline ready for Lal-lo MGB 1:10k flood and CLUP shapefiles.
              </div>
            </div>
          </div>

          {/* Legal and Engineering Disclaimer */}
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-[10.5px] text-slate-600 space-y-1">
            <p className="font-semibold text-slate-800">Important Governance & Planning Notice:</p>
            <p>
              This system is an AI-assisted site intelligence prototype designed to facilitate pre-feasibility planning and building permit reviews. Official zoning certificates and building clearances must always be issued by the respective Local Government Unit (MPDC / MDRRMO) and official regulatory agencies (DENR-MGB, DOST-PHIVOLCS, DPWH).
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex shrink-0 items-center justify-end border-t border-slate-200 px-5 py-3 bg-slate-50">
          <Button size="sm" onClick={onClose}>
            Got it, close
          </Button>
        </div>
      </div>
    </div>
  )
}
