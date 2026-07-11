import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { I18nProvider } from './I18nProvider'
import { LOCALES, useI18n } from './context'

const resources: Record<string, string> = {
  '/lang/en-US.ftl': 'default-about=About',
  '/lang/en-PI.ftl': 'default-about=About This Fine Vessel',
}

function LanguageControl() {
  const { locale, setLocale, t } = useI18n()
  return (
    <>
      <p>{t('default-about')}</p>
      <button type="button" aria-label="en-PI" onClick={() => setLocale('en-PI')}>🏴‍☠️</button>
      <output>{locale}</output>
    </>
  )
}

describe('I18nProvider', () => {
  it('loads a Fluent bundle when the language flag changes', async () => {
    expect(LOCALES).toContainEqual({ id: 'en-PI', flag: '🏴‍☠️' })
    expect(LOCALES).toEqual(expect.arrayContaining([
      { id: 'fr-FR', flag: '🇫🇷' },
      { id: 'it-IT', flag: '🇮🇹' },
      { id: 'uk-UA', flag: '🇺🇦' },
      { id: 'ga-IE', flag: '🇮🇪' },
      { id: 'fi-FI', flag: '🇫🇮' },
      { id: 'sv-SE', flag: '🇸🇪' },
    ]))
    expect(LOCALES.at(-1)).toEqual({ id: 'en-PI', flag: '🏴‍☠️' })
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const body = resources[String(input)]
      return new Response(body ?? '', { status: body ? 200 : 404 })
    }))
    const user = userEvent.setup()

    render(<I18nProvider><LanguageControl /></I18nProvider>)
    expect(await screen.findByText('About')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'en-PI' }))

    expect(await screen.findByText('About This Fine Vessel')).toBeInTheDocument()
    expect(screen.getByText('en-PI')).toBeInTheDocument()
    expect(localStorage.getItem('locale')).toBe('en-PI')
    await waitFor(() => expect(document.documentElement.lang).toBe('en-PI'))
  })
})
