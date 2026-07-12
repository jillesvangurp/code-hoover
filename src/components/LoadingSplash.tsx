import { HooverGraphic } from './HooverGraphic'

export function LoadingSplash() {
  return (
    <div className="loading-splash fixed inset-0 z-[200] flex items-center justify-center bg-base-100 text-base-content" role="status" aria-label="Loading Code Hoover">
      <HooverGraphic showBar />
    </div>
  )
}
