import { describe, expect, it } from 'vitest'
import { detectionPolygon, polygonBounds, projectCoverPoint } from './scanOverlay'

describe('scan overlay geometry', () => {
  it('preserves four native corner points for a rotated reticule', () => {
    const points = [{ x: 10, y: 20 }, { x: 90, y: 10 }, { x: 100, y: 80 }, { x: 20, y: 90 }]
    expect(detectionPolygon(points, null, { width: 120, height: 100 })).toEqual(points)
  })

  it('uses a native bounding box when corner points are unavailable', () => {
    expect(detectionPolygon([], { x: 10, y: 20, width: 40, height: 30 }, { width: 100, height: 100 })).toEqual([
      { x: 10, y: 20 }, { x: 50, y: 20 }, { x: 50, y: 50 }, { x: 10, y: 50 },
    ])
  })

  it('pads sparse ZXing result points into a visible rectangle', () => {
    const polygon = detectionPolygon([{ x: 40, y: 50 }, { x: 160, y: 50 }], null, { width: 200, height: 100 })
    expect(polygonBounds(polygon)).toEqual({ x: 25.6, y: 44, width: 148.8, height: 12 })
  })

  it('projects source points through object-cover cropping', () => {
    expect(projectCoverPoint({ x: 0, y: 0 }, { width: 1920, height: 1080 }, { width: 390, height: 360 })).toEqual({ x: -125, y: 0 })
    expect(projectCoverPoint({ x: 960, y: 540 }, { width: 1920, height: 1080 }, { width: 390, height: 360 })).toEqual({ x: 195, y: 180 })
  })
})
