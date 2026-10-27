import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { gsap } from 'gsap'
import './BootSequence.css'

export function BootSequence({ active, short, onReveal }: { active: boolean; short: boolean; onReveal: () => void }) {
  const mount = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const host = mount.current
    if (!host || !active || matchMedia('(prefers-reduced-motion: reduce)').matches) { if (active) onReveal(); return }
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5)); host.appendChild(renderer.domElement)
    const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(48, 1, .1, 80)
    camera.position.z = 13
    const group = new THREE.Group(); scene.add(group)
    const material = new THREE.LineBasicMaterial({ color: 0x65dfff, transparent: true, opacity: 0 })
    const panels: THREE.Mesh[] = []
    for (let i = 0; i < 8; i++) { const z = -i * 5; const geo = new THREE.EdgesGeometry(new THREE.BoxGeometry(7.2 - i * .48, 4.4 - i * .28, .01)); const frame = new THREE.LineSegments(geo, material.clone()); frame.position.z = z; group.add(frame); const panel = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 2.8), new THREE.MeshBasicMaterial({ color: 0x2277aa, transparent: true, opacity: 0, side: THREE.DoubleSide })); panel.position.set(i % 2 ? -4.2 : 4.2, 0, z); panels.push(panel); group.add(panel) }
    const resize = () => { const w = host.clientWidth, h = host.clientHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix() }; resize(); addEventListener('resize', resize)
    let raf = 0; const draw = () => { renderer.render(scene, camera); raf = requestAnimationFrame(draw) }; draw()
    const duration = short ? 2.35 : 6.1
    const lines = group.children.filter((child): child is THREE.LineSegments => child instanceof THREE.LineSegments)
    const tl = gsap.timeline(); tl.to(host.querySelector('.boot-connect'), { autoAlpha: 1, duration: .45 }).to(lines.map(x => x.material), { opacity: .72, duration: short ? .7 : 1.8, stagger: .1 }, .3).to(panels.map(x => x.material), { opacity: .09, duration: .8, stagger: .08 }, .8).to(group.position, { z: 4, duration: short ? .65 : 1.5, ease: 'power2.in' }, short ? .8 : 2.2).to(host.querySelector('.boot-assemble'), { autoAlpha: 1, duration: .5 }, short ? 1.05 : 3).call(onReveal, [], short ? 1.25 : 4.2).to(host.querySelector('.boot-reveal'), { autoAlpha: 1, duration: .45 }, short ? 1.3 : 4.35).to({}, { duration: Math.max(0, duration - (short ? 1.75 : 4.8)) })
    return () => { tl.kill(); cancelAnimationFrame(raf); removeEventListener('resize', resize); renderer.dispose(); host.replaceChildren() }
  }, [active, short, onReveal])
  return <section ref={mount} className="boot-scene" aria-hidden="true"><div className="boot-connect">ELUCIDATOR<small>ESTABLISHING DISPLAY LINK</small></div><div className="boot-assemble">SYSTEM SYNCHRONISED</div><div className="boot-reveal">SYSTEM READY</div></section>
}
