import { describe, expect, it } from 'vitest'
import { defaultState, DEFAULT_STRUCTURE } from './defaults'
import { reducer, type Action } from './reducer'
import { canRebuy, finishingPlaces, payoutAmounts, remainingMs, totals } from './selectors'
import type { AppState, GameConfig } from './types'

const MIN = 60_000

function config(overrides: Partial<GameConfig> = {}): GameConfig {
  return {
    ...defaultState().setup.config,
    levelMinutes: 20,
    levels: [
      { id: 'l1', kind: 'blinds', small: 25, big: 50, ante: 0 },
      { id: 'l2', kind: 'blinds', small: 50, big: 100, ante: 0 },
      { id: 'b1', kind: 'break', minutes: 10 },
      { id: 'l3', kind: 'blinds', small: 100, big: 200, ante: 0 },
    ],
    ...overrides,
  }
}

function started(cfg = config(), names = ['Doc', 'Wyatt', 'Jane']): AppState {
  return reducer(defaultState(), { type: 'game/start', config: cfg, structure: DEFAULT_STRUCTURE, names, now: 0 })
}

function run(state: AppState, ...actions: Action[]): AppState {
  return actions.reduce(reducer, state)
}

describe('level timer', () => {
  it('starts a game on level 1, ready but not running', () => {
    const { game } = started()
    expect(game?.levelIndex).toBe(0)
    expect(game?.timer).toEqual({ status: 'ready', remainingMs: 20 * MIN, endsAt: null })
  })

  it('counts down from the wall clock and pauses with the time left', () => {
    let s = run(started(), { type: 'timer/start', now: 1000 })
    expect(remainingMs(s.game!, 1000 + 5 * MIN)).toBe(15 * MIN)
    s = run(s, { type: 'timer/pause', now: 1000 + 5 * MIN })
    expect(s.game?.timer).toEqual({ status: 'paused', remainingMs: 15 * MIN, endsAt: null })
    // Time passing while paused doesn't count.
    expect(remainingMs(s.game!, 1000 + 60 * MIN)).toBe(15 * MIN)
  })

  it('advances to the next level when time runs out, sounds the alarm, and does not auto-restart', () => {
    const s = run(started(), { type: 'timer/start', now: 0 }, { type: 'timer/tick', now: 20 * MIN })
    expect(s.game?.levelIndex).toBe(1)
    expect(s.game?.timer).toEqual({ status: 'ready', remainingMs: 20 * MIN, endsAt: null })
    expect(s.game?.alarm).toMatchObject({ seq: 1, active: true, fromIndex: 0, toIndex: 1 })
    expect(s.game?.playedMs).toBe(20 * MIN)
  })

  it('ignores ticks before the deadline', () => {
    const before = run(started(), { type: 'timer/start', now: 0 })
    const after = run(before, { type: 'timer/tick', now: 20 * MIN - 1 })
    expect(after).toBe(before)
  })

  it('uses the break length for break levels', () => {
    const s = run(
      started(),
      { type: 'level/goto', index: 1, now: 0 },
      { type: 'timer/start', now: 0 },
      { type: 'timer/tick', now: 20 * MIN },
    )
    expect(s.game?.config.levels[s.game.levelIndex].kind).toBe('break')
    expect(s.game?.timer.remainingMs).toBe(10 * MIN)
  })

  it('stays on the final level when it runs out', () => {
    const s = run(
      started(),
      { type: 'level/goto', index: 3, now: 0 },
      { type: 'timer/start', now: 0 },
      { type: 'timer/tick', now: 20 * MIN },
    )
    expect(s.game?.levelIndex).toBe(3)
    expect(s.game?.alarm).toMatchObject({ active: true, fromIndex: 3, toIndex: 3 })
    expect(s.game?.timer.status).toBe('ready')
  })

  it('starting the next level dismisses the alarm', () => {
    const s = run(
      started(),
      { type: 'timer/start', now: 0 },
      { type: 'timer/tick', now: 20 * MIN },
      { type: 'timer/start', now: 21 * MIN },
    )
    expect(s.game?.alarm.active).toBe(false)
    expect(s.game?.timer).toMatchObject({ status: 'running', endsAt: 41 * MIN })
  })

  it('adds and removes minutes while running or paused', () => {
    let s = run(started(), { type: 'timer/start', now: 0 }, { type: 'timer/adjust', deltaMs: MIN, now: 0 })
    expect(remainingMs(s.game!, 0)).toBe(21 * MIN)
    s = run(s, { type: 'timer/pause', now: 0 }, { type: 'timer/adjust', deltaMs: -30 * MIN, now: 0 })
    expect(s.game?.timer.remainingMs).toBe(0)
  })

  it('keeps running when skipping levels mid-run', () => {
    const s = run(started(), { type: 'timer/start', now: 0 }, { type: 'level/goto', index: 1, now: 5 * MIN })
    expect(s.game?.levelIndex).toBe(1)
    expect(s.game?.timer).toMatchObject({ status: 'running', endsAt: 25 * MIN })
  })
})

