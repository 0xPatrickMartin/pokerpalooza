import { describe, expect, it } from 'vitest'
import { blindLevelNumbers, generateLevels } from './structure'
import type { BlindLevel, StructureOptions } from './types'

const base: StructureOptions = { startSmall: 25, pace: 'standard', breakEvery: 0, breakMinutes: 10, antesFrom: null }
const smalls = (levels: ReturnType<typeof generateLevels>) =>
  levels.filter((l): l is BlindLevel => l.kind === 'blinds').map((l) => l.small)

describe('generateLevels', () => {
  it('builds the classic 25/50 home-game ladder', () => {
    const levels = generateLevels(base, 25, 10_000)
    expect(smalls(levels).slice(0, 12)).toEqual([25, 50, 75, 100, 150, 200, 250, 300, 400, 500, 600, 750])
    expect(levels.every((l) => l.kind === 'blinds' && l.big === l.small * 2 && l.ante === 0)).toBe(true)
  })

  it('climbs faster in turbo', () => {
    expect(smalls(generateLevels({ ...base, pace: 'turbo' }, 25, 10_000)).slice(0, 8)).toEqual([
      25, 50, 75, 150, 250, 400, 600, 1000,
    ])
  })

  it('keeps every blind a multiple of the smallest chip', () => {
    const levels = smalls(generateLevels({ ...base, startSmall: 5 }, 5, 1500))
    expect(levels.every((s) => s % 5 === 0)).toBe(true)
    expect(levels.slice(0, 6)).toEqual([5, 10, 15, 20, 25, 30])
  })

  it('supports cash-style chips worth cents', () => {
    expect(smalls(generateLevels({ ...base, startSmall: 0.25 }, 0.25, 100)).slice(0, 5)).toEqual([0.25, 0.5, 0.75, 1, 1.5])
  })

  it('inserts breaks and big-blind antes', () => {
    const levels = generateLevels({ ...base, breakEvery: 4, antesFrom: 3 }, 25, 10_000)
    expect(levels[4]).toMatchObject({ kind: 'break', minutes: 10 })
    expect(levels[1]).toMatchObject({ ante: 0 })
    expect(levels[2]).toMatchObject({ kind: 'blinds', ante: 150, big: 150 })
    expect(levels.at(-1)?.kind).toBe('blinds')
  })

  it('stops once the big blind reaches twice the starting stack', () => {
    const levels = smalls(generateLevels(base, 25, 10_000))
    expect(levels.at(-1)! * 2).toBeGreaterThanOrEqual(20_000)
    expect(levels.at(-2)! * 2).toBeLessThan(20_000)
  })
})

describe('blindLevelNumbers', () => {
  it('skips breaks when numbering levels', () => {
    const levels = generateLevels({ ...base, breakEvery: 2 }, 25, 10_000).slice(0, 6)
    expect(blindLevelNumbers(levels)).toEqual([1, 2, 2, 3, 4, 4])
  })
})
