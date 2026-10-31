"""
Script to generate the complete IPOPHL Source Code Deposit Document (.docx)
for "build-safe code".
Official Software Copyright Deposit for the Intellectual Property Office of the Philippines (IPOPHL).
"""

import os
import sys
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn

WORKSPACE = r"c:\Users\Manoling\Desktop\urban-planning-lasam"
OUTPUT_FILENAME = "build-safe code.docx"
OUTPUT_PATH = os.path.join(WORKSPACE, OUTPUT_FILENAME)

SUBSYSTEMS = [
    {
        "id": 1,
        "name": "Application Entry & Core Shell",
        "desc": "Primary HTML entry point, React bootstrapping, main application container with interactive state routing, and global styling.",
        "patterns": [
            "index.html",
            "src/main.tsx",
            "src/App.tsx",
            "src/index.css",
            "src/types/index.ts",
        ]
    },
    {
        "id": 2,
        "name": "AI Knowledge Base & Decision Support (BUILD-SAFE AI)",
        "desc": "Intelligent domain expert engine trained on Lasam CLUP (2020-2029), Building Code (PD 1096), MGB flood criteria, crop conversion rules, and conversational assistant UI.",
        "patterns": [
            "src/lib/ai/buildSafeKnowledge.ts",
            "src/components/layout/BuildSafeChatbot.tsx",
        ]
    },
    {
        "id": 3,
        "name": "Multi-Hazard Site Assessment & Suitability Engine",
        "desc": "Core computational engine calculating spatial intersections with LGU CLUP zoning, MGB flood, PHIVOLCS fault lines, liquefaction, volcanic hazards, slope/erosion, water body buffer safety, farm lot agricultural suitability, nearby infrastructure routing, and official PDF report synthesis.",
        "patterns": [
            "src/lib/assessment/siteAssessment.ts",
            "src/lib/assessment/buildingDimensions.ts",
            "src/lib/assessment/buildingTypes.ts",
            "src/lib/assessment/coverage.ts",
            "src/lib/assessment/facilities.ts",
            "src/lib/assessment/farmFacilities.ts",
            "src/lib/assessment/farmLot.ts",
            "src/lib/assessment/format.ts",
            "src/lib/assessment/googleEarth.ts",
            "src/lib/assessment/hydromet.ts",
            "src/lib/assessment/lgu.ts",
            "src/lib/assessment/nearbyBuildings.ts",
            "src/lib/assessment/proposedBuilding.ts",
            "src/lib/assessment/reportLayout.ts",
            "src/lib/assessment/seismic.ts",
            "src/lib/assessment/volcanic.ts",
            "src/lib/assessment/waterBody.ts",
            "src/lib/assessment/exportAssessmentPdf.ts",
        ]
    },
    {
        "id": 4,
        "name": "Site Assessment User Interface & Report Generation",
        "desc": "Interactive modal sheets, scorecards, route trace indicators, mini preview maps, and site coordinate picker interfaces.",
        "patterns": [
            "src/components/layout/SiteAssessmentPopup.tsx",
            "src/components/layout/AssessmentReportModal.tsx",
            "src/components/layout/AssessmentReportSheet.tsx",
            "src/components/layout/AssessmentResultsCard.tsx",
            "src/components/layout/ProposedBuildingPreviewMap.tsx",
        ]
    },
    {
        "id": 5,
        "name": "Interactive 3D GIS & Cartographic Visualization",
        "desc": "MapLibre GL 3D vector map integration, 3D extruded building models, custom shader styles, road routing, hover inspection legends, camera animations, and basemap underlays.",
        "patterns": [
            "src/components/map/MapView.tsx",
            "src/components/map/MapLegend.tsx",
            "src/components/map/TerrainInfoBar.tsx",
            "src/lib/map/createMap.ts",
            "src/lib/map/styles.ts",
            "src/lib/map/buildingLayers.ts",
            "src/lib/map/basemapUnderlay.ts",
            "src/lib/map/hoverLegend.ts",
            "src/lib/map/lasamView.ts",
            "src/lib/map/layerVisibility.ts",
            "src/lib/map/roadRouting.ts",
            "src/lib/map/visuals.ts",
        ]
    },
    {
        "id": 6,
        "name": "Hazard Simulation & Geospatial Risk Analysis",
        "desc": "Dynamic spatial simulation models for fault rupture zones, earthquake shaking attenuation, MGB flood levels, volcanic ashfall/lahar propagation, and municipal hazard stats.",
        "patterns": [
            "src/lib/simulation/earthquake.ts",
            "src/lib/simulation/fault.ts",
            "src/lib/simulation/faultLegend.ts",
            "src/lib/simulation/flood.ts",
            "src/lib/simulation/lguHazards.ts",
            "src/lib/simulation/lguLayerQuery.ts",
            "src/lib/simulation/mgbFlood.ts",
            "src/lib/simulation/stats.ts",
            "src/lib/simulation/terrain-flood.ts",
            "src/lib/simulation/volcano.ts",
        ]
    },
    {
        "id": 7,
        "name": "Hydrological Modeling & Digital Elevation Processing",
        "desc": "High-resolution DEM raster elevation interrogation, flood water propagation grids, polygon contour extraction, and background Web Worker threads.",
        "patterns": [
            "src/lib/terrain/elevation.ts",
            "src/lib/terrain/flood-grid.ts",
            "src/lib/terrain/flood-worker.ts",
            "src/lib/terrain/mask-to-polygon.ts",
            "src/workers/flood-propagate.worker.ts",
        ]
    },
    {
        "id": 8,
        "name": "UI Controls, Navigation & Information Displays",
        "desc": "Responsive application layout components, hazard toggle drawers, building popups, river info cards, data reliability dialogs, and reusable atomic UI primitives.",
        "patterns": [
            "src/components/layout/BrandLogo.tsx",
            "src/components/layout/BuildingInfoPanel.tsx",
            "src/components/layout/BuildingPopup.tsx",
            "src/components/layout/DatasetReliabilityModal.tsx",
            "src/components/layout/DisclaimerModal.tsx",
            "src/components/layout/GoogleEarthLink.tsx",
            "src/components/layout/HazardPanel.tsx",
            "src/components/layout/Header.tsx",
            "src/components/layout/MapSiteInfoOverlay.tsx",
            "src/components/layout/MapToolbar.tsx",
            "src/components/layout/MobileHazardDrawer.tsx",
            "src/components/layout/RiverInfoCard.tsx",
            "src/components/ErrorBoundary.tsx",
            "src/components/ui/badge.tsx",
            "src/components/ui/button.tsx",
            "src/components/ui/card.tsx",
            "src/components/ui/label.tsx",
            "src/components/ui/slider.tsx",
            "src/components/ui/switch.tsx",
            "src/components/ui/tabs.tsx",
        ]
    },
    {
        "id": 9,
        "name": "Core Utilities, State Hooks & Color Definitions",
        "desc": "Custom React data-loading hooks, spatial caching, color ramps, date/number formatting, and application constants.",
        "patterns": [
            "src/hooks/useMapData.ts",
            "src/lib/constants.ts",
            "src/lib/dataVersion.ts",
            "src/lib/utils.ts",
            "src/lib/buildings/colors.ts",
        ]
    },
    {
        "id": 10,
        "name": "Geospatial Data Pipelines & Preprocessing Scripts",
        "desc": "Server-side and offline Python/Node data pipelines converting raw GIS shapefiles, DEM GeoTIFF conditioning, hydrological flow analysis, OSM feature extraction, and boundary alignment.",
        "patterns": [
            "scripts/enrich-buildings.mjs",
            "scripts/fetch-boundary-psa.mjs",
            "scripts/fetch-dem.mjs",
            "scripts/fetch-facilities.mjs",
            "scripts/fetch-faults.mjs",
            "scripts/fetch-flood-mgb.mjs",
            "scripts/fetch-hydrology.mjs",
            "scripts/generate-buildings.mjs",
            "scripts/convert-agri-shapefiles.mjs",
            "scripts/convert-hazard-shapefiles.mjs",
            "scripts/analyze-hazard-layers.mjs",
            "scripts/hydrology/condition_dem.py",
            "scripts/hydrology/export_web_assets.py",
        ]
    },
    {
        "id": 11,
        "name": "Build, Packaging & Deployment Configuration",
        "desc": "Vite bundler configuration, TypeScript compilation targets, dependency manifests, and Linux deployment scripts.",
        "patterns": [
            "package.json",
            "vite.config.ts",
            "tsconfig.json",
            "tsconfig.app.json",
            "scripts/deploy-onprem.sh",
            "scripts/install-docker-ubuntu.sh",
            "scripts/post-deploy-smoke-onprem.sh",
        ]
    }
]

