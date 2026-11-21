/**
 * Context slides on a slow diagonal assembly line (landing hero).
 * Cards are decorative; copy and CTAs live in .hero-copy.
 */

export const SLIDES = [
  {
    label: "PIPE · 01",
    title: "Transcribe",
    line: "Speech to text with speaker-aware timing.",
    tint: "#e8dfd4",
  },
  {
    label: "PIPE · 02",
    title: "Claims",
    line: "Extract checkable statements from the transcript.",
    tint: "#dce8e4",
  },
  {
    label: "PIPE · 03",
    title: "Citations",
    line: "Attach facts backed by real source URLs.",
    tint: "#e4dfe8",
    staticFocus: true,
  },
  {
    label: "PIPE · 04",
    title: "Topic pages",
    line: "Browse context instead of a flat transcript.",
    tint: "#e8e0d8",
  },
  {
    label: "TOPIC",
    title: "Healthcare costs",
    line: "Grouped claims with a cited summary.",
    tint: "#d9e3ed",
  },
  {
    label: "TOPIC",
    title: "Foreign policy",
    line: "Timeline of what was said and when.",
    tint: "#e8dfd4",
  },
  {
    label: "TOPIC",
    title: "Budget deficit",
    line: "Facts checked against public sources.",
    tint: "#dce8e4",
  },
  {
    label: "REC · 00:42",
    title: "Spoken segment",
    line: "A slice of audio becomes graphical context.",
    tint: "#e4dfe8",
  },
  {
    label: "SIGNAL",
    title: "Live context",
    line: "Context updates as the conversation moves.",
    tint: "#e8e0d8",
  },
]

const LOOP_SEC = 62
const TRACK_ROT_Y = 24
const TRACK_ROT_X = 6
const PROTRUDE_Z_DESKTOP = 48
const PROTRUDE_Z_MOBILE = 28
const PROTRUDE_SCALE = 1.08
const LERP_PROTRUDE = 0.14

const STATIC_FOCUS_INDEX = SLIDES.findIndex((s) => s.staticFocus)

function citeBars(seed) {
  const widths = [72, 48, 88, 36]
  return widths.map((w, i) => {
    const on = (seed + i * 17) % 5 > 1
    return { width: w, on }
  })
}

function buildCard(slide) {
  const el = document.createElement("article")
  el.className = "context-slide"
  el.style.setProperty("--slide-fill", slide.tint)
  el.innerHTML = `
    <div class="context-slide__frame">
      <p class="context-slide__label">${slide.label}</p>
      <h2 class="context-slide__title">${slide.title}</h2>
      <p class="context-slide__line">${slide.line}</p>
      <div class="context-slide__cites" aria-hidden="true"></div>
    </div>`
  const cites = el.querySelector(".context-slide__cites")
  for (const bar of citeBars(slide.title.length + slide.label.length)) {
    const span = document.createElement("span")
    span.className = bar.on ? "context-slide__cite is-on" : "context-slide__cite"
    span.style.width = `${bar.width}%`
    cites.appendChild(span)
  }
  return el
}

function poseAlongConveyor(card, pathOffset, layout, hoverProtrude) {
  const count = card.count
  const slot = card.slotIndex / count
  const u = (pathOffset + slot) % 1
  const ax = 0.08 + u * 0.84
  const ay = 0.92 - u * 0.84
  const lane = (card.lane - 0.5) * layout.h * 0.06
  const x = (ax - 0.5) * layout.w * 0.92
  const y = (ay - 0.5) * layout.h * 0.88 + lane
  const depth = 0.35 + 0.65 * u
  const z = (depth - 0.5) * layout.w * 0.22
  const nearMid = 1 - Math.min(Math.abs(u - 0.45), Math.abs(u - 0.55)) * 4
  const opacity = 0.55 + Math.max(0, Math.min(1, nearMid)) * 0.45
  const cardRotY = ((card.slotIndex % 3) - 1) * 4
  let scale = 0.88 + depth * 0.14
  let protrudeZ = 0
  let finalOpacity = opacity
  let zIndex = Math.round(50 + u * 40)

  if (hoverProtrude > 0.01) {
    const t = hoverProtrude
    protrudeZ = t * (layout.mobile ? PROTRUDE_Z_MOBILE : PROTRUDE_Z_DESKTOP)
    scale += (PROTRUDE_SCALE - 1) * t
    finalOpacity = 1
    zIndex = 200
  }

  return {
    x,
    y,
    z: z + protrudeZ,
    rotX: 0,
    rotY: cardRotY,
    scale,
    opacity: finalOpacity,
    zIndex,
    u,
    hoverProtrude,
  }
}

