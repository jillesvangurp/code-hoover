import { useEffect, useRef, useState } from 'react'
import { BrowserMultiFormatReader, type IScannerControls } from '@zxing/browser'
import { Check } from 'lucide-react'
import { BARCODE_FORMAT_NAMES, barcodeFormatName, isQrBarcodeFormat } from '../domain/barcode'
import { QR_DATA_TYPES, defaultDisplayName, mergeSavedCodes, parseSavedCode, parseVCard, qrDataAsText, type QrData, type SavedQrCode } from '../domain/qr'
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
  const data: QrData = parseVCard(text) ?? { type: QR_DATA_TYPES.text, text }
  const normalized = qrDataAsText(data)
  return { name: defaultDisplayName(data) || normalized, text: normalized, data }
}

function savedCodeFromBarcode(text: string, format: string): SavedQrCode {
  const data: QrData = { type: QR_DATA_TYPES.barcode, format, text }
  return { name: defaultDisplayName(data) || text, text, data }
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
  const [scannerLabel, setScannerLabel] = useState('BarcodeDetector' in window ? 'Barcode Detector API' : '@zxing/browser')
  const [scanning, setScanning] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const { t } = useI18n()
  const playScanRef = useRef(playScanSuccess)
  const codesRef = useRef(codes)
  playScanRef.current = playScanSuccess
  codesRef.current = codes

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    let stopped = false
    let controls: IScannerControls | null = null
    let stream: MediaStream | null = null
    let detectionTimer: number | null = null
    const reader = new BrowserMultiFormatReader(undefined, { delayBetweenScanAttempts: 300 })

    const addScan = (text: string, format: number) => {
      const rawText = text.trim()
      if (!rawText) return
      setScans((current) => {
        if (current.some((scan) => scan.text === rawText)) return current
        const entry = savedCodeFromScan(rawText, format)
        const nextCodes = mergeSavedCodes(codesRef.current, [entry])
        if (nextCodes.length !== codesRef.current.length) {
          codesRef.current = nextCodes
          setCodes(nextCodes)
        }
        playScanRef.current()
        return [{ text: rawText, format }, ...current]
      })
    }

    const startZxing = async () => {
      if (stopped) return
      setScannerLabel('@zxing/browser')
      try {
        controls = await reader.decodeFromVideoDevice(undefined, video, (result) => {
          if (result) addScan(result.getText(), result.getBarcodeFormat())
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
            for (const barcode of await detector.detect(video)) {
              addScan(barcode.rawValue, BARCODE_FORMAT_NAMES.indexOf(barcode.format.replaceAll('-', '_').toUpperCase()))
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
        <video ref={videoRef} className="mx-auto h-[42vh] w-full rounded-md border object-cover" muted playsInline />
        <p className="m-0 text-xs opacity-70">{t('default-scanner-library', { value: scannerLabel })}</p>
        {!scanning && <p>{t('default-welcome-text')}</p>}
      </section>
      {scans.length > 0 && (
        <>
          <p className="mb-2 font-semibold">{t('default-scanned-codes', { count: scans.length })}</p>
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
