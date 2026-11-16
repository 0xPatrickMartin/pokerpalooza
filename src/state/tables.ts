import type { TableId, TimerState } from './types'

/** What the table picker shows for each table. */
export interface TableSummary {
  id: TableId
  title: string
  status: 'idle' | TimerState['status']
  levelLabel: string | null
  timer: TimerState | null
  alive: number
  entries: number
}

export interface TableInfo {
  id: TableId
  name: string
  suit: string
  /** CSS color for the table's neon accents */
  glow: string
}

export const TABLES: TableInfo[] = [
  { id: 'spades', name: 'Spades', suit: '♠', glow: 'var(--cyan)' },
  { id: 'hearts', name: 'Hearts', suit: '♥', glow: 'var(--pink)' },
  { id: 'diamonds', name: 'Diamonds', suit: '♦', glow: 'var(--amber)' },
  { id: 'clubs', name: 'Clubs', suit: '♣', glow: 'var(--green)' },
]

export function isTableId(value: string): value is TableId {
  return TABLES.some((t) => t.id === value)
}

export function tableInfo(id: TableId): TableInfo {
  return TABLES.find((t) => t.id === id) ?? TABLES[0]
}
