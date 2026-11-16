import { Modal } from '../Modal'
import { QrCode } from './QrCode'

const displayHost = (url: string) => url.replace(/^https?:\/\//, '').replace(/\/.*$/, '')

/** Small corner tile on the game screen; tap it for a code big enough to scan from across the table. */
export function LiveCodeTile({ code, url, onOpen }: { code: string; url: string | null; onOpen: () => void }) {
  return (
    <button type="button" className="live-tile" onClick={onOpen} disabled={!url} title="Players: scan to follow the clock on your phone">
      {url ? <QrCode value={url} label="QR code for the player screen" className="live-tile__qr" /> : <span className="live-tile__qr" />}
      <span className="live-tile__text">
        <span className="live-tile__label">Follow live</span>
        <span className="live-tile__code">{code || '······'}</span>
      </span>
    </button>
  )
}

export function LiveCodeModal({ code, url, onClose }: { code: string; url: string; onClose: () => void }) {
  return (
    <Modal title="Follow along on your phone" size="sm" onClose={onClose}>
      <div className="live-modal">
        <QrCode value={url} label={`QR code for ${url}`} className="live-modal__qr" />
        <p className="live-modal__or">
          Scan it, or go to <strong>{displayHost(url)}</strong> and enter
        </p>
        <div className="live-modal__code" aria-label={`Code ${code.split('').join(' ')}`}>
          {code}
        </div>
        <p className="field__hint">Shows the clock, the blinds and the chip values. A new game gets a new code.</p>
      </div>
    </Modal>
  )
}
