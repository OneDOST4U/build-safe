import { jsPDF } from 'jspdf'
import { getGoogleMapsUrl } from '@/lib/assessment/googleEarth'
import {
  REPORT_HEADER,
  REPORT_LAYOUT,
  REPORT_PAGE,
  reportBodyHeightMm,
  reportColumnWidthsMm,
} from '@/lib/assessment/reportLayout'
import { APP_LOGO_PATH } from '@/lib/constants'
import type { AssessmentRow, SiteAssessmentResult } from '@/types'

const ROW_PAD_X = 1.5
const LABEL_RATIO = 0.40

export interface ExportAssessmentPdfInput {
  mapDataUrl: string
  result: SiteAssessmentResult
  logoDataUrl?: string
}

function pdfText(text: string): string {
  return text
    .replace(/[🚫❌]/gu, '[RESTRICTED] ')
    .replace(/[⚠️⚡]/gu, '[WARNING] ')
    .replace(/[✅🟢]/gu, '[OK] ')
    .replace(/[🟡]/gu, '[CAUTION] ')
    .replace(/[🔴]/gu, '[HIGH RISK] ')
    .replace(/[🌾🌽🥔🥬🏢🚗📍]/gu, '')
    .replace(/\[RESTRICTED\]\s*\[OK\]/gu, '[RESTRICTED]')
    .replace(/\[OK\]\s*\[RESTRICTED\]/gu, '[RESTRICTED]')
    .replace(/\u2264/gu, '<=')
    .replace(/\u2265/gu, '>=')
    .replace(/[\u2013\u2014]/gu, '-')
    .replace(/\u00b0/gu, ' deg')
    .replace(/\bCrops\b/g, 'Agriculture')
    .replace(/\bcrops\b/g, 'agriculture')
    .replace(/\s+/g, ' ')
    .trim()
}

function loadImageDataUrl(src: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Canvas unavailable'))
        return
      }
      ctx.drawImage(img, 0, 0)
      resolve(canvas.toDataURL('image/png'))
    }
    img.onerror = () => reject(new Error(`Failed to load ${src}`))
    img.src = src
  })
}

interface LayoutConfig {
  fontSize: number
  lineH: number
  rowPadding: number
  sectionTitleH: number
  sectionBottomPad: number
  sectionGap: number
}

function computeConfig(fontSize: number): LayoutConfig {
  const lineH = Number((fontSize * 0.40).toFixed(2))
  const rowPadding = Number(Math.max(0.35, Math.min(1.1, 0.35 + (fontSize - 4.2) * 0.28)).toFixed(2))
  const sectionTitleH = Number(Math.max(2.6, Math.min(3.8, 2.6 + (fontSize - 4.2) * 0.45)).toFixed(2))
  const sectionBottomPad = Number(Math.max(0.3, Math.min(0.8, 0.3 + (fontSize - 4.2) * 0.2)).toFixed(2))
  const sectionGap = Number(Math.max(0.6, Math.min(1.4, 0.6 + (fontSize - 4.2) * 0.3)).toFixed(2))
  return { fontSize, lineH, rowPadding, sectionTitleH, sectionBottomPad, sectionGap }
}

function measureRowHeight(
  pdf: jsPDF,
  label: string,
  value: string,
  innerW: number,
  cfg: LayoutConfig,
): number {
  pdf.setFontSize(cfg.fontSize)
  const labelW = innerW * LABEL_RATIO
  const valueW = innerW * (1 - LABEL_RATIO) - 1.2
  const labelLines = pdf.splitTextToSize(pdfText(label), labelW)
  const valueLines = pdf.splitTextToSize(pdfText(value), valueW)
  const lines = Math.max(labelLines.length, valueLines.length, 1)
  return lines * cfg.lineH + cfg.rowPadding
}

function measureSectionHeight(
  pdf: jsPDF,
  rows: AssessmentRow[],
  innerW: number,
  cfg: LayoutConfig,
): number {
  const rowsH = rows.reduce(
    (sum, row) => sum + measureRowHeight(pdf, row.label, row.value, innerW, cfg),
    0,
  )
  return cfg.sectionTitleH + rowsH + cfg.sectionBottomPad
}

function resolveLayout(
  pdf: jsPDF,
  sections: AssessmentRow[][],
  innerW: number,
  availableH: number,
): LayoutConfig {
  let bestFontSize = 4.2
  const low = 4.0
  const high = 7.0

  const totalFor = (cfg: LayoutConfig) =>
    sections.reduce((sum, rows) => sum + measureSectionHeight(pdf, rows, innerW, cfg), 0) +
    cfg.sectionGap * Math.max(0, sections.length - 1)

  for (let fs = high; fs >= low; fs -= 0.08) {
    const cfg = computeConfig(Number(fs.toFixed(2)))
    const total = totalFor(cfg)
    if (total <= availableH) {
      bestFontSize = fs
      break
    }
  }

  let finalCfg = computeConfig(Number(bestFontSize.toFixed(2)))
  const finalTotal = totalFor(finalCfg)

  // Distribute surplus height so tables fill the column gracefully
  if (finalTotal < availableH && sections.length > 1) {
    const extra = availableH - finalTotal
    const extraGap = Math.min(1.8, extra / (sections.length * 2))
    finalCfg = {
      ...finalCfg,
      sectionGap: Number((finalCfg.sectionGap + extraGap).toFixed(2)),
      rowPadding: Number((finalCfg.rowPadding + extraGap * 0.18).toFixed(2)),
    }
  }

  return finalCfg
}

