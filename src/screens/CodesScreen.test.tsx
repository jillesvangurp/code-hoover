import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { CodesScreen } from './CodesScreen'

vi.mock('../components/QrCodeImage', () => ({
  QrCodeImage: ({ alt }: { alt: string }) => <div role="img" aria-label={alt} />,
}))

describe('CodesScreen', () => {
  it('adds a URL code through the React form', async () => {
    const user = userEvent.setup()
    const setCodes = vi.fn()
    render(<CodesScreen codes={[]} setCodes={setCodes} onScan={vi.fn()} playDelete={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: /add/i }))
    const inputs = screen.getAllByRole('textbox')
    await user.type(inputs[1], 'https://example.com')
    await user.click(screen.getByRole('button', { name: /save/i }))

    expect(setCodes).toHaveBeenCalledWith([
      {
        name: 'https://example.com',
        text: 'https://example.com',
        data: { type: 'qr.QrData.Url', url: 'https://example.com' },
      },
    ])
  })

  it('cancels without changing saved codes', async () => {
    const user = userEvent.setup()
    const setCodes = vi.fn()
    render(<CodesScreen codes={[]} setCodes={setCodes} onScan={vi.fn()} playDelete={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: /add/i }))
    await user.click(screen.getByRole('button', { name: /cancel/i }))
    expect(setCodes).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: /add/i })).toBeInTheDocument()
  })

  it('opens the scanner from the codes screen', async () => {
    const user = userEvent.setup()
    const onScan = vi.fn()
    render(<CodesScreen codes={[]} setCodes={vi.fn()} onScan={onScan} playDelete={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: /scan/i }))

    expect(onScan).toHaveBeenCalledOnce()
  })
})
