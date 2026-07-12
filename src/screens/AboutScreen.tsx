import { useI18n } from '../i18n/context'
import { CODE_HOOVER_APP_URL, CODE_HOOVER_REPOSITORY_URL } from '../constants/links'
import { HooverGraphic } from '../components/HooverGraphic'
import { QrIntroFrame } from '../components/QrIntroFrame'

export function AboutScreen() {
  const { locale, t } = useI18n()
  const lastUpdated = new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(__BUILD_TIMESTAMP__))

  return (
    <div className="flex flex-col items-start gap-4 text-left">
      <h2 className="text-xl font-bold">{t('default-about')}</h2>
      <HooverGraphic className="self-center py-2" />
      <p>{t('default-about-intro')}</p>
      <p>{t('default-migration-instructions')}</p>
      <div className="flex w-full flex-col items-center gap-3 py-2">
        <QrIntroFrame text={CODE_HOOVER_APP_URL} size={420} className="qr-detail-code-frame" label={t('default-open-on-different-device')} />
        <a className="link link-primary text-center text-sm" href={CODE_HOOVER_APP_URL} target="_blank" rel="noopener noreferrer">{t('default-open-on-different-device')}</a>
      </div>
      <hr className="divider" />
      <p>{t('default-open-source-statement')}</p>
      <div className="flex flex-col gap-1 text-xs opacity-60">
        <p className="m-0">{t('default-last-updated', { value: lastUpdated })}</p>
        <a className="link link-hover" href={CODE_HOOVER_REPOSITORY_URL} target="_blank" rel="noopener noreferrer">{t('default-github-repo')}</a>
      </div>
    </div>
  )
}
