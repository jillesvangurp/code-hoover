import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fallbackText, I18nContext, type Locale } from '../i18n/context'
import { Header } from './Header'

function HeaderHarness() {
  const [locale, setLocale] = useState<Locale>('en-US')
  return (
    <I18nContext.Provider value={{ locale, setLocale, t: fallbackText }}>
      <Header
        codes={[]}
        setCodes={vi.fn()}
        setScreen={vi.fn()}
        dark={false}
        setDark={vi.fn()}
        soundEnabled
        setSoundEnabled={vi.fn()}
      />
    </I18nContext.Provider>
  )
}

describe('Header language selector', () => {
  it('shows a full-color selected language with a clear pressed state', async () => {
    const user = userEvent.setup()
    render(<HeaderHarness />)
    const english = screen.getByRole('button', { name: 'en-US' })
    const pirate = screen.getByRole('button', { name: 'en-PI' })

    expect(english).toHaveAttribute('aria-pressed', 'true')
    expect(english).not.toHaveClass('grayscale')
    expect(english).toHaveClass('ring-2')

    await user.click(pirate)

    expect(pirate).toHaveAttribute('aria-pressed', 'true')
    expect(pirate).not.toHaveClass('grayscale')
    expect(pirate).toHaveClass('ring-2')
    expect(english).toHaveAttribute('aria-pressed', 'false')
    expect(english).toHaveClass('grayscale')
  })
})
