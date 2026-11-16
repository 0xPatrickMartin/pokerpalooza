import type { TableState } from '../state/types'

// Hosts don't log in yet, so anyone can send actions. Every resulting state is checked before it's
// kept, so junk can't break the screens or fill the disk.
const LIMITS = { levels: 120, players: 120, chips: 40, text: 80, imageChars: 400_000 }

type Obj = Record<string, unknown>
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v)
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const isText = (v: unknown, max = LIMITS.text): v is string => typeof v === 'string' && v.length <= max
const isList = (v: unknown, max: number): v is unknown[] => Array.isArray(v) && v.length <= max

function validLevel(l: unknown): boolean {
  if (!isObj(l) || !isText(l.id)) return false
  if (l.kind === 'blinds') return isNum(l.small) && isNum(l.big) && isNum(l.ante)
  return l.kind === 'break' && isNum(l.minutes) && l.minutes > 0
}

function validConfig(c: unknown): boolean {
  return (
    isObj(c) &&
    isText(c.title) &&
    isNum(c.buyIn) &&
    isNum(c.startingStack) &&
    isNum(c.levelMinutes) &&
    c.levelMinutes > 0 &&
    isObj(c.rebuys) &&
    isText(c.payouts) &&
    isList(c.levels, LIMITS.levels) &&
    c.levels.length > 0 &&
    c.levels.every(validLevel)
  )
}

function validChip(c: unknown): boolean {
  return (
    isObj(c) &&
    isText(c.id) &&
    isNum(c.value) &&
    isText(c.label) &&
    isText(c.color) &&
    (c.image === null || (isText(c.image, LIMITS.imageChars) && c.image.startsWith('data:image/')))
  )
}

function validPlayer(p: unknown): boolean {
  return isObj(p) && isText(p.id) && isText(p.name) && isNum(p.rebuys) && (p.bustedAt === null || isNum(p.bustedAt))
}

function validGame(g: unknown): boolean {
  if (g === null) return true
  return (
    isObj(g) &&
    isText(g.id) &&
    isText(g.code) &&
    validConfig(g.config) &&
    isList(g.players, LIMITS.players) &&
    g.players.every(validPlayer) &&
    isNum(g.levelIndex) &&
    g.levelIndex >= 0 &&
    g.levelIndex < (g.config as { levels: unknown[] }).levels.length &&
    isObj(g.timer) &&
    isNum(g.timer.remainingMs) &&
    isObj(g.alarm) &&
    isNum(g.alarm.seq)
  )
}

function validSetup(s: unknown): boolean {
  return (
    isObj(s) &&
    validConfig(s.config) &&
    isObj(s.structure) &&
    isList(s.playerNames, LIMITS.players) &&
    s.playerNames.every((n) => isText(n))
  )
}

export function isValidTableState(s: unknown): s is TableState {
  return (
    isObj(s) &&
    validGame(s.game) &&
    isList(s.chips, LIMITS.chips) &&
    s.chips.every(validChip) &&
    validSetup(s.setup)
  )
}
