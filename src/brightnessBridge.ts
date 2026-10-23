export type BrightnessMonitor = {
  id: number
  name: string
  supported: boolean
  brightness: number | null
  error?: string
}

type MonitorResponse = { monitors: BrightnessMonitor[] }
type ChangeResponse = MonitorResponse & { ok: boolean; message: string }
type LockResponse = { ok: boolean; message: string }

const HELPER_URL = 'http://127.0.0.1:17384'
export const BRIGHTNESS_TOKEN_KEY = 'project-elucidator-brightness-token'
const STORAGE_DATABASE = 'project-elucidator-wallpaper'
const STORAGE_STORE = 'selection'
const BRIGHTNESS_TOKEN_BACKUP_KEY = 'brightness-token-backup'

export async function checkBrightnessHelperHealth() {
  try {
    const response = await fetch(`${HELPER_URL}/health`, { cache: 'no-store' })
    if (!response.ok) return false
    const health = await response.json() as { available?: boolean }
    return health.available === true
  } catch {
    return false
  }
}


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
    throw new Error('WINDOWS HELPER OFFLINE · INSTALL OR START THE ELUCIDATOR HELPER')
  }

  const result = await response.json() as T & { message?: string }
  if (!response.ok) throw new Error(result.message ?? `BRIGHTNESS HELPER ERROR · HTTP ${response.status}`)
  return result
}

export async function readBrightnessMonitors(token: string) {
  return request<MonitorResponse>('/api/monitors', token)
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
