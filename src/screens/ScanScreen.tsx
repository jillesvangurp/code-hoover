import { useEffect, useRef, useState } from 'react'
import { BrowserMultiFormatReader } from '@zxing/browser'
import { Check, X } from 'lucide-react'
import { CameraControls } from '../components/CameraControls'
import { ScanReticuleOverlay, type ScanDetection, type ScanDetectionStatus } from '../components/ScanReticuleOverlay'
import { ScannerStatusOverlay } from '../components/ScannerStatusOverlay'
import { BARCODE_FORMAT_NAMES, barcodeFormatName, isQrBarcodeFormat } from '../domain/barcode'
import { applyCameraTorch, applyCameraZoom, cameraControlSupport, type CameraControlSupport } from '../domain/cameraControls'
import { QR_DATA_TYPES, createSavedCodeRecord, defaultDisplayName, mergeSavedCodes, parseQrPayload, parseSavedCode, qrDataAsText, savedCodeMatchesPayload, type QrData, type SavedQrCode } from '../domain/qr'
import { detectionPolygon, type ScanPoint, type ScanRect } from '../domain/scanOverlay'
import { cameraErrorKind, openReliableCamera, type CameraErrorKind } from '../domain/scannerReliability'
import { useI18n } from '../i18n/context'

interface ScanResult {
  text: string
  format: number
}

const DETECTION_HOLD_MS = 2500

interface ScanScreenProps {
  codes: SavedQrCode[]
  setCodes: (codes: SavedQrCode[]) => void
  playScanSuccess: () => void
}

function savedCodeFromText(text: string): SavedQrCode {
  const data: QrData = parseQrPayload(text) ?? { type: QR_DATA_TYPES.text, text }
  const normalized = qrDataAsText(data)
  const createdAt = new Date().toISOString()
  return createSavedCodeRecord({ name: defaultDisplayName(data) || normalized, text: normalized, data, createdAt }, createdAt)
}

function savedCodeFromBarcode(text: string, format: string): SavedQrCode {
  const data: QrData = { type: QR_DATA_TYPES.barcode, format, text }
  const createdAt = new Date().toISOString()
  return createSavedCodeRecord({ name: defaultDisplayName(data) || text, text, data, createdAt }, createdAt)
}

function savedCodeFromScan(text: string, format: number): SavedQrCode {
  const rawText = text.trim()
  const formatName = barcodeFormatName(format, '')
  if (isQrBarcodeFormat(formatName)) {
    try {
      return parseSavedCode(JSON.parse(text))
    } catch {
      return savedCodeFromText(rawText)
    }
  }
  if (formatName) return savedCodeFromBarcode(rawText, formatName)
  return savedCodeFromText(rawText)
}

