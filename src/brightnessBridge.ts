export type BrightnessMonitor = {
  id: number
  name: string
  supported: boolean
  brightness: number | null
  error?: string
}
export type DisplayGeometry = { id: number; left: number; top: number; width: number; height: number; primary: boolean }

type MonitorResponse = { monitors: BrightnessMonitor[] }
type ChangeResponse = MonitorResponse & { ok: boolean; message: string }
type LockResponse = { ok: boolean; message: string }
export type HelperHealth = { state: 'online' | 'starting' | 'offline' | 'unsupported'; version?: string; capabilities?: string[]; message: string }
export type StartupConfiguration = {
  wallpaperName: string | null
  wallpaperType: string | null
  wallpaperData: string | null
  theme: string | null
  settings?: StartupSettings | null
  installIntoLively?: boolean
  wallpaperError?: string | null
}

export type StartupSettings = {
  enabledWidgets: number[]
  widgetPositions: Record<string, { x: number; y: number }>
  widgetScales: Partial<Record<number, number>>
  interfaceScale?: number
  widgetLayout: string
  layoutPresets: Record<string, unknown>
  wallpaperFit: string
  animationMirror: boolean
  sequenceMirror?: boolean
  visualTheme: string
  consoleFrame: { x: number; y: number; width: number; height: number; anchor?: string } | null
  widgetsCompact?: boolean
  compactRestore?: { widgetLayout: string; widgetPositions: Record<string, { x: number; y: number; width?: number }> } | null
  compactPanelPosition?: { x: number; y: number } | null
  compactWidgetOffsets?: Partial<Record<number, { x: number; y: number }>>
  compactThemeLayouts?: Record<string, { theme: string; slot: number; panelPosition: { x: number; y: number } | null; widgetOffsets: Partial<Record<number, { x: number; y: number }>> }>
}

const HELPER_URL = 'http://127.0.0.1:17384'
export const BRIGHTNESS_TOKEN_KEY = 'project-elucidator-brightness-token'
const STORAGE_DATABASE = 'project-elucidator-wallpaper'
const STORAGE_STORE = 'selection'
const BRIGHTNESS_TOKEN_BACKUP_KEY = 'brightness-token-backup'

export async function getBrightnessHelperHealth(): Promise<HelperHealth> {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), 2500)
  try {
    const response = await fetch(`${HELPER_URL}/health`, { cache: 'no-store', signal: controller.signal })
    if (!response.ok) return { state: 'offline', message: `WINDOWS HELPER HTTP ${response.status}` }
    const health = await response.json() as { available?: boolean; version?: unknown; capabilities?: unknown }
    if (!health.available) return { state: 'starting', message: 'WINDOWS HELPER IS STARTING OR RESTARTING' }
    const capabilities = Array.isArray(health.capabilities) ? health.capabilities.filter((item): item is string => typeof item === 'string') : []
    if (!capabilities.includes('startup-config')) return { state: 'unsupported', version: typeof health.version === 'string' ? health.version : undefined, capabilities, message: 'WINDOWS HELPER IS OUTDATED · RUN THE ELUCIDATOR HELPER REPAIR' }
    return { state: 'online', version: typeof health.version === 'string' ? health.version : undefined, capabilities, message: 'WINDOWS HELPER ONLINE' }
  } catch (error) {
    return { state: 'offline', message: error instanceof DOMException && error.name === 'AbortError' ? 'WINDOWS HELPER TIMED OUT' : 'WINDOWS HELPER IS NOT LISTENING ON 127.0.0.1:17384' }
  } finally {
    window.clearTimeout(timeout)
  }
}

export async function checkBrightnessHelperHealth() { return (await getBrightnessHelperHealth()).state === 'online' }


export function getBrightnessToken() {
  try { return localStorage.getItem(BRIGHTNESS_TOKEN_KEY) ?? '' } catch { return '' }
}

export function saveBrightnessToken(token: string | null) {
  try {
    if (token) localStorage.setItem(BRIGHTNESS_TOKEN_KEY, token)
    else localStorage.removeItem(BRIGHTNESS_TOKEN_KEY)
    return true
  } catch { return false }
}

function openTokenDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('IndexedDB is not available in this host'))
      return
    }
    const request = indexedDB.open(STORAGE_DATABASE, 1)
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORAGE_STORE)) request.result.createObjectStore(STORAGE_STORE)
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
    // The wallpaper database may still be completing its first open. Let the
    // request wait for that connection to close instead of failing token recovery.
  })
}

export async function readBrightnessTokenBackup() {
  const database = await openTokenDatabase()
  return new Promise<string>((resolve, reject) => {
    const request = database.transaction(STORAGE_STORE, 'readonly').objectStore(STORAGE_STORE).get(BRIGHTNESS_TOKEN_BACKUP_KEY)
    request.onsuccess = () => {
      database.close()
      const token = request.result
      resolve(typeof token === 'string' && /^[A-Za-z0-9_-]{40,60}$/.test(token) ? token : '')
    }
    request.onerror = () => {
      database.close()
      reject(request.error)
    }
  })
}

