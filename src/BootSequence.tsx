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
    // Build the standby architecture against the actual host aspect ratio. This
    // changes its physical coordinates, rather than stretching a 16:9 scene.
    const standbyAspect = Math.max(1, host.clientWidth / Math.max(1, host.clientHeight))
    const standbyWide = Math.min(1.82, Math.max(1, standbyAspect / (16 / 9)))
    const widen = (value: number) => value * standbyWide
    const standbyLineMaterials: THREE.LineBasicMaterial[] = []; const standbyGlassMaterials: THREE.MeshBasicMaterial[] = []
    const standbyPanelScans: Array<{ mesh: THREE.Mesh; material: THREE.MeshBasicMaterial; minY: number; maxY: number }> = []
    const addStandbyLines = (points: number[], color: number, opacity: number) => { const material = makeLineMaterial(color); material.userData.targetOpacity = opacity; standbyLineMaterials.push(material); const geometry = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(points, 3)); standbyGroup.add(new THREE.LineSegments(geometry, material)) }
    const addDepthWing = (side: -1 | 1) => {
      const panels = [
        // D1/D2 are tapered glass wings, not upright rectangular doors. Their
        // wide slanted silhouettes overlap along the same corridor direction.
        { width: 2.36, height: 6.05, x: 9.35, z: -.72, opacity: .13, edge: .76, colour: 0x4bb8d6, angle: -.48 }, // D1 outer/front
        { width: 1.78, height: 5.35, x: 7.7, z: -1.48, opacity: .082, edge: .56, colour: 0x2d7189, angle: -.42 }, // D2 inner/rear
      ]
      panels.forEach(({ width, height, x, z, opacity, edge: edgeOpacity, colour, angle }) => {
        const material = new THREE.MeshBasicMaterial({ color: colour, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, blending: THREE.NormalBlending }); material.userData.targetOpacity = opacity
        const wingGeometry = new THREE.BufferGeometry(); wingGeometry.setAttribute('position', new THREE.Float32BufferAttribute([
          -width * .5, -height * .5, 0, width * .48, -height * .33, 0, width * .31, height * .5, 0, -width * .38, height * .38, 0,
        ], 3)); wingGeometry.setIndex([0, 1, 2, 0, 2, 3]); wingGeometry.computeVertexNormals()
        const panel = new THREE.Mesh(wingGeometry, material); panel.position.set(side * widen(x), 0, z); panel.rotation.y = side * angle; standbyGlassMaterials.push(material); standbyGroup.add(panel)
        const edgeMaterial = makeLineMaterial(0x9cecff); edgeMaterial.userData.targetOpacity = edgeOpacity; standbyLineMaterials.push(edgeMaterial); const panelEdge = new THREE.LineSegments(new THREE.EdgesGeometry(wingGeometry), edgeMaterial); panelEdge.position.copy(panel.position); panelEdge.rotation.copy(panel.rotation); standbyGroup.add(panelEdge)
        const detailMaterial = makeLineMaterial(0x75dff5); detailMaterial.userData.targetOpacity = edgeOpacity * .68; standbyLineMaterials.push(detailMaterial)
        const detail = new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute([
          -width * .39, height * .26, .02, width * .39, height * .26, .02, -width * .39, 0, .02, width * .28, 0, .02, -width * .39, -height * .26, .02, width * .39, -height * .26, .02,
          -width * .24, height * .39, .02, -width * .24, -height * .39, .02, width * .24, height * .39, .02, width * .24, -height * .39, .02,
          -width * .43, height * .12, .02, -width * .32, height * .12, .02, width * .27, -height * .12, .02, width * .43, -height * .12, .02,
        ], 3)), detailMaterial)
        detail.position.copy(panel.position); detail.rotation.copy(panel.rotation); standbyGroup.add(detail)
        const scanMaterial = new THREE.MeshBasicMaterial({ color: 0xa8f4ff, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })
        const scan = new THREE.Mesh(new THREE.PlaneGeometry(width * .68, .028), scanMaterial); scan.position.set(panel.position.x, -height * .27, panel.position.z + .025); scan.rotation.copy(panel.rotation); standbyGroup.add(scan); standbyPanelScans.push({ mesh: scan, material: scanMaterial, minY: -height * .27, maxY: height * .29 })
      })
      // Technical markings sit on the glass layers; they are not additional panels.
      addStandbyLines([side * widen(7.42), 1.72, -.2, side * widen(8.86), 1.98, -1.02, side * widen(7.42), 0, -.2, side * widen(8.86), .22, -1.02, side * widen(7.42), -1.72, -.2, side * widen(8.86), -1.54, -1.02], 0x3f8da6, .24)
    }
    // 7.2 × 7.2 inner aperture / 8.4 × 8.4 outer architecture. At 1920×1080 this
    // reads as a roughly 650 px transparent portal with a visible structural surround.
    const frameX = widen(6.25); const frameY = 3.06; const corner = .56
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
      const start = new THREE.Vector3(side * widen(10.85), upper ? 3.0 : -1.65, -1.18)
      const end = new THREE.Vector3(side * frameX, upper ? 1.72 : -1.08, -.04)
      standbyRailPaths.push({ start, end })
      addStandbyLines([start.x, start.y, start.z, end.x, end.y, end.z], 0x78e8ff, .8)
      addStandbyLines([start.x, start.y + direction * .22, start.z - .12, end.x, end.y + direction * .14, end.z - .04], 0x276c86, .32)
    }
    addPerspectiveRail(-1, true); addPerspectiveRail(-1, false); addPerspectiveRail(1, true); addPerspectiveRail(1, false)
    // E: exactly two horizontal structural rails, above and below the viewport. They are
    // segmented guides, not another enclosing frame or a line through the wallpaper.
    const railX = widen(5.4)
    const upperRailY = 4.6; const lowerRailY = -3.4
    addStandbyLines([-railX, upperRailY, -.52, railX, upperRailY, -.52, -railX, lowerRailY, -.52, railX, lowerRailY, -.52], 0x4f9ab2, .34)
    addStandbyLines([-widen(4.8), upperRailY, -.48, -widen(2.2), upperRailY, -.48, widen(2.2), upperRailY, -.48, widen(4.8), upperRailY, -.48, -widen(4.8), lowerRailY, -.48, -widen(2.2), lowerRailY, -.48, widen(2.2), lowerRailY, -.48, widen(4.8), lowerRailY, -.48], 0xa4efff, .68)
    addStandbyLines([-.42, upperRailY, -.44, .42, upperRailY, -.44, -.42, lowerRailY, -.44, .42, lowerRailY, -.44], 0xe0fbff, .92)
    // One shared particle cloud gives the settled HUD low-cost atmospheric depth.
    // It is updated in-place in the existing render loop: no per-frame objects.
    const particleCount = 116; const particlePositions = new Float32Array(particleCount * 3); const particleBase = new Float32Array(particleCount * 3); const particlePhase = new Float32Array(particleCount); const particleSpeed = new Float32Array(particleCount)
    for (let index = 0; index < particleCount; index++) {
      const side = index % 2 === 0 ? -1 : 1; const band = index % 4
      const x = side * (widen(5.6) + ((index * 1.71) % 5.1)); const y = band < 2 ? (band === 0 ? 2.45 : -2.18) + ((index % 7) - 3) * .12 : ((index % 15) - 7) * .34; const z = -1.3 - (index % 9) * .44
      particleBase[index * 3] = particlePositions[index * 3] = x; particleBase[index * 3 + 1] = particlePositions[index * 3 + 1] = y; particleBase[index * 3 + 2] = particlePositions[index * 3 + 2] = z
      particlePhase[index] = index * 1.618; particleSpeed[index] = .08 + (index % 5) * .023
    }
    const particleGeometry = new THREE.BufferGeometry(); const particleAttribute = new THREE.BufferAttribute(particlePositions, 3); particleGeometry.setAttribute('position', particleAttribute)
    const particleMaterial = new THREE.PointsMaterial({ color: 0x9aefff, size: .055, transparent: true, opacity: .74, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true })
    standbyGroup.add(new THREE.Points(particleGeometry, particleMaterial))
    type TrailMaterial = THREE.MeshBasicMaterial
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
    const packetCoreGeometry = new THREE.PlaneGeometry(.9, .045)
    const packetGlowGeometry = new THREE.PlaneGeometry(1.46, .17)
    const markerCoreGeometry = new THREE.PlaneGeometry(.28, .018)
    const markerGlowGeometry = new THREE.PlaneGeometry(.5, .065)
    const addTraveller = (path: { start: THREE.Vector3; end: THREE.Vector3 }, delay: number, packet: boolean) => {
      const object = new THREE.Group(); const direction = path.end.clone().sub(path.start).normalize()
      const glow = makeTrailMaterial(0x36d6ff, true)
      const core = makeTrailMaterial(0xe9fcff, false)
      const glowMesh = new THREE.Mesh(packet ? packetGlowGeometry : markerGlowGeometry, glow); const coreMesh = new THREE.Mesh(packet ? packetCoreGeometry : markerCoreGeometry, core)
      object.add(glowMesh, coreMesh); object.position.copy(path.start); object.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), direction); standbyGroup.add(object)
      const traveller = { object, core, glow, path, delay }; (packet ? standbyPackets : standbyMarkers).push(traveller)
    }
    standbyRailPaths.forEach((path, pathIndex) => {
      // Extend the visible line back through depth; every traveller remains collinear with
      // the rail and naturally grows under the perspective camera as it approaches.
      const direction = path.end.clone().sub(path.start).normalize()
      const far = path.start.clone().addScaledVector(direction, -7.4)
      const depthPath = { start: far, end: path.end.clone().addScaledVector(direction, .12) }
      for (let index = 0; index < 3; index++) addTraveller(depthPath, pathIndex * .37 + index * .76, true)
      const markerStart = path.start.clone().addScaledVector(direction, -2.3)
      addTraveller({ start: markerStart, end: path.end.clone().addScaledVector(direction, -.14) }, pathIndex * .48 + .31, false)
    })
    const pulseMaterials: THREE.LineBasicMaterial[] = []; const pulses: THREE.Line[] = []; for (let i = 0; i < 10; i++) { const y = i % 2 ? -2.9 : 2.9; const material = makeLineMaterial(0xd8fbff); const x = i % 3 === 0 ? 4.7 : -4.7; const pulse = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(x, y, 0), new THREE.Vector3(x, y, -1.5)]), material); pulse.position.z = -31; pulseMaterials.push(material); pulses.push(pulse); corridor.add(pulse) }
    const resize = () => { const width = host.clientWidth, height = host.clientHeight; renderer.setSize(width, height, false); camera.aspect = width / height; camera.updateProjectionMatrix() }; resize(); addEventListener('resize', resize); let running = true; let raf = 0; const particleClock = new THREE.Clock(); const render = () => {
      const elapsed = particleClock.getElapsedTime()
      for (let index = 0; index < particleCount; index++) {
        const offset = index * 3; const pulse = Math.sin(elapsed * particleSpeed[index] + particlePhase[index])
        particlePositions[offset] = particleBase[offset] + pulse * .18
        particlePositions[offset + 1] = particleBase[offset + 1] + Math.cos(elapsed * particleSpeed[index] * .8 + particlePhase[index]) * .07
        particlePositions[offset + 2] = particleBase[offset + 2] + pulse * .1
      }
      particleAttribute.needsUpdate = true
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
