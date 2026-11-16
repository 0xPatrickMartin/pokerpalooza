import { useMemo } from 'react'
import { encode } from 'uqr'

/** Dark squares on parchment: phone cameras read that far more reliably than neon on black. */
export function QrCode({ value, label, className }: { value: string; label: string; className?: string }) {
  const { size, path } = useMemo(() => {
    const qr = encode(value, { ecc: 'M', border: 2 })
    let d = ''
    qr.data.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        if (!row[x]) continue
        let run = 1
        while (row[x + run]) run++
        d += `M${x} ${y}h${run}v1h-${run}z`
        x += run - 1
      }
    })
    return { size: qr.size, path: d }
  }, [value])

  return (
    <svg className={`qr ${className ?? ''}`} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={label} shapeRendering="crispEdges">
      <rect width={size} height={size} fill="#f3e6cc" />
      <path d={path} fill="#140b06" />
    </svg>
  )
}
