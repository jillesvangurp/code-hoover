import { describe, expect, it, vi } from 'vitest'
import { PREFERRED_CAMERA_CONSTRAINTS, cameraErrorKind, openReliableCamera } from './scannerReliability'

describe('scanner reliability', () => {
  it('requests a rear-facing camera with practical scan resolution', () => {
    expect(PREFERRED_CAMERA_CONSTRAINTS).toEqual({
      audio: false,
      video: {
        facingMode: { ideal: 'environment' },
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { ideal: 30 },
      },
    })
  })

  it('falls back to unconstrained video when preferred camera setup fails', async () => {
    const stream = {} as MediaStream
    const getUserMedia = vi.fn()
      .mockRejectedValueOnce(new DOMException('Unsupported constraints', 'OverconstrainedError'))
      .mockResolvedValueOnce(stream)

    await expect(openReliableCamera({ getUserMedia } as Pick<MediaDevices, 'getUserMedia'>)).resolves.toBe(stream)
    expect(getUserMedia).toHaveBeenNthCalledWith(1, PREFERRED_CAMERA_CONSTRAINTS)
    expect(getUserMedia).toHaveBeenNthCalledWith(2, { audio: false, video: true })
  })

  it('does not repeat a blocked permission request', async () => {
    const error = new DOMException('Blocked', 'NotAllowedError')
    const getUserMedia = vi.fn().mockRejectedValue(error)

    await expect(openReliableCamera({ getUserMedia } as Pick<MediaDevices, 'getUserMedia'>)).rejects.toBe(error)
    expect(getUserMedia).toHaveBeenCalledTimes(1)
    expect(cameraErrorKind(error)).toBe('permission')
  })
})
