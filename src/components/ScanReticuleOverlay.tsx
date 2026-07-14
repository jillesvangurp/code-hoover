import { polygonBounds, projectCoverPoint, type ScanPoint, type ScanSize } from '../domain/scanOverlay'

export type ScanDetectionStatus = 'captured' | 'saved'

export interface ScanDetection {
  id: string
  points: ScanPoint[]
  source: ScanSize
  status: ScanDetectionStatus
  lastSeen: number
}

interface ScanReticuleOverlayProps {
  detections: ScanDetection[]
  viewport: ScanSize
  capturedLabel: string
  savedLabel: string
}

export function ScanReticuleOverlay({ detections, viewport, capturedLabel, savedLabel }: ScanReticuleOverlayProps) {
  if (viewport.width <= 0 || viewport.height <= 0) return null

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-md" aria-hidden="true">
      <svg className="absolute inset-0 h-full w-full" viewBox={`0 0 ${viewport.width} ${viewport.height}`} preserveAspectRatio="none">
        {detections.map((detection) => {
          const points = detection.points.map((point) => projectCoverPoint(point, detection.source, viewport))
          return (
            <polygon
              key={detection.id}
              className={`scan-reticule-shape scan-reticule-${detection.status}`}
              points={points.map(({ x, y }) => `${x},${y}`).join(' ')}
            />
          )
        })}
      </svg>
      {detections.map((detection) => {
        const points = detection.points.map((point) => projectCoverPoint(point, detection.source, viewport))
        const bounds = polygonBounds(points)
        return (
          <span
            key={`${detection.id}-label`}
            className={`scan-reticule-label scan-reticule-label-${detection.status}`}
            style={{ left: Math.max(6, bounds.x), top: Math.max(6, bounds.y - 30) }}
          >
            {detection.status === 'captured' && <span className="scan-reticule-check">✓</span>}
            {detection.status === 'captured' ? capturedLabel : savedLabel}
          </span>
        )
      })}
    </div>
  )
}
