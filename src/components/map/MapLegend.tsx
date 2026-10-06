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
  hazardMode: HazardMode
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

export function MapLegend({ hazardMode, layerVisibility }: MapLegendProps) {
  if (hazardMode === 'lgu') {
    const hasAny = Boolean(
      layerVisibility.lguFlood ||
      layerVisibility.liquefaction ||
      layerVisibility.erosion ||
      layerVisibility.landUse ||
      layerVisibility.npaaad ||
      layerVisibility.safdz
    )
    if (!hasAny) return null

    return (
      <div className="absolute bottom-4 left-3 z-10 hidden max-h-[45vh] max-w-xs overflow-y-auto rounded-lg border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur sm:block">
        <p className="mb-2 text-xs font-semibold text-slate-800">Active LGU datasets</p>
        {layerVisibility.lguFlood && <SwatchList title="LGU flood (2020)" entries={LGU_FLOOD_LEGEND} />}
        {layerVisibility.liquefaction && <SwatchList title="Liquefaction (2013)" entries={LIQUEFACTION_LEGEND} />}
        {layerVisibility.erosion && <SwatchList title="Land erosion (2020)" entries={EROSION_LEGEND} />}
        {layerVisibility.landUse && <SwatchList title="Existing land use (2020)" entries={LAND_USE_LEGEND} />}
        {layerVisibility.npaaad && <SwatchList title="NPAAAD Agri Protection (2022)" entries={NPAAAD_LEGEND} />}
        {layerVisibility.safdz && <SwatchList title="SAFDZ Development Zones (2022)" entries={SAFDZ_LEGEND} />}
      </div>
    )
  }

  if (hazardMode === 'flood') {
    if (layerVisibility.flood === false) return null
    return (
      <div className="absolute bottom-4 left-3 z-10 hidden rounded-lg border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur sm:block">
        <p className="mb-2 text-xs font-semibold text-slate-800">MGB Flood Susceptibility</p>
        <div className="space-y-1">
          {MGB_FLOOD_LEGEND.map((entry) => (
            <div key={entry.key} className="flex items-center gap-2 text-[11px] text-slate-600">
              <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: entry.color }} />
              {entry.label}
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (hazardMode === 'fault') {
    if (layerVisibility.fault === false) return null
    const compact = [
      FAULT_LEGEND_ENTRIES.find((e) => e.key === 'active-certain')!,
      FAULT_LEGEND_ENTRIES.find((e) => e.key === 'active-approximate')!,
      FAULT_LEGEND_ENTRIES.find((e) => e.key === 'active-concealed')!,
      FAULT_LEGEND_ENTRIES.find((e) => e.key === 'potential-certain')!,
      FAULT_LEGEND_ENTRIES.find((e) => e.key === 'potential-approximate')!,
    ].filter(Boolean)

    return (
      <div className="absolute bottom-4 left-3 z-10 hidden max-h-[45vh] overflow-y-auto rounded-lg border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur sm:block">
        <p className="mb-2 text-xs font-semibold text-slate-800">Active Fault (PHIVOLCS)</p>
        <div className="space-y-1.5 text-[10px] text-slate-600">
          {compact.map((entry) => (
            <div key={entry.key} className="flex items-center gap-2">
              <LineSwatch color={entry.color} dash={entry.dash} />
              <span>{entry.label}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (hazardMode === 'volcano') {
    if (layerVisibility.volcano === false) return null
    return (
      <div className="absolute bottom-4 left-3 z-10 hidden rounded-lg border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur sm:block">
        <p className="mb-2 text-xs font-semibold text-slate-800">Cagua Volcano</p>
        <div className="space-y-1 text-[11px] text-slate-600">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-800" />
            Summit (Gonzaga)
          </div>
        </div>
      </div>
    )
  }

  return null
}