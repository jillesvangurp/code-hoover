import { useI18n } from '../i18n/context'
import { CODE_HOOVER_REPOSITORY_URL } from '../constants/links'

export function AboutScreen() {
  const { t } = useI18n()
  return (
    <div className="flex flex-col items-start gap-4 text-left">
      <h2 className="text-xl font-bold">{t('default-about')}</h2>
      <p>{t('default-about-intro')}</p>
      <p>{t('default-migration-instructions')}</p>
      <hr className="divider" />
      <p>{t('default-open-source-statement')}</p>
      <a className="link link-hover text-xs opacity-60" href={CODE_HOOVER_REPOSITORY_URL} target="_blank" rel="noopener noreferrer">{t('default-github-repo')}</a>
    </div>
  )
}
