import { X } from 'lucide-react'
import { QrCodeImage } from '../components/QrCodeImage'
import { useI18n } from '../i18n/context'
import { CODE_HOOVER_APP_URL, CODE_HOOVER_REPOSITORY_URL } from './CodesScreen'

export function AboutScreen({ onClose }: { onClose: () => void }) {
  const { t } = useI18n()
  const codeLink = (url: string, label: string) => (
    <div className="flex flex-col items-center gap-2 self-center">
      <QrCodeImage text={url} size={200} className="h-32 w-32" alt={label} />
      <hr className="w-24 border-base-300" />
      <a className="link link-primary" href={url} target="_blank" rel="noopener noreferrer">{label}</a>
    </div>
  )
  return (
    <div className="relative flex flex-col items-start gap-4 text-left">
      <button type="button" className="btn btn-ghost btn-sm btn-circle absolute right-0 top-0" aria-label={t('default-close')} onClick={onClose}><X /></button>
      <h2 className="text-xl font-bold">{t('default-about')}</h2>
      <p>{t('default-about-intro')}</p>
      <hr />
      {codeLink(CODE_HOOVER_REPOSITORY_URL, t('default-github-repo'))}
      {codeLink(CODE_HOOVER_APP_URL, t('default-open-on-different-device'))}
      <p>{t('default-migration-instructions')}</p>
      <hr className="divider" />
      <p>{t('default-open-source-statement')}</p>
    </div>
  )
}
