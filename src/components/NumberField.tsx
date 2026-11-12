import { useState } from 'react'

interface Props {
  value: number | null
  onChange: (value: number | null) => void
  min?: number
  max?: number
  /** Allow clearing the field, which reports null (e.g. "unlimited") */
  allowEmpty?: boolean
  integer?: boolean
  prefix?: string
  suffix?: string
  placeholder?: string
  id?: string
  className?: string
  'aria-label'?: string
}

const display = (v: number | null) => (v == null ? '' : v.toLocaleString('en-US', { maximumFractionDigits: 2 }))

/**
 * Text input that edits a number. Keeps the raw text while focused so partial input like "0." works,
 * and only reports values that parse and fall within range.
 */
export function NumberField({
  value,
  onChange,
  min,
  max,
  allowEmpty,
  integer,
  prefix,
  suffix,
  placeholder,
  id,
  className,
  ...aria
}: Props) {
  const [draft, setDraft] = useState<string | null>(null)

  const handle = (text: string) => {
    setDraft(text)
    const cleaned = text.replace(/[,$\s]/g, '')
    if (cleaned === '') {
      if (allowEmpty) onChange(null)
      return
    }
    const n = Number(cleaned)
    if (!Number.isFinite(n)) return
    if (integer && !Number.isInteger(n)) return
    if (min != null && n < min) return
    if (max != null && n > max) return
    onChange(n)
  }

  return (
    <span className={`numfield ${className ?? ''}`}>
      {prefix && <span className="numfield__affix">{prefix}</span>}
      <input
        id={id}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        value={draft ?? display(value)}
        placeholder={placeholder}
        onFocus={(e) => {
          setDraft(value == null ? '' : String(value))
          requestAnimationFrame(() => e.target.select())
        }}
        onChange={(e) => handle(e.target.value)}
        onBlur={() => setDraft(null)}
        {...aria}
      />
      {suffix && <span className="numfield__affix">{suffix}</span>}
    </span>
  )
}
