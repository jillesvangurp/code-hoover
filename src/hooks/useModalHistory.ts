import { useEffect } from 'react'

export function useModalHistory(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return
    window.history.pushState({ codeHooverModal: true }, '')
    const onPopState = () => onClose()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
        window.history.back()
      }
    }
    window.addEventListener('popstate', onPopState)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('popstate', onPopState)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open, onClose])
}