function drawRow(
  pdf: jsPDF,
  x: number,
  y: number,
  w: number,
  label: string,
  value: string,
  cfg: LayoutConfig,
): number {
  pdf.setFontSize(cfg.fontSize)
  const innerW = w - ROW_PAD_X * 2
  const labelW = innerW * LABEL_RATIO
  const valueW = innerW * (1 - LABEL_RATIO) - 1.2
  const valueX = x + ROW_PAD_X + labelW + 1.2
  const rowH = measureRowHeight(pdf, label, value, innerW, cfg)
  const labelLines = pdf.splitTextToSize(pdfText(label), labelW)
  const valueLines = pdf.splitTextToSize(pdfText(value), valueW)
  const startY = y + cfg.fontSize * 0.33 + cfg.rowPadding * 0.45

  pdf.setFont('helvetica', 'normal')
  pdf.setTextColor(71, 85, 105)
  labelLines.forEach((line: string, i: number) => {
    pdf.text(line, x + ROW_PAD_X, startY + i * cfg.lineH)
  })

  pdf.setFont('helvetica', 'bold')
  pdf.setTextColor(15, 23, 42)
  valueLines.forEach((line: string, i: number) => {
    pdf.text(line, valueX, startY + i * cfg.lineH)
  })

  return rowH
}

function drawAssessmentSection(
  pdf: jsPDF,
  x: number,
  y: number,
  w: number,
  title: string,
  rows: AssessmentRow[],
  cfg: LayoutConfig,
): number {
  const innerW = w - ROW_PAD_X * 2
  const sectionH = measureSectionHeight(pdf, rows, innerW, cfg)

  pdf.setDrawColor(203, 213, 225)
  pdf.setLineWidth(0.2)
  pdf.roundedRect(x, y, w, sectionH, 0.8, 0.8, 'S')

  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(Math.max(5.4, cfg.fontSize + 0.15))
  pdf.setTextColor(15, 118, 110)
  pdf.text(title, x + ROW_PAD_X, y + cfg.sectionTitleH * 0.72)

  let rowY = y + cfg.sectionTitleH
  rows.forEach((row, index) => {
    const rowH = measureRowHeight(pdf, row.label, row.value, innerW, cfg)

    if (index % 2 === 0) {
      pdf.setFillColor(248, 250, 252)
      pdf.rect(x + 0.4, rowY, w - 0.8, rowH, 'F')
    }

    drawRow(pdf, x, rowY, w, row.label, row.value, cfg)

    if (index < rows.length - 1) {
      pdf.setDrawColor(241, 245, 249)
      pdf.setLineWidth(0.12)
      pdf.line(x + ROW_PAD_X, rowY + rowH, x + w - ROW_PAD_X, rowY + rowH)
    }

    rowY += rowH
  })

  return y + sectionH
}

function drawAssessmentPanel(
  pdf: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  result: SiteAssessmentResult,
) {
  const sections: { title: string; rows: AssessmentRow[] }[] = []

  if (result.farmAssessment && result.farmAssessment.length > 0) {
    sections.push({ title: 'CROP & AGRI HAZARDS', rows: result.farmAssessment })
  }

  sections.push(
    { title: 'SEISMIC HAZARD', rows: result.seismic },
    { title: 'VOLCANIC HAZARD', rows: result.volcanic },
    { title: 'HYDRO-MET HAZARD', rows: result.hydromet },
  )

  if (result.input.category !== 'farm_lot') {
    sections.push({ title: 'LGU DATASETS', rows: result.lgu })
  }

  sections.push({
    title: result.input.category === 'farm_lot' ? 'NEAREST FARM BUSINESSES' : 'CRITICAL FACILITIES',
    rows: result.facilities,
  })

  const innerW = w - ROW_PAD_X * 2
  const cfg = resolveLayout(
    pdf,
    sections.map((s) => s.rows),
    innerW,
    h - 2, // 2mm bottom safety padding
  )

  let cursorY = y
  sections.forEach((section, index) => {
    cursorY = drawAssessmentSection(pdf, x, cursorY, w, section.title, section.rows, cfg)
    if (index < sections.length - 1) cursorY += cfg.sectionGap
  })
}

