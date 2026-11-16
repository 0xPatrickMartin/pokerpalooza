# Pokerpalooza

A saloon-themed tournament clock for home Texas Hold'em games: a big neon timer, the blind ladder, who's bought in, the prize pool, and your own chips on screen.

There are four tables (♠ Spades, ♥ Hearts, ♦ Diamonds, ♣ Clubs), so up to four hosts can each run their own game at the same time. A table's game, chips and setup live on the server, so every device opened to that table stays in sync: the clock can run on the TV while the host works the controls from a phone. Players can follow along read-only on their own phones at the `live.` subdomain with the 6-character code (or QR code) shown on the game screen.

## Running it

Requires Node 20+.

```sh
npm install
npm run dev
```

Open the URL it prints (usually http://localhost:5173), pick a table, then press **F** for full screen. The player screen is at http://live.localhost:5173. Games made in development are saved in `.data/`.

To try the production build locally: `npm run build && npm start`, then open http://localhost:3000.

## Deploying with Docker

The `Dockerfile` builds the app into a small Node image that serves everything on port 3000. It's made to sit behind [nginx-proxy](https://github.com/nginx-proxy/nginx-proxy) with [acme-companion](https://github.com/nginx-proxy/acme-companion), which route the domains to it and take care of the HTTPS certificates.

On the server, with DNS for `d0cksey.com`, `www.d0cksey.com` and `live.d0cksey.com` pointing at it:

```sh
docker build -t pokerpalooza https://github.com/0xPatrickMartin/pokerpalooza.git
docker rm -f pokerpalooza 2>/dev/null; docker run -d --name pokerpalooza --restart unless-stopped \
  -v pokerpalooza-data:/data \
  -e VIRTUAL_HOST=d0cksey.com,www.d0cksey.com,live.d0cksey.com \
  -e LETSENCRYPT_HOST=d0cksey.com,www.d0cksey.com,live.d0cksey.com \
  pokerpalooza
```

Run the same two commands to deploy a new version.

- Docker builds straight from GitHub, so nothing needs to be cloned. Add `#branch-name` to the URL to build a branch other than `main`.
- The tables are saved in the `pokerpalooza-data` volume, so games and chip photos survive redeploys. Keep the `-v` flag, or they're lost when the container is replaced.
- If your other site containers use a `--network` flag, add the same one to `docker run`.
- Visitors to `www.d0cksey.com` are sent to `d0cksey.com`. If `www` doesn't point at the server, leave it out of both variables, or the certificate can't be issued.
- The player screen uses the `live.` subdomain. To use another one, say `watch.`, put `watch.d0cksey.com` in both variables instead of `live.d0cksey.com` and add `-e VIEWER_SUBDOMAIN=watch`.

Hosts don't log in yet: anyone who opens `d0cksey.com/spades` can run the Spades table. The player screen is read-only.

## Using it

**Pick a table** on the home page; each card shows whether a game is running there.

**Setup** (shown when the table has no game):

- **The stakes:** buy-in, starting chips, and how long each blind level lasts.
- **Players:** type names, or paste a comma/line separated list. Everyone listed is bought in.
- **Rebuys:** on/off, plus optional price, chips, per-player limit and last level they're allowed.
- **Blind structure:** generated from your first small blind and smallest chip (Standard or Turbo pace, optional breaks and antes). Every row can be edited by hand.
- **Chips:** upload a photo of each chip (or one photo of the whole set), drag/zoom it into the ring, and enter its value.
- **Alarm:** five deliberately obnoxious sounds, chosen per device, so the TV can blare while your phone stays quiet.

**During the game:**

- When a level's time runs out, the alarm sounds, the screen flashes, and the blinds move to the next level. The clock waits for someone to press **Start**. The server ends levels on time even if no screen is open.
- Use the skull button to bust a player and **$** to record a rebuy. The pencil button renames or removes players, and **+** adds a late arrival.
- The QR code and code in the bottom-right corner open the player screen; tap it for a bigger version. Each new game gets a new code.
- The controls fade out after a few seconds without mouse movement while the clock runs, leaving a clean display.
- **Menu (☰):** change any setting mid-game, edit chips, switch the alarm sound, switch tables, or end the game.

| Key | Action |
| --- | --- |
| Space | Start / pause |
| → / ← | Next / previous level |
| + / − | Add / remove a minute |
| M | Mute this screen |
| F | Full screen |
| Esc | Dismiss the alarm |

Browsers only allow sound after you've interacted with the page. If you reload mid-game, tap anywhere once so the alarm can play (a banner reminds you).

## Development

- `npm test`: unit tests for the game logic, the server's tables and its HTTP API
- `npm run lint`: oxlint
- `npm run build`: type-check, then build the browser pages (`dist/client`) and the server (`dist/server`)

Built with React, TypeScript and Vite, plus a dependency-free Node server (`src/server`). Every device and the server run the same reducer (`src/state/reducer.ts`); devices send actions, and the server applies them and streams the results back with server-sent events. The alarm sounds are synthesized with the Web Audio API, and the wood grain is a procedural SVG (`src/assets/wood.svg`).
