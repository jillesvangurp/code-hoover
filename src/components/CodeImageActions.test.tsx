import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CodeImageActions } from './CodeImageActions'
import { createCodeImageBlob, downloadCodeImage } from '../lib/codeImage'

vi.mock('../lib/codeImage', () => ({
  codeImageFilename: (name: string) => `${name}.png`,
  createCodeImageBlob: vi.fn(),
  downloadCodeImage: vi.fn(),
}))

describe('CodeImageActions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(createCodeImageBlob).mockResolvedValue(new Blob(['image'], { type: 'image/png' }))
    Object.defineProperty(navigator, 'share', { configurable: true, value: undefined })
    Object.defineProperty(navigator, 'canShare', { configurable: true, value: undefined })
  })

  it('downloads a generated PNG image', async () => {
    const user = userEvent.setup()
    render(<CodeImageActions source={{ kind: 'qr', text: 'https://example.com' }} name="Example" />)

    await user.click(screen.getByRole('button', { name: /download image/i }))

    expect(createCodeImageBlob).toHaveBeenCalledWith({ kind: 'qr', text: 'https://example.com' })
    expect(downloadCodeImage).toHaveBeenCalledWith(expect.any(Blob), 'Example.png')
  })

  it('shares the PNG through the native share sheet', async () => {
    const user = userEvent.setup()
    const share = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'share', { configurable: true, value: share })
    Object.defineProperty(navigator, 'canShare', { configurable: true, value: vi.fn().mockReturnValue(true) })
    render(<CodeImageActions source={{ kind: 'barcode', format: 'EAN_13', text: '5901234123457' }} name="Product" />)

    await user.click(screen.getByRole('button', { name: /share image/i }))

    expect(share).toHaveBeenCalledWith({
      files: [expect.objectContaining({ name: 'Product.png', type: 'image/png' })],
      title: 'Product',
    })
    expect(downloadCodeImage).not.toHaveBeenCalled()
  })

  it('downloads from Share when the browser has no native file sharing', async () => {
    const user = userEvent.setup()
    render(<CodeImageActions source={{ kind: 'qr', text: 'hello' }} name="Hello" />)

    await user.click(screen.getByRole('button', { name: /share image/i }))

    expect(downloadCodeImage).toHaveBeenCalledWith(expect.any(Blob), 'Hello.png')
  })
})
