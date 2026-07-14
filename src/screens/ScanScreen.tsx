import { useEffect, useRef, useState } from 'react'
import { BrowserMultiFormatReader, type IScannerControls } from '@zxing/browser'
import { Check, X } from 'lucide-react'
import { ScanReticuleOverlay, type ScanDetection, type ScanDetectionStatus } from '../components/ScanReticuleOverlay'
import { BARCODE_FORMAT_NAMES, barcodeFormatName, isQrBarcodeFormat } from '../domain/barcode'
import { QR_DATA_TYPES, defaultDisplayName, mergeSavedCodes, parseQrPayload, parseSavedCode, qrDataAsText, savedCodeMatchesPayload, type QrData, type SavedQrCode } from '../domain/qr'
import { detectionPolygon, type ScanPoint, type ScanRect } from '../domain/scanOverlay'
import { useI18n } from '../i18n/context'

interface ScanResult {
  text: string
  format: number
}

interface ScanScreenProps {
  codes: SavedQrCode[]
  setCodes: (codes: SavedQrCode[]) => void
  playScanSuccess: () => void
}

function savedCodeFromText(text: string): SavedQrCode {
  const data: QrData = parseQrPayload(text) ?? { type: QR_DATA_TYPES.text, text }
  const normalized = qrDataAsText(data)
  return { name: defaultDisplayName(data) || normalized, text: normalized, data, createdAt: new Date().toISOString() }
}

function savedCodeFromBarcode(text: string, format: string): SavedQrCode {
  const data: QrData = { type: QR_DATA_TYPES.barcode, format, text }
  return { name: defaultDisplayName(data) || text, text, data, createdAt: new Date().toISOString() }
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
  const [scannerLabel, setScannerLabel] = useState('BarcodeDetector' in window ? 'Barcode Detector API' : '@zxing/browser')
  const [scanning, setScanning] = useState(false)
  const [detections, setDetections] = useState<ScanDetection[]>([])
  const [scanViewport, setScanViewport] = useState({ width: 0, height: 0 })
  const videoRef = useRef<HTMLVideoElement>(null)
  const scanSurfaceRef = useRef<HTMLDivElement>(null)
  const { t } = useI18n()
  const playScanRef = useRef(playScanSuccess)
  const codesRef = useRef(codes)
  const scanMultipleRef = useRef(scanMultiple)
  const scanStatusesRef = useRef(new Map<string, ScanDetectionStatus>())
  const sessionScansRef = useRef(new Set<string>())
  playScanRef.current = playScanSuccess
  codesRef.current = codes
  scanMultipleRef.current = scanMultiple

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
      const cutoff = Date.now() - 900
      setDetections((current) => current.filter(({ lastSeen }) => lastSeen >= cutoff))
    }, 250)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    let stopped = false
    let controls: IScannerControls | null = null
    let stream: MediaStream | null = null
    let detectionTimer: number | null = null
    const reader = new BrowserMultiFormatReader(undefined, { delayBetweenScanAttempts: 300 })

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

    const startZxing = async () => {
      if (stopped) return
      setScannerLabel('@zxing/browser')
      try {
        controls = await reader.decodeFromVideoDevice(undefined, video, (result) => {
          if (result) {
            const points = result.getResultPoints().map((point) => ({ x: point.getX(), y: point.getY() }))
            recordDetection(result.getText(), result.getBarcodeFormat(), points, null)
          }
        })
      } catch (error) {
        if (!stopped) console.error('Could not start barcode scanner', error)
      }
    }

    const startNative = async (): Promise<boolean> => {
      if (!('BarcodeDetector' in window)) return false
      try {
        const detector = new BarcodeDetector()
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        if (stopped) {
          stream.getTracks().forEach((track) => track.stop())
          stream = null
          return false
        }
        video.srcObject = stream
        await video.play()
        setScannerLabel('Barcode Detector API')
        const detect = async () => {
          if (stopped) return
          try {
            const barcodes = await detector.detect(video)
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
          } catch {
            // Individual frames can fail while the camera is starting or refocusing.
          }
          detectionTimer = window.setTimeout(() => void detect(), 300)
        }
        void detect()
        return true
      } catch {
        stream?.getTracks().forEach((track) => track.stop())
        stream = null
        video.srcObject = null
        return false
      }
    }

    setScanning(true)
    void startNative().then((started) => { if (!started) void startZxing() })
    return () => {
      stopped = true
      setScanning(false)
      if (detectionTimer !== null) window.clearTimeout(detectionTimer)
      controls?.stop()
      stream?.getTracks().forEach((track) => track.stop())
      video.pause()
      video.srcObject = null
    }
  }, [setCodes])

  return (
    <>
      <section className="flex w-full flex-col items-center gap-2">
        <div ref={scanSurfaceRef} className="relative mx-auto h-[42vh] w-full overflow-hidden rounded-md border border-base-300 bg-neutral">
          <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
          <ScanReticuleOverlay
            detections={detections}
            viewport={scanViewport}
            capturedLabel={t('default-scan-captured')}
            savedLabel={t('default-scan-already-saved')}
          />
        </div>
        <p className="sr-only" aria-live="polite">{scans.length > 0 ? t('default-scanned-codes', { count: scans.length }) : ''}</p>
        <label className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-md border border-base-300 bg-base-100 px-3 py-2 text-sm">
          <span className="font-medium">{t('default-scan-multiple')}</span>
          <span className="flex shrink-0 items-center gap-2">
            <span className="text-xs uppercase opacity-70">{scanMultiple ? t('default-on') : t('default-off')}</span>
            <input type="checkbox" className="toggle toggle-sm" checked={scanMultiple} aria-label={t('default-scan-multiple')} onChange={(event) => setScanMultiple(event.target.checked)} />
          </span>
        </label>
        <p className="m-0 text-xs opacity-70">{t('default-scanner-library', { value: scannerLabel })}</p>
        {!scanning && <p>{t('default-welcome-text')}</p>}
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
