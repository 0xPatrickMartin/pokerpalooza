import { randomInt } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { defaultTableState } from '../state/defaults'
import { isAction, reducer, type Action } from '../state/reducer'
import { blindLevelNumber } from '../state/structure'
import { TABLES, type TableSummary } from '../state/tables'
import type { TableId, TableState } from '../state/types'
import { CODE_LENGTH, viewerSnapshot } from '../state/viewer'
import { isValidTableState } from './validate'

const SLICES = ['game', 'chips', 'setup'] as const
type Slice = (typeof SLICES)[number]

// No 0/O or 1/I, so codes read cleanly off a TV across the room.
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

// Clients stamp actions with their estimate of server time. Anything arriving live uses the
// server's own clock, so a device with a bad clock can't shorten a level; a stamp well in the past
// means the action waited in an offline queue, and keeping it preserves when it really happened.
const QUEUED_AFTER_MS = 3_000
const MAX_QUEUED_MS = 10 * 60_000

const ACK_TTL_MS = 24 * 60 * 60_000

export interface Subscriber {
  send(event: string, data: unknown): void
  close(): void
}

export interface QueuedAction {
  seq: number
  action: Action
}

export interface HostSnapshot {
  state: TableState
  rev: number
  /** Last action seq applied for this client, so it can drop those from its queue */
  ack: number
  serverTime: number
}

export interface HostUpdate {
  rev: number
  patch: Partial<TableState>
  /** Client id whose actions caused this update, or "server" */
  by: string
  seq: number
  serverTime: number
}

interface Table {
  id: TableId
  state: TableState
  rev: number
  acks: Map<string, { seq: number; at: number }>
  hosts: Set<Subscriber>
  expiry?: ReturnType<typeof setTimeout>
}

export class TableManager {
  private readonly dataDir: string
  private readonly tables = new Map<TableId, Table>()
  private readonly viewers = new Map<string, Set<Subscriber>>()
  private readonly lastViewerJson = new Map<string, string>()

  constructor(dataDir: string) {
    this.dataDir = dataDir
    for (const { id } of TABLES) {
      const table: Table = { id, state: this.load(id), rev: 1, acks: new Map(), hosts: new Set() }
      this.tables.set(id, table)
      this.scheduleExpiry(table)
    }
  }

  hostSnapshot(id: TableId, clientId: string): HostSnapshot {
    const t = this.table(id)
    return { state: t.state, rev: t.rev, ack: t.acks.get(clientId)?.seq ?? 0, serverTime: Date.now() }
  }

  addHost(id: TableId, sub: Subscriber): () => void {
    const t = this.table(id)
    t.hosts.add(sub)
    return () => t.hosts.delete(sub)
  }

  /** Applies a client's queued actions in order, skipping any it already sent (retries). */
  apply(id: TableId, clientId: string, items: unknown[]): void {
    const t = this.table(id)
    const now = Date.now()
    let state = t.state
    let last = t.acks.get(clientId)?.seq ?? 0
    for (const item of items) {
      const { seq, action } = (item ?? {}) as Partial<QueuedAction>
      if (!Number.isInteger(seq) || (seq as number) <= last) continue
      last = seq as number
      if (!isAction(action)) continue
      const prepared = this.prepare(action, state, now)
      if (!prepared) continue
      try {
        const next = reducer(state, prepared)
        if (next !== state && isValidTableState(next)) state = next
      } catch (err) {
        console.warn(`[${id}] ignored ${action.type}:`, err)
      }
    }
    t.acks.set(clientId, { seq: last, at: now })
    this.pruneAcks(t, now)
    this.commit(t, state, clientId, last)
  }

  addViewer(code: string, sub: Subscriber): (() => void) | null {
    const t = this.findByCode(code)
    if (!t) return null
    let subs = this.viewers.get(code)
    if (!subs) this.viewers.set(code, (subs = new Set()))
    subs.add(sub)
    sub.send('snapshot', viewerSnapshot(t.id, t.state))
    return () => {
      subs.delete(sub)
      if (subs.size === 0) {
        this.viewers.delete(code)
        this.lastViewerJson.delete(code)
      }
    }
  }

  findByCode(code: string): Table | null {
    for (const t of this.tables.values()) if (t.state.game?.code === code) return t
    return null
  }

  summary(): TableSummary[] {
    return TABLES.map(({ id }) => {
      const { game, setup } = this.table(id).state
      if (!game) {
        return { id, title: setup.config.title, status: 'idle', levelLabel: null, timer: null, alive: 0, entries: 0 }
      }
      const levels = game.config.levels
      return {
        id,
        title: game.config.title,
        status: game.timer.status,
        levelLabel:
          levels[game.levelIndex]?.kind === 'break' ? 'Break' : `Level ${blindLevelNumber(levels, game.levelIndex)}`,
        timer: game.timer,
        alive: game.players.filter((p) => p.bustedAt == null).length,
        entries: game.players.length,
      }
    })
  }

  dispose(): void {
    for (const t of this.tables.values()) {
      clearTimeout(t.expiry)
      for (const sub of t.hosts) sub.close()
    }
    for (const subs of this.viewers.values()) for (const sub of subs) sub.close()
  }

