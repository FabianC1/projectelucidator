import { useEffect, useRef, type CSSProperties } from 'react'
import * as THREE from 'three'
import { gsap } from 'gsap'
import './BootSequence.css'

type BootDiagnostics = { viewport: { width: number; height: number }; scene: DOMRect; hud: DOMRect; canvas: { width: number; height: number; clientWidth: number; clientHeight: number; pixelRatio: number }; assignedViewport?: CSSProperties; ancestors: Array<{ tag: string; className: string; position: string; transform: string; width: string; height: string }> }
type TimelineWindow = Window & { __elucidatorBootTimeline?: gsap.core.Timeline; __elucidatorBootDiagnostics?: BootDiagnostics[] }
type DiagnosticLine = { label: string; value: string }
const coreModules: DiagnosticLine[] = [{ label: 'SYS_CORE', value: 'INITIALISING' }, { label: 'KERNEL_CHANNEL', value: 'LINKED' }, { label: 'DISPLAY_DRIVER', value: 'ONLINE' }, { label: 'MEMORY_BUFFER', value: 'ALLOCATED' }, { label: 'INPUT_BRIDGE', value: 'READY' }, { label: 'THEME_ENGINE', value: 'LOADED' }, { label: 'WALLPAPER_DECODER', value: 'BUFFERED' }, { label: 'COLOURSPACE', value: 'MAPPED' }, { label: 'RENDER_PIPELINE', value: 'ACTIVE' }, { label: 'COMPOSITOR', value: 'SYNCED' }, { label: 'SIGNATURE_CHECK', value: 'VERIFIED' }, { label: 'MODULES', value: '16 / 16' }, { label: 'CACHE_MANIFEST', value: 'MOUNTED' }, { label: 'RECOVERY_LAYER', value: 'STANDBY' }, { label: 'INTERFACE_BUS', value: 'NOMINAL' }, { label: 'SYSTEM_INTEGRITY', value: 'VERIFIED' }]
const sceneModules: DiagnosticLine[] = [{ label: 'SCENE_GRAPH', value: 'BUILDING' }, { label: 'GEOMETRY_NODES', value: '128' }, { label: 'FRAME_ASSEMBLY', value: 'COMPLETE' }, { label: 'RAIL_NETWORK', value: 'LINKED' }, { label: 'GLASS_LAYERS', value: 'MAPPED' }, { label: 'SHADER_PIPELINE', value: 'LINKED' }, { label: 'TEXTURE_BUFFER', value: 'BUFFERED' }, { label: 'LIGHT_FIELD', value: 'STABLE' }, { label: 'DEPTH_MATRIX', value: 'LOCKED' }, { label: 'DISPLAY_SYNC', value: 'ESTABLISHED' }, { label: 'ASSET_VALIDATION', value: 'PASSED' }, { label: 'APERTURE_FRAME', value: 'ARMED' }, { label: 'WALLPAPER_LINK', value: 'READY' }, { label: 'SIGNAL_CHANNEL', value: 'NOMINAL' }, { label: 'STANDBY_LAYER', value: 'AVAILABLE' }, { label: 'REVEAL_SEQUENCE', value: 'ARMED' }]
type Props = { active: boolean; standby: boolean; short: boolean; wallpaperReady: boolean; onStandby: () => void; onActivate: () => void; viewport?: CSSProperties; debug?: boolean }

