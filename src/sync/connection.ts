import { uid } from '../lib/id'
import { reducer, type Action } from '../state/reducer'
import type { TableId, TableState } from '../state/types'
import { serverNow, syncClock } from './clock'

export type ConnectionStatus = 'connecting' | 'live' | 'offline'

export interface TableSnapshot {
  /** The server's state with this device's unconfirmed actions applied on top, so taps feel instant */
  state: TableState | null
  status: ConnectionStatus
  viewerOrigin: string | null
}

interface Pending {
  seq: number
  action: Action
  sent: boolean
}

interface SnapshotEvent {
  state: TableState
  rev: number
  ack: number
  viewerOrigin: string
}

interface UpdateEvent {
  rev: number
  patch: Partial<TableState>
  by: string
  seq: number
}

/** One id per page load; the server uses it to skip actions it already applied when we retry. */
const CLIENT_ID = uid() + uid()
// nginx-proxy turns away request bodies over 1 MB, and chip photos are big.
const MAX_BATCH_CHARS = 400_000

/** Keeps one table in sync with the server: a live event stream in, queued actions out. */
export class TableConnection {
  readonly table: TableId
  private confirmed: TableState | null = null
  private rev = 0
  private viewerOrigin: string | null = null
  private pending: Pending[] = []
  private seq = 0
  private streamOk = false
  private postOk = true
  private sending = false
  private failures = 0
  private stopped = true
  private source: EventSource | null = null
  private retryTimer: ReturnType<typeof setTimeout> | undefined
  private reconnectTimer: ReturnType<typeof setTimeout> | undefined
  private clockTimer: ReturnType<typeof setInterval> | undefined
  private readonly listeners = new Set<() => void>()
  private snapshot: TableSnapshot = { state: null, status: 'connecting', viewerOrigin: null }

  constructor(table: TableId) {
    this.table = table
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  getSnapshot = (): TableSnapshot => this.snapshot

  dispatch = (action: Action): void => {
    const stamped = 'now' in action ? { ...action, now: serverNow() } : action
    this.pending.push({ seq: ++this.seq, action: stamped, sent: false })
    this.emit()
    void this.flush()
  }

  start(): void {
    this.stopped = false
    this.connect()
    void syncClock()
    this.clockTimer = setInterval(() => void syncClock(1), 5 * 60_000)
    document.addEventListener('visibilitychange', this.onVisible)
  }

  stop(): void {
    this.stopped = true
    this.source?.close()
    this.source = null
    clearTimeout(this.retryTimer)
    clearTimeout(this.reconnectTimer)
    clearInterval(this.clockTimer)
    document.removeEventListener('visibilitychange', this.onVisible)
  }

  // Phones freeze background tabs; pick back up as soon as the screen is looked at again.
  private onVisible = () => {
    if (document.visibilityState !== 'visible' || this.stopped) return
    if (!this.source || this.source.readyState === EventSource.CLOSED) this.connect()
    void syncClock(1)
    void this.flush()
  }

  private connect(): void {
    if (this.stopped) return
    this.source?.close()
    const source = new EventSource(`/api/tables/${this.table}/stream?client=${CLIENT_ID}`)
    this.source = source
    source.addEventListener('snapshot', (e) => this.onSnapshot(JSON.parse((e as MessageEvent<string>).data)))
    source.addEventListener('update', (e) => this.onUpdate(JSON.parse((e as MessageEvent<string>).data)))
    source.onerror = () => {
      this.streamOk = false
      this.emit()
      // Browsers retry dropped streams themselves but give up after an HTTP error (e.g. 502 during a redeploy).
      if (source.readyState === EventSource.CLOSED) {
        clearTimeout(this.reconnectTimer)
        this.reconnectTimer = setTimeout(() => this.connect(), 3000)
      }
    }
  }

  private onSnapshot(data: SnapshotEvent): void {
    this.confirmed = data.state
    this.rev = data.rev
    this.viewerOrigin = data.viewerOrigin
    // Whatever the server already applied is done; send the rest again (it skips duplicates).
    this.pending = this.pending.filter((p) => p.seq > data.ack).map((p) => ({ ...p, sent: false }))
    this.streamOk = true
    this.emit()
    void this.flush()
  }

  private onUpdate(data: UpdateEvent): void {
    if (!this.confirmed) return
    const hasPatch = Object.keys(data.patch).length > 0
    if (hasPatch) {
      if (data.rev !== this.rev + 1) {
        // Missed an update somewhere; start over from a fresh snapshot.
        this.connect()
        return
      }
      this.confirmed = { ...this.confirmed, ...data.patch }
      this.rev = data.rev
    }
    if (data.by === CLIENT_ID) this.pending = this.pending.filter((p) => p.seq > data.seq)
    this.emit()
  }

  private async flush(): Promise<void> {
    if (this.sending || this.stopped) return
    const batch: Pending[] = []
    let size = 0
    for (const p of this.pending) {
      if (p.sent) continue
      const chars = JSON.stringify(p.action).length
      if (batch.length > 0 && size + chars > MAX_BATCH_CHARS) break
      batch.push(p)
      size += chars
    }
    if (batch.length === 0) return

    this.sending = true
    try {
      const res = await fetch(`/api/tables/${this.table}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client: CLIENT_ID, actions: batch.map(({ seq, action }) => ({ seq, action })) }),
      })
      if (res.status === 400 || res.status === 413) {
        // The server will never accept these, so retrying would block everything queued behind them.
        const rejected = new Set(batch)
        this.pending = this.pending.filter((p) => !rejected.has(p))
      } else if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      } else {
        for (const p of batch) p.sent = true
      }
      this.failures = 0
      this.postOk = true
    } catch {
      this.failures++
      this.postOk = false
      clearTimeout(this.retryTimer)
      this.retryTimer = setTimeout(() => void this.flush(), Math.min(10_000, 500 * 2 ** this.failures))
    } finally {
      this.sending = false
      this.emit()
    }
    if (this.postOk) void this.flush()
  }

  private emit(): void {
    let state = this.confirmed
    if (state) {
      for (const p of this.pending) {
        try {
          state = reducer(state, p.action)
        } catch {
          // The server will reject it too; show the confirmed state instead.
        }
      }
    }
    const status: ConnectionStatus = !this.confirmed ? 'connecting' : this.streamOk && this.postOk ? 'live' : 'offline'
    this.snapshot = { state, status, viewerOrigin: this.viewerOrigin }
    for (const listener of this.listeners) listener()
  }
}
