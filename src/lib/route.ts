import { useSyncExternalStore } from 'react'

const subscribe = (listener: () => void) => {
  window.addEventListener('popstate', listener)
  return () => window.removeEventListener('popstate', listener)
}

export function usePathname(): string {
  return useSyncExternalStore(subscribe, () => location.pathname)
}

export function navigate(path: string): void {
  if (location.pathname === path) return
  history.pushState(null, '', path)
  window.dispatchEvent(new PopStateEvent('popstate'))
}
