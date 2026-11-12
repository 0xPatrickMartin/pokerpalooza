import { useRef, useState, type DragEvent } from 'react'
import { uid } from '../../lib/id'
import { loadImage } from '../../lib/image'
import { useStore } from '../../state/context'
import { defaultChips } from '../../state/defaults'
import { useChipsSaveFailed } from '../../state/storageStatus'
import type { Chip } from '../../state/types'
import { ChipFace } from '../ChipFace'
import { Icon } from '../Icon'
import { Modal } from '../Modal'
import { NumberField } from '../NumberField'
import { ChipCropper, type CropResult } from './ChipCropper'

interface Cropping {
  image: HTMLImageElement
  /** Chip getting a new photo; null when the photo creates a new chip */
  chipId: string | null
}

const imageFrom = (e: DragEvent) => [...e.dataTransfer.files].find((f) => f.type.startsWith('image/'))

export function ChipManager({ onClose }: { onClose: () => void }) {
  const { state, dispatch } = useStore()
  const storageFull = useChipsSaveFailed()
  const { chips } = state
  const fileRef = useRef<HTMLInputElement>(null)
  const photoTarget = useRef<string | null>(null)
  const [cropping, setCropping] = useState<Cropping | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState<string | null>(null)

  const setChips = (next: Chip[]) => dispatch({ type: 'chips/set', chips: next })
  const patch = (id: string, p: Partial<Chip>) => setChips(chips.map((c) => (c.id === id ? { ...c, ...p } : c)))

  const choosePhoto = (chipId: string | null) => {
    photoTarget.current = chipId
    fileRef.current?.click()
  }

  const openFile = async (file: File, chipId: string | null) => {
    setError(null)
    try {
      setCropping({ image: await loadImage(file), chipId })
    } catch (err) {
      setError((err as Error).message)
    }
  }

  const closeCropper = () => {
    if (cropping) URL.revokeObjectURL(cropping.image.src)
    setCropping(null)
  }

  const saveCrop = (result: CropResult, another: boolean) => {
    if (!cropping) return
    if (cropping.chipId) {
      patch(cropping.chipId, { image: result.image, color: result.color })
    } else {
      setChips([
        ...chips,
        { id: uid(), value: result.value ?? 0, label: result.label, color: result.color, image: result.image },
      ])
    }
    if (!another) closeCropper()
  }

  const dropProps = (key: string, chipId: string | null) => ({
    onDragOver: (e: DragEvent) => {
      e.preventDefault()
      setDragOver(key)
    },
    onDragLeave: () => setDragOver(null),
    onDrop: (e: DragEvent) => {
      e.preventDefault()
      setDragOver(null)
      const file = imageFrom(e)
      if (file) void openFile(file, chipId)
    },
  })

  return (
    <Modal
      title="Chips"
      size="lg"
      onClose={onClose}
      footer={
        <>
          <button
            type="button"
            className="btn btn--ghost btn--small"
            onClick={() => {
              if (window.confirm('Replace all chips with the default set? Your photos will be removed.')) setChips(defaultChips())
            }}
          >
            Reset to defaults
          </button>
          <button
            type="button"
            className="btn btn--small"
            onClick={() => setChips([...chips].sort((a, b) => a.value - b.value))}
          >
            Sort by value
          </button>
          <button type="button" className="btn btn--primary" onClick={onClose}>
            Done
          </button>
        </>
      }
    >
      <p className="modal__intro">
        Snap or upload a photo of each chip and set what it's worth. One photo of the whole set works too: use
        <em> Save &amp; crop another</em> to cut out each chip. Photos stay on this device.
      </p>
      {storageFull && (
        <p className="notice notice--warn">
          Browser storage is full, so the latest photos won't survive a refresh. Remove a photo or two.
        </p>
      )}
      {error && <p className="notice notice--warn">{error}</p>}

      <ul className="chip-editor">
        {chips.map((chip) => (
          <li key={chip.id} className={`chip-card ${dragOver === chip.id ? 'is-drop' : ''}`} {...dropProps(chip.id, chip.id)}>
            <button type="button" className="chip-card__face" onClick={() => choosePhoto(chip.id)} title="Upload a photo of this chip">
              <ChipFace chip={chip} />
              <span className="chip-card__camera">
                <Icon name="camera" />
              </span>
            </button>
            <div className="chip-card__fields">
              <label className="field">
                <span className="field__label">Value</span>
                <NumberField value={chip.value} min={0} onChange={(v) => v != null && patch(chip.id, { value: v })} />
              </label>
              <label className="field">
                <span className="field__label">Name</span>
                <input
                  className="input"
                  value={chip.label}
                  maxLength={16}
                  placeholder="Color"
                  onChange={(e) => patch(chip.id, { label: e.target.value })}
                />
              </label>
            </div>
            <div className="chip-card__actions">
              <label className="chip-card__color" title="Chip color (used when there's no photo)">
                <input type="color" value={chip.color} onChange={(e) => patch(chip.id, { color: e.target.value })} />
                <span className="sr-only">Chip color</span>
              </label>
              {chip.image && (
                <button type="button" className="mini-btn" onClick={() => patch(chip.id, { image: null })} title="Remove photo">
                  No photo
                </button>
              )}
              <button
                type="button"
                className="mini-btn mini-btn--danger"
                onClick={() => setChips(chips.filter((c) => c.id !== chip.id))}
                aria-label={`Delete ${chip.label || chip.value} chip`}
                title="Delete chip"
              >
                <Icon name="trash" />
              </button>
            </div>
          </li>
        ))}

        <li className={`chip-card chip-card--add ${dragOver === 'new' ? 'is-drop' : ''}`} {...dropProps('new', null)}>
          <button type="button" className="btn btn--primary" onClick={() => choosePhoto(null)}>
            <Icon name="camera" /> Add from photo
          </button>
          <button
            type="button"
            className="btn btn--small btn--ghost"
            onClick={() => setChips([...chips, { id: uid(), value: 0, label: '', color: '#8c1d2c', image: null }])}
          >
            <Icon name="plus" /> Add without photo
          </button>
          <span className="chip-card__drop-hint">or drop an image here</span>
        </li>
      </ul>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0]
          e.target.value = ''
          if (file) void openFile(file, photoTarget.current)
        }}
      />

      {cropping && (
        <ChipCropper key={cropping.image.src} image={cropping.image} isNew={cropping.chipId == null} onCancel={closeCropper} onSave={saveCrop} />
      )}
    </Modal>
  )
}
