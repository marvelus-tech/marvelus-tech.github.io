/**
 * DAW-style symmetric waveform hero: portrait visible through vertical bar slats,
 * crossfading 1992 debate stills. Reuses envelope timing from field.js (not spectrum colors).
 */

import { createWave, createFollower, sampleWave, DEFAULT_SEED } from "./field.js"

/** @type {{ src: string, caption: string, topic: string }[]} */
export const HERO_FRAMES = [
  {
    src: "./assets/hero/debate-first.webp",
    caption: "11 OCT 1992 · ST. LOUIS",
    topic: "ECONOMY",
  },
  {
    src: "./assets/hero/debate-second.webp",
    caption: "15 OCT 1992 · RICHMOND",
    topic: "HEALTHCARE",
  },
  {
    src: "./assets/hero/debate-third.webp",
    caption: "19 OCT 1992 · EAST LANSING",
    topic: "FOREIGN POLICY",
  },
  {
    src: "./assets/hero/debate-wide.webp",
    caption: "PRESIDENTIAL DEBATE · 1992",
    topic: "BUDGET",
  },
]

function barCountForWidth(px) {
  return px < 420 ? 48 : 72
}
const CROSSFADE_MS = 5200
const PAPER = "#f7f4ee"
const INK = "rgba(28, 25, 21, 0.92)"

/**
 * @param {HTMLElement} root
 * @param {{ reducedMotion?: boolean }} [options]
 */
