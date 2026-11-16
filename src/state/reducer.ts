import { levelDurationMs } from './structure'
import type { Chip, Game, GameConfig, SetupDraft, StructureOptions, TableState } from './types'

/**
 * Every device and the server run the same actions through this reducer, so it must be
 * deterministic: new ids and the game code arrive inside the action instead of being made up here.
 */
export type Action =
  | {
      type: 'game/start'
      config: GameConfig
      structure: StructureOptions
      players: { id: string; name: string }[]
      gameId: string
      /** Filled in by the server */
      code: string
      now: number
    }
  | { type: 'game/end' }
  | { type: 'game/updateConfig'; config: GameConfig }
  | { type: 'timer/start'; now: number }
  | { type: 'timer/pause'; now: number }
  | { type: 'timer/tick'; now: number }
  | { type: 'timer/adjust'; deltaMs: number; now: number }
  | { type: 'timer/reset'; now: number }
  | { type: 'level/goto'; index: number; now: number }
  | { type: 'alarm/dismiss' }
  | { type: 'player/add'; id: string; name: string }
  | { type: 'player/remove'; id: string }
  | { type: 'player/rename'; id: string; name: string }
  | { type: 'player/bust'; id: string; now: number }
  | { type: 'player/unbust'; id: string }
  | { type: 'player/rebuy'; id: string }
  | { type: 'player/unrebuy'; id: string }
  | { type: 'setup/update'; patch: Partial<SetupDraft> }
  | { type: 'chips/set'; chips: Chip[] }
  | { type: 'chips/add'; chip: Chip }
  | { type: 'chips/update'; id: string; patch: Partial<Omit<Chip, 'id'>> }
  | { type: 'chips/remove'; id: string }
  | { type: 'chips/sort' }

type GameAction = Exclude<Action, { type: 'game/start' | 'game/end' | 'setup/update' | `chips/${string}` }>

const ACTION_TYPES: Record<Action['type'], true> = {
  'game/start': true,
  'game/end': true,
  'game/updateConfig': true,
  'timer/start': true,
  'timer/pause': true,
  'timer/tick': true,
  'timer/adjust': true,
  'timer/reset': true,
  'level/goto': true,
  'alarm/dismiss': true,
  'player/add': true,
  'player/remove': true,
  'player/rename': true,
  'player/bust': true,
  'player/unbust': true,
  'player/rebuy': true,
  'player/unrebuy': true,
  'setup/update': true,
  'chips/set': true,
  'chips/add': true,
  'chips/update': true,
  'chips/remove': true,
  'chips/sort': true,
}

export function isAction(value: unknown): value is Action {
  const type = (value as { type?: unknown } | null)?.type
  return typeof type === 'string' && Object.hasOwn(ACTION_TYPES, type)
}

export function reducer(state: TableState, action: Action): TableState {
  switch (action.type) {
    case 'game/start': {
      const { config, structure, players, now, gameId, code } = action
      return {
        ...state,
        game: newGame(config, players, now, gameId, code),
        setup: { config, structure, playerNames: players.map((p) => p.name) },
      }
    }
    case 'game/end':
      return state.game ? { ...state, game: null } : state
    case 'setup/update':
      return { ...state, setup: { ...state.setup, ...action.patch } }
    case 'chips/set':
      return { ...state, chips: action.chips }
    case 'chips/add':
      return state.chips.some((c) => c.id === action.chip.id) ? state : { ...state, chips: [...state.chips, action.chip] }
    case 'chips/update':
      return {
        ...state,
        chips: state.chips.map((c) => (c.id === action.id ? { ...c, ...action.patch, id: c.id } : c)),
      }
    case 'chips/remove':
      return { ...state, chips: state.chips.filter((c) => c.id !== action.id) }
    case 'chips/sort':
      return { ...state, chips: [...state.chips].sort((a, b) => a.value - b.value) }
    default: {
      if (!state.game) return state
      const game = gameReducer(state.game, action)
      return game === state.game ? state : { ...state, game }
    }
  }
}

export function newGame(
  config: GameConfig,
  players: { id: string; name: string }[],
  now: number,
  id: string,
  code: string,
): Game {
  return {
    id,
    code,
    config,
    players: players.map(({ id, name }) => ({ id, name, rebuys: 0, bustedAt: null })),
    levelIndex: 0,
    timer: { status: 'ready', remainingMs: levelDurationMs(config, config.levels[0]), endsAt: null },
    alarm: { seq: 0, active: false, fromIndex: 0, toIndex: 0 },
    startedAt: now,
    playedMs: 0,
    runStartedAt: null,
  }
}

function stopRun(game: Game, at: number): Pick<Game, 'playedMs' | 'runStartedAt'> {
  const run = game.runStartedAt != null ? Math.max(0, at - game.runStartedAt) : 0
  return { playedMs: game.playedMs + run, runStartedAt: null }
}

