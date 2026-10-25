import { ChevronRight, FlaskConical, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CAGUA_META } from '@/lib/simulation/volcano'
import { FAULT_LEGEND_ENTRIES } from '@/lib/simulation/faultLegend'
import { MGB_FLOOD_LEGEND, type MgbSusceptibility } from '@/lib/simulation/mgbFlood'
import {
  EROSION_LEGEND,
  LAND_USE_LEGEND,
  LGU_FLOOD_LEGEND,
  LIQUEFACTION_LEGEND,
  NPAAAD_LEGEND,
  SAFDZ_LEGEND,
} from '@/lib/simulation/lguHazards'
import { LAYER_VISIBILITY_LABELS } from '@/lib/map/layerVisibility'
import { BuildingInfoPanel } from '@/components/layout/BuildingInfoPanel'
import type {
  HazardMode,
  RiverSettings,
  SelectedBuilding,
  TerrainSettings,
} from '@/types'

interface HazardPanelProps {
  hazardMode: HazardMode
  onHazardModeChange: (mode: HazardMode) => void
  floodOpacity: number
  onFloodOpacityChange: (opacity: number) => void
  mgbFeatureCount: number
  liquefactionFeatureCount: number
  erosionFeatureCount: number
  lguFloodFeatureCount: number
  landUseFeatureCount: number
  npaaadFeatureCount?: number
  safdzFeatureCount?: number
  mgbExposureCounts: Record<MgbSusceptibility | 'none', number>
  faultLineName: string
  faultSegmentCount: number
  activeFaultCount: number
  potentialFaultCount: number
  faultLegendKeysPresent: string[]
  onFaultLineNameChange: (name: string) => void
  onDeleteFaultLine: () => void
  layerVisibility: Record<string, boolean>
  onLayerVisibilityChange: (layer: string, visible: boolean) => void
  terrainSettings: TerrainSettings
  onTerrainSettingsChange: (patch: Partial<TerrainSettings>) => void
  riverSettings: RiverSettings
  onRiverSettingsChange: (patch: Partial<RiverSettings>) => void
  selectedBuilding: SelectedBuilding | null
  onCollapse?: () => void
  onOpenReliability?: () => void
}

function LegendSwatch({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="h-3 w-3 rounded-sm border border-slate-300" style={{ backgroundColor: color }} />
      <span>{label}</span>
    </div>
  )
}

function FaultLineLegendRow({
  color,
  dash,
  label,
  present,
}: {
  color: string
  dash: 'solid' | 'dashed' | 'dotted'
  label: string
  present: boolean
}) {
  const lineStyle =
    dash === 'dashed'
      ? { borderTop: `2px dashed ${color}` }
      : dash === 'dotted'
        ? { borderTop: `2px dotted ${color}` }
        : { backgroundColor: color, height: 2 }

  return (
    <div
      className={`flex items-center gap-2 border-b border-slate-100 py-1.5 text-[11px] last:border-0 ${
        present ? 'text-slate-700' : 'text-slate-400'
      }`}
    >
      <span className="inline-block w-8 shrink-0" style={lineStyle} />
      <span className="flex-1 leading-snug">{label}</span>
      {present && (
        <span className="shrink-0 rounded bg-teal-50 px-1.5 py-0.5 text-[9px] font-medium text-teal-800">
          Near Lasam
        </span>
      )}
    </div>
  )
}

function FutureFeatureSimulation({ label }: { label: string }) {
  return (
    <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 py-2.5">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-amber-900">
          Future Feature
        </span>
        <span className="text-[10px] text-slate-500">Coming soon</span>
      </div>
      <p className="mb-2 text-[11px] leading-snug text-slate-600">
        Interactive {label} simulation is planned for a later release. Layer display and site
        assessment remain available.
      </p>
      <Button type="button" size="sm" className="w-full gap-2" disabled title="Future feature">
        <FlaskConical className="h-3.5 w-3.5" />
        Simulation
      </Button>
    </div>
  )
}

