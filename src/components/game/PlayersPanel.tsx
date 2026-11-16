import { useState, type Dispatch } from 'react'
import { formatMoney, ordinal } from '../../lib/format'
import { uid } from '../../lib/id'
import type { Action } from '../../state/reducer'
import {
  canRebuy,
  finishingPlaces,
  payoutAmounts,
  payoutPercents,
  rebuyCost,
  rebuysOpen,
  totals,
} from '../../state/selectors'
import type { Game, Player } from '../../state/types'
import { useTable } from '../../sync/context'
import { Icon } from '../Icon'

interface RowProps {
  player: Player
  place: number | undefined
  editing: boolean
  rebuysEnabled: boolean
  rebuyAllowed: boolean
  rebuyPrice: string
  dispatch: Dispatch<Action>
}

function PlayerRow({ player, place, editing, rebuysEnabled, rebuyAllowed, rebuyPrice, dispatch }: RowProps) {
  const busted = player.bustedAt != null
  const id = player.id

  return (
    <li className={`player ${busted ? 'is-busted' : ''}`}>
      <span className="player__dot" aria-hidden="true" />
      {editing ? (
        <input
          className="player__name-input"
          defaultValue={player.name}
          aria-label="Player name"
          onBlur={(e) => dispatch({ type: 'player/rename', id, name: e.target.value })}
          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
        />
      ) : (
        <span className="player__name">{player.name}</span>
      )}
      {player.rebuys > 0 && (
        <span className="player__rebuys" title={`${player.rebuys} rebuy${player.rebuys > 1 ? 's' : ''}`}>
          +{player.rebuys}
        </span>
      )}
      {busted && place != null && <span className="player__place">{ordinal(place)}</span>}

      <span className={`player__actions ${editing ? '' : 'controls-fade'}`}>
        {editing ? (
          <>
            {player.rebuys > 0 && (
              <button type="button" className="mini-btn" onClick={() => dispatch({ type: 'player/unrebuy', id })} title="Undo one rebuy">
                −1 rebuy
              </button>
            )}
            <button
              type="button"
              className="mini-btn mini-btn--danger"
              onClick={() => dispatch({ type: 'player/remove', id })}
              title="Remove player (takes their buy-in out of the pot)"
              aria-label={`Remove ${player.name}`}
            >
              <Icon name="trash" />
            </button>
          </>
        ) : (
          <>
            {rebuysEnabled && (
              <button
                type="button"
                className="mini-btn mini-btn--money"
                disabled={!rebuyAllowed}
                onClick={() => dispatch({ type: 'player/rebuy', id })}
                title={rebuyAllowed ? `Rebuy for ${rebuyPrice}` : 'Rebuys are closed for this player'}
                aria-label={`Rebuy for ${player.name}`}
              >
                <Icon name="dollar" />
              </button>
            )}
            {busted ? (
              <button
                type="button"
                className="mini-btn"
                onClick={() => dispatch({ type: 'player/unbust', id })}
                title="Undo bust"
                aria-label={`Bring ${player.name} back`}
              >
                <Icon name="undo" />
              </button>
            ) : (
              <button
                type="button"
                className="mini-btn mini-btn--danger"
                onClick={() => dispatch({ type: 'player/bust', id, now: Date.now() })}
                title="Busted out"
                aria-label={`Bust ${player.name}`}
              >
                <Icon name="skull" />
              </button>
            )}
          </>
        )}
      </span>
    </li>
  )
}

export function PlayersPanel({ game }: { game: Game }) {
  const { dispatch } = useTable()
  const [editing, setEditing] = useState(false)
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')

  const { config } = game
  const t = totals(game)
  const places = finishingPlaces(game.players)
  const alive = game.players.filter((p) => p.bustedAt == null)
  const busted = game.players
    .filter((p) => p.bustedAt != null)
    .sort((a, b) => (places.get(a.id) ?? 0) - (places.get(b.id) ?? 0))
  const payouts = payoutAmounts(t.pot, payoutPercents(config.payouts, t.entries))
  const open = rebuysOpen(game)
  const rebuyPrice = formatMoney(rebuyCost(config))
  const rebuyCount = `${t.rebuys} rebuy${t.rebuys === 1 ? '' : 's'}`

  const addPlayer = () => {
    const trimmed = name.trim()
    if (trimmed) dispatch({ type: 'player/add', id: uid(), name: trimmed })
    setName('')
    setAdding(false)
  }

  return (
    <section className={`panel players ${game.players.length > 10 ? 'is-dense' : ''}`} aria-label="Players">
      <header className="panel__head">
        <h2 className="panel__title">Players</h2>
        <span className="panel__sub">
          {t.alive} of {t.entries} left
        </span>
        <span className="players__tools controls-fade">
          <button
            type="button"
            className={`icon-btn ${adding ? 'is-active' : ''}`}
            onClick={() => setAdding((a) => !a)}
            title={`Add a player (${formatMoney(config.buyIn)} buy-in)`}
            aria-label="Add a player"
          >
            <Icon name="plus" />
          </button>
          <button
            type="button"
            className={`icon-btn ${editing ? 'is-active' : ''}`}
            onClick={() => setEditing((e) => !e)}
            aria-pressed={editing}
            title={editing ? 'Done editing' : 'Rename or remove players'}
            aria-label="Edit players"
          >
            <Icon name={editing ? 'close' : 'edit'} />
          </button>
        </span>
      </header>

      {adding && (
        <form
          className="inline-form players__add"
          onSubmit={(e) => {
            e.preventDefault()
            addPlayer()
          }}
        >
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Escape' && setAdding(false)}
            placeholder={`Name · ${formatMoney(config.buyIn)} buy-in`}
            aria-label="New player name"
          />
          <button type="submit" className="btn btn--small" disabled={!name.trim()}>
            Buy in
          </button>
        </form>
      )}

      <ul className="players__list">
        {game.players.length === 0 && <li className="players__empty">Nobody's bought in yet. Hit + to add players.</li>}
        {[...alive, ...busted].map((p) => (
          <PlayerRow
            key={p.id}
            player={p}
            place={places.get(p.id)}
            editing={editing}
            rebuysEnabled={config.rebuys.enabled}
            rebuyAllowed={canRebuy(game, p)}
            rebuyPrice={rebuyPrice}
            dispatch={dispatch}
          />
        ))}
      </ul>

      <footer className="pot">
        <div className="pot__label">Prize pool</div>
        <div className="pot__value">{formatMoney(t.pot)}</div>
        {t.pot > 0 && (
          <ol className="pot__payouts">
            {payouts.map((amount, i) => (
              <li key={i}>
                <span className="pot__place">{ordinal(i + 1)}</span> {formatMoney(amount)}
              </li>
            ))}
          </ol>
        )}
        {config.rebuys.enabled && (
          <div className={`rebuy-status ${open ? 'is-open' : ''}`}>
            {open
              ? config.rebuys.untilLevel != null
                ? `Rebuys open thru level ${config.rebuys.untilLevel} · ${rebuyPrice}`
                : `Rebuys open · ${rebuyPrice}`
              : 'Rebuys closed'}
            {t.rebuys > 0 && <span className="rebuy-status__count"> · {rebuyCount}</span>}
          </div>
        )}
      </footer>
    </section>
  )
}
