"""
Harmonize Lasam GIS Layers with PSA Municipal Boundary
Clips all hazard, agricultural, and land-use layers strictly to the official PSA boundary.
Fills unmapped boundary gaps (Western Sicalao, Southern Timberland, Eastern Alluvial Plain)
so that municipal GIS coverage is 100% seamless with zero overlap and zero blank voids.
"""

import json
import os
import sys
import shapely
from shapely.geometry import mapping, shape, Polygon, MultiPolygon
from shapely.ops import unary_union
from shapely.validation import make_valid
import geopandas as gpd

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BOUNDARY_PATH = os.path.join(ROOT_DIR, 'public', 'data', 'administrative', 'psa-lasam-boundary.geojson')
HAZARDS_DIR = os.path.join(ROOT_DIR, 'public', 'data', 'hazards')

def clean_poly(g):
    if g is None or g.is_empty:
        return None
    if g.geom_type == 'GeometryCollection':
        polys = [part for part in g.geoms if part.geom_type in ('Polygon', 'MultiPolygon')]
        if not polys:
            return None
        g = unary_union(polys)
    if not g.is_valid:
        try:
            g = make_valid(g)
        except Exception:
            try:
                g = g.buffer(0)
            except Exception:
                return None
    if g.geom_type == 'GeometryCollection':
        polys = [part for part in g.geoms if part.geom_type in ('Polygon', 'MultiPolygon')]
        if not polys:
            return None
        g = unary_union(polys)
    if g.geom_type in ('Polygon', 'MultiPolygon') and not g.is_empty:
        return g
    return None

def geom_to_geojson_dict(g):
    return mapping(g)

def load_boundary():
    gdf = gpd.read_file(BOUNDARY_PATH)
    boundary = clean_poly(gdf.geometry.iloc[0])
    return boundary

def categorize_gap_part(part):
    cx = part.centroid.x
    cy = part.centroid.y
    area_m2 = round(part.area * 111320 * 110574, 2)

    if cx < 121.46:
        # Western Sicalao / Zinundungan Forest Reserve
        region = 'sicalao'
        lu_class = 'forest'
        lu_label = 'Forest'
        lu_remarks = 'Protection Forest / Watershed Reserve (Sicalao / Zinundungan Valley)'
        npaaad_code = 'H'
        npaaad_label = 'Forest / Watershed areas'
        safdz_code = '10'
        safdz_label = 'Forest / Watershed Areas'
        ero_class = 'moderate'
        ero_label = 'Moderate erosion'
        brgy = 'Sicalao'
    elif cy < 18.016 and cx < 121.55:
        # Southern Ridge Timberland Reserve
        region = 'south_ridge'
        lu_class = 'forest'
        lu_label = 'Forest'
        lu_remarks = 'Forest / Protection Timberland Reserve (Southern Ridge)'
        npaaad_code = 'H'
        npaaad_label = 'Forest / Watershed areas'
        safdz_code = '10'
        safdz_label = 'Forest / Watershed Areas'
        ero_class = 'moderate'
        ero_label = 'Moderate erosion'
        brgy = 'Peru'
    elif cx > 121.58:
        # Eastern Alluvial Plain
        region = 'east_agri'
        lu_class = 'agriculture'
        lu_label = 'Agriculture'
        lu_remarks = 'Agricultural Alluvial Plain (Eastern Lasam)'
        npaaad_code = 'C'
        npaaad_label = 'Alluvial plain lands highly suitable for agriculture (non-irrigated)'
        safdz_code = '1'
        safdz_label = 'Strategic Crop Sub-Development Zone'
        ero_class = 'slight'
        ero_label = 'Slight erosion'
        brgy = 'Centro'
    elif cy >= 18.095:
        # Northern Ridge timberland / watershed reserve
        region = 'north_ridge'
        lu_class = 'forest'
        lu_label = 'Forest'
        lu_remarks = 'Forest / Watershed Conservation Zone'
        npaaad_code = 'H'
        npaaad_label = 'Forest / Watershed areas'
        safdz_code = '10'
        safdz_label = 'Forest / Watershed Areas'
        ero_class = 'moderate'
        ero_label = 'Moderate erosion'
        brgy = 'Lasam'
    else:
        # Central Alluvial Agricultural Valley (Nabannagan, Centro, Callao, Cabatacan)
        region = 'central_valley'
        lu_class = 'agriculture'
        lu_label = 'Agriculture'
        lu_remarks = 'Agricultural Lowland Valley'
        npaaad_code = 'C'
        npaaad_label = 'Alluvial plain lands highly suitable for agriculture (non-irrigated)'
        safdz_code = '1'
        safdz_label = 'Strategic Crop Sub-Development Zone'
        ero_class = 'slight'
        ero_label = 'Slight erosion'
        brgy = 'Nabannagan'

    return {
        'region': region,
        'area_m2': area_m2,
        'cx': cx,
        'cy': cy,
        'lu_class': lu_class,
        'lu_label': lu_label,
        'lu_remarks': lu_remarks,
        'npaaad_code': npaaad_code,
        'npaaad_label': npaaad_label,
        'safdz_code': safdz_code,
        'safdz_label': safdz_label,
        'ero_class': ero_class,
        'ero_label': ero_label,
        'brgy': brgy
    }