describe('players and money', () => {
  it('tracks the pot, rebuys and average stack', () => {
    const cfg = config({ buyIn: 20, startingStack: 10_000, rebuys: { enabled: true, cost: 10, chips: 5000, maxPerPlayer: 1, untilLevel: 2 } })
    let s = started(cfg)
    const doc = s.game!.players[0]
    s = run(s, { type: 'player/bust', id: doc.id, now: 5 }, { type: 'player/rebuy', id: doc.id })
    const t = totals(s.game!)
    expect(t).toMatchObject({ entries: 3, rebuys: 1, alive: 3, pot: 70, chipsInPlay: 35_000 })
    expect(s.game!.players[0].bustedAt).toBeNull()
    // One rebuy max
    expect(canRebuy(s.game!, s.game!.players[0])).toBe(false)
    expect(canRebuy(s.game!, s.game!.players[1])).toBe(true)
  })

  it('closes rebuys after the cutoff level (breaks count as the level before them)', () => {
    const cfg = config({ rebuys: { enabled: true, cost: null, chips: null, maxPerPlayer: null, untilLevel: 2 } })
    const s = started(cfg)
    const player = s.game!.players[0]
    expect(canRebuy(run(s, { type: 'level/goto', index: 2, now: 0 }).game!, player)).toBe(true)
    expect(canRebuy(run(s, { type: 'level/goto', index: 3, now: 0 }).game!, player)).toBe(false)
  })

  it('assigns finishing places in elimination order', () => {
    let s = started(config(), ['A', 'B', 'C', 'D'])
    const [a, b, c] = s.game!.players
    s = run(s, { type: 'player/bust', id: c.id, now: 1 }, { type: 'player/bust', id: a.id, now: 2 }, { type: 'player/bust', id: b.id, now: 3 })
    const places = finishingPlaces(s.game!.players)
    expect([places.get(c.id), places.get(a.id), places.get(b.id)]).toEqual([4, 3, 2])
  })

  it('splits payouts in whole dollars, giving leftovers to first place', () => {
    expect(payoutAmounts(170, [50, 30, 20])).toEqual([85, 51, 34])
    expect(payoutAmounts(100, [65, 35])).toEqual([65, 35])
    expect(payoutAmounts(110, [50, 30, 20])).toEqual([55, 33, 22])
    expect(payoutAmounts(95, [40, 30, 20, 10])).toEqual([39, 28, 19, 9])
  })
})

describe('editing mid-game', () => {
  it('keeps the current level when earlier levels are removed', () => {
    let s = run(started(), { type: 'level/goto', index: 3, now: 0 })
    const levels = s.game!.config.levels.filter((l) => l.id !== 'l1')
    s = run(s, { type: 'game/updateConfig', config: { ...s.game!.config, levels } })
    expect(s.game!.config.levels[s.game!.levelIndex].id).toBe('l3')
  })

  it('applies a new level length to a level that has not started', () => {
    const s = run(started(), { type: 'game/updateConfig', config: config({ levelMinutes: 15 }) })
    expect(s.game!.timer.remainingMs).toBe(15 * MIN)
  })
})
