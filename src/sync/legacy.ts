import { defaultChips, defaultSetup } from '../state/defaults'
import type { Chip, SetupDraft } from '../state/types'

// Before 3.0, chips and setup lived only in the browser that created them.
const OLD_CHIPS = 'pokerpalooza.chips.v1'
const OLD_SETUP = 'pokerpalooza.setup.v1'
const HANDLED = 'pokerpalooza.imported.v1'

export interface LegacyData {
  chips: Chip[]
  setup: SetupDraft
  photos: number
  players: number
}

const isChip = (c: unknown): c is Chip =>
  typeof c === 'object' && c !== null && typeof (c as Chip).id === 'string' && typeof (c as Chip).value === 'number'

/** Chips and setup this browser saved with an older version, if there's anything worth bringing over. */
export function readLegacy(): LegacyData | null {
  try {
    if (localStorage.getItem(HANDLED)) return null
    const rawChips: unknown = JSON.parse(localStorage.getItem(OLD_CHIPS) ?? 'null')
    const rawSetup = JSON.parse(localStorage.getItem(OLD_SETUP) ?? 'null') as Partial<SetupDraft> | null
    const chips = Array.isArray(rawChips) ? rawChips.filter(isChip) : []
    const d = defaultSetup()
    const setup: SetupDraft = rawSetup?.config?.levels?.length
      ? {
          config: { ...d.config, ...rawSetup.config, rebuys: { ...d.config.rebuys, ...rawSetup.config.rebuys } },
          structure: { ...d.structure, ...rawSetup.structure },
          playerNames: Array.isArray(rawSetup.playerNames) ? rawSetup.playerNames : [],
        }
      : d
    const defaultValues = defaultChips().map((c) => c.value).join()
    const customChips = chips.length > 0 && chips.map((c) => c.value).join() !== defaultValues
    const photos = chips.filter((c) => c.image).length
    const players = setup.playerNames.length
    if (photos === 0 && players === 0 && !customChips) return null
    return { chips, setup, photos, players }
  } catch {
    return null
  }
}

export function markLegacyHandled(): void {
  try {
    localStorage.setItem(HANDLED, '1')
  } catch {
    // Nothing to do; the offer just shows up again next time.
  }
}
