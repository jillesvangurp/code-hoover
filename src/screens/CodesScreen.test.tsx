import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { reorderDisplayedCodes } from '../domain/codeOrder'
import { AddCodeScreen, CodesScreen } from './CodesScreen'

vi.mock('../components/QrCodeImage', () => ({
  QrCodeImage: ({ alt }: { alt: string }) => <div role="img" aria-label={alt} />,
}))

vi.mock('../components/BarcodeIntroFrame', () => ({
  BarcodeIntroFrame: ({ alt, className, expandable, format, text }: { alt: string; className?: string; expandable?: boolean; format: string; text: string }) => (
    <div
      role="img"
      aria-label={alt}
      className={className}
      data-expandable={String(Boolean(expandable))}
      data-format={format}
      data-text={text}
    />
  ),
}))

afterEach(() => vi.useRealTimers())

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
      expect.objectContaining({
        name: 'https://example.com',
        text: 'https://example.com',
        data: { type: 'qr.QrData.Url', url: 'https://example.com' },
        createdAt: expect.any(String),
      }),
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

    await user.click(screen.getByRole('button', { name: /try example: email/i }))
    await user.click(screen.getByRole('button', { name: /save/i }))

    expect(setCodes).toHaveBeenCalledWith([
      expect.objectContaining({
        name: 'Email the Agent',
        text: 'mailto:mail-agent@formationxyz.com?subject=Demo+question+for+MailFront&body=Hi+MailFront%2C%0A%0AWhat+can+you+answer+from+your+knowledge+base%3F%0A%0AThanks.',
        data: {
          type: 'qr.QrData.Email',
          email: 'mail-agent@formationxyz.com',
          subject: 'Demo question for MailFront',
          body: 'Hi MailFront,\n\nWhat can you answer from your knowledge base?\n\nThanks.',
        },
        createdAt: expect.any(String),
      }),
    ])
    expect(playSave).toHaveBeenCalledOnce()
    expect(onDone).toHaveBeenCalledOnce()
  })

  it('loads a swipeable WiFi example into the add form', async () => {
    const user = userEvent.setup()
    render(<AddCodeScreen codes={[]} setCodes={vi.fn()} onDone={vi.fn()} />)

    expect(screen.getAllByRole('button', { name: /^show example$/i })).toHaveLength(15)
    expect(screen.getByRole('button', { name: /try example: email/i })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /try example: wifi/i }))

    expect(screen.getAllByRole('combobox')[0]).toHaveValue('WIFI')
    expect(screen.getByDisplayValue('Guest Wi-Fi')).toBeInTheDocument()
    expect(screen.getByDisplayValue('FORMATION Guest')).toBeInTheDocument()
    expect(screen.getByDisplayValue('welcome2026')).toBeInTheDocument()
  })

  it('offers an example card for every new code type', () => {
    render(<AddCodeScreen codes={[]} setCodes={vi.fn()} onDone={vi.fn()} />)

    for (const type of ['barcode', 'sepa', 'whatsapp', 'app link', 'payment', 'authenticator']) {
      expect(screen.getByRole('button', { name: new RegExp(`try example: ${type}`, 'i') })).toBeInTheDocument()
    }
  })

  it('adds a manual barcode from its example card', async () => {
    const user = userEvent.setup()
    const setCodes = vi.fn()
    render(<AddCodeScreen codes={[]} setCodes={setCodes} onDone={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: /try example: barcode/i }))
    await user.click(screen.getByRole('button', { name: /save/i }))

    expect(setCodes).toHaveBeenCalledWith([expect.objectContaining({
      name: 'Loyalty card', text: 'MEMBER-2026-1042',
      data: { type: 'qr.QrData.Barcode', format: 'CODE_128', text: 'MEMBER-2026-1042' },
    })])
  })

  it('warns that authenticator setup codes are temporary and local-only', async () => {
    const user = userEvent.setup()
    render(<AddCodeScreen codes={[]} setCodes={vi.fn()} onDone={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: /try example: authenticator/i }))

    expect(screen.getByRole('alert')).toHaveTextContent(/authenticator local only/i)
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

  it('keeps add and code-type help out of the codes screen', () => {
    render(<CodesScreen codes={[]} setCodes={vi.fn()} playDelete={vi.fn()} />)
    expect(screen.queryByRole('button', { name: /add/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /code types/i })).not.toBeInTheDocument()
  })

  it('shows only a progress bar in the codes loading area', () => {
    render(<CodesScreen codes={[]} setCodes={vi.fn()} playDelete={vi.fn()} showLoadEffect />)

    expect(screen.getByRole('progressbar', { name: /loading codes/i })).toBeInTheDocument()
    expect(screen.queryByText(/code hoover/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('img', { name: /code hoover/i })).not.toBeInTheDocument()
  })

  it('runs the barcode frame on the code screen and makes it expandable in details', async () => {
    const user = userEvent.setup()
    render(<CodesScreen codes={[{
      name: 'Product',
      text: '5901234123457',
      data: { type: 'qr.QrData.Barcode', format: 'EAN_13', text: '5901234123457' },
    }]} setCodes={vi.fn()} playDelete={vi.fn()} />)

    expect(screen.getByText('Barcode')).toBeInTheDocument()
    expect(screen.getAllByText('EAN_13').length).toBeGreaterThan(0)
    const codeScreenFrame = screen.getByRole('img', { name: 'Product' })
    expect(codeScreenFrame).toHaveAttribute('data-format', 'EAN_13')
    expect(codeScreenFrame).toHaveAttribute('data-expandable', 'false')

    await user.click(screen.getByText('Product'))

    const detailFrame = screen.getAllByRole('img', { name: 'Product' }).find((frame) => frame.getAttribute('data-expandable') === 'true')
    expect(detailFrame).toHaveClass('barcode-detail-frame')
  })

  it('switches between list and grid views for saved codes', async () => {
    const user = userEvent.setup()
    const playToggle = vi.fn()
    render(<CodesScreen codes={[{
      name: 'Example',
      text: 'https://example.com',
      data: { type: 'qr.QrData.Url', url: 'https://example.com' },
      createdAt: '2026-07-13T09:00:00.000Z',
    }]} setCodes={vi.fn()} playDelete={vi.fn()} playToggle={playToggle} />)

    expect(screen.getByRole('button', { name: /list/i })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: /grid/i })).toHaveAttribute('aria-pressed', 'false')

    await user.click(screen.getByRole('button', { name: /grid/i }))

    expect(screen.getByRole('button', { name: /list/i })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: /grid/i })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('listitem')).toHaveClass('grid-cols-[4.5rem_minmax(0,1fr)]', 'p-3')
    expect(screen.queryByText(/created:/i)).not.toBeInTheDocument()
    expect(screen.getByText('https://example.com')).toBeInTheDocument()
    expect(playToggle).toHaveBeenCalledOnce()
  })

  it('shows newest codes first and can change the sort order', async () => {
    const user = userEvent.setup()
    render(<CodesScreen codes={[
      {
        name: 'Old code',
        text: 'https://old.example',
        data: { type: 'qr.QrData.Url', url: 'https://old.example' },
        createdAt: '2026-07-11T09:00:00.000Z',
      },
      {
        name: 'New code',
        text: 'https://new.example',
        data: { type: 'qr.QrData.Url', url: 'https://new.example' },
        createdAt: '2026-07-13T09:00:00.000Z',
      },
    ]} setCodes={vi.fn()} playDelete={vi.fn()} />)

    const sort = screen.getByRole('combobox', { name: /sort/i })
    expect(within(screen.getAllByRole('listitem')[0]).getByText('New code')).toBeInTheDocument()
    expect(sort).toHaveValue('newest')

    await user.selectOptions(sort, 'oldest')
    expect(within(screen.getAllByRole('listitem')[0]).getByText('Old code')).toBeInTheDocument()
    expect(sort).toHaveValue('oldest')

    await user.selectOptions(sort, 'manual')
    expect(within(screen.getAllByRole('listitem')[0]).getByText('Old code')).toBeInTheDocument()
    expect(sort).toHaveValue('manual')
  })

  it('groups saved codes by their large payload type', async () => {
    const user = userEvent.setup()
    render(<CodesScreen codes={[
      {
        name: 'Office location', text: 'geo:52.5,13.4',
        data: { type: 'qr.QrData.Location', label: 'Office', query: '', latitude: '52.5', longitude: '13.4' },
        createdAt: '2026-07-12T09:00:00.000Z',
      },
      {
        name: 'Summer meetup', text: 'event',
        data: { type: 'qr.QrData.Event', title: 'Summer meetup', start: '2026-07-20T10:00', end: '', location: 'Berlin', description: '' },
        createdAt: '2026-07-13T09:00:00.000Z',
      },
      {
        name: 'Ian Contact', text: 'vcard',
        data: { type: 'qr.QrData.VCard', name: 'Ian', firstName: 'Ian', lastName: '', additionalNames: '', prefix: '', suffix: '', nickname: '', title: '', organization: 'FORMATION', email: 'ian@example.com', emailType: '', phone: '', phoneType: '', url: '', street: '', city: '', region: '', postalCode: '', country: '', note: '' },
        createdAt: '2026-07-11T09:00:00.000Z',
      },
    ]} setCodes={vi.fn()} playDelete={vi.fn()} />)

    await user.selectOptions(screen.getByRole('combobox', { name: /sort/i }), 'type')

    expect(screen.getByRole('heading', { name: 'Event' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Maps' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /v card/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /drag to reorder/i })).not.toBeInTheDocument()
  })

  it('searches code names, payloads, and type labels', async () => {
    const user = userEvent.setup()
    render(<CodesScreen codes={[
      { name: 'FORMATION site', text: 'https://tryformation.com', data: { type: 'qr.QrData.Url', url: 'https://tryformation.com' } },
      { name: 'Office Wi-Fi', text: 'wifi', data: { type: 'qr.QrData.Wifi', ssid: 'Guest Network', password: 'welcome', encryption: 'WPA' } },
    ]} setCodes={vi.fn()} playDelete={vi.fn()} />)

    const search = screen.getByRole('searchbox', { name: /search codes/i })
    await user.type(search, 'guest')
    expect(screen.getByText('Office Wi-Fi')).toBeInTheDocument()
    expect(screen.queryByText('FORMATION site')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /drag to reorder/i })).not.toBeInTheDocument()

    await user.clear(search)
    await user.type(search, 'maps')
    expect(screen.getByText(/no matching codes/i)).toBeInTheDocument()
  })

  it('provides drag handles without opening the card when they are pressed', async () => {
    const user = userEvent.setup()
    const playOpen = vi.fn()
    const oldCode = {
      name: 'Old code',
      text: 'https://old.example',
      data: { type: 'qr.QrData.Url' as const, url: 'https://old.example' },
      createdAt: '2026-07-11T09:00:00.000Z',
    }
    const newCode = {
      name: 'New code',
      text: 'https://new.example',
      data: { type: 'qr.QrData.Url' as const, url: 'https://new.example' },
      createdAt: '2026-07-13T09:00:00.000Z',
    }
    render(<CodesScreen codes={[oldCode, newCode]} setCodes={vi.fn()} playDelete={vi.fn()} playOpen={playOpen} />)

    const handle = screen.getByRole('button', { name: /drag to reorder: new code/i })
    await user.click(handle)

    expect(playOpen).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('persists the displayed order after a drag', () => {
    const first = { name: 'First', text: 'first', data: { type: 'qr.QrData.Text' as const, text: 'first' } }
    const second = { name: 'Second', text: 'second', data: { type: 'qr.QrData.Text' as const, text: 'second' } }

    expect(reorderDisplayedCodes([
      { id: 'first', code: first },
      { id: 'second', code: second },
    ], 'first', 'second')).toEqual([second, first])
  })

  it('restores a saved manual order when the codes screen returns', () => {
    localStorage.setItem('codes-sort-order', JSON.stringify('manual'))
    render(<CodesScreen codes={[
      {
        name: 'Older manual first',
        text: 'https://old.example',
        data: { type: 'qr.QrData.Url', url: 'https://old.example' },
        createdAt: '2026-07-11T09:00:00.000Z',
      },
      {
        name: 'Newer manual second',
        text: 'https://new.example',
        data: { type: 'qr.QrData.Url', url: 'https://new.example' },
        createdAt: '2026-07-13T09:00:00.000Z',
      },
    ]} setCodes={vi.fn()} playDelete={vi.fn()} />)

    expect(within(screen.getAllByRole('listitem')[0]).getByText('Older manual first')).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: /sort/i })).toHaveValue('manual')
  })

  it('plays at most ten staggered code sounds on the first codes visit', () => {
    vi.useFakeTimers()
    const playCodeLoad = vi.fn()
    const onCodeLoadSoundsPlayed = vi.fn()
    const codes = Array.from({ length: 14 }, (_, index) => ({
      name: `Code ${index + 1}`,
      text: `https://example.com/${index + 1}`,
      data: { type: 'qr.QrData.Url', url: `https://example.com/${index + 1}` } as const,
    }))

    render(<CodesScreen codes={codes} setCodes={vi.fn()} playDelete={vi.fn()} playCodeLoad={playCodeLoad} onCodeLoadSoundsPlayed={onCodeLoadSoundsPlayed} />)

    act(() => vi.advanceTimersByTime(500))

    expect(playCodeLoad).toHaveBeenNthCalledWith(1, 0)
    expect(playCodeLoad).toHaveBeenNthCalledWith(10, 9)
    expect(playCodeLoad).toHaveBeenCalledTimes(10)
    expect(onCodeLoadSoundsPlayed).toHaveBeenCalledOnce()

    vi.useRealTimers()
  })

  it('keeps later codes visits quiet', () => {
    vi.useFakeTimers()
    const playCodeLoad = vi.fn()

    render(<CodesScreen codes={[{
      name: 'Example',
      text: 'https://example.com',
      data: { type: 'qr.QrData.Url', url: 'https://example.com' },
    }]} setCodes={vi.fn()} playDelete={vi.fn()} playCodeLoad={playCodeLoad} shouldPlayCodeLoadSounds={false} />)

    act(() => vi.advanceTimersByTime(500))

    expect(playCodeLoad).not.toHaveBeenCalled()

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
    expect(screen.getByRole('button', { name: /share image/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /download image/i })).toBeInTheDocument()
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
