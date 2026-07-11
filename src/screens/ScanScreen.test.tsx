import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ScanScreen } from './ScanScreen'

vi.mock('@zxing/browser', () => ({
  BrowserMultiFormatReader: class {
    decodeFromVideoDevice() {
      return Promise.resolve({ stop: vi.fn() })
    }
  },
}))

describe('ScanScreen', () => {
  it('returns to the codes screen when scanning stops', async () => {
    const user = userEvent.setup()
    const onStop = vi.fn()
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined)

    render(
      <ScanScreen
        codes={[]}
        setCodes={vi.fn()}
        onStop={onStop}
        playScanSuccess={vi.fn()}
        playDelete={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('button', { name: /stop/i }))

    expect(onStop).toHaveBeenCalledOnce()
  })
})