function gotoLevel(game: Game, index: number, now: number, keepRunning: boolean): Game {
  const levels = game.config.levels
  const levelIndex = Math.min(Math.max(index, 0), levels.length - 1)
  const duration = levelDurationMs(game.config, levels[levelIndex])
  const alarm = { ...game.alarm, active: false }
  if (keepRunning && game.timer.status === 'running') {
    return {
      ...game,
      levelIndex,
      alarm,
      timer: { status: 'running', remainingMs: duration, endsAt: now + duration },
    }
  }
  return {
    ...game,
    ...stopRun(game, now),
    levelIndex,
    alarm,
    timer: { status: 'ready', remainingMs: duration, endsAt: null },
  }
}

function updatePlayer(game: Game, id: string, patch: (p: Game['players'][number]) => Partial<Game['players'][number]>): Game {
  return { ...game, players: game.players.map((p) => (p.id === id ? { ...p, ...patch(p) } : p)) }
}

function gameReducer(game: Game, action: GameAction): Game {
  switch (action.type) {
    case 'timer/start': {
      if (game.timer.status === 'running') return game
      const remaining = game.timer.remainingMs
      return {
        ...game,
        runStartedAt: action.now,
        alarm: { ...game.alarm, active: false },
        timer: { status: 'running', remainingMs: remaining, endsAt: action.now + remaining },
      }
    }

    case 'timer/pause': {
      const t = game.timer
      if (t.status !== 'running' || t.endsAt == null) return game
      return {
        ...game,
        ...stopRun(game, action.now),
        timer: { status: 'paused', remainingMs: Math.max(0, t.endsAt - action.now), endsAt: null },
      }
    }

    case 'timer/tick': {
      const t = game.timer
      if (t.status !== 'running' || t.endsAt == null || action.now < t.endsAt) return game
      // Time's up: move to the next level but wait for someone to press start.
      const from = game.levelIndex
      const to = Math.min(from + 1, game.config.levels.length - 1)
      return {
        ...game,
        ...stopRun(game, t.endsAt),
        levelIndex: to,
        timer: {
          status: 'ready',
          remainingMs: levelDurationMs(game.config, game.config.levels[to]),
          endsAt: null,
        },
        alarm: { seq: game.alarm.seq + 1, active: true, fromIndex: from, toIndex: to },
      }
    }

    case 'timer/adjust': {
      const t = game.timer
      if (t.status === 'running' && t.endsAt != null) {
        const endsAt = Math.max(action.now, t.endsAt + action.deltaMs)
        return { ...game, timer: { ...t, endsAt, remainingMs: endsAt - action.now } }
      }
      const remainingMs = Math.max(0, t.remainingMs + action.deltaMs)
      return { ...game, timer: { ...t, remainingMs, status: t.status === 'ready' ? 'paused' : t.status } }
    }

    case 'timer/reset':
      return gotoLevel(game, game.levelIndex, action.now, false)

    case 'level/goto':
      return gotoLevel(game, action.index, action.now, true)

    case 'alarm/dismiss':
      return game.alarm.active ? { ...game, alarm: { ...game.alarm, active: false } } : game

    case 'player/add': {
      const name = action.name.trim()
      if (!name || game.players.some((p) => p.id === action.id)) return game
      return { ...game, players: [...game.players, { id: action.id, name, rebuys: 0, bustedAt: null }] }
    }

    case 'player/remove':
      return { ...game, players: game.players.filter((p) => p.id !== action.id) }

    case 'player/rename': {
      const name = action.name.trim()
      return name ? updatePlayer(game, action.id, () => ({ name })) : game
    }

    case 'player/bust':
      return updatePlayer(game, action.id, (p) => ({ bustedAt: p.bustedAt ?? action.now }))

    case 'player/unbust':
      return updatePlayer(game, action.id, () => ({ bustedAt: null }))

    case 'player/rebuy':
      return updatePlayer(game, action.id, (p) => ({ rebuys: p.rebuys + 1, bustedAt: null }))

    case 'player/unrebuy':
      return updatePlayer(game, action.id, (p) => ({ rebuys: Math.max(0, p.rebuys - 1) }))

    case 'game/updateConfig': {
      const { config } = action
      if (config.levels.length === 0) return game
      // Follow the level being played even if rows before it were added or removed.
      const currentId = game.config.levels[game.levelIndex]?.id
      const sameLevel = config.levels.findIndex((l) => l.id === currentId)
      const levelIndex = sameLevel >= 0 ? sameLevel : Math.min(game.levelIndex, config.levels.length - 1)
      const next: Game = { ...game, config, levelIndex }
      // A level that hasn't been started yet picks up a changed level length.
      if (game.timer.status === 'ready') {
        next.timer = { ...game.timer, remainingMs: levelDurationMs(config, config.levels[levelIndex]) }
      }
      return next
    }
  }
}
