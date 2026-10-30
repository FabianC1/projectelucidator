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
    // Derive every horizontal standby coordinate from the real camera frustum.
    // This preserves intended screen-space proportions at 16:9 and 32:9 without
    // scaling a 16:9 composition horizontally.
    const standbyAspect = Math.max(1, host.clientWidth / Math.max(1, host.clientHeight))
    const standbyViewHeight = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z
    const standbyViewWidth = standbyViewHeight * standbyAspect
    const standbyLineMaterials: THREE.LineBasicMaterial[] = []; const standbyGlassMaterials: THREE.MeshBasicMaterial[] = []
    const standbyPanelScans: Array<{ mesh: THREE.Mesh; material: THREE.MeshBasicMaterial; minY: number; maxY: number }> = []
    const addStandbyLines = (points: number[], color: number, opacity: number) => { const material = makeLineMaterial(color); material.userData.targetOpacity = opacity; standbyLineMaterials.push(material); const geometry = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(points, 3)); standbyGroup.add(new THREE.LineSegments(geometry, material)) }
    const addDepthWing = (side: -1 | 1) => {
      const panels = [
        // D1 foreground and D2 rear retain the accepted responsive anchors but
        // differ materially in detail density, scanning, and illumination.
        { width: .8, height: 7.15, x: 9.6, z: -.72, opacity: .085, edge: .82, colour: 0x4bb8d6, density: 1, scans: 2 },
        { width: 1.1, height: 6.9, x: 8.28, z: -1.48, opacity: .042, edge: .42, colour: 0x2d7189, density: .68, scans: 1 },
      ]
      panels.forEach(({ width, height, x, z, opacity, edge: edgeOpacity, colour, density, scans }) => {
        const material = new THREE.MeshBasicMaterial({ color: colour, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, blending: THREE.NormalBlending }); material.userData.targetOpacity = opacity
        const panelGroup = new THREE.Group(); panelGroup.position.set(side * x / 20.1 * standbyViewWidth, 0, z); panelGroup.rotation.y = side * -.62; standbyGroup.add(panelGroup)
        panelGroup.add(new THREE.Mesh(new THREE.PlaneGeometry(width, height), material)); standbyGlassMaterials.push(material)
        const addPanelLine = (points: number[], color: number, targetOpacity: number) => {
          const lineMaterial = makeLineMaterial(color); lineMaterial.userData.targetOpacity = targetOpacity; standbyLineMaterials.push(lineMaterial)
          panelGroup.add(new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(points, 3)), lineMaterial))
        }
        const halfW = width * .5; const halfH = height * .5; const zOffset = .018
        // A complete, deliberately fine perimeter establishes the glass structure.
        // The brighter fragmented runs below are accents, not a replacement outline.
        addPanelLine([
          -halfW, halfH, zOffset, halfW, halfH, zOffset,
          halfW, halfH, zOffset, halfW, -halfH, zOffset,
          halfW, -halfH, zOffset, -halfW, -halfH, zOffset,
          -halfW, -halfH, zOffset, -halfW, halfH, zOffset,
        ], 0x70c9df, edgeOpacity * .46)
        // Brighter illuminated corners and separated edge runs retain the layered,
        // technical hologram language without making the perimeter heavy.
        addPanelLine([
          -halfW, halfH - height * .14, zOffset, -halfW, halfH, zOffset, -halfW, halfH, zOffset, -halfW + width * .3, halfH, zOffset,
          halfW - width * .23, halfH, zOffset, halfW, halfH, zOffset, halfW, halfH, zOffset, halfW, halfH - height * .11, zOffset,
          -halfW, -halfH + height * .12, zOffset, -halfW, -halfH, zOffset, -halfW, -halfH, zOffset, -halfW + width * .22, -halfH, zOffset,
          halfW - width * .32, -halfH, zOffset, halfW, -halfH, zOffset, halfW, -halfH, zOffset, halfW, -halfH + height * .16, zOffset,
        ], 0xb9f7ff, edgeOpacity)
        const detailPoints: number[] = []
        const rows = density === 1 ? 9 : 6
        for (let row = 0; row < rows; row++) {
          const y = halfH * .68 - row * (height * 1.36 / Math.max(1, rows - 1)); const inset = width * (.11 + (row % 3) * .035)
          const split = row % 2 === 0 ? width * .11 : -width * .06
          detailPoints.push(-halfW + inset, y, zOffset, split, y, zOffset, split + width * .12, y, zOffset, halfW - inset, y, zOffset)
        }
        // Calibration divisions are deliberately fragmented: a continuous vertical
        // rule would put the discarded "elevator door" silhouette back in charge.
        for (const xMark of [-.23, .08, .29]) {
          for (const band of [[.62, .38], [.12, -.08], [-.34, -.57]]) {
            detailPoints.push(width * xMark, halfH * band[0], zOffset, width * xMark, halfH * band[1], zOffset)
          }
        }
        for (let tick = 0; tick < 7; tick++) { const y = halfH * .7 - tick * height * .23; detailPoints.push(-halfW, y, zOffset, -halfW + width * .09, y, zOffset, halfW - width * .09, y - height * .055, zOffset, halfW, y - height * .055, zOffset) }
        detailPoints.push(-halfW + width * .12, halfH * .38, zOffset, -halfW + width * .32, halfH * .38, zOffset, -halfW + width * .32, halfH * .38, zOffset, -halfW + width * .32, halfH * .2, zOffset, halfW - width * .34, -halfH * .3, zOffset, halfW - width * .14, -halfH * .3, zOffset, halfW - width * .14, -halfH * .3, zOffset, halfW - width * .14, -halfH * .1, zOffset)
        // The near layer carries readable holographic instrumentation; the rear
        // layer keeps the same language at a restrained intensity.
        addPanelLine(detailPoints, 0x8beeff, edgeOpacity * (density === 1 ? .82 : .58))
        for (let scanIndex = 0; scanIndex < scans; scanIndex++) {
          const scanMaterial = new THREE.MeshBasicMaterial({ color: 0xb4f8ff, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })
          const scan = new THREE.Mesh(new THREE.PlaneGeometry(width * (.52 + scanIndex * .12), .026), scanMaterial); scan.position.set((scanIndex ? -.08 : .06) * width, -halfH * (.48 - scanIndex * .31), zOffset * 2); panelGroup.add(scan)
          standbyPanelScans.push({ mesh: scan, material: scanMaterial, minY: -halfH * (.48 - scanIndex * .31), maxY: halfH * (.5 - scanIndex * .16) })
        }
      })
    }
    // 7.2 × 7.2 inner aperture / 8.4 × 8.4 outer architecture. At 1920×1080 this
    // reads as a roughly 650 px transparent portal with a visible structural surround.
    const frameX = standbyViewWidth * .311; const frameY = standbyViewHeight * .29; const corner = .56
    addStandbyLines([
      -frameX, frameY - corner, 0, -frameX, frameY, 0, -frameX + corner, frameY, 0,
      frameX - corner, frameY, 0, frameX, frameY, 0, frameX, frameY - corner, 0,
      -frameX, -frameY + corner, 0, -frameX, -frameY, 0, -frameX + corner, -frameY, 0,
      frameX - corner, -frameY, 0, frameX, -frameY, 0, frameX, -frameY + corner, 0
    ], 0xe1fbff, .92)
    // One wide central frame: only a faint joining contour behind the bright corners.
    addStandbyLines([-frameX, frameY, -.08, frameX, frameY, -.08, frameX, -frameY, -.08, -frameX, -frameY, -.08, -frameX, frameY, -.08], 0x72bed4, .56)
    addDepthWing(-1); addDepthWing(1)
    // F1/F2: four dedicated perspective rails, two per side. They terminate at the
    // central frame rather than extending through it, so they imply depth without a tunnel.
    const standbyRailPaths: Array<{ start: THREE.Vector3; end: THREE.Vector3 }> = []
    const addPerspectiveRail = (side: -1 | 1, upper: boolean) => {
      const direction = upper ? 1 : -1
      const start = new THREE.Vector3(side * standbyViewWidth * .54, upper ? 3.0 : -1.65, -1.18)
      const end = new THREE.Vector3(side * frameX, upper ? 1.72 : -1.08, -.04)
      standbyRailPaths.push({ start, end })
      addStandbyLines([start.x, start.y, start.z, end.x, end.y, end.z], 0x78e8ff, .8)
      addStandbyLines([start.x, start.y + direction * .22, start.z - .12, end.x, end.y + direction * .14, end.z - .04], 0x276c86, .32)
    }
    addPerspectiveRail(-1, true); addPerspectiveRail(-1, false); addPerspectiveRail(1, true); addPerspectiveRail(1, false)
    // E: exactly two horizontal structural rails, above and below the viewport. They are
    // segmented guides, not another enclosing frame or a line through the wallpaper.
    const railX = standbyViewWidth * .269
    const upperRailY = 4.6; const lowerRailY = -3.4
    addStandbyLines([-railX, upperRailY, -.52, railX, upperRailY, -.52, -railX, lowerRailY, -.52, railX, lowerRailY, -.52], 0x4f9ab2, .34)
    addStandbyLines([-standbyViewWidth * .239, upperRailY, -.48, -standbyViewWidth * .109, upperRailY, -.48, standbyViewWidth * .109, upperRailY, -.48, standbyViewWidth * .239, upperRailY, -.48, -standbyViewWidth * .239, lowerRailY, -.48, -standbyViewWidth * .109, lowerRailY, -.48, standbyViewWidth * .109, lowerRailY, -.48, standbyViewWidth * .239, lowerRailY, -.48], 0xa4efff, .68)
    addStandbyLines([-.42, upperRailY, -.44, .42, upperRailY, -.44, -.42, lowerRailY, -.44, .42, lowerRailY, -.44], 0xe0fbff, .92)
    // Annotation 3 is deliberately sparse background ambience. The previous 116
    // drifting points have been replaced by directional geometry below.
    const starCount = 30; const starPositions = new Float32Array(starCount * 3)
    for (let index = 0; index < starCount; index++) {
      const side = index % 2 === 0 ? -1 : 1
      starPositions[index * 3] = side * (standbyViewWidth * (.04 + ((index * 1.37) % .2)))
      starPositions[index * 3 + 1] = 1.05 + ((index % 9) - 4) * .27
      starPositions[index * 3 + 2] = -1.8 - (index % 7) * .38
    }
    const starGeometry = new THREE.BufferGeometry(); starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3))
    const starMaterial = new THREE.PointsMaterial({ color: 0x9aefff, size: .035, transparent: true, opacity: .48, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true })
    standbyGroup.add(new THREE.Points(starGeometry, starMaterial))
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
    const addAmbientLinearStreak = ({ position, length, direction, coreBrightness, glowStrength, breathingSpeed, phase }: { position: THREE.Vector3; length: number; direction: THREE.Vector3; coreBrightness: number; glowStrength: number; breathingSpeed: number; phase: number }) => {
      const object = new THREE.Group(); const planarDirection = direction.clone().setZ(0).normalize()
      const core = new THREE.MeshBasicMaterial({ color: 0xeafcff, map: coreTexture, transparent: true, opacity: .18, depthWrite: false, depthTest: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending })
      const glow = new THREE.MeshBasicMaterial({ color: 0x55dcff, map: haloTexture, transparent: true, opacity: .05, depthWrite: false, depthTest: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending })
      const coreMesh = new THREE.Mesh(new THREE.PlaneGeometry(length, .018), core); const glowMesh = new THREE.Mesh(new THREE.PlaneGeometry(length * 1.5, .075), glow)
      object.position.copy(position); object.rotation.z = Math.atan2(planarDirection.y, planarDirection.x); object.add(glowMesh, coreMesh); standbyGroup.add(object)
      ambientLinearStreaks.push({ core, glow, coreBrightness, glowStrength, breathingSpeed, phase })
    }
    // Stage 1B test: deliberately fixed in the upper-left sky band. Only opacity
    // breathes; the group itself is never translated, rotated, or regenerated.
    addAmbientLinearStreak({ position: new THREE.Vector3(-standbyViewWidth * .235, 3.82, .08), length: .55, direction: new THREE.Vector3(.94, -.34, 0), coreBrightness: .95, glowStrength: .45, breathingSpeed: .42, phase: .7 })
    const packetCoreGeometry = new THREE.PlaneGeometry(.9, .045)
    const packetGlowGeometry = new THREE.PlaneGeometry(1.46, .17)
    const addTraveller = (path: { start: THREE.Vector3; end: THREE.Vector3 }, delay: number, packet: boolean) => {
      const object = new THREE.Group(); const direction = path.end.clone().sub(path.start).normalize()
      const glow = packet ? makeTrailMaterial(0x36d6ff, true) : new THREE.SpriteMaterial({ color: 0x36d6ff, map: haloTexture, transparent: true, opacity: 0, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending })
      const core = packet ? makeTrailMaterial(0xe9fcff, false) : new THREE.SpriteMaterial({ color: 0xe9fcff, map: coreTexture, transparent: true, opacity: 0, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending })
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
      ambientLinearStreaks.forEach((streak) => { const breath = .5 + .5 * Math.sin(elapsed * streak.breathingSpeed + streak.phase); streak.core.opacity = .16 + streak.coreBrightness * (.26 + breath * .34); streak.glow.opacity = .035 + streak.glowStrength * (.2 + breath * .4) })
      renderer.render(scene, camera); if (running) raf = requestAnimationFrame(render)
    }; render()
    const get = <T extends Element>(selector: string) => host.querySelector<T>(selector)!; const connect = get<HTMLElement>('.boot-connect'), diagnostics = get<HTMLElement>('.boot-status-columns'), assembleStack = get<HTMLElement>('.boot-assemble-stack'), titleRail = get<HTMLElement>('.boot-title-rail'), readyNodes = [...host.querySelectorAll<HTMLElement>('.boot-ready-node')], core = get<HTMLElement>('.boot-focal-core'), hud = get<HTMLElement>('.boot-hud'), standbyCopy = get<HTMLElement>('.boot-standby-copy'); const shutterParts = host.querySelectorAll<HTMLElement>('.boot-shutters i'); const diagnosticLines = [...host.querySelectorAll<HTMLElement>('.boot-module')]; const diagnosticPanels = [...host.querySelectorAll<HTMLElement>('.boot-diagnostic-panel')]; const tl = gsap.timeline(); timelineRef.current = tl; (window as TimelineWindow).__elucidatorBootTimeline = tl
    if (import.meta.env.DEV) requestAnimationFrame(() => { const ancestors: BootDiagnostics['ancestors'] = []; for (let node: HTMLElement | null = host.parentElement; node && ancestors.length < 4; node = node.parentElement) { const style = getComputedStyle(node); ancestors.push({ tag: node.tagName, className: node.className, position: style.position, transform: style.transform, width: style.width, height: style.height }) }; const canvas = renderer.domElement; const report: BootDiagnostics = { viewport: { width: window.innerWidth, height: window.innerHeight }, scene: host.getBoundingClientRect(), hud: hud.getBoundingClientRect(), canvas: { width: canvas.width, height: canvas.height, clientWidth: canvas.clientWidth, clientHeight: canvas.clientHeight, pixelRatio: renderer.getPixelRatio() }, assignedViewport: viewport, ancestors }; const browser = window as TimelineWindow; browser.__elucidatorBootDiagnostics = [report]; console.info('[Elucidator boot diagnostics]', report) })
    const standbyInstruction = standbyCopy.querySelector('span'); if (standbyInstruction) standbyInstruction.textContent = 'CLICK ANY BUTTON TO CONTINUE'
    const standbyDiagnostics = document.createElement('div'); standbyDiagnostics.className = 'boot-standby-diagnostics'; ;['WALLPAPER LOADED  //  OK', 'INTERFACE READY   //  OK', 'DISPLAY SYNC      //  OK'].forEach((line) => { const row = document.createElement('span'); row.textContent = `› ${line}`; standbyDiagnostics.appendChild(row) }); host.appendChild(standbyDiagnostics)
    const standbyAxis = document.createElement('div'); standbyAxis.className = 'boot-standby-axis'; host.appendChild(standbyAxis)
    const idleTimelines: gsap.core.Timeline[] = []
    const startStandbyRailFlow = () => {
      if (idleTimelines.length) return
      const animateTraveller = ({ object, core, glow, path, delay }: StandbyTraveller, duration: number, isPacket: boolean) => {
        const flow = gsap.timeline({ repeat: -1, repeatDelay: .45, delay })
        flow.set(object.position, { x: path.start.x, y: path.start.y, z: path.start.z }).set(core, { opacity: 0 }).set(glow, { opacity: 0 })
          .to(glow, { opacity: isPacket ? .6 : .3, duration: .13 }).to(core, { opacity: isPacket ? 1 : .7, duration: .1 }, '<')
          .to(object.position, { x: path.end.x, y: path.end.y, z: path.end.z, duration, ease: 'power1.in' }, '<')
          .to([core, glow], { opacity: 0, duration: .14 }, '>-0.13')
        idleTimelines.push(flow)
      }
      standbyPackets.forEach((packet, index) => animateTraveller(packet, 1.2 + (index % 3) * .13, true))
      standbyMarkers.forEach((marker, index) => animateTraveller(marker, 1.45 + (index % 2) * .16, false))
      standbyPanelScans.forEach((scan, index) => {
        const sweep = gsap.timeline({ repeat: -1, repeatDelay: 2.1 + (index % 2) * .4, delay: index * .43 })
        sweep.set(scan.mesh.position, { y: scan.minY }).set(scan.material, { opacity: 0 })
          .to(scan.material, { opacity: .52, duration: .25 })
          .to(scan.mesh.position, { y: scan.maxY, duration: 2.4, ease: 'none' }, '<')
          .to(scan.material, { opacity: 0, duration: .3 }, '>-0.3')
        idleTimelines.push(sweep)
      })
    }
    const applyRevealPose = (timeline?: gsap.core.Timeline, at = 0) => {
      const set = (target: gsap.TweenTarget, vars: gsap.TweenVars) => timeline ? timeline.to(target, { ...vars, overwrite: 'auto' }, at) : gsap.set(target, vars)
      set(camera.position, { z: 14, duration: .72, ease: 'power2.out' }); set(frameMaterials, { opacity: 0, duration: .55 }); set(railMaterial, { opacity: 0, duration: .5 }); set(architectureMaterial, { opacity: 0, duration: .5 }); set(panelMaterials, { opacity: 0, duration: .55 }); set(panelEdgeMaterials, { opacity: 0, duration: .55 }); set(hazeMaterial, { opacity: 0, duration: .5 }); set(standbyGroup, { visible: true }); set(standbyLineMaterials, { opacity: (index: number) => Number(standbyLineMaterials[index].userData.targetOpacity ?? .6), duration: .55 }); set(standbyGlassMaterials, { opacity: (index: number) => Number(standbyGlassMaterials[index].userData.targetOpacity ?? .12), duration: .55 }); set(shutterParts, { '--open': '1', duration: .9, ease: 'power3.inOut' })
    }
    let removeStandbyInput: () => void = () => {}
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
    const cleanup = () => { removeStandbyInput(); tl.kill(); idleTimelines.forEach(item => item.kill()); if (timelineRef.current === tl) timelineRef.current = null; waitingForWallpaperRef.current = false; running = false; cancelAnimationFrame(raf); removeEventListener('resize', resize); if ((window as TimelineWindow).__elucidatorBootTimeline === tl) delete (window as TimelineWindow).__elucidatorBootTimeline; scene.traverse(object => { const drawable = object as THREE.Mesh; drawable.geometry?.dispose(); const material = drawable.material; if (Array.isArray(material)) material.forEach(item => item.dispose()); else material?.dispose() }); trailTextures.forEach(texture => texture.dispose()); renderer.dispose(); renderer.domElement.remove(); standbyDiagnostics.remove(); standbyAxis.remove() }
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
