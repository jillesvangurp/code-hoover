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

    const panel = screen.getByRole('complementary', { name: /about this code/i })
    expect(panel).toHaveTextContent('A secure web link to Example.')
    expect(panel).toHaveTextContent('Encrypted HTTPS')
    expect(panel).toHaveTextContent(/Derived (?:from the information stored in the code|Code Information)/i)
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

  it('renders compact event dates as a readable range with the full card content', () => {
    render(<CodeModal
      code={{
        name: 'Team meetup',
        text: 'BEGIN:VEVENT\nSUMMARY:Team meetup\nDTSTART:20260720T090000\nDTEND:20260720T100000\nLOCATION:Berlin office\nDESCRIPTION:Weekly project meetup\nEND:VEVENT',
        data: {
          type: QR_DATA_TYPES.event,
          title: 'Team meetup',
          start: '20260720T090000',
          end: '20260720T100000',
          location: 'Berlin office',
          description: 'Weekly project meetup',
        },
      }}
      onSave={vi.fn()}
      onDelete={vi.fn()}
      onClose={vi.fn()}
    />)

    const preview = screen.getByRole('region', { name: 'Team meetup' })
    expect(preview).toHaveClass('shrink-0')
    expect(preview).toHaveTextContent('09:00 – 10:00')
    expect(preview).not.toHaveTextContent('20260720T100000')
    expect(screen.getByRole('link', { name: /add event/i })).toBeVisible()
  })
})