  private table(id: TableId): Table {
    const t = this.tables.get(id)
    if (!t) throw new Error(`Unknown table ${id}`)
    return t
  }

  private prepare(action: Action, state: TableState, now: number): Action | null {
    let a = action
    if ('now' in a) {
      const stamp = typeof a.now === 'number' && Number.isFinite(a.now) ? a.now : now
      // Only the server decides when a level has run out.
      const queued = a.type !== 'timer/tick' && stamp < now - QUEUED_AFTER_MS
      a = { ...a, now: queued ? Math.max(stamp, now - MAX_QUEUED_MS) : now }
    }
    if (a.type === 'game/start') {
      // One game per table: a second device pressing "Deal 'em in" mustn't replace a running game.
      if (state.game) return null
      a = { ...a, code: this.newCode() }
    }
    return a
  }

  private commit(t: Table, next: TableState, by: string, seq: number): void {
    const before = t.state
    const patch: Partial<Record<Slice, unknown>> = {}
    for (const slice of SLICES) if (next[slice] !== before[slice]) patch[slice] = next[slice]
    const changed = Object.keys(patch) as Slice[]
    if (changed.length > 0) {
      t.state = next
      t.rev++
      for (const slice of changed) this.persist(t.id, slice, next[slice])
    }
    const update: HostUpdate = { rev: t.rev, patch: patch as Partial<TableState>, by, seq, serverTime: Date.now() }
    for (const sub of t.hosts) sub.send('update', update)
    if (changed.includes('game') || changed.includes('chips')) this.notifyViewers(t, before)
    this.scheduleExpiry(t)
  }

  private notifyViewers(t: Table, before: TableState): void {
    const oldCode = before.game?.code
    const code = t.state.game?.code
    if (oldCode && oldCode !== code) {
      for (const sub of this.viewers.get(oldCode) ?? []) {
        sub.send('ended', {})
        sub.close()
      }
      this.viewers.delete(oldCode)
      this.lastViewerJson.delete(oldCode)
    }
    const subs = code ? this.viewers.get(code) : undefined
    if (!code || !subs?.size) return
    const snapshot = viewerSnapshot(t.id, t.state)
    const json = JSON.stringify(snapshot)
    if (this.lastViewerJson.get(code) === json) return
    this.lastViewerJson.set(code, json)
    for (const sub of subs) sub.send('snapshot', snapshot)
  }

  /** The server ends levels itself, so the clock advances even with no screens open. */
  private scheduleExpiry(t: Table): void {
    clearTimeout(t.expiry)
    const timer = t.state.game?.timer
    if (timer?.status !== 'running' || timer.endsAt == null) return
    const delay = Math.min(Math.max(0, timer.endsAt - Date.now()), 2_000_000_000)
    t.expiry = setTimeout(() => {
      const next = reducer(t.state, { type: 'timer/tick', now: Date.now() })
      if (next === t.state) this.scheduleExpiry(t)
      else this.commit(t, next, 'server', 0)
    }, delay)
  }

  private newCode(): string {
    const taken = new Set([...this.tables.values()].map((t) => t.state.game?.code))
    for (;;) {
      let code = ''
      for (let i = 0; i < CODE_LENGTH; i++) code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]
      if (!taken.has(code)) return code
    }
  }

  private pruneAcks(t: Table, now: number): void {
    if (t.acks.size < 200) return
    for (const [client, ack] of t.acks) if (now - ack.at > ACK_TTL_MS) t.acks.delete(client)
  }

  private file(id: TableId, slice: Slice): string {
    return path.join(this.dataDir, id, `${slice}.json`)
  }

  private persist(id: TableId, slice: Slice, value: unknown): void {
    const file = this.file(id, slice)
    try {
      fs.mkdirSync(path.dirname(file), { recursive: true })
      fs.writeFileSync(`${file}.tmp`, JSON.stringify(value))
      fs.renameSync(`${file}.tmp`, file)
    } catch (err) {
      console.error(`Could not save ${file}:`, err)
    }
  }

  private load(id: TableId): TableState {
    let state = defaultTableState()
    for (const slice of SLICES) {
      let value: unknown
      try {
        value = JSON.parse(fs.readFileSync(this.file(id, slice), 'utf8'))
      } catch {
        continue
      }
      if (slice === 'setup') value = mergeSetup(state.setup, value)
      const candidate = { ...state, [slice]: value }
      if (isValidTableState(candidate)) state = candidate
      else console.warn(`Ignoring unreadable ${this.file(id, slice)}`)
    }
    return state
  }
}

/** Fills in fields added since a setup file was saved. */
function mergeSetup(defaults: TableState['setup'], saved: unknown): unknown {
  if (typeof saved !== 'object' || saved === null) return saved
  const s = saved as Partial<TableState['setup']>
  return {
    config: { ...defaults.config, ...s.config, rebuys: { ...defaults.config.rebuys, ...s.config?.rebuys } },
    structure: { ...defaults.structure, ...s.structure },
    playerNames: Array.isArray(s.playerNames) ? s.playerNames : [],
  }
}
