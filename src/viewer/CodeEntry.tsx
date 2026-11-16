import { useState } from 'react'
import { navigate } from '../lib/route'
import { CODE_LENGTH } from '../state/viewer'
import { NeonSign } from '../components/NeonSign'

const clean = (text: string) => text.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, CODE_LENGTH)

export function CodeEntry({ notice }: { notice?: string }) {
  const [code, setCode] = useState('')
  const go = (value: string) => {
    if (value.length === CODE_LENGTH) navigate(`/${value}`)
  }

  return (
    <div className="viewer viewer--entry">
      <NeonSign text="Pokerpalooza" />
      <form
        className="code-entry"
        onSubmit={(e) => {
          e.preventDefault()
          go(code)
        }}
      >
        <label className="code-entry__label" htmlFor="game-code">
          Enter the code from the host's screen
        </label>
        <input
          id="game-code"
          className="code-entry__input"
          value={code}
          onChange={(e) => {
            const value = clean(e.target.value)
            setCode(value)
            go(value)
          }}
          maxLength={CODE_LENGTH}
          placeholder="K7M2QX"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          autoFocus
        />
        <button type="submit" className="btn btn--start btn--xl" disabled={code.length !== CODE_LENGTH}>
          Follow the game
        </button>
      </form>
      {notice && <p className="notice notice--warn">{notice}</p>}
      <p className="field__hint">Or scan the QR code on the host's screen with your phone camera.</p>
    </div>
  )
}
