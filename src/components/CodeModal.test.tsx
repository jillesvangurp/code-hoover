import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { QR_DATA_TYPES } from '../domain/qr'
import { CodeModal } from './CodeModal'

vi.mock('./QrIntroFrame', () => ({
  QrIntroFrame: ({ label }: { label: string }) => <div data-testid="qr-code">{label}</div>,
}))

vi.mock('./CodeImageActions', () => ({
  CodeImageActions: () => null,
}))

describe('CodeModal enrichment', () => {
  it('shows derived information for a URL code', () => {
    render(<CodeModal
      code={{
        name: 'Product page',
        text: 'https://www.example.com/products?id=42',
        data: { type: QR_DATA_TYPES.url, url: 'https://www.example.com/products?id=42' },
      }}
      onSave={vi.fn()}
      onDelete={vi.fn()}
      onClose={vi.fn()}
    />)

    const panel = screen.getByRole('complementary', { name: 'About this code' })
    expect(panel).toHaveTextContent('A secure web link to Example.')
    expect(panel).toHaveTextContent('Encrypted HTTPS')
    expect(panel).toHaveTextContent('Derived from the information stored in the code.')
  })

  it('does not show an enrichment panel for ambiguous plain text', () => {
    render(<CodeModal
      code={{
        name: 'Note',
        text: 'Remember the milk',
        data: { type: QR_DATA_TYPES.text, text: 'Remember the milk' },
      }}
      onSave={vi.fn()}
      onDelete={vi.fn()}
      onClose={vi.fn()}
    />)

    expect(screen.queryByRole('complementary', { name: 'About this code' })).not.toBeInTheDocument()
  })
})
