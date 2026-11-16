import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_STRUCTURE, defaultTableState } from '../state/defaults'
import type { Action } from '../state/reducer'
import type { GameConfig } from '../state/types'
import { TableManager, type Subscriber } from './tables'

const MIN = 60_000

function config(): GameConfig {
  return {
    ...defaultTableState().setup.config,
    levelMinutes: 20,
    levels: [
      { id: 'l1', kind: 'blinds', small: 25, big: 50, ante: 0 },
      { id: 'l2', kind: 'blinds', small: 50, big: 100, ante: 0 },
    ],
  }
}

const start = (now = Date.now()): Action => ({
  type: 'game/start',
  config: config(),
  structure: DEFAULT_STRUCTURE,
  players: [
    { id: 'p1', name: 'Doc' },
    { id: 'p2', name: 'Wyatt' },
  ],
  gameId: 'g1',
  code: '',
  now,
})

function recorder(): Subscriber & { events: { event: string; data: unknown }[]; closed: boolean } {
  return {
    events: [],
    closed: false,
    send(event, data) {
      this.events.push({ event, data })
    },
    close() {
      this.closed = true
    },
  }
}

let dir: string
let tables: TableManager

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pokerpalooza-'))
  tables = new TableManager(dir)
})

afterEach(() => {
  tables.dispose()
  vi.useRealTimers()
  fs.rmSync(dir, { recursive: true, force: true })
})

