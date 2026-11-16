import react from '@vitejs/plugin-react'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { defineConfig, type Plugin } from 'vite'

// The parts of src/server/app.ts the dev server needs (it's loaded through Vite, not imported here).
interface DevHost {
  kind: 'main' | 'viewer' | 'www'
  bare: string
  proto: string
}
interface DevApp {
  classify(req: IncomingMessage): DevHost
  handleApi(req: IncomingMessage, res: ServerResponse, host: DevHost): Promise<void>
  dispose(): void
}

const isPage = (req: IncomingMessage) =>
  req.method === 'GET' && /^\/[A-Za-z0-9]*$/.test(new URL(req.url ?? '/', 'http://localhost').pathname)

/** Runs the API inside `npm run dev`. Open live.localhost:5173 for the player screen. */
function pokerpaloozaServer(): Plugin {
  return {
    name: 'pokerpalooza-server',
    configureServer(server) {
      let loaded: { module: unknown; app: DevApp } | null = null
      const getApp = async () => {
        const module = await server.ssrLoadModule('/src/server/app.ts')
        // Editing server code reloads the module; close the old one so its streams reconnect to the new one.
        if (loaded?.module !== module) {
          loaded?.app.dispose()
          const { createApp } = module as { createApp(options: { dataDir: string }): DevApp }
          loaded = { module, app: createApp({ dataDir: '.data' }) }
        }
        return loaded.app
      }

      server.middlewares.use(async (req, res, next) => {
        try {
          const app = await getApp()
          const host = app.classify(req)
          if (host.kind === 'www') {
            res.writeHead(301, { Location: `${host.proto}://${host.bare}${req.url ?? '/'}` }).end()
          } else if (req.url?.startsWith('/api/')) {
            await app.handleApi(req, res, host)
          } else {
            if (host.kind === 'viewer' && isPage(req)) req.url = '/viewer.html'
            next()
          }
        } catch (err) {
          next(err)
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ isSsrBuild }) => ({
  plugins: [react(), pokerpaloozaServer()],
  build: isSsrBuild
    ? {
        outDir: 'dist/server',
        target: 'node24',
        copyPublicDir: false,
        rollupOptions: { output: { entryFileNames: '[name].mjs' } },
      }
    : {
        outDir: 'dist/client',
        rollupOptions: { input: { main: 'index.html', viewer: 'viewer.html' } },
      },
}))
