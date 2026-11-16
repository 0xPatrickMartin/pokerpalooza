import { blindLevelCount, blindLevelNumber, levelDurationMs } from './structure'
import type { Chip, Level, TableId, TableState, TimerState } from './types'

/** Length of the game code players type on the live screen */
export const CODE_LENGTH = 6

export type ViewerLevel =
  | { kind: 'blinds'; number: number; small: number; big: number; ante: number }
  | { kind: 'break'; minutes: number }

/** What the read-only player screen gets: no player names, no money. */
export interface ViewerSnapshot {
  table: TableId
  title: string
  code: string
  levelCount: number
  current: ViewerLevel
  next: ViewerLevel | null
  timer: TimerState
  durationMs: number
  alarmSeq: number
  chips: Chip[]
}

function describe(levels: Level[], index: number): ViewerLevel | null {
  const level = levels[index]
  if (!level) return null
  if (level.kind === 'break') return { kind: 'break', minutes: level.minutes }
  return {
    kind: 'blinds',
    number: blindLevelNumber(levels, index),
    small: level.small,
    big: level.big,
    ante: level.ante,
  }
}

export function viewerSnapshot(table: TableId, state: TableState): ViewerSnapshot | null {
  const game = state.game
  if (!game) return null
  const { levels } = game.config
  const current = describe(levels, game.levelIndex)
  if (!current) return null
  return {
    table,
    title: game.config.title,
    code: game.code,
    levelCount: blindLevelCount(levels),
    current,
    next: describe(levels, game.levelIndex + 1),
    timer: game.timer,
    durationMs: levelDurationMs(game.config, levels[game.levelIndex]),
    alarmSeq: game.alarm.seq,
    chips: state.chips.filter((c) => c.value > 0).sort((a, b) => a.value - b.value),
  }
}
