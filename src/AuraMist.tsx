import { useEffect, useRef } from 'react'
import wallpaper from '../kiritoasuna.jpg'

type Wisp = {
  x: number
  y: number
  angle: number
  length: number
  phase: number
  speed: number
  width: number
  color: string
  alpha: number
}

type Rect = { x: number; y: number; width: number; height: number }
type Anchor = { x: number; y: number; angle: number }

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function makeMask(image: HTMLImageElement, rect: Rect) {
  const sampleWidth = Math.max(1, Math.round(Math.min(rect.width, 640)))
  const sampleHeight = Math.max(1, Math.round(sampleWidth * (image.naturalHeight / image.naturalWidth)))
  const source = document.createElement('canvas')
  source.width = sampleWidth
  source.height = sampleHeight
  const sourceContext = source.getContext('2d', { willReadFrequently: true })
  if (!sourceContext) return { mask: source, anchors: [] as Anchor[] }

  sourceContext.drawImage(image, 0, 0, sampleWidth, sampleHeight)
  const imageData = sourceContext.getImageData(0, 0, sampleWidth, sampleHeight)
  const data = imageData.data
  const maskData = sourceContext.createImageData(sampleWidth, sampleHeight)
  const anchors: Anchor[] = []
  const luminances = new Float32Array(sampleWidth * sampleHeight)
  const distances = new Float32Array(sampleWidth * sampleHeight)
  const far = sampleWidth + sampleHeight

  for (let i = 0; i < luminances.length; i += 1) {
    const offset = i * 4
    luminances[i] = (data[offset] * 0.2126 + data[offset + 1] * 0.7152 + data[offset + 2] * 0.0722) / 255
    distances[i] = luminances[i] > 0.62 ? 0 : far
  }

  // Approximate distance to the bright sword/guard pixels. The moving mist
  // is only allowed in a narrow halo around those forms.
  const diagonal = Math.SQRT2
  for (let y = 1; y < sampleHeight; y += 1) {
    for (let x = 1; x < sampleWidth; x += 1) {
      const i = y * sampleWidth + x
      distances[i] = Math.min(
        distances[i],
        distances[i - 1] + 1,
        distances[i - sampleWidth] + 1,
        distances[i - sampleWidth - 1] + diagonal,
      )
    }
  }
  for (let y = sampleHeight - 2; y >= 0; y -= 1) {
    for (let x = sampleWidth - 2; x >= 0; x -= 1) {
      const i = y * sampleWidth + x
      distances[i] = Math.min(
        distances[i],
        distances[i + 1] + 1,
        distances[i + sampleWidth] + 1,
        distances[i + sampleWidth + 1] + diagonal,
      )
    }
  }

  for (let y = 1; y < sampleHeight - 1; y += 1) {
    for (let x = 1; x < sampleWidth - 1; x += 1) {
      const offset = (y * sampleWidth + x) * 4
      const pixel = y * sampleWidth + x
      const bright = luminances[pixel]
      const edge = Math.max(
        Math.abs(bright - luminances[pixel + 1]),
        Math.abs(bright - luminances[pixel + sampleWidth]),
        Math.abs(bright - luminances[pixel - 1]),
        Math.abs(bright - luminances[pixel - sampleWidth]),
      )

      const nearBlade = clamp((distances[pixel] - 1.5) / 4, 0, 1)
        * clamp((218 - distances[pixel]) / 60, 0, 1)
      const region = x / sampleWidth > 0.12 && x / sampleWidth < 0.9
        && y / sampleHeight > 0.02 && y / sampleHeight < 0.98 ? 1 : 0

      // The sword edges are crisp and bright; animate only the image's soft
      // haze close to those contours, leaving the rest of the black field clear.
      const softness = clamp((bright - 0.012) * 2.7, 0, 0.82)
        * clamp(1 - edge * 5.2, 0, 1)
        * clamp((0.8 - bright) * 3.2, 0, 1)
        * nearBlade
        * region
      const alpha = Math.round(softness * 255)
      // Keep the source haze hue while dropping its opaque sword pixels.
      maskData.data[offset] = data[offset]
      maskData.data[offset + 1] = data[offset + 1]
      maskData.data[offset + 2] = data[offset + 2]
      maskData.data[offset + 3] = alpha

      if (alpha > 10 && (x * 13 + y * 29) % 11 < 5) {
        const gx = luminances[pixel + 1] - luminances[pixel - 1]
        const gy = luminances[pixel + sampleWidth] - luminances[pixel - sampleWidth]
        const normalAngle = Math.atan2(gy, gx)
        anchors.push({
          x: rect.x + (x / sampleWidth) * rect.width,
          y: rect.y + (y / sampleHeight) * rect.height,
          angle: normalAngle + Math.PI / 2,
        })
      }
    }
  }

  sourceContext.putImageData(maskData, 0, 0)
  return { mask: source, anchors }
}

