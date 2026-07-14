export type CameraErrorKind = 'permission' | 'unavailable'

export const PREFERRED_CAMERA_CONSTRAINTS: MediaStreamConstraints = {
  audio: false,
  video: {
    facingMode: { ideal: 'environment' },
    width: { ideal: 1280 },
    height: { ideal: 720 },
    frameRate: { ideal: 30 },
  },
}

export function cameraErrorKind(error: unknown): CameraErrorKind {
  if (error instanceof DOMException && (error.name === 'NotAllowedError' || error.name === 'SecurityError')) {
    return 'permission'
  }
  return 'unavailable'
}

export async function openReliableCamera(mediaDevices: Pick<MediaDevices, 'getUserMedia'>): Promise<MediaStream> {
  try {
    return await mediaDevices.getUserMedia(PREFERRED_CAMERA_CONSTRAINTS)
  } catch (error) {
    if (cameraErrorKind(error) === 'permission') throw error
    return mediaDevices.getUserMedia({ audio: false, video: true })
  }
}
