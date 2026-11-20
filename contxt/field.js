// Spectrum analyzer. x is frequency: bass on the left, treble on the right.
// A bin's level only rises and falls. No term uses x and time together, so the
// spectrum cannot slide sideways. The same time and pointer redraw the same frame.

export const DEFAULT_SEED = 0xc077e7
export const BIN_COUNT = 96

const ATTACK = 0.045
const DECAY = 0.36
const STEP = 1 / 48

export function createWave(seed = DEFAULT_SEED) {
  const rand = mulberry32(seed)
  const groups = [0, 1, 2].map((index) => {
    const voices = []
    for (let voice = 0; voice < 3; voice++) {
      voices.push({
        // Treble voices cycle faster than bass. All of these are time-only.
        rate: 0.4 + index * 0.28 + rand() * 0.35,
        phase: rand() * Math.PI * 2,
        hitEvery: 1.15 - index * 0.22 + rand() * 0.28,
        hitPhase: rand(),
      })
    }
    return { voices }
  })

  // Fixed peaks along the frequency axis. Group energy scales them. It never moves them.
  const tones = []
  for (let tone = 0; tone < 11; tone++) {
    const u = (tone + 0.15 + rand() * 0.7) / 11
    tones.push({
      u: Math.max(0.03, Math.min(0.97, u)),
      width: 0.018 + rand() * 0.02,
      height: 0.32 + rand() * 0.68,
    })
  }

  const columns = []
  for (let i = 0; i < BIN_COUNT; i++) {
    const u = i / (BIN_COUNT - 1)
    let gain = 0.28
    for (const tone of tones) {
      const du = u - tone.u
      gain += tone.height * Math.exp(-(du * du) / (tone.width * tone.width))
    }
    columns.push({
      gain: Math.min(1, gain),
      rate: 0.8 + rand() * 1.6,
      phase: rand() * Math.PI * 2,
      weights: groupWeights(u),
    })
  }

  return { seed: seed >>> 0, count: BIN_COUNT, groups, columns }
}

export function createFollower(wave) {
  const levels = new Float64Array(wave.count)
  writeTargets(levels, wave, 0)
  return { t: 0, levels }
}

// pointer: { x, y, weight } in 0..1. Weight adds level around x. Bin positions stay fixed.
export function sampleWave(wave, t, pointer = null, follower = null) {
  const end = Math.max(0, t)
  let levels
  if (!follower || end < follower.t - 1e-6) {
    levels = levelsAt(wave, end)
    if (follower) {
      const grid = gridTime(end)
      const stored = new Float64Array(wave.count)
      writeTargets(stored, wave, 0)
      stepRange(stored, wave, 0, grid)
      follower.levels = stored
      follower.t = grid
    }
  } else {
    const grid = gridTime(end)
    if (follower.t < grid - 1e-9) {
      stepRange(follower.levels, wave, follower.t, grid)
      follower.t = grid
    }
    if (end > follower.t + 1e-9) {
      levels = new Float64Array(follower.levels)
      stepRange(levels, wave, follower.t, end)
    } else {
      levels = follower.levels
    }
  }
  return present(levels, end, pointer)
}

function gridTime(t) {
  return Math.floor((t + 1e-9) / STEP) * STEP
}

function levelsAt(wave, t) {
  const levels = new Float64Array(wave.count)
  writeTargets(levels, wave, 0)
  stepRange(levels, wave, 0, t)
  return levels
}

function writeTargets(levels, wave, t) {
  const groups = groupLevels(wave, t)
  for (let i = 0; i < wave.count; i++) levels[i] = targetAt(wave.columns[i], groups, t)
}

function stepRange(levels, wave, t0, t1) {
  let time = t0
  while (time < t1 - 1e-9) {
    const nextGrid = (Math.floor(time / STEP + 1e-8) + 1) * STEP
    const dest = Math.min(t1, nextGrid)
    const dt = dest - time
    if (dt <= 1e-9) break
    const groups = groupLevels(wave, dest)
    const attackK = 1 - Math.exp(-dt / ATTACK)
    const decayK = 1 - Math.exp(-dt / DECAY)
    for (let i = 0; i < wave.count; i++) {
      const target = targetAt(wave.columns[i], groups, dest)
      const k = target > levels[i] ? attackK : decayK
      levels[i] += (target - levels[i]) * k
    }
    time = dest
  }
}

function groupLevels(wave, t) {
  const levels = [0, 0, 0]
  for (let index = 0; index < 3; index++) {
    let peak = 0
    for (const voice of wave.groups[index].voices) {
      const cycle = (t / voice.hitEvery + voice.hitPhase) % 1
      const hit = Math.exp(-((cycle - 0.18) ** 2) / 0.0018)
      const body = 0.5 + 0.5 * Math.sin(t * voice.rate + voice.phase)
      const level = 0.2 * body + 0.8 * hit
      if (level > peak) peak = level
    }
    levels[index] = peak
  }
  return levels
}

function targetAt(column, groups, t) {
  const shared = column.weights[0] * groups[0] + column.weights[1] * groups[1] + column.weights[2] * groups[2]
  // Per-bin shimmer has no position in it, so a loud bin stays on its own frequency.
  const shimmer = 0.5 + 0.5 * Math.sin(t * column.rate + column.phase)
  return clamp01(column.gain * (0.2 + 0.8 * shared) * (0.9 + 0.1 * shimmer))
}

function present(levels, t, pointer) {
  const n = levels.length
  const weight = pointer && Number.isFinite(pointer.weight) ? clamp01(pointer.weight) : 0
  const px = pointer && Number.isFinite(pointer.x) ? clamp01(pointer.x) : 0.5
  const amps = new Array(n)
  let peak = -1
  let peakIndex = 0
  let peakDist = Infinity

  for (let i = 0; i < n; i++) {
    const u = i / (n - 1)
    let amp = levels[i]
    let dist = 1
    if (weight > 0) {
      const du = u - px
      dist = Math.abs(du)
      amp += weight * 0.9 * Math.exp(-(du * du) / 0.004)
    }
    amp = clamp01(amp)
    amps[i] = amp
    if (amp > peak + 1e-4 || (amp >= peak - 1e-4 && dist < peakDist)) {
      peak = amp
      peakIndex = i
      peakDist = dist
    }
  }

  return { amps, peakIndex, focusU: n === 1 ? 0 : peakIndex / (n - 1), t }
}

function groupWeights(u) {
  const centers = [0.16, 0.5, 0.84]
  const width = 0.2
  const raw = centers.map((center) => {
    const du = u - center
    return Math.exp(-(du * du) / (width * width))
  })
  const sum = raw[0] + raw[1] + raw[2]
  return [raw[0] / sum, raw[1] / sum, raw[2] / sum]
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

function clamp01(value) {
  return Math.max(0, Math.min(1, value))
}
