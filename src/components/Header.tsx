import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { Cloud, Download, Info, LogIn, LogOut, Menu, Moon, QrCode, Sun, Trash2, Upload, UserPlus, Volume2, VolumeX, X } from 'lucide-react'
import type { SavedQrCode } from '../domain/qr'
import { parseSavedCodes } from '../domain/qr'
import { LOCALES, useI18n } from '../i18n/context'
import type { AccountSyncControls } from '../hooks/useAccountSync'
import type { Screen } from '../App'
import { CODE_HOOVER_APP_URL } from '../constants/links'
import { FixedCodeModal } from './FixedCodeModal'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

interface HeaderProps {
  codes: SavedQrCode[]
  setCodes: (codes: SavedQrCode[]) => void
  setScreen: (screen: Screen) => void
  dark: boolean
  setDark: (dark: boolean) => void
  soundEnabled: boolean
  setSoundEnabled: (enabled: boolean) => void
  playSoundPreview: () => void
  playComplete: () => void
  playSuccess: () => void
  accountSync: AccountSyncControls
}

export function Header({ codes, setCodes, setScreen, dark, setDark, soundEnabled, setSoundEnabled, playSoundPreview, playComplete, playSuccess, accountSync }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [openDeviceModal, setOpenDeviceModal] = useState(false)
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [accountEmail, setAccountEmail] = useState('')
  const [accountPassword, setAccountPassword] = useState('')
  const fileInput = useRef<HTMLInputElement>(null)
  const desktopMenu = useRef<HTMLDetailsElement>(null)
  const { locale, setLocale, t } = useI18n()
  const closeMenus = () => {
    setMobileMenuOpen(false)
    desktopMenu.current?.removeAttribute('open')
  }

  useEffect(() => {
    const closeDesktopMenuOnOutsideClick = (event: PointerEvent) => {
      if (!desktopMenu.current?.open) return
      if (desktopMenu.current.contains(event.target as Node)) return
      desktopMenu.current.removeAttribute('open')
    }

    document.addEventListener('pointerdown', closeDesktopMenuOnOutsideClick)
    return () => document.removeEventListener('pointerdown', closeDesktopMenuOnOutsideClick)
  }, [])

  useEffect(() => {
    const captureInstallPrompt = (event: Event) => {
      event.preventDefault()
      setInstallPrompt(event as BeforeInstallPromptEvent)
    }

    window.addEventListener('beforeinstallprompt', captureInstallPrompt)
    return () => window.removeEventListener('beforeinstallprompt', captureInstallPrompt)
  }, [])

  const importCodes = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    void file.text().then((text) => {
      try {
        setCodes(parseSavedCodes(text))
      } catch {
        window.alert(t('default-invalid-json'))
      }
      event.target.value = ''
    })
  }

  const exportCodes = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(codes, null, 2)], { type: 'application/json' }))
    const link = document.createElement('a')
    link.href = url
    link.download = 'codes.json'
    link.click()
    URL.revokeObjectURL(url)
    closeMenus()
  }

  const runCloudAction = (action: () => Promise<void>) => {
    void action().catch(() => undefined)
  }

  const createAccount = () => {
    const email = accountEmail.trim()
    if (!email || !accountPassword) return
    runCloudAction(async () => {
      await accountSync.register(email, accountPassword)
      setAccountPassword('')
      playSuccess()
    })
  }

  const signIn = () => {
    const email = accountEmail.trim()
    if (!email || !accountPassword) return
    runCloudAction(async () => {
      await accountSync.signIn(email, accountPassword)
      setAccountPassword('')
      playSuccess()
    })
  }

  const deleteAccount = () => {
    if (!window.confirm(t('default-account-sync-delete-confirm'))) return
    if (window.prompt(t('default-account-sync-delete-type-confirm')) !== 'DELETE') return
    runCloudAction(accountSync.deleteAccount)
  }

  const toggleSound = (enabled: boolean) => {
    setSoundEnabled(enabled)
    if (enabled) window.setTimeout(playSoundPreview, 0)
  }

  const toggleTheme = (enabled: boolean) => {
    setDark(enabled)
    closeMenus()
  }

  const navigateHome = (play = false) => {
    if (play) playComplete()
    setScreen('codes')
    closeMenus()
  }

  const installCodeHoover = () => {
    if (!installPrompt) {
      window.alert(t('default-install-app-fallback'))
      closeMenus()
      return
    }

    void installPrompt.prompt().then(() => installPrompt.userChoice).finally(() => {
      setInstallPrompt(null)
      closeMenus()
    })
  }

  const accountBusy = accountSync.status.state === 'syncing'
  const selectedLocale = LOCALES.find(({ id }) => id === locale) ?? LOCALES[0]

  const menuItems = (
    <>
      <li><button type="button" className="w-full text-left" onClick={() => { playComplete(); setScreen('about'); closeMenus() }}><Info size={16} />{t('default-about')}</button></li>
      <li>
        <button type="button" className="w-full items-start gap-3 text-left" onClick={installCodeHoover}>
          <Download size={16} className="mt-0.5 shrink-0" />
          <span className="flex min-w-0 flex-col gap-1">
            <span className="font-semibold">{t('default-install-app')}</span>
            <span className="text-xs leading-snug opacity-70">{t('default-install-app-description')}</span>
          </span>
        </button>
      </li>
      <li><button type="button" className="w-full" onClick={() => { setOpenDeviceModal(true); closeMenus() }}><QrCode size={16} />{t('default-open-on-different-device')}</button></li>
      <li><button type="button" className="w-full" onClick={() => { fileInput.current?.click(); closeMenus() }}><Upload size={16} />{t('default-import-json')}</button></li>
      <li><button type="button" className="w-full" onClick={exportCodes}><Download size={16} />{t('default-export')}</button></li>
      <li>
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-base-300 bg-base-100 px-3 py-2 text-base-content">
          <span className="text-sm font-medium">{t('default-language')}: {selectedLocale.name}</span>
          <span className="flex flex-wrap justify-end gap-1">
            {LOCALES.map(({ id, flag, name }) => (
              <button
                key={id}
                type="button"
                className={`btn btn-ghost btn-sm w-8 text-2xl filter hover:grayscale-0 ${locale === id ? 'grayscale-0' : 'grayscale'}`}
                title={name}
                aria-label={name}
                onClick={() => { setLocale(id); closeMenus() }}
              >{flag}</button>
            ))}
          </span>
        </div>
      </li>
      <li>
        <div className="flex min-w-0 flex-col gap-2 rounded-md border border-base-300 bg-base-100 p-3 text-base-content">
          <div className="flex items-center justify-between gap-2">
            <span className="flex min-w-0 items-center gap-2 text-sm font-semibold"><Cloud size={18} />{t('default-account-sync')}</span>
            <span className={`badge badge-sm ${accountSync.signedIn ? 'badge-neutral' : 'badge-ghost'}`}>{accountSync.signedIn ? t('default-on') : t('default-off')}</span>
          </div>
          <p className="m-0 text-xs opacity-80">{t(accountSync.status.messageId)}</p>
          {accountSync.signedIn && <p className="m-0 truncate text-xs font-medium opacity-80">{accountSync.email}</p>}
          {accountSync.signedIn ? (
            <div className="grid grid-cols-2 gap-2">
              <button type="button" className="btn btn-xs" disabled={accountBusy} onClick={() => runCloudAction(accountSync.signOut)}><LogOut size={14} />{t('default-account-sync-sign-out')}</button>
              <button type="button" className="btn btn-xs btn-error" disabled={accountBusy} onClick={deleteAccount}><Trash2 size={14} />{t('default-account-sync-delete')}</button>
            </div>
          ) : (
            <form className="flex min-w-0 flex-col gap-2" onSubmit={(event) => { event.preventDefault(); signIn() }}>
              <input
                className="input input-sm input-bordered min-w-0 w-full"
                value={accountEmail}
                type="email"
                autoComplete="email"
                placeholder={t('default-account-email')}
                aria-label={t('default-account-email')}
                onChange={(event) => setAccountEmail(event.target.value)}
              />
              <input
                className="input input-sm input-bordered min-w-0 w-full"
                value={accountPassword}
                type="password"
                autoComplete="current-password"
                placeholder={t('default-account-password')}
                aria-label={t('default-account-password')}
                onChange={(event) => setAccountPassword(event.target.value)}
              />
              <div className="grid min-w-0 grid-cols-2 gap-2">
                <button type="submit" className="btn btn-sm btn-neutral min-w-0" disabled={accountBusy || !accountEmail.trim() || accountPassword.length < 8}><LogIn size={14} />{t('default-account-sign-in')}</button>
                <button type="button" className="btn btn-sm min-w-0" disabled={accountBusy || !accountEmail.trim() || accountPassword.length < 8} onClick={createAccount}><UserPlus size={14} />{t('default-account-create')}</button>
              </div>
            </form>
          )}
        </div>
      </li>
      <li>
        <label className={`flex cursor-pointer items-center justify-between gap-3 rounded-md border px-3 py-2 ${dark ? 'border-neutral bg-neutral text-neutral-content' : 'border-base-300 bg-base-100 text-base-content'}`}>
          <span className="flex min-w-0 items-center gap-2 text-sm font-medium">
            {dark ? <Moon size={18} aria-hidden="true" /> : <Sun size={18} aria-hidden="true" />}
            <span>{t('default-dark-mode')}</span>
          </span>
          <span className="flex shrink-0 items-center gap-2">
            <span className={`badge badge-sm min-w-10 border-0 px-2 text-xs font-bold uppercase ${dark ? 'bg-neutral-content text-neutral' : 'bg-base-300 text-base-content'}`}>
              {dark ? t('default-on') : t('default-off')}
            </span>
            <input type="checkbox" className="toggle toggle-sm" checked={dark} aria-label={t('default-dark-mode')} onChange={(event) => toggleTheme(event.target.checked)} />
          </span>
        </label>
      </li>
      <li>
        <label className={`flex cursor-pointer items-center justify-between gap-3 rounded-md border px-3 py-2 ${soundEnabled ? 'border-neutral bg-neutral text-neutral-content' : 'border-base-300 bg-base-100 text-base-content'}`}>
          <span className="flex min-w-0 items-center gap-2 text-sm font-medium">
            {soundEnabled ? <Volume2 size={18} aria-hidden="true" /> : <VolumeX size={18} aria-hidden="true" />}
            <span>{t('default-sound-effects')}</span>
          </span>
          <span className="flex shrink-0 items-center gap-2">
            <span className={`badge badge-sm min-w-10 border-0 px-2 text-xs font-bold uppercase ${soundEnabled ? 'bg-neutral-content text-neutral' : 'bg-base-300 text-base-content'}`}>
              {soundEnabled ? t('default-on') : t('default-off')}
            </span>
            <input type="checkbox" className="toggle toggle-sm" checked={soundEnabled} aria-label={t('default-sound-effects')} onChange={(event) => toggleSound(event.target.checked)} />
          </span>
        </label>
      </li>
    </>
  )

  return (
    <header className="flex w-full flex-wrap items-center gap-4">
      <input ref={fileInput} className="hidden" type="file" accept=".json,application/json" onChange={importCodes} />
      <button type="button" className="flex min-w-0 cursor-pointer items-center gap-3 rounded-md text-left transition-opacity hover:opacity-75 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-current" onClick={() => navigateHome(true)} aria-label={t('default-page-title')}>
        <img className="code-hoover-logo h-10 w-10" src="/favicon.svg" alt="Code Hoover 2.0 logo" />
        <h1 className="m-0 p-0 text-2xl font-bold text-primary sm:text-3xl">{t('default-page-title')}</h1>
      </button>
      <div className="ms-auto flex items-center gap-2">
        <button type="button" className="btn btn-ghost btn-circle lg:hidden" aria-label={t('default-open')} onClick={() => setMobileMenuOpen(true)}><Menu /></button>
        <details ref={desktopMenu} className="dropdown dropdown-end hidden lg:block">
          <summary className="btn btn-ghost btn-circle" aria-label={t('default-open')}><Menu /></summary>
          <ul className="menu menu-sm dropdown-content z-50 mt-3 w-96 rounded-2xl bg-base-200 p-3 text-base-content shadow">{menuItems}</ul>
        </details>
      </div>
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[100] bg-base-100 text-base-content lg:hidden" role="dialog" aria-modal="true" onClick={closeMenus}>
          <div className="flex h-full w-full flex-col bg-base-100" onClick={(event) => event.stopPropagation()}>
            <div className="flex shrink-0 items-center justify-between border-b border-base-300 px-4 py-3">
              <button type="button" className="flex cursor-pointer items-center gap-3 rounded-md text-left transition-opacity hover:opacity-75 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-current" onClick={() => navigateHome(true)} aria-label={t('default-page-title')}><img className="code-hoover-logo h-8 w-8" src="/favicon.svg" alt="" /><h2 className="m-0 text-lg font-semibold">{t('default-page-title')}</h2></button>
              <button type="button" className="btn btn-ghost btn-circle" aria-label={t('default-close')} onClick={closeMenus}><X /></button>
            </div>
            <ul className="menu menu-lg min-h-0 w-full min-w-0 flex-1 flex-nowrap gap-2 overflow-x-hidden overflow-y-auto bg-base-100 p-4">{menuItems}</ul>
          </div>
        </div>
      )}
      {openDeviceModal && <FixedCodeModal url={CODE_HOOVER_APP_URL} label={t('default-open-on-different-device')} onClose={() => setOpenDeviceModal(false)} />}
    </header>
  )
}
