import { uid } from '../lib/id'
import type { BlindLevel, GameConfig, Level, StructureOptions } from './types'

const MANTISSAS = [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 7.5, 8]

/** Blind amounts that feel natural at a poker table: 1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 25, 30, 40... */
const NICE_VALUES: number[] = (() => {
  const out: number[] = []
  for (let exp = 0; exp <= 9; exp++) {
    for (const m of MANTISSAS) {
      const v = Math.round(m * 10 ** exp * 10) / 10
      if (Number.isInteger(v) && !out.includes(v)) out.push(v)
    }
  }
  return out
})()

const GROWTH = { standard: 1.2, turbo: 1.5 } as const
const MIN_LEVELS = 10
const MAX_LEVELS = 30

/** Next blind amount at least `growth` times bigger than `prev`, staying a multiple of `unit`. */
function nextSmall(prev: number, growth: number, unit: number): number {
  const target = prev * growth
  const nice = NICE_VALUES.find((v) => v > prev && v >= target - 1e-9 && v % unit === 0)
  return nice ?? Math.max(prev + unit, Math.ceil(target / unit) * unit)
}

/**
 * Builds a tournament blind schedule.
 * Values below 1 (e.g. a $0.25 small blind) are generated in cents and scaled back.
 */
export function generateLevels(
  opts: StructureOptions,
  smallestChip: number,
  startingStack: number,
): Level[] {
  const scale = opts.startSmall < 1 || smallestChip < 1 ? 100 : 1
  const start = Math.max(1, Math.round(opts.startSmall * scale))
  const unit = Math.max(1, Math.round((smallestChip > 0 ? smallestChip : opts.startSmall) * scale))
  const growth = GROWTH[opts.pace]
  const stopAtBig = startingStack * 2 * scale

  const smalls = [start]
  while (smalls.length < MAX_LEVELS) {
    const last = smalls[smalls.length - 1]
    if (last * 2 >= stopAtBig && smalls.length >= MIN_LEVELS) break
    smalls.push(nextSmall(last, growth, unit))
  }

  const levels: Level[] = []
  smalls.forEach((s, i) => {
    const levelNo = i + 1
    const small = s / scale
    const big = (s * 2) / scale
    const ante = opts.antesFrom != null && levelNo >= opts.antesFrom ? big : 0
    levels.push({ id: uid(), kind: 'blinds', small, big, ante })
    const isLast = i === smalls.length - 1
    if (opts.breakEvery > 0 && levelNo % opts.breakEvery === 0 && !isLast) {
      levels.push({ id: uid(), kind: 'break', minutes: opts.breakMinutes })
    }
  })
  return levels
}

/** A sensible follow-on level for the "+ Level" button in the structure editor. */
export function levelAfter(prev: BlindLevel | undefined): BlindLevel {
  if (!prev) return { id: uid(), kind: 'blinds', small: 25, big: 50, ante: 0 }
  const scale = prev.small < 1 ? 100 : 1
  const small = nextSmall(Math.round(prev.small * scale), 1.2, 1) / scale
  const big = small * 2
  return { id: uid(), kind: 'blinds', small, big, ante: prev.ante > 0 ? big : 0 }
}

export function levelDurationMs(config: GameConfig, level: Level | undefined): number {
  const minutes = level?.kind === 'break' ? level.minutes : config.levelMinutes
  return Math.max(1000, Math.round(minutes * 60_000))
}

/** 1-based number of the blind level at `index`; breaks report the level they follow. */
export function blindLevelNumber(levels: Level[], index: number): number {
  let n = 0
  for (let i = 0; i <= index && i < levels.length; i++) {
    if (levels[i].kind === 'blinds') n++
  }
  return n
}

/** Blind level number for every entry (breaks repeat the number of the level before them). */
export function blindLevelNumbers(levels: Level[]): number[] {
  let n = 0
  return levels.map((l) => (l.kind === 'blinds' ? ++n : n))
}

export function blindLevelCount(levels: Level[]): number {
  return levels.filter((l) => l.kind === 'blinds').length
}
