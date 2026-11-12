import { useEffect, useState } from 'react'

const EVENTS = ['pointermove', 'pointerdown', 'keydown', 'wheel', 'touchstart'] as const

/** True after `ms` without mouse, touch or keyboard activity, while `enabled`. */
export function useIdle(ms: number, enabled = true): boolean {
  const [idle, setIdle] = useState(false)

  useEffect(() => {
    let timer: number | undefined
    const arm = () => {
      window.clearTimeout(timer)
      if (enabled) timer = window.setTimeout(() => setIdle(true), ms)
    }
    // Activity always counts, even while disabled, so re-enabling never starts out idle.
    const wake = () => {
      setIdle(false)
      arm()
    }
    arm()
    for (const e of EVENTS) window.addEventListener(e, wake, { passive: true })
    return () => {
      window.clearTimeout(timer)
      for (const e of EVENTS) window.removeEventListener(e, wake)
    }
  }, [ms, enabled])

  return enabled && idle
}