def get_file_language(filepath: str) -> str:
    ext = os.path.splitext(filepath)[1].lower()
    mapping = {
        ".ts": "TypeScript",
        ".tsx": "TypeScript (React)",
        ".js": "JavaScript",
        ".mjs": "JavaScript (ESM)",
        ".py": "Python",
        ".html": "HTML5",
        ".css": "CSS3 / Tailwind",
        ".json": "JSON Configuration",
        ".sh": "Shell Script (Bash)",
    }
    return mapping.get(ext, "Source Code")

def add_xml_field(paragraph, field_text):
    """Helper to add dynamic Word fields like PAGE and NUMPAGES."""
    run = paragraph.add_run()
    fldChar1 = parse_xml(r'<w:fldChar %s w:fldCharType="begin"/>' % nsdecls('w'))
    instrText = parse_xml(r'<w:instrText %s xml:space="preserve"> %s </w:instrText>' % (nsdecls('w'), field_text))
    fldChar2 = parse_xml(r'<w:fldChar %s w:fldCharType="separate"/>' % nsdecls('w'))
    fldChar3 = parse_xml(r'<w:fldChar %s w:fldCharType="end"/>' % nsdecls('w'))
    run._r.append(fldChar1)
    run._r.append(instrText)
    run._r.append(fldChar2)
    run._r.append(fldChar3)

