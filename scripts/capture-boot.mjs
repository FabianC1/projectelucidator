import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { chromium } from 'playwright'

const baseURL = process.env.ELUCIDATOR_CAPTURE_URL ?? 'http://127.0.0.1:5173'
const output = 'artifacts/boot-captures'
const referencePath = 'design-references/Boot_Sequence/Boot_Storyboard_4_Stages.png'
const standbyCaptureLabel = (process.env.ELUCIDATOR_CAPTURE_LABEL ?? 'standby-direct').replace(/[^a-z0-9_-]/gi, '-')
const viewportMatch = (process.env.ELUCIDATOR_CAPTURE_VIEWPORT ?? '1920x1080').match(/^(\d+)x(\d+)$/i)
if (!viewportMatch) throw new Error('ELUCIDATOR_CAPTURE_VIEWPORT must use WIDTHxHEIGHT, for example 3840x1080')
const captureViewport = { width: Number(viewportMatch[1]), height: Number(viewportMatch[2]) }
const stages = [['01-connect', .35, 0], ['02-compile', 2.15, 1], ['03-assemble', 4.85, 2], ['04-reveal', 6.4, 3]]
const issues = []
const mode = process.argv.find(argument => argument.startsWith('--mode='))?.slice(7) ?? 'all'
const includes = (name) => mode === 'all' || mode === name

await mkdir(output, { recursive: true })
const browser = await chromium.launch({ headless: true })

function attachDiagnostics(page, label) {
  page.on('console', message => { if (['error', 'warning'].includes(message.type())) issues.push({ label, type: `console:${message.type()}`, text: message.text() }) })
  page.on('pageerror', error => issues.push({ label, type: 'pageerror', text: error.message }))
}

async function command(page, value) {
  const input = page.locator('.command-line input')
  await input.waitFor({ state: 'visible', timeout: 15_000 })
  await input.fill(value)
  await input.press('Enter')
}

async function beginBoot(page) {
  console.log('  opening preview')
  await page.goto(baseURL, { waitUntil: 'networkidle' })
  console.log('  opening replay')
  await command(page, 'sys test')
  console.log('  awaiting boot timeline')
  await page.waitForFunction(() => Boolean(window.__elucidatorBootTimeline), undefined, { timeout: 10_000 })
  console.log('  boot timeline ready')
}

async function webglHealth(page) {
  return page.evaluate(() => [...document.querySelectorAll('canvas')].map((canvas) => {
    const context = canvas.getContext('webgl2') || canvas.getContext('webgl')
    return { width: canvas.width, height: canvas.height, contextLost: context?.isContextLost?.() ?? false, error: context?.getError?.() ?? null }
  }))
}

async function compareToStoryboard(page, screenshotPath, stage) {
  const [actual, reference] = await Promise.all([readFile(screenshotPath), readFile(referencePath)])
  return page.evaluate(async ({ actualBytes, referenceBytes, stageIndex }) => {
    const load = (bytes) => new Promise((resolveImage, reject) => { const image = new Image(); image.onload = () => resolveImage(image); image.onerror = reject; image.src = `data:image/png;base64,${bytes}` })
    const [actualImage, referenceImage] = await Promise.all([load(actualBytes), load(referenceBytes)])
    const width = 160; const height = 90; const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height
    const context = canvas.getContext('2d', { willReadFrequently: true }); const referenceX = (stageIndex % 2) * referenceImage.width / 2; const referenceY = Math.floor(stageIndex / 2) * referenceImage.height / 2
    context.drawImage(referenceImage, referenceX, referenceY, referenceImage.width / 2, referenceImage.height / 2, 0, 0, width, height)
    const referencePixels = context.getImageData(0, 0, width, height).data; context.clearRect(0, 0, width, height); context.drawImage(actualImage, 0, 0, width, height)
    const actualPixels = context.getImageData(0, 0, width, height).data; let total = 0
    for (let index = 0; index < actualPixels.length; index += 4) total += Math.abs(actualPixels[index] - referencePixels[index]) + Math.abs(actualPixels[index + 1] - referencePixels[index + 1]) + Math.abs(actualPixels[index + 2] - referencePixels[index + 2])
    return { stage: stageIndex + 1, sampleSize: `${width}x${height}`, meanAbsoluteRgbDifference: Number((total / (width * height * 3)).toFixed(2)), actual: `${actualImage.width}x${actualImage.height}`, reference: `${referenceImage.width}x${referenceImage.height}` }
  }, { actualBytes: actual.toString('base64'), referenceBytes: reference.toString('base64'), stageIndex: stage })
}

const report = { baseURL, viewport: `${captureViewport.width}x${captureViewport.height}`, reference: resolve(referencePath), comparisons: [], webgl: [], mirror: null, standbyInput: null, issues }

