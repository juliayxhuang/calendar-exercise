const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"]

const stages = Array.from(document.querySelectorAll(".stage[data-segments]"))

for (const stage of stages) {
  const segments = Number(stage.dataset.segments)
  const type = stage.dataset.type || ""

  const label = stage.querySelector('[data-role="label"]')
  const track = stage.querySelector('[data-role="track"]')
  const shape = stage.querySelector('[data-role="shape"]')
  const handle = stage.querySelector('[data-role="handle"]')

  if (!label || !track || !handle || !Number.isFinite(segments) || segments <= 0) continue

  const labels = buildLabels(type, segments)
  initPathSlider({ stage, track, shape, handle, label, labels, segments })
}

function buildLabels(type, segments) {
  if (type === "month") return months

  if (type === "day") {
    return Array.from({ length: segments }, (_, i) => String(i + 1))
  }

  if (type === "hour") {
    return Array.from({ length: segments }, (_, i) => String(i + 1))
  }

  if (type === "minute") {
    return Array.from({ length: segments }, (_, i) => String(i).padStart(2, "0"))
  }

  return Array.from({ length: segments }, (_, i) => String(i + 1))
}

function initPathSlider({ stage, track, shape, handle, label, labels, segments }) {
  const centerSource = shape || track
  const centerBBox = centerSource.getBBox()
  const center = {
    x: centerBBox.x + centerBBox.width / 2,
    y: centerBBox.y + centerBBox.height / 2,
  }

  const pathLength = track.getTotalLength()
  const insetScale = 0.93

  let dragging = false
  let t = 0

  updatePosition(0)

  handle.addEventListener("pointerdown", (e) => {
    e.preventDefault()
    dragging = true
    handle.setPointerCapture(e.pointerId)
    updatePosition(findClosestTFromClientPoint(e))
  })

  handle.addEventListener("pointermove", (e) => {
    if (!dragging) return
    updatePosition(findClosestTFromClientPoint(e))
  })

  handle.addEventListener("pointerup", () => {
    dragging = false
  })

  handle.addEventListener("pointercancel", () => {
    dragging = false
  })

  window.addEventListener("resize", () => updatePosition(t))
  window.addEventListener("scroll", () => updatePosition(t), { passive: true })

  function updatePosition(newT) {
    t = clamp01(newT)

    const rawPt = track.getPointAtLength(t * pathLength)
    const pt = insetPoint(rawPt, center, insetScale)

    handle.setAttribute("cx", pt.x)
    handle.setAttribute("cy", pt.y)

    const index = segmentIndexFromT(t, segments)
    label.textContent = labels[index] ?? ""

    positionLabel(pt)
  }

  function positionLabel(svgPt) {
    // Push the label outward from the digit, then upward.
    const dx = svgPt.x - center.x
    const dy = svgPt.y - center.y
    const len = Math.hypot(dx, dy) || 1
    const outward = 18
    const offsetX = (dx / len) * outward
    const offsetY = (dy / len) * outward - 24

    const screen = svgPointToScreen(svgPt.x + offsetX, svgPt.y + offsetY)
    const stageRect = stage.getBoundingClientRect()

    label.style.left = `${screen.x - stageRect.left}px`
    label.style.top = `${screen.y - stageRect.top}px`
  }

  function findClosestTFromClientPoint(evt) {
    const svgPoint = clientToSvgPoint(evt)
    return findClosestT(svgPoint.x, svgPoint.y)
  }

  function findClosestT(mx, my) {
    let closestT = 0
    let closestDist = Infinity

    const steps = 350
    for (let i = 0; i <= steps; i++) {
      const testT = i / steps
      const rawPt = track.getPointAtLength(testT * pathLength)
      const pt = insetPoint(rawPt, center, insetScale)
      const dd = dist2(pt.x, pt.y, mx, my)
      if (dd < closestDist) {
        closestDist = dd
        closestT = testT
      }
    }

    let left = Math.max(0, closestT - 1 / steps)
    let right = Math.min(1, closestT + 1 / steps)
    for (let i = 0; i < 18; i++) {
      const t1 = left + (right - left) * 1 / 3
      const t2 = left + (right - left) * 2 / 3
      const p1raw = track.getPointAtLength(t1 * pathLength)
      const p2raw = track.getPointAtLength(t2 * pathLength)
      const p1 = insetPoint(p1raw, center, insetScale)
      const p2 = insetPoint(p2raw, center, insetScale)
      const d1 = dist2(p1.x, p1.y, mx, my)
      const d2 = dist2(p2.x, p2.y, mx, my)
      if (d1 < d2) right = t2
      else left = t1
    }

    return (left + right) / 2
  }

  function clientToSvgPoint(evt) {
    const svg = track.ownerSVGElement
    const pt = svg.createSVGPoint()

    pt.x = evt.clientX
    pt.y = evt.clientY

    return pt.matrixTransform(svg.getScreenCTM().inverse())
  }

  function svgPointToScreen(x, y) {
    const svg = track.ownerSVGElement
    const pt = svg.createSVGPoint()
    pt.x = x
    pt.y = y
    const transformed = pt.matrixTransform(svg.getScreenCTM())
    return { x: transformed.x, y: transformed.y }
  }
}

function insetPoint(pt, center, scale) {
  return {
    x: center.x + (pt.x - center.x) * scale,
    y: center.y + (pt.y - center.y) * scale,
  }
}

function segmentIndexFromT(t, segments) {
  const raw = Math.floor(clamp01(t) * segments)
  return Math.min(segments - 1, Math.max(0, raw))
}

function clamp01(n) {
  return Math.max(0, Math.min(1, n))
}

function dist2(x1, y1, x2, y2) {
  const dx = x1 - x2
  const dy = y1 - y2
  return dx * dx + dy * dy
}
