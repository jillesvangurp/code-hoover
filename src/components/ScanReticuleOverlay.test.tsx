import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ScanReticuleOverlay } from './ScanReticuleOverlay'

describe('ScanReticuleOverlay', () => {
  it('draws distinct captured and previously saved detections', () => {
    const { container } = render(<ScanReticuleOverlay
      viewport={{ width: 320, height: 240 }}
      capturedLabel="Scanned"
      savedLabel="Saved"
      detections={[
        { id: 'new', status: 'captured', lastSeen: 1, source: { width: 320, height: 240 }, points: [{ x: 20, y: 40 }, { x: 120, y: 40 }, { x: 120, y: 140 }, { x: 20, y: 140 }] },
        { id: 'old', status: 'saved', lastSeen: 1, source: { width: 320, height: 240 }, points: [{ x: 170, y: 50 }, { x: 270, y: 50 }, { x: 270, y: 150 }, { x: 170, y: 150 }] },
      ]}
    />)

    expect(container.querySelector('.scan-reticule-captured')).toBeInTheDocument()
    expect(container.querySelector('.scan-reticule-saved')).toBeInTheDocument()
    expect(container.querySelector('.scan-reticule-check')).toHaveTextContent('✓')
    expect(screen.getByText('Scanned')).toBeInTheDocument()
    expect(screen.getByText('Saved')).toBeInTheDocument()
  })
})
