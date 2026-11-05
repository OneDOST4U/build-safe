/**
 * Robust latitude / longitude parser.
 * Supports:
 * - Decimal Degrees: "18.064500", "121.601500", "-18.06"
 * - Degree symbols: "18.0645° N", "121.6015° E"
 * - DMS (Degrees Minutes Seconds): "18°03'47.50\"N", "121°35'57.01\"E", "18° 3' 47.5\" N"
 * - Space/colon separated DMS: "18 03 47.5 N", "18:03:47.5 N"
 */
export function parseCoordinate(val: string | null | undefined): number | null {
  if (!val || typeof val !== 'string') return null
  const trimmed = val.trim()
  if (!trimmed) return null

  // 1. Direct numeric conversion
  const directNum = Number(trimmed)
  if (Number.isFinite(directNum)) return directNum

  // 2. Decimal with direction/degree symbol e.g. "18.0645° N" or "121.6015 E"
  const decWithDir = trimmed.match(/^([+-]?\d+(?:\.\d+)?)\s*°?\s*([NSEWnsew])?$/)
  if (decWithDir) {
    let num = parseFloat(decWithDir[1])
    const dir = decWithDir[2]?.toUpperCase()
    if (dir === 'S' || dir === 'W') num = -Math.abs(num)
    if (Number.isFinite(num)) return num
  }

  // 3. DMS regex e.g. 18°03'47.50"N or 18° 03' 47.50" N or 18 3 47.50 N
  const dmsMatch = trimmed.match(
    /^([+-]?\d+(?:\.\d+)?)[°\s:]+(\d+(?:\.\d+)?)['\u2032\s:]+(\d+(?:\.\d+)?)(?:["\u2033\s]*)\s*([NSEWnsew])?$/i,
  )
  if (dmsMatch) {
    const deg = parseFloat(dmsMatch[1])
    const min = parseFloat(dmsMatch[2])
    const sec = parseFloat(dmsMatch[3])
    const dir = dmsMatch[4]?.toUpperCase()

    let dd = Math.abs(deg) + min / 60 + sec / 3600
    if (deg < 0 || dir === 'S' || dir === 'W') dd = -dd
    if (Number.isFinite(dd)) return dd
  }

  // 4. Degrees and decimal minutes e.g. 18° 3.79' N
  const dmMatch = trimmed.match(
    /^([+-]?\d+(?:\.\d+)?)[°\s:]+(\d+(?:\.\d+)?)(?:['\u2032\s]*)\s*([NSEWnsew])?$/i,
  )
  if (dmMatch) {
    const deg = parseFloat(dmMatch[1])
    const min = parseFloat(dmMatch[2])
    const dir = dmMatch[3]?.toUpperCase()

    let dd = Math.abs(deg) + min / 60
    if (deg < 0 || dir === 'S' || dir === 'W') dd = -dd
    if (Number.isFinite(dd)) return dd
  }

  return null
}
