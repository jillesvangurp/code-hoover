import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useAccountSync } from './useAccountSync'

afterEach(() => vi.unstubAllGlobals())

describe('useAccountSync', () => {
  it('preserves local codes and requests sign-in again when the session expires', async () => {
    localStorage.setItem('account-session', JSON.stringify({
      token: 't'.repeat(43),
      email: 'user@example.com',
      cryptoVersion: 2,
    }))
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401,
      headers: { 'content-type': 'application/json' },
    })))
    const codes = [{
      name: 'Local code',
      text: 'local-only',
      data: { type: 'qr.QrData.Text' as const, text: 'local-only' },
    }]
    const setCodes = vi.fn()
    const { result } = renderHook(() => useAccountSync(codes, setCodes))

    await act(async () => {
      await expect(result.current.uploadNow()).rejects.toThrow('Account sync failed')
    })

    await waitFor(() => expect(result.current.signedIn).toBe(false))
    expect(result.current.status).toEqual({ state: 'error', messageId: 'default-account-sync-sign-in-again' })
    expect(setCodes).not.toHaveBeenCalled()
    expect(localStorage.getItem('codes')).toBeNull()
  })
})
