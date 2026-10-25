import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import * as maplibregl from 'maplibre-gl'
import type { FeatureCollection } from 'geojson'
import 'maplibre-gl/dist/maplibre-gl.css'
import {
  createMap,
  createMapFallback,
  prepareBasemap,
  waitForMapStyle,
} from '@/lib/map/createMap'
import { hideBasemapBuildings, BUILDING_COLOR, BUILDING_LIGHT } from '@/lib/map/buildingLayers'
import { createProposedBuildingCollection } from '@/lib/assessment/proposedBuilding'
import {
  getProposedBuildingDimensions,
  suggestedPreviewZoom,
} from '@/lib/assessment/buildingDimensions'
import type { ProposedBuildingType } from '@/lib/assessment/buildingTypes'
import type { HighlightedFacilityInfo } from '@/components/layout/AssessmentResultsCard'
import { generateHighwayCorridorRoute, getHighwayDrivingRoute } from '@/lib/map/roadRouting'

export interface ProposedBuildingPreviewMapHandle {
  captureSnapshot: () => Promise<string | null>
}

interface ProposedBuildingPreviewMapProps {
  lng: number
  lat: number
  buildingType: ProposedBuildingType
  nearbyBuildings?: FeatureCollection
  highlightedFacility?: HighlightedFacilityInfo | null
  className?: string
  onReady?: () => void
}

export const ProposedBuildingPreviewMap = forwardRef<
  ProposedBuildingPreviewMapHandle,
  ProposedBuildingPreviewMapProps
