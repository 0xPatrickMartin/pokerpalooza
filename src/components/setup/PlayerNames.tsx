import { useState } from 'react'
import { Icon } from '../Icon'

/** Splits pasted lists like "Doc, Wyatt\nJesse" into names. */
const splitNames = (text: string) =>
  text
    .split(/[,;\n]/)
    .map((s) => s.trim())
    .filter(Boolean)

export function PlayerNames({ names, onChange }: { names: string[]; onChange: (names: string[]) => void }) {
  const [text, setText] = useState('')

  const add = () => {
    const added = splitNames(text)
    if (added.length) onChange([...names, ...added])
    setText('')
  }

  return (
    <div className="player-names">
      <form
        className="inline-form"
        onSubmit={(e) => {
          e.preventDefault()
          add()
        }}
      >
        <input
          className="input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onPaste={(e) => {
            const pasted = e.clipboardData.getData('text')
            if (/[,;\n]/.test(pasted)) {
              e.preventDefault()
              onChange([...names, ...splitNames(pasted)])
            }
          }}
          placeholder="Add a name, or paste a list"
          aria-label="Player name"
        />
        <button type="submit" className="btn" disabled={!text.trim()}>
          <Icon name="plus" /> Add
        </button>
      </form>

      {names.length > 0 ? (
        <>
          <ul className="name-tags">
            {names.map((name, i) => (
              <li key={`${name}-${i}`} className="name-tag">
                <span>{name}</span>
                <button
                  type="button"
                  onClick={() => onChange(names.filter((_, j) => j !== i))}
                  aria-label={`Remove ${name}`}
                >
                  <Icon name="close" />
                </button>
              </li>
            ))}
          </ul>
          <button type="button" className="link-btn" onClick={() => onChange([])}>
            Clear everyone
          </button>
        </>
      ) : (
        <p className="field__hint">Everyone listed here is bought in when the game starts. You can add stragglers later.</p>
      )}
    </div>
  )
}