export function HazardPanel(props: HazardPanelProps) {
  return (
    <aside className="flex w-full shrink-0 flex-col border-l border-slate-200 bg-white lg:w-80 xl:w-96">
      <div className="border-b border-slate-200 px-4 py-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-slate-900">Hazard & Planning Layers</h2>
            <p className="text-[11px] text-slate-500">MGB Flood, PHIVOLCS, DA-BSWM & Cadastral</p>
          </div>
          {props.onCollapse && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 shrink-0 gap-1 rounded-lg px-2 text-xs font-semibold text-slate-500 hover:text-slate-900 hover:bg-slate-100"
              onClick={props.onCollapse}
              title="Close hazard panel"
              aria-label="Close hazard panel"
            >
              <span>Close</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <Tabs value={props.hazardMode} onValueChange={(v) => props.onHazardModeChange(v as HazardMode)}>
          <TabsList className="grid h-auto w-full grid-cols-5 gap-1">
            <TabsTrigger value="lgu" className="px-0.5 text-[10px]">LGU Data</TabsTrigger>
            <TabsTrigger value="flood" className="px-0.5 text-[10px]">Flood</TabsTrigger>
            <TabsTrigger value="fault" className="px-0.5 text-[10px]">Fault</TabsTrigger>
            <TabsTrigger value="volcano" className="px-0.5 text-[10px]">Volcano</TabsTrigger>
            <TabsTrigger value="layers" className="px-0.5 text-[10px]">Layers</TabsTrigger>
          </TabsList>

          <TabsContent value="lgu" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>LGU datasets</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-md border border-teal-200 bg-teal-50/70 p-2.5 text-[11px] text-teal-950 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold flex items-center gap-1">
                      <ShieldCheck className="h-3.5 w-3.5 text-teal-700" />
                      Zero-Hallucination Data Policy
                    </span>
                    {props.onOpenReliability && (
                      <button
                        type="button"
                        onClick={props.onOpenReliability}
                        className="text-[10px] font-semibold text-teal-700 underline hover:text-teal-900"
                      >
                        Coverage Matrix
                      </button>
                    )}
                  </div>
                  <p className="text-[10px] leading-snug text-teal-900">
                    Local datasets cover Lasam. Neighboring municipalities (e.g. Lal-lo) are covered by regional fault/volcano models; missing local layers are flagged as "Data Gap", never "Safe".
                  </p>
                </div>

                <p className="text-[11px] leading-relaxed text-slate-500">
                  Local GIS layers converted from shapefiles and clipped to the PSA Lasam municipal
                  boundary. For demonstration only — verify with the LGU before planning decisions.
                  Official DENR-MGB flood remains under the Flood tab.
                </p>

                <div className="space-y-3 rounded-md border border-slate-100 bg-slate-50 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <Label>LGU flood susceptibility (2020)</Label>
                      <p className="text-[10px] text-slate-500">
                        {props.lguFloodFeatureCount > 0
                          ? `${props.lguFloodFeatureCount} coarse zone polygon(s)`
                          : 'Run npm run convert:hazards'}
                      </p>
                    </div>
                    <Switch
                      checked={props.layerVisibility.lguFlood === true}
                      onCheckedChange={(v) => props.onLayerVisibilityChange('lguFlood', v)}
                    />
                  </div>
                  <div className="space-y-1">
                    {LGU_FLOOD_LEGEND.map(({ label, color }) => (
                      <LegendSwatch key={label} color={color} label={label} />
                    ))}
                  </div>
                </div>

                <div className="space-y-3 rounded-md border border-slate-100 bg-slate-50 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <Label>Liquefaction susceptibility (2013)</Label>
                      <p className="text-[10px] text-slate-500">
                        {props.liquefactionFeatureCount > 0
                          ? `${props.liquefactionFeatureCount} barangay polygon(s)`
                          : 'Run npm run convert:hazards'}
                      </p>
                    </div>
                    <Switch
                      checked={props.layerVisibility.liquefaction === true}
                      onCheckedChange={(v) => props.onLayerVisibilityChange('liquefaction', v)}
                    />
                  </div>
                  <div className="space-y-1">
                    {LIQUEFACTION_LEGEND.map(({ label, color }) => (
                      <LegendSwatch key={label} color={color} label={label} />
                    ))}
                  </div>
                </div>

                <div className="space-y-3 rounded-md border border-slate-100 bg-slate-50 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <Label>Land erosion (2020)</Label>
                      <p className="text-[10px] text-slate-500">
                        {props.erosionFeatureCount > 0
                          ? `${props.erosionFeatureCount} barangay polygon(s)`
                          : 'Run npm run convert:hazards'}
                      </p>
                    </div>
                    <Switch
                      checked={props.layerVisibility.erosion === true}
                      onCheckedChange={(v) => props.onLayerVisibilityChange('erosion', v)}
                    />
                  </div>
                  <div className="space-y-1">
                    {EROSION_LEGEND.map(({ label, color }) => (
                      <LegendSwatch key={label} color={color} label={label} />
                    ))}
                  </div>
                </div>

                <div className="space-y-3 rounded-md border border-slate-100 bg-slate-50 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <Label>Existing land use — CLUP (2020)</Label>
                      <p className="text-[10px] text-slate-500">
                        {props.landUseFeatureCount > 0
                          ? `${props.landUseFeatureCount} land-use polygon(s)`
                          : 'Run npm run convert:hazards'}
                      </p>
                    </div>
                    <Switch
                      checked={props.layerVisibility.landUse === true}
                      onCheckedChange={(v) => props.onLayerVisibilityChange('landUse', v)}
                    />
                  </div>
                  <div className="max-h-40 space-y-1 overflow-y-auto pr-1">
                    {LAND_USE_LEGEND.map(({ label, color }) => (
                      <LegendSwatch key={label} color={color} label={label} />
                    ))}
                  </div>
                </div>

                <div className="space-y-3 rounded-md border border-slate-100 bg-slate-50 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <Label>NPAAAD — Agricultural Protection (DA 2022)</Label>
                      <p className="text-[10px] text-slate-500">
                        {props.npaaadFeatureCount && props.npaaadFeatureCount > 0
                          ? `${props.npaaadFeatureCount} agricultural parcel(s)`
                          : 'Network of Protected Areas for Agri'}
                      </p>
                    </div>
                    <Switch
                      checked={props.layerVisibility.npaaad === true}
                      onCheckedChange={(v) => props.onLayerVisibilityChange('npaaad', v)}
                    />
                  </div>
                  <div className="max-h-40 space-y-1 overflow-y-auto pr-1">
                    {NPAAAD_LEGEND.map(({ label, color }) => (
                      <LegendSwatch key={label} color={color} label={label} />
                    ))}
                  </div>
                </div>

                <div className="space-y-3 rounded-md border border-slate-100 bg-slate-50 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <Label>SAFDZ — Strategic Agri-Fisheries (DA 2022)</Label>
                      <p className="text-[10px] text-slate-500">
                        {props.safdzFeatureCount && props.safdzFeatureCount > 0
                          ? `${props.safdzFeatureCount} development zone(s)`
                          : 'Strategic Agri & Fisheries Development Zones'}
                      </p>
                    </div>
                    <Switch
                      checked={props.layerVisibility.safdz === true}
                      onCheckedChange={(v) => props.onLayerVisibilityChange('safdz', v)}
                    />
                  </div>
                  <div className="max-h-40 space-y-1 overflow-y-auto pr-1">
                    {SAFDZ_LEGEND.map(({ label, color }) => (
                      <LegendSwatch key={label} color={color} label={label} />
                    ))}
                  </div>
                </div>

                <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[10px] leading-relaxed text-amber-900">
                  Demonstration layers — not official DENR-MGB flood maps, PHIVOLCS geohazard
                  certificates, or approved CLUP zoning maps.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="flood" className="space-y-4">
            <FutureFeatureSimulation label="flood" />
            <Card>
              <CardHeader>
                <CardTitle>Flood Hazard (MGB)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-[11px] leading-relaxed text-slate-500">
                  Official DENR-MGB flood susceptibility clipped to the PSA Lasam municipal boundary
                  (PSGC 0201517000). Source: Mines and Geosciences Bureau via controlmap.mgb.gov.ph.
                </p>
                {props.mgbFeatureCount === 0 ? (
                  <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-900">
                    MGB flood layer not loaded. Run{' '}
                    <code className="rounded bg-amber-100 px-1">npm run fetch:boundary</code> then{' '}
                    <code className="rounded bg-amber-100 px-1">npm run fetch:flood</code>.
                  </p>
                ) : (
                  <p className="text-[11px] text-slate-600">
                    {props.mgbFeatureCount} susceptibility polygon(s) loaded for Lasam.
                  </p>
                )}

                <div className="flex items-center justify-between gap-3">
                  <Label htmlFor="show-mgb-flood">Show MGB flood layer</Label>
                  <Switch
                    id="show-mgb-flood"
                    checked={props.layerVisibility.flood !== false}
                    onCheckedChange={(v) => props.onLayerVisibilityChange('flood', v)}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Layer opacity</Label>
                    <span className="text-xs">{Math.round(props.floodOpacity * 100)}%</span>
                  </div>
                  <Slider
                    min={0.1}
                    max={1}
                    step={0.05}
                    value={[props.floodOpacity]}
                    onValueChange={([v]) => props.onFloodOpacityChange(v)}
                  />
                </div>

                <div className="space-y-1.5 rounded-md border border-slate-100 bg-slate-50 p-3 text-[11px] text-slate-600">
                  <p className="font-medium text-slate-800">Buildings by susceptibility</p>
                  <div className="flex justify-between">
                    <span>Very High</span>
                    <strong>{props.mgbExposureCounts.very_high}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>High</span>
                    <strong>{props.mgbExposureCounts.high}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Moderate</span>
                    <strong>{props.mgbExposureCounts.moderate}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Low</span>
                    <strong>{props.mgbExposureCounts.low}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Outside mapped</span>
                    <strong>{props.mgbExposureCounts.none}</strong>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>MGB Legend</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {MGB_FLOOD_LEGEND.map((entry) => (
                  <div key={entry.key} className="space-y-0.5">
                    <LegendSwatch color={entry.color} label={entry.label} />
                    <p className="pl-5 text-[10px] leading-snug text-slate-500">{entry.description}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="fault" className="space-y-4">
            <FutureFeatureSimulation label="fault" />
            <Card>
              <CardHeader>
                <CardTitle>PHIVOLCS Fault Lines</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-[11px] text-slate-500">
                  Source: PHIVOLCS / GeoRisk ULAP (demonstration only). Segments within 50 km of Lasam.
                </p>
                <div className="space-y-2">
                  <Label>Layer name</Label>
                  <input
                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                    value={props.faultLineName}
                    onChange={(e) => props.onFaultLineNameChange(e.target.value)}
                  />
                </div>
                <div className="rounded-md border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-700">
                  <div>
                    Segments: <strong>{props.faultSegmentCount}</strong>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-3">
                    <LegendSwatch color="#dc2626" label={`Active (${props.activeFaultCount})`} />
                    <LegendSwatch
                      color="#171717"
                      label={`Potentially Active (${props.potentialFaultCount})`}
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <Label htmlFor="show-fault-layer">Show PHIVOLCS fault lines</Label>
                  <Switch
                    id="show-fault-layer"
                    checked={props.layerVisibility.fault !== false}
                    onCheckedChange={(v) => props.onLayerVisibilityChange('fault', v)}
                  />
                </div>
                <div className="overflow-hidden rounded-md border border-teal-700/20">
                  <div className="bg-teal-700 px-3 py-1.5 text-center text-xs font-semibold text-white">
                    Active Fault
                  </div>
                  <div className="max-h-56 overflow-y-auto bg-white px-3 py-1">
                    {FAULT_LEGEND_ENTRIES.map((entry) => (
                      <FaultLineLegendRow
                        key={entry.key}
                        color={entry.color}
                        dash={entry.dash}
                        label={entry.label}
                        present={props.faultLegendKeysPresent.includes(entry.key)}
                      />
                    ))}
                  </div>
                  <p className="border-t border-slate-100 bg-slate-50 px-3 py-1.5 text-[10px] text-slate-500">
                    Official PHIVOLCS / GeoRisk legend wording. Line styles approximated in MapLibre.
                    Click a fault on the map for its name and trace type.
                  </p>
                </div>
                <Button variant="outline" size="sm" className="w-full" onClick={props.onDeleteFaultLine}>
                  Reset to PHIVOLCS faults
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="volcano" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Cagua Volcano (Gonzaga)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-[11px] leading-relaxed text-slate-500">
                  Stratovolcano in Gonzaga, Cagayan (~{CAGUA_META.elevationM} m). Reference point for
                  distance and site assessment — not official PHIVOLCS hazard zones. Source:{' '}
                  {CAGUA_META.dataSource}.
                </p>
                <div className="rounded-md border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                  Last known eruption: {CAGUA_META.lastEruption}
                </div>
                <div className="flex items-center justify-between gap-3">
                  <Label htmlFor="show-volcano-layer">Show Cagua volcano marker</Label>
                  <Switch
                    id="show-volcano-layer"
                    checked={props.layerVisibility.volcano !== false}
                    onCheckedChange={(v) => props.onLayerVisibilityChange('volcano', v)}
                  />
                </div>
                <p className="text-[11px] leading-relaxed text-slate-500">
                  Lasam is approximately 50–60 km from the Cagua summit. Toggle the volcano layer on
                  the map to view the summit location. Use Site Assessment for ashfall and volcanic checks
                  at a specific coordinate.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="layers" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Terrain</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(
                  [
                    ['terrain3d', '3D terrain'],
                    ['hillshade', 'Hillshade'],
                    ['contours', 'Contour lines'],
                  ] as const
                ).map(([key, label]) => (
                  <div key={key} className="flex items-center justify-between">
                    <Label>{label}</Label>
                    <Switch
                      checked={props.terrainSettings[key]}
                      onCheckedChange={(checked) => props.onTerrainSettingsChange({ [key]: checked })}
                    />
                  </div>
                ))}
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Exaggeration</Label>
                    <span className="text-xs">{props.terrainSettings.exaggeration.toFixed(1)}×</span>
                  </div>
                  <Slider
                    min={0.5}
                    max={3}
                    step={0.1}
                    value={[props.terrainSettings.exaggeration]}
                    onValueChange={([v]) => props.onTerrainSettingsChange({ exaggeration: v })}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Rivers & drainage</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(
                  [
                    ['main', 'Main rivers'],
                    ['tributaries', 'Tributaries / creeks'],
                    ['drainage', 'Drainage canals'],
                    ['riverbanks', 'Riverbanks'],
                    ['watershed', 'Watershed'],
                    ['flowArrows', 'Flow-direction arrows'],
                  ] as const
                ).map(([key, label]) => (
                  <div key={key} className="flex items-center justify-between">
                    <Label>{label}</Label>
                    <Switch
                      checked={props.riverSettings[key]}
                      onCheckedChange={(checked) => props.onRiverSettingsChange({ [key]: checked })}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Map layers</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {Object.entries(props.layerVisibility)
                  .filter(
                    ([layer]) =>
                      layer !== 'liquefaction' &&
                      layer !== 'erosion' &&
                      layer !== 'lguFlood' &&
                      layer !== 'landUse' &&
                      layer !== 'npaaad' &&
                      layer !== 'safdz',
                  )
                  .map(([layer, visible]) => (
                  <div key={layer} className="flex items-center justify-between gap-3">
                    <Label>{LAYER_VISIBILITY_LABELS[layer] ?? layer}</Label>
                    <Switch
                      checked={visible}
                      onCheckedChange={(checked) => props.onLayerVisibilityChange(layer, checked)}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>

            <BuildingInfoPanel building={props.selectedBuilding} />
          </TabsContent>
        </Tabs>
      </div>
    </aside>
  )
}