export function BootSequence({ active, standby, short, wallpaperReady, onStandby, onActivate, viewport, debug = true }: Props) {
  const mount = useRef<HTMLElement>(null); const standbyRef = useRef(onStandby); const activateRef = useRef(onActivate); const wallpaperReadyRef = useRef(wallpaperReady); const timelineRef = useRef<gsap.core.Timeline | null>(null); const waitingForWallpaperRef = useRef(false)
  useEffect(() => { standbyRef.current = onStandby }, [onStandby]); useEffect(() => { activateRef.current = onActivate }, [onActivate])
  useEffect(() => { wallpaperReadyRef.current = wallpaperReady; if (wallpaperReady && waitingForWallpaperRef.current) { waitingForWallpaperRef.current = false; timelineRef.current?.play() } }, [wallpaperReady])
  useEffect(() => {
    const host = mount.current
    if (!host || !active) return
    if (matchMedia('(prefers-reduced-motion: reduce)').matches && !standby) { standbyRef.current(); return }
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' }); renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5)); renderer.setClearAlpha(0); host.appendChild(renderer.domElement)
    const scene = new THREE.Scene(); const camera = new THREE.PerspectiveCamera(44, 1, .1, 92); camera.position.set(0, 0, 14); const corridor = new THREE.Group(); scene.add(corridor); const depths = Array.from({ length: 8 }, (_, index) => -index * 4.2)
    const frameMaterials: THREE.LineBasicMaterial[] = []; const panelMaterials: THREE.MeshBasicMaterial[] = []; const panelEdgeMaterials: THREE.LineBasicMaterial[] = []; const panels: THREE.Mesh[] = []; const makeLineMaterial = (color = 0x62dfff) => new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0 })
    depths.forEach((z, index) => {
      const material = makeLineMaterial(index < 2 ? 0xc2f7ff : 0x38b7d9); frameMaterials.push(material); const frame = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(9.4, 5.8, .01)), material); frame.position.z = z; corridor.add(frame)
        ;[-1, 1].forEach(side => { const glass = new THREE.MeshBasicMaterial({ color: 0x2bbde8, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }); const panel = new THREE.Mesh(new THREE.PlaneGeometry(3.35, 3.8), glass); panel.position.set(side * 5.65, 0, z); panel.rotation.y = side * Math.PI / 2; panelMaterials.push(glass); panels.push(panel); corridor.add(panel); const edge = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(3.35, 3.8)), makeLineMaterial(0x86efff)); edge.position.copy(panel.position); edge.rotation.copy(panel.rotation); panelEdgeMaterials.push(edge.material as THREE.LineBasicMaterial); corridor.add(edge) })
    })
    const rails: number[] = []; const architecture: number[] = []
    for (let i = 0; i < depths.length - 1; i++) { for (const [x, y] of [[-4.7, -2.9], [-4.7, 2.9], [4.7, -2.9], [4.7, 2.9]]) rails.push(x, y, depths[i], x, y, depths[i + 1]); for (const y of [-2.48, 2.48]) for (const [x0, x1] of [[-3.8, -1.65], [-.9, .9], [1.65, 3.8]]) architecture.push(x0, y, depths[i], x1, y, depths[i]); for (const x of [-4.05, 4.05]) architecture.push(x, -2.65, depths[i], x, 2.65, depths[i]) }
    const railMaterial = makeLineMaterial(0x4fdcff); corridor.add(new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(rails, 3)), railMaterial)); const architectureMaterial = makeLineMaterial(0x2284a4); corridor.add(new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(architecture, 3)), architectureMaterial)); const hazeMaterial = new THREE.MeshBasicMaterial({ color: 0x1677a0, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }); const haze = new THREE.Mesh(new THREE.PlaneGeometry(11, 6.5), hazeMaterial); haze.position.z = -16; corridor.add(haze)
    // Static standby is its own display architecture. It is deliberately independent of
    // the boot corridor, with one central viewport and two glass layers per side.
    const standbyGroup = new THREE.Group(); standbyGroup.visible = false; scene.add(standbyGroup)
    // Increase standby hologram height without changing horizontal positions.
    standbyGroup.scale.y = 1.20
    // Derive every horizontal standby coordinate from the real camera frustum.
    // This preserves intended screen-space proportions at 16:9 and 32:9 without
    // scaling a 16:9 composition horizontally.

    const standbyAspect = Math.max(1, host.clientWidth / Math.max(1, host.clientHeight))
    const standbyViewHeight = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z
    const standbyViewWidth = standbyViewHeight * standbyAspect
    const standbyLineMaterials: THREE.LineBasicMaterial[] = []; const standbyGlassMaterials: THREE.MeshBasicMaterial[] = []
    const addStandbyLines = (points: number[], color: number, opacity: number) => { const material = makeLineMaterial(color); material.userData.targetOpacity = opacity; standbyLineMaterials.push(material); const geometry = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(points, 3)); standbyGroup.add(new THREE.LineSegments(geometry, material)) }


    // Perspective rails: dark in the distance, brighter toward the viewer.
    const addGradientStandbyRail = (
      start: THREE.Vector3,
      end: THREE.Vector3,
      farColour: number,
      nearColour: number,
      opacity: number
    ) => {
      const segments = 16
      const positions: number[] = []
      const colours: number[] = []

      const far = new THREE.Color(farColour)
      const near = new THREE.Color(nearColour)

      for (let i = 0; i < segments; i++) {
        const t0 = i / segments
        const t1 = (i + 1) / segments

        const p0 = start.clone().lerp(end, t0)
        const p1 = start.clone().lerp(end, t1)

        positions.push(
          p0.x, p0.y, p0.z,
          p1.x, p1.y, p1.z
        )

        // Gentle brightness buildup rather than an abrupt change.

        const c0 = near.clone().lerp(far, t0 * t0)
        const c1 = near.clone().lerp(far, t1 * t1)

        colours.push(
          c0.r, c0.g, c0.b,
          c1.r, c1.g, c1.b
        )
      }

      const geometry = new THREE.BufferGeometry()
      geometry.setAttribute(
        'position',
        new THREE.Float32BufferAttribute(positions, 3)
      )
      geometry.setAttribute(
        'color',
        new THREE.Float32BufferAttribute(colours, 3)
      )

      const material = new THREE.LineBasicMaterial({
        color: 0xffffff,
        vertexColors: true,
        transparent: true,
        opacity: 0,
        depthWrite: false
      })

      material.userData.targetOpacity = opacity
      standbyLineMaterials.push(material)

      standbyGroup.add(new THREE.LineSegments(geometry, material))
    }


    // Subtle translucent holographic glass.
    // One shared texture for all four standby panels.
    const glassCanvas = document.createElement('canvas')
    glassCanvas.width = 256
    glassCanvas.height = 512

    const glassCtx = glassCanvas.getContext('2d')!

    // Soft horizontal variation, like illuminated glass.
    const glassGradient = glassCtx.createLinearGradient(
      0, 0, glassCanvas.width, 0
    )

    glassGradient.addColorStop(0, 'rgba(255,255,255,0.42)')
    glassGradient.addColorStop(0.18, 'rgba(255,255,255,0.17)')
    glassGradient.addColorStop(0.55, 'rgba(255,255,255,0.07)')
    glassGradient.addColorStop(0.85, 'rgba(255,255,255,0.13)')
    glassGradient.addColorStop(1, 'rgba(255,255,255,0.32)')

    glassCtx.fillStyle = glassGradient
    glassCtx.fillRect(0, 0, 256, 512)

    // Very faint horizontal reflection bands.
    for (let i = 0; i < 5; i++) {
      const y = 48 + i * 96

      const reflection = glassCtx.createLinearGradient(
        0, y, 0, y + 30
      )

      reflection.addColorStop(0, 'rgba(255,255,255,0)')
      reflection.addColorStop(0.5, 'rgba(255,255,255,0.055)')
      reflection.addColorStop(1, 'rgba(255,255,255,0)')

      glassCtx.fillStyle = reflection
      glassCtx.fillRect(0, y, 256, 30)
    }

    const standbyGlassTexture = new THREE.CanvasTexture(glassCanvas)
    standbyGlassTexture.colorSpace = THREE.SRGBColorSpace
    standbyGlassTexture.needsUpdate = true


    // Soft illumination for selected panel telemetry lines.
    const telemetryGlowCanvas = document.createElement('canvas')
    telemetryGlowCanvas.width = 16
    telemetryGlowCanvas.height = 64

    const telemetryGlowCtx = telemetryGlowCanvas.getContext('2d')!
    const telemetryGradient =
      telemetryGlowCtx.createLinearGradient(0, 0, 0, 64)

    telemetryGradient.addColorStop(0, 'rgba(65,155,255,0)')
    telemetryGradient.addColorStop(.25, 'rgba(65,155,255,0.12)')
    telemetryGradient.addColorStop(.5, 'rgba(165,225,255,0.75)')
    telemetryGradient.addColorStop(.75, 'rgba(65,155,255,0.12)')
    telemetryGradient.addColorStop(1, 'rgba(65,155,255,0)')

    telemetryGlowCtx.fillStyle = telemetryGradient
    telemetryGlowCtx.fillRect(0, 0, 16, 64)

    const telemetryGlowTexture =
      new THREE.CanvasTexture(telemetryGlowCanvas)


    const addDepthWing = (side: -1 | 1) => {
      const panels = [
        // D1 foreground and D2 rear retain the accepted responsive anchors but
        // differ materially in detail density, scanning, and illumination.



        { width: 1.95, height: 7.15, x: 9.6, z: -.72, opacity: .24, edge: .78, colour: 0x123E78, density: 1 },
        { width: 2.15, height: 6.9, x: 7.95, z: -1.48, opacity: .18, edge: .48, colour: 0x0B2858, density: .68 },



      ]
      panels.forEach(({ width, height, x, z, opacity, edge: edgeOpacity, colour, density }) => {

        const material = new THREE.MeshBasicMaterial({
          color: colour,
          map: standbyGlassTexture,
          transparent: true,
          opacity: 0,
          side: THREE.DoubleSide,
          depthWrite: false,
          depthTest: true,
          blending: THREE.NormalBlending
        })

        material.userData.targetOpacity = opacity

        const panelGroup = new THREE.Group(); panelGroup.position.set(side * x / 20.1 * standbyViewWidth, 0, z); panelGroup.rotation.y = side * -1.65; standbyGroup.add(panelGroup)
        panelGroup.add(new THREE.Mesh(new THREE.PlaneGeometry(width, height), material)); standbyGlassMaterials.push(material)
        const addPanelLine = (points: number[], color: number, targetOpacity: number) => {
          const lineMaterial = makeLineMaterial(color); lineMaterial.userData.targetOpacity = targetOpacity; standbyLineMaterials.push(lineMaterial)
          panelGroup.add(new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(points, 3)), lineMaterial))
        }
        const halfW = width * .5; const halfH = height * .5; const zOffset = .018

        // DIRECTIONAL HOLOGRAPHIC EDGE LIGHTING
        // Bright top/bottom edges and camera-facing side.
        // Dimmer edge facing into the wallpaper.

        const cameraEdgeX = side * halfW
        const wallpaperEdgeX = -side * halfW

        // Top and bottom: crisp white-blue illumination.
        addPanelLine([
          -halfW, halfH, zOffset,
          halfW, halfH, zOffset,

          -halfW, -halfH, zOffset,
          halfW, -halfH, zOffset,
        ], 0xC5EFFF, edgeOpacity * 1.0)

        // Camera-facing vertical edge: strongest blue-white.
        addPanelLine([
          cameraEdgeX, halfH, zOffset,
          cameraEdgeX, -halfH, zOffset,
        ], 0xA9E5FF, edgeOpacity * 1.0)

        // Wallpaper-facing vertical edge: deeper, quieter blue.
        addPanelLine([
          wallpaperEdgeX, halfH, zOffset,
          wallpaperEdgeX, -halfH, zOffset,
        ], 0x245AAB, edgeOpacity * .38)

        // Short luminous accents along the visible edges.
        addPanelLine([
          cameraEdgeX, halfH, zOffset,
          cameraEdgeX, halfH - height * .16, zOffset,

          cameraEdgeX, -halfH, zOffset,
          cameraEdgeX, -halfH + height * .14, zOffset,

          -halfW, halfH, zOffset,
          -halfW + width * .22, halfH, zOffset,

          halfW - width * .22, -halfH, zOffset,
          halfW, -halfH, zOffset,
        ], 0xE0F7FF, edgeOpacity * .95)

        // Brighter illuminated corners and separated edge runs retain the layered,
        // technical hologram language without making the perimeter heavy.
        addPanelLine([
          -halfW, halfH - height * .14, zOffset, -halfW, halfH, zOffset, -halfW, halfH, zOffset, -halfW + width * .3, halfH, zOffset,
          halfW - width * .23, halfH, zOffset, halfW, halfH, zOffset, halfW, halfH, zOffset, halfW, halfH - height * .11, zOffset,
          -halfW, -halfH + height * .12, zOffset, -halfW, -halfH, zOffset, -halfW, -halfH, zOffset, -halfW + width * .22, -halfH, zOffset,
          halfW - width * .32, -halfH, zOffset, halfW, -halfH, zOffset, halfW, -halfH, zOffset, halfW, -halfH + height * .16, zOffset,
        ], 0x76B7FF, edgeOpacity)

        // Structured holographic instrumentation.
        // Clean data modules rather than disconnected glyphs.
        const detailPoints: number[] = []
        const accentPoints: number[] = []

        const drawLine = (
          target: number[],
          x1: number, y1: number,
          x2: number, y2: number
        ) => {
          target.push(
            x1, y1, zOffset,
            x2, y2, zOffset
          )
        }

        const left = -halfW + width * .13
        const right = halfW - width * .13
        const contentWidth = right - left

        // Header: two clean illuminated rails.
        drawLine(
          accentPoints,
          left, halfH * .79,
          left + contentWidth * .66, halfH * .79
        )

        drawLine(
          detailPoints,
          left, halfH * .70,
          right, halfH * .70
        )

        // Three separate holographic data modules.
        for (let section = 0; section < 3; section++) {
          const top = halfH * .48 - section * height * .32

          // Small module identifier.
          drawLine(
            accentPoints,
            left, top,
            left + contentWidth * .19, top
          )

          // Data rows with varying lengths.
          for (let row = 0; row < 3; row++) {
            const y = top - height * (.047 + row * .057)

            const variation = Math.abs(
              Math.sin(section * 4.7 + row * 2.3 + density)
            )

            const length = contentWidth * (
              .30 + variation * .55
            )

            drawLine(
              detailPoints,
              left, y,
              left + length, y
            )

            // Bright segment at the beginning of selected rows.
            if (row === 0 || row === 2) {
              drawLine(
                accentPoints,
                left, y,
                left + length * .24, y
              )

              // Isolated luminous status indicator on each module.
              // Kept separate from the longer, dimmer data rows.
              const indicatorY = top - height * .104

              drawLine(
                accentPoints,
                left + contentWidth * .88,
                indicatorY,
                left + contentWidth * .97,
                indicatorY
              )

            }
          }

          // Thin module divider.
          drawLine(
            detailPoints,
            left, top - height * .24,
            right, top - height * .24
          )
        }

        // Bottom telemetry rail.
        const footerY = -halfH * .82

        drawLine(
          accentPoints,
          left, footerY,
          left + contentWidth * .38, footerY
        )

        drawLine(
          detailPoints,
          left + contentWidth * .48, footerY,
          right, footerY
        )


        // Quiet structural data.
        addPanelLine(
          detailPoints,
          0x347BC5,
          edgeOpacity * (density === 1 ? .50 : .46)
        )

        // Crisp white-blue telemetry highlights.
        // Keep the rear glass slightly softer.
        addPanelLine(
          accentPoints,
          0xE3F8FF,
          density === 1 ? .98 : .84
        )


        // Soft glow behind each selected telemetry stroke.
        // Reuse the existing standby fade-in lifecycle.
        const telemetryGlowMaterial = new THREE.MeshBasicMaterial({
          map: telemetryGlowTexture,
          color: 0x8ACFFF,
          transparent: true,
          opacity: 0,
          side: THREE.DoubleSide,
          depthWrite: false,
          depthTest: false,
          blending: THREE.AdditiveBlending
        })

        telemetryGlowMaterial.userData.targetOpacity =
          density === 1 ? .72 : .54

        standbyGlassMaterials.push(telemetryGlowMaterial)

        for (let i = 0; i < accentPoints.length; i += 6) {
          const x1 = accentPoints[i]
          const y1 = accentPoints[i + 1]
          const x2 = accentPoints[i + 3]
          const y2 = accentPoints[i + 4]

          const dx = x2 - x1
          const dy = y2 - y1
          const length = Math.hypot(dx, dy)

          if (length < .001) continue

          const glow = new THREE.Mesh(
            new THREE.PlaneGeometry(length + .12, .22),
            telemetryGlowMaterial
          )

          glow.position.set(
            (x1 + x2) / 2,
            (y1 + y2) / 2,
            zOffset + .008
          )

          glow.rotation.z = Math.atan2(dy, dx)
          panelGroup.add(glow)
        }


      })
    }
    // 7.2 × 7.2 inner aperture / 8.4 × 8.4 outer architecture. At 1920×1080 this
    // reads as a roughly 650 px transparent portal with a visible structural surround.

    // CENTRAL HUD FRAME
    // Bright vertical edges, subdued horizontal edges,
    // and short illuminated accents at all four corners.
    const frameX = standbyViewWidth * .311
    const frameY = standbyViewHeight * .29
    const corner = .34

    // Continuous left and right edges.
    addStandbyLines([
      -frameX, frameY, 0,
      -frameX, -frameY, 0,

      frameX, frameY, 0,
      frameX, -frameY, 0
    ], 0x79C7F5, .82)

    // Continuous top and bottom edges.
    // Deliberately darker than the vertical sides.
    addStandbyLines([
      -frameX, frameY, -.02,
      frameX, frameY, -.02,

      -frameX, -frameY, -.02,
      frameX, -frameY, -.02
    ], 0x245A9B, .46)

    // Bright vertical accents near each corner.
    addStandbyLines([
      -frameX, frameY, .025,
      -frameX, frameY - corner, .025,

      frameX, frameY, .025,
      frameX, frameY - corner, .025,

      -frameX, -frameY, .025,
      -frameX, -frameY + corner, .025,

      frameX, -frameY, .025,
      frameX, -frameY + corner, .025
    ], 0xE3F8FF, 1.0)

    // Short horizontal corner accents.
    // Slightly softer so the sides remain dominant.
    addStandbyLines([
      -frameX, frameY, .025,
      -frameX + corner, frameY, .025,

      frameX, frameY, .025,
      frameX - corner, frameY, .025,

      -frameX, -frameY, .025,
      -frameX + corner, -frameY, .025,

      frameX, -frameY, .025,
      frameX - corner, -frameY, .025
    ], 0xA8D9FF, .82)

    // One wide central frame: only a faint joining contour behind the bright corners.
    addStandbyLines([-frameX, frameY, -.08, frameX, frameY, -.08, frameX, -frameY, -.08, -frameX, -frameY, -.08, -frameX, frameY, -.08], 0x72bed4, .56)

    // Soft blue illumination behind the four frame corners.
    const cornerGlowCanvas = document.createElement('canvas')
    cornerGlowCanvas.width = 128
    cornerGlowCanvas.height = 128

    const cornerGlowCtx = cornerGlowCanvas.getContext('2d')!
    const cornerGlowGradient =
      cornerGlowCtx.createRadialGradient(64, 64, 0, 64, 64, 64)

    cornerGlowGradient.addColorStop(0, 'rgba(180,235,255,0.55)')
    cornerGlowGradient.addColorStop(0.18, 'rgba(95,180,255,0.32)')
    cornerGlowGradient.addColorStop(0.5, 'rgba(40,110,220,0.10)')
    cornerGlowGradient.addColorStop(1, 'rgba(20,60,150,0)')

    cornerGlowCtx.fillStyle = cornerGlowGradient
    cornerGlowCtx.fillRect(0, 0, 128, 128)

    const cornerGlowTexture =
      new THREE.CanvasTexture(cornerGlowCanvas)

    const standbyCornerGlowMaterials: THREE.SpriteMaterial[] = []

    for (const x of [-frameX, frameX]) {
      for (const y of [-frameY, frameY]) {
        const glowMaterial = new THREE.SpriteMaterial({
          map: cornerGlowTexture,
          color: 0x8ACFFF,
          transparent: true,
          opacity: 0,
          depthWrite: false,
          depthTest: false,
          blending: THREE.AdditiveBlending
        })

        const glow = new THREE.Sprite(glowMaterial)
        glow.position.set(x, y, -0.03)
        glow.scale.set(.95, .95, 1)

        standbyGroup.add(glow)
        standbyCornerGlowMaterials.push(glowMaterial)
      }
    }

    addDepthWing(-1); addDepthWing(1)
    // F1/F2: four dedicated perspective rails, two per side. They terminate at the
    // central frame rather than extending through it, so they imply depth without a tunnel.
    const standbyRailPaths: Array<{ start: THREE.Vector3; end: THREE.Vector3 }> = []
    const addPerspectiveRail = (side: -1 | 1, upper: boolean) => {
      const direction = upper ? 1 : -1
      const start = new THREE.Vector3(side * standbyViewWidth * .54, upper ? 3.0 : -1.65, -1.18)
      const end = new THREE.Vector3(side * frameX, upper ? 1.72 : -1.08, -.04)

      standbyRailPaths.push({ start, end })

      // Primary perspective rail: navy distance -> luminous foreground.
      addGradientStandbyRail(
        start,
        end,
        0x12345C,
        0xC8F0FF,
        .88
      )

      // Secondary parallel guide: darker and more restrained.
      addGradientStandbyRail(
        new THREE.Vector3(
          start.x,
          start.y + direction * .22,
          start.z - .12
        ),
        new THREE.Vector3(
          end.x,
          end.y + direction * .14,
          end.z - .04
        ),
        0x091D39,
        0x347BC5,
        .42
      )

    }
    addPerspectiveRail(-1, true); addPerspectiveRail(-1, false); addPerspectiveRail(1, true); addPerspectiveRail(1, false)
    // E: exactly two horizontal structural rails, above and below the viewport. They are
    // segmented guides, not another enclosing frame or a line through the wallpaper.
    const railX = standbyViewWidth * .269
    const upperRailY = 3.9; const lowerRailY = -3.4
    addStandbyLines([-railX, upperRailY, -.52, railX, upperRailY, -.52, -railX, lowerRailY, -.52, railX, lowerRailY, -.52], 0x4f9ab2, .34)
    addStandbyLines([-standbyViewWidth * .239, upperRailY, -.48, -standbyViewWidth * .109, upperRailY, -.48, standbyViewWidth * .109, upperRailY, -.48, standbyViewWidth * .239, upperRailY, -.48, -standbyViewWidth * .239, lowerRailY, -.48, -standbyViewWidth * .109, lowerRailY, -.48, standbyViewWidth * .109, lowerRailY, -.48, standbyViewWidth * .239, lowerRailY, -.48], 0xa4efff, .68)
    addStandbyLines([-.42, upperRailY, -.44, .42, upperRailY, -.44, -.42, lowerRailY, -.44, .42, lowerRailY, -.44], 0xe0fbff, .92)

    // Free-floating holographic particles between the
    // central HUD frame and the side glass panels.
    type FloatingParticleLayer = {
      geometry: THREE.BufferGeometry
      positions: Float32Array
      origins: Float32Array
      phases: Float32Array
      speeds: Float32Array
    }

    const floatingParticleLayers: FloatingParticleLayer[] = []

    const floatingSizes = [.022, .042, .075]
    const floatingOpacities = [.28, .48, .72]

    floatingSizes.forEach((size, layerIndex) => {
      const count = 120
      const positions = new Float32Array(count * 3)
      const origins = new Float32Array(count * 3)
      const phases = new Float32Array(count)
      const speeds = new Float32Array(count)

      for (let index = 0; index < count; index++) {
        const side = index % 2 === 0 ? -1 : 1
        const seed = index * 17.13 + layerIndex * 41.7

        const randomA = Math.abs(Math.sin(seed * 1.73))
        const randomB = Math.abs(Math.sin(seed * 2.41))
        const randomC = Math.abs(Math.sin(seed * 3.19))

        // Float across the side panels and into the central HUD.
        const x = side * standbyViewWidth * (
          .43 - randomA * .40
        )

        // Restrict inward-flowing particles to the lower HUD region.
        // Occupies approximately 27% of the scene height.
        const y = standbyViewHeight * (-.34 + randomB * .27)
        const z = -.6 - randomC * 1.4

        const offset = index * 3

        origins[offset] = x
        origins[offset + 1] = y
        origins[offset + 2] = z

        positions[offset] = x
        positions[offset + 1] = y
        positions[offset + 2] = z

        phases[index] = seed
        speeds[index] = .18 + randomC * .32
      }

      const geometry = new THREE.BufferGeometry()
      geometry.setAttribute(
        'position',
        new THREE.BufferAttribute(positions, 3)
      )

      const material = new THREE.PointsMaterial({
        color: layerIndex === 2 ? 0xc9f7ff : 0x65dfff,
        size,
        transparent: true,
        opacity: floatingOpacities[layerIndex],
        depthWrite: false,
        depthTest: false,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: true,
      })

      standbyGroup.add(new THREE.Points(geometry, material))

      floatingParticleLayers.push({
        geometry,
        positions,
        origins,
        phases,
        speeds,
      })
    })

    // Holographic corridor particles.
    // Fixed positions, perspective-aligned rows, varied sizes and brightness.
    type CorridorDot = {
      base: number
      phase: number
      speed: number
      sparklePhase: number
    }

    type ParticleLayer = {
      positions: number[]
      colours: number[]
      dots: CorridorDot[]
      colourAttribute?: THREE.Float32BufferAttribute
    }

    const particleLayers: ParticleLayer[] = [
      { positions: [], colours: [], dots: [] }, // Tiny
      { positions: [], colours: [], dots: [] }, // Medium
      { positions: [], colours: [], dots: [] }, // Bright accents
    ]

    const rowBands = [-.20, .22, .72, 1.22]

    for (const [upperIndex, lowerIndex] of [[0, 1], [2, 3]]) {
      const upper = standbyRailPaths[upperIndex]
      const lower = standbyRailPaths[lowerIndex]

      rowBands.forEach((band, rowIndex) => {
        const start = upper.start.clone().lerp(lower.start, band)
        const end = upper.end.clone().lerp(lower.end, band)

        const count = 17 + ((rowIndex * 7 + upperIndex) % 8)

        for (let dotIndex = 0; dotIndex < count; dotIndex++) {
          const seed = dotIndex * 17 + rowIndex * 31 + upperIndex * 13
          const variation = Math.abs(Math.sin(seed * 1.618))

          // Irregular spacing, but always along the perspective path.
          const stagger = Math.sin(seed * 2.37) * .009
          const progress = THREE.MathUtils.clamp(
            .035 + dotIndex / Math.max(1, count - 1) * .93 + stagger,
            0,
            1
          )

          // Most particles are tiny. A few are larger highlights.
          const sizeGroup = variation > .91 ? 2 : variation > .57 ? 1 : 0
          const layer = particleLayers[sizeGroup]

          const position = start.clone().lerp(end, progress)

          layer.positions.push(position.x, position.y, position.z)
          layer.colours.push(.1, .25, .35)

          layer.dots.push({
            base: .12 + Math.pow(variation, 2.2) * .72,
            phase: seed * .73,
            speed: .16 + variation * .43,
            sparklePhase: seed * 1.31,
          })
        }
      })
    }

    const particleSizes = [.023, .046, .078]

    particleLayers.forEach((layer, index) => {
      const geometry = new THREE.BufferGeometry()

      geometry.setAttribute(
        'position',
        new THREE.Float32BufferAttribute(layer.positions, 3)
      )

      const colours = new THREE.Float32BufferAttribute(layer.colours, 3)
      geometry.setAttribute('color', colours)
      layer.colourAttribute = colours

      const material = new THREE.PointsMaterial({
        size: particleSizes[index],
        vertexColors: true,
        transparent: true,
        opacity: .9,
        depthWrite: false,
        depthTest: false,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: true,
      })

      standbyGroup.add(new THREE.Points(geometry, material))
    })

    type TrailMaterial = THREE.MeshBasicMaterial | THREE.SpriteMaterial
    type StandbyTraveller = { object: THREE.Group; core: TrailMaterial; glow: TrailMaterial; path: { start: THREE.Vector3; end: THREE.Vector3 }; delay: number }
    const standbyPackets: StandbyTraveller[] = []
    const standbyMarkers: StandbyTraveller[] = []
    const trailTextures: THREE.CanvasTexture[] = []
    const makeTrailTexture = (core: boolean) => {
      const canvas = document.createElement('canvas'); canvas.width = 128; canvas.height = 16
      const context = canvas.getContext('2d')!; const along = context.createLinearGradient(0, 0, canvas.width, 0)
      along.addColorStop(0, 'rgba(255,255,255,0)'); along.addColorStop(core ? .18 : .08, 'rgba(255,255,255,.04)'); along.addColorStop(core ? .58 : .4, 'rgba(255,255,255,1)'); along.addColorStop(core ? .78 : .88, 'rgba(255,255,255,.25)'); along.addColorStop(1, 'rgba(255,255,255,0)')
      context.fillStyle = along; context.fillRect(0, 0, canvas.width, canvas.height)
      context.globalCompositeOperation = 'destination-in'; const across = context.createLinearGradient(0, 0, 0, canvas.height); across.addColorStop(0, 'rgba(255,255,255,0)'); across.addColorStop(core ? .3 : .14, 'rgba(255,255,255,.78)'); across.addColorStop(.5, 'rgba(255,255,255,1)'); across.addColorStop(core ? .7 : .86, 'rgba(255,255,255,.78)'); across.addColorStop(1, 'rgba(255,255,255,0)'); context.fillStyle = across; context.fillRect(0, 0, canvas.width, canvas.height)
      const texture = new THREE.CanvasTexture(canvas); texture.minFilter = THREE.LinearFilter; texture.magFilter = THREE.LinearFilter; trailTextures.push(texture); return texture
    }
    const coreTexture = makeTrailTexture(true); const haloTexture = makeTrailTexture(false)
    const makeTrailMaterial = (colour: THREE.ColorRepresentation, halo: boolean): TrailMaterial => new THREE.MeshBasicMaterial({ color: colour, map: halo ? haloTexture : coreTexture, transparent: true, opacity: 0, depthWrite: false, depthTest: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending })
    type AmbientLinearStreak = { core: THREE.MeshBasicMaterial; glow: THREE.MeshBasicMaterial; coreBrightness: number; glowStrength: number; breathingSpeed: number; phase: number }
    const ambientLinearStreaks: AmbientLinearStreak[] = []
    const addAmbientLinearStreak = ({
      position, length, direction, coreBrightness,
      glowStrength, breathingSpeed, phase, thickness = .018
    }: {
      position: THREE.Vector3
      length: number
      direction: THREE.Vector3
      coreBrightness: number
      glowStrength: number
      breathingSpeed: number
      phase: number
      thickness?: number
    }) => {
      const object = new THREE.Group(); const planarDirection = direction.clone().setZ(0).normalize()
      const core = new THREE.MeshBasicMaterial({ color: 0xeafcff, map: coreTexture, transparent: true, opacity: .18, depthWrite: false, depthTest: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending })
      const glow = new THREE.MeshBasicMaterial({ color: 0x55dcff, map: haloTexture, transparent: true, opacity: .05, depthWrite: false, depthTest: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending })
      const coreMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(length, thickness), core
      )
      const glowMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(length * 1.5, thickness * 4.2), glow
      )
      object.position.copy(position); object.rotation.z = Math.atan2(planarDirection.y, planarDirection.x); object.add(glowMesh, coreMesh); standbyGroup.add(object)
      ambientLinearStreaks.push({ core, glow, coreBrightness, glowStrength, breathingSpeed, phase })
    }
    // Stage 1B test: deliberately fixed in the upper-left sky band. Only opacity
    // breathes; the group itself is never translated, rotated, or regenerated.

    // Stationary holographic streaks.
    // Different lengths, brightness, thickness and breathing phases.
    const ambientStreaks = [
      // Upper-left: main cluster
      { x: -.235, y: 3.82, length: .55, angle: -.34, bright: .95, glow: .45, speed: .42, phase: .7, thick: .018 },
      { x: -.195, y: 4.18, length: .90, angle: -.28, bright: .76, glow: .34, speed: .31, phase: 2.1, thick: .023 },
      { x: -.285, y: 3.34, length: .34, angle: -.39, bright: .42, glow: .20, speed: .53, phase: 4.2, thick: .012 },
      { x: -.165, y: 2.85, length: 1.12, angle: -.32, bright: .88, glow: .40, speed: .26, phase: 1.4, thick: .027 },
      { x: -.305, y: 4.48, length: .28, angle: -.25, bright: .32, glow: .15, speed: .47, phase: 3.6, thick: .010 },

      // Upper-right: fewer accents for balance
      { x: .215, y: 4.06, length: .76, angle: .30, bright: .68, glow: .30, speed: .35, phase: 2.8, thick: .019 },
      { x: .278, y: 3.48, length: .42, angle: .36, bright: .44, glow: .19, speed: .49, phase: 5.1, thick: .012 },

      // Lower corners: subtle reflections
      { x: -.225, y: -3.25, length: .70, angle: .22, bright: .46, glow: .21, speed: .38, phase: 1.9, thick: .015 },
      { x: -.275, y: -4.02, length: .36, angle: .18, bright: .30, glow: .14, speed: .44, phase: 3.3, thick: .010 },
      { x: .245, y: -3.52, length: .86, angle: -.22, bright: .52, glow: .25, speed: .32, phase: 4.6, thick: .020 },
    ]

    ambientStreaks.forEach((streak) => {
      addAmbientLinearStreak({
        position: new THREE.Vector3(
          standbyViewWidth * streak.x,
          streak.y,
          .08
        ),
        length: streak.length,
        direction: new THREE.Vector3(
          1,
          Math.tan(streak.angle),
          0
        ),
        coreBrightness: streak.bright,
        glowStrength: streak.glow,
        breathingSpeed: streak.speed,
        phase: streak.phase,
        thickness: streak.thick,
      })
    })

    const packetCoreGeometry = new THREE.PlaneGeometry(.9, .045)
    const packetGlowGeometry = new THREE.PlaneGeometry(1.46, .17)
    const addTraveller = (path: { start: THREE.Vector3; end: THREE.Vector3 }, delay: number, packet: boolean) => {
      const object = new THREE.Group(); const direction = path.end.clone().sub(path.start).normalize()
      const glow = packet ? makeTrailMaterial(0x287DFF, true) : new THREE.SpriteMaterial({ color: 0x287DFF, map: haloTexture, transparent: true, opacity: 0, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending })
      const core = packet ? makeTrailMaterial(0xF2FAFF, false) : new THREE.SpriteMaterial({ color: 0xF2FAFF, map: coreTexture, transparent: true, opacity: 0, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending })
      if (packet) {
        object.add(new THREE.Mesh(packetGlowGeometry, glow), new THREE.Mesh(packetCoreGeometry, core))
      } else {
        // Three short segments preserve the existing dotted telemetry language while
        // remaining a single travelling packet along the interpolated mid-corridor path.
        for (const offset of [-.12, 0, .12]) {
          const glowDot = new THREE.Sprite(glow as THREE.SpriteMaterial); const coreDot = new THREE.Sprite(core as THREE.SpriteMaterial)
          glowDot.position.x = offset; coreDot.position.x = offset; glowDot.scale.set(.22, .07, 1); coreDot.scale.set(.095, .025, 1); object.add(glowDot, coreDot)
        }
      }
      object.position.copy(path.start); object.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), direction); standbyGroup.add(object)
      const traveller = { object, core, glow, path, delay }; (packet ? standbyPackets : standbyMarkers).push(traveller)
    }
    standbyRailPaths.forEach((path, pathIndex) => {
      // Extend the visible line back through depth; every traveller remains collinear with
      // the rail and naturally grows under the perspective camera as it approaches.
      const direction = path.end.clone().sub(path.start).normalize()
      const far = path.start.clone().addScaledVector(direction, -7.4)
      const depthPath = { start: far, end: path.end.clone().addScaledVector(direction, .12) }
      for (let index = 0; index < 3; index++) addTraveller(depthPath, pathIndex * .37 + index * .76, true)
    })
    // Stage 1A: dotted data packets are suspended midway between F1 and F2 rather
    // than riding either structural rail. Interpolating both endpoints (including Z)
    // preserves the same converging corridor perspective on each side.
    for (const [upperIndex, lowerIndex] of [[0, 1], [2, 3]]) {
      const upper = standbyRailPaths[upperIndex]; const lower = standbyRailPaths[lowerIndex]
      const midStart = upper.start.clone().lerp(lower.start, .5)
      const midEnd = upper.end.clone().lerp(lower.end, .5)
      const direction = midEnd.clone().sub(midStart).normalize()
      const dottedStart = midStart.clone().addScaledVector(direction, -2.3)
      for (let dot = 0; dot < 2; dot++) addTraveller({ start: dottedStart, end: midEnd.clone().addScaledVector(direction, -.14) }, upperIndex * .31 + dot * .68, false)
    }
    const pulseMaterials: THREE.LineBasicMaterial[] = []; const pulses: THREE.Line[] = []; for (let i = 0; i < 10; i++) { const y = i % 2 ? -2.9 : 2.9; const material = makeLineMaterial(0xd8fbff); const x = i % 3 === 0 ? 4.7 : -4.7; const pulse = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(x, y, 0), new THREE.Vector3(x, y, -1.5)]), material); pulse.position.z = -31; pulseMaterials.push(material); pulses.push(pulse); corridor.add(pulse) }
    const resize = () => { const width = host.clientWidth, height = host.clientHeight; renderer.setSize(width, height, false); camera.aspect = width / height; camera.updateProjectionMatrix() }; resize(); addEventListener('resize', resize); let running = true; let raf = 0; const particleClock = new THREE.Clock(); const render = () => {
      const elapsed = particleClock.getElapsedTime()

      // Gentle independent floating motion.
      floatingParticleLayers.forEach((layer) => {
        const { positions, origins, phases, speeds } = layer

        for (let index = 0; index < phases.length; index++) {
          const offset = index * 3
          const time = elapsed * speeds[index]
          const phase = phases[index]

          // Small sideways movement.
          positions[offset] =
            origins[offset] +
            Math.sin(time + phase) * .055


          // Continuously drift inward from the side panels,
          // crossing the central HUD frame.
          const side = origins[offset] < 0 ? -1 : 1
          const initialProgress =
            (.43 - Math.abs(origins[offset]) / standbyViewWidth) / .40

          const flowProgress =
            (initialProgress + elapsed * (.009 + speeds[index] * .015)) % 1

          positions[offset] =
            side * standbyViewWidth * (.43 - flowProgress * .40) +
            Math.sin(time * .7 + phase) * .065


          // Subtle depth movement.
          positions[offset + 2] =
            origins[offset + 2] +
            Math.sin(time * .48 + phase) * .035
        }

        const attribute = layer.geometry.getAttribute(
          'position'
        ) as THREE.BufferAttribute

        attribute.needsUpdate = true
      })


      ambientLinearStreaks.forEach((streak) => {
        const breath = .5 + .5 * Math.sin(
          elapsed * streak.breathingSpeed + streak.phase
        )

        // Most streaks stay subtle.
        streak.core.opacity =
          .07 + streak.coreBrightness * (.14 + breath * .20)

        streak.glow.opacity =
          .025 + streak.glowStrength * (.14 + breath * .28)
      })


      particleLayers.forEach((layer) => {
        const colours = layer.colours

        layer.dots.forEach((dot, index) => {
          // Independent slow breathing, not synchronised blinking.
          const breath = .5 + .5 * Math.sin(
            elapsed * dot.speed + dot.phase
          )

          // Occasional soft highlights, not flashing stars.
          const sparkle = Math.pow(
            Math.max(0, Math.sin(elapsed * .31 + dot.sparklePhase)),
            12
          ) * .16

          const intensity = Math.min(
            .98,
            dot.base * (.48 + breath * .52) + sparkle
          )

          const offset = index * 3

          colours[offset] = .38 * intensity
          colours[offset + 1] = .88 * intensity
          colours[offset + 2] = intensity
        })

        const attribute = layer.colourAttribute

        if (attribute) {
          attribute.array.set(colours)
          attribute.needsUpdate = true
        }
      })


      // Clip the standby WebGL scene to the inside of the HUD outline.
      // The travelling packets keep their full paths but cannot draw
      // across or beyond the outer frame.
      const hudFrame = host.querySelector<HTMLElement>('.boot-hud')

      if (standbyGroup.visible && hudFrame) {
        const frameRect = hudFrame.getBoundingClientRect()
        const canvasRect = renderer.domElement.getBoundingClientRect()
        const frameStyle = getComputedStyle(hudFrame)

        const leftInset = parseFloat(frameStyle.borderLeftWidth) + 1
        const rightInset = parseFloat(frameStyle.borderRightWidth) + 1
        const topInset = parseFloat(frameStyle.borderTopWidth) + 1
        const bottomInset = parseFloat(frameStyle.borderBottomWidth) + 1

        const left = Math.ceil(
          frameRect.left - canvasRect.left + leftInset
        )
        const right = Math.floor(
          frameRect.right - canvasRect.left - rightInset
        )
        const top = Math.ceil(
          frameRect.top - canvasRect.top + topInset
        )
        const bottom = Math.floor(
          frameRect.bottom - canvasRect.top - bottomInset
        )

        const clipX = Math.max(0, left)
        const clipY = Math.max(0, canvasRect.height - bottom)
        const clipWidth = Math.max(
          0,
          Math.min(canvasRect.width, right) - clipX
        )
        const clipHeight = Math.max(
          0,
          Math.min(canvasRect.height - clipY, bottom - top)
        )

        renderer.setScissor(
          clipX,
          clipY,
          clipWidth,
          clipHeight
        )
        renderer.setScissorTest(true)
      } else {
        renderer.setScissorTest(false)
      }

      renderer.render(scene, camera)
      renderer.setScissorTest(false)

      if (running) raf = requestAnimationFrame(render)

    }; render()
    const get = <T extends Element>(selector: string) => host.querySelector<T>(selector)!; const connect = get<HTMLElement>('.boot-connect'), diagnostics = get<HTMLElement>('.boot-status-columns'), assembleStack = get<HTMLElement>('.boot-assemble-stack'), titleRail = get<HTMLElement>('.boot-title-rail'), readyNodes = [...host.querySelectorAll<HTMLElement>('.boot-ready-node')], core = get<HTMLElement>('.boot-focal-core'), hud = get<HTMLElement>('.boot-hud'), standbyCopy = get<HTMLElement>('.boot-standby-copy'); const shutterParts = host.querySelectorAll<HTMLElement>('.boot-shutters i'); const diagnosticLines = [...host.querySelectorAll<HTMLElement>('.boot-module')]; const diagnosticPanels = [...host.querySelectorAll<HTMLElement>('.boot-diagnostic-panel')]; const tl = gsap.timeline(); timelineRef.current = tl; (window as TimelineWindow).__elucidatorBootTimeline = tl
    if (import.meta.env.DEV) requestAnimationFrame(() => { const ancestors: BootDiagnostics['ancestors'] = []; for (let node: HTMLElement | null = host.parentElement; node && ancestors.length < 4; node = node.parentElement) { const style = getComputedStyle(node); ancestors.push({ tag: node.tagName, className: node.className, position: style.position, transform: style.transform, width: style.width, height: style.height }) }; const canvas = renderer.domElement; const report: BootDiagnostics = { viewport: { width: window.innerWidth, height: window.innerHeight }, scene: host.getBoundingClientRect(), hud: hud.getBoundingClientRect(), canvas: { width: canvas.width, height: canvas.height, clientWidth: canvas.clientWidth, clientHeight: canvas.clientHeight, pixelRatio: renderer.getPixelRatio() }, assignedViewport: viewport, ancestors }; const browser = window as TimelineWindow; browser.__elucidatorBootDiagnostics = [report]; console.info('[Elucidator boot diagnostics]', report) })
    const standbyInstruction = standbyCopy.querySelector('span'); if (standbyInstruction) standbyInstruction.textContent = 'CLICK ANY BUTTON TO CONTINUE'
    const standbyDiagnostics = document.createElement('div'); standbyDiagnostics.className = 'boot-standby-diagnostics';;['WALLPAPER LOADED  //  OK', 'INTERFACE READY   //  OK', 'DISPLAY SYNC      //  OK'].forEach((line) => { const row = document.createElement('span'); row.textContent = `› ${line}`; standbyDiagnostics.appendChild(row) }); host.appendChild(standbyDiagnostics)
    
    const idleTimelines: gsap.core.Timeline[] = []
    const startStandbyRailFlow = () => {
      if (idleTimelines.length) return
      const animateTraveller = ({ object, core, glow, path, delay }: StandbyTraveller, duration: number, isPacket: boolean) => {
        const flow = gsap.timeline({ repeat: -1, repeatDelay: .45, delay })
        flow.set(object.position, { x: path.start.x, y: path.start.y, z: path.start.z }).set(core, { opacity: 0 }).set(glow, { opacity: 0 })
          .to(glow, { opacity: isPacket ? .8 : .42, duration: .13 }).to(core, { opacity: isPacket ? 1 : .7, duration: .1 }, '<')
          .to(object.position, { x: path.end.x, y: path.end.y, z: path.end.z, duration, ease: 'power1.in' }, '<')
          .to([core, glow], { opacity: 0, duration: .14 }, '>-0.13')
        idleTimelines.push(flow)
      }

      standbyPackets.forEach((packet, index) =>
        animateTraveller(packet, 1.9 + (index % 3) * .18, true)
      )

      standbyMarkers.forEach((marker, index) =>
        animateTraveller(marker, 2.1 + (index % 2) * .2, false)
      )

    }
    const applyRevealPose = (timeline?: gsap.core.Timeline, at = 0) => {
      const set = (target: gsap.TweenTarget, vars: gsap.TweenVars) => timeline ? timeline.to(target, { ...vars, overwrite: 'auto' }, at) : gsap.set(target, vars)
      set(camera.position, { z: 14, duration: .72, ease: 'power2.out' }); set(frameMaterials, { opacity: 0, duration: .55 }); set(railMaterial, { opacity: 0, duration: .5 }); set(architectureMaterial, { opacity: 0, duration: .5 }); set(panelMaterials, { opacity: 0, duration: .55 }); set(panelEdgeMaterials, { opacity: 0, duration: .55 }); set(hazeMaterial, { opacity: 0, duration: .5 }); set(standbyGroup, { visible: true }); set(standbyLineMaterials, { opacity: (index: number) => Number(standbyLineMaterials[index].userData.targetOpacity ?? .6), duration: .55 }); set(standbyGlassMaterials, { opacity: (index: number) => Number(standbyGlassMaterials[index].userData.targetOpacity ?? .12), duration: .55 }); set(standbyCornerGlowMaterials, {
        opacity: .55,
        duration: .7,
        ease: 'power2.out'
      }); set(shutterParts, { '--open': '1', duration: .9, ease: 'power3.inOut' })
    }
    let removeStandbyInput: () => void = () => { }
    const installStandbyInput = () => {
      let dismissed = false
      const activate = (event: KeyboardEvent | PointerEvent) => {
        // Windows/browser shortcuts (notably Win+Shift+S) are not an intentional
        // request to leave standby. Keep the full HUD visible for capture.
        if (event instanceof KeyboardEvent) {
          const ignoredKey = ['Alt', 'AltGraph', 'CapsLock', 'Control', 'Fn', 'Meta', 'NumLock', 'PrintScreen', 'ScrollLock', 'Shift'].includes(event.key)
          if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || ignoredKey) return
        } else if (event.button !== 0) return
        if (!dismissed) { dismissed = true; removeStandbyInput(); activateRef.current() }
      }
      window.addEventListener('keydown', activate); window.addEventListener('pointerdown', activate)
      removeStandbyInput = () => { window.removeEventListener('keydown', activate); window.removeEventListener('pointerdown', activate) }
    }
    const cleanup = () => { removeStandbyInput(); tl.kill(); idleTimelines.forEach(item => item.kill()); if (timelineRef.current === tl) timelineRef.current = null; waitingForWallpaperRef.current = false; running = false; cancelAnimationFrame(raf); removeEventListener('resize', resize); if ((window as TimelineWindow).__elucidatorBootTimeline === tl) delete (window as TimelineWindow).__elucidatorBootTimeline; scene.traverse(object => { const drawable = object as THREE.Mesh; drawable.geometry?.dispose(); const material = drawable.material; if (Array.isArray(material)) material.forEach(item => item.dispose()); else material?.dispose() }); trailTextures.forEach(texture => texture.dispose()); standbyGlassTexture.dispose(); telemetryGlowTexture.dispose(); cornerGlowTexture.dispose(); renderer.dispose(); renderer.domElement.remove(); standbyDiagnostics.remove();  }
    if (standby) {
      host.classList.add('is-revealing', 'is-standby'); gsap.set([hud, standbyCopy], { autoAlpha: 1 }); gsap.set([connect, core, diagnostics, assembleStack], { autoAlpha: 0 }); gsap.set(titleRail, { scaleX: 0 }); applyRevealPose()
      startStandbyRailFlow()
      installStandbyInput(); return cleanup
    }
    const moveDuration = short ? 1.5 : 3; const assembleAt = short ? 1.98 : 3.53; const revealAt = short ? 2.92 : 5.25; const diagnosticRows = Math.min(coreModules.length, sceneModules.length)
    tl.to(hud, { autoAlpha: 1, duration: .32 }).to(core, { autoAlpha: 1, scale: 1, duration: .38, ease: 'power2.out' }).to(connect, { autoAlpha: 1, duration: .34 }, .16).to(frameMaterials.slice().reverse(), { opacity: (index: number) => .24 + index * .065, duration: short ? .72 : 1.5, stagger: .12, ease: 'none' }, .42).to(railMaterial, { opacity: .66, duration: .55 }, short ? .52 : 1.45).to(architectureMaterial, { opacity: .38, duration: .5 }, short ? .7 : 1.8).to(panelMaterials, { opacity: .18, duration: .65, stagger: .025 }, short ? .72 : 1.86).to(panelEdgeMaterials, { opacity: .58, duration: .55, stagger: .02 }, short ? .78 : 1.95).to(hazeMaterial, { opacity: .07, duration: .6 }, short ? .82 : 2).to(diagnostics, { autoAlpha: 1, duration: .28 }, short ? .72 : 1.72).to(camera.position, { z: 10.4, duration: moveDuration, ease: 'power2.inOut' }, short ? .86 : 2.05).to(panels.map(panel => panel.position), { x: (index: number) => panels[index].position.x * 1.32, duration: moveDuration * .78, ease: 'power2.inOut' }, short ? .94 : 2.18).to(connect, { autoAlpha: 0, duration: .22 }, short ? 1.35 : 3.45).set(assembleStack, { yPercent: 10, scale: .9 }, assembleAt).to(assembleStack, { autoAlpha: 1, yPercent: 0, scale: 1, duration: .62, ease: 'power3.out' }, assembleAt + .02).to(titleRail, { scaleX: 1, duration: .55, ease: 'power2.out' }, assembleAt + .09).to(readyNodes, { autoAlpha: 1, y: 0, duration: .22, stagger: .14, ease: 'power2.out' }, assembleAt + .68)
    for (let row = 0; row < diagnosticRows; row++) { const pair = [diagnosticLines[row], diagnosticLines[row + diagnosticRows]]; const at = (short ? .8 : 1.88) + row * (short ? .07 : .1); tl.to(pair, { autoAlpha: 1, duration: .08 }, at).call(() => { diagnosticLines.forEach(line => line.classList.remove('is-active')); pair.forEach(line => line.classList.add('is-active')) }, [], at + .01).call(() => pair.forEach(line => { line.classList.remove('is-active'); line.classList.add('is-complete') }), [], at + (short ? .065 : .09)) }
    pulses.forEach((pulse, index) => { const at = (short ? 1.0 : 2.25) + index * (short ? .12 : .22); tl.set(pulse.material, { opacity: .95 }, at).to(pulse.position, { z: 8, duration: short ? .68 : 1.16, ease: 'none' }, at).set(pulse.material, { opacity: 0 }) })
    tl.addPause(revealAt, () => { if (!wallpaperReadyRef.current) waitingForWallpaperRef.current = true; else requestAnimationFrame(() => tl.play()) })
      .to(diagnosticPanels[0], { autoAlpha: 0, xPercent: -80, duration: .52, ease: 'power2.in' }, revealAt).to(diagnosticPanels[1], { autoAlpha: 0, xPercent: 80, duration: .52, ease: 'power2.in' }, revealAt)
      .to(diagnostics, { autoAlpha: 0, duration: .2 }, revealAt + .12).to([assembleStack, core, connect], { autoAlpha: 0, duration: .34 }, revealAt + .12)
      .call(() => host.classList.add('is-revealing'), [], revealAt).to(standbyCopy, { autoAlpha: 1, duration: .36 }, revealAt + .68)
      .call(() => { host.classList.add('is-standby'); startStandbyRailFlow(); installStandbyInput(); standbyRef.current() }, [], revealAt + 1.08)
    applyRevealPose(tl, revealAt + .1)
    return cleanup
  }, [active, short, standby])
  const seek = (time: number) => (window as TimelineWindow).__elucidatorBootTimeline?.pause().seek(time); const previewRevealAt = short ? 2.12 : 5.25
  const panel = (title: string, lines: DiagnosticLine[], side: 'left' | 'right') => <section className={`boot-diagnostic-panel boot-diagnostic-${side}`}><header><span>{title}</span><i>LINKED</i></header><div className="boot-diagnostic-rule" />{lines.map(line => <p className="boot-module" key={line.label}><b>› {line.label}</b><em>{line.label === 'WALLPAPER_DECODER' || line.label === 'TEXTURE_BUFFER' ? wallpaperReady ? 'READY' : 'BUFFERED' : line.value}</em><i /></p>)}<footer><span>MODULES</span><i /><b>{side === 'left' ? '08 / 08' : 'SYNC // 01'}</b></footer></section>
  return <><section ref={mount} className={`boot-scene${standby ? ' is-standby' : ''}`} style={viewport} aria-hidden="true"><div className="boot-shutters"><i className="top" /><i className="right" /><i className="bottom" /><i className="left" /><i className="center" /></div><div className="boot-hud"><span className="boot-hud-project">PROJECT ELUCIDATOR<small>VISUAL INTERFACE v1.0</small></span><span className="boot-hud-state">DISPLAY LINK<small>INITIALISING</small></span><span className="boot-hud-coordinates left">35.6762° N<br />139.6503° E</span><span className="boot-hud-coordinates right">51.5074° N<br />0.1278° W</span><span className="boot-hud-sync">LINK CHANNEL // GLOBAL<br />SU-4927-A</span><span className="boot-hud-sync right">SYNC // 00.01<br />RTT // 12 ms</span></div><div className="boot-focal-core"><i /><i /><i /><i /><b /></div><div className="boot-status-columns">{panel('CORE MODULES', coreModules, 'left')}{panel('SYSTEM LAYERS', sceneModules, 'right')}</div><div className="boot-connect">ELUCIDATOR<small>ESTABLISHING DISPLAY LINK</small></div><div className="boot-assemble-stack"><div className="boot-assemble">ELUCIDATOR<small>SYSTEM SYNCHRONISED</small></div><div className="boot-title-rail" aria-hidden="true"><span className="boot-rail-guide" /><div className="boot-rail-segments">{Array.from({ length: 14 }, (_, index) => <i key={index} />)}</div><span className="boot-rail-guide" /></div><div className="boot-ready-nodes"><div className="boot-ready-node"><i /><b>DISPLAY</b><small>INITIALISED</small></div><div className="boot-ready-node"><i /><b>THEME</b><small>INITIALISED</small></div><div className="boot-ready-node"><i /><b>WALLPAPER</b><small>{wallpaperReady ? 'READY' : 'BUFFERED'}</small></div></div></div><div className="boot-standby-copy"><b>SYSTEM READY</b><span>PRESS ANY KEY OR MOVE MOUSE TO CONTINUE</span></div></section>{import.meta.env.DEV && debug && !standby && <div className="boot-debug" aria-label="Boot timeline preview"><button onClick={() => seek(0)}>Connect</button><button onClick={() => seek(short ? .9 : 2)}>Compile</button><button onClick={() => seek(short ? 1.55 : 3.75)}>Assemble</button><button onClick={() => seek(previewRevealAt)}>Reveal</button></div>}</>
}
