// Every screen counts down against the server's clock, not its own, so the TV, the host's phone
// and the players' phones all hit 00:00 together even if one device's clock is a few seconds off.
let offset = 0
const samples: { rtt: number; offset: number }[] = []

export function serverNow(): number {
  return Date.now() + offset
}

function addSample(serverTime: number, sentAt: number, receivedAt: number): void {
  const rtt = receivedAt - sentAt
  if (!Number.isFinite(serverTime) || rtt < 0 || rtt > 2000) return
  samples.push({ rtt, offset: serverTime - (sentAt + receivedAt) / 2 })
  if (samples.length > 10) samples.shift()
  // The quickest round trip has the least network delay mixed in.
  offset = samples.reduce((best, s) => (s.rtt < best.rtt ? s : best)).offset
}

/** Measures the offset with a few tiny requests that do nothing but return the server's time. */
export async function syncClock(rounds = 3): Promise<void> {
  for (let i = 0; i < rounds; i++) {
    const sentAt = Date.now()
    try {
      const res = await fetch('/api/time', { cache: 'no-store' })
      const { serverTime } = (await res.json()) as { serverTime: number }
      addSample(serverTime, sentAt, Date.now())
    } catch {
      return
    }
  }
}
