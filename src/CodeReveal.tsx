import { useEffect, useRef, useState } from 'react'
import wallpaper from '../kiritoasuna-clean.png'
import { AuraMist } from './AuraMist'

type Glyph = {
  x: number
  y: number
  stagingX: number
  stagingY: number
  buildX: number
  buildY: number
  side: number
  delay: number
  size: number
  char: string
  color: string
  brightness: number
  curve: number
}

const GLYPHS = '0123456789ABCDEF<>/{}[]:=+-_'
const MAX_GLYPHS = 1450
const VOID_END = 2
const INIT_END = 5
const DUAL_WIELD_END = 7
const CONSTRUCTION_END = 11
const OVERRIDE_END = 14
const REVEAL_START = 18.3
const REVEAL_DURATION = 1.35

const INIT_LINES = [
  { at: 2.05, text: 'SYSTEM.INIT()' },
  { at: 2.42, text: 'LOADING.WEAPON_ENGINE...' },
  { at: 2.91, text: 'MEMORY.ALLOCATE(0xFF)' },
  { at: 3.4, text: 'RENDER_MODE = DIGITAL' },
  { at: 3.87, text: 'GEOMETRY.BUFFER: READY' },
  { at: 4.31, text: 'LIGHTING.SYNC: COMPLETE' },
  { at: 5.04, text: 'WEAPON_01 = ELUCIDATOR' },
  { at: 5.43, text: 'WEAPON_02 = LAMBENT_LIGHT' },
  { at: 5.88, text: 'DUAL_WIELD: ACTIVATING' },
]

const OVERRIDE_LINES = [
  { at: 12.72, text: 'DUAL_WIELD.SYNCHRONIZED()' },
  { at: 13.05, text: 'WEAPON_LINK: STABLE' },
  { at: 13.36, text: 'SYSTEM_OVERRIDE: COMPLETE' },
]

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function easeOut(value: number) {
  const t = clamp(value, 0, 1)
  return 1 - (1 - t) ** 3
}

function curvePoint(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  progress: number,
  curve: number,
) {
  const t = clamp(progress, 0, 1)
  const dx = endX - startX
  const dy = endY - startY
  const length = Math.max(1, Math.hypot(dx, dy))
  const offset = Math.sin(t * Math.PI) * curve
  return {
    x: startX + dx * t - (dy / length) * offset,
    y: startY + dy * t + (dx / length) * offset,
  }
}

function colorFor(r: number, g: number, b: number) {
  if (r > 165 && g > 155 && b > 155) return '#f4e8f2'
  if (b > r * 1.35) return '#4c9fff'
  if (g > r * 1.12 && b > r * 1.12) return '#75f2f2'
  return '#b8c5d2'
}

function typewriterLine(
  context: CanvasRenderingContext2D,
  text: string,
  startAt: number,
  elapsed: number,
  x: number,
  y: number,
  alpha: number,
) {
  if (elapsed < startAt || alpha <= 0) return
  const charsPerSecond = 42
  const count = Math.min(text.length, Math.floor((elapsed - startAt) * charsPerSecond) + 1)
  context.globalAlpha = alpha
  context.fillText(text.slice(0, count), x, y)
}

