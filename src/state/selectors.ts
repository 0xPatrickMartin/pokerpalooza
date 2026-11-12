import { blindLevelNumber, levelDurationMs } from './structure'
import type { BlindLevel, Game, GameConfig, PayoutPreset, Player } from './types'

export const rebuyCost = (c: GameConfig) => c.rebuys.cost ?? c.buyIn
export const rebuyChips = (c: GameConfig) => c.rebuys.chips ?? c.startingStack

export interface Totals {
  entries: number
  rebuys: number
  alive: number
  pot: number
  chipsInPlay: number
  avgStack: number
}

export function totals(game: Game): Totals {
  const { config, players } = game
  const entries = players.length
  const rebuys = players.reduce((n, p) => n + p.rebuys, 0)
  const alive = players.filter((p) => p.bustedAt == null).length
  const pot = entries * config.buyIn + rebuys * rebuyCost(config)
  const chipsInPlay = entries * config.startingStack + rebuys * rebuyChips(config)
  return { entries, rebuys, alive, pot, chipsInPlay, avgStack: alive > 0 ? chipsInPlay / alive : 0 }
}

export function remainingMs(game: Game, now: number): number {
  const t = game.timer
  if (t.status === 'running' && t.endsAt != null) return Math.max(0, t.endsAt - now)
  return t.remainingMs
}

export function elapsedMs(game: Game, now: number): number {
  return game.playedMs + (game.runStartedAt != null ? Math.max(0, now - game.runStartedAt) : 0)
}

export function rebuysOpen(game: Game): boolean {
  const r = game.config.rebuys
  if (!r.enabled) return false
  if (r.untilLevel == null) return true
  return blindLevelNumber(game.config.levels, game.levelIndex) <= r.untilLevel
}

export function canRebuy(game: Game, player: Player): boolean {
  const max = game.config.rebuys.maxPerPlayer
  return rebuysOpen(game) && (max == null || player.rebuys < max)
}

export function nextBlindLevel(game: Game): BlindLevel | null {
  const levels = game.config.levels
  for (let i = game.levelIndex + 1; i < levels.length; i++) {
    const l = levels[i]
    if (l.kind === 'blinds') return l
  }
  return null
}

/** Clock time until the next scheduled break starts, or null if none is coming. */
export function timeToNextBreak(game: Game, now: number): number | null {
  const levels = game.config.levels
  if (levels[game.levelIndex]?.kind === 'break') return null
  let ms = remainingMs(game, now)
  for (let i = game.levelIndex + 1; i < levels.length; i++) {
    if (levels[i].kind === 'break') return ms
    ms += levelDurationMs(game.config, levels[i])
  }
  return null
}

const PRESET_PERCENTS: Record<Exclude<PayoutPreset, 'auto'>, number[]> = {
  wta: [100],
  top2: [65, 35],
  top3: [50, 30, 20],
  top4: [40, 30, 20, 10],
}

export const PAYOUT_LABELS: Record<PayoutPreset, string> = {
  auto: 'Auto (by number of players)',
  wta: 'Winner takes all',
  top2: 'Top 2 · 65 / 35',
  top3: 'Top 3 · 50 / 30 / 20',
  top4: 'Top 4 · 40 / 30 / 20 / 10',
}

export function payoutPercents(preset: PayoutPreset, entries: number): number[] {
  if (preset !== 'auto') return PRESET_PERCENTS[preset]
  if (entries <= 4) return PRESET_PERCENTS.wta
  if (entries <= 7) return PRESET_PERCENTS.top2
  if (entries <= 12) return PRESET_PERCENTS.top3
  return PRESET_PERCENTS.top4
}

/** Splits the pot by percentages; rounding leftovers go to first place. */
export function payoutAmounts(pot: number, percents: number[]): number[] {
  const potCents = Math.round(pot * 100)
  const wholeDollars = potCents % 100 === 0
  const step = wholeDollars ? 100 : 1
  const cents = percents.map((p) => Math.floor((potCents * p) / 100 / step) * step)
  cents[0] += potCents - cents.reduce((a, b) => a + b, 0)
  return cents.map((c) => c / 100)
}

/** Finishing position for every eliminated player (first out of 10 entries finishes 10th). */
export function finishingPlaces(players: Player[]): Map<string, number> {
  const busted = players
    .filter((p) => p.bustedAt != null)
    .sort((a, b) => (a.bustedAt ?? 0) - (b.bustedAt ?? 0))
  return new Map(busted.map((p, i) => [p.id, players.length - i]))
}

export function winner(game: Game): Player | null {
  if (game.players.length < 2) return null
  const alive = game.players.filter((p) => p.bustedAt == null)
  return alive.length === 1 ? alive[0] : null
}
