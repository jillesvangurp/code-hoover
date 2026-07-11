import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { InstallApp } from './InstallApp'

describe('InstallApp', () => {
  it('offers the browser install prompt when installation is available', async () => {
    const user = userEvent.setup()
    const prompt = vi.fn().mockResolvedValue(undefined)
    const event = new Event('beforeinstallprompt')
    Object.assign(event, {
      prompt,
      userChoice: Promise.resolve({ outcome: 'accepted' }),
    })

    render(<InstallApp />)
    window.dispatchEvent(event)

    await user.click(await screen.findByRole('button', { name: /install/i }))

    expect(prompt).toHaveBeenCalledOnce()
    expect(screen.queryByRole('button', { name: /install/i })).not.toBeInTheDocument()
  })
})