export function mountHeroSlides(stage) {
  const track = document.createElement("div")
  track.className = "hero-track"
  stage.appendChild(track)

  const motion = window.matchMedia("(prefers-reduced-motion: reduce)")
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)")
  const narrow = () => window.matchMedia("(max-width: 720px)").matches

  if (finePointer.matches) stage.classList.add("has-fine-pointer")

  const cards = []
  const indices = narrow()
    ? [0, 1, 2, 4, STATIC_FOCUS_INDEX].filter((v, i, a) => a.indexOf(v) === i)
    : SLIDES.map((_, i) => i)

  const count = indices.length
  for (let i = 0; i < indices.length; i++) {
    const index = indices[i]
    const slide = SLIDES[index]
    const el = buildCard(slide)
    track.appendChild(el)
    cards.push({
      el,
      index,
      slotIndex: i,
      count,
      lane: (i % 5) / 4,
    })
  }

  const layout = { w: 1, h: 1, mobile: false }
  let pathOffset =
    STATIC_FOCUS_INDEX >= 0 ? STATIC_FOCUS_INDEX / SLIDES.length : 0.35
  let raf = 0
  let lastFrame = 0
  let running = !motion.matches
  let paused = false
  let hoveredCard = null
  const protrudeLevel = new Map()
  for (const card of cards) protrudeLevel.set(card, 0)

  function resize() {
    const rect = stage.getBoundingClientRect()
    layout.w = Math.max(rect.width, 1)
    layout.h = Math.max(rect.height, 1)
    layout.mobile = narrow()
  }

  function applyPose(card, pose) {
    const { el } = card
    el.style.transform = `translate3d(${pose.x}px, ${pose.y}px, ${pose.z}px) rotateX(${pose.rotX}deg) rotateY(${pose.rotY}deg) scale(${pose.scale})`
    el.style.opacity = String(pose.opacity)
    el.style.filter = "none"
    el.style.zIndex = String(pose.zIndex)
    el.classList.toggle("is-protrude", pose.hoverProtrude > 0.85)
  }

  function drawFrame() {
    track.style.transform = `rotateY(${TRACK_ROT_Y}deg) rotateX(${TRACK_ROT_X}deg)`
    for (const card of cards) {
      const target = hoveredCard === card ? 1 : 0
      let level = protrudeLevel.get(card) ?? 0
      level += (target - level) * LERP_PROTRUDE
      protrudeLevel.set(card, level)
      applyPose(card, poseAlongConveyor(card, pathOffset, layout, level))
    }
  }

  function frame(now) {
    if (!running) {
      raf = requestAnimationFrame(frame)
      return
    }
    if (now - lastFrame >= 32) {
      if (!paused) pathOffset += (now - lastFrame) / 1000 / LOOP_SEC
      if (pathOffset > 1e6) pathOffset %= 1
      drawFrame()
      lastFrame = now
    }
    raf = requestAnimationFrame(frame)
  }

  function freezeStatic() {
    running = false
    paused = true
    cancelAnimationFrame(raf)
    pathOffset =
      STATIC_FOCUS_INDEX >= 0
        ? (STATIC_FOCUS_INDEX + 0.5) / SLIDES.length
        : 0.45
    pathOffset %= 1
    drawFrame()
  }

  if (finePointer.matches && !motion.matches) {
    for (const card of cards) {
      card.el.addEventListener("pointerenter", () => {
        hoveredCard = card
        paused = true
        stage.classList.add("is-line-paused")
      })
      card.el.addEventListener("pointerleave", (event) => {
        const next = event.relatedTarget
        if (next instanceof Node && card.el.contains(next)) return
        if (hoveredCard === card) hoveredCard = null
      })
    }
    stage.addEventListener("pointerenter", () => {
      paused = true
      stage.classList.add("is-line-paused")
    })
    stage.addEventListener("pointerleave", () => {
      paused = false
      hoveredCard = null
      stage.classList.remove("is-line-paused")
      for (const card of cards) protrudeLevel.set(card, 0)
    })
  }

  resize()
  document.documentElement.dataset.motion = motion.matches ? "reduced" : "full"

  if (motion.matches) freezeStatic()
  else {
    lastFrame = performance.now()
    drawFrame()
    raf = requestAnimationFrame(frame)
  }

  window.addEventListener("resize", () => {
    resize()
    drawFrame()
  })

  document.addEventListener("visibilitychange", () => {
    if (motion.matches) return
    if (document.hidden) {
      running = false
      cancelAnimationFrame(raf)
    } else {
      running = true
      lastFrame = performance.now()
      raf = requestAnimationFrame(frame)
    }
  })

  motion.addEventListener("change", (event) => {
    document.documentElement.dataset.motion = event.matches ? "reduced" : "full"
    if (event.matches) freezeStatic()
    else {
      running = true
      paused = false
      lastFrame = performance.now()
      cancelAnimationFrame(raf)
      drawFrame()
      raf = requestAnimationFrame(frame)
    }
  })

  return { track, cards, freezeStatic }
}