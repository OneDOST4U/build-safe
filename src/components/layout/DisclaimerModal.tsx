import { AlertTriangle, ArrowRight, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { BrandLogo } from '@/components/layout/BrandLogo'

interface DisclaimerModalProps {
  open: boolean
  onClose: () => void
}

export function DisclaimerModal({ open, onClose }: DisclaimerModalProps) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="disclaimer-title"
    >
      <div className="w-full max-w-lg rounded-2xl border border-slate-200/90 bg-white p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
        {/* Brand Header */}
        <div className="flex items-center gap-3.5 border-b border-slate-100 pb-4">
          <BrandLogo size="lg" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-lg font-black tracking-tight text-slate-900">BUILD</span>
              <span className="text-lg font-black tracking-tight text-teal-600">SAFE</span>
              <span className="rounded-md bg-teal-50 px-2 py-0.5 text-[10px] font-bold text-teal-800 border border-teal-200/60">
                Lasam, Cagayan
              </span>
            </div>
            <p id="disclaimer-title" className="text-xs font-medium text-slate-600 mt-0.5">
              Multi-Hazard Site Intelligence & Urban Planning Decision Support
            </p>
          </div>
        </div>

        {/* Advisory Card */}
        <div className="rounded-xl border border-amber-200/80 bg-amber-50/70 p-3.5 text-xs text-amber-950 space-y-1.5">
          <div className="flex items-center gap-2 font-bold text-amber-900 text-xs">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-700" />
            <span>Preliminary Planning & Demonstration Prototype</span>
          </div>
          <p className="text-[11.5px] leading-relaxed text-amber-900/90">
            This platform provides preliminary multi-hazard screening and spatial decision support. Results assist municipal zoning and building permit pre-assessment under Presidential Decrees No. 1096 (National Building Code) and No. 1067 (Water Code), but do not replace certified on-site engineering and geodetic surveys.
          </p>
        </div>

        {/* Multi-Hazard Datasets Grid */}
        <div className="space-y-1.5">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Integrated Data Sources
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-lg border border-slate-100 bg-slate-50/80 p-2.5">
              <p className="font-semibold text-slate-800 flex items-center gap-1.5">
                <span>🌊</span> DENR-MGB 1:10k
              </p>
              <p className="mt-0.5 text-[10.5px] text-slate-500">Official flood susceptibility catalog</p>
            </div>
            <div className="rounded-lg border border-slate-100 bg-slate-50/80 p-2.5">
              <p className="font-semibold text-slate-800 flex items-center gap-1.5">
                <span>🌋</span> PHIVOLCS & GVP
              </p>
              <p className="mt-0.5 text-[10.5px] text-slate-500">Active fault traces & Cagua volcano</p>
            </div>
            <div className="rounded-lg border border-slate-100 bg-slate-50/80 p-2.5">
              <p className="font-semibold text-slate-800 flex items-center gap-1.5">
                <span>🌾</span> DA-BSWM
              </p>
              <p className="mt-0.5 text-[10.5px] text-slate-500">NPAAAD & SAFDZ agricultural zones</p>
            </div>
            <div className="rounded-lg border border-slate-100 bg-slate-50/80 p-2.5">
              <p className="font-semibold text-slate-800 flex items-center gap-1.5">
                <span>🏛️</span> Lasam Cadastral
              </p>
              <p className="mt-0.5 text-[10.5px] text-slate-500">3D building footprints & waterways</p>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-2">
          <Button
            className="w-full h-10 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-medium shadow-md text-xs gap-2 transition-all hover:gap-3"
            onClick={onClose}
          >
            <ShieldCheck className="h-4 w-4 text-teal-400" />
            <span>I Understand — Continue to Map Platform</span>
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
