import { useEffect, useState } from 'react'
import { WEAPON_DESIGNS, type DesignPoint } from './weaponDesigns'
import './App.css'

const TYPE_INTERVAL_MS = 10
const LINE_PAUSE_MS = 55
const DUAL_WIELD_START_SECONDS = 5.2
const DUAL_WIELD_TRANSITION_SECONDS = 1.8
const SYSTEM_LINES = [
  'SYSTEM.INIT() | OK',
  'KERNEL.BOOTSTRAP | ONLINE',
  'MEMORY.ALLOCATE(0xFF) | 256 MB',
  'CACHE.PREFETCH(0x00A7) | READY',
  'RENDER_MODE = DIGITAL | ACTIVE',
  'GLYPH_BUFFER.INIT() | 4096',
  'WEAPON_ENGINE.LOAD() | STANDBY',
  'DUAL_WIELD.SYNC | PENDING',
  'SIGNATURE.BLUE | DETECTED',
  'SIGNATURE.ICE | DETECTED',
  'DATA_ROUTING | ENGAGED',
  'SYSTEM_OVERRIDE | ARMING',
  'WEAPON_01 = ELUCIDATOR',
  'WEAPON_02 = LAMBENT_LIGHT',
  'DUAL_WIELD: ACTIVATING',
]

const ALL_LINES = ['SYS_', ...SYSTEM_LINES]
const GLYPHS = '0123456789ABCDEF<>/{}[]:=+-_'

const STREAMS = [
  [0.02, 0.12, 0.39, 0.19, 0.47, 0.39, 0.54, 0.5],
  [0.01, 0.3, 0.34, 0.28, 0.42, 0.42, 0.54, 0.5],
  [0.02, 0.78, 0.32, 0.73, 0.43, 0.56, 0.54, 0.5],
  [0.04, 0.95, 0.34, 0.81, 0.47, 0.63, 0.54, 0.5],
  [0.98, 0.1, 0.72, 0.14, 0.68, 0.38, 0.54, 0.5],
  [0.99, 0.35, 0.74, 0.28, 0.65, 0.42, 0.54, 0.5],
  [0.97, 0.82, 0.71, 0.76, 0.66, 0.58, 0.54, 0.5],
  [0.78, 0.02, 0.76, 0.25, 0.62, 0.32, 0.54, 0.5],
  [0.28, 0.98, 0.32, 0.74, 0.45, 0.67, 0.54, 0.5],
  [0.99, 0.58, 0.78, 0.57, 0.66, 0.53, 0.54, 0.5],
]

const WEAPON_LANES = [0.25, 0.36, 0.47, 0.58, 0.69]
const OUTLINE_START_SECONDS = 7

function blend(from: number, to: number, amount: number) {
  return from + (to - from) * amount
}

function splitRouteForStream(streamIndex: number) {
  const group = streamIndex % 2
  const lane = WEAPON_LANES[Math.floor(streamIndex / 2)]
  return [
    0.54, 0.5,
    group === 0 ? 0.48 : 0.6, 0.5 + (lane - 0.5) * 0.24,
    group === 0 ? 0.28 : 0.76, lane + (group === 0 ? -0.035 : 0.035),
    group === 0 ? 0.13 : 0.87, lane,
  ]
}

type OutlineGlyph = {
  weaponIndex: number
  part: string
  index: number
  x: number
  y: number
  sourceX: number
  sourceY: number
  char: string
  size: number
  alpha: number
  delay: number
}

function pointOnRoute(route: number[], amount: number): DesignPoint {
  const [x0, y0, x1, y1, x2, y2, x3, y3] = route
  const inverse = 1 - amount
  return [
    inverse ** 3 * x0 + 3 * inverse ** 2 * amount * x1 + 3 * inverse * amount ** 2 * x2 + amount ** 3 * x3,
    inverse ** 3 * y0 + 3 * inverse ** 2 * amount * y1 + 3 * inverse * amount ** 2 * y2 + amount ** 3 * y3,
  ]
}

