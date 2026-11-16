import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Subscriber } from './tables'

export class HttpError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export function sendJson(res: ServerResponse, status: number, body: unknown): void {
  const json = JSON.stringify(body)
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(json),
    'Cache-Control': 'no-store',
  })
  res.end(json)
}

export function readJson(req: IncomingMessage, limit = 2_000_000): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    let size = 0
    req.on('data', (chunk: Buffer) => {
      size += chunk.length
      if (size > limit) {
        reject(new HttpError(413, 'Request too large'))
        req.destroy()
      } else {
        chunks.push(chunk)
      }
    })
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')))
      } catch {
        reject(new HttpError(400, 'Invalid JSON'))
      }
    })
    req.on('error', reject)
  })
}

/** Server-sent events: a response that stays open so the server can push updates to the browser. */
export function openEventStream(res: ServerResponse, onClose: () => void): Subscriber {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    // Tells nginx (and nginx-proxy) to pass events through immediately instead of buffering them.
    'X-Accel-Buffering': 'no',
  })
  res.write('retry: 2000\n\n')
  // Proxies drop connections that are quiet for a minute.
  const heartbeat = setInterval(() => res.write(': ping\n\n'), 20_000)
  let closed = false
  res.on('close', () => {
    if (closed) return
    closed = true
    clearInterval(heartbeat)
    onClose()
  })
  return {
    send(event, data) {
      if (!closed) res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
    },
    close() {
      res.end()
    },
  }
}
