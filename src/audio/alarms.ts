import type { AlarmId } from '../state/types'

export const ALARMS: { id: AlarmId; name: string; blurb: string }[] = [
  { id: 'airhorn', name: 'Air Horn', blurb: 'BWAMP. BWAMP. BWAAAAAMP.' },
  { id: 'train', name: 'Steam Train', blurb: 'The 3:10 to Yuma, right through the parlor' },
  { id: 'gunfight', name: 'Six-Shooter', blurb: 'Six shots and a couple of ricochets' },
  { id: 'klaxon', name: 'Aoogah Klaxon', blurb: 'Horseless-carriage horn, three honks' },
  { id: 'stampede', name: 'Stampede', blurb: 'Gunfire, air horn, then the train. You were warned.' },
]

/** Schedules a sound starting at `t0` (AudioContext time) and returns its length in seconds. */
type Synth = (ctx: AudioContext, out: AudioNode, t0: number) => number

let noiseCache: AudioBuffer | null = null
function noiseBuffer(ctx: AudioContext): AudioBuffer {
  if (noiseCache?.sampleRate === ctx.sampleRate) return noiseCache
  const length = ctx.sampleRate * 2
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1
  noiseCache = buffer
  return buffer
}

function distortion(ctx: AudioContext, amount: number): WaveShaperNode {
  const n = 1024
  const curve = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / n - 1
    curve[i] = ((1 + amount) * x) / (1 + amount * Math.abs(x))
  }
  const shaper = ctx.createWaveShaper()
  shaper.curve = curve
  shaper.oversample = '4x'
  return shaper
}

/** Attack, hold at `peak`, then release. Exponential ramps can't reach zero, hence 0.0001. */
function envelope(param: AudioParam, start: number, end: number, peak: number, attack: number, release: number) {
  param.setValueAtTime(0.0001, start)
  param.exponentialRampToValueAtTime(peak, start + attack)
  param.setValueAtTime(peak, end)
  param.exponentialRampToValueAtTime(0.0001, end + release)
}

function hornBlast(ctx: AudioContext, out: AudioNode, t: number, dur: number) {
  const end = t + dur
  const drive = ctx.createGain()
  const body = ctx.createBiquadFilter()
  body.type = 'peaking'
  body.frequency.value = 1400
  body.Q.value = 0.9
  body.gain.value = 9
  const tame = ctx.createBiquadFilter()
  tame.type = 'lowpass'
  tame.frequency.value = 6000
  const amp = ctx.createGain()
  envelope(amp.gain, t, end, 0.55, 0.025, 0.07)
  drive.connect(distortion(ctx, 30)).connect(body).connect(tame).connect(amp).connect(out)

  for (const f of [455, 459, 227.5, 683]) {
    const osc = ctx.createOscillator()
    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(f * 0.86, t)
    osc.frequency.exponentialRampToValueAtTime(f, t + 0.06)
    osc.frequency.setValueAtTime(f, end)
    osc.frequency.exponentialRampToValueAtTime(f * 0.94, end + 0.07)
    const g = ctx.createGain()
    g.gain.value = f < 300 ? 0.35 : 0.25
    osc.connect(g).connect(drive)
    osc.start(t)
    osc.stop(end + 0.1)
  }
}

const airhorn: Synth = (ctx, out, t0) => {
  const blasts: [number, number][] = [
    [0, 0.18], [0.28, 0.18], [0.56, 0.95],
    [1.75, 0.18], [2.03, 0.18], [2.31, 1.35],
  ]
  for (const [at, dur] of blasts) hornBlast(ctx, out, t0 + at, dur)
  return 3.8
}

