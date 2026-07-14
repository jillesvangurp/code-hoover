interface CameraCapabilities extends MediaTrackCapabilities {
  torch?: boolean | boolean[]
  zoom?: { min?: number; max?: number; step?: number }
}

interface CameraConstraintSet extends MediaTrackConstraintSet {
  torch?: boolean
  zoom?: number
}

export interface CameraZoomRange {
  min: number
  max: number
  step: number
}

export interface CameraControlSupport {
  torch: boolean
  zoom: CameraZoomRange | null
  zoomValue: number
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function cameraControlSupport(track: MediaStreamTrack): CameraControlSupport {
  const capabilities = track.getCapabilities() as CameraCapabilities
  const settings = track.getSettings()
  const torch = capabilities.torch === true || (Array.isArray(capabilities.torch) && capabilities.torch.includes(true))
  const zoomMin = capabilities.zoom?.min
  const zoomMax = capabilities.zoom?.max
  const hasZoom = typeof zoomMin === 'number'
    && typeof zoomMax === 'number'
    && zoomMax > zoomMin
  const zoom = hasZoom ? {
    min: zoomMin,
    max: zoomMax,
    step: typeof capabilities.zoom?.step === 'number' && capabilities.zoom.step > 0 ? capabilities.zoom.step : 0.1,
  } : null
  const zoomValue = zoom
    ? clamp(typeof settings.zoom === 'number' ? settings.zoom : zoom.min, zoom.min, zoom.max)
    : 1

  return { torch, zoom, zoomValue }
}

export async function applyCameraTorch(track: MediaStreamTrack, enabled: boolean): Promise<void> {
  await track.applyConstraints({ advanced: [{ torch: enabled } as CameraConstraintSet] })
}

export async function applyCameraZoom(track: MediaStreamTrack, zoom: number): Promise<void> {
  await track.applyConstraints({ advanced: [{ zoom } as CameraConstraintSet] })
}
