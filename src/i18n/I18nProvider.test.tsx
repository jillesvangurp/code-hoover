import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { I18nProvider } from './I18nProvider'
import { useI18n } from './context'

const resources: Record<string, string> = {
  '/lang/en-US.ftl': 'default-about=About',
  '/lang/de-DE.ftl': 'default-about=Über Code Hoover',
}

function LanguageControl() {
  const { locale, setLocale, t } = useI18n()
  return (
    <>
      <p>{t('default-about')}</p>
      <button type="button" onClick={() => setLocale('de-DE')}>🇩🇪</button>
      <output>{locale}</output>
    </>
  )
}

describe('I18nProvider', () => {
  it('loads a Fluent bundle when the language flag changes', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const body = resources[String(input)]
      return new Response(body ?? '', { status: body ? 200 : 404 })
    }))
    const user = userEvent.setup()

    render(<I18nProvider><LanguageControl /></I18nProvider>)
    expect(await screen.findByText('About')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '🇩🇪' }))

    expect(await screen.findByText('Über Code Hoover')).toBeInTheDocument()
    expect(screen.getByText('de-DE')).toBeInTheDocument()
    expect(localStorage.getItem('locale')).toBe('de-DE')
    await waitFor(() => expect(document.documentElement.lang).toBe('de-DE'))
  })
})