export function mountWaveHero(root, options = {}) {
  const reduced =
    options.reducedMotion ?? window.matchMedia("(prefers-reduced-motion: reduce)").matches

  root.innerHTML = ""
  root.classList.add("wave-hero")
  root.setAttribute("role", "img")
  root.setAttribute(
    "aria-label",
    "Symmetric waveform revealing 1992 presidential debate photographs between vertical bars",
  )

  const shell = document.createElement("div")
  shell.className = "wave-hero__shell"

  const canvas = document.createElement("canvas")
  canvas.className = "wave-hero__canvas"
  shell.appendChild(canvas)

  const caption = document.createElement("p")
  caption.className = "wave-hero__caption"
  caption.textContent = HERO_FRAMES[0].caption

  root.appendChild(shell)
  root.appendChild(caption)

  const ctx = canvas.getContext("2d", { alpha: false })
  if (!ctx) return () => {}

  const wave = createWave(DEFAULT_SEED ^ 0x9e37)
  const follower = createFollower(wave)
  /** @type {HTMLImageElement[]} */
  const images = []
  let loaded = 0
  let frameIndex = 0
  let nextFrameIndex = 0
  let blend = 0
  let lastCrossfade = 0
  let raf = 0
  let running = false
  let width = 0
  let height = 0
  let dpr = 1
  let barCount = barCountForWidth(window.innerWidth)

  const onResize = () => {
    const rect = shell.getBoundingClientRect()
    width = Math.max(1, Math.floor(rect.width))
    height = Math.max(1, Math.floor(rect.height))
    barCount = barCountForWidth(width)
    dpr = Math.min(2, window.devicePixelRatio || 1)
    canvas.width = Math.floor(width * dpr)
    canvas.height = Math.floor(height * dpr)
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    drawFrame(reduced ? 0 : performance.now() / 1000)
  }

  const ro = new ResizeObserver(onResize)
  ro.observe(shell)

  HERO_FRAMES.forEach((frame, i) => {
    const img = new Image()
    img.decoding = "async"
    img.src = frame.src
    img.addEventListener("load", () => {
      loaded += 1
      if (loaded === HERO_FRAMES.length) {
        onResize()
        if (!reduced) startLoop()
      }
    })
    img.addEventListener("error", () => {
      loaded += 1
    })
    images[i] = img
  })

  function coverDraw(
    /** @type {CanvasRenderingContext2D} */ c,
    /** @type {HTMLImageElement} */ img,
    w,
    h,
  ) {
    if (!img.complete || !img.naturalWidth) return
    const ir = img.naturalWidth / img.naturalHeight
    const cr = w / h
    let dw
    let dh
    let dx
    let dy
    if (ir > cr) {
      dh = h
      dw = h * ir
      dx = (w - dw) / 2
      dy = 0
    } else {
      dw = w
      dh = w / ir
      dx = 0
      dy = (h - dh) / 2
    }
    c.drawImage(img, dx, dy, dw, dh)
  }

  function drawSymmetricBars(
    /** @type {CanvasRenderingContext2D} */ c,
    /** @type {number[]} */ amps,
    w,
    h,
    barCount,
    opts = {},
  ) {
    const gap = opts.gap ?? 3
    const barW = (w - gap * (barCount - 1)) / barCount
    const cy = h / 2
    const maxHalf = h * 0.46

    c.fillStyle = PAPER
    c.fillRect(0, 0, w, h)

    for (let i = 0; i < barCount; i++) {
      const x = i * (barW + gap)
      const amp = amps[i] ?? 0
      const half = Math.max(2, amp * maxHalf)
      const y0 = cy - half
      const barH = half * 2
      c.save()
      c.beginPath()
      c.rect(x, y0, barW, barH)
      c.clip()
      if (opts.imageA) coverDraw(c, opts.imageA, w, h)
      if (opts.imageB && opts.blend > 0) {
        c.globalAlpha = opts.blend
        coverDraw(c, opts.imageB, w, h)
        c.globalAlpha = 1
      }
      c.restore()

      c.fillStyle = INK
      c.fillRect(x, y0 - 1, barW, 1)
      c.fillRect(x, y0 + barH, barW, 1)
    }
  }

  function ampsForTime(t) {
    const subset = subsampleAmps(wave, follower, t, barCount)
    return subset
  }

  function drawFrame(t) {
    if (!width || !height) return
    const nowMs = t * 1000
    if (!reduced) {
      if (!lastCrossfade) lastCrossfade = nowMs
      if (nowMs - lastCrossfade > CROSSFADE_MS) {
        frameIndex = nextFrameIndex
        nextFrameIndex = (nextFrameIndex + 1) % HERO_FRAMES.length
        lastCrossfade = nowMs
        blend = 0
        caption.textContent = HERO_FRAMES[nextFrameIndex].caption
      } else {
        const phase = (nowMs - lastCrossfade) / CROSSFADE_MS
        blend = Math.min(1, Math.max(0, (phase - 0.55) / 0.35))
      }
    }

    const amps = ampsForTime(reduced ? 0 : t)
    const imgA = images[reduced ? 0 : frameIndex]
    const imgB = images[reduced ? 0 : nextFrameIndex]

    ctx.fillStyle = PAPER
    ctx.fillRect(0, 0, width, height)
    drawSymmetricBars(ctx, amps, width, height, barCount, {
      imageA: imgA,
      imageB: reduced ? null : imgB,
      blend: reduced ? 0 : blend,
      gap: width < 420 ? 2 : 3,
    })

  }

  function loop(now) {
    if (!running) return
    drawFrame(now / 1000)
    raf = requestAnimationFrame(loop)
  }

  function startLoop() {
    if (running || reduced) return
    running = true
    raf = requestAnimationFrame(loop)
  }

  function subsampleAmps(waveState, fol, t, count) {
    const { amps } = sampleWave(waveState, t, null, fol)
    const n = amps.length
    const out = new Array(count)
    for (let i = 0; i < count; i++) {
      const u = i / (count - 1)
      const idx = u * (n - 1)
      const i0 = Math.floor(idx)
      const i1 = Math.min(n - 1, i0 + 1)
      const f = idx - i0
      out[i] = amps[i0] * (1 - f) + amps[i1] * f
    }
    return out
  }

  return () => {
    running = false
    cancelAnimationFrame(raf)
    ro.disconnect()
  }
}