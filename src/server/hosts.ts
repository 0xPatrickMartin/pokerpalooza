import type { IncomingMessage } from 'node:http'

export interface HostInfo {
  /** main: d0cksey.com · viewer: live.d0cksey.com · www: www.d0cksey.com */
  kind: 'main' | 'viewer' | 'www'
  /** Host without the www. or viewer prefix, including any port */
  bare: string
  proto: 'http' | 'https'
}

export function classifyHost(req: IncomingMessage, viewerSubdomain: string): HostInfo {
  const host = String(req.headers.host ?? 'localhost').toLowerCase()
  // Set by nginx-proxy; the app itself only ever speaks plain http.
  const forwarded = String(req.headers['x-forwarded-proto'] ?? '').split(',')[0].trim()
  const proto = forwarded === 'https' ? 'https' : 'http'
  if (host.startsWith('www.')) return { kind: 'www', bare: host.slice(4), proto }
  const prefix = `${viewerSubdomain}.`
  if (host.startsWith(prefix)) return { kind: 'viewer', bare: host.slice(prefix.length), proto }
  return { kind: 'main', bare: host, proto }
}

export function viewerOrigin(host: HostInfo, viewerSubdomain: string): string {
  return `${host.proto}://${viewerSubdomain}.${host.bare}`
}
