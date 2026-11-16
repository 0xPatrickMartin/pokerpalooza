import fs from 'node:fs'
import type { IncomingMessage, ServerResponse } from 'node:http'
import path from 'node:path'
import zlib from 'node:zlib'

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
}
const COMPRESSIBLE = new Set(['.html', '.js', '.css', '.svg', '.json'])

interface Entry {
  body: Buffer
  type: string
  gzip?: Buffer
  br?: Buffer
}

/** Serves the built client. Files never change while the server runs, so each is read and compressed once. */
export function createStatic(root: string) {
  const cache = new Map<string, Entry>()

  function load(rel: string): Entry | null {
    const hit = cache.get(rel)
    if (hit) return hit
    const file = path.join(root, rel)
    if (!file.startsWith(root + path.sep)) return null
    let body: Buffer
    try {
      if (!fs.statSync(file).isFile()) return null
      body = fs.readFileSync(file)
    } catch {
      return null
    }
    const ext = path.extname(file)
    const entry: Entry = { body, type: TYPES[ext] ?? 'application/octet-stream' }
    if (COMPRESSIBLE.has(ext) && body.length > 1024) {
      entry.gzip = zlib.gzipSync(body, { level: 9 })
      entry.br = zlib.brotliCompressSync(body)
    }
    cache.set(rel, entry)
    return entry
  }

  return function serve(req: IncomingMessage, res: ServerResponse, html: string): void {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, { Allow: 'GET, HEAD' }).end()
      return
    }
    let pathname: string
    try {
      pathname = decodeURIComponent(new URL(req.url ?? '/', 'http://localhost').pathname)
    } catch {
      res.writeHead(400).end()
      return
    }

    // Page addresses (/, /spades, /K7M2QX) all get the app's HTML; real files are served as-is.
    let entry = pathname.endsWith('.html') ? null : load(pathname.slice(1))
    let cacheControl = pathname.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'public, max-age=3600'
    if (!entry) {
      if (path.extname(pathname) && !pathname.endsWith('.html')) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Not found')
        return
      }
      entry = load(html)
      cacheControl = 'no-cache'
      if (!entry) {
        res.writeHead(500).end('Client build missing')
        return
      }
    }

    const accepts = String(req.headers['accept-encoding'] ?? '')
    const headers: Record<string, string | number> = {
      'Content-Type': entry.type,
      'Cache-Control': cacheControl,
      'X-Content-Type-Options': 'nosniff',
      Vary: 'Accept-Encoding',
    }
    let body = entry.body
    if (entry.br && /\bbr\b/.test(accepts)) {
      body = entry.br
      headers['Content-Encoding'] = 'br'
    } else if (entry.gzip && /\bgzip\b/.test(accepts)) {
      body = entry.gzip
      headers['Content-Encoding'] = 'gzip'
    }
    headers['Content-Length'] = body.length
    res.writeHead(200, headers)
    res.end(req.method === 'HEAD' ? undefined : body)
  }
}
