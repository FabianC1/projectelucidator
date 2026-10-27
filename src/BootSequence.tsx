import { useEffect, useRef, type CSSProperties } from 'react'
import * as THREE from 'three'
import { gsap } from 'gsap'
import './BootSequence.css'

type TimelineWindow = Window & { __elucidatorBootTimeline?: gsap.core.Timeline }
type DiagnosticLine = { label: string; value: string }
const coreModules: DiagnosticLine[] = [
  { label: 'SYS_CORE', value: 'INITIALISING' }, { label: 'DISPLAY_DRIVER', value: 'ONLINE' },
  { label: 'MEMORY_BUFFER', value: 'ALLOCATED' }, { label: 'THEME_ENGINE', value: 'LOADED' },
  { label: 'WALLPAPER_DECODER', value: 'BUFFERED' }, { label: 'RENDER_PIPELINE', value: 'ACTIVE' },
  { label: 'MODULES', value: '08 / 08' }, { label: 'SYSTEM_INTEGRITY', value: 'VERIFIED' },
]
const sceneModules: DiagnosticLine[] = [
  { label: 'SCENE_GRAPH', value: 'BUILDING' }, { label: 'GEOMETRY_NODES', value: '128' },
  { label: 'FRAME_ASSEMBLY', value: 'COMPLETE' }, { label: 'SHADER_PIPELINE', value: 'LINKED' },
  { label: 'TEXTURE_BUFFER', value: 'BUFFERED' }, { label: 'DISPLAY_SYNC', value: 'ESTABLISHED' },
  { label: 'ASSET_VALIDATION', value: 'PASSED' }, { label: 'REVEAL_SEQUENCE', value: 'ARMED' },
]