function createOutlineGlyphs(width: number, height: number): OutlineGlyph[] {
  const shortSide = Math.min(width, height)
  const spacing = Math.max(7, shortSide * 0.008)
  const glyphSize = Math.max(10, Math.min(18, shortSide * 0.013))
  const routeIndices = [[0, 2, 4, 6, 8], [1, 3, 5, 7, 9]]
  const alphabet = '0123456789ABCDEF<>/{}[]:=+-_'
  const glyphs: OutlineGlyph[] = []

  WEAPON_DESIGNS.forEach((weapon, weaponIndex) => {
    const scale = shortSide * weapon.finalPose.lengthOfShortScreenSide / 2
    const [centerX, centerY] = weapon.finalPose.center
    const cos = Math.cos(weapon.finalPose.rotationRadians)
    const sin = Math.sin(weapon.finalPose.rotationRadians)
    const toScreen = ([localX, localY]: DesignPoint): DesignPoint => [
      centerX * width + (localX * cos - localY * sin) * scale,
      centerY * height + (localX * sin + localY * cos) * scale,
    ]
    let glyphIndex = 0

    weapon.silhouette.forEach((path) => {
      const first = path.points[0]
      const last = path.points[path.points.length - 1]
      const repeatsFirstPoint = first[0] === last[0] && first[1] === last[1]
      const edgeCount = path.closed && !repeatsFirstPoint ? path.points.length : path.points.length - 1

      for (let edgeIndex = 0; edgeIndex < edgeCount; edgeIndex += 1) {
        const start = path.points[edgeIndex]
        const end = path.points[(edgeIndex + 1) % path.points.length]
        const segmentLength = Math.hypot(end[0] - start[0], end[1] - start[1]) * scale
        const sampleCount = Math.max(1, Math.ceil(segmentLength / spacing))

        for (let sample = 0; sample < sampleCount; sample += 1) {
          const amount = sample / sampleCount
          const [x, y] = toScreen([
            start[0] + (end[0] - start[0]) * amount,
            start[1] + (end[1] - start[1]) * amount,
          ])
          const routeList = routeIndices[weaponIndex]
          const streamIndex = routeList[glyphIndex % routeList.length]
          const streamPosition = 0.12 + ((glyphIndex * 17) % 74) / 100
          const [sourceX, sourceY] = pointOnRoute(splitRouteForStream(streamIndex), streamPosition)
          const partDelay = path.part === 'blade' ? 0 : path.part === 'guard' ? 0.38 : path.part === 'grip' ? 0.62 : 0.82

          glyphs.push({
            weaponIndex,
            part: path.part,
            index: glyphIndex,
            x,
            y,
            sourceX: sourceX * width,
            sourceY: sourceY * height,
            char: path.part === 'emblem'
              ? '+'
              : path.part === 'inlay'
                ? '|'
                : alphabet[(glyphIndex * 7 + sample * 3 + weaponIndex * 13) % alphabet.length],
            size: glyphSize * (0.86 + ((glyphIndex * 3) % 5) * 0.07),
            alpha: 0.7 + ((glyphIndex * 5 + sample) % 30) / 100,
            delay: partDelay + ((glyphIndex * 19 + sample * 7) % 47) / 47 * 0.48,
          })
          glyphIndex += 1
        }
      }
    })
  })

  return glyphs
}

type Glyph = { offset: number; char: string; size: number; alpha: number }

