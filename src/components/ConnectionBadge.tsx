import type { ConnectionStatus } from '../sync/connection'

export function ConnectionBadge({ status }: { status: ConnectionStatus }) {
  if (status === 'live') return null
  return (
    <div className="connection-badge" role="status">
      <span className="connection-badge__dot" aria-hidden="true" />
      {status === 'connecting' ? 'Connecting…' : 'Reconnecting…'}
    </div>
  )
}