export function ScanScreen({ codes, setCodes, playScanSuccess }: ScanScreenProps) {
  const [scans, setScans] = useState<ScanResult[]>([])
  const [scanMultiple, setScanMultiple] = useState(false)
  const [scannerLabel, setScannerLabel] = useState('')
  const [cameraStatus, setCameraStatus] = useState<'starting' | 'active' | 'error'>('starting')
  const [cameraError, setCameraError] = useState<CameraErrorKind>('unavailable')
  const [scannerRevision, setScannerRevision] = useState(0)
  const [detections, setDetections] = useState<ScanDetection[]>([])
  const [scanViewport, setScanViewport] = useState({ width: 0, height: 0 })
  const [cameraSupport, setCameraSupport] = useState<CameraControlSupport | null>(null)
  const [torchOn, setTorchOn] = useState(false)
  const [zoomValue, setZoomValue] = useState(1)
  const videoRef = useRef<HTMLVideoElement>(null)
  const scanSurfaceRef = useRef<HTMLDivElement>(null)
  const cameraTrackRef = useRef<MediaStreamTrack | null>(null)
  const { t } = useI18n()
  const playScanRef = useRef(playScanSuccess)
  const codesRef = useRef(codes)
  const scanMultipleRef = useRef(scanMultiple)
  const scanStatusesRef = useRef(new Map<string, ScanDetectionStatus>())
  const sessionScansRef = useRef(new Set<string>())
  const recoveryAttemptsRef = useRef(0)
  playScanRef.current = playScanSuccess
  codesRef.current = codes
  scanMultipleRef.current = scanMultiple

  const retryCamera = () => {
    recoveryAttemptsRef.current = 0
    setScannerRevision((current) => current + 1)
  }

  const changeTorch = async (enabled: boolean) => {
    const track = cameraTrackRef.current
    if (!track) return
    try {
      await applyCameraTorch(track, enabled)
      setTorchOn(enabled)
    } catch (error) {
      console.error('Could not change camera flashlight', error)
    }
  }

  const changeZoom = async (zoom: number) => {
    const track = cameraTrackRef.current
    if (!track) return
    setZoomValue(zoom)
    try {
      await applyCameraZoom(track, zoom)
    } catch (error) {
      const currentZoom = track.getSettings().zoom
      if (typeof currentZoom === 'number') setZoomValue(currentZoom)
      console.error('Could not change camera zoom', error)
    }
  }

  useEffect(() => {
    const surface = scanSurfaceRef.current
    if (!surface) return
    const measure = () => {
      const bounds = surface.getBoundingClientRect()
      setScanViewport({ width: bounds.width, height: bounds.height })
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(surface)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const timer = window.setInterval(() => {
      const cutoff = Date.now() - DETECTION_HOLD_MS
      setDetections((current) => current.filter(({ lastSeen }) => lastSeen >= cutoff))
    }, 250)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    let stopped = false
    let stream: MediaStream | null = null
    let detectionTimer: number | null = null
    let zxingTimer: number | null = null
    let muteTimer: number | null = null
    let stableTimer: number | null = null
    let activeTrack: MediaStreamTrack | null = null
    let nativeActive = false
    let zxingActive = false
    const reader = new BrowserMultiFormatReader(undefined, { delayBetweenScanAttempts: 350 })

    setCameraStatus('starting')
    setCameraError('unavailable')
    setCameraSupport(null)
    setTorchOn(false)
    setScannerLabel('')

    const failCamera = (error: unknown) => {
      if (stopped) return
      setCameraError(cameraErrorKind(error))
      setCameraStatus('error')
      setCameraSupport(null)
      cameraTrackRef.current = null
      stream?.getTracks().forEach((track) => track.stop())
      video.pause()
      video.srcObject = null
    }

    const requestRecovery = () => {
      if (stopped) return
      if (recoveryAttemptsRef.current >= 2) {
        failCamera(new Error('Camera connection ended repeatedly'))
        return
      }
      recoveryAttemptsRef.current += 1
      setCameraStatus('starting')
      window.setTimeout(() => {
        if (!stopped) setScannerRevision((current) => current + 1)
      }, 250)
    }

    const attachCameraTrack = (track: MediaStreamTrack) => {
      activeTrack = track
      cameraTrackRef.current = track
      const support = cameraControlSupport(track)
      setCameraSupport(support.torch || support.zoom ? support : null)
      setTorchOn(track.getSettings().torch === true)
      setZoomValue(support.zoomValue)

      track.addEventListener('ended', requestRecovery)
      track.addEventListener('mute', () => {
        if (muteTimer !== null) window.clearTimeout(muteTimer)
        muteTimer = window.setTimeout(() => {
          if (track.muted) requestRecovery()
        }, 2500)
      })
      track.addEventListener('unmute', () => {
        if (muteTimer !== null) window.clearTimeout(muteTimer)
        muteTimer = null
      })
    }

    const addScan = (text: string, format: number): ScanDetectionStatus | null => {
      const rawText = text.trim()
      if (!rawText) return null
      let status = scanStatusesRef.current.get(rawText)
      if (!status) {
        const entry = savedCodeFromScan(rawText, format)
        const alreadySaved = codesRef.current.some((code) => savedCodeMatchesPayload(code, entry))
        const nextCodes = mergeSavedCodes(codesRef.current, [entry])
        status = alreadySaved ? 'saved' : 'captured'
        scanStatusesRef.current.set(rawText, status)
        if (!alreadySaved) {
          codesRef.current = nextCodes
          setCodes(nextCodes)
        }
      }
      if (!sessionScansRef.current.has(rawText)) {
        sessionScansRef.current.add(rawText)
        setScans((current) => [{ text: rawText, format }, ...current])
        playScanRef.current()
      }
      return status
    }

    const recordDetection = (text: string, format: number, points: ScanPoint[], boundingBox: ScanRect | null) => {
      const status = addScan(text, format)
      const source = { width: video.videoWidth || video.clientWidth || 1, height: video.videoHeight || video.clientHeight || 1 }
      if (!status) return
      const detection: ScanDetection = {
        id: `${format}:${text.trim()}`,
        points: detectionPolygon(points, boundingBox, source),
        source,
        status,
        lastSeen: Date.now(),
      }
      setDetections((current) => [detection, ...current.filter(({ id }) => id !== detection.id)])
    }

    const updateScannerLabel = () => {
      const engines = [
        nativeActive ? 'Barcode Detector API' : '',
        zxingActive ? '@zxing/browser' : '',
      ].filter(Boolean)
      setScannerLabel(engines.join(' + '))
    }

    const recordZxingResult = (result: ReturnType<BrowserMultiFormatReader['decode']>) => {
      const points = result.getResultPoints().map((point) => ({ x: point.getX(), y: point.getY() }))
      recordDetection(result.getText(), result.getBarcodeFormat(), points, null)
    }

    const decodeZxingFrame = () => {
      const warn = console.warn
      console.warn = (message?: unknown, ...args: unknown[]) => {
        if (message !== 'MultiFormatReader: non-ReaderException from reader:') warn(message, ...args)
      }
      try {
        return reader.decode(video)
      } finally {
        console.warn = warn
      }
    }

    const startZxingLoop = () => {
      zxingActive = true
      const decode = () => {
        if (stopped || !zxingActive) return
        if (document.visibilityState !== 'hidden' && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
          try {
            recordZxingResult(decodeZxingFrame())
          } catch {
            // A frame without a readable code is the normal scanning state.
          }
        }
        zxingTimer = window.setTimeout(decode, nativeActive ? 1200 : 350)
      }
      zxingTimer = window.setTimeout(decode, 600)
    }

    const startNative = (): BarcodeDetector | null => {
      if (!('BarcodeDetector' in window)) return null
      try {
        return new BarcodeDetector()
      } catch {
        return null
      }
    }

    const runNativeDetection = (detector: BarcodeDetector) => {
      let consecutiveFailures = 0
      const detect = async () => {
        if (stopped || !nativeActive) return
        if (document.visibilityState === 'hidden') {
          detectionTimer = window.setTimeout(() => void detect(), 500)
          return
        }
        try {
          const barcodes = await detector.detect(video)
          consecutiveFailures = 0
          for (const barcode of scanMultipleRef.current ? barcodes : barcodes.slice(0, 1)) {
            const format = BARCODE_FORMAT_NAMES.indexOf(barcode.format.replaceAll('-', '_').toUpperCase())
            const boundingBox = barcode.boundingBox ? {
              x: barcode.boundingBox.x,
              y: barcode.boundingBox.y,
              width: barcode.boundingBox.width,
              height: barcode.boundingBox.height,
            } : null
            recordDetection(barcode.rawValue, format, barcode.cornerPoints ?? [], boundingBox)
          }
        } catch (error) {
          consecutiveFailures += 1
          if (consecutiveFailures >= 5) {
            nativeActive = false
            updateScannerLabel()
            if (!zxingActive) failCamera(error)
            return
          }
        }
        detectionTimer = window.setTimeout(() => void detect(), 250)
      }
      void detect()
    }

    const handleVisibilityChange = () => {
      if (stopped || document.visibilityState !== 'visible') return
      if (activeTrack?.readyState === 'ended') {
        requestRecovery()
      } else if (stream && video.paused) {
        void video.play().catch(requestRecovery)
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    video.addEventListener('error', requestRecovery)

    const startScanner = async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('Camera API unavailable')
        stream = await openReliableCamera(navigator.mediaDevices)
        if (stopped) {
          stream.getTracks().forEach((track) => track.stop())
          stream = null
          return
        }

        video.srcObject = stream
        await video.play()
        const track = stream.getVideoTracks()[0]
        if (!track) throw new Error('Camera returned no video track')
        attachCameraTrack(track)

        const detector = startNative()
        nativeActive = detector !== null
        startZxingLoop()
        if (stopped) return
        if (!nativeActive && !zxingActive) throw new Error('No scanner engine could start')

        updateScannerLabel()
        setCameraStatus('active')
        stableTimer = window.setTimeout(() => { recoveryAttemptsRef.current = 0 }, 10_000)
        if (detector) runNativeDetection(detector)
      } catch (error) {
        failCamera(error)
      }
    }

    void startScanner()
    return () => {
      stopped = true
      cameraTrackRef.current = null
      if (detectionTimer !== null) window.clearTimeout(detectionTimer)
      if (zxingTimer !== null) window.clearTimeout(zxingTimer)
      if (muteTimer !== null) window.clearTimeout(muteTimer)
      if (stableTimer !== null) window.clearTimeout(stableTimer)
      activeTrack?.removeEventListener('ended', requestRecovery)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      video.removeEventListener('error', requestRecovery)
      stream?.getTracks().forEach((track) => track.stop())
      video.pause()
      video.srcObject = null
    }
  }, [scannerRevision, setCodes])

  return (
    <>
      <section className="flex w-full flex-col items-center gap-2">
        <div ref={scanSurfaceRef} className="relative mx-auto h-[42vh] w-full overflow-hidden rounded-md border border-base-300 bg-neutral">
          <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
          <ScannerStatusOverlay
            status={cameraStatus}
            startingLabel={t('default-camera-starting')}
            errorMessage={cameraError === 'permission' ? t('default-camera-permission-error') : t('default-camera-unavailable-error')}
            retryLabel={t('default-camera-retry')}
            onRetry={retryCamera}
          />
          <ScanReticuleOverlay
            detections={detections}
            viewport={scanViewport}
            capturedLabel={t('default-scan-captured')}
            savedLabel={t('default-scan-already-saved')}
          />
          {cameraStatus === 'active' && cameraSupport && (
            <CameraControls
              support={cameraSupport}
              torchOn={torchOn}
              zoomValue={zoomValue}
              flashlightLabel={t('default-flashlight')}
              turnFlashlightOnLabel={t('default-turn-flashlight-on')}
              turnFlashlightOffLabel={t('default-turn-flashlight-off')}
              zoomLabel={t('default-camera-zoom')}
              onTorchChange={(enabled) => void changeTorch(enabled)}
              onZoomChange={(zoom) => void changeZoom(zoom)}
            />
          )}
        </div>
        <p className="sr-only" aria-live="polite">{scans.length > 0 ? t('default-scanned-codes', { count: scans.length }) : ''}</p>
        <label className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-md border border-base-300 bg-base-100 px-3 py-2 text-sm">
          <span className="font-medium">{t('default-scan-multiple')}</span>
          <span className="flex shrink-0 items-center gap-2">
            <span className="text-xs uppercase opacity-70">{scanMultiple ? t('default-on') : t('default-off')}</span>
            <input type="checkbox" className="toggle toggle-sm" checked={scanMultiple} aria-label={t('default-scan-multiple')} onChange={(event) => setScanMultiple(event.target.checked)} />
          </span>
        </label>
        {cameraStatus === 'active' && <p className="m-0 text-xs opacity-70">{t('default-scanner-library', { value: scannerLabel })}</p>}
      </section>
      {scans.length > 0 && (
        <>
          <div className="mb-2 flex w-full items-center justify-between gap-3">
            <p className="m-0 font-semibold">{t('default-scanned-codes', { count: scans.length })}</p>
            <button type="button" className="btn btn-ghost btn-xs" onClick={() => setScans([])}><X size={14} />{t('default-clear')}</button>
          </div>
          <ul className="w-full space-y-2">
            {scans.map((scan) => (
              <li key={scan.text} className="flex w-full items-start gap-3 rounded-md bg-base-200 p-3">
                <Check size={16} className="mt-0.5 shrink-0 text-success" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="m-0 break-words font-mono text-sm">{scan.text}</p>
                  <p className="m-0 text-xs opacity-70">{barcodeFormatName(scan.format, t('default-unknown'))}</p>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  )
}
