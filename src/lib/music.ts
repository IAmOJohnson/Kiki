// A tiny music-box "Happy Birthday" synthesized with WebAudio, so no audio files are needed.
const G4 = 392
const A4 = 440
const B4 = 493.88
const C5 = 523.25
const D5 = 587.33
const E5 = 659.25
const F5 = 698.46
const G5 = 783.99

const MELODY: Array<[number, number]> = [
  [G4, 0.75], [G4, 0.25], [A4, 1], [G4, 1], [C5, 1], [B4, 2],
  [G4, 0.75], [G4, 0.25], [A4, 1], [G4, 1], [D5, 1], [C5, 2],
  [G4, 0.75], [G4, 0.25], [G5, 1], [E5, 1], [C5, 1], [B4, 1], [A4, 1],
  [F5, 0.75], [F5, 0.25], [E5, 1], [C5, 1], [D5, 1], [C5, 2],
]
const BEAT = 0.55
const LOOP_GAP = 1.5

let ctx: AudioContext | null = null
let timer: ReturnType<typeof setTimeout> | undefined
let audioEl: HTMLAudioElement | null = null

function schedule(audio: AudioContext) {
  let t = audio.currentTime + 0.05
  for (const [freq, beats] of MELODY) {
    const dur = beats * BEAT
    const osc = audio.createOscillator()
    const gain = audio.createGain()
    osc.type = 'triangle'
    osc.frequency.value = freq
    gain.gain.setValueAtTime(0, t)
    gain.gain.linearRampToValueAtTime(0.16, t + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur * 0.95)
    osc.connect(gain).connect(audio.destination)
    osc.start(t)
    osc.stop(t + dur)
    t += dur
  }
  timer = setTimeout(() => ctx && schedule(ctx), (t - audio.currentTime + LOOP_GAP) * 1000)
}

/** Plays the uploaded song on a loop when `src` is given, otherwise the built-in music box tune. */
export async function startMusic(src?: string): Promise<void> {
  if (ctx || audioEl) return
  if (src) {
    audioEl = new Audio(src)
    audioEl.loop = true
    try {
      await audioEl.play()
    } catch {
      audioEl = null
    }
    return
  }
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) return
  ctx = new Ctor()
  await ctx.resume()
  schedule(ctx)
}

export function stopMusic(): void {
  if (timer) clearTimeout(timer)
  timer = undefined
  void ctx?.close()
  ctx = null
  if (audioEl) {
    audioEl.pause()
    audioEl = null
  }
}

export function isMusicPlaying(): boolean {
  return ctx !== null || audioEl !== null
}