/** Centered logo + BUILD-SAFE titles — compact layout matching 20mm header */
function drawReportHeader(pdf: jsPDF, x: number, y: number, w: number, logo: string | null) {
  const centerX = x + w / 2

  if (logo) {
    pdf.addImage(logo, 'PNG', centerX - 4.5, y + 1, 9, 9)
  }

  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(8.5)
  pdf.setTextColor(15, 23, 42)
  pdf.text(REPORT_HEADER.titleLine1, centerX, y + 12.5, { align: 'center' })

  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(6.5)
  pdf.setTextColor(51, 65, 85)
  pdf.text(REPORT_HEADER.titleLine2, centerX, y + 15.5, { align: 'center' })

  pdf.setFontSize(6)
  pdf.setTextColor(100, 116, 139)
  pdf.text(REPORT_HEADER.titleLine3, centerX, y + 18, { align: 'center' })

  pdf.setDrawColor(226, 232, 240)
  pdf.setLineWidth(0.2)
  pdf.line(x, y + REPORT_LAYOUT.headerMm, x + w, y + REPORT_LAYOUT.headerMm)
}

/** White card bottom-left of map — mirrors MapSiteInfoOverlay in the screen view */
function drawMapSiteInfoOverlay(
  pdf: jsPDF,
  mapX: number,
  mapY: number,
  mapH: number,
  buildingType: string,
  lat: number,
  lng: number,
) {
  const boxW = 58
  const pad = 3
  const titleLines = pdf.splitTextToSize(pdfText(buildingType), boxW - 4)
  const titleLineCount = Array.isArray(titleLines) ? titleLines.length : 1
  const boxH = 6 + titleLineCount * 3.2 + 5.5
  const boxX = mapX + pad
  const boxY = mapY + mapH - boxH - pad

  pdf.setFillColor(255, 255, 255)
  pdf.setDrawColor(226, 232, 240)
  pdf.setLineWidth(0.2)
  pdf.roundedRect(boxX, boxY, boxW, boxH, 0.6, 0.6, 'FD')

  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(8)
  pdf.setTextColor(30, 58, 138)
  pdf.text(titleLines, boxX + 2, boxY + 4.5)

  pdf.setFont('courier', 'normal')
  pdf.setFontSize(6.5)
  pdf.setTextColor(100, 116, 139)
  pdf.text(`${lat.toFixed(5)} N, ${lng.toFixed(5)} E`, boxX + 2, boxY + 4.5 + titleLineCount * 3.2)

  // Only View in Maps (Google Earth removed as requested)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(6.2)
  pdf.setTextColor(3, 105, 161)
  const linkY = boxY + 4.5 + titleLineCount * 3.2 + 3.2
  pdf.textWithLink('View in Maps', boxX + 2, linkY, { url: getGoogleMapsUrl(lat, lng) })
}

export async function exportAssessmentReportPdf(input: ExportAssessmentPdfInput): Promise<void> {
  const { mapDataUrl, result, logoDataUrl } = input
  const { lat, lng } = result.input
  const displayTitle =
    result.input.category === 'farm_lot'
      ? `Farm Lot: ${result.cropSuitability?.cropLabel ?? result.input.cropType ?? 'Agricultural Crop'}`
      : (result.input.buildingType ?? 'Proposed Building')
  const muni = result.coverage?.municipality ?? 'Lasam'
  const confidence = result.coverage?.confidenceLabel ?? 'AI Hazard Assessment'

  const logo = logoDataUrl
    ? logoDataUrl
    : await loadImageDataUrl(APP_LOGO_PATH).catch(() => null)

  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const margin = REPORT_PAGE.margin
  const { left: leftW, right: rightW, contentW } = reportColumnWidthsMm()
  const bodyH = reportBodyHeightMm()

  const x0 = margin
  const headerY = margin
  const bodyY = margin + REPORT_LAYOUT.headerMm
  const rightX = x0 + leftW

  drawReportHeader(pdf, x0, headerY, contentW, logo)

  // Map — left column, full body height
  pdf.setDrawColor(203, 213, 225)
  pdf.setLineWidth(0.2)
  pdf.rect(x0, bodyY, leftW, bodyH, 'S')
  pdf.addImage(mapDataUrl, 'PNG', x0, bodyY, leftW, bodyH)
  drawMapSiteInfoOverlay(pdf, x0, bodyY, bodyH, displayTitle, lat, lng)

  // Assessment — right column
  pdf.setDrawColor(226, 232, 240)
  pdf.line(rightX, bodyY, rightX, bodyY + bodyH)

  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(8.5)
  pdf.setTextColor(15, 23, 42)
  pdf.text(`${muni}, Cagayan · ${confidence}`, rightX + 2.5, bodyY + 5)

  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(5.8)
  pdf.setTextColor(100, 116, 139)
  pdf.text('Demonstration report - not an official certificate', rightX + 2.5, bodyY + 8.5)

  pdf.setDrawColor(241, 245, 249)
  pdf.line(rightX, bodyY + 10, rightX + rightW, bodyY + 10)

  drawAssessmentPanel(pdf, rightX + 1.5, bodyY + 11, rightW - 3, bodyH - 13, result)

  const stamp = new Date().toISOString().slice(0, 10)
  const safeMuni = muni.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  pdf.save(`${safeMuni}-site-assessment-${stamp}.pdf`)
}
