/**
 * Floating context slides along a diagonal 3D path (landing hero).
 * Cards are decorative; copy and CTAs live in .hero-copy.
 */

export const SLIDES = [
  {
    label: "PIPE · 01",
    title: "Transcribe",
    line: "Speech to text with speaker-aware timing.",
    tint: "#e8dfd4",
    phase: 0,
  },
  {
    label: "PIPE · 02",
    title: "Claims",
    line: "Extract checkable statements from the transcript.",
    tint: "#dce8e4",
    phase: 0.11,
  },
  {
    label: "PIPE · 03",
    title: "Citations",
    line: "Attach facts backed by real source URLs.",
    tint: "#e4dfe8",
    focus: true,
    phase: 0.22,
  },
  {
    label: "PIPE · 04",
    title: "Topic pages",
    line: "Browse context instead of a flat transcript.",
    tint: "#e8e0d8",
    phase: 0.33,
  },
  {
    label: "TOPIC",
    title: "Healthcare costs",
    line: "Grouped claims with a cited summary.",
    tint: "#d9e3ed",
    phase: 0.44,
  },
  {
    label: "TOPIC",
    title: "Foreign policy",
    line: "Timeline of what was said and when.",
    tint: "#e8dfd4",
    phase: 0.55,
  },
  {
    label: "TOPIC",
    title: "Budget deficit",
    line: "Facts checked against public sources.",
    tint: "#dce8e4",
    phase: 0.66,
  },
  {
    label: "REC · 00:42",
    title: "Spoken segment",
    line: "A slice of audio becomes graphical context.",
    tint: "#e4dfe8",
    phase: 0.77,
  },
  {
    label: "SIGNAL",
    title: "Live context",
    line: "Context updates as the conversation moves.",
    tint: "#e8e0d8",
    phase: 0.88,
  },
]

const LOOP_SEC = 32
const FOCUS_INDEX = SLIDES.findIndex((s) => s.focus)
const BEZIER = {
  x0: 0.06,
  y0: 0.88,
  x1: 0.38,
  y1: 0.72,
  x2: 0.62,
  y2: 0.28,
  x3: 0.94,
  y3: 0.08,
}

function bezier(u, a, b, c, d) {
  const t = 1 - u
  return t * t * t * a + 3 * t * t * u * b + 3 * t * u * u * c + u * u * u * d
}

function easeFocus(dist) {
  return Math.exp(-dist * dist / 0.018)
}

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

