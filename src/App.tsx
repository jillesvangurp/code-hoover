import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Plus, QrCode, ScanBarcode } from 'lucide-react'
import { Header } from './components/Header'
import { LoadingSplash } from './components/LoadingSplash'
import { parseSavedCodes } from './domain/qr'
import { useAccountSync } from './hooks/useAccountSync'
import { useLocalStorage } from './hooks/useLocalStorage'
import { useI18n } from './i18n/context'
import { SoundEffects } from './lib/sounds'
import { AddCodeScreen, CodesScreen } from './screens/CodesScreen'

const AboutScreen = lazy(() => import('./screens/AboutScreen').then((module) => ({ default: module.AboutScreen })))
const ScanScreen = lazy(() => import('./screens/ScanScreen').then((module) => ({ default: module.ScanScreen })))

export type Screen = 'codes' | 'scan' | 'add' | 'about'

const NAV_TABS = [
  { id: 'codes', Icon: QrCode },
  { id: 'scan', Icon: ScanBarcode },
  { id: 'add', Icon: Plus },
] as const

export default function App() {
  const [showSplash, setShowSplash] = useState(true)
  const [showCodesLoadEffect, setShowCodesLoadEffect] = useState(false)
  const [screen, setScreen] = useState<Screen>('codes')
  const [codes, setCodes] = useLocalStorage('codes', [], parseSavedCodes)
  const [soundEnabled, setSoundEnabled] = useLocalStorage('sound-enabled', true, (value) => value === 'true' || value === '"true"')
  const [dark, setDark] = useState(false)
  const accountSync = useAccountSync(codes, setCodes)
  const soundEnabledRef = useRef(soundEnabled)
  const { t } = useI18n()
  soundEnabledRef.current = soundEnabled
  const sounds = useMemo(() => new SoundEffects(() => soundEnabledRef.current), [])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', dark ? 'qr-dark' : 'qr-light')
  }, [dark])

  useEffect(() => {
    const splashTimer = window.setTimeout(() => {
      setShowSplash(false)
      setShowCodesLoadEffect(true)
    }, 850)
    const codesEffectTimer = window.setTimeout(() => setShowCodesLoadEffect(false), 2300)
    return () => {
      window.clearTimeout(splashTimer)
      window.clearTimeout(codesEffectTimer)
    }
  }, [])

  return (
    <main className="flex min-h-screen flex-col items-center px-4 py-6 text-base-content sm:py-10">
      {showSplash && <LoadingSplash />}
      <article className={`flex w-full max-w-xl flex-grow flex-col gap-6 rounded-3xl bg-base-100 p-6 shadow-xl sm:p-10 lg:max-w-3xl ${showSplash ? 'app-shell-loading' : ''}`}>
        <Header
          codes={codes}
          setCodes={setCodes}
          setScreen={setScreen}
          dark={dark}
          setDark={setDark}
          soundEnabled={soundEnabled}
          setSoundEnabled={setSoundEnabled}
          playSoundPreview={sounds.playPreview}
          accountSync={accountSync}
        />
        <div className="tabs tabs-box mb-6 grid w-full grid-cols-3" role="tablist" aria-label={t('default-page-title')}>
          {NAV_TABS.map(({ id: tab, Icon }) => (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-label={t(`default-${tab}`)}
              aria-selected={screen === tab}
              title={t(`default-${tab}`)}
              className={`tab w-full ${screen === tab ? 'tab-active bg-neutral text-neutral-content' : 'bg-base-100 text-base-content hover:bg-neutral hover:text-neutral-content'}`}
              onClick={() => setScreen(tab)}
            ><Icon size={22} aria-hidden="true" /></button>
          ))}
        </div>
        <Suspense fallback={<div className="flex justify-center p-8"><span className="loading loading-spinner loading-lg" /></div>}>
          {screen === 'codes' && <CodesScreen codes={codes} setCodes={setCodes} playDelete={sounds.playDelete} showLoadEffect={showCodesLoadEffect} />}
          {screen === 'scan' && <ScanScreen codes={codes} setCodes={setCodes} playScanSuccess={sounds.playScanSuccess} />}
          {screen === 'add' && <AddCodeScreen codes={codes} setCodes={setCodes} onDone={() => setScreen('codes')} />}
          {screen === 'about' && <AboutScreen />}
        </Suspense>
      </article>
    </main>
  )
}
