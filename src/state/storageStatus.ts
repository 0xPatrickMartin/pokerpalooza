import { useSyncExternalStore } from 'react'

let chipsSaveFailed = false
const listeners = new Set<() => void>()

export function setChipsSaveFailed(failed: boolean): void {
  if (failed === chipsSaveFailed) return
  chipsSaveFailed = failed
  for (const listener of listeners) listener()
}

/** True when the last attempt to save chip photos hit the browser's storage limit. */
export function useChipsSaveFailed(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      listeners.add(onChange)
      return () => listeners.delete(onChange)
    },
    () => chipsSaveFailed,
  )
}
