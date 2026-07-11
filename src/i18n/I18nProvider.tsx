import { FluentBundle, FluentResource, type FluentVariable } from '@fluent/bundle'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { fallbackText, I18nContext, LOCALES, type Locale } from './context'

function findBrowserLocale(): Locale {
  const saved = localStorage.getItem('locale')
  if (LOCALES.some(({ id }) => id === saved)) return saved as Locale
  const languages = [navigator.language, ...(navigator.languages ?? [])]
  return LOCALES.find(({ id }) => languages.some((language) => language === id || language.startsWith(id.slice(0, 2))))?.id ?? 'en-US'
}

async function loadBundle(locale: Locale): Promise<FluentBundle> {
  const bundle = new FluentBundle(locale)
  const response = await fetch(`${import.meta.env.BASE_URL}lang/${locale}.ftl`)
  if (!response.ok) throw new Error(`Could not load ${locale}`)
  bundle.addResource(new FluentResource(await response.text()))
  return bundle
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(findBrowserLocale)
  const [bundle, setBundle] = useState<FluentBundle | null>(null)
  const [fallbackBundle, setFallbackBundle] = useState<FluentBundle | null>(null)

  useEffect(() => {
    document.documentElement.lang = locale
    let active = true
    void Promise.all([
      loadBundle(locale),
      locale === 'en-US' ? Promise.resolve(null) : loadBundle('en-US'),
    ]).then(([current, fallback]) => {
      if (active) {
        setBundle(current)
        setFallbackBundle(fallback)
      }
    }).catch((error: unknown) => console.error('Could not load translations', error))
    return () => { active = false }
  }, [locale])

  const setLocale = useCallback((nextLocale: Locale) => {
    localStorage.setItem('locale', nextLocale)
    setLocaleState(nextLocale)
  }, [])

  const t = useCallback((id: string, args?: Record<string, FluentVariable>) => {
    const message = bundle?.getMessage(id) ?? fallbackBundle?.getMessage(id)
    if (!message?.value) return fallbackText(id)
    return (bundle?.hasMessage(id) ? bundle : fallbackBundle)?.formatPattern(message.value, args) ?? fallbackText(id)
  }, [bundle, fallbackBundle])

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t])
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}
