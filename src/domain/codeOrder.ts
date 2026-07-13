import { arrayMove } from '@dnd-kit/sortable'
import type { SavedQrCode } from './qr'

export function reorderDisplayedCodes(records: Array<{ id: string; code: SavedQrCode }>, activeId: string | number, overId: string | number): SavedQrCode[] | null {
  const activeIndex = records.findIndex(({ id }) => id === activeId)
  const overIndex = records.findIndex(({ id }) => id === overId)
  if (activeIndex < 0 || overIndex < 0 || activeIndex === overIndex) return null
  return arrayMove(records, activeIndex, overIndex).map(({ code }) => code)
}
