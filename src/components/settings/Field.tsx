import type { ReactNode } from 'react'

export function Field({
  label,
  hint,
  children,
  className,
  as: Tag = 'label',
}: {
  label: string
  hint?: ReactNode
  children: ReactNode
  className?: string
  /** Use "div" when the field holds more than one control */
  as?: 'label' | 'div'
}) {
  return (
    <Tag className={`field ${className ?? ''}`}>
      <span className="field__label">{label}</span>
      {children}
      {hint && <span className="field__hint">{hint}</span>}
    </Tag>
  )
}