function SystemDataCanvas({ reducedMotion }: { reducedMotion: boolean }) {
  useEffect(() => {
    const canvas = document.querySelector<HTMLCanvasElement>('.data-canvas')
    const context = canvas?.getContext('2d', { alpha: false })
    if (!canvas || !context) return

    const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5)
    let width = 0
    let height = 0
    let frameId = 0
    let startTime = performance.now()
    let outlineGlyphs = createOutlineGlyphs(window.innerWidth, window.innerHeight)
    const glyphStreams: Glyph[][] = STREAMS.map((_, streamIndex) =>
      Array.from({ length: 31 }, (_, glyphIndex) => ({
        offset: (glyphIndex / 31 + streamIndex * 0.037) % 1,
        char: GLYPHS[(glyphIndex * 7 + streamIndex * 13) % GLYPHS.length],
        size: 10 + ((glyphIndex * 3 + streamIndex * 5) % 6),
        alpha: 0.24 + ((glyphIndex * 11 + streamIndex * 7) % 65) / 100,
      })),
    )

    const resize = () => {
      width = window.innerWidth
      height = window.innerHeight
      canvas.width = Math.round(width * pixelRatio)
      canvas.height = Math.round(height * pixelRatio)
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
      outlineGlyphs = createOutlineGlyphs(width, height)
    }

    const draw = (now: number) => {
      const elapsed = (now - startTime) / 1000
      const activation = reducedMotion ? 0.72 : Math.min(1, Math.max(0, (elapsed - 0.25) / 2.7))
      const splitRaw = reducedMotion
        ? 1
        : Math.min(1, Math.max(0, (elapsed - DUAL_WIELD_START_SECONDS) / DUAL_WIELD_TRANSITION_SECONDS))
      const split = splitRaw * splitRaw * (3 - 2 * splitRaw)
      const outlineStart = OUTLINE_START_SECONDS
      const outlineDuration = 1.5
      const streamVisibility = reducedMotion
        ? 0.2
        : 1 - Math.min(1, Math.max(0, (elapsed - (outlineStart - 0.1)) / (outlineDuration + 0.1)))
      context.fillStyle = '#000'
      context.fillRect(0, 0, width, height)
      context.font = '12px ui-monospace, Consolas, monospace'
      context.textAlign = 'center'
      context.textBaseline = 'middle'

      STREAMS.forEach((stream, streamIndex) => {
        const original = stream
        const group = streamIndex % 2
        const splitRoute = splitRouteForStream(streamIndex)
        const route = original.map((point, index) => blend(point, splitRoute[index], split))
        const [x0, y0, x1, y1, x2, y2, x3, y3] = route
        const count = Math.max(8, Math.floor(glyphStreams[streamIndex].length * activation))
        for (let index = 0; index < count; index += 1) {
          const glyph = glyphStreams[streamIndex][index]
          const travel = reducedMotion
            ? glyph.offset
            : splitRaw > 0
              ? (glyph.offset + (elapsed - DUAL_WIELD_START_SECONDS) * (0.12 + (streamIndex % 3) * 0.014)) % 1
              : (glyph.offset + elapsed * (0.105 + (streamIndex % 3) * 0.012)) % 1
          const t = travel * travel * (3 - 2 * travel)
          const inverse = 1 - t
          const x = (inverse ** 3 * x0 + 3 * inverse ** 2 * t * x1 + 3 * inverse * t ** 2 * x2 + t ** 3 * x3) * width
          const y = (inverse ** 3 * y0 + 3 * inverse ** 2 * t * y1 + 3 * inverse * t ** 2 * y2 + t ** 3 * y3) * height
          const alpha = glyph.alpha * activation * (0.4 + travel * 0.6) * streamVisibility
          const targetColor = group === 0 ? [42, 145, 255] : [236, 220, 239]
          const red = Math.round(blend(91, targetColor[0], split))
          const green = Math.round(blend(231, targetColor[1], split))
          const blue = Math.round(blend(255, targetColor[2], split))
          context.fillStyle = `rgba(${red}, ${green}, ${blue}, ${alpha})`
          context.font = `${glyph.size}px ui-monospace, Consolas, monospace`
          context.fillText(glyph.char, x, y)
        }

        if (activation > 0.2) {
          context.beginPath()
          context.moveTo(x0 * width, y0 * height)
          context.bezierCurveTo(x1 * width, y1 * height, x2 * width, y2 * height, x3 * width, y3 * height)
          const targetColor = group === 0 ? [42, 145, 255] : [236, 190, 219]
          const red = Math.round(blend(36, targetColor[0], split))
          const green = Math.round(blend(190, targetColor[1], split))
          const blue = Math.round(blend(224, targetColor[2], split))
          context.strokeStyle = `rgba(${red}, ${green}, ${blue}, ${activation * (0.035 + split * 0.025) * streamVisibility})`
          context.lineWidth = 1
          context.stroke()
        }
      })

      context.shadowBlur = 2.2
      outlineGlyphs.forEach((glyph) => {
        const glyphStart = outlineStart + glyph.delay
        const progress = reducedMotion
          ? 1
          : Math.min(1, Math.max(0, (elapsed - glyphStart) / 0.38))
        if (progress <= 0) return

        const snap = 1 - (1 - progress) ** 3
        const settleAge = Math.max(0, elapsed - glyphStart - 0.38)
        const settle = reducedMotion
          ? 0
          : Math.sin(elapsed * 15 + glyph.index * 1.7) * Math.exp(-settleAge * 3.8) * 2
        const x = glyph.sourceX + (glyph.x - glyph.sourceX) * snap + settle
        const y = glyph.sourceY + (glyph.y - glyph.sourceY) * snap + settle * 0.45
        const weapon = WEAPON_DESIGNS[glyph.weaponIndex]
        const color = glyph.part === 'gem'
          ? weapon.palette.gem
          : glyph.part === 'emblem'
            ? weapon.palette.edge
            : glyph.part === 'inlay'
              ? weapon.palette.inlay
          : glyph.part === 'guard'
            ? glyph.index % 7 === 0 ? weapon.palette.accent : weapon.palette.guard
            : glyph.part === 'grip'
              ? weapon.palette.grip
              : glyph.part === 'pommel'
                ? weapon.palette.edge
                : glyph.weaponIndex === 0
                  ? glyph.index % 6 === 0 ? weapon.palette.edge : glyph.index % 9 === 0 ? weapon.palette.accent : weapon.palette.glyph
                  : glyph.index % 7 === 0 ? weapon.palette.accent : glyph.index % 11 === 0 ? weapon.palette.edge : weapon.palette.glyph

        context.globalAlpha = glyph.alpha * Math.min(1, progress * 2.4)
        context.fillStyle = color
        context.shadowColor = color
        context.font = `${glyph.size}px ui-monospace, Consolas, monospace`
        context.fillText(glyph.char, x, y)
      })
      context.globalAlpha = 1
      context.shadowBlur = 0

      const coreX = width * 0.54
      const coreY = height * 0.5
      const pulse = 0.5 + Math.sin(elapsed * 2.2) * 0.18
      const glow = context.createRadialGradient(coreX, coreY, 0, coreX, coreY, Math.min(width, height) * 0.14)
      glow.addColorStop(0, `rgba(53, 220, 255, ${0.075 * activation * pulse * (1 - split * 0.55)})`)
      glow.addColorStop(1, 'rgba(0, 0, 0, 0)')
      context.fillStyle = glow
      context.fillRect(coreX - width * 0.15, coreY - height * 0.2, width * 0.3, height * 0.4)

      if (!reducedMotion) frameId = window.requestAnimationFrame(draw)
    }

    resize()
    window.addEventListener('resize', resize)
    frameId = window.requestAnimationFrame(draw)
    return () => {
      window.removeEventListener('resize', resize)
      window.cancelAnimationFrame(frameId)
    }
  }, [reducedMotion])

  return <canvas className="data-canvas" aria-hidden="true" />
}

