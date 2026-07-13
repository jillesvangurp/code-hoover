interface CarouselCardBounds {
  offsetLeft: number
  offsetWidth: number
}

export function activeExampleIndex(scrollLeft: number, clientWidth: number, scrollWidth: number, cards: CarouselCardBounds[]): number {
  if (cards.length === 0 || scrollLeft <= 1) return 0

  const maxScrollLeft = Math.max(0, scrollWidth - clientWidth)
  if (maxScrollLeft - scrollLeft <= 1) return cards.length - 1

  const center = scrollLeft + clientWidth / 2
  return cards.reduce((bestIndex, card, index) => {
    const cardCenter = card.offsetLeft + card.offsetWidth / 2
    const bestCard = cards[bestIndex]
    const bestCenter = bestCard.offsetLeft + bestCard.offsetWidth / 2
    return Math.abs(cardCenter - center) < Math.abs(bestCenter - center) ? index : bestIndex
  }, 0)
}
