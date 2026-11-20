// Spectral waveform. Partials are fixed per seed. Motion is continuous
// phase and amplitude, so the same time and pointer redraw the same frame.

export const DEFAULT_SEED = 0xc077e7
export const BIN_COUNT = 128

export function createWave(seed = DEFAULT_SEED) {
  const rand = mulberry32(seed)
  const partials = []
  for (let i = 0; i < 5; i++) {
    partials.push({
      freq: 0.85 + i * 0.55 + rand() * 0.15,
      speed: 0.55 + rand() * 0.7,
      rate: 0.18 + rand() * 0.28,
      phase: rand() * Math.PI * 2,
      weight: 0.55 + rand() * 0.6,
    })
  }
  return { seed: seed >>> 0, partials, bins: BIN_COUNT }
}

// pointer: { x, y, weight } across the wave (0 to 1). weight 0 ignores it.
export function sampleWave(wave, t, pointer = null) {
  const bins = wave.bins
  const amps = new Array(bins)
  const signed = new Array(bins)
  const weight = pointer && Number.isFinite(pointer.weight) ? clamp01(pointer.weight) : 0
  const px = pointer && Number.isFinite(pointer.x) ? clamp01(pointer.x) : 0.5
  const py = pointer && Number.isFinite(pointer.y) ? clamp01(pointer.y) : 0.5
  const breath = 0.82 + 0.18 * Math.sin(t * 0.47)
  const lift = 1 + weight * (py - 0.5) * 0.18
  let peak = -1
  let peakIndex = 0

  for (let i = 0; i < bins; i++) {
    const u = i / (bins - 1)
    // Two slow partials draw the lobes. The rest only ripple the contour,
    // so the silhouette stays a waveform instead of averaging flat.
    const shape = mixPartials(wave.partials.slice(0, 2), u, t, true)
    const ripple = mixPartials(wave.partials.slice(2), u, t, true)
    const raw = mixPartials(wave.partials, u, t, false)
    const edge = 0.78 + 0.22 * Math.sin(u * Math.PI)
    let mag = (0.12 + 0.88 * shape) * (0.88 + 0.12 * ripple) * edge * breath * lift * (1 - weight * 0.45)
    if (weight > 0) {
      const du = u - px
      mag += weight * Math.exp(-(du * du) / 0.006)
    }
    mag = clamp01(mag)
    amps[i] = mag
    signed[i] = raw * edge * breath
    if (mag > peak) {
      peak = mag
      peakIndex = i
    }
  }

  return { amps, signed, peakIndex, focusU: peakIndex / (bins - 1), t }
}

function mulberry32(seed) {
  let a = seed >>> 0
  return function rand() {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let value = Math.imul(a ^ (a >>> 15), 1 | a)
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

function mixPartials(partials, u, t, rectified) {
  let sum = 0
  let norm = 0
  for (const partial of partials) {
    const lfo = 0.72 + 0.28 * Math.sin(t * partial.rate + partial.phase)
    const osc = Math.sin(u * partial.freq * Math.PI * 2 + t * partial.speed + partial.phase)
    sum += partial.weight * lfo * (rectified ? Math.abs(osc) : osc)
    norm += partial.weight
  }
  return norm === 0 ? 0 : sum / norm
}

function clamp01(value) {
  return Math.max(0, Math.min(1, value))
}