describe('TableManager', () => {
  it('gives each new game a 6-character code and keeps tables separate', () => {
    tables.apply('spades', 'tv', [{ seq: 1, action: start() }])
    tables.apply('hearts', 'tv', [{ seq: 1, action: start() }])
    const spades = tables.hostSnapshot('spades', 'tv').state.game!
    const hearts = tables.hostSnapshot('hearts', 'tv').state.game!
    expect(spades.code).toMatch(/^[A-Z2-9]{6}$/)
    expect(hearts.code).not.toBe(spades.code)
    expect(tables.hostSnapshot('clubs', 'tv').state.game).toBeNull()
  })

  it("won't let a second device replace a running game", () => {
    tables.apply('spades', 'tv', [{ seq: 1, action: start() }])
    const code = tables.hostSnapshot('spades', 'tv').state.game!.code
    tables.apply('spades', 'phone', [{ seq: 1, action: { ...start(), gameId: 'g2' } }])
    expect(tables.hostSnapshot('spades', 'tv').state.game).toMatchObject({ id: 'g1', code })
  })

  it('ignores actions a client sends twice (retries after a dropped connection)', () => {
    const rebuy: Action = { type: 'player/rebuy', id: 'p1' }
    tables.apply('spades', 'tv', [{ seq: 1, action: start() }, { seq: 2, action: rebuy }])
    tables.apply('spades', 'tv', [{ seq: 2, action: rebuy }, { seq: 3, action: rebuy }])
    expect(tables.hostSnapshot('spades', 'tv').state.game!.players[0].rebuys).toBe(2)
    expect(tables.hostSnapshot('spades', 'tv').ack).toBe(3)
  })

  it('ends a level on time with no screens connected, and waits for someone to press start', () => {
    vi.useFakeTimers()
    tables.apply('spades', 'tv', [
      { seq: 1, action: start() },
      { seq: 2, action: { type: 'timer/start', now: Date.now() } },
    ])
    vi.advanceTimersByTime(20 * MIN - 1)
    expect(tables.hostSnapshot('spades', 'tv').state.game!.levelIndex).toBe(0)
    vi.advanceTimersByTime(1)
    const game = tables.hostSnapshot('spades', 'tv').state.game!
    expect(game.levelIndex).toBe(1)
    expect(game.timer.status).toBe('ready')
    expect(game.alarm).toMatchObject({ seq: 1, active: true })
  })

  it('only lets the server decide a level is over', () => {
    tables.apply('spades', 'tv', [
      { seq: 1, action: start() },
      { seq: 2, action: { type: 'timer/start', now: Date.now() } },
      { seq: 3, action: { type: 'timer/tick', now: Date.now() + 30 * MIN } },
    ])
    expect(tables.hostSnapshot('spades', 'tv').state.game!.levelIndex).toBe(0)
  })

  it('times live actions by the server clock, so a device with a wrong clock can\'t shorten a level', () => {
    vi.useFakeTimers()
    const now = Date.now()
    tables.apply('spades', 'tv', [
      { seq: 1, action: start() },
      { seq: 2, action: { type: 'timer/start', now: now - 2_500 } },
    ])
    expect(tables.hostSnapshot('spades', 'tv').state.game!.timer.endsAt).toBe(now + 20 * MIN)
    tables.apply('spades', 'tv', [{ seq: 3, action: { type: 'timer/pause', now: now + 60 * MIN } }])
    expect(tables.hostSnapshot('spades', 'tv').state.game!.timer.remainingMs).toBe(20 * MIN)
  })

  it('keeps the original time of actions that waited in an offline queue', () => {
    vi.useFakeTimers()
    const now = Date.now()
    tables.apply('spades', 'tv', [
      { seq: 1, action: start() },
      { seq: 2, action: { type: 'timer/start', now: now - 30_000 } },
      { seq: 3, action: { type: 'timer/pause', now: now - 20_000 } },
    ])
    expect(tables.hostSnapshot('spades', 'tv').state.game!.timer.remainingMs).toBe(20 * MIN - 10_000)
  })

  it('rejects actions that would leave the table in a broken state', () => {
    tables.apply('spades', 'tv', [
      { seq: 1, action: { type: 'chips/set', chips: 'not a list' } as unknown as Action },
      { seq: 2, action: { type: 'nonsense' } as unknown as Action },
      { seq: 3, action: { type: 'chips/add', chip: { id: 'x', value: 50, label: '', color: '#000', image: 'javascript:alert(1)' } } },
    ])
    const chips = tables.hostSnapshot('spades', 'tv').state.chips
    expect(Array.isArray(chips)).toBe(true)
    expect(chips.some((c) => c.id === 'x')).toBe(false)
  })

  it('survives a restart', () => {
    tables.apply('diamonds', 'tv', [
      { seq: 1, action: start() },
      { seq: 2, action: { type: 'chips/update', id: tables.hostSnapshot('diamonds', 'tv').state.chips[0].id, patch: { label: 'Mint' } } },
    ])
    const { game, chips } = tables.hostSnapshot('diamonds', 'tv').state
    tables.dispose()
    tables = new TableManager(dir)
    const restored = tables.hostSnapshot('diamonds', 'tv').state
    expect(restored.game).toEqual(game)
    expect(restored.chips[0].label).toBe('Mint')
    expect(restored.chips).toEqual(chips)
  })

  it('tells every connected device about changes and who caused them', () => {
    const phone = recorder()
    tables.addHost('spades', phone)
    tables.apply('spades', 'tv', [{ seq: 7, action: start() }])
    expect(phone.events.at(-1)).toMatchObject({ event: 'update', data: { by: 'tv', seq: 7, rev: 2 } })
    expect((phone.events.at(-1)!.data as { patch: object }).patch).toHaveProperty('game')
  })

  it('shows players only the clock, blinds and chips, and closes their screen when the game ends', () => {
    tables.apply('clubs', 'tv', [{ seq: 1, action: start() }])
    const code = tables.hostSnapshot('clubs', 'tv').state.game!.code
    const viewer = recorder()
    expect(tables.addViewer(code, viewer)).toBeTypeOf('function')
    const snapshot = viewer.events[0].data as Record<string, unknown>
    expect(snapshot).toMatchObject({ table: 'clubs', code, current: { kind: 'blinds', small: 25, big: 50 } })
    expect(JSON.stringify(snapshot)).not.toContain('Wyatt')
    expect(snapshot).not.toHaveProperty('players')

    tables.apply('clubs', 'tv', [{ seq: 2, action: { type: 'game/end' } }])
    expect(viewer.events.at(-1)?.event).toBe('ended')
    expect(viewer.closed).toBe(true)
    expect(tables.addViewer(code, recorder())).toBeNull()
  })
})