function whistle(ctx: AudioContext, out: AudioNode, t: number, dur: number) {
  const end = t + dur
  const amp = ctx.createGain()
  envelope(amp.gain, t, end, 0.85, 0.12, 0.25)
  const tone = ctx.createBiquadFilter()
  tone.type = 'lowpass'
  tone.frequency.value = 2200
  tone.Q.value = 0.7
  tone.connect(amp).connect(out)

  const vibrato = ctx.createOscillator()
  vibrato.frequency.value = 5.5
  const vibratoDepth = ctx.createGain()
  vibratoDepth.gain.value = 3
  vibrato.connect(vibratoDepth)
  vibrato.start(t)
  vibrato.stop(end + 0.3)

  // Five-chime chord with the classic "scoop" up to pitch as the steam builds.
  for (const f of [311.1, 370, 415.3, 493.9, 622.3]) {
    const osc = ctx.createOscillator()
    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(f * 0.93, t)
    osc.frequency.exponentialRampToValueAtTime(f, t + 0.18)
    osc.frequency.setValueAtTime(f, end)
    osc.frequency.exponentialRampToValueAtTime(f * 0.96, end + 0.25)
    vibratoDepth.connect(osc.frequency)
    const g = ctx.createGain()
    g.gain.value = 0.2
    osc.connect(g).connect(tone)
    osc.start(t)
    osc.stop(end + 0.3)
  }

  const hiss = ctx.createBufferSource()
  hiss.buffer = noiseBuffer(ctx)
  hiss.loop = true
  const band = ctx.createBiquadFilter()
  band.type = 'bandpass'
  band.frequency.value = 2600
  band.Q.value = 0.8
  const hissGain = ctx.createGain()
  hissGain.gain.value = 0.12
  hiss.connect(band).connect(hissGain).connect(amp)
  hiss.start(t, Math.random())
  hiss.stop(end + 0.3)
}

const train: Synth = (ctx, out, t0) => {
  // Long, long, short, long: the railroad crossing signal.
  const toots: [number, number][] = [[0, 1.0], [1.25, 1.0], [2.5, 0.4], [3.1, 1.7]]
  for (const [at, dur] of toots) whistle(ctx, out, t0 + at, dur)
  return 5.1
}

function gunshot(ctx: AudioContext, out: AudioNode, t: number) {
  const crack = ctx.createBufferSource()
  crack.buffer = noiseBuffer(ctx)
  const lp = ctx.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.setValueAtTime(9000, t)
  lp.frequency.exponentialRampToValueAtTime(400, t + 0.3)
  const crackGain = ctx.createGain()
  crackGain.gain.setValueAtTime(0.0001, t)
  crackGain.gain.exponentialRampToValueAtTime(1.4, t + 0.002)
  crackGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.45)
  crack.connect(lp).connect(crackGain).connect(out)
  crack.start(t, Math.random() * 1.4)
  crack.stop(t + 0.5)

  const boom = ctx.createOscillator()
  boom.frequency.setValueAtTime(160, t)
  boom.frequency.exponentialRampToValueAtTime(38, t + 0.2)
  const boomGain = ctx.createGain()
  boomGain.gain.setValueAtTime(0.0001, t)
  boomGain.gain.exponentialRampToValueAtTime(1, t + 0.004)
  boomGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.3)
  boom.connect(boomGain).connect(out)
  boom.start(t)
  boom.stop(t + 0.32)
}

function ricochet(ctx: AudioContext, out: AudioNode, t: number) {
  const osc = ctx.createOscillator()
  osc.frequency.setValueAtTime(3400, t)
  osc.frequency.exponentialRampToValueAtTime(650, t + 0.75)
  const wobble = ctx.createOscillator()
  wobble.frequency.value = 28
  const wobbleDepth = ctx.createGain()
  wobbleDepth.gain.value = 90
  wobble.connect(wobbleDepth).connect(osc.frequency)
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(0.6, t + 0.02)
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.8)
  osc.connect(g).connect(out)
  for (const node of [osc, wobble]) {
    node.start(t)
    node.stop(t + 0.82)
  }
}

const gunfight: Synth = (ctx, out, t0) => {
  const shots = [0, 0.3, 0.6, 1.15, 1.35, 1.55]
  shots.forEach((at, i) => {
    gunshot(ctx, out, t0 + at)
    if (i === 2 || i === 5) ricochet(ctx, out, t0 + at + 0.06)
  })
  return 2.5
}

