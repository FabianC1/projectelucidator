export type BrightnessMonitor = {
  id: number
  name: string
  supported: boolean
  brightness: number | null
  error?: string
}

type MonitorResponse = { monitors: BrightnessMonitor[] }
type ChangeResponse = MonitorResponse & { ok: boolean; message: string }

const HELPER_URL = 'http://127.0.0.1:17384'
export const BRIGHTNESS_TOKEN_KEY = 'project-elucidator-brightness-token'

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
    throw new Error('BRIGHTNESS HELPER OFFLINE · INSTALL OR START THE WINDOWS HELPER')
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
