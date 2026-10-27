import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { gsap } from 'gsap'
import './BootSequence.css'

type TimelineWindow = Window & { __elucidatorBootTimeline?: gsap.core.Timeline }
const leftModules = ['INIT_DISPLAY_DRV', 'LOAD_THEME_CORE', 'PARSE_WALLPAPER']
const rightModules = ['RESOLVE_ASSETS', 'BUILD_SCENE_GRAPH', 'SYNC_DISPLAY_LINK']

export function BootSequence({ active, short, wallpaperReady, onReveal }: { active: boolean; short: boolean; wallpaperReady: boolean; onReveal: () => void }) {
  const mount = useRef<HTMLElement>(null)
  const revealRef = useRef(onReveal)
  const wallpaperReadyRef = useRef(wallpaperReady)
  const timelineRef = useRef<gsap.core.Timeline | null>(null)
  const waitingForWallpaperRef = useRef(false)
  useEffect(() => { revealRef.current = onReveal }, [onReveal])
  useEffect(() => {
    wallpaperReadyRef.current = wallpaperReady
    if (wallpaperReady && waitingForWallpaperRef.current) {
      waitingForWallpaperRef.current = false
      timelineRef.current?.play()
    }
  }, [wallpaperReady])
  useEffect(() => {
    const host = mount.current
    if (!host || !active || matchMedia('(prefers-reduced-motion: reduce)').matches) { if (active) revealRef.current(); return }
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5)); host.appendChild(renderer.domElement)
    const scene = new THREE.Scene(); const camera = new THREE.PerspectiveCamera(48, 1, .1, 90); camera.position.z = 13
    const group = new THREE.Group(); scene.add(group)
    const lineMaterial = () => new THREE.LineBasicMaterial({ color: 0x65dfff, transparent: true, opacity: 0 })
    const frames: THREE.LineSegments[] = []; const panels: THREE.Mesh[] = []; const depth = Array.from({ length: 8 }, (_, i) => -i * 4.2)
    depth.forEach(z => {
      const frame = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(7.2, 4.4, .01)), lineMaterial()); frame.position.z = z; frames.push(frame); group.add(frame)
      ;[-1, 1].forEach(side => { const panel = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 2.6), new THREE.MeshBasicMaterial({ color: 0x2277aa, transparent: true, opacity: 0, side: THREE.DoubleSide })); panel.position.set(side * 4.35, 0, z); panel.rotation.y = side * Math.PI / 2; panels.push(panel); group.add(panel) })
    })
    const railPoints: number[] = []
    for (let i = 0; i < depth.length - 1; i++) for (const [x, y] of [[-3.6, -2.2], [-3.6, 2.2], [3.6, -2.2], [3.6, 2.2]]) railPoints.push(x, y, depth[i], x, y, depth[i + 1])
    const rails = new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(railPoints, 3)), lineMaterial()); group.add(rails)
    const detailPoints: number[] = []; depth.slice(1).forEach(z => detailPoints.push(-2.4, -2.05, z, -.7, -2.05, z, .7, -2.05, z, 2.4, -2.05, z, -2.4, 2.05, z, -.7, 2.05, z, .7, 2.05, z, 2.4, 2.05, z))
    const details = new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(detailPoints, 3)), lineMaterial()); group.add(details)
    const pulses: THREE.Line[] = []
    for (let i = 0; i < 6; i++) { const y = i % 2 ? -2.2 : 2.2; const pulse = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-3.6, y, 0), new THREE.Vector3(-3.6, y, -1.35)]), new THREE.LineBasicMaterial({ color: 0xb9f5ff, transparent: true, opacity: 0 })); pulse.position.z = -29; pulses.push(pulse); group.add(pulse) }
    const resize = () => { const w = host.clientWidth, h = host.clientHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix() }; resize(); addEventListener('resize', resize)
    let running = true; let raf = 0; const draw = () => { renderer.render(scene, camera); if (running) raf = requestAnimationFrame(draw) }; draw()
    const get = <T extends Element>(selector: string) => host.querySelector<T>(selector)!
    const connect = get<HTMLElement>('.boot-connect'), compile = get<HTMLElement>('.boot-status-columns'), assemble = get<HTMLElement>('.boot-assemble'), titleRail = get<HTMLElement>('.boot-title-rail')
    const shutters = host.querySelectorAll<HTMLElement>('.boot-shutters i'); const moduleLines = [...host.querySelectorAll<HTMLElement>('.boot-module')]
    const duration = short ? 1.5 : 3; const tl = gsap.timeline(); timelineRef.current = tl; (window as TimelineWindow).__elucidatorBootTimeline = tl
    tl.to(connect, { autoAlpha: 1, duration: .45 })
      .to(frames.slice().reverse().map(frame => frame.material), { opacity: .72, duration: short ? .8 : 1.6, stagger: .12 }, .35)
      .to(rails.material, { opacity: .52, duration: .55 }, short ? .5 : 1.35).to(details.material, { opacity: .26, duration: .5 }, short ? .7 : 1.72)
      .to(panels.map(panel => panel.material), { opacity: .09, duration: .7, stagger: .03 }, short ? .7 : 1.8).to(compile, { autoAlpha: 1, duration: .3 }, short ? .65 : 1.5).to(moduleLines, { autoAlpha: 1, duration: .18, stagger: .16 }, short ? .7 : 1.72)
      .to(moduleLines[0], { className: '+=is-complete' }, short ? .95 : 2.05).to(moduleLines[1], { className: '+=is-active' }, short ? .98 : 2.1)
      .to(group.position, { z: 7, duration, ease: 'power2.inOut' }, short ? .82 : 1.88).to(panels.map(panel => panel.position), { x: (i: number) => panels[i].position.x * 1.35, duration: duration * .82, ease: 'power2.inOut' }, short ? .9 : 2.1)
    pulses.forEach((pulse, i) => { const at = (short ? .9 : 2.05) + i * (short ? .14 : .24); tl.set(pulse.material, { opacity: .95 }, at).to(pulse.position, { z: 8, duration: short ? .75 : 1.25, ease: 'none' }, at).set(pulse.material, { opacity: 0 }) })
    tl.to(connect, { autoAlpha: 0, duration: .25 }, short ? 1.2 : 3.3).to(moduleLines, { className: '+=is-complete' }, short ? 1.25 : 3.4).to(assemble, { autoAlpha: 1, duration: .45 }, short ? 1.32 : 3.55).to(titleRail, { scaleX: 1, duration: .6, ease: 'power2.out' }, short ? 1.35 : 3.6)
      .addPause(short ? 1.9 : 5.05, () => { if (!wallpaperReadyRef.current) waitingForWallpaperRef.current = true; else requestAnimationFrame(() => tl.play()) })
      .to(shutters, { '--open': '1', duration: .9, ease: 'power3.inOut' }, short ? 1.9 : 5.05).call(() => revealRef.current(), [], short ? 2.82 : 5.95)
      .to(group.position, { z: 14, duration: .5, ease: 'power2.in' }, short ? 2.45 : 5.6).to([frames.map(frame => frame.material), rails.material, details.material, panels.map(panel => panel.material)].flat(), { opacity: 0, duration: .42 }, short ? 2.42 : 5.58).to([assemble, compile, titleRail], { autoAlpha: 0, duration: .35 }, short ? 2.45 : 5.65).to(host, { autoAlpha: 0, duration: .22, onComplete: () => { running = false; cancelAnimationFrame(raf); renderer.render(scene, camera) } }, short ? 2.85 : 6.08)
    return () => { tl.kill(); if (timelineRef.current === tl) timelineRef.current = null; waitingForWallpaperRef.current = false; running = false; cancelAnimationFrame(raf); removeEventListener('resize', resize); if ((window as TimelineWindow).__elucidatorBootTimeline === tl) delete (window as TimelineWindow).__elucidatorBootTimeline; group.traverse(object => { const drawable = object as THREE.Mesh; drawable.geometry?.dispose(); const material = drawable.material; if (Array.isArray(material)) material.forEach(item => item.dispose()); else material?.dispose() }); renderer.dispose(); renderer.domElement.remove() }
  }, [active, short])
  const seek = (seconds: number) => (window as TimelineWindow).__elucidatorBootTimeline?.pause().seek(seconds)
  return <><section ref={mount} className="boot-scene" aria-hidden="true"><div className="boot-shutters"><i className="top" /><i className="right" /><i className="bottom" /><i className="left" /><b /><b /><b /><b /></div><div className="boot-status-columns"><div>{leftModules.map((line, i) => <span className="boot-module" key={line}>› {line} <em>{i === 2 ? 'BUFFERED' : 'OK'}</em></span>)}</div><div>{rightModules.map(line => <span className="boot-module" key={line}>› {line} <em>OK</em></span>)}</div></div><div className="boot-connect">ELUCIDATOR<small>ESTABLISHING DISPLAY LINK</small></div><div className="boot-assemble">ELUCIDATOR<small>SYSTEM SYNCHRONISED</small></div><div className="boot-title-rail"><i /><i /><i /><i /><i /><i /><i /></div></section>{import.meta.env.DEV && <div className="boot-debug" aria-label="Boot timeline preview"><button onClick={() => seek(0)}>Connect</button><button onClick={() => seek(short ? .85 : 1.8)}>Compile</button><button onClick={() => seek(short ? 1.5 : 3.7)}>Assemble</button><button onClick={() => seek(short ? 2 : 5.15)}>Reveal</button></div>}</>
}