export async function writeBrightnessTokenBackup(token: string | null) {
  const database = await openTokenDatabase()
  return new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORAGE_STORE, 'readwrite')
    const store = transaction.objectStore(STORAGE_STORE)
    if (token) store.put(token, BRIGHTNESS_TOKEN_BACKUP_KEY)
    else store.delete(BRIGHTNESS_TOKEN_BACKUP_KEY)
    transaction.oncomplete = () => {
      database.close()
      resolve()
    }
    transaction.onerror = () => {
      database.close()
      reject(transaction.error)
    }
    transaction.onabort = () => {
      database.close()
      reject(transaction.error)
    }
  })
}

async function request<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${HELPER_URL}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
        ...init?.headers,
      },
      cache: 'no-store',
    })
  } catch {
    throw new Error((await getBrightnessHelperHealth()).message)
  }

  const result = await response.json() as T & { message?: string }
  if (!response.ok) {
    const health = response.status === 404 ? await getBrightnessHelperHealth() : null
    throw new Error(health?.state === 'unsupported' ? health.message : result.message ?? `BRIGHTNESS HELPER ERROR · HTTP ${response.status}`)
  }
  return result
}

export async function readBrightnessMonitors(token: string) {
  return request<MonitorResponse>('/api/monitors', token)
}

export async function readDisplayGeometry(token: string) {
  return request<{ displays: DisplayGeometry[] }>('/api/displays', token)
}

export async function changeBrightness(token: string, brightness: number, monitorId: number | null) {
  return request<ChangeResponse>('/api/brightness', token, {
    method: 'POST',
    body: JSON.stringify({ brightness, monitorId }),
  })
}

export async function lockWindowsSession(token: string) {
  return request<LockResponse>('/api/lock', token, {
    method: 'POST',
    body: '{}',
  })
}

export async function readDurableStartupConfiguration() {
  let response: Response
  try { response = await fetch(`${HELPER_URL}/api/startup-config`, { cache: 'no-store' }) }
  catch { throw new Error((await getBrightnessHelperHealth()).message) }
  if (!response.ok) {
    const health = response.status === 404 ? await getBrightnessHelperHealth() : null
    throw new Error(health?.state === 'unsupported' ? health.message : `WINDOWS CONFIGURATION HELPER ERROR · HTTP ${response.status}`)
  }
  const result = await response.json() as { available?: boolean; configuration?: StartupConfiguration }
  return result.available ? result.configuration ?? null : null
}

export async function readWallpaperStartupManifest(): Promise<(StartupConfiguration & { wallpaperBlob?: Blob }) | null> {
  const response = await fetch(new URL('./elucidator-startup.json', window.location.href), { cache: 'no-store' })
  if (!response.ok || !response.headers.get('content-type')?.includes('json')) return null
  const manifest = await response.json() as StartupConfiguration & { wallpaperFile?: string; wallpaperHash?: string }
  if (!manifest.wallpaperFile || !/^elucidator-wallpaper-[a-f0-9]{64}\.(jpg|png|webp|gif|bmp|img)$/.test(manifest.wallpaperFile)) return manifest
  const imageResponse = await fetch(new URL(manifest.wallpaperFile, window.location.href), { cache: 'no-store' })
  if (!imageResponse.ok) throw new Error(`INSTALLED STARTUP IMAGE COULD NOT BE READ · HTTP ${imageResponse.status}`)
  const blob = await imageResponse.blob()
  if (globalThis.crypto?.subtle && manifest.wallpaperHash) {
    const digest = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer())
    const hash = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
    if (hash !== manifest.wallpaperHash) throw new Error('INSTALLED STARTUP IMAGE FAILED ITS INTEGRITY CHECK')
  }
  return { ...manifest, wallpaperBlob: blob }
}

export async function readPrivateCredentialBootstrap() {
  const response = await fetch(new URL('./elucidator-private-bootstrap.json', window.location.href), { cache: 'no-store' })
  if (response.status === 404) return ''
  if (!response.ok) throw new Error(`PRIVATE CREDENTIAL BOOTSTRAP READ FAILED · HTTP ${response.status}`)
  const contentType = response.headers.get('content-type') ?? ''
  if (!contentType.includes('json')) return ''
  const value = await response.json() as { token?: unknown }
  return typeof value.token === 'string' && /^[A-Za-z0-9_-]{40,60}$/.test(value.token) ? value.token : ''
}

export async function persistPrivateCredentialBootstrap(token: string) {
  return request<{ ok: boolean; saved: boolean }>('/api/credential-bootstrap', token, {
    method: 'POST',
    body: '{}',
  })
}

export async function removePrivateCredentialBootstrap(token: string) {
  return request<{ ok: boolean; removed: boolean }>('/api/credential-bootstrap', token, { method: 'DELETE' })
}

export async function saveDurableStartupConfiguration(token: string, configuration: Partial<StartupConfiguration>) {
  return request<{ ok: boolean; saved: boolean; installedProjectUpdated?: boolean; reloadRequested?: boolean; reloadMessage?: string; message: string }>('/api/startup-config', token, {
    method: 'POST',
    body: JSON.stringify(configuration),
  })
}