export function BootSequence({ active, short, wallpaperReady, onReveal }: { active: boolean; short: boolean; wallpaperReady: boolean; onReveal: () => void }) {
  const mount = useRef<HTMLElement>(null)
  const revealRef = useRef(onReveal)
  const wallpaperReadyRef = useRef(wallpaperReady)
  const timelineRef = useRef<gsap.core.Timeline | null>(null)
  const waitingForWallpaperRef = useRef(false)
  useEffect(() => { revealRef.current = onReveal }, [onReveal])
  useEffect(() => {
    wallpaperReadyRef.current = wallpaperReady
    if (wallpaperReady && waitingForWallpaperRef.current) { waitingForWallpaperRef.current = false; timelineRef.current?.play() }
  }, [wallpaperReady])
  useEffect(() => {
    const host = mount.current
    if (!host || !active || matchMedia('(prefers-reduced-motion: reduce)').matches) { if (active) revealRef.current(); return }
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5)); renderer.setClearAlpha(0); host.appendChild(renderer.domElement)
    const scene = new THREE.Scene(); const camera = new THREE.PerspectiveCamera(48, 1, .1, 90); camera.position.set(0, 0, 14)
    const corridor = new THREE.Group(); scene.add(corridor)
    const depths = Array.from({ length: 8 }, (_, index) => -index * 4.2)
    const frameMaterials: THREE.LineBasicMaterial[] = []; const frames: THREE.LineSegments[] = []; const panelMaterials: THREE.MeshBasicMaterial[] = []; const panels: THREE.Mesh[] = []
    const makeLineMaterial = (color = 0x62dfff) => new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0 })
    depths.forEach((z, index) => {
      const material = makeLineMaterial(index < 2 ? 0x9eefff : 0x3baecb); frameMaterials.push(material)
      const frame = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(7.2, 4.4, .01)), material); frame.position.z = z; frames.push(frame); corridor.add(frame)
      ;[-1, 1].forEach(side => {
        const surface = new THREE.MeshBasicMaterial({ color: 0x167ea2, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false })
        const panel = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 2.7), surface); panel.position.set(side * 4.3, 0, z); panel.rotation.y = side * Math.PI / 2; panelMaterials.push(surface); panels.push(panel); corridor.add(panel)
      })
    })
    const rails: number[] = []; const braces: number[] = []
    for (let i = 0; i < depths.length - 1; i++) {
      for (const [x, y] of [[-3.6, -2.2], [-3.6, 2.2], [3.6, -2.2], [3.6, 2.2]]) rails.push(x, y, depths[i], x, y, depths[i + 1])
      braces.push(-2.65, -1.92, depths[i], -1.1, -1.92, depths[i], 1.1, -1.92, depths[i], 2.65, -1.92, depths[i], -2.65, 1.92, depths[i], -1.1, 1.92, depths[i], 1.1, 1.92, depths[i], 2.65, 1.92, depths[i])
    }
    const railMaterial = makeLineMaterial(0x49cfff); const railGeometry = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(rails, 3)); const railMesh = new THREE.LineSegments(railGeometry, railMaterial); corridor.add(railMesh)
    const braceMaterial = makeLineMaterial(0x2584a2); const braceMesh = new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(braces, 3)), braceMaterial); corridor.add(braceMesh)
    const pulseMaterials: THREE.LineBasicMaterial[] = []; const pulses: THREE.Line[] = []
    for (let i = 0; i < 8; i++) { const y = i % 2 ? -2.2 : 2.2; const material = makeLineMaterial(0xd1faff); const pulse = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(i % 3 === 0 ? 3.6 : -3.6, y, 0), new THREE.Vector3(i % 3 === 0 ? 3.6 : -3.6, y, -1.2)]), material); pulse.position.z = -30; pulseMaterials.push(material); pulses.push(pulse); corridor.add(pulse) }
    const resize = () => { const width = host.clientWidth, height = host.clientHeight; renderer.setSize(width, height, false); camera.aspect = width / height; camera.updateProjectionMatrix() }; resize(); addEventListener('resize', resize)
    let running = true; let raf = 0; const render = () => { renderer.render(scene, camera); if (running) raf = requestAnimationFrame(render) }; render()
    const get = <T extends Element>(selector: string) => host.querySelector<T>(selector)!
    const connect = get<HTMLElement>('.boot-connect'), diagnostics = get<HTMLElement>('.boot-status-columns'), assemble = get<HTMLElement>('.boot-assemble'), titleRail = get<HTMLElement>('.boot-title-rail'), core = get<HTMLElement>('.boot-focal-core')
    const shutterParts = host.querySelectorAll<HTMLElement>('.boot-shutters i'); const diagnosticLines = [...host.querySelectorAll<HTMLElement>('.boot-module')]
    const moveDuration = short ? 1.5 : 3; const revealAt = short ? 2.12 : 5.25; const tl = gsap.timeline(); timelineRef.current = tl; (window as TimelineWindow).__elucidatorBootTimeline = tl
    tl.to(core, { autoAlpha: 1, scale: 1, duration: .38, ease: 'power2.out' }).to(connect, { autoAlpha: 1, duration: .34 }, .16)
      .to(frames.slice().reverse().map(frame => frame.material), { opacity: (index: number) => .22 + index * .07, duration: short ? .72 : 1.5, stagger: .12, ease: 'none' }, .42)
      .to(railMaterial, { opacity: .62, duration: .55 }, short ? .52 : 1.45).to(braceMaterial, { opacity: .34, duration: .5 }, short ? .7 : 1.8)
      .to(panelMaterials, { opacity: .10, duration: .65, stagger: .025 }, short ? .72 : 1.86).to(diagnostics, { autoAlpha: 1, duration: .28 }, short ? .72 : 1.72)
      .to(diagnosticLines, { autoAlpha: 1, duration: .16, stagger: .1 }, short ? .8 : 1.88)
      .to(camera.position, { z: 10.4, duration: moveDuration, ease: 'power2.inOut' }, short ? .86 : 2.05)
      .to(panels.map(panel => panel.position), { x: (index: number) => panels[index].position.x * 1.32, duration: moveDuration * .78, ease: 'power2.inOut' }, short ? .94 : 2.18)
      .to(diagnosticLines, { className: '+=is-complete', duration: .01, stagger: .06 }, short ? 1.22 : 2.85)
      .to(connect, { autoAlpha: 0, duration: .22 }, short ? 1.35 : 3.45).to(assemble, { autoAlpha: 1, duration: .42 }, short ? 1.42 : 3.56).to(titleRail, { scaleX: 1, duration: .55, ease: 'power2.out' }, short ? 1.45 : 3.63)
    pulses.forEach((pulse, index) => { const at = (short ? 1.0 : 2.25) + index * (short ? .12 : .22); tl.set(pulse.material, { opacity: .95 }, at).to(pulse.position, { z: 8, duration: short ? .68 : 1.16, ease: 'none' }, at).set(pulse.material, { opacity: 0 }) })
    tl.addPause(revealAt, () => { if (!wallpaperReadyRef.current) waitingForWallpaperRef.current = true; else requestAnimationFrame(() => tl.play()) })
      .to(diagnostics, { autoAlpha: 0, xPercent: 0, scale: .96, duration: .38, ease: 'power2.in' }, revealAt)
      .to([assemble, titleRail, core], { autoAlpha: 0, duration: .35 }, revealAt + .12).to(camera.position, { z: 7.8, duration: .68, ease: 'power3.in' }, revealAt)
      .to(shutterParts, { '--open': '1', duration: .9, ease: 'power3.inOut' }, revealAt + .14).call(() => revealRef.current(), [], revealAt + 1.04)
      .to([frameMaterials, railMaterial, braceMaterial, panelMaterials, pulseMaterials].flat(), { opacity: 0, duration: .42 }, revealAt + .64).to(host, { autoAlpha: 0, duration: .2, onComplete: () => { running = false; cancelAnimationFrame(raf); renderer.render(scene, camera) } }, revealAt + 1.1)
    return () => { tl.kill(); if (timelineRef.current === tl) timelineRef.current = null; waitingForWallpaperRef.current = false; running = false; cancelAnimationFrame(raf); removeEventListener('resize', resize); if ((window as TimelineWindow).__elucidatorBootTimeline === tl) delete (window as TimelineWindow).__elucidatorBootTimeline; corridor.traverse(object => { const drawable = object as THREE.Mesh; drawable.geometry?.dispose(); const material = drawable.material; if (Array.isArray(material)) material.forEach(item => item.dispose()); else material?.dispose() }); renderer.dispose(); renderer.domElement.remove() }
  }, [active, short])
  const seek = (time: number) => (window as TimelineWindow).__elucidatorBootTimeline?.pause().seek(time)
  const previewRevealAt = short ? 2.12 : 5.25
  const panel = (title: string, lines: DiagnosticLine[], side: 'left' | 'right') => <section className={`boot-diagnostic-panel boot-diagnostic-${side}`}><header><span>{title}</span><i>LINKED</i></header><div className="boot-diagnostic-rule" />{lines.map((line, index) => <p className="boot-module" key={line.label}><b>› {line.label}</b><em>{line.label === 'WALLPAPER_DECODER' || line.label === 'TEXTURE_BUFFER' ? wallpaperReady ? 'READY' : 'BUFFERED' : line.value}</em><i style={{ '--line-delay': index } as CSSProperties} /></p>)}<footer><span>MODULES</span><i /><b>{side === 'left' ? '08 / 08' : 'SYNC // 01'}</b></footer></section>
  return <><section ref={mount} className="boot-scene" aria-hidden="true"><div className="boot-shutters"><i className="top" /><i className="right" /><i className="bottom" /><i className="left" /><i className="center" /><b /><b /><b /><b /></div><div className="boot-focal-core"><i /><i /><i /><i /><b /></div><div className="boot-status-columns">{panel('CORE MODULES', coreModules, 'left')}{panel('SYSTEM LAYERS', sceneModules, 'right')}</div><div className="boot-connect">ELUCIDATOR<small>ESTABLISHING DISPLAY LINK</small></div><div className="boot-assemble">ELUCIDATOR<small>SYSTEM SYNCHRONISED</small></div><div className="boot-title-rail"><i /><i /><i /><i /><i /><i /><i /></div></section>{import.meta.env.DEV && <div className="boot-debug" aria-label="Boot timeline preview"><button onClick={() => seek(0)}>Connect</button><button onClick={() => seek(short ? .9 : 2)}>Compile</button><button onClick={() => seek(short ? 1.55 : 3.75)}>Assemble</button><button onClick={() => seek(previewRevealAt)}>Reveal</button></div>}</>
}
