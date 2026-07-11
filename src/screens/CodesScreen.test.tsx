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
    await user.type(screen.getByRole('textbox', { name: /url/i }), 'https://example.com')
    await user.click(screen.getByRole('button', { name: /save/i }))

    expect(setCodes).toHaveBeenCalledWith([
      {
        name: 'https://example.com',
        text: 'https://example.com',
        data: { type: 'qr.QrData.Url', url: 'https://example.com' },
      },
    ])
  })

  it('labels the fields for each code type', async () => {
    const user = userEvent.setup()
    render(<CodesScreen codes={[]} setCodes={vi.fn()} onScan={vi.fn()} playDelete={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: /add/i }))

    expect(screen.getByRole('textbox', { name: /name/i })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: /url/i })).toBeInTheDocument()
    const type = screen.getByRole('combobox', { name: /type/i })
    await user.selectOptions(type, 'WIFI')

    expect(screen.getByRole('textbox', { name: /ssid/i })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: /password/i })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: /encryption/i })).toBeInTheDocument()
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

  it('shares a URL code without opening it when native sharing is available', async () => {
    const user = userEvent.setup()
    const share = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'share', { configurable: true, value: share })
    render(<CodesScreen
      codes={[{ name: 'Example', text: 'https://example.com', data: { type: 'qr.QrData.Url', url: 'https://example.com' } }]}
      setCodes={vi.fn()}
      onScan={vi.fn()}
      playDelete={vi.fn()}
    />)

    await user.click(screen.getAllByRole('button', { name: /share/i })[0])

    expect(share).toHaveBeenCalledWith({ title: 'Example', url: 'https://example.com' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    Reflect.deleteProperty(navigator, 'share')
  })
})
