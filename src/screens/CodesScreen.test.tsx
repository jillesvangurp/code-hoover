import { act, render, screen } from '@testing-library/react'
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
    const playSave = vi.fn()
    render(<AddCodeScreen codes={[]} setCodes={setCodes} onDone={onDone} playSave={playSave} />)

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
    expect(playSave).toHaveBeenCalledOnce()
    expect(onDone).toHaveBeenCalledOnce()
  })

  it('adds the MailFront email-agent helper code', async () => {
    const user = userEvent.setup()
    const setCodes = vi.fn()
    const onDone = vi.fn()
    const playSave = vi.fn()
    render(<AddCodeScreen codes={[]} setCodes={setCodes} onDone={onDone} playSave={playSave} />)

    await user.click(screen.getByRole('button', { name: /email the agent/i }))
    await user.click(screen.getByRole('button', { name: /save/i }))

    expect(setCodes).toHaveBeenCalledWith([
      {
        name: 'Email the Agent',
        text: 'mailto:mail-agent@formationxyz.com?subject=Demo+question+for+MailFront&body=Hi+MailFront%2C%0A%0AWhat+can+you+answer+from+your+knowledge+base%3F%0A%0AThanks.',
        data: {
          type: 'qr.QrData.Email',
          email: 'mail-agent@formationxyz.com',
          subject: 'Demo question for MailFront',
          body: 'Hi MailFront,\n\nWhat can you answer from your knowledge base?\n\nThanks.',
        },
        createdAt: expect.any(String),
      },
    ])
    expect(playSave).toHaveBeenCalledOnce()
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

    expect(screen.getByText('Barcode')).toBeInTheDocument()
    expect(screen.getAllByText('EAN_13').length).toBeGreaterThan(0)
    expect(screen.getByRole('img', { name: 'Product' })).toHaveAttribute('data-format', 'EAN_13')
  })

  it('switches between list and grid views for saved codes', async () => {
    const user = userEvent.setup()
    const playToggle = vi.fn()
    render(<CodesScreen codes={[{
      name: 'Example',
      text: 'https://example.com',
      data: { type: 'qr.QrData.Url', url: 'https://example.com' },
    }]} setCodes={vi.fn()} playDelete={vi.fn()} playToggle={playToggle} />)

    expect(screen.getByRole('button', { name: /list/i })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: /grid/i })).toHaveAttribute('aria-pressed', 'false')

    await user.click(screen.getByRole('button', { name: /grid/i }))

    expect(screen.getByRole('button', { name: /list/i })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: /grid/i })).toHaveAttribute('aria-pressed', 'true')
    expect(playToggle).toHaveBeenCalledOnce()
  })

  it('plays a staggered sound for each code loaded in the codes view', () => {
    vi.useFakeTimers()
    const playCodeLoad = vi.fn()

    render(<CodesScreen codes={[
      {
        name: 'First',
        text: 'https://first.example',
        data: { type: 'qr.QrData.Url', url: 'https://first.example' },
      },
      {
        name: 'Second',
        text: 'https://second.example',
        data: { type: 'qr.QrData.Url', url: 'https://second.example' },
      },
    ]} setCodes={vi.fn()} playDelete={vi.fn()} playCodeLoad={playCodeLoad} />)

    act(() => vi.advanceTimersByTime(42))

    expect(playCodeLoad).toHaveBeenNthCalledWith(1, 0)
    expect(playCodeLoad).toHaveBeenNthCalledWith(2, 1)

    vi.useRealTimers()
  })

  it('plays a sound when opening a saved code', async () => {
    const user = userEvent.setup()
    const playOpen = vi.fn()
    render(<CodesScreen codes={[{
      name: 'Example',
      text: 'https://example.com',
      data: { type: 'qr.QrData.Url', url: 'https://example.com' },
    }]} setCodes={vi.fn()} playDelete={vi.fn()} playOpen={playOpen} />)

    await user.click(screen.getByText('Example'))

    expect(playOpen).toHaveBeenCalledOnce()
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
