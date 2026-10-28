import { mkdir } from 'node:fs/promises'
import { chromium } from 'playwright'

const baseURL = process.env.ELUCIDATOR_CAPTURE_URL ?? 'http://127.0.0.1:5173'
const output = 'artifacts/boot-captures'
const stages = [
  ['01-connect', 0.35],
  ['02-compile', 2.15],
  ['03-assemble', 4.85],
  ['04-reveal', 6.4],
]

await mkdir(output, { recursive: true })
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 })

try {
  await page.goto(baseURL, { waitUntil: 'networkidle' })
  const input = page.locator('.command-line input')
  await input.waitFor({ state: 'visible', timeout: 15_000 })
  await input.fill('sys test')
  await input.press('Enter')
  await page.waitForFunction(() => Boolean(window.__elucidatorBootTimeline), undefined, { timeout: 10_000 })

  for (const [name, time] of stages) {
    await page.evaluate((seekTime) => {
      const timeline = window.__elucidatorBootTimeline
      timeline?.pause().seek(seekTime)
    }, time)
    await page.waitForTimeout(180)
    await page.screenshot({ path: `${output}/${name}.png` })
  }

  console.log(`Captured ${stages.length} boot stages in ${output}`)
} finally {
  await browser.close()
}
