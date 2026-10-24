import { mkdir, writeFile } from 'node:fs/promises'

const endpoint = process.env.SAO_CDP_ENDPOINT ?? 'http://127.0.0.1:9223'
const pages = await fetch(`${endpoint}/json/list`).then((response) => response.json())
const page = pages.find((entry) => entry.type === 'page' && entry.url.includes('127.0.0.1:5173'))
if (!page) throw new Error('The SAO review page is not available over CDP.')

const socket = new WebSocket(page.webSocketDebuggerUrl)
await new Promise((resolve, reject) => {
  socket.addEventListener('open', resolve, { once: true })
  socket.addEventListener('error', reject, { once: true })
})

let sequence = 0
const pending = new Map()
socket.addEventListener('message', (event) => {
  const message = JSON.parse(event.data)
  if (!message.id || !pending.has(message.id)) return
  const { resolve, reject } = pending.get(message.id)
  pending.delete(message.id)
  if (message.error) reject(new Error(message.error.message))
  else resolve(message.result)
})

function send(method, params = {}) {
  const id = ++sequence
  socket.send(JSON.stringify({ id, method, params }))
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }))
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const evaluate = (expression) => send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
const positions = { 1: { x: 3, y: 5 }, 2: { x: 3, y: 38 }, 3: { x: 50, y: 5 }, 4: { x: 3, y: 61 }, 5: { x: 50, y: 44 } }

await send('Page.enable')
await send('Runtime.enable')
await send('Emulation.setDeviceMetricsOverride', { width: 1400, height: 820, deviceScaleFactor: 1, mobile: false })
await evaluate(`(() => {
  localStorage.setItem('project-elucidator-theme', 'sao');
  localStorage.removeItem('project-elucidator-default-theme');
  localStorage.setItem('project-elucidator-widgets', JSON.stringify({version:2, enabled:[1,2,3,4,5]}));
  localStorage.setItem('project-elucidator-widget-layout', 'free');
  localStorage.setItem('project-elucidator-widget-positions', '${JSON.stringify(positions)}');
  localStorage.setItem('project-elucidator-interface-scale', '1');
  localStorage.setItem('project-elucidator-widget-scales', '{}');
  return true;
})()`)
await send('Page.reload', { ignoreCache: true })
await wait(6500)
await evaluate(`(() => {
  for (const selector of ['.command-console', '.boot-sequence']) {
    const panel = document.querySelector(selector);
    if (panel) panel.style.display = 'none';
  }
  return document.querySelector('.wallpaper-experience')?.className;
})()`)

await mkdir('artifacts/widget-review', { recursive: true })
const unavailable = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
await writeFile('artifacts/widget-review/sao-link-start-unavailable.png', Buffer.from(unavailable.data, 'base64'))

for (const [cpu, gpu, available] of [[12, 8, 5898], [18, 11, 5652], [15, 9, 5770], [22, 14, 5480], [12, 8, 5898]]) {
  await evaluate(`window.livelySystemInformation?.(${JSON.stringify({ NameCpu: 'AMD Ryzen', CurrentCpu: cpu, NameGpu: 'NVIDIA GeForce', CurrentGpu3D: gpu, NameNetCard: 'Ethernet', CurrentNetDown: 13002342, CurrentNetUp: 2202010, TotalRam: 16384, CurrentRamAvail: available })})`)
  await wait(1050)
}
await evaluate(`window.livelyCurrentTrack?.(${JSON.stringify({ Title: 'Test Drive', Artist: 'John Powell', AlbumTitle: 'How to Train Your Dragon', Thumbnail: '', PlaybackType: 'Music' })})`)
await wait(800)
const populated = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
await writeFile('artifacts/widget-review/sao-link-start-populated.png', Buffer.from(populated.data, 'base64'))
socket.close()
