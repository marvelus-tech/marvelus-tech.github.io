// Seeded speech ribbon. Shapes are fixed per seed. Motion is only continuous
// sines, so the same time and pointer always redraw the same frame.

export const DEFAULT_SEED = 0xc077e7

export function createRibbon(seed = DEFAULT_SEED) {
  const rand = mulberry32(seed)
  const filaments = []
  let cursor = 0
  let words = 0

  while (cursor < 1 && filaments.length < 22 && words < 8) {
    const count = 2 + Math.floor(rand() * 3)
    const lane = (rand() - 0.5) * 0.14
    for (let i = 0; i < count && cursor < 1 && filaments.length < 22; i++) {
      const vowel = rand() > 0.55
      filaments.push({
        u: cursor,
        amp: vowel ? 0.78 + rand() * 0.22 : 0.42 + rand() * 0.22,
        width: vowel ? 0.9 + rand() * 0.4 : 0.55 + rand() * 0.2,
        phase: rand() * Math.PI * 2,
        rate: 0.52 + rand() * 0.62,
        yBias: (rand() - 0.5) * 0.06,
        lane,
        vowel,
        gapAfter: false,
      })
      cursor += vowel ? 0.05 + rand() * 0.02 : 0.036 + rand() * 0.014
    }
    if (filaments.length) filaments[filaments.length - 1].gapAfter = true
    cursor += 0.06 + rand() * 0.035
    words += 1
  }

  const last = filaments[filaments.length - 1]
  const span = last ? last.u + 0.04 : 1
  // Keep a margin so the outer capsules, including their glow, stay on screen.
  for (const filament of filaments) filament.u = 0.07 + (filament.u / span) * 0.86
  if (last) last.gapAfter = false

  return { seed: seed >>> 0, filaments }
}

// pointer: { x, y, weight } in ribbon space (0 to 1). weight 0 ignores it.
// options.travel0 / travel1 bound the automatic focus walk.
export function sampleRibbon(ribbon, t, pointer = null, options = {}) {
  const travel0 = options.travel0 ?? 0.16
  const travel1 = options.travel1 ?? 0.84
  const travel = 0.5 + 0.5 * Math.sin(t * 0.31)
  const autoU = travel0 + (travel1 - travel0) * travel
  const weight = pointer && Number.isFinite(pointer.weight) ? clamp01(pointer.weight) : pointer ? 1 : 0
  const px = pointer && Number.isFinite(pointer.x) ? clamp01(pointer.x) : autoU
  const py = pointer && Number.isFinite(pointer.y) ? clamp01(pointer.y) : 0.5
  const focusU = autoU + (px - autoU) * weight
  const pitch = Math.sin(t * 0.47) * 0.07 + (py - 0.5) * 0.1 * weight

  let stressIndex = 0
  let stressScore = -1
  const samples = ribbon.filaments.map((filament, index) => {
    const wobble = 0.5 + 0.5 * Math.sin(t * filament.rate + filament.phase)
    const drift = 0.5 + 0.5 * Math.sin(t * 0.19 + filament.phase * 1.7)
    const energy = 0.8 + 0.2 * (wobble * 0.72 + drift * 0.28)
    const du = filament.u - focusU
    // Floor keeps the whole utterance visible. The peak only marks the claim.
    const focus = 0.38 + 0.62 * Math.exp(-(du * du) / 0.028)
    if (focus > stressScore) {
      stressScore = focus
      stressIndex = index
    }
    const y =
      0.5 +
      pitch * Math.sin(filament.u * 4.2 + t * 0.23) +
      filament.yBias +
      filament.lane +
      (wobble - 0.5) * 0.03
    return {
      u: filament.u,
      y,
      h: filament.amp * energy * (0.62 + 0.5 * focus),
      w: filament.width * (0.92 + 0.2 * focus),
      focus,
      vowel: filament.vowel,
      gapAfter: filament.gapAfter,
    }
  })

  return { samples, focusU, stressIndex, t }
}

function mulberry32(seed) {
  let a = seed >>> 0
  return function rand() {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function clamp01(value) {
  return Math.max(0, Math.min(1, value))
}