export function CodeReveal() {
  const hostRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [revealing, setRevealing] = useState(false)
  const [guideVisible, setGuideVisible] = useState(false)

  useEffect(() => {
    const host = hostRef.current
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d', { alpha: true })
    if (!host || !canvas || !context) {
      setRevealing(true)
      return
    }

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setRevealing(true)
      return
    }

    let frameId = 0
    let startTime = 0
    let lastFrameTime = 0
    let viewWidth = 0
    let viewHeight = 0
    let pixelRatio = 1
    let imageRect = { x: 0, y: 0, width: 0, height: 0 }
    let particles: Glyph[] = []
    let disposed = false
    let revealStarted = false
    let guideStarted = false

    const image = new Image()
    image.src = wallpaper

    const buildParticles = () => {
      viewWidth = Math.max(1, host.clientWidth)
      viewHeight = Math.max(1, host.clientHeight)
      pixelRatio = Math.min(window.devicePixelRatio || 1, 1.25, 1600 / viewWidth, 1000 / viewHeight)
      canvas.width = Math.round(viewWidth * pixelRatio)
      canvas.height = Math.round(viewHeight * pixelRatio)
      canvas.style.width = `${viewWidth}px`
      canvas.style.height = `${viewHeight}px`
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
      if (!image.complete || !image.naturalWidth) return

      const scale = Math.min(viewWidth / image.naturalWidth, viewHeight / image.naturalHeight)
      imageRect = {
        x: (viewWidth - image.naturalWidth * scale) / 2,
        y: (viewHeight - image.naturalHeight * scale) / 2,
        width: image.naturalWidth * scale,
        height: image.naturalHeight * scale,
      }

      const sampleScale = Math.min(1, 1000 / imageRect.width)
      const sampleCanvas = document.createElement('canvas')
      sampleCanvas.width = Math.max(1, Math.round(imageRect.width * sampleScale))
      sampleCanvas.height = Math.max(1, Math.round(imageRect.height * sampleScale))
      const sampleContext = sampleCanvas.getContext('2d', { willReadFrequently: true })
      if (!sampleContext) return
      sampleContext.drawImage(image, 0, 0, sampleCanvas.width, sampleCanvas.height)

      const pixels = sampleContext.getImageData(0, 0, sampleCanvas.width, sampleCanvas.height).data
      const candidates: Glyph[] = []
      const step = 4
      const centerX = viewWidth / 2
      const centerY = viewHeight / 2
      const maxDistance = Math.hypot(viewWidth * 0.5, viewHeight * 0.5)

      for (let py = 1; py < sampleCanvas.height - 1; py += step) {
        for (let px = 1; px < sampleCanvas.width - 1; px += step) {
          const offset = (py * sampleCanvas.width + px) * 4
          const r = pixels[offset]
          const g = pixels[offset + 1]
          const b = pixels[offset + 2]
          const opacity = pixels[offset + 3] / 255
          const brightness = (r * 0.2126 + g * 0.7152 + b * 0.0722) / 255
          // The clean reference is transparent around the weapon core. Ignore
          // faint edge haze so glyphs trace the actual swords instead of clouds.
          if (brightness < 0.34 || opacity < 0.3) continue

          const selection = ((px * 17 + py * 31) % 100) / 100
          if (selection > clamp((brightness - 0.2) * opacity * 1.5, 0.12, 0.84)) continue

          const x = imageRect.x + px / sampleScale
          const y = imageRect.y + py / sampleScale
          const distance = Math.hypot(x - centerX, y - centerY) / maxDistance
          const color = colorFor(r, g, b)
          const side = color === '#4c9fff' || color === '#75f2f2' ? -1 : 1
          const rotation = side < 0 ? -0.13 : 0.13
          const dx = x - centerX
          const dy = y - centerY
          const buildX = centerX + dx * Math.cos(rotation) - dy * Math.sin(rotation)
          const buildY = centerY + dx * Math.sin(rotation) + dy * Math.cos(rotation)
          const random = (px * 7 + py * 13) % 19

          candidates.push({
            x,
            y,
            stagingX: side < 0 ? viewWidth * 0.25 : viewWidth * 0.75,
            stagingY: centerY + (y - centerY) * 0.16,
            buildX,
            buildY,
            side,
            delay: distance * 0.12,
            size: 9 + random * 0.27,
            char: GLYPHS[(px * 11 + py * 19) % GLYPHS.length],
            color,
            brightness,
            curve: side * (18 + Math.sin(py * 0.037) * 34),
          })
        }
      }

      if (candidates.length > MAX_GLYPHS) {
        const stride = candidates.length / MAX_GLYPHS
        particles = Array.from({ length: MAX_GLYPHS }, (_, i) => candidates[Math.floor(i * stride)])
      } else {
        particles = candidates
      }
    }

    const drawTerminal = (elapsed: number) => {
      context.save()
      context.shadowColor = '#4ceeff'
      context.shadowBlur = 8
      context.fillStyle = '#7aefff'
      context.font = '16px ui-monospace, Consolas, monospace'
      context.textAlign = 'center'
      context.textBaseline = 'middle'

      if (elapsed < VOID_END) {
        const stages = [
          { at: 0.42, text: '>' },
          { at: 0.78, text: '> S' },
          { at: 1.15, text: '> SY' },
          { at: 1.52, text: '> SYS' },
        ]
        const stage = stages.filter((item) => elapsed >= item.at).at(-1)
        if (stage) {
          context.fillText(stage.text, viewWidth / 2, viewHeight / 2)
          if (Math.floor(elapsed * 2.6) % 2 === 0) {
            const cursorX = viewWidth / 2 + context.measureText(stage.text).width / 2 + 8
            context.fillText('_', cursorX, viewHeight / 2)
          }
        }
      } else {
        const logOpacity = 1 - easeOut((elapsed - 7.05) / 0.65)
        if (elapsed < 7.7) {
          const lines = INIT_LINES.filter((line) => elapsed >= line.at)
          const firstY = viewHeight / 2 - (INIT_LINES.length - 1) * 11
          lines.forEach((line, index) => {
            typewriterLine(context, line.text, line.at, elapsed, viewWidth / 2, firstY + index * 22, logOpacity)
          })
        }

        const completionOpacity = easeOut((elapsed - 12.65) / 0.2) * (1 - easeOut((elapsed - 13.72) / 0.28))
        if (completionOpacity > 0) {
          OVERRIDE_LINES.forEach((line, index) => {
            typewriterLine(context, line.text, line.at, elapsed, viewWidth / 2, viewHeight / 2 + 100 + index * 21, completionOpacity)
          })
        }
      }
      context.restore()
      context.globalAlpha = 1
    }

    const drawOverride = (elapsed: number) => {
      if (elapsed < 11.85 || elapsed > OVERRIDE_END) return
      const centerX = viewWidth / 2
      const centerY = viewHeight / 2
      const shockProgress = clamp((elapsed - 11.95) / 1.1, 0, 1)
      const maxRadius = Math.hypot(viewWidth, viewHeight) * 0.58
      const radius = 8 + shockProgress * maxRadius
      const impact = Math.exp(-(((elapsed - 12.08) / 0.16) ** 2))

      if (impact > 0.015) {
        const glow = context.createRadialGradient(centerX, centerY, 0, centerX, centerY, Math.max(2, 100 + impact * 230))
        glow.addColorStop(0, `rgba(238, 255, 255, ${impact * 0.95})`)
        glow.addColorStop(0.12, `rgba(117, 235, 255, ${impact * 0.45})`)
        glow.addColorStop(1, 'rgba(80, 180, 255, 0)')
        context.fillStyle = glow
        context.fillRect(0, 0, viewWidth, viewHeight)
      }

      if (shockProgress > 0) {
        const ringOpacity = 0.76 * (1 - shockProgress)
        context.beginPath()
        context.arc(centerX, centerY, radius, 0, Math.PI * 2)
        context.strokeStyle = `rgba(116, 232, 255, ${ringOpacity})`
        context.lineWidth = 1.5 + (1 - shockProgress) * 3
        context.stroke()

        context.font = '10px ui-monospace, Consolas, monospace'
        context.textAlign = 'center'
        context.textBaseline = 'middle'
        for (let index = 0; index < 56; index += 1) {
          const angle = (index / 56) * Math.PI * 2
          const spread = radius * (0.72 + ((index * 17) % 31) / 100)
          context.globalAlpha = ringOpacity * (0.45 + ((index * 13) % 50) / 100)
          context.fillStyle = index % 3 === 0 ? '#f5eaf4' : '#70dfff'
          context.fillText(GLYPHS[(index * 7 + Math.floor(elapsed * 20)) % GLYPHS.length], centerX + Math.cos(angle) * spread, centerY + Math.sin(angle) * spread)
        }
        context.globalAlpha = 1
      }
    }

    const drawParticles = (elapsed: number) => {
      const centerX = viewWidth / 2
      const centerY = viewHeight / 2

      for (const glyph of particles) {
        let point: { x: number; y: number }
        let progress: number

        if (elapsed < INIT_END) {
          progress = easeOut((elapsed - 2.05 - glyph.delay) / 2.75)
          point = curvePoint(centerX, centerY, glyph.stagingX, glyph.stagingY, progress, glyph.curve)
        } else if (elapsed < DUAL_WIELD_END) {
          progress = easeOut((elapsed - INIT_END) / (DUAL_WIELD_END - INIT_END)) * 0.62
          point = curvePoint(glyph.stagingX, glyph.stagingY, glyph.buildX, glyph.buildY, progress, glyph.curve * 0.8)
        } else {
          const construction = easeOut((elapsed - DUAL_WIELD_END - glyph.delay * 0.35) / 3.55)
          progress = 0.62 + construction * 0.38
          point = curvePoint(glyph.stagingX, glyph.stagingY, glyph.buildX, glyph.buildY, progress, glyph.curve * 0.8)

          const inward = easeOut((elapsed - CONSTRUCTION_END) / 1.05)
          point.x += (glyph.x - glyph.buildX) * inward
          point.y += (glyph.y - glyph.buildY) * inward
        }

        if (elapsed < 2.05 || (elapsed < INIT_END && progress < 0.025)) continue
        const settling = elapsed > CONSTRUCTION_END ? 1 : 0
        const pulse = 1 + Math.sin(elapsed * 5 + glyph.x * 0.01) * 0.008 * settling
        const fadeOut = elapsed < REVEAL_START ? 1 : 1 - clamp((elapsed - REVEAL_START) / REVEAL_DURATION, 0, 1)
        const phaseAlpha = elapsed < INIT_END ? 0.72 : elapsed < DUAL_WIELD_END ? 0.86 : 1
        const emergence = elapsed < INIT_END ? clamp(progress * 1.5, 0, 1) : 1
        const alpha = clamp((0.18 + glyph.brightness * 0.98) * fadeOut * phaseAlpha * emergence, 0, 1)
        if (alpha <= 0) continue

        context.font = `${glyph.size * pulse}px ui-monospace, Consolas, monospace`
        context.fillStyle = glyph.color
        context.globalAlpha = alpha * 0.22
        context.fillText(glyph.char, point.x - glyph.side * 4, point.y - 3)
        context.globalAlpha = alpha
        context.fillText(glyph.char, point.x, point.y)
      }
      context.globalAlpha = 1
    }

    const render = (now: number) => {
      if (disposed) return
      if (!startTime) startTime = now
      if (now - lastFrameTime < 1000 / 30) {
        frameId = window.requestAnimationFrame(render)
        return
      }
      lastFrameTime = now
      const elapsed = (now - startTime) / 1000

      context.clearRect(0, 0, viewWidth, viewHeight)
      drawParticles(elapsed)
      drawOverride(elapsed)
      drawTerminal(elapsed)

      const revealProgress = clamp((elapsed - REVEAL_START) / REVEAL_DURATION, 0, 1)
      if (elapsed >= OVERRIDE_END && !guideStarted) {
        guideStarted = true
        setGuideVisible(true)
      }
      if (revealProgress > 0 && !revealStarted) {
        revealStarted = true
        setRevealing(true)
      }
      if (revealProgress >= 1) return
      frameId = window.requestAnimationFrame(render)
    }

    const onImageLoad = () => {
      if (disposed) return
      buildParticles()
      startTime = 0
      frameId = window.requestAnimationFrame(render)
    }

    image.addEventListener('load', onImageLoad)
    if (image.complete && image.naturalWidth) onImageLoad()
    window.addEventListener('resize', buildParticles)

    return () => {
      disposed = true
      window.cancelAnimationFrame(frameId)
      window.removeEventListener('resize', buildParticles)
      image.removeEventListener('load', onImageLoad)
      particles = []
    }
  }, [])

  return (
    <div ref={hostRef} className="wallpaper-screen">
      <img
        className={`wallpaper-image${guideVisible ? ' is-guide' : ''}${revealing ? ' is-visible' : ''}`}
        src={wallpaper}
        alt="Elucidator and Lambent Light crossed, glowing against a black background"
      />
      <canvas ref={canvasRef} className={`code-reveal${revealing ? ' is-fading' : ''}`} aria-hidden="true" />
      <AuraMist active={revealing} />
    </div>
  )
}
