import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { AddCodeScreen, CodesScreen } from './CodesScreen'

vi.mock('../components/QrCodeImage', () => ({
  QrCodeImage: ({ alt }: { alt: string }) => <div role="img" aria-label={alt} />,
}))

describe('CodesScreen', () => {
  it('adds a URL code through the add screen', async () => {
    const user = userEvent.setup()
    const setCodes = vi.fn()
    const onDone = vi.fn()
    render(<AddCodeScreen codes={[]} setCodes={setCodes} onDone={onDone} />)

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
    expect(onDone).toHaveBeenCalledOnce()
  })

  it('cancels without changing saved codes', async () => {
    const user = userEvent.setup()
    const setCodes = vi.fn()
    const onDone = vi.fn()
    render(<AddCodeScreen codes={[]} setCodes={setCodes} onDone={onDone} />)
    await user.click(screen.getByRole('button', { name: /cancel/i }))
    expect(setCodes).not.toHaveBeenCalled()
    expect(onDone).toHaveBeenCalledOnce()
  })

  it('shows saved codes without an inline add button', () => {
    render(<CodesScreen codes={[]} setCodes={vi.fn()} playDelete={vi.fn()} />)
    expect(screen.queryByRole('button', { name: /add/i })).not.toBeInTheDocument()
  })
})
