// crypto.randomUUID only exists in secure contexts, and this app may be opened over plain http on a LAN.
export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)
}
