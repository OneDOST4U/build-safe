import { FAULT_LEGEND_ENTRIES } from '@/lib/simulation/faultLegend'
import { MGB_FLOOD_LEGEND } from '@/lib/simulation/mgbFlood'
import {
  EROSION_LEGEND,
  LAND_USE_LEGEND,
  LGU_FLOOD_LEGEND,
  LIQUEFACTION_LEGEND,
  NPAAAD_LEGEND,
  SAFDZ_LEGEND,
} from '@/lib/simulation/lguHazards'
import type { HazardMode } from '@/types'

interface MapLegendProps {
  hazardMode?: HazardMode
  layerVisibility: Record<string, boolean>
}

function LineSwatch({
  color,
  dash,
}: {
  color: string
  dash: 'solid' | 'dashed' | 'dotted'
}) {
  const style =
    dash === 'dashed'
      ? { borderTop: `2px dashed ${color}` }
      : dash === 'dotted'
        ? { borderTop: `2px dotted ${color}` }
        : { backgroundColor: color, height: 2 }

  return <span className="inline-block w-7 shrink-0" style={style} />
}

function SwatchList({
  title,
  entries,
}: {
  title: string
  entries: { label: string; color: string }[]
}) {
  return (
    <div className="mb-3 last:mb-0">
      <p className="mb-1.5 text-[10px] font-semibold text-slate-700">{title}</p>
      <div className="space-y-1">
        {entries.map((entry) => (
          <div key={entry.label} className="flex items-center gap-2 text-[11px] text-slate-600">
            <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: entry.color }} />
            <span>{entry.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

const COMPACT_FAULT_ENTRIES = [
  FAULT_LEGEND_ENTRIES.find((e) => e.key === 'active-certain'),
  FAULT_LEGEND_ENTRIES.find((e) => e.key === 'active-approximate'),
  FAULT_LEGEND_ENTRIES.find((e) => e.key === 'active-concealed'),
  FAULT_LEGEND_ENTRIES.find((e) => e.key === 'potential-certain'),
  FAULT_LEGEND_ENTRIES.find((e) => e.key === 'potential-approximate'),
].filter((e): e is (typeof FAULT_LEGEND_ENTRIES)[number] => Boolean(e))

export function MapLegend({ hazardMode, layerVisibility }: MapLegendProps) {
  const showFlood = Boolean(layerVisibility.flood)
  const showLguFlood = Boolean(layerVisibility.lguFlood)
  const showLiquefaction = Boolean(layerVisibility.liquefaction)
  const showErosion = Boolean(layerVisibility.erosion)
  const showLandUse = Boolean(layerVisibility.landUse)
  const showNpaaad = Boolean(layerVisibility.npaaad)
  const showSafdz = Boolean(layerVisibility.safdz)
  const showFault = Boolean(layerVisibility.fault)
  const showVolcano = Boolean(layerVisibility.volcano || hazardMode === 'volcano')

  const hasAny =
    showFlood ||
    showLguFlood ||
    showLiquefaction ||
    showErosion ||
    showLandUse ||
    showNpaaad ||
    showSafdz ||
    showFault ||
    showVolcano

  if (!hasAny) return null

  return (
    <div className="absolute bottom-9 left-3 z-10 hidden max-h-[45vh] max-w-xs overflow-y-auto rounded-lg border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur sm:block">
      <p className="mb-2 text-xs font-semibold text-slate-800">Map Legend</p>

      {showFlood && (
        <div className="mb-3 last:mb-0">
          <p className="mb-1.5 text-[10px] font-semibold text-slate-700">MGB Flood Susceptibility</p>
          <div className="space-y-1">
            {MGB_FLOOD_LEGEND.map((entry) => (
              <div key={entry.key} className="flex items-center gap-2 text-[11px] text-slate-600">
                <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: entry.color }} />
                <span>{entry.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {showLguFlood && <SwatchList title="LGU flood (2020)" entries={LGU_FLOOD_LEGEND} />}
      {showLiquefaction && <SwatchList title="Liquefaction (2013)" entries={LIQUEFACTION_LEGEND} />}
      {showErosion && <SwatchList title="Land erosion (2020)" entries={EROSION_LEGEND} />}
      {showLandUse && <SwatchList title="Existing land use (2020)" entries={LAND_USE_LEGEND} />}
      {showNpaaad && <SwatchList title="NPAAAD Agri Protection (2022)" entries={NPAAAD_LEGEND} />}
      {showSafdz && <SwatchList title="SAFDZ Development Zones (2022)" entries={SAFDZ_LEGEND} />}

      {showFault && (
        <div className="mb-3 last:mb-0">
          <p className="mb-1.5 text-[10px] font-semibold text-slate-700">Active Fault (PHIVOLCS)</p>
          <div className="space-y-1.5 text-[10px] text-slate-600">
            {COMPACT_FAULT_ENTRIES.map((entry) => (
              <div key={entry.key} className="flex items-center gap-2">
                <LineSwatch color={entry.color} dash={entry.dash} />
                <span>{entry.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {showVolcano && (
        <div className="mb-3 last:mb-0">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-800">🌋 Cagua Volcano Buffers</span>
            <span className="rounded border border-amber-200 bg-amber-50 px-1 py-0.2 text-[8.5px] font-bold text-amber-800">
              Active
            </span>
          </div>
          <div className="space-y-1 text-[10px] text-slate-600">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full border border-white bg-red-600 shadow-xs" />
              <span className="font-semibold text-red-950">10 km Permanent Danger (PDZ)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full border border-white bg-orange-500 shadow-xs" />
              <span>20 km High Danger Buffer</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full border border-white bg-amber-500 shadow-xs" />
              <span>30 km Moderate Buffer (Lahars)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full border border-white bg-yellow-500 shadow-xs" />
              <span>50 km Regional Ashfall Buffer</span>
            </div>
            <div className="flex items-center gap-2 border-t border-slate-100 pt-1">
              <span className="h-0.5 w-3 shrink-0 border-t-2 border-dashed border-red-500" />
              <span className="text-[9.5px] text-slate-500">~53 km Corridor to Lasam</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}