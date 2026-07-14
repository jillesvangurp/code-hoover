import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ScannerStatusOverlay } from './ScannerStatusOverlay'

const labels = {
  startingLabel: 'Starting camera...',
  errorMessage: 'Could not start camera.',
  retryLabel: 'Retry camera',
}

describe('ScannerStatusOverlay', () => {
  it('announces camera startup', () => {
    render(<ScannerStatusOverlay status="starting" onRetry={() => undefined} {...labels} />)

    expect(screen.getByRole('status')).toHaveTextContent('Starting camera...')
  })

  it('offers a working retry action after camera failure', () => {
    const onRetry = vi.fn()
    render(<ScannerStatusOverlay status="error" onRetry={onRetry} {...labels} />)

    expect(screen.getByRole('alert')).toHaveTextContent('Could not start camera.')
    fireEvent.click(screen.getByRole('button', { name: 'Retry camera' }))
    expect(onRetry).toHaveBeenCalledOnce()
  })

  it('stays out of the way while scanning is active', () => {
    const { container } = render(<ScannerStatusOverlay status="active" onRetry={() => undefined} {...labels} />)
    expect(container).toBeEmptyDOMElement()
  })
})
