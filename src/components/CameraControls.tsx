import { Flashlight, ZoomIn, ZoomOut } from 'lucide-react'
import type { CameraControlSupport } from '../domain/cameraControls'

interface CameraControlsProps {
  support: CameraControlSupport
  torchOn: boolean
  zoomValue: number
  flashlightLabel: string
  turnFlashlightOnLabel: string
  turnFlashlightOffLabel: string
  zoomLabel: string
  onTorchChange: (enabled: boolean) => void
  onZoomChange: (zoom: number) => void
}

export function CameraControls({
  support,
  torchOn,
  zoomValue,
  flashlightLabel,
  turnFlashlightOnLabel,
  turnFlashlightOffLabel,
  zoomLabel,
  onTorchChange,
  onZoomChange,
}: CameraControlsProps) {
  if (!support.torch && !support.zoom) return null

  return (
    <div className="absolute inset-x-3 bottom-3 z-20 flex items-center justify-center gap-2">
      {support.torch && (
        <button
          type="button"
          className={`btn btn-sm border-base-300 shadow-md ${torchOn ? 'btn-warning' : 'bg-base-100/90 text-base-content'}`}
          aria-label={torchOn ? turnFlashlightOffLabel : turnFlashlightOnLabel}
          aria-pressed={torchOn}
          onClick={() => onTorchChange(!torchOn)}
        >
          <Flashlight size={17} aria-hidden="true" />
          <span className="hidden sm:inline">{flashlightLabel}</span>
        </button>
      )}
      {support.zoom && (
        <label className="flex h-8 items-center gap-2 rounded-md border border-base-300 bg-base-100/90 px-3 text-base-content shadow-md">
          <ZoomOut size={15} aria-hidden="true" />
          <span className="sr-only">{zoomLabel}</span>
          <input
            type="range"
            className="range range-xs w-28"
            min={support.zoom.min}
            max={support.zoom.max}
            step={support.zoom.step}
            value={zoomValue}
            aria-label={zoomLabel}
            onChange={(event) => onZoomChange(Number(event.target.value))}
          />
          <ZoomIn size={15} aria-hidden="true" />
        </label>
      )}
    </div>
  )
}