try {
  if (includes('playback')) {
    console.log('Visual check: recording real boot playback…')
    const playbackContext = await browser.newContext({ viewport: captureViewport, deviceScaleFactor: 1, recordVideo: { dir: `${output}/recordings`, size: captureViewport } })
    const playback = await playbackContext.newPage(); attachDiagnostics(playback, 'real-playback'); await beginBoot(playback); await playback.waitForTimeout(7_500); await playback.screenshot({ path: `${output}/playback-complete.png` }); report.webgl.push({ label: 'real-playback', state: await webglHealth(playback) }); await playbackContext.close()
  }

  if (includes('keyframes')) {
    console.log('Visual check: capturing storyboard keyframes…')
    const stageContext = await browser.newContext({ viewport: captureViewport, deviceScaleFactor: 1 })
    const stagePage = await stageContext.newPage(); attachDiagnostics(stagePage, 'keyframes'); await beginBoot(stagePage)
    for (const [name, time, referenceStage] of stages) { console.log(`  capturing ${name}`); await stagePage.evaluate((seekTime) => { window.__elucidatorBootTimeline?.pause().seek(seekTime); return true }, time); await stagePage.waitForTimeout(180); const screenshot = `${output}/${name}.png`; await stagePage.screenshot({ path: screenshot, timeout: 10_000 }); report.comparisons.push(await compareToStoryboard(stagePage, screenshot, referenceStage)); console.log(`  compared ${name}`) }
    report.webgl.push({ label: 'keyframes', state: await webglHealth(stagePage) }); await stageContext.close()
  }

  if (includes('standby')) {
    console.log('Visual check: observing direct standby persistence…')
    const standbyContext = await browser.newContext({ viewport: captureViewport, deviceScaleFactor: 1 })
    const standby = await standbyContext.newPage(); attachDiagnostics(standby, 'direct-standby'); await standby.goto(baseURL, { waitUntil: 'networkidle' }); await command(standby, 'sys standby'); await standby.locator('.boot-scene.is-standby').waitFor({ state: 'visible', timeout: 10_000 })
    for (const seconds of [0, 10, 30]) { if (seconds) await standby.waitForTimeout(seconds === 10 ? 10_000 : 20_000); await standby.screenshot({ path: `${output}/${standbyCaptureLabel}-${String(seconds).padStart(2, '0')}s.png` }) }
    report.webgl.push({ label: 'direct-standby', state: await webglHealth(standby) }); await standby.mouse.move(captureViewport.width / 2, captureViewport.height / 2); await standby.waitForTimeout(180); const survivesMouseMove = await standby.locator('.boot-scene.is-standby').count() === 1; await standby.keyboard.down('Meta'); await standby.keyboard.down('Shift'); await standby.keyboard.press('S'); await standby.keyboard.up('Shift'); await standby.keyboard.up('Meta'); await standby.waitForTimeout(180); const survivesScreenshotShortcut = await standby.locator('.boot-scene.is-standby').count() === 1; await standby.keyboard.press('Space'); await standby.waitForFunction(() => !document.querySelector('.boot-scene.is-standby'), undefined, { timeout: 5_000 }); report.standbyInput = { survivesMouseMove, survivesScreenshotShortcut, dismissedByKeyboard: true, dismissedByClick: true }; await standbyContext.close()
    const clickContext = await browser.newContext({ viewport: captureViewport, deviceScaleFactor: 1 }); const clickPage = await clickContext.newPage(); attachDiagnostics(clickPage, 'standby-click'); await clickPage.goto(baseURL, { waitUntil: 'networkidle' }); await command(clickPage, 'sys standby'); await clickPage.locator('.boot-scene.is-standby').waitFor({ state: 'visible', timeout: 10_000 }); await clickPage.mouse.click(captureViewport.width / 2, captureViewport.height / 2); await clickPage.waitForFunction(() => !document.querySelector('.boot-scene.is-standby'), undefined, { timeout: 5_000 }); report.standbyInput = { survivesMouseMove, dismissedByKeyboard: true, dismissedByClick: true }; await clickContext.close()
  }

  if (includes('mirror')) {
    console.log('Visual check: running sequence-mirror smoke test…')
    const mirrorContext = await browser.newContext({ viewport: captureViewport, deviceScaleFactor: 1 })
    const mirror = await mirrorContext.newPage(); attachDiagnostics(mirror, 'mirror-smoke'); await mirror.goto(baseURL, { waitUntil: 'networkidle' }); await command(mirror, 'sys sequence mirror on'); await mirror.waitForTimeout(350)
    report.mirror = await mirror.evaluate(() => ({ enabled: localStorage.getItem('project-elucidator-sequence-mirror'), bootInstances: document.querySelectorAll('.boot-scene').length, sceneBounds: [...document.querySelectorAll('.boot-scene')].map(node => node.getBoundingClientRect().toJSON()) }))
    await mirror.reload({ waitUntil: 'networkidle' }); await mirror.waitForTimeout(350); report.mirror.persistedAfterReload = await mirror.evaluate(() => localStorage.getItem('project-elucidator-sequence-mirror'))
    await command(mirror, 'sys sequence mirror off'); await mirrorContext.close()
  }

  await writeFile(`${output}/visual-report${mode === 'all' ? '' : `-${mode}`}.json`, JSON.stringify(report, null, 2))
  console.log(`Captured keyframes, real playback video, persistent standby, mirror smoke data, and ${report.comparisons.length} storyboard metrics in ${output}`)
} finally { await browser.close() }
