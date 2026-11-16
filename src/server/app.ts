import type { IncomingMessage, ServerResponse } from 'node:http'
import { isTableId } from '../state/tables'
import { CODE_LENGTH } from '../state/viewer'
import { classifyHost, viewerOrigin, type HostInfo } from './hosts'
import { HttpError, openEventStream, readJson, sendJson } from './http'
import { TableManager } from './tables'

export interface AppOptions {
  dataDir: string
  /** Subdomain for the read-only player screen, e.g. "live" for live.d0cksey.com */
  viewerSubdomain?: string
}

export interface App {
  classify(req: IncomingMessage): HostInfo
  /** Handles every /api/ request */
  handleApi(req: IncomingMessage, res: ServerResponse, host: HostInfo): Promise<void>
  dispose(): void
}

const normalizeCode = (raw: string) => raw.toUpperCase().replace(/[^A-Z0-9]/g, '')

export function createApp({ dataDir, viewerSubdomain = 'live' }: AppOptions): App {
  const tables = new TableManager(dataDir)

  async function hostApi(req: IncomingMessage, res: ServerResponse, host: HostInfo, url: URL, parts: string[]) {
    if (parts[1] !== 'tables') throw new HttpError(404, 'Not found')
    if (parts.length === 2 && req.method === 'GET') {
      sendJson(res, 200, { tables: tables.summary(), serverTime: Date.now() })
      return
    }
    const id = parts[2]
    if (!id || !isTableId(id)) throw new HttpError(404, 'No such table')

    if (parts[3] === 'stream' && req.method === 'GET') {
      const client = url.searchParams.get('client') ?? ''
      let remove: (() => void) | undefined
      const sub = openEventStream(res, () => remove?.())
      sub.send('snapshot', { ...tables.hostSnapshot(id, client), viewerOrigin: viewerOrigin(host, viewerSubdomain) })
      remove = tables.addHost(id, sub)
      return
    }

    if (parts[3] === 'actions' && req.method === 'POST') {
      const body = (await readJson(req)) as { client?: unknown; actions?: unknown } | null
      if (typeof body?.client !== 'string' || !body.client || !Array.isArray(body.actions)) {
        throw new HttpError(400, 'Expected { client, actions }')
      }
      tables.apply(id, body.client, body.actions)
      sendJson(res, 200, { ok: true, serverTime: Date.now() })
      return
    }

    throw new HttpError(404, 'Not found')
  }

  // The live subdomain only ever reads, so it gets no access to the host endpoints.
  function viewerApi(req: IncomingMessage, res: ServerResponse, parts: string[]) {
    if (parts[1] !== 'view' || req.method !== 'GET') throw new HttpError(404, 'Not found')
    const code = normalizeCode(parts[2] ?? '')
    if (code.length !== CODE_LENGTH || !tables.findByCode(code)) throw new HttpError(404, 'No game with that code')

    if (parts.length === 3) {
      sendJson(res, 200, { ok: true, code })
      return
    }
    if (parts[3] === 'stream') {
      let remove: (() => void) | undefined
      const sub = openEventStream(res, () => remove?.())
      remove = tables.addViewer(code, sub) ?? undefined
      return
    }
    throw new HttpError(404, 'Not found')
  }

  async function handleApi(req: IncomingMessage, res: ServerResponse, host: HostInfo) {
    const url = new URL(req.url ?? '/', 'http://localhost')
    const parts = url.pathname.split('/').filter(Boolean)
    try {
      if (parts[1] === 'time' && req.method === 'GET') sendJson(res, 200, { serverTime: Date.now() })
      else if (host.kind === 'viewer') viewerApi(req, res, parts)
      else await hostApi(req, res, host, url, parts)
    } catch (err) {
      if (res.headersSent) return
      if (err instanceof HttpError) {
        sendJson(res, err.status, { error: err.message })
      } else {
        console.error(err)
        sendJson(res, 500, { error: 'Something went wrong' })
      }
    }
  }

  return {
    classify: (req) => classifyHost(req, viewerSubdomain),
    handleApi,
    dispose: () => tables.dispose(),
  }
}
