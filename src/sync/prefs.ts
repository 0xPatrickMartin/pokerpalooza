import { useSyncExternalStore } from 'react'
import { DEFAULT_PREFS } from '../state/defaults'
import type { Prefs } from '../state/types'

// Same key as before 3.0, so devices keep the alarm settings they already had.
const KEY = 'pokerpalooza.prefs.v1'
const listeners = new Set<() => void>()
let prefs = read()

function read(): Prefs {
  try {
    return { ...DEFAULT_PREFS, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') }
  } catch {
    return { ...DEFAULT_PREFS }
  }
}

export function setPrefs(patch: Partial<Prefs>): void {
  prefs = { ...prefs, ...patch }
  try {
    localStorage.setItem(KEY, JSON.stringify(prefs))
  } catch {
    // Private browsing can refuse storage; the setting still applies until the page closes.
  }
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  const onStorage = (e: StorageEvent) => {
    if (e.key !== KEY) return
    prefs = read()
    listener()
  }
  window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('storage', onStorage)
  }
}

/** Alarm sound, volume and mute for this device only. */
export function usePrefs(): [Prefs, (patch: Partial<Prefs>) => void] {
  return [useSyncExternalStore(subscribe, () => prefs), setPrefs]
}