function App() {
  const [reducedMotion, setReducedMotion] = useState(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )
  const [completedLines, setCompletedLines] = useState<string[]>([])
  const [activeLine, setActiveLine] = useState('')

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const updatePreference = () => setReducedMotion(mediaQuery.matches)
    mediaQuery.addEventListener('change', updatePreference)
    return () => mediaQuery.removeEventListener('change', updatePreference)
  }, [])

  useEffect(() => {
    if (reducedMotion) {
      setCompletedLines(ALL_LINES)
      setActiveLine('')
      return
    }

    setCompletedLines([])
    setActiveLine('')
    let timeoutId: number | undefined
    let lineIndex = -1
    let characterIndex = 0
    let currentText = ''

    const typeNextCharacter = () => {
      if (lineIndex === -1) lineIndex = 0
      const target = lineIndex === 0 ? 'SYS_' : SYSTEM_LINES[lineIndex - 1]
      currentText += target[characterIndex]
      characterIndex += 1
      setActiveLine(currentText)

      if (characterIndex < target.length) {
        timeoutId = window.setTimeout(typeNextCharacter, TYPE_INTERVAL_MS)
        return
      }

      setCompletedLines((lines) => [...lines, currentText])
      setActiveLine('')
      currentText = ''
      characterIndex = 0
      lineIndex += 1
      if (lineIndex <= SYSTEM_LINES.length) {
        timeoutId = window.setTimeout(typeNextCharacter, LINE_PAUSE_MS)
      }
    }

    timeoutId = window.setTimeout(typeNextCharacter, TYPE_INTERVAL_MS)
    return () => {
      if (timeoutId !== undefined) window.clearTimeout(timeoutId)
    }
  }, [reducedMotion])

  return (
    <main className="system-screen" aria-label="System Override boot screen">
      <SystemDataCanvas reducedMotion={reducedMotion} />
      <section className="terminal-log" aria-label="System terminal output" aria-live="polite">
        {completedLines.slice(-10).map((line, index) => (
          <p className="terminal-line" key={`${completedLines.length}-${index}-${line}`}>
            {completedLines.length - 10 + index <= 0 ? `> ${line}` : line}
            {!reducedMotion && completedLines.length === ALL_LINES.length && index === Math.min(ALL_LINES.length, 10) - 1 && (
              <span className="terminal-cursor" aria-hidden="true">_</span>
            )}
          </p>
        ))}
        {!reducedMotion && completedLines.length < ALL_LINES.length && (
          <p className="terminal-line terminal-current">
            {completedLines.length === 0 ? '> ' : ''}{activeLine}
            <span className="terminal-cursor" aria-hidden="true">_</span>
          </p>
        )}
      </section>
      <div className="system-label" aria-hidden="true">SYSTEM OVERRIDE <span>///</span> BOOT SEQUENCE</div>
    </main>
  )
}

export default App
