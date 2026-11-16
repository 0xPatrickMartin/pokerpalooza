import fs from 'node:fs'
import http from 'node:http'
import type { AddressInfo } from 'node:net'
import os from 'node:os'
import path from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { DEFAULT_STRUCTURE, defaultTableState } from '../state/defaults'
import { createApp, type App } from './app'

let dir: string
let app: App
let server: http.Server
let port: number

beforeAll(async () => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pokerpalooza-http-'))
  app = createApp({ dataDir: dir })
  server = http.createServer((req, res) => void app.handleApi(req, res, app.classify(req)))
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  port = (server.address() as AddressInfo).port
})

afterAll(() => {
  app.dispose()
  server.close()
  fs.rmSync(dir, { recursive: true, force: true })
})

function request(method: string, url: string, host: string, body?: unknown): Promise<{ status: number; json: unknown }> {
  return new Promise((resolve, reject) => {
    const payload = body === undefined ? undefined : JSON.stringify(body)
    const req = http.request(
      { port, method, path: url, headers: { host, 'content-type': 'application/json' } },
      (res) => {
        let text = ''
        res.on('data', (chunk) => (text += chunk))
        res.on('end', () => resolve({ status: res.statusCode ?? 0, json: text ? JSON.parse(text) : null }))
      },
    )
    req.on('error', reject)
    req.end(payload)
  })
}

/** Minimal EventSource for tests: collects parsed events from a streaming response. */
function stream(url: string, host: string) {
  const events: { event: string; data: any }[] = []
  const waiters: (() => void)[] = []
  const req = http.get({ port, path: url, headers: { host } }, (res) => {
    let buffer = ''
    res.on('data', (chunk) => {
      buffer += chunk
      let end: number
      while ((end = buffer.indexOf('\n\n')) >= 0) {
        const block = buffer.slice(0, end)
        buffer = buffer.slice(end + 2)
        const event = /^event: (.*)$/m.exec(block)?.[1]
        const data = /^data: (.*)$/m.exec(block)?.[1]
        if (event && data) events.push({ event, data: JSON.parse(data) })
        waiters.splice(0).forEach((w) => w())
      }
    })
  })
  return {
    events,
    async next(event: string, after = 0) {
      for (;;) {
        const found = events.slice(after).find((e) => e.event === event)
        if (found) return found.data
        await new Promise<void>((resolve) => waiters.push(resolve))
      }
    },
    close: () => req.destroy(),
  }
}

describe('HTTP API', () => {
  it('syncs a table between devices and serves the read-only player view on the live subdomain', async () => {
    const tv = stream('/api/tables/hearts/stream?client=tv', 'd0cksey.com')
    const first = await tv.next('snapshot')
    expect(first).toMatchObject({ rev: 1, ack: 0, state: { game: null } })
    expect(first.viewerOrigin).toBe('http://live.d0cksey.com')

    const start = {
      type: 'game/start',
      config: defaultTableState().setup.config,
      structure: DEFAULT_STRUCTURE,
      players: [{ id: 'p1', name: 'Annie' }],
      gameId: 'g1',
      code: '',
      now: Date.now(),
    }
    const posted = await request('POST', '/api/tables/hearts/actions', 'd0cksey.com', { client: 'phone', actions: [{ seq: 1, action: start }] })
    expect(posted.status).toBe(200)

    const update = await tv.next('update')
    expect(update).toMatchObject({ by: 'phone', seq: 1, rev: 2 })
    const code: string = update.patch.game.code
    expect(code).toMatch(/^[A-Z2-9]{6}$/)

    const summary = await request('GET', '/api/tables', 'd0cksey.com')
    expect(summary.json).toMatchObject({ tables: expect.arrayContaining([expect.objectContaining({ id: 'hearts', status: 'ready', levelLabel: 'Level 1', entries: 1 })]) })

    // Players: lowercase codes work, unknown codes don't, and the host endpoints aren't reachable.
    expect((await request('GET', `/api/view/${code.toLowerCase()}`, 'live.d0cksey.com')).status).toBe(200)
    expect((await request('GET', '/api/view/ZZZZZZ', 'live.d0cksey.com')).status).toBe(404)
    expect((await request('GET', '/api/tables', 'live.d0cksey.com')).status).toBe(404)
    expect((await request('POST', '/api/tables/hearts/actions', 'live.d0cksey.com', { client: 'x', actions: [] })).status).toBe(404)

    const viewer = stream(`/api/view/${code}/stream`, 'live.d0cksey.com')
    expect(await viewer.next('snapshot')).toMatchObject({ table: 'hearts', code, current: { kind: 'blinds', number: 1 } })

    await request('POST', '/api/tables/hearts/actions', 'd0cksey.com', {
      client: 'phone',
      actions: [{ seq: 2, action: { type: 'level/goto', index: 1, now: Date.now() } }],
    })
    const moved = await viewer.next('snapshot', 1)
    expect(moved.current).toMatchObject({ number: 2, small: 50, big: 100 })

    tv.close()
    viewer.close()
  })

  it('rejects malformed requests', async () => {
    expect((await request('POST', '/api/tables/spades/actions', 'd0cksey.com', { actions: [] })).status).toBe(400)
    expect((await request('GET', '/api/tables/jokers/stream', 'd0cksey.com')).status).toBe(404)
  })
})
