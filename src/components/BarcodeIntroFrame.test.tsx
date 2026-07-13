import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { BarcodeIntroFrame } from './BarcodeIntroFrame'

vi.mock('../hooks/useBarcodeImageSource', () => ({
  useBarcodeImageSource: () => ({ source: 'data:image/svg+xml,barcode', failed: false }),
}))

describe('BarcodeIntroFrame', () => {
  it('keeps the complete barcode visible while its duplicate supplies the decorative matrix', () => {
    const { container } = render(
      <BarcodeIntroFrame format="CODE_128" text="MEMBER-2026-1042" alt="Membership barcode" />,
    )

    const scannableImage = screen.getByRole('img', { name: 'Membership barcode' })
    expect(scannableImage).toHaveAttribute('src', 'data:image/svg+xml,barcode')
    expect(scannableImage).toHaveClass('barcode-intro-code')
    expect(container.querySelector('.barcode-intro-frame')).toHaveClass('barcode-intro-frame-ready')

    const decorativeImage = container.querySelector('.barcode-intro-matrix')
    expect(decorativeImage).toHaveAttribute('src', 'data:image/svg+xml,barcode')
    expect(decorativeImage).toHaveAttribute('aria-hidden', 'true')
  })

  it('expands and shrinks an interactive barcode without replacing its scannable image', async () => {
    const user = userEvent.setup()
    render(
      <BarcodeIntroFrame format="CODE_128" text="MEMBER-2026-1042" alt="Membership barcode" expandable />,
    )

    const frame = screen.getByRole('button', { name: /enlarge code/i })
    expect(frame).toHaveAttribute('aria-pressed', 'false')

    await user.click(frame)
    expect(frame).toHaveClass('barcode-detail-frame-expanded')
    expect(frame).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('img', { name: 'Membership barcode' })).toHaveAttribute('src', 'data:image/svg+xml,barcode')

    await user.click(frame)
    expect(frame).not.toHaveClass('barcode-detail-frame-expanded')
    expect(frame).toHaveAttribute('aria-pressed', 'false')
  })
})
