import type { FluentVariable } from '@fluent/bundle'
import { createContext, useContext } from 'react'

export const LOCALES = [
  { id: 'en-US', flag: '🇺🇸' },
  { id: 'de-DE', flag: '🇩🇪' },
  { id: 'nl-NL', flag: '🇳🇱' },
  { id: 'fr-FR', flag: '🇫🇷' },
  { id: 'ja-JP', flag: '🇯🇵' },
  { id: 'en-PI', flag: '🏴‍☠️' },
] as const

export type Locale = (typeof LOCALES)[number]['id']

export interface I18nValue {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (id: string, args?: Record<string, FluentVariable>) => string
}

export const fallbackText = (id: string) => id.replace(/^default-/, '').replaceAll('-', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())

export const I18nContext = createContext<I18nValue>({ locale: 'en-US', setLocale: () => undefined, t: fallbackText })

export const useI18n = () => useContext(I18nContext)
