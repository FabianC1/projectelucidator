import { mkdir, writeFile } from 'node:fs/promises'

const endpoint = 'http://127.0.0.1:9222'
const pages = await fetch(`${endpoint}/json/list`).then((response) => response.json())
const page = pages.find((entry) => entry.type === 'page' && entry.url.includes('127.0.0.1:5174'))
if (!page) throw new Error('Theme review page is unavailable.')
const socket = new WebSocket(page.webSocketDebuggerUrl)
await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }) })
let sequence = 0
const pending = new Map()
socket.addEventListener('message', (event) => { const message = JSON.parse(event.data); if (!message.id || !pending.has(message.id)) return; const item = pending.get(message.id); pending.delete(message.id); message.error ? item.reject(new Error(message.error.message)) : item.resolve(message.result) })
const send = (method, params = {}) => { const id = ++sequence; socket.send(JSON.stringify({ id, method, params })); return new Promise((resolve, reject) => pending.set(id, { resolve, reject })) }
const evaluate = (expression) => send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const positions = { 1: { x: 3, y: 5 }, 2: { x: 3, y: 37 }, 3: { x: 50, y: 5 }, 4: { x: 3, y: 61 }, 5: { x: 50, y: 43 } }

await send('Page.enable'); await send('Runtime.enable'); await send('Emulation.setDeviceMetricsOverride', { width: 1400, height: 820, deviceScaleFactor: 1, mobile: false }); await mkdir('artifacts/theme-review', { recursive: true })
const reviewThemes = process.env.THEME ? [process.env.THEME] : ['arise', 'grimoire', 'demon-mode', 'breathing-sun', 'limitless', 'tokyo-ghoul', 'dragon']
for (const theme of reviewThemes) {
  await evaluate(`(() => { const compact=${process.env.COMPACT === '1'}; localStorage.setItem('project-elucidator-theme', '${theme}'); localStorage.setItem('project-elucidator-widgets', JSON.stringify({version:2,enabled:[1,2,3,4,5]})); localStorage.setItem('project-elucidator-widget-layout', compact ? 'free' : 'right'); localStorage.setItem('project-elucidator-widget-positions', compact ? '${JSON.stringify(positions)}' : '{}'); localStorage.setItem('project-elucidator-widget-compact', JSON.stringify({enabled:false,restore:null,panelPosition:null})); localStorage.setItem('project-elucidator-interface-scale', '1'); localStorage.setItem('project-elucidator-widget-scales', '{}'); return true })()`)
  await send('Page.reload', { ignoreCache: true }); await wait(2600)
  await evaluate(`(() => { const input=document.querySelector('.command-line input'); const form=input?.closest('form'); if (!input || !form) return false; const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')?.set; setter?.call(input,'sys theme activate ${theme === 'demon-mode' ? 'demon mode' : theme === 'breathing-sun' ? 'hinokami kagura' : theme === 'tokyo-ghoul' ? 'kagune' : theme === 'dragon' ? 'httyd' : theme}'); input.dispatchEvent(new Event('input',{bubbles:true})); form.requestSubmit(); return true })()`)
  await wait(1350)
  if (theme === 'grimoire' || theme === 'demon-mode') await wait(1000)
  await evaluate(`window.livelySystemInformation?.(${JSON.stringify({ NameCpu: 'AMD Ryzen', CurrentCpu: 12, NameGpu: 'NVIDIA GeForce', CurrentGpu3D: 8, NameNetCard: 'Ethernet', CurrentNetDown: 13002342, CurrentNetUp: 2202010, TotalRam: 16384, CurrentRamAvail: 5898 })})`)
  await evaluate(`window.livelyCurrentTrack?.(${JSON.stringify({ Title: 'Test Drive', Artist: 'John Powell', AlbumTitle: 'How to Train Your Dragon', Thumbnail: '', PlaybackType: 'Music' })})`)
  await wait(350)
  if (process.env.COMPACT === '1') {
    await evaluate(`(() => { const input=document.querySelector('.command-line input'); const form=input?.closest('form'); if (!input || !form) return false; const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')?.set; setter?.call(input,'sys compact on'); input.dispatchEvent(new Event('input',{bubbles:true})); form.requestSubmit(); return true })()`)
    await wait(500)
  }
  await evaluate(`(() => { const console=document.querySelector('.command-console'); if (console) console.style.display='none'; return true })()`)
  const screenshot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
  await writeFile(`artifacts/theme-review/${theme}-${process.env.COMPACT === '1' ? 'compact' : 'widgets'}.png`, Buffer.from(screenshot.data, 'base64'))
}
socket.close()
