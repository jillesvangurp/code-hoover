import { HooverGraphic } from './HooverGraphic'
import { useI18n } from '../i18n/context'

export function LoadingSplash() {
  const { t } = useI18n()
  return (
    <div className="loading-splash fixed inset-0 z-[200] flex items-center justify-center bg-base-100 text-base-content" role="status" aria-label={t('default-loading-app')}>
      <HooverGraphic showBar />
    </div>
  )
}
