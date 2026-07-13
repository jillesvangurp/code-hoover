import { useEffect, useState } from 'react'

export function useLocalStorage<T>(key: string, initialValue: T, parse: (value: string) => T, serialize: (value: T) => string = JSON.stringify): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    const saved = localStorage.getItem(key)
    if (saved === null) return initialValue
    try {
      return parse(saved)
    } catch {
      return initialValue
    }
  })

  useEffect(() => {
    localStorage.setItem(key, serialize(value))
  }, [key, serialize, value])

  return [value, setValue]
}
