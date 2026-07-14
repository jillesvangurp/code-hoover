import { LoaderCircle, RotateCcw, VideoOff } from 'lucide-react'

interface ScannerStatusOverlayProps {
  status: 'starting' | 'active' | 'error'
  startingLabel: string
  errorMessage: string
  retryLabel: string
  onRetry: () => void
}

export function ScannerStatusOverlay({ status, startingLabel, errorMessage, retryLabel, onRetry }: ScannerStatusOverlayProps) {
  if (status === 'active') return null

  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-neutral/75 px-6 text-center text-neutral-content">
      {status === 'starting' ? (
        <div role="status" className="flex flex-col items-center gap-3">
          <LoaderCircle className="animate-spin" size={28} aria-hidden="true" />
          <p className="m-0 text-sm font-medium">{startingLabel}</p>
        </div>
      ) : (
        <div role="alert" className="flex max-w-sm flex-col items-center gap-3">
          <VideoOff size={30} aria-hidden="true" />
          <p className="m-0 text-sm font-medium">{errorMessage}</p>
          <button type="button" className="btn btn-sm" onClick={onRetry}>
            <RotateCcw size={15} aria-hidden="true" />
            {retryLabel}
          </button>
        </div>
      )}
    </div>
  )
}