>(function ProposedBuildingPreviewMap(
  { lng, lat, buildingType, nearbyBuildings, highlightedFacility = null, className, onReady },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const onReadyRef = useRef(onReady)
  onReadyRef.current = onReady
  const placedCenterRef = useRef<[number, number]>([lng, lat])
  const zoomRef = useRef<number>(16)
  const highlightedFacilityRef = useRef(highlightedFacility)
  highlightedFacilityRef.current = highlightedFacility
  const facilityMarkerRef = useRef<maplibregl.Marker | null>(null)
  const roadRouteCoordsRef = useRef<[number, number][] | null>(null)

  useImperativeHandle(ref, () => ({
    async captureSnapshot() {
      const map = mapRef.current
      if (!map) return null

      const hadFacility = Boolean(highlightedFacilityRef.current)
      const lineSource = map.getSource('preview-facility-route-line') as
        | maplibregl.GeoJSONSource
        | undefined

      // Always maintain the official clean export view for the PDF!
      if (hadFacility) {
        lineSource?.setData({ type: 'FeatureCollection', features: [] })
        facilityMarkerRef.current?.remove()
        map.jumpTo({
          center: placedCenterRef.current,
          zoom: zoomRef.current,
          pitch: 58,
          bearing: -28,
          padding: { top: 56, bottom: 96, left: 24, right: 24 },
        })
      }

      await new Promise<void>((resolve) => {
        map.once('idle', () => resolve())
        map.triggerRepaint()
      })

      let dataUrl: string | null = null
      try {
        dataUrl = map.getCanvas().toDataURL('image/png')
      } catch {
        dataUrl = null
      }

      // Restore live route line & camera if a facility was active on screen
      if (hadFacility && highlightedFacilityRef.current) {
        const [siteLng, siteLat] = placedCenterRef.current
        const [facLng, facLat] = highlightedFacilityRef.current.coords
        lineSource?.setData({
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              properties: { name: highlightedFacilityRef.current.name },
              geometry: {
                type: 'LineString',
                coordinates: roadRouteCoordsRef.current ?? [
                  [siteLng, siteLat],
                  [facLng, facLat],
                ],
              },
            },
          ],
        })
        const bounds = new maplibregl.LngLatBounds()
        const coordsToFit = roadRouteCoordsRef.current ?? [[siteLng, siteLat], [facLng, facLat]]
        for (const pt of coordsToFit) {
          bounds.extend(pt)
        }
        map.fitBounds(bounds, {
          padding: { top: 70, bottom: 70, left: 70, right: 70 },
          maxZoom: 16,
          duration: 0,
        })
      }

      return dataUrl
    },
  }))

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    let cancelled = false
    const nearby = nearbyBuildings ?? { type: 'FeatureCollection' as const, features: [] }
    const buildingData = createProposedBuildingCollection(lng, lat, buildingType, nearby)
    const placedCenter =
      (buildingData.features[0]?.properties?.center as [number, number] | undefined) ?? [lng, lat]

    const dims = getProposedBuildingDimensions(buildingType)
    const zoom = suggestedPreviewZoom(dims)
    placedCenterRef.current = placedCenter
    zoomRef.current = zoom

    const mapOptions = {
      center: placedCenter,
      zoom,
      pitch: 58,
      bearing: -28,
      interactive: true,
      attributionControl: false as const,
      preserveDrawingBuffer: true,
    }

    async function init() {
      if (!containerRef.current) return
      try {
        let map = createMap({
          container: containerRef.current,
          ...mapOptions,
        })

        try {
          await waitForMapStyle(map)
        } catch {
          map.remove()
          map = createMapFallback({
            container: containerRef.current,
            ...mapOptions,
          })
          await waitForMapStyle(map)
        }

        if (cancelled) {
          map.remove()
          return
        }

        hideBasemapBuildings(map)
        prepareBasemap(map)
        map.setLight(BUILDING_LIGHT)

        try {
          map.addSource('lasam-dem', {
            type: 'raster-dem',
            tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],
            encoding: 'terrarium',
            tileSize: 256,
            maxzoom: 15,
          })
          map.setTerrain({ source: 'lasam-dem', exaggeration: 1.2 })
        } catch {
          // optional
        }

        map.addSource('nearby-buildings', { type: 'geojson', data: nearby })
        map.addLayer({
          id: 'nearby-buildings-3d',
          type: 'fill-extrusion',
          source: 'nearby-buildings',
          paint: {
            'fill-extrusion-color': ['coalesce', ['get', 'color'], BUILDING_COLOR],
            'fill-extrusion-height': ['coalesce', ['get', 'height'], 6],
            'fill-extrusion-base': 0,
            'fill-extrusion-opacity': 0.92,
            'fill-extrusion-vertical-gradient': true,
          },
        })

        map.addSource('proposed-building', { type: 'geojson', data: buildingData })
        map.addLayer({
          id: 'proposed-building-3d',
          type: 'fill-extrusion',
          source: 'proposed-building',
          paint: {
            'fill-extrusion-color': '#FACC15',
            'fill-extrusion-height': ['get', 'height'],
            'fill-extrusion-base': 0,
            'fill-extrusion-opacity': 0.98,
            'fill-extrusion-vertical-gradient': true,
          },
        })
        map.addLayer({
          id: 'proposed-building-outline',
          type: 'line',
          source: 'proposed-building',
          paint: {
            'line-color': '#0f172a',
            'line-width': 2,
            'line-opacity': 0.7,
          },
        })

        // Live facility route line layers
        map.addSource('preview-facility-route-line', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
        })
        map.addLayer({
          id: 'preview-facility-route-glow',
          type: 'line',
          source: 'preview-facility-route-line',
          layout: {
            'line-join': 'round',
            'line-cap': 'round',
          },
          paint: {
            'line-color': '#059669',
            'line-width': 8,
            'line-opacity': 0.5,
            'line-blur': 2.5,
          },
        })
        map.addLayer({
          id: 'preview-facility-route-main',
          type: 'line',
          source: 'preview-facility-route-line',
          layout: {
            'line-join': 'round',
            'line-cap': 'round',
          },
          paint: {
            'line-color': '#10b981',
            'line-width': 3.5,
            'line-dasharray': [2, 1.5],
          },
        })

        // Keep proposed box building centered; nearby buildings stay as context only
        map.jumpTo({
          center: placedCenter,
          zoom,
          pitch: 58,
          bearing: -28,
          // Pitch shifts content up — pad top so the yellow box reads centered
          padding: { top: 56, bottom: 96, left: 24, right: 24 },
        })

        map.once('idle', () => {
          if (!cancelled) onReadyRef.current?.()
        })

        mapRef.current = map
      } catch {
        // preview optional
      }
    }

    void init()

    return () => {
      cancelled = true
      facilityMarkerRef.current?.remove()
      facilityMarkerRef.current = null
      mapRef.current?.remove()
      mapRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    let cancelled = false

    const applyFacilityRoute = async () => {
      const lineSource = map.getSource('preview-facility-route-line') as
        | maplibregl.GeoJSONSource
        | undefined

      if (!highlightedFacility) {
        roadRouteCoordsRef.current = null
        lineSource?.setData({ type: 'FeatureCollection', features: [] })
        facilityMarkerRef.current?.remove()
        facilityMarkerRef.current = null
        map.flyTo({
          center: placedCenterRef.current,
          zoom: zoomRef.current,
          pitch: 58,
          bearing: -28,
          padding: { top: 56, bottom: 96, left: 24, right: 24 },
          duration: 750,
        })
        return
      }

      const [siteLng, siteLat] = placedCenterRef.current
      const [facLng, facLat] = highlightedFacility.coords

      // 1. Immediately render realistic highway corridor route (0ms local road geometry, never a straight line!)
      const instantRoute = generateHighwayCorridorRoute([siteLng, siteLat], [facLng, facLat])
      roadRouteCoordsRef.current = instantRoute.coordinates
      lineSource?.setData({
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: { name: highlightedFacility.name, road: instantRoute.roadName },
            geometry: {
              type: 'LineString',
              coordinates: instantRoute.coordinates,
            },
          },
        ],
      })

      // 2. Add marker pin at facility
      facilityMarkerRef.current?.remove()
      const el = document.createElement('div')
      el.className = 'preview-facility-pin'
      el.style.cssText =
        'cursor:pointer;display:flex;flex-direction:column;align-items:center;z-index:35;'
      const safeFacName = highlightedFacility.name.replace(/</g, '&lt;').replace(/>/g, '&gt;')
      el.innerHTML = `
        <div style="position:relative;display:flex;flex-direction:column;align-items:center;">
          <div style="position:absolute;bottom:0px;width:34px;height:34px;border-radius:50%;background:rgba(16,185,129,0.38);box-shadow:0 0 0 4px rgba(16,185,129,0.25);animation:ping 1.6s cubic-bezier(0,0,0.2,1) infinite;"></div>
          <div style="position:absolute;bottom:8px;width:14px;height:14px;border-radius:50%;background:#059669;border:2.5px solid #ffffff;box-shadow:0 2px 5px rgba(0,0,0,0.4);"></div>
          <div style="background:#065f46;color:#ffffff;font-size:10px;font-weight:700;padding:2px 8px;border-radius:9999px;border:1.5px solid #ffffff;box-shadow:0 2px 6px rgba(0,0,0,0.35);margin-bottom:18px;white-space:nowrap;display:flex;align-items:center;gap:4px;">
            <span>📍</span>
            <span>${safeFacName}</span>
          </div>
        </div>
      `
      facilityMarkerRef.current = new maplibregl.Marker({
        element: el,
        anchor: 'bottom',
        offset: [0, 2],
      })
        .setLngLat([facLng, facLat])
        .addTo(map)

      // 3. Move camera to comfortably fit the complete highway path with its bends
      const bounds = new maplibregl.LngLatBounds()
      for (const pt of instantRoute.coordinates) {
        bounds.extend(pt)
      }

      map.fitBounds(bounds, {
        padding: { top: 70, bottom: 70, left: 70, right: 70 },
        maxZoom: 16,
        duration: 800,
      })

      // 4. Fetch high-resolution turn-by-turn road network geometry
      try {
        const roadRoute = await getHighwayDrivingRoute([siteLng, siteLat], [facLng, facLat])
        if (!cancelled && lineSource && roadRoute.coordinates.length > 2) {
          roadRouteCoordsRef.current = roadRoute.coordinates
          lineSource.setData({
            type: 'FeatureCollection',
            features: [
              {
                type: 'Feature',
                properties: { name: highlightedFacility.name, road: roadRoute.roadName },
                geometry: {
                  type: 'LineString',
                  coordinates: roadRoute.coordinates,
                },
              },
            ],
          })

          // Adjust camera to comfortably fit the complete highway path with its bends
          const roadBounds = new maplibregl.LngLatBounds()
          for (const pt of roadRoute.coordinates) {
            roadBounds.extend(pt)
          }
          map.fitBounds(roadBounds, {
            padding: { top: 70, bottom: 70, left: 70, right: 70 },
            maxZoom: 16,
            duration: 650,
          })
        }
      } catch (err) {
        console.warn('Highway route query error:', err)
      }
    }

    if (map.isStyleLoaded()) {
      void applyFacilityRoute()
    } else {
      map.once('load', () => void applyFacilityRoute())
    }

    return () => {
      cancelled = true
      map.off('load', applyFacilityRoute)
    }
  }, [highlightedFacility])

  return <div ref={containerRef} className={className} />
})
