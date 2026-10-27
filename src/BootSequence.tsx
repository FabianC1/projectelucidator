import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { gsap } from 'gsap'
import './BootSequence.css'

export function BootSequence({ active, short, onReveal }: { active: boolean; short: boolean; onReveal: () => void }) {
  const mount = useRef<HTMLDivElement>(null)
  const revealRef = useRef(onReveal)
  useEffect(() => { revealRef.current = onReveal }, [onReveal])
  useEffect(() => {
    const host = mount.current
    if (!host || !active || matchMedia('(prefers-reduced-motion: reduce)').matches) { if (active) revealRef.current(); return }
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5)); host.appendChild(renderer.domElement)
    const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(48, 1, .1, 80)
    camera.position.z = 13
    const group = new THREE.Group(); scene.add(group)
    const material = new THREE.LineBasicMaterial({ color: 0x65dfff, transparent: true, opacity: 0 })
    const panels: THREE.Mesh[] = []
    const depth = Array.from({ length: 8 }, (_, index) => -index * 4.2)
    for (const z of depth) { const geo = new THREE.EdgesGeometry(new THREE.BoxGeometry(7.2, 4.4, .01)); const frame = new THREE.LineSegments(geo, material.clone()); frame.position.z = z; group.add(frame); for (const side of [-1, 1]) { const panel = new THREE.Mesh(new THREE.PlaneGeometry(3.1, 2.9), new THREE.MeshBasicMaterial({ color: 0x2277aa, transparent: true, opacity: 0, side: THREE.DoubleSide })); panel.position.set(side * 4.35, 0, z); panel.rotation.y = side * Math.PI / 2; panels.push(panel); group.add(panel) } }
    const railVertices: number[] = []; for (let i = 0; i < depth.length - 1; i++) for (const [x, y] of [[-3.6, -2.2], [-3.6, 2.2], [3.6, -2.2], [3.6, 2.2]]) railVertices.push(x, y, depth[i], x, y, depth[i + 1]); const rails = new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(railVertices, 3)), material.clone()); group.add(rails)
    const floorVertices: number[] = []; for (const z of depth) { floorVertices.push(-3.6, -2.2, z, 3.6, -2.2, z, -3.6, 2.2, z, 3.6, 2.2, z) } const floor = new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(floorVertices, 3)), material.clone()); group.add(floor)
    const resize = () => { const w = host.clientWidth, h = host.clientHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix() }; resize(); addEventListener('resize', resize)
    let raf = 0; const draw = () => { renderer.render(scene, camera); raf = requestAnimationFrame(draw) }; draw()
    const lines = group.children.filter((child): child is THREE.LineSegments => child instanceof THREE.LineSegments)
    const shutters = host.querySelectorAll('.boot-shutters i'); const status = host.querySelector('.boot-status-columns'); const title = host.querySelector('.boot-assemble')
    const tl = gsap.timeline(); tl.to(host.querySelector('.boot-connect'), { autoAlpha: 1, duration: .45 }).to(lines.map(x => x.material), { opacity: .72, duration: short ? .8 : 1.8, stagger: -.1 }, .3).to(panels.map(x => x.material), { opacity: .09, duration: .9, stagger: .04 }, .8).to(status, { autoAlpha: 1, duration: .4 }, .9).to(group.position, { z: 7, duration: short ? 1.5 : 3, ease: 'power2.inOut' }, short ? .8 : 2).to(panels.map(panel => panel.position), { x: (index: number) => panels[index].position.x * 1.35, duration: short ? 1.2 : 2.5, ease: 'power2.inOut' }, short ? .9 : 2.1).to(host.querySelector('.boot-connect'), { autoAlpha: 0, duration: .25 }, short ? 1.25 : 3.1).to(title, { autoAlpha: 1, duration: .5 }, short ? 1.35 : 3.2).call(() => revealRef.current(), [], short ? 1.9 : 5.1).to(shutters, { x: (index: number) => index % 2 ? '100%' : '-100%', y: (index: number) => index < 2 ? '-100%' : '100%', duration: .85, ease: 'power3.inOut' }, short ? 1.9 : 5.1).to([group.position, host.querySelector('.boot-assemble'), status], { z: 14, autoAlpha: 0, duration: .55 }, short ? 2.25 : 5.55).to(host, { autoAlpha: 0, duration: .25 }, short ? 2.5 : 5.85)
    return () => { tl.kill(); cancelAnimationFrame(raf); removeEventListener('resize', resize); group.traverse((object) => { const mesh = object as THREE.Mesh; mesh.geometry?.dispose(); const material = mesh.material; if (Array.isArray(material)) material.forEach((item) => item.dispose()); else material?.dispose() }); renderer.dispose(); renderer.domElement.remove() }
  }, [active, short])
  return <section ref={mount} className="boot-scene" aria-hidden="true"><div className="boot-shutters"><i /><i /><i /><i /></div><div className="boot-status-columns"><span>DISPLAY // LINKED</span><span>THEME // LOADED</span><span>WALLPAPER // READY</span></div><div className="boot-connect">ELUCIDATOR<small>ESTABLISHING DISPLAY LINK</small></div><div className="boot-assemble">ELUCIDATOR<small>SYSTEM SYNCHRONISED</small></div><div className="boot-reveal">SYSTEM READY</div></section>
}
