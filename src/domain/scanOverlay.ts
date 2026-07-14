export interface ScanPoint {
  x: number
  y: number
}

export interface ScanSize {
  width: number
  height: number
}

export interface ScanRect {
  x: number
  y: number
  width: number
  height: number
}

function rectanglePoints(rect: ScanRect): ScanPoint[] {
  return [
    { x: rect.x, y: rect.y },
    { x: rect.x + rect.width, y: rect.y },
    { x: rect.x + rect.width, y: rect.y + rect.height },
    { x: rect.x, y: rect.y + rect.height },
  ]
}

export function detectionPolygon(points: ScanPoint[], boundingBox: ScanRect | null, source: ScanSize): ScanPoint[] {
  if (points.length >= 4) return points.slice(0, 4)
  if (boundingBox && boundingBox.width > 0 && boundingBox.height > 0) return rectanglePoints(boundingBox)

  if (points.length >= 2) {
    const xs = points.map(({ x }) => x)
    const ys = points.map(({ y }) => y)
    const minX = Math.min(...xs)
    const maxX = Math.max(...xs)
    const minY = Math.min(...ys)
    const maxY = Math.max(...ys)
    const horizontalPadding = Math.max((maxX - minX) * 0.12, source.width * 0.025)
    const verticalPadding = Math.max((maxY - minY) * 0.12, source.height * 0.06)
    return rectanglePoints({
      x: Math.max(0, minX - horizontalPadding),
      y: Math.max(0, minY - verticalPadding),
      width: Math.min(source.width, maxX + horizontalPadding) - Math.max(0, minX - horizontalPadding),
      height: Math.min(source.height, maxY + verticalPadding) - Math.max(0, minY - verticalPadding),
    })
  }

  const width = source.width * 0.46
  const height = source.height * 0.32
  return rectanglePoints({ x: (source.width - width) / 2, y: (source.height - height) / 2, width, height })
}

export function projectCoverPoint(point: ScanPoint, source: ScanSize, viewport: ScanSize): ScanPoint {
  if (source.width <= 0 || source.height <= 0 || viewport.width <= 0 || viewport.height <= 0) return point
  const scale = Math.max(viewport.width / source.width, viewport.height / source.height)
  const renderedWidth = source.width * scale
  const renderedHeight = source.height * scale
  return {
    x: point.x * scale + (viewport.width - renderedWidth) / 2,
    y: point.y * scale + (viewport.height - renderedHeight) / 2,
  }
}

export function polygonBounds(points: ScanPoint[]): ScanRect {
  const xs = points.map(({ x }) => x)
  const ys = points.map(({ y }) => y)
  const x = Math.min(...xs)
  const y = Math.min(...ys)
  return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y }
}
