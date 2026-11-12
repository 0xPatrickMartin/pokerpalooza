import { useEffect, useLayoutEffect, useRef } from 'react'

// Timers inside a worker aren't throttled when the tab is hidden, so the alarm still fires on time
// if someone switches tabs mid-level.
const WORKER_SOURCE =
  'let id=0;onmessage=e=>{clearInterval(id);if(e.data>0)id=setInterval(()=>postMessage(0),e.data)}'

export function useTicker(active: boolean, intervalMs: number, onTick: () => void): void {
  const callback = useRef(onTick)
  useLayoutEffect(() => {
    callback.current = onTick
  })

  useEffect(() => {
    if (!active) return
    const tick = () => callback.current()
    let worker: Worker | null = null
    let workerUrl: string | null = null
    let fallback: number | undefined

    try {
      workerUrl = URL.createObjectURL(new Blob([WORKER_SOURCE], { type: 'text/javascript' }))
      worker = new Worker(workerUrl)
      worker.onmessage = tick
      worker.postMessage(intervalMs)
    } catch {
      fallback = window.setInterval(tick, intervalMs)
    }

    const onVisible = () => {
      if (document.visibilityState === 'visible') tick()
    }
    document.addEventListener('visibilitychange', onVisible)
    tick()

    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      worker?.terminate()
      if (workerUrl) URL.revokeObjectURL(workerUrl)
      window.clearInterval(fallback)
    }
  }, [active, intervalMs])
}
