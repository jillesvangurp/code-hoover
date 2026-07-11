import { useEffect, useState } from 'react'
import { Download, Share } from 'lucide-react'
import { useI18n } from '../i18n/context'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function isIos() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches
    || ('standalone' in navigator && navigator.standalone === true)
}

export function InstallApp() {
  const { t } = useI18n()
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showIosHelp, setShowIosHelp] = useState(false)
  const [installed, setInstalled] = useState(isStandalone)
  const ios = isIos()

  useEffect(() => {
    const onBeforeInstall = (event: Event) => {
      event.preventDefault()
      setInstallPrompt(event as BeforeInstallPromptEvent)
    }
    const onInstalled = () => {
      setInstallPrompt(null)
      setInstalled(true)
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  if (installed || (!ios && !installPrompt)) return null

  const install = async () => {
    if (installPrompt) {
      await installPrompt.prompt()
      const { outcome } = await installPrompt.userChoice
      if (outcome === 'accepted') setInstallPrompt(null)
      return
    }
    setShowIosHelp(true)
  }

  return (
    <section className="rounded-2xl border border-base-300 bg-base-200 p-4" aria-label={t('default-install-app')}>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="m-0 text-base font-semibold">{t('default-install-app')}</h2>
          <p className="m-0 text-sm opacity-75">{t('default-install-app-description')}</p>
        </div>
        <button type="button" className="btn btn-primary btn-sm shrink-0" onClick={() => void install()}>
          <Download size={16} /> {t('default-install')}
        </button>
      </div>
      {showIosHelp && (
        <div className="mt-4 flex gap-3 border-t border-base-300 pt-4 text-sm" role="status">
          <Share className="mt-0.5 shrink-0" size={18} aria-hidden="true" />
          <p className="m-0">{t('default-ios-install-instructions')}</p>
        </div>
      )}
    </section>
  )
}