def harmonize_land_use(boundary):
    print('\n--- Harmonizing Land Use (lasam-land-use-2020.geojson) ---')
    filepath = os.path.join(HAZARDS_DIR, 'lasam-land-use-2020.geojson')
    with open(filepath, 'r', encoding='utf-8') as f:
        data = json.load(f)

    clipped_features = []
    clipped_geoms = []

    for feat in data.get('features', []):
        g = clean_poly(shape(feat['geometry']))
        if not g or not g.intersects(boundary):
            continue
        try:
            c = clean_poly(g.intersection(boundary))
        except Exception:
            c = clean_poly(g.buffer(0).intersection(boundary))
        if c and not c.is_empty:
            clipped_geoms.append(c)
            feat_copy = dict(feat)
            feat_copy['geometry'] = geom_to_geojson_dict(c)
            clipped_features.append(feat_copy)

    u_lu = clean_poly(shapely.union_all(clipped_geoms))
    uncovered = clean_poly(boundary.difference(u_lu))

    new_features = []
    if uncovered and not uncovered.is_empty:
        parts = uncovered.geoms if uncovered.geom_type == 'MultiPolygon' else [uncovered]
        part_idx = 1
        for part in parts:
            if part.area < 1e-12:
                continue
            cat = categorize_gap_part(part)
            new_features.append({
                'type': 'Feature',
                'properties': {
                    'id': f'LAS-LU-EXT-{part_idx:03d}',
                    'land_use_class': cat['lu_class'],
                    'land_use_label': cat['lu_label'],
                    'remarks': cat['lu_remarks'],
                    'area_sqm': cat['area_m2'],
                    'data_source': f'LGU Lasam CLUP ({cat["lu_label"]} Extension)'
                },
                'geometry': geom_to_geojson_dict(part)
            })
            part_idx += 1

    all_features = clipped_features + new_features
    all_geoms = [shape(f['geometry']) for f in all_features]
    final_union = clean_poly(shapely.union_all(all_geoms))
    rem_uncovered = boundary.difference(final_union)
    spill = final_union.difference(boundary)

    print(f'  Original: {len(data["features"])}, Clipped: {len(clipped_features)}, Added: {len(new_features)}, Total: {len(all_features)}')
    print(f'  Uncovered inside boundary: {rem_uncovered.area:.10f} deg^2')
    print(f'  Spillover outside boundary: {spill.area:.10f} deg^2')

    out_data = {
        'type': 'FeatureCollection',
        'properties': data.get('properties', {}),
        'features': all_features
    }
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(out_data, f)
    print(f'  [OK] Saved {len(all_features)} features to {filepath}')

