import { useId } from 'react'
import type { Chip } from '../state/types'

function luminance(hex: string): number {
  const m = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hex)
  if (!m) return 0.3
  const [r, g, b] = m.slice(1).map((c) => parseInt(c, 16) / 255)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function chipLabel(value: number): string {
  if (value > 0 && value < 1) return `${Math.round(value * 100)}¢`
  if (value >= 1000 && value % 100 === 0) return `${value / 1000}K`
  return value.toLocaleString('en-US', { maximumFractionDigits: 2 })
}

/** A chip photo cropped to a circle, or a drawn chip in the chip's color when there's no photo. */
export function ChipFace({ chip, className }: { chip: Chip; className?: string }) {
  const gradientId = `chip-shine${useId().replace(/[^\w-]/g, '')}`
  const alt = `${chip.label ? `${chip.label} chip` : 'Chip'} worth ${chip.value}`

  if (chip.image) {
    return (
      <img
        className={`chip-face chip-face--photo ${className ?? ''}`}
        src={chip.image}
        alt={alt}
        draggable={false}
      />
    )
  }

  const light = luminance(chip.color) > 0.62
  const spots = light ? '#1f3f8f' : '#f6efe0'
  const ink = light ? '#2a2a2a' : chip.color
  const text = chipLabel(chip.value)
  const fontSize = text.length <= 2 ? 22 : text.length === 3 ? 19 : text.length === 4 ? 15 : 12

  return (
    <svg className={`chip-face ${className ?? ''}`} viewBox="0 0 100 100" role="img" aria-label={alt}>
      <defs>
        <radialGradient id={gradientId} cx="35%" cy="28%" r="80%">
          <stop offset="0" stopColor="#fff" stopOpacity="0.35" />
          <stop offset="0.55" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.25" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="48" fill={chip.color} />
      <g fill={spots}>
        {Array.from({ length: 8 }, (_, i) => (
          <rect key={i} x="44.5" y="2" width="11" height="15" rx="1.5" transform={`rotate(${i * 45} 50 50)`} />
        ))}
      </g>
      <circle cx="50" cy="50" r="34" fill="none" stroke={spots} strokeWidth="1.4" strokeDasharray="3 3.3" opacity="0.85" />
      <circle cx="50" cy="50" r="28.5" fill="#f3e6cc" stroke={light ? '#2a2a2a' : chip.color} strokeWidth="2" />
      <text
        x="50"
        y="50"
        dy="0.36em"
        textAnchor="middle"
        fontFamily="Rye, serif"
        fontSize={fontSize}
        fill={ink}
      >
        {text}
      </text>
      <circle cx="50" cy="50" r="48" fill={`url(#${gradientId})`} />
      <circle cx="50" cy="50" r="48" fill="none" stroke="rgba(0,0,0,0.55)" strokeWidth="1" />
    </svg>
  )
}
