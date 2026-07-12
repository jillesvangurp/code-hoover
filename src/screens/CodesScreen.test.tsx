import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { AddCodeScreen, CodesScreen } from './CodesScreen'

vi.mock('../components/QrCodeImage', () => ({
  QrCodeImage: ({ alt }: { alt: string }) => <div role="img" aria-label={alt} />,
}))

vi.mock('../components/BarcodeImage', () => ({
  BarcodeImage: ({ alt, format, text }: { alt: string; format: string; text: string }) => <div role="img" aria-label={alt} data-format={format} data-text={text} />,
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
        createdAt: expect.any(String),
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

  it('shows saved barcode entries as barcodes', () => {
    render(<CodesScreen codes={[{
      name: 'Product',
      text: '5901234123457',
      data: { type: 'qr.QrData.Barcode', format: 'EAN_13', text: '5901234123457' },
    }]} setCodes={vi.fn()} playDelete={vi.fn()} />)

    expect(screen.getByText('Barcode · EAN_13')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Product' })).toHaveAttribute('data-format', 'EAN_13')
  })

  it('confirms before deleting a saved code', async () => {
    const user = userEvent.setup()
    const setCodes = vi.fn()
    const playDelete = vi.fn()
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)
    render(<CodesScreen codes={[{
      name: 'Example',
      text: 'https://example.com',
      data: { type: 'qr.QrData.Url', url: 'https://example.com' },
    }]} setCodes={setCodes} playDelete={playDelete} />)

    await user.click(screen.getByText('Example'))
    await user.click(screen.getByRole('button', { name: /delete/i }))

    expect(confirmSpy).toHaveBeenCalledOnce()
    expect(setCodes).not.toHaveBeenCalled()
    expect(playDelete).not.toHaveBeenCalled()

    confirmSpy.mockReturnValue(true)
    await user.click(screen.getByRole('button', { name: /delete/i }))

    expect(setCodes).toHaveBeenCalledWith([])
    expect(playDelete).toHaveBeenCalledOnce()
  })
})
