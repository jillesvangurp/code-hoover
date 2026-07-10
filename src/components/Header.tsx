import { useRef, useState, type ChangeEvent } from 'react'
import { Download, Menu, Moon, Sun, Upload, X } from 'lucide-react'
import type { SavedQrCode } from '../domain/qr'
import { parseSavedCodes } from '../domain/qr'
import { LOCALES, useI18n } from '../i18n/context'
import type { Screen } from '../App'

interface HeaderProps {
  codes: SavedQrCode[]
  setCodes: (codes: SavedQrCode[]) => void
  setScreen: (screen: Screen) => void
  dark: boolean
  setDark: (dark: boolean) => void
  soundEnabled: boolean
  setSoundEnabled: (enabled: boolean) => void
}

export function Header({ codes, setCodes, setScreen, dark, setDark, soundEnabled, setSoundEnabled }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)
  const desktopMenu = useRef<HTMLDetailsElement>(null)
  const { locale, setLocale, t } = useI18n()
  const closeMenus = () => {
    setMobileMenuOpen(false)
    desktopMenu.current?.removeAttribute('open')
  }

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

  const menuItems = (
    <>
      <li><button type="button" className="w-full text-left" onClick={() => { setScreen('about'); closeMenus() }}>{t('default-about')}</button></li>
      <li><button type="button" className="w-full" onClick={() => { fileInput.current?.click(); closeMenus() }}><Upload size={16} />{t('default-import')}</button></li>
      <li><button type="button" className="w-full" onClick={exportCodes}><Download size={16} />{t('default-export')}</button></li>
      <li>
        <div className="flex flex-wrap justify-center gap-2">
          {LOCALES.map(({ id, flag }) => (
            <button
              key={id}
              type="button"
              className={`btn btn-ghost btn-sm w-8 text-2xl filter hover:grayscale-0 ${locale === id ? 'grayscale-0' : 'grayscale'}`}
              title={id}
              aria-label={id}
              onClick={() => { setLocale(id); closeMenus() }}
            >{flag}</button>
          ))}
        </div>
      </li>
      <li>
        <button type="button" className="w-full" title={t('default-dark-mode')} onClick={() => { setDark(!dark); closeMenus() }}>
          {dark ? <Sun size={22} /> : <Moon size={22} />}{t('default-dark-mode')}
        </button>
      </li>
      <li>
        <label className="flex cursor-pointer items-center justify-between gap-2 px-2">
          <span className="text-sm font-medium">{t('default-sound-effects')}</span>
          <input type="checkbox" className="toggle toggle-primary" checked={soundEnabled} onChange={(event) => setSoundEnabled(event.target.checked)} />
        </label>
      </li>
    </>
  )

  return (
    <header className="flex w-full flex-wrap items-center gap-4">
      <input ref={fileInput} className="hidden" type="file" accept=".json,application/json" onChange={importCodes} />
      <div className="flex min-w-0 items-center gap-3">
        <img className="h-10 w-10 dark:invert" src="/favicon.svg" alt="Code Hoover logo" />
        <h1 className="m-0 p-0 text-2xl font-bold text-primary sm:text-3xl">{t('default-page-title')}</h1>
      </div>
      <div className="ms-auto flex items-center gap-2">
        <button type="button" className="btn btn-ghost btn-circle lg:hidden" aria-label={t('default-open')} onClick={() => setMobileMenuOpen(true)}><Menu /></button>
        <details ref={desktopMenu} className="dropdown dropdown-end hidden lg:block">
          <summary className="btn btn-ghost btn-circle" aria-label={t('default-open')}><Menu /></summary>
          <ul className="menu menu-sm dropdown-content z-50 mt-3 w-52 rounded-2xl bg-base-200 p-2 shadow">{menuItems}</ul>
        </details>
      </div>
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[100] flex flex-col bg-base-100 text-base-content lg:hidden" role="dialog" aria-modal="true">
          <div className="flex items-center justify-between border-b border-base-300 px-4 py-3">
            <div className="flex items-center gap-3"><img className="h-8 w-8 dark:invert" src="/favicon.svg" alt="" /><h2 className="m-0 text-lg font-semibold">{t('default-page-title')}</h2></div>
            <button type="button" className="btn btn-ghost btn-circle" aria-label={t('default-close')} onClick={closeMenus}><X /></button>
          </div>
          <ul className="menu menu-lg flex-1 gap-2 overflow-y-auto bg-base-100 p-4">{menuItems}</ul>
        </div>
      )}
    </header>
  )
}
