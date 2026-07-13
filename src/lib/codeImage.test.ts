import { describe, expect, it } from 'vitest'
import { codeImageFilename } from './codeImage'

describe('codeImageFilename', () => {
  it('creates a safe PNG filename from the code name', () => {
    expect(codeImageFilename('Café / Guest Wi-Fi')).toBe('cafe-guest-wi-fi.png')
  })

  it('uses a useful fallback for names without filename characters', () => {
    expect(codeImageFilename('✨')).toBe('code.png')
  })
})
