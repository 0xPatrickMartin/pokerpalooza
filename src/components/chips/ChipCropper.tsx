import { useEffect, useRef, useState } from 'react'
import { cropToDataUrl, sampleRingColor, type CropRect } from '../../lib/image'
import { Modal } from '../Modal'
import { NumberField } from '../NumberField'
import { Field } from '../settings/Field'

export interface CropResult {
  image: string
  color: string
  value: number | null
  label: string
}

interface Props {
  image: HTMLImageElement
  /** Ask for the chip's value and name too (when creating a chip from a photo) */
  isNew: boolean
  onCancel: () => void
  onSave: (result: CropResult, cropAnother: boolean) => void
}

const VIEW = 300
const MAX_ZOOM = 8

interface View {
  zoom: number
  /** Screen-pixel offset of the photo from centered */
  x: number
  y: number
}

/** Keeps the photo covering the whole crop circle. */
function clampView(v: View, nw: number, nh: number): View {
  const zoom = Math.min(MAX_ZOOM, Math.max(1, v.zoom))
  const s = (VIEW / Math.min(nw, nh)) * zoom
  const maxX = Math.max(0, (nw * s - VIEW) / 2)
  const maxY = Math.max(0, (nh * s - VIEW) / 2)
  return { zoom, x: Math.min(maxX, Math.max(-maxX, v.x)), y: Math.min(maxY, Math.max(-maxY, v.y)) }
}

/** Zooms around the center of the crop circle. */
function zoomView(v: View, zoom: number, nw: number, nh: number): View {
  const z = Math.min(MAX_ZOOM, Math.max(1, zoom))
  const k = z / v.zoom
  return clampView({ zoom: z, x: v.x * k, y: v.y * k }, nw, nh)
}

export function ChipCropper({ image, isNew, onCancel, onSave }: Props) {
  const nw = image.naturalWidth
  const nh = image.naturalHeight
  const base = VIEW / Math.min(nw, nh)
  const [view, setView] = useState<View>({ zoom: 1, x: 0, y: 0 })
  const [value, setValue] = useState<number | null>(null)
  const [label, setLabel] = useState('')
  const [savedCount, setSavedCount] = useState(0)
  const stageRef = useRef<HTMLDivElement>(null)
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const pinch = useRef<{ dist: number; zoom: number } | null>(null)

  const zoomTo = (zoom: number) => setView((v) => zoomView(v, zoom, nw, nh))

  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return
    // React's onWheel is passive, so it can't stop the modal from scrolling.
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      setView((v) => zoomView(v, v.zoom * Math.exp(-e.deltaY * 0.0015), nw, nh))
    }
    stage.addEventListener('wheel', onWheel, { passive: false })
    return () => stage.removeEventListener('wheel', onWheel)
  }, [nw, nh])

  const pinchDistance = () => {
    const [a, b] = [...pointers.current.values()]
    return Math.hypot(a.x - b.x, a.y - b.y)
  }

  const s = base * view.zoom
  const width = nw * s
  const height = nh * s
  const left = VIEW / 2 + view.x - width / 2
  const top = VIEW / 2 + view.y - height / 2

  const save = (another: boolean) => {
    const crop: CropRect = { x: -left / s, y: -top / s, size: VIEW / s }
    onSave({ image: cropToDataUrl(image, crop), color: sampleRingColor(image, crop), value, label: label.trim() }, another)
    if (another) {
      setValue(null)
      setLabel('')
      setSavedCount((n) => n + 1)
    }
  }

  const canSave = !isNew || (value != null && value > 0)

  return (
    <Modal
      title={isNew ? 'New chip' : 'Frame the chip'}
      size="sm"
      onClose={onCancel}
      footer={
        <>
          <button type="button" className="btn btn--small" onClick={onCancel}>
            {savedCount > 0 ? 'Done' : 'Cancel'}
          </button>
          {isNew && (
            <button
              type="button"
              className="btn btn--small"
              disabled={!canSave}
              onClick={() => save(true)}
              title="Save, then crop another chip out of the same photo"
            >
              Save &amp; crop another
            </button>
          )}
          <button type="button" className="btn btn--small btn--primary" disabled={!canSave} onClick={() => save(false)}>
            Save chip
          </button>
        </>
      }
    >
      <div className="cropper">
        <div
          ref={stageRef}
          className="cropper__stage"
          style={{ width: VIEW, height: VIEW }}
          onPointerDown={(e) => {
            try {
              e.currentTarget.setPointerCapture(e.pointerId)
            } catch {
              // Capture is a nicety (keeps dragging when the pointer leaves the circle); panning works without it.
            }
            pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
            if (pointers.current.size === 2) pinch.current = { dist: pinchDistance(), zoom: view.zoom }
          }}
          onPointerMove={(e) => {
            const prev = pointers.current.get(e.pointerId)
            if (!prev) return
            const cur = { x: e.clientX, y: e.clientY }
            pointers.current.set(e.pointerId, cur)
            if (pointers.current.size === 1) {
              setView((v) => clampView({ ...v, x: v.x + cur.x - prev.x, y: v.y + cur.y - prev.y }, nw, nh))
            } else if (pinch.current) {
              zoomTo((pinch.current.zoom * pinchDistance()) / pinch.current.dist)
            }
          }}
          onPointerUp={(e) => {
            pointers.current.delete(e.pointerId)
            if (pointers.current.size < 2) pinch.current = null
          }}
          onPointerCancel={(e) => {
            pointers.current.delete(e.pointerId)
            pinch.current = null
          }}
        >
          <img
            className="cropper__image"
            src={image.src}
            alt=""
            draggable={false}
            style={{ width, height, transform: `translate(${left}px, ${top}px)` }}
          />
          <div className="cropper__ring" aria-hidden="true" />
        </div>
        <p className="cropper__hint">Drag to center the chip in the ring. Scroll or pinch to zoom.</p>
        <label className="cropper__zoom">
          <span>Zoom</span>
          <input
            type="range"
            min={1}
            max={MAX_ZOOM}
            step={0.01}
            value={view.zoom}
            onChange={(e) => zoomTo(Number(e.target.value))}
          />
        </label>
        {isNew && (
          <div className="fields__row">
            <Field label="What's it worth?">
              <NumberField value={value} allowEmpty min={0} placeholder="e.g. 100" onChange={setValue} />
            </Field>
            <Field label="Name (optional)">
              <input className="input" value={label} maxLength={16} placeholder="e.g. Black" onChange={(e) => setLabel(e.target.value)} />
            </Field>
          </div>
        )}
        {savedCount > 0 && (
          <p className="cropper__saved">
            {savedCount} chip{savedCount > 1 ? 's' : ''} saved from this photo. Frame the next one.
          </p>
        )}
      </div>
    </Modal>
  )
}
