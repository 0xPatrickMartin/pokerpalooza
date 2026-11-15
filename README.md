# Pokerpalooza

A saloon-themed tournament clock for home Texas Hold'em games: a big neon timer, the blind ladder, who's bought in, the prize pool, and your own chips on screen. It runs entirely in the browser. There's no server, and everything (including chip photos) is saved in the browser on that device.

## Running it

Requires Node 20+.

```sh
npm install
npm run dev
```

Open the URL it prints (usually http://localhost:5173), then press **F** for full screen.

To put the clock on a TV or tablet on the same Wi‑Fi, run `npm run dev -- --host` and open the "Network" URL it prints on that device.

To host it somewhere, run `npm run build` and serve the `dist/` folder from any static host. `npm run preview` does this locally.

## Deploying with Docker

The `Dockerfile` builds the app and packs it into a small nginx image that serves it on port 80. It's made to sit behind [nginx-proxy](https://github.com/nginx-proxy/nginx-proxy) with [acme-companion](https://github.com/nginx-proxy/acme-companion), which route the domain to it and take care of the HTTPS certificate.

On the server, with DNS for `d0cksey.com` and `www.d0cksey.com` pointing at it:

```sh
docker build -t pokerpalooza https://github.com/0xPatrickMartin/pokerpalooza.git
docker rm -f pokerpalooza 2>/dev/null; docker run -d --name pokerpalooza --restart unless-stopped \
  -e VIRTUAL_HOST=d0cksey.com,www.d0cksey.com \
  -e LETSENCRYPT_HOST=d0cksey.com,www.d0cksey.com \
  pokerpalooza
```

Run the same two commands to deploy a new version.

- Docker builds straight from GitHub, so nothing needs to be cloned. Add `#branch-name` to the URL to build a branch other than `main`.
- If your other site containers use a `--network` flag, add the same one to `docker run`.
- Visitors to `www.d0cksey.com` are sent to `d0cksey.com`, since the app saves games and chip photos per web address. If `www` doesn't point at the server, leave it out of both variables, or the certificate can't be issued.

## Using it

**Setup** (shown when no game is in progress):

- **The stakes:** buy-in, starting chips, and how long each blind level lasts.
- **Players:** type names, or paste a comma/line separated list. Everyone listed is bought in.
- **Rebuys:** on/off, plus optional price, chips, per-player limit and last level they're allowed.
- **Blind structure:** generated from your first small blind and smallest chip (Standard or Turbo pace, optional breaks and antes). Every row can be edited by hand.
- **Chips:** upload a photo of each chip (or one photo of the whole set), drag/zoom it into the ring, and enter its value.
- **Alarm:** five deliberately obnoxious sounds to choose from, with previews.

**During the game:**

- When a level's time runs out, the alarm sounds, the screen flashes, and the blinds move to the next level. The clock waits for someone to press **Start**.
- Use the skull button to bust a player and **$** to record a rebuy. The pencil button renames or removes players, and **+** adds a late arrival.
- The controls fade out after a few seconds without mouse movement while the clock runs, leaving a clean display.
- **Menu (☰):** change any setting mid-game, edit chips, switch the alarm sound, or end the game.

| Key | Action |
| --- | --- |
| Space | Start / pause |
| → / ← | Next / previous level |
| + / − | Add / remove a minute |
| M | Mute |
| F | Full screen |
| Esc | Dismiss the alarm |

Browsers only allow sound after you've interacted with the page. If you reload mid-game, tap anywhere once so the alarm can play (a banner reminds you).

## Development

- `npm test`: unit tests for the clock and blind-structure logic
- `npm run lint`: oxlint
- `npm run build`: type-check and production build

Built with React, TypeScript and Vite. The alarm sounds are synthesized with the Web Audio API, and the wood grain is a procedural SVG (`src/assets/wood.svg`).
