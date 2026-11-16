/** The marquee title. One letter flickers like a tired neon tube. */
export function NeonSign({ text, suit, className }: { text: string; suit?: string; className?: string }) {
  const chars = [...text]
  let flicker = Math.floor(chars.length * 0.62)
  while (flicker < chars.length - 1 && chars[flicker] === ' ') flicker++

  return (
    <h1 className={`neon-sign ${className ?? ''}`} aria-label={text}>
      <span className="neon-sign__suit neon-sign__suit--left" aria-hidden="true">
        {suit ?? '♠'}
      </span>
      <span className="neon-sign__text" aria-hidden="true">
        {chars.slice(0, flicker).join('')}
        <span className="neon-sign__flicker">{chars[flicker]}</span>
        {chars.slice(flicker + 1).join('')}
      </span>
      <span className="neon-sign__suit neon-sign__suit--right" aria-hidden="true">
        {suit ?? '♦'}
      </span>
    </h1>
  )
}
