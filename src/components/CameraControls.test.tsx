import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { CameraControls } from './CameraControls'

const labels = {
  flashlightLabel: 'Flashlight',
  turnFlashlightOnLabel: 'Turn flashlight on',
  turnFlashlightOffLabel: 'Turn flashlight off',
  zoomLabel: 'Zoom',
}

describe('CameraControls', () => {
  it('hides itself when the camera supports neither control', () => {
    const { container } = render(<CameraControls
      support={{ torch: false, zoom: null, zoomValue: 1 }}
      torchOn={false}
      zoomValue={1}
      onTorchChange={() => undefined}
      onZoomChange={() => undefined}
      {...labels}
    />)

    expect(container).toBeEmptyDOMElement()
  })

  it('toggles the flashlight and changes hardware zoom', () => {
    const onTorchChange = vi.fn()
    const onZoomChange = vi.fn()
    render(<CameraControls
      support={{ torch: true, zoom: { min: 1, max: 4, step: 0.5 }, zoomValue: 1 }}
      torchOn={false}
      zoomValue={1}
      onTorchChange={onTorchChange}
      onZoomChange={onZoomChange}
      {...labels}
    />)

    fireEvent.click(screen.getByRole('button', { name: 'Turn flashlight on' }))
    fireEvent.change(screen.getByRole('slider', { name: 'Zoom' }), { target: { value: '2.5' } })

    expect(onTorchChange).toHaveBeenCalledWith(true)
    expect(onZoomChange).toHaveBeenCalledWith(2.5)
  })
})
