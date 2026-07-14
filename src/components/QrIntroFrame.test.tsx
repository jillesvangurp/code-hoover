import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { QrIntroFrame } from './QrIntroFrame'

vi.mock('./QrCodeImage', () => ({
  QrCodeImage: ({ margin, alt }: { margin: number; alt: string }) => <span role="img" aria-label={alt} data-margin={margin} />,
}))

describe('QrIntroFrame quiet zone', () => {
  it('adds the standard four-module white margin when a QR code is enlarged', async () => {
    const user = userEvent.setup()
    render(<QrIntroFrame text="https://example.com" label="Example" expandable />)

    expect(screen.getByRole('img', { name: 'Example' })).toHaveAttribute('data-margin', '0')
    await user.click(screen.getByRole('button', { name: /enlarge/i }))
    expect(screen.getByRole('img', { name: 'Example' })).toHaveAttribute('data-margin', '4')
  })

  it('keeps a four-module quiet zone on an already enlarged QR code', () => {
    render(<QrIntroFrame text="https://example.com" label="Example" quietZone />)
    expect(screen.getByRole('img', { name: 'Example' })).toHaveAttribute('data-margin', '4')
  })

  it('closes an enlarged QR code when the surrounding backdrop is clicked', async () => {
    const user = userEvent.setup()
    render(<QrIntroFrame text="https://example.com" label="Example" expandable />)

    await user.click(screen.getByRole('button', { name: /enlarge/i }))
    await user.click(screen.getByRole('button', { name: 'Close: Example' }))

    expect(screen.getByRole('button', { name: /enlarge/i })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('img', { name: 'Example' })).toHaveAttribute('data-margin', '0')
  })

  it('closes an enlarged QR code with Escape', async () => {
    const user = userEvent.setup()
    render(<QrIntroFrame text="https://example.com" label="Example" expandable />)

    await user.click(screen.getByRole('button', { name: /enlarge/i }))
    await user.keyboard('{Escape}')

    expect(screen.getByRole('button', { name: /enlarge/i })).toHaveAttribute('aria-pressed', 'false')
  })
})
