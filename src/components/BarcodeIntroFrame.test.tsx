import { render, screen } from '@testing-library/react'
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
})
