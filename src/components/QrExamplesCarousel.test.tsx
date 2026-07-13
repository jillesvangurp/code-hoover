import { describe, expect, it } from 'vitest'
import { activeExampleIndex } from './carouselActiveIndex'

const cards = Array.from({ length: 15 }, (_, index) => ({
  offsetLeft: index * 332,
  offsetWidth: 320,
}))

describe('example carousel pips', () => {
  it('selects the final pip when the carousel reaches its scroll limit', () => {
    const clientWidth = 720
    const scrollWidth = 15 * 320 + 14 * 12
    const maxScrollLeft = scrollWidth - clientWidth

    expect(activeExampleIndex(maxScrollLeft, clientWidth, scrollWidth, cards)).toBe(14)
  })

  it('still follows the nearest card while scrolling through the middle', () => {
    expect(activeExampleIndex(1300, 720, 4968, cards)).toBe(5)
  })

  it('keeps the first pip selected at the start', () => {
    expect(activeExampleIndex(0, 720, 4968, cards)).toBe(0)
  })
})