export function mountHeroSlides(stage) {
  const track = document.createElement("div")
  track.className = "hero-track"
  stage.appendChild(track)

  const motion = window.matchMedia("(prefers-reduced-motion: reduce)")
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)")
  const narrow = () => window.matchMedia("(max-width: 720px)").matches

  const cards = []
  const indices = narrow()
    ? [0, 1, 2, 4, FOCUS_INDEX].filter((v, i, a) => a.indexOf(v) === i)
    : SLIDES.map((_, i) => i)

  for (const index of indices) {
    const slide = SLIDES[index]
    const el = buildCard(slide)
    track.appendChild(el)
    cards.push({
      el,
      index,
      phase: slide.phase ?? index / SLIDES.length,
      focus: Boolean(slide.focus),
    })
  }

  const layout = { w: 1, h: 1 }
  let pathT = 0
  let raf = 0
  let lastFrame = 0
  let running = !motion.matches
  const pointer = { x: 0.5, y: 0.5, targetX: 0.5, targetY: 0.5, weight: 0, targetWeight: 0 }

  function resize() {
    const rect = stage.getBoundingClientRect()
    layout.w = Math.max(rect.width, 1)
    layout.h = Math.max(rect.height, 1)
  }

  function poseForCard(card, globalT, parallax) {
    const u = (globalT + card.phase) % 1
    const bx = bezier(u, BEZIER.x0, BEZIER.x1, BEZIER.x2, BEZIER.x3)
    const by = bezier(u, BEZIER.y0, BEZIER.y1, BEZIER.y2, BEZIER.y3)
    const depth = 0.35 + 0.65 * u
    const focusU = (globalT + (SLIDES[FOCUS_INDEX].phase ?? 0.22)) % 1
    const du = Math.min(Math.abs(u - focusU), 1 - Math.abs(u - focusU))
    const focus = easeFocus(du)
    const mobile = narrow()
    let blur = (1 - focus) * (mobile ? 2 : 6)
    if (mobile && blur > 3) blur = 3
    let scale = 0.72 + depth * 0.35 + focus * 0.12
    const rotY = (u - 0.5) * 36 + parallax.tiltY
    const rotX = (0.5 - by) * 14 + parallax.tiltX
    const x = (bx - 0.5) * layout.w * 0.92
    const y = (by - 0.5) * layout.h * 0.88
    const z = (depth - 0.5) * layout.w * 0.35
    return { x, y, z, rotX, rotY, scale, blur, focus, u }
  }

  function applyPose(card, pose) {
    const { el } = card
    el.style.transform = `translate3d(${pose.x}px, ${pose.y}px, ${pose.z}px) rotateX(${pose.rotX}deg) rotateY(${pose.rotY}deg) scale(${pose.scale})`
    el.style.zIndex = String(Math.round(100 + pose.focus * 80 + pose.u * 20))
    if (pose.blur < 0.4) {
      el.style.filter = "none"
      el.style.opacity = "1"
    } else if (narrow() && pose.blur > 2.5) {
      el.style.filter = "none"
      el.style.opacity = String(0.55 + pose.focus * 0.35)
    } else {
      el.style.filter = `blur(${pose.blur.toFixed(2)}px)`
      el.style.opacity = String(0.65 + pose.focus * 0.35)
    }
    el.classList.toggle("is-focus", pose.focus > 0.92)
  }

  function render(now) {
    const parallax = {
      tiltX: (pointer.y - 0.5) * pointer.weight * 8,
      tiltY: (pointer.x - 0.5) * pointer.weight * 12,
    }
    track.style.transform = `rotateX(${parallax.tiltX * 0.15}deg) rotateY(${parallax.tiltY * 0.15}deg)`
    for (const card of cards) {
      applyPose(card, poseForCard(card, pathT, parallax))
    }
  }

  function frame(now) {
    if (!running) return
    if (now - lastFrame >= 32) {
      pathT += (now - lastFrame) / 1000 / LOOP_SEC
      if (pathT > 1e6) pathT %= 1
      pointer.x += (pointer.targetX - pointer.x) * 0.08
      pointer.y += (pointer.targetY - pointer.y) * 0.08
      pointer.weight += (pointer.targetWeight - pointer.weight) * 0.06
      render(now)
      lastFrame = now
    }
    raf = requestAnimationFrame(frame)
  }

  function freezeAtFocus() {
    running = false
    cancelAnimationFrame(raf)
    pathT = 0
    render(performance.now())
    for (const card of cards) {
      const pose = poseForCard(card, pathT, { tiltX: 0, tiltY: 0 })
      applyPose(card, pose)
    }
  }

  resize()
  document.documentElement.dataset.motion = motion.matches ? "reduced" : "full"

  if (motion.matches) freezeAtFocus()
  else {
    lastFrame = performance.now()
    raf = requestAnimationFrame(frame)
  }

  window.addEventListener("resize", () => {
    resize()
    render(performance.now())
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
    if (event.matches) freezeAtFocus()
    else {
      running = true
      lastFrame = performance.now()
      raf = requestAnimationFrame(frame)
    }
  })

  if (finePointer.matches && !motion.matches) {
    window.addEventListener(
      "pointermove",
      (event) => {
        pointer.targetX = Math.max(0, Math.min(1, event.clientX / window.innerWidth))
        pointer.targetY = Math.max(0, Math.min(1, event.clientY / window.innerHeight))
        pointer.targetWeight = 1
      },
      { passive: true },
    )
    document.documentElement.addEventListener("pointerleave", () => {
      pointer.targetWeight = 0
    })
  }

  return { track, cards, freezeAtFocus }
}