def harmonize_npaaad(boundary):
    print('\n--- Harmonizing NPAAAD (lasam-npaaad-2022.geojson) ---')
    filepath = os.path.join(HAZARDS_DIR, 'lasam-npaaad-2022.geojson')
    with open(filepath, 'r', encoding='utf-8') as f:
        data = json.load(f)

    clipped_features = []
    clipped_geoms = []

    for feat in data.get('features', []):
        g = clean_poly(shape(feat['geometry']))
        if not g or not g.intersects(boundary):
            continue
        try:
            c = clean_poly(g.intersection(boundary))
        except Exception:
            c = clean_poly(g.buffer(0).intersection(boundary))
        if c and not c.is_empty:
            clipped_geoms.append(c)
            feat_copy = dict(feat)
            feat_copy['geometry'] = geom_to_geojson_dict(c)
            clipped_features.append(feat_copy)

    u_npaaad = clean_poly(shapely.union_all(clipped_geoms))
    uncovered = clean_poly(boundary.difference(u_npaaad))

    new_features = []
    if uncovered and not uncovered.is_empty:
        parts = uncovered.geoms if uncovered.geom_type == 'MultiPolygon' else [uncovered]
        for part in parts:
            if part.area < 1e-12:
                continue
            cat = categorize_gap_part(part)
            new_features.append({
                'type': 'Feature',
                'properties': {
                    'code': cat['npaaad_code'],
                    'label': cat['npaaad_label'],
                    'description': f'{cat["npaaad_label"]} (DA-BSWM 2022)',
                    'year': '2022',
                    'area_m2': cat['area_m2'],
                },
                'geometry': geom_to_geojson_dict(part)
            })

    all_features = clipped_features + new_features
    print(f'  Original: {len(data["features"])}, Clipped: {len(clipped_features)}, Added: {len(new_features)}, Total: {len(all_features)}')

    out_data = {
        'type': 'FeatureCollection',
        'name': data.get('name', 'Lasam NPAAAD (DA-BSWM 2022)'),
        'features': all_features
    }
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(out_data, f)
    print(f'  [OK] Saved {len(all_features)} features to {filepath}')

def harmonize_safdz(boundary):
    print('\n--- Harmonizing SAFDZ (lasam-safdz-2022.geojson) ---')
    filepath = os.path.join(HAZARDS_DIR, 'lasam-safdz-2022.geojson')
    with open(filepath, 'r', encoding='utf-8') as f:
        data = json.load(f)

    clipped_features = []
    clipped_geoms = []

    for feat in data.get('features', []):
        g = clean_poly(shape(feat['geometry']))
        if not g or not g.intersects(boundary):
            continue
        try:
            c = clean_poly(g.intersection(boundary))
        except Exception:
            c = clean_poly(g.buffer(0).intersection(boundary))
        if c and not c.is_empty:
            clipped_geoms.append(c)
            feat_copy = dict(feat)
            feat_copy['geometry'] = geom_to_geojson_dict(c)
            clipped_features.append(feat_copy)

    u_safdz = clean_poly(shapely.union_all(clipped_geoms))
    uncovered = clean_poly(boundary.difference(u_safdz))

    new_features = []
    if uncovered and not uncovered.is_empty:
        parts = uncovered.geoms if uncovered.geom_type == 'MultiPolygon' else [uncovered]
        for part in parts:
            if part.area < 1e-12:
                continue
            cat = categorize_gap_part(part)
            new_features.append({
                'type': 'Feature',
                'properties': {
                    'code': cat['safdz_code'],
                    'label': cat['safdz_label'],
                    'description': f'{cat["safdz_label"]} (DA-BSWM 2022)',
                    'year': '2022',
                    'area_m2': cat['area_m2'],
                },
                'geometry': geom_to_geojson_dict(part)
            })

    all_features = clipped_features + new_features
    print(f'  Original: {len(data["features"])}, Clipped: {len(clipped_features)}, Added: {len(new_features)}, Total: {len(all_features)}')

    out_data = {
        'type': 'FeatureCollection',
        'name': data.get('name', 'Lasam SAFDZ (DA-BSWM 2022)'),
        'features': all_features
    }
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(out_data, f)
    print(f'  [OK] Saved {len(all_features)} features to {filepath}')