function aoogah(ctx: AudioContext, out: AudioNode, t: number) {
  const formant = ctx.createBiquadFilter()
  formant.type = 'bandpass'
  formant.Q.value = 3
  formant.frequency.setValueAtTime(350, t)
  formant.frequency.exponentialRampToValueAtTime(1600, t + 0.45)
  formant.frequency.setValueAtTime(1600, t + 0.7)
  formant.frequency.exponentialRampToValueAtTime(900, t + 0.85)
  const amp = ctx.createGain()
  envelope(amp.gain, t, t + 0.78, 1.2, 0.04, 0.1)
  const shaper = distortion(ctx, 50)
  shaper.connect(formant).connect(amp).connect(out)

  for (const [type, detune] of [['sawtooth', 0], ['square', 12]] as const) {
    const osc = ctx.createOscillator()
    osc.type = type
    osc.detune.value = detune
    osc.frequency.setValueAtTime(95, t)
    osc.frequency.exponentialRampToValueAtTime(300, t + 0.42)
    osc.frequency.linearRampToValueAtTime(285, t + 0.85)
    const g = ctx.createGain()
    g.gain.value = 0.4
    osc.connect(g).connect(shaper)
    osc.start(t)
    osc.stop(t + 0.9)
  }
}

const klaxon: Synth = (ctx, out, t0) => {
  for (let i = 0; i < 3; i++) aoogah(ctx, out, t0 + i * 1.0)
  return 3.0
}

const stampede: Synth = (ctx, out, t0) => {
  gunfight(ctx, out, t0)
  airhorn(ctx, out, t0 + 1.9)
  train(ctx, out, t0 + 5.6)
  return 10.7
}

const SYNTHS: Record<AlarmId, Synth> = { airhorn, train, gunfight, klaxon, stampede }

class AlarmEngine {
  private ctx: AudioContext | null = null
  private input: AudioNode | null = null
  private master: GainNode | null = null
  private bus: GainNode | null = null
  private volume = 0.85

  /** Browsers only allow audio after a user gesture, so call this from click/key handlers. */
  unlock(): void {
    this.context()
  }

  get ready(): boolean {
    return this.ctx?.state === 'running'
  }

  setVolume(volume: number): void {
    this.volume = volume
    if (this.ctx && this.master) this.master.gain.setTargetAtTime(volume, this.ctx.currentTime, 0.02)
  }

  /** Plays an alarm, cutting off any alarm already sounding. Returns its length in seconds. */
  play(id: AlarmId): number {
    const ctx = this.context()
    if (!ctx || !this.input) return 0
    this.stop()
    const bus = ctx.createGain()
    bus.connect(this.input)
    this.bus = bus
    const seconds = SYNTHS[id](ctx, bus, ctx.currentTime + 0.03)
    window.setTimeout(() => {
      if (this.bus === bus) this.bus = null
      bus.disconnect()
    }, (seconds + 1) * 1000)
    return seconds
  }

  stop(): void {
    const { bus, ctx } = this
    if (!bus || !ctx) return
    this.bus = null
    bus.gain.setTargetAtTime(0, ctx.currentTime, 0.03)
    window.setTimeout(() => bus.disconnect(), 300)
  }

  private context(): AudioContext | null {
    if (!this.ctx) {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!Ctor) return null
      // Lets iPhones/iPads play the alarm even with the ringer switch on silent.
      const session = (navigator as unknown as { audioSession?: { type: string } }).audioSession
      if (session) session.type = 'playback'

      const ctx = new Ctor()
      const limiter = ctx.createDynamicsCompressor()
      limiter.threshold.value = -10
      limiter.knee.value = 4
      limiter.ratio.value = 12
      limiter.attack.value = 0.002
      limiter.release.value = 0.2
      const master = ctx.createGain()
      master.gain.value = this.volume
      limiter.connect(master).connect(ctx.destination)
      this.ctx = ctx
      this.input = limiter
      this.master = master
    }
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {})
    return this.ctx
  }
}

export const alarms = new AlarmEngine()