export function AuraMist({ active }: { active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d', { alpha: true })
    if (!active || !canvas || !context || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    let frameId = 0
    let disposed = false
    let width = 0
    let height = 0
    let ratio = 1
    let imageRect: Rect = { x: 0, y: 0, width: 0, height: 0 }
    let maskCanvas: HTMLCanvasElement | undefined
    let wisps: Wisp[] = []
    const image = new Image()
    image.src = wallpaper

    const resize = () => {
      width = Math.max(1, canvas.clientWidth)
      height = Math.max(1, canvas.clientHeight)
      ratio = Math.min(window.devicePixelRatio || 1, 1, 1280 / width, 800 / height)
      canvas.width = Math.round(width * ratio)
      canvas.height = Math.round(height * ratio)
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      context.setTransform(ratio, 0, 0, ratio, 0, 0)

      if (!image.complete || !image.naturalWidth) return
      const scale = Math.min(width / image.naturalWidth, height / image.naturalHeight)
      imageRect = {
        x: (width - image.naturalWidth * scale) / 2,
        y: (height - image.naturalHeight * scale) / 2,
        width: image.naturalWidth * scale,
        height: image.naturalHeight * scale,
      }
      const result = makeMask(image, imageRect)
      maskCanvas = result.mask

      let seed = 84931
      const random = () => {
        seed = (seed * 16807) % 2147483647
        return (seed - 1) / 2147483646
      }
      const scaleFactor = Math.max(0.65, imageRect.width / 1500)
      wisps = Array.from({ length: 58 }, (_, index) => {
        const anchor = result.anchors[Math.floor(random() * result.anchors.length)]
        const x = anchor?.x ?? width / 2
        const y = anchor?.y ?? height / 2
        const color = index % 4 === 0 ? '#f2dce9' : index % 3 === 0 ? '#c4f8ff' : '#59dce9'
        return {
          x,
          y,
          angle: (anchor?.angle ?? 0) + (random() - 0.5) * 0.72,
          length: (36 + random() * 116) * scaleFactor,
          phase: random() * Math.PI * 2,
          speed: 0.22 + random() * 0.48,
          width: (0.8 + random() * 1.5) * scaleFactor,
          color,
          alpha: 0.24 + random() * 0.3,
        }
      })
    }

    const render = (now: number) => {
      if (disposed) return
      context.clearRect(0, 0, width, height)
      const time = now / 1000
      context.globalCompositeOperation = 'screen'
      context.lineCap = 'round'

      if (maskCanvas) {
        // Rebuild the original broad aura from its extracted soft-pixel mask.
        // Three gently offset passes keep the cloud full while making it move;
        // this is a few GPU-scaled blits rather than hundreds of blurred paths.
        const driftX = Math.sin(time * 0.34) * 8
        const driftY = Math.cos(time * 0.27) * 6
        const pulse = 0.42 + Math.sin(time * 0.62) * 0.035
        context.globalAlpha = pulse
        context.drawImage(maskCanvas, imageRect.x + driftX, imageRect.y + driftY, imageRect.width * 1.012, imageRect.height * 1.012)
        context.globalAlpha = 0.2 + Math.sin(time * 0.45 + 1.4) * 0.025
        context.drawImage(maskCanvas, imageRect.x - driftX * 0.72, imageRect.y - driftY * 0.9, imageRect.width * 0.99, imageRect.height * 0.99)
        context.globalAlpha = 0.12 + Math.sin(time * 0.38 + 2.7) * 0.02
        context.drawImage(maskCanvas, imageRect.x + driftY * 0.4, imageRect.y - driftX * 0.28, imageRect.width, imageRect.height)
      }
      context.globalAlpha = 1

      for (const wisp of wisps) {
        const drift = Math.sin(time * wisp.speed + wisp.phase) * 16
        const flow = Math.cos(time * wisp.speed * 0.7 + wisp.phase) * 10
        const dx = Math.cos(wisp.angle)
        const dy = Math.sin(wisp.angle)
        const nx = -dy
        const ny = dx
        const startX = wisp.x + nx * drift - dx * wisp.length * 0.5
        const startY = wisp.y + ny * drift - dy * wisp.length * 0.5
        const endX = wisp.x + nx * drift + dx * wisp.length * 0.5
        const endY = wisp.y + ny * drift + dy * wisp.length * 0.5
        const bend = Math.sin(time * wisp.speed + wisp.phase) * 34 + flow

        // A broad translucent body and a brighter curling filament give each
        // wisp enough volume to read as smoke against the clean black field.
        const midX = wisp.x + nx * bend * 0.48
        const midY = wisp.y + ny * bend * 0.48
        context.beginPath()
        context.moveTo(startX, startY)
        context.quadraticCurveTo(midX + nx * 16, midY + ny * 16, endX, endY)
        context.strokeStyle = wisp.color
        context.lineWidth = wisp.width * 2.6
        context.globalAlpha = wisp.alpha * 0.28
        context.shadowColor = wisp.color
        context.shadowBlur = 0
        context.stroke()

        context.beginPath()
        context.moveTo(startX, startY)
        context.quadraticCurveTo(midX - nx * 12, midY - ny * 12, endX, endY)
        context.strokeStyle = wisp.color
        context.lineWidth = wisp.width
        context.globalAlpha = wisp.alpha * 0.82
        context.shadowColor = wisp.color
        context.shadowBlur = 0
        context.stroke()
      }

      context.globalAlpha = 1
      context.shadowBlur = 0
      context.globalCompositeOperation = 'source-over'
      frameId = window.requestAnimationFrame(render)
    }

    const onLoad = () => {
      if (disposed) return
      resize()
      frameId = window.requestAnimationFrame(render)
    }
    image.addEventListener('load', onLoad)
    if (image.complete && image.naturalWidth) onLoad()
    window.addEventListener('resize', resize)

    return () => {
      disposed = true
      window.cancelAnimationFrame(frameId)
      window.removeEventListener('resize', resize)
      image.removeEventListener('load', onLoad)
      wisps = []
      maskCanvas = undefined
    }
  }, [active])

  return <canvas ref={canvasRef} className={`aura-mist${active ? ' is-active' : ''}`} aria-hidden="true" />
}