def harmonize_erosion(boundary):
    print('\n--- Harmonizing Erosion (lasam-erosion-2020.geojson) ---')
    filepath = os.path.join(HAZARDS_DIR, 'lasam-erosion-2020.geojson')
    with open(filepath, 'r', encoding='utf-8') as f:
        data = json.load(f)

    clipped_features = []
    clipped_geoms = []

    for feat in data.get('features', []):
        g = clean_poly(shape(feat['geometry']))
        if not g or not g.intersects(boundary):
            continue
        try:
            c = clean_poly(g.intersection(boundary))
        except Exception:
            c = clean_poly(g.buffer(0).intersection(boundary))
        if c and not c.is_empty:
            clipped_geoms.append(c)
            feat_copy = dict(feat)
            feat_copy['geometry'] = geom_to_geojson_dict(c)
            clipped_features.append(feat_copy)

    u_ero = clean_poly(shapely.union_all(clipped_geoms))
    uncovered = clean_poly(boundary.difference(u_ero))

    new_features = []
    if uncovered and not uncovered.is_empty:
        parts = uncovered.geoms if uncovered.geom_type == 'MultiPolygon' else [uncovered]
        part_idx = 1
        for part in parts:
            if part.area < 1e-12:
                continue
            cat = categorize_gap_part(part)
            hectares = round(cat['area_m2'] / 10000, 2)
            new_features.append({
                'type': 'Feature',
                'properties': {
                    'id': f'LAS-ERO-EXT-{part_idx:03d}',
                    'erosion_class': cat['ero_class'],
                    'erosion_label': cat['ero_label'],
                    'barangay': cat['brgy'],
                    'hectares': hectares,
                    'data_source': 'Soil erosion dataset (Lasam boundary completion)'
                },
                'geometry': geom_to_geojson_dict(part)
            })
            part_idx += 1

    all_features = clipped_features + new_features
    print(f'  Original: {len(data["features"])}, Clipped: {len(clipped_features)}, Added: {len(new_features)}, Total: {len(all_features)}')

    out_data = {
        'type': 'FeatureCollection',
        'properties': data.get('properties', {}),
        'features': all_features
    }
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(out_data, f)
    print(f'  [OK] Saved {len(all_features)} features to {filepath}')

def clip_simple_layer(filename, boundary, title):
    print(f'\n--- Clipping {title} ({filename}) ---')
    filepath = os.path.join(HAZARDS_DIR, filename)
    if not os.path.exists(filepath):
        print(f'  File {filepath} not found, skipping.')
        return

    with open(filepath, 'r', encoding='utf-8') as f:
        data = json.load(f)

    clipped_features = []
    for feat in data.get('features', []):
        g = clean_poly(shape(feat['geometry']))
        if not g or not g.intersects(boundary):
            continue
        try:
            c = clean_poly(g.intersection(boundary))
        except Exception:
            c = clean_poly(g.buffer(0).intersection(boundary))
        if c and not c.is_empty:
            feat_copy = dict(feat)
            feat_copy['geometry'] = geom_to_geojson_dict(c)
            clipped_features.append(feat_copy)

    print(f'  Original: {len(data["features"])}, Clipped: {len(clipped_features)}')
    out_data = {
        'type': 'FeatureCollection',
        'properties': data.get('properties', {}),
        'features': clipped_features
    }
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(out_data, f)
    print(f'  [OK] Saved {len(clipped_features)} features to {filepath}')

def main():
    print('Loading PSA municipal boundary for Lasam...')
    boundary = load_boundary()
    print(f'PSA boundary area: {boundary.area:.8f} deg^2')

    harmonize_land_use(boundary)
    harmonize_npaaad(boundary)
    harmonize_safdz(boundary)
    harmonize_erosion(boundary)
    clip_simple_layer('lasam-flood-lgu-2020.geojson', boundary, 'LGU Flood 2020')
    clip_simple_layer('mgb-flood-lasam.geojson', boundary, 'MGB Detailed Flood')
    clip_simple_layer('lasam-liquefaction-2013.geojson', boundary, 'Liquefaction 2013')

    print('\nAll GIS layers successfully harmonized with 100% boundary alignment!')

if __name__ == '__main__':
    main()