def main():
    print("Collecting files for IPOPHL Document...")
    
    all_files = []
    
    for sub in SUBSYSTEMS:
        sub_files = []
        for pat in sub["patterns"]:
            normalized_pat = pat.replace("/", "\\")
            full_path = os.path.join(WORKSPACE, normalized_pat)
            if os.path.exists(full_path) and os.path.isfile(full_path):
                with open(full_path, "r", encoding="utf-8", errors="replace") as f:
                    content = f.read()
                    lines = content.splitlines()
                sub_files.append({
                    "rel_path": pat,
                    "full_path": full_path,
                    "lang": get_file_language(pat),
                    "line_count": len(lines),
                    "lines": lines
                })
            else:
                print(f"Warning: file not found: {pat}")
        sub["files"] = sub_files
        all_files.extend(sub_files)

    total_files = len(all_files)
    total_loc = sum(f["line_count"] for f in all_files)
    print(f"Total Subsystems: {len(SUBSYSTEMS)}")
    print(f"Total Source Code Files: {total_files}")
    print(f"Total Lines of Code: {total_loc:,}")

    # Build Word Document
    print("Generating Word Document (.docx)...")
    doc = docx.Document()

    # Configure Margins
    for section in doc.sections:
        section.top_margin = Inches(0.65)
        section.bottom_margin = Inches(0.65)
        section.left_margin = Inches(0.65)
        section.right_margin = Inches(0.65)
        section.page_width = Inches(8.5)
        section.page_height = Inches(11.0)
        
        # Header
        header = section.header
        hp = header.paragraphs[0]
        hp.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        hrun = hp.add_run("BUILD-SAFE (Lasam, Cagayan) — IPOPHL Source Code Deposit  |  Identifier: build-safe code")
        hrun.font.name = "Arial"
        hrun.font.size = Pt(8)
        hrun.font.color.rgb = RGBColor(120, 120, 120)

        # Footer with dynamic page numbering
        footer = section.footer
        fp = footer.paragraphs[0]
        fp.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        frun1 = fp.add_run("Official Source Code Deposit (Class: Computer Program)   |   Page ")
        frun1.font.name = "Arial"
        frun1.font.size = Pt(8)
        frun1.font.color.rgb = RGBColor(120, 120, 120)
        
        add_xml_field(fp, "PAGE")
        
        frun2 = fp.add_run(" of ")
        frun2.font.name = "Arial"
        frun2.font.size = Pt(8)
        frun2.font.color.rgb = RGBColor(120, 120, 120)
        
        add_xml_field(fp, "NUMPAGES")

    # Styles
    styles = doc.styles

    code_style = styles.add_style("SourceCodeLine", docx.enum.style.WD_STYLE_TYPE.PARAGRAPH)
    code_style.font.name = "Consolas"
    code_style.font.size = Pt(7.2)
    code_style.font.color.rgb = RGBColor(30, 35, 45)
    code_style.paragraph_format.space_before = Pt(0)
    code_style.paragraph_format.space_after = Pt(0)
    code_style.paragraph_format.line_spacing = 1.0

    # -------------------------------------------------------------------------
    # COVER PAGE
    # -------------------------------------------------------------------------
    title_p = doc.add_paragraph()
    title_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    title_p.paragraph_format.space_before = Pt(36)
    title_p.paragraph_format.space_after = Pt(6)
    
    r_rep = title_p.add_run("REPUBLIC OF THE PHILIPPINES\nINTELLECTUAL PROPERTY OFFICE OF THE PHILIPPINES (IPOPHL)\n")
    r_rep.font.name = "Arial"
    r_rep.font.size = Pt(11)
    r_rep.font.bold = True
    r_rep.font.color.rgb = RGBColor(60, 60, 60)

    r_bur = title_p.add_run("BUREAU OF COPYRIGHT AND OTHER RELATED RIGHTS\n")
    r_bur.font.name = "Arial"
    r_bur.font.size = Pt(10)
    r_bur.font.color.rgb = RGBColor(100, 100, 100)

    div_p = doc.add_paragraph()
    div_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    div_p.paragraph_format.space_before = Pt(8)
    div_p.paragraph_format.space_after = Pt(14)
    r_div = div_p.add_run("_________________________________________________________________________________")
    r_div.font.color.rgb = RGBColor(0, 102, 68)

    h1_p = doc.add_paragraph()
    h1_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    h1_p.paragraph_format.space_after = Pt(8)
    r_h1 = h1_p.add_run("COMPLETE SOURCE CODE DEPOSIT\nFOR COPYRIGHT REGISTRATION")
    r_h1.font.name = "Arial"
    r_h1.font.size = Pt(20)
    r_h1.font.bold = True
    r_h1.font.color.rgb = RGBColor(15, 60, 40)

    p_work = doc.add_paragraph()
    p_work.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_work.paragraph_format.space_after = Pt(16)
    r_work = p_work.add_run("Title of Work / Computer Program:\n")
    r_work.font.name = "Arial"
    r_work.font.size = Pt(11)
    r_work.font.color.rgb = RGBColor(80, 80, 80)
    r_work_title = p_work.add_run("BUILD-SAFE: AI-Assisted Site Assessment & Urban/Agricultural Hazard Screening System for Lasam, Cagayan")
    r_work_title.font.name = "Arial"
    r_work_title.font.size = Pt(13.5)
    r_work_title.font.bold = True
    r_work_title.font.color.rgb = RGBColor(0, 102, 68)

    # Metadata Box
    meta_p = doc.add_paragraph()
    meta_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    meta_p.paragraph_format.space_after = Pt(22)
    
    r_meta = meta_p.add_run(
        "Application Deposit Identifier: build-safe code\n"
        "Classification: Computer Program / Software Application (Republic Act No. 8293)\n"
        "Date of Deposit / Generation: October 2026\n"
        "Target Local Government Unit (LGU): Municipality of Lasam, Province of Cagayan (Region II)\n"
        "Primary Frameworks: TypeScript 5.x, React 19.x, Python 3.11, MapLibre GL 3D, Vite\n"
    )
    r_meta.font.name = "Calibri"
    r_meta.font.size = Pt(10)
    r_meta.font.color.rgb = RGBColor(50, 50, 50)

    # Summary Stats Table on Cover
    table_cov = doc.add_table(rows=5, cols=2)
    table_cov.alignment = WD_TABLE_ALIGNMENT.CENTER
    cov_data = [
        ("Total Functional Subsystems", f"{len(SUBSYSTEMS)} Core Modules"),
        ("Total Source Code Files Included", f"{total_files} Files"),
        ("Total Lines of Source Code (LOC)", f"{total_loc:,} Lines (100% Unabridged)"),
        ("Primary Technical Languages", "TypeScript (TSX/TS), Python, JavaScript, CSS/Tailwind, Bash"),
        ("Statutory Compliance", "CLUP 2020-2029, PD 1096 (Nat'l Building Code), MGB/PHIVOLCS Standards"),
    ]
    for row_idx, (lbl, val) in enumerate(cov_data):
        row = table_cov.rows[row_idx]
        cell_0 = row.cells[0]
        cell_1 = row.cells[1]
        cell_0.width = Inches(2.6)
        cell_1.width = Inches(4.5)
        
        p0 = cell_0.paragraphs[0]
        p0.paragraph_format.space_before = Pt(2.5)
        p0.paragraph_format.space_after = Pt(2.5)
        r0 = p0.add_run(lbl)
        r0.font.name = "Arial"
        r0.font.size = Pt(9.5)
        r0.font.bold = True
        r0.font.color.rgb = RGBColor(20, 30, 45)
        
        p1 = cell_1.paragraphs[0]
        p1.paragraph_format.space_before = Pt(2.5)
        p1.paragraph_format.space_after = Pt(2.5)
        r1 = p1.add_run(val)
        r1.font.name = "Arial"
        r1.font.size = Pt(9.5)
        r1.font.color.rgb = RGBColor(40, 60, 80)
        
        shd0 = parse_xml(r'<w:shd {} w:fill="F0F4F8"/>'.format(nsdecls('w')))
        cell_0._tc.get_or_add_tcPr().append(shd0)
        shd1 = parse_xml(r'<w:shd {} w:fill="FAFCFD"/>'.format(nsdecls('w')))
        cell_1._tc.get_or_add_tcPr().append(shd1)

    doc.add_page_break()

    # -------------------------------------------------------------------------
    # EXECUTIVE SUMMARY & SYSTEM ARCHITECTURE
    # -------------------------------------------------------------------------
    sec_p = doc.add_paragraph()
    sec_p.paragraph_format.space_before = Pt(12)
    sec_p.paragraph_format.space_after = Pt(4)
    r_sec = sec_p.add_run("1. Technical Overview & System Architecture")
    r_sec.font.name = "Arial"
    r_sec.font.size = Pt(14)
    r_sec.font.bold = True
    r_sec.font.color.rgb = RGBColor(0, 102, 68)

    desc_p = doc.add_paragraph()
    desc_p.paragraph_format.space_after = Pt(8)
    r_desc = desc_p.add_run(
        "BUILD-SAFE is a specialized Geographic Information System (GIS) and AI-assisted decision-support software application "
        "designed specifically for the Municipality of Lasam, Cagayan. The software automates multi-hazard screening, land-use zoning "
        "compliance, agricultural crop suitability evaluation, and site risk analysis for urban planning, building permit screening, "
        "and disaster risk reduction."
    )
    r_desc.font.name = "Arial"
    r_desc.font.size = Pt(9.5)
    r_desc.font.color.rgb = RGBColor(40, 40, 40)

    arch_bullets = [
        ("Multi-Hazard Spatial Intersections: ", "Evaluates coordinates against Lasam Comprehensive Land Use Plan (CLUP 2020–2029) zoning, Mines and Geosciences Bureau (MGB) 5-year/25-year/100-year flood hazards, PHIVOLCS active faults (San Vicente & Lasam segments), liquefaction sensitivity, volcanic ashfall/lahar risks, slope steepness, and water body safety buffers."),
        ("Proposed Building & Farm Lot Evaluation: ", "Screening engine supports both structural building types (Residential, Commercial, Industrial, Institutional, Infrastructure) and agricultural farm lots (Rice, Corn, Cassava, Fruit Trees, Vegetables, Agroforestry) with custom zoning clearance logic and NPAAAD/SAFDZ agricultural preservation compliance."),
        ("BUILD-SAFE AI Conversational Agent: ", "An integrated domain knowledge assistant providing context-aware guidance on required municipal permits, PD 1096 building code compliance, flood mitigation retrofitting, and land conversion processes."),
        ("3D GIS Interactive Cartography: ", "MapLibre GL based cartographic engine rendering 3D extruded building structures, realistic elevation terrain, dynamic flood water levels, route traces to critical facilities (hospitals, schools, evacuation centers, bridges), and real-time hazard overlays."),
        ("Client-Side Hydrological Propagation: ", "High-performance background Web Workers running elevation grid analysis and flood propagation algorithms directly on user devices without external cloud compute latency."),
        ("Automated Municipal Assessment Reports: ", "Generates structured PDF assessment certificates and downloadable maps complete with precise geodetic coordinates, legal disclaimers, zoning classifications, and mitigation recommendations.")
    ]

    for b_title, b_text in arch_bullets:
        bp = doc.add_paragraph(style='List Bullet')
        bp.paragraph_format.space_before = Pt(2.5)
        bp.paragraph_format.space_after = Pt(2.5)
        rb1 = bp.add_run(b_title)
        rb1.font.name = "Arial"
        rb1.font.size = Pt(9)
        rb1.font.bold = True
        rb1.font.color.rgb = RGBColor(20, 30, 45)
        rb2 = bp.add_run(b_text)
        rb2.font.name = "Arial"
        rb2.font.size = Pt(9)
        rb2.font.color.rgb = RGBColor(50, 50, 50)

    doc.add_page_break()

    # -------------------------------------------------------------------------
    # TABLE OF CONTENTS / SOURCE CODE MANIFEST
    # -------------------------------------------------------------------------
    toc_p = doc.add_paragraph()
    toc_p.paragraph_format.space_before = Pt(12)
    toc_p.paragraph_format.space_after = Pt(4)
    r_toc = toc_p.add_run("2. Complete Source Code Manifest (Table of Contents)")
    r_toc.font.name = "Arial"
    r_toc.font.size = Pt(14)
    r_toc.font.bold = True
    r_toc.font.color.rgb = RGBColor(0, 102, 68)

    toc_sub = doc.add_paragraph()
    toc_sub.paragraph_format.space_after = Pt(8)
    r_toc_sub = toc_sub.add_run("Complete index of all 103 source code files deposited under 'build-safe code', categorized by functional subsystem.")
    r_toc_sub.font.name = "Arial"
    r_toc_sub.font.size = Pt(9)
    r_toc_sub.font.color.rgb = RGBColor(80, 80, 80)

    # Manifest Table
    table_man = doc.add_table(rows=total_files + 1, cols=4)
    table_man.alignment = WD_TABLE_ALIGNMENT.CENTER
    table_man.autofit = False

    # Header Row
    headers = ["#", "File Path", "Language", "LOC"]
    widths = [Inches(0.4), Inches(4.5), Inches(1.6), Inches(0.7)]
    hdr_row = table_man.rows[0]
    for idx, (h_text, w) in enumerate(zip(headers, widths)):
        cell = hdr_row.cells[idx]
        cell.width = w
        p = cell.paragraphs[0]
        p.paragraph_format.space_before = Pt(3)
        p.paragraph_format.space_after = Pt(3)
        r = p.add_run(h_text)
        r.font.name = "Arial"
        r.font.size = Pt(8.5)
        r.font.bold = True
        r.font.color.rgb = RGBColor(255, 255, 255)
        shd = parse_xml(r'<w:shd {} w:fill="0D5C3A"/>'.format(nsdecls('w')))
        cell._tc.get_or_add_tcPr().append(shd)

    # Populate Manifest Rows
    item_idx = 1
    for sub in SUBSYSTEMS:
        for f in sub["files"]:
            row = table_man.rows[item_idx]
            vals = [str(item_idx), f["rel_path"], f["lang"], f"{f['line_count']:,}"]
            bg_color = "F9FBFC" if item_idx % 2 == 1 else "FFFFFF"
            for c_idx, (val, w) in enumerate(zip(vals, widths)):
                cell = row.cells[c_idx]
                cell.width = w
                p = cell.paragraphs[0]
                p.paragraph_format.space_before = Pt(1.5)
                p.paragraph_format.space_after = Pt(1.5)
                if c_idx == 3:
                    p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
                elif c_idx == 0:
                    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
                r = p.add_run(val)
                r.font.name = "Consolas" if c_idx == 1 else "Arial"
                r.font.size = Pt(7.5 if c_idx == 1 else 8)
                r.font.color.rgb = RGBColor(20, 20, 20)
                shd = parse_xml(r'<w:shd {} w:fill="{}"/>'.format(nsdecls('w'), bg_color))
                cell._tc.get_or_add_tcPr().append(shd)
            item_idx += 1

    doc.add_page_break()

    # -------------------------------------------------------------------------
    # SOURCE CODE LISTINGS (ORGANIZED BY SUBSYSTEM)
    # -------------------------------------------------------------------------
    print("Writing source code listings for each subsystem...")

    global_file_idx = 1
    for sub_idx, sub in enumerate(SUBSYSTEMS):
        print(f"  Adding Subsystem {sub['id']}: {sub['name']} ({len(sub['files'])} files)...")
        
        # Subsystem Header Banner
        sub_p = doc.add_paragraph()
        sub_p.paragraph_format.space_before = Pt(16)
        sub_p.paragraph_format.space_after = Pt(4)
        r_sub_h = sub_p.add_run(f"Subsystem {sub['id']}: {sub['name']}")
        r_sub_h.font.name = "Arial"
        r_sub_h.font.size = Pt(13)
        r_sub_h.font.bold = True
        r_sub_h.font.color.rgb = RGBColor(0, 102, 68)

        sub_desc_p = doc.add_paragraph()
        sub_desc_p.paragraph_format.space_after = Pt(8)
        r_sub_desc = sub_desc_p.add_run(sub["desc"])
        r_sub_desc.font.name = "Arial"
        r_sub_desc.font.size = Pt(8.5)
        r_sub_desc.font.italic = True
        r_sub_desc.font.color.rgb = RGBColor(80, 80, 80)

        # Loop through each file in subsystem
        for f in sub["files"]:
            # File Banner Table
            f_table = doc.add_table(rows=1, cols=1)
            f_table.alignment = WD_TABLE_ALIGNMENT.CENTER
            f_table.autofit = False
            cell = f_table.rows[0].cells[0]
            cell.width = Inches(7.2)
            
            cp = cell.paragraphs[0]
            cp.paragraph_format.space_before = Pt(3)
            cp.paragraph_format.space_after = Pt(3)
            
            r_num = cp.add_run(f"[{global_file_idx:03d}] ")
            r_num.font.name = "Consolas"
            r_num.font.size = Pt(9)
            r_num.font.bold = True
            r_num.font.color.rgb = RGBColor(0, 102, 68)

            r_path = cp.add_run(f"{f['rel_path']}\n")
            r_path.font.name = "Consolas"
            r_path.font.size = Pt(9)
            r_path.font.bold = True
            r_path.font.color.rgb = RGBColor(15, 30, 50)

            r_info = cp.add_run(f"Language: {f['lang']}  |  Lines of Code: {f['line_count']:,}  |  Subsystem: {sub['name']}")
            r_info.font.name = "Arial"
            r_info.font.size = Pt(8)
            r_info.font.color.rgb = RGBColor(85, 95, 110)

            # Shading for file header banner
            shd = parse_xml(r'<w:shd {} w:fill="EBF2F7"/>'.format(nsdecls('w')))
            cell._tc.get_or_add_tcPr().append(shd)

            # Code listing with line numbers
            code_p = doc.add_paragraph(style="SourceCodeLine")
            code_p.paragraph_format.space_before = Pt(3)
            code_p.paragraph_format.space_after = Pt(8)
            
            formatted_lines = []
            for l_idx, line in enumerate(f["lines"], start=1):
                clean_line = line.replace("\t", "  ")
                formatted_lines.append(f"{l_idx:4d} | {clean_line}")
            
            code_text = "\n".join(formatted_lines)
            r_code = code_p.add_run(code_text)
            r_code.font.name = "Consolas"
            r_code.font.size = Pt(7.2)
            r_code.font.color.rgb = RGBColor(25, 30, 40)

            global_file_idx += 1

        # Page break between subsystems (except last)
        if sub_idx < len(SUBSYSTEMS) - 1:
            doc.add_page_break()

    print(f"Saving document to {OUTPUT_PATH}...")
    doc.save(OUTPUT_PATH)

    alt_output = os.path.join(WORKSPACE, "build-safe-code.docx")
    doc.save(alt_output)

    file_size_mb = os.path.getsize(OUTPUT_PATH) / (1024 * 1024)
    print(f"SUCCESS! Document created: {OUTPUT_FILENAME}")
    print(f"Alternative copy created: build-safe-code.docx")
    print(f"File size: {file_size_mb:.2f} MB")
    print(f"Total files written: {global_file_idx - 1}")

if __name__ == "__main__":
    main()
