import { describe, expect, it, vi } from 'vitest'
import { activeCameraControlSupport, applyCameraTorch, applyCameraZoom, cameraControlSupport, DIGITAL_ZOOM_RANGE } from './cameraControls'

function cameraTrack(capabilities: Record<string, unknown>, settings: Record<string, unknown> = {}) {
  return {
    getCapabilities: () => capabilities,
    getSettings: () => settings,
    applyConstraints: vi.fn().mockResolvedValue(undefined),
  } as unknown as MediaStreamTrack
}

describe('camera controls', () => {
  it('reports only controls supported by the active track', () => {
    const support = cameraControlSupport(cameraTrack(
      { torch: true, zoom: { min: 1, max: 4, step: 0.25 } },
      { zoom: 2 },
    ))

    expect(support).toEqual({
      torch: true,
      zoom: { min: 1, max: 4, step: 0.25 },
      zoomValue: 2,
    })
  })

  it('ignores fixed zoom and missing torch capabilities', () => {
    expect(cameraControlSupport(cameraTrack({ zoom: { min: 1, max: 1 } }))).toEqual({
      torch: false,
      zoom: null,
      zoomValue: 1,
    })
  })

  it('provides digital zoom when the camera has no hardware zoom', () => {
    expect(activeCameraControlSupport(cameraTrack({}))).toEqual({
      torch: false,
      zoom: DIGITAL_ZOOM_RANGE,
      zoomValue: 1,
      hardwareZoom: false,
    })
  })

  it('prefers the camera hardware zoom range when available', () => {
    expect(activeCameraControlSupport(cameraTrack(
      { zoom: { min: 1, max: 4, step: 0.25 } },
      { zoom: 2 },
    ))).toEqual({
      torch: false,
      zoom: { min: 1, max: 4, step: 0.25 },
      zoomValue: 2,
      hardwareZoom: true,
    })
  })

  it('applies torch and zoom as advanced camera constraints', async () => {
    const track = cameraTrack({})

    await applyCameraTorch(track, true)
    await applyCameraZoom(track, 2.5)

    expect(track.applyConstraints).toHaveBeenNthCalledWith(1, { advanced: [{ torch: true }] })
    expect(track.applyConstraints).toHaveBeenNthCalledWith(2, { advanced: [{ zoom: 2.5 }] })
  })
})
