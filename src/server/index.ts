import http from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createApp } from './app'
import { createStatic } from './static'

const here = path.dirname(fileURLToPath(import.meta.url))
const app = createApp({
  dataDir: process.env.DATA_DIR ?? path.resolve('.data'),
  viewerSubdomain: process.env.VIEWER_SUBDOMAIN || undefined,
})
const serveStatic = createStatic(path.resolve(here, '../client'))

const server = http.createServer((req, res) => {
  const host = app.classify(req)
  if (host.kind === 'www') {
    res.writeHead(301, { Location: `${host.proto}://${host.bare}${req.url ?? '/'}` }).end()
    return
  }
  if (req.url?.startsWith('/api/')) {
    void app.handleApi(req, res, host)
    return
  }
  serveStatic(req, res, host.kind === 'viewer' ? 'viewer.html' : 'index.html')
})

const port = Number(process.env.PORT ?? 3000)
server.listen(port, () => console.log(`Pokerpalooza is open on port ${port}`))

// `docker stop` sends SIGTERM, which Node ignores by default when it runs as the container's main process.
for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  process.on(signal, () => {
    app.dispose()
    process.exit(0)
  })
}
