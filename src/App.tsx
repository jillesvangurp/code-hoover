import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Header } from './components/Header'
import { InstallApp } from './components/InstallApp'
import { parseSavedCodes } from './domain/qr'
import { useLocalStorage } from './hooks/useLocalStorage'
import { SoundEffects } from './lib/sounds'
import { CodesScreen } from './screens/CodesScreen'

const AboutScreen = lazy(() => import('./screens/AboutScreen').then((module) => ({ default: module.AboutScreen })))
const ScanScreen = lazy(() => import('./screens/ScanScreen').then((module) => ({ default: module.ScanScreen })))

export type Screen = 'codes' | 'scan' | 'about'

export default function App() {
  const [screen, setScreen] = useState<Screen>('codes')
  const [codes, setCodes] = useLocalStorage('codes', [], parseSavedCodes)
  const [soundEnabled, setSoundEnabled] = useLocalStorage('sound-enabled', true, (value) => value === 'true' || value === '"true"')
  const [dark, setDark] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches)
  const soundEnabledRef = useRef(soundEnabled)
  soundEnabledRef.current = soundEnabled
  const sounds = useMemo(() => new SoundEffects(() => soundEnabledRef.current), [])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', dark ? 'qr-dark' : 'qr-light')
  }, [dark])

  return (
    <main className="flex min-h-screen flex-col items-center px-4 py-6 text-base-content sm:py-10">
      <article className="flex w-full max-w-xl flex-grow flex-col gap-6 rounded-3xl bg-base-100 p-6 shadow-xl sm:p-10 lg:max-w-3xl">
        <Header
          codes={codes}
          setCodes={setCodes}
          setScreen={setScreen}
          dark={dark}
          setDark={setDark}
          soundEnabled={soundEnabled}
          setSoundEnabled={setSoundEnabled}
        />
        <InstallApp />
        <Suspense fallback={<div className="flex justify-center p-8"><span className="loading loading-spinner loading-lg" /></div>}>
          {screen === 'codes' && <CodesScreen codes={codes} setCodes={setCodes} onScan={() => setScreen('scan')} playDelete={sounds.playDelete} />}
          {screen === 'scan' && <ScanScreen codes={codes} setCodes={setCodes} onStop={() => setScreen('codes')} playScanSuccess={sounds.playScanSuccess} playDelete={sounds.playDelete} />}
          {screen === 'about' && <AboutScreen />}
        </Suspense>
      </article>
    </main>
  )
}
