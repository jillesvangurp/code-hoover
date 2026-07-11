import { useEffect, useRef, useState } from 'react'
import { BrowserMultiFormatReader, type IScannerControls } from '@zxing/browser'
import { Check, Copy, ExternalLink, Trash2, X } from 'lucide-react'
import { BARCODE_FORMAT_NAMES, barcodeFormatName } from '../domain/barcode'
import { QR_DATA_TYPES, defaultDisplayName, parseSavedCode, parseVCard, qrDataAsText, type QrData, type SavedQrCode } from '../domain/qr'
import { useI18n } from '../i18n/context'

interface ScanResult {
  text: string
  format: number
}

interface ScanScreenProps {
  codes: SavedQrCode[]
  setCodes: (codes: SavedQrCode[]) => void
  playScanSuccess: () => void
  playDelete: () => void
}

function savedCodeFromText(text: string): SavedQrCode {
  const data: QrData = parseVCard(text) ?? { type: QR_DATA_TYPES.text, text }
  const normalized = qrDataAsText(data)
  return { name: defaultDisplayName(data) || normalized, text: normalized, data }
}

export function ScanScreen({ codes, setCodes, playScanSuccess, playDelete }: ScanScreenProps) {
  const [scans, setScans] = useState<ScanResult[]>([])
  const [scannerLabel, setScannerLabel] = useState('BarcodeDetector' in window ? 'Barcode Detector API' : '@zxing/browser')
  const [scanning, setScanning] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const { t } = useI18n()
  const playScanRef = useRef(playScanSuccess)
  playScanRef.current = playScanSuccess

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    let stopped = false
    let controls: IScannerControls | null = null
    let stream: MediaStream | null = null
    let detectionTimer: number | null = null
    const reader = new BrowserMultiFormatReader(undefined, { delayBetweenScanAttempts: 300 })

    const addScan = (text: string, format: number) => {
      setScans((current) => {
        if (current.some((scan) => scan.text === text)) return current
        playScanRef.current()
        return [{ text, format }, ...current]
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
  }, [])

  const saveScan = (scan: ScanResult) => {
    const rawText = scan.text.trim()
    let entry: SavedQrCode
    if (barcodeFormatName(scan.format) === 'QR_CODE') {
      try {
        entry = parseSavedCode(JSON.parse(scan.text))
      } catch {
        entry = savedCodeFromText(rawText)
      }
    } else {
      entry = savedCodeFromText(rawText)
    }
    const fallbackName = defaultDisplayName(entry.data) || entry.text
    const defaultName = entry.name || fallbackName
    const promptedName = window.prompt(t('default-name'), defaultName) ?? defaultName
    setCodes([...codes, { ...entry, name: promptedName.trim() || fallbackName }])
  }

  return (
    <>
      <section className="flex w-full flex-col items-center gap-4">
        <div className="flex w-full justify-center md:justify-start">
          <button type="button" className="btn btn-secondary btn-sm w-24" onClick={() => setScans([])}><X size={16} />{t('default-clear')}</button>
        </div>
        <p className="text-sm opacity-70">{t('default-scanner-library', { value: scannerLabel })}</p>
        {!scanning && <p>{t('default-welcome-text')}</p>}
        <video ref={videoRef} className="mx-auto h-[33vh] w-full rounded-md border" muted playsInline />
      </section>
      <p className="mb-2 font-semibold">{t('default-scanned-codes', { count: scans.length })}</p>
      <ul className="w-full space-y-2">
        {scans.map((scan) => (
          <li key={scan.text} className="card w-full bg-base-200 p-3">
            <p className="break-words font-mono">{scan.text}</p>
            <p className="text-xs opacity-70">{barcodeFormatName(scan.format, t('default-unknown'))}</p>
            <div className="join mt-2 flex w-full flex-wrap justify-center sm:justify-start">
              <button type="button" className="btn btn-primary btn-xs w-24" title={t('default-copy')} onClick={() => void navigator.clipboard.writeText(scan.text)}><Copy size={14} />{t('default-copy')}</button>
              {/^https?:\/\//.test(scan.text) && <button type="button" className="btn btn-secondary btn-xs w-24" onClick={() => window.open(scan.text, '_blank', 'noopener,noreferrer')}><ExternalLink size={14} />{t('default-open')}</button>}
              <button type="button" className="btn btn-accent btn-xs w-24" onClick={() => saveScan(scan)}><Check size={14} />{t('default-save')}</button>
              <button type="button" className="btn btn-warning btn-xs w-24" onClick={() => { setScans(scans.filter((current) => current !== scan)); playDelete() }}><Trash2 size={14} />{t('default-delete')}</button>
            </div>
          </li>
        ))}
      </ul>
    </>
  )
}
