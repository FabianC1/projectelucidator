import { useCallback, useEffect, useRef, useState, type ChangeEvent, type CSSProperties, type FormEvent, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react'
import { siGooglechrome, siNetflix, siRoblox, type SimpleIcon } from 'simple-icons'
import { BootSequence } from './BootSequence'
import { parseLivelySystemInfo, type LivelySystemInfo } from './livelySystemInfo'
import { changeBrightness, checkBrightnessHelperHealth, getBrightnessHelperHealth, getBrightnessToken, lockWindowsSession, persistPrivateCredentialBootstrap, readBrightnessMonitors, readDisplayGeometry, readBrightnessTokenBackup, readDurableStartupConfiguration, readPrivateCredentialBootstrap, readWallpaperStartupManifest, removePrivateCredentialBootstrap, saveBrightnessToken, saveDurableStartupConfiguration, validateBrightnessToken, writeBrightnessTokenBackup, type BrightnessMonitor, type StartupConfiguration } from './brightnessBridge'
import { resolveThemeId, STEALTH_PRESENTATION, THEME_SYSTEMS, type ThemeId, type ThemeActivationPresentation } from './themeSystems'
import './App.css'

declare global {
  interface Window {
    livelySystemInformation?: (data: unknown) => void
    livelyCurrentTrack?: (data: unknown) => void
    // Set only by the Lively host integration when this instance owns the
    // complete virtual desktop. A browser tab must never infer this from the
    // number of connected Windows displays.
    elucidatorLivelySpanViewport?: { width: number; height: number }
  }
}

type SavedWallpaper = { blob: Blob; name: string }

function blobToBase64(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result
      if (typeof result !== 'string') { reject(new Error('Wallpaper bytes could not be encoded')); return }
      resolve(result.slice(result.indexOf(',') + 1))
    }
    reader.onerror = () => reject(reader.error ?? new Error('Wallpaper bytes could not be read'))
    reader.readAsDataURL(blob)
  })
}

function startupWallpaperFromConfig(configuration: StartupConfiguration): SavedWallpaper | null {
  if (!configuration.wallpaperData || !configuration.wallpaperName) return null
  const binary = atob(configuration.wallpaperData)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
  return { blob: new Blob([bytes], { type: configuration.wallpaperType || 'application/octet-stream' }), name: configuration.wallpaperName }
}
type SystemMode = 'NORMAL' | 'STEALTH' | 'COMBAT' | 'IDLE' | 'DIAGNOSTIC'
type VisualTheme = 'off' | 'haze' | 'rain' | 'lightning' | 'particles' | 'vignette'
type WallpaperFit = 'cover' | 'contain' | 'stretch' | 'span'
type SpecialEffect = { kind: string; id: number }
type WidgetPosition = { x: number; y: number; width?: number }
type WidgetPositions = Record<number, WidgetPosition>
type WidgetLayout = 'free' | 'left' | 'right' | 'top' | 'bottom'
type CompactRestore = { widgetLayout: WidgetLayout; widgetPositions: WidgetPositions }
type CompactPanelPosition = { x: number; y: number }
type CompactWidgetOffsets = Partial<Record<number, { x: number; y: number }>>
type CompactThemeLayout = { theme: ThemeId; slot: number; panelPosition: CompactPanelPosition | null; widgetOffsets: CompactWidgetOffsets }
type ConsoleFrame = { x: number; y: number; width: number; height: number; anchor?: 'top' | 'bottom' }
type LayoutSnapshot = { consoleFrame: ConsoleFrame | null; widgetPositions: WidgetPositions; widgetLayout?: WidgetLayout }
type LegacyBootMessage = { text: string; result: string; start: number; end: number }
type LegacyBootTimeline = { phases: Array<{ id: string; title: string; start: number; messages: LegacyBootMessage[] }>; duration: number }
type HardwareFeedStatus = 'waiting' | 'live' | 'browser' | 'stale' | 'invalid'
type HardwareFeed = { status: HardwareFeedStatus; readings: LivelySystemInfo | null; updatedAt: number | null }
type NowPlayingTrack = { title: string; artist: string; album: string; artwork: string | null; playbackType: string }
type NowPlayingStatus = 'waiting' | 'browser' | 'none' | 'track' | 'sample' | 'invalid'
type SequenceViewport = { left: number; top: number; width: number; height: number }
type QuickShortcut = { id: string; label: string; icon: string | SimpleIcon; target: string }

const SAMPLE_HARDWARE_READINGS: LivelySystemInfo = {
  cpuName: 'Sample CPU', cpuPercent: 32,
  gpuName: 'Sample GPU', gpu3dPercent: 18,
  networkName: 'Sample network', networkDownBytesPerSecond: 2.4 * 1024 * 1024, networkUpBytesPerSecond: .6 * 1024 * 1024,
  ramTotalMb: 16 * 1024, ramAvailableMb: 5.8 * 1024,
}
const SAMPLE_NOW_PLAYING: NowPlayingTrack = { title: 'Test Drive', artist: 'John Powell', album: 'Preview track', artwork: null, playbackType: 'Music' }

const WIDGET_IDS = [1, 2, 3, 4, 5] as const
const QUICK_SHORTCUTS: QuickShortcut[] = [
  { id: 'warframe', label: 'Warframe', icon: '◈', target: 'warframe' },
  { id: 'vscode', label: 'VS Code', icon: '⌘', target: 'vscode' },
  { id: 'chrome', label: 'Chrome', icon: siGooglechrome, target: 'chrome' },
  { id: 'roblox', label: 'Roblox', icon: siRoblox, target: 'roblox' },
  { id: 'netflix', label: 'Netflix', icon: siNetflix, target: 'netflix' },
  { id: 'alecaframe', label: 'AlecaFrame', icon: 'A', target: 'alecaframe' },
]
const SUN_BREATHING_KATANA = './assets/swords/sun-breathing-katana.png'
const HINOKAMI_FIREBLADE = './assets/swords/hinokami-fireblade.png'
const WIDGET_SCALES = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2] as const
type WidgetScale = (typeof WIDGET_SCALES)[number]
type WidgetScales = Partial<Record<number, WidgetScale>>
const WIDGET_TITLES: Record<number, string> = {
  1: 'HARDWARE',
  2: 'LOCAL TIME',
  3: 'QUICK LAUNCH',
  4: 'NOW PLAYING',
  5: 'SYSTEM CONTROL',
}
const THEME_STATUS: Record<ThemeId, { title: string; state: string; metric: string; value: string }> = {
  sao: { title: 'AINCRAD SYSTEM', state: 'SYSTEM LINK STABLE', metric: 'LINK STATE', value: 'NOMINAL' },
  arise: { title: 'SHADOW MONARCH', state: 'SHADOW AUTHORITY ONLINE', metric: 'MONARCH SYNC', value: 'ACTIVE' },
  grimoire: { title: 'FIVE-LEAF GRIMOIRE', state: 'MAGIC SIGNATURE RESONANT', metric: 'GRIMOIRE SYNC', value: 'RESONANT' },
  limitless: { title: 'LIMITLESS', state: 'INFINITY FIELD ACTIVE', metric: 'CURSED TECHNIQUE', value: 'INFINITY' },
  'breathing-sun': { title: 'HINOKAMI KAGURA', state: 'SUN BREATHING IGNITED', metric: 'BLADE STATE', value: 'READY' },
  'demon-mode': { title: 'DRAGON SIN', state: 'DEMON POWER RELEASED', metric: 'MAGIC POWER', value: 'UNRESTRICTED' },
  dragon: { title: 'NIGHT FURY', state: 'PLASMA CORE CHARGING', metric: 'PLASMA CORE', value: 'CHARGING' },
  'tokyo-ghoul': { title: 'ONE-EYED KING', state: 'RC SIGNATURE DETECTED', metric: 'GHOUL FACTOR', value: 'ACTIVE' },
}

function parseNowPlaying(data: unknown): NowPlayingTrack | null | undefined {
  let value = data
  if (typeof value === 'string') {
    try { value = JSON.parse(value) as unknown } catch { return undefined }
  }
  if (value === null) return null
  if (!value || typeof value !== 'object') return undefined
  const record = value as Record<string, unknown>
  const title = typeof record.Title === 'string' ? record.Title.trim() : ''
  const artist = typeof record.Artist === 'string' ? record.Artist.trim() : ''
  const album = typeof record.AlbumTitle === 'string' ? record.AlbumTitle.trim() : ''
  const artworkData = typeof record.Thumbnail === 'string' ? record.Thumbnail.trim() : ''
  const artwork = artworkData
    ? artworkData.startsWith('data:') ? artworkData : `data:image/png;base64,${artworkData}`
    : null
  return {
    title: title || 'UNTITLED TRACK',
    artist: artist || 'UNKNOWN ARTIST',
    album: album || 'ALBUM UNAVAILABLE',
    artwork,
    playbackType: typeof record.PlaybackType === 'string' ? record.PlaybackType : 'MEDIA',
  }
}

const DATABASE = 'project-elucidator-wallpaper'
const STORE = 'selection'
const KEY = 'active'
const DEFAULT_WALLPAPER_KEY = 'default'
const DEFAULT_WALLPAPER_VERSION_KEY = 'default-version'
const DEFAULT_WALLPAPER_VERSION = 'moonlit-alpine-mirror-lake-v1'
const DEFAULT_WALLPAPER_URL = 'Moonlit%20Alpine%20Mirror%20Lake.png'
const DEFAULT_WALLPAPER_NAME = 'Moonlit Alpine Mirror Lake.png'
const WIDGET_PREF_KEY = 'project-elucidator-widgets'
const WIDGET_POSITION_KEY = 'project-elucidator-widget-positions'
const WIDGET_SCALE_KEY = 'project-elucidator-widget-scales'
const INTERFACE_SCALE_KEY = 'project-elucidator-interface-scale'
const QUICK_SHORTCUTS_KEY = 'project-elucidator-quick-shortcuts'
const WIDGET_LAYOUT_KEY = 'project-elucidator-widget-layout'
const WIDGET_COMPACT_KEY = 'project-elucidator-widget-compact'
const CONSOLE_FRAME_KEY = 'project-elucidator-console-frame'
const LAYOUT_PRESETS_KEY = 'project-elucidator-layout-presets'
const THEME_PREF_KEY = 'project-elucidator-theme'
const DEFAULT_THEME_PREF_KEY = 'project-elucidator-default-theme'
const VISUAL_THEME_PREF_KEY = 'project-elucidator-visual-theme'
const WALLPAPER_FIT_PREF_KEY = 'project-elucidator-wallpaper-fit'
const ANIMATION_MIRROR_KEY = 'project-elucidator-animation-mirror'
const SEQUENCE_MIRROR_KEY = 'project-elucidator-sequence-mirror'
const STORAGE_PREF_KEYS = [WIDGET_PREF_KEY, WIDGET_POSITION_KEY, WIDGET_SCALE_KEY, INTERFACE_SCALE_KEY, WIDGET_LAYOUT_KEY, WIDGET_COMPACT_KEY, CONSOLE_FRAME_KEY, LAYOUT_PRESETS_KEY, THEME_PREF_KEY, DEFAULT_THEME_PREF_KEY, VISUAL_THEME_PREF_KEY, WALLPAPER_FIT_PREF_KEY, ANIMATION_MIRROR_KEY, SEQUENCE_MIRROR_KEY] as const
const WALLPAPER_FITS: WallpaperFit[] = ['cover', 'contain', 'stretch', 'span']
const VISUAL_THEMES: VisualTheme[] = ['off', 'haze', 'rain', 'lightning', 'particles', 'vignette']
const THEME_IDS = THEME_SYSTEMS.map((system) => system.id)
const THEME_CHOICES = THEME_SYSTEMS
const SYSTEM_VERSION = '1.0.0'

function openWallpaperDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('IndexedDB is not available in this host'))
      return
    }
    const request = indexedDB.open(DATABASE, 1)
    request.onupgradeneeded = () => request.result.createObjectStore(STORE)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
    request.onblocked = () => reject(new Error('IndexedDB open was blocked by another connection'))
  })
}

function describeStorageError(error: unknown) {
  if (error instanceof DOMException || error instanceof Error) return `${error.name}: ${error.message}`
  return String(error)
}

const startupStorageErrors: Record<string, string> = {}

function readEnabledWidgetPreferences() {
  try {
    const saved = localStorage.getItem(WIDGET_PREF_KEY)
    if (saved === null) return [...WIDGET_IDS]
    const stored = JSON.parse(saved) as unknown
    const legacyIds = Array.isArray(stored)
      ? stored.filter((id): id is number => Number.isInteger(id) && WIDGET_IDS.includes(id as typeof WIDGET_IDS[number]))
      : null
    const currentIds = stored && typeof stored === 'object' && !Array.isArray(stored)
      ? (stored as { version?: unknown; enabled?: unknown }).version === 2
        && Array.isArray((stored as { enabled?: unknown }).enabled)
        ? (stored as { enabled: unknown[] }).enabled.filter((id): id is number => Number.isInteger(id) && WIDGET_IDS.includes(id as typeof WIDGET_IDS[number]))
        : null
      : null
    return currentIds ?? (legacyIds?.length ? legacyIds : [...WIDGET_IDS])
  } catch (error) {
    startupStorageErrors['widget visibility restore'] = describeStorageError(error)
    return [...WIDGET_IDS]
  }
}

function readWidgetPositionPreferences(): WidgetPositions {
  try {
    const stored = JSON.parse(localStorage.getItem(WIDGET_POSITION_KEY) ?? '{}') as unknown
    if (!stored || typeof stored !== 'object' || Array.isArray(stored)) return {}
    return Object.fromEntries(Object.entries(stored).flatMap(([id, value]) => {
      const position = value as WidgetPosition
      return WIDGET_IDS.includes(Number(id) as typeof WIDGET_IDS[number]) && Number.isFinite(position?.x) && Number.isFinite(position?.y)
        ? [[Number(id), { x: Math.min(100, Math.max(-100, position.x)), y: Math.min(100, Math.max(-100, position.y)), ...(Number.isFinite(position?.width) && position.width! > 0 ? { width: position.width } : {}) }]]
        : []
    })) as WidgetPositions
  } catch (error) {
    startupStorageErrors['widget positions restore'] = describeStorageError(error)
    return {}
  }
}

async function readSavedWallpaper() {
  const database = await openWallpaperDatabase()
  return new Promise<SavedWallpaper | undefined>((resolve, reject) => {
    const request = database.transaction(STORE, 'readonly').objectStore(STORE).get(KEY)
    request.onsuccess = () => { database.close(); resolve(request.result as SavedWallpaper | undefined) }
    request.onerror = () => { database.close(); reject(request.error) }
  })
}

async function readDefaultWallpaper() {
  const database = await openWallpaperDatabase()
  return new Promise<SavedWallpaper | undefined>((resolve, reject) => {
    const request = database.transaction(STORE, 'readonly').objectStore(STORE).get(DEFAULT_WALLPAPER_KEY)
    request.onsuccess = () => { database.close(); resolve(request.result as SavedWallpaper | undefined) }
    request.onerror = () => { database.close(); reject(request.error) }
  })
}

async function readDefaultWallpaperVersion() {
  const database = await openWallpaperDatabase()
  return new Promise<string | undefined>((resolve, reject) => {
    const request = database.transaction(STORE, 'readonly').objectStore(STORE).get(DEFAULT_WALLPAPER_VERSION_KEY)
    request.onsuccess = () => { database.close(); resolve(request.result as string | undefined) }
    request.onerror = () => { database.close(); reject(request.error) }
  })
}

async function writeBundledDefaultWallpaper(selection: SavedWallpaper, version: string) {
  const database = await openWallpaperDatabase()
  return new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE, 'readwrite')
    const store = transaction.objectStore(STORE)
    store.put(selection, DEFAULT_WALLPAPER_KEY)
    store.put(version, DEFAULT_WALLPAPER_VERSION_KEY)
    transaction.oncomplete = () => { database.close(); resolve() }
    transaction.onerror = () => { database.close(); reject(transaction.error) }
    transaction.onabort = () => { database.close(); reject(transaction.error) }
  })
}

async function writeDefaultWallpaper(selection: SavedWallpaper) {
  const database = await openWallpaperDatabase()
  return new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE, 'readwrite')
    transaction.objectStore(STORE).put(selection, DEFAULT_WALLPAPER_KEY)
    transaction.oncomplete = () => { database.close(); resolve() }
    transaction.onerror = () => { database.close(); reject(transaction.error) }
    transaction.onabort = () => { database.close(); reject(transaction.error) }
  })
}

async function clearDefaultWallpaper() {
  const database = await openWallpaperDatabase()
  return new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE, 'readwrite')
    transaction.objectStore(STORE).delete(DEFAULT_WALLPAPER_KEY)
    transaction.oncomplete = () => { database.close(); resolve() }
    transaction.onerror = () => { database.close(); reject(transaction.error) }
    transaction.onabort = () => { database.close(); reject(transaction.error) }
  })
}

function readThemePreference(key: string): ThemeId | null {
  try {
    const value = localStorage.getItem(key) as ThemeId | null
    return value && THEME_IDS.includes(value) ? value : null
  } catch (error) {
    startupStorageErrors[`${key} read`] = describeStorageError(error)
    return null
  }
}

function resolveThemeChoice(value: string): ThemeId | null {
  return resolveThemeId(value)
}

function ThemeEmblem({ src, title, className }: { src: string; title: string; className: string }) {
  const [failed, setFailed] = useState(false)
  useEffect(() => setFailed(false), [src])
  const fallback = title.split(/[^A-Z0-9]+/i).filter(Boolean).slice(0, 2).map((word) => word[0]).join('')
  return (
    failed
      ? <span className={`${className} theme-emblem-fallback`} aria-hidden="true">{fallback || 'SYS'}</span>
      : <img className={className} src={src} alt="" aria-hidden="true" onError={() => setFailed(true)} />
  )
}

function SaoWidgetFrame() {
  return <>
    <span className="sao-widget-surface" aria-hidden="true" />
    <svg className="sao-widget-frame" viewBox="0 0 1000 400" preserveAspectRatio="none" aria-hidden="true">
      <path className="sao-widget-frame-outer" d="M28 2H972L998 28V372L970 398H28L2 372V28Z" />
      <path className="sao-widget-frame-inner" d="M37 10H963L990 37V363L961 390H37L10 363V37Z" />
      <path className="sao-widget-corner-plate sao-widget-corner-plate-top" d="M944 2H974L998 28V58Z" />
      <path className="sao-widget-corner-plate sao-widget-corner-plate-bottom" d="M2 342L58 398H28L2 372Z" />
      <path className="sao-widget-detail-line" d="M35 2H152M848 398H964" />
      <path className="sao-widget-ticks" d="M900 382L916 366M922 382L938 366M944 382L960 366" />
    </svg>
  </>
}

function SaoWidgetTitle({ id, title }: { id: number; title: string }) {
  return <span className="sao-widget-title"><b>{String(id).padStart(2, '0')}</b><span>{title}</span><i aria-hidden="true" /></span>
}

function ThemeWidgetFrame({ theme }: { theme: ThemeId }) {
  if (theme === 'sao') return null
  const art = theme === 'demon-mode'
    ? { corner: './assets/emblems/demon-corner-clasp-trimmed.png', accent: './assets/emblems/demon-fissure-trimmed.png' }
    : theme === 'breathing-sun'
      ? { corner: './assets/emblems/hinokami-flame-strip.png', accent: './assets/emblems/flame-short-trimmed.png' }
      : theme === 'tokyo-ghoul'
        ? { corner: './assets/kagune/kagune-header-tendril-trimmed.png', accent: './assets/kagune/kagune-bottom-tendril-trimmed.png' }
        : theme === 'dragon'
          ? { corner: './assets/emblems/night-fury-corner-fins-trimmed.png', accent: './assets/emblems/night-fury-bottom-tail-trimmed.png' }
          : null
  return <span className={`theme-widget-frame theme-widget-frame-${theme}`} aria-hidden="true">
    {art && <>{theme === 'demon-mode' ? <span className="theme-widget-frame-corner"><img src={art.corner} alt="" /></span> : <img className="theme-widget-frame-corner" src={art.corner} alt="" />}<img className="theme-widget-frame-accent" src={art.accent} alt="" /></>}
  </span>
}

function ThemeControlIdentity({ theme, connected }: { theme: ThemeId; connected: boolean }) {
  const identity = theme === 'arise'
    ? { label: 'ARISE / SHADOW MONARCH', src: './assets/emblems/arise-shadow-monarch.png' }
    : theme === 'grimoire'
      ? { label: 'GRIMOIRE / BLACK CLOVER', src: './assets/emblems/grimoire.png' }
      : theme === 'limitless'
        ? { label: 'LIMITLESS / SPATIAL INTERFACE', src: './assets/emblems/limitless.png' }
        : { label: 'HINOKAMI KAGURA / SUN BREATHING', src: './assets/emblems/hinokami-kagura.png' }
  return <div className="theme-control-identity">
    <ThemeEmblem className="theme-control-emblem" src={identity.src} title={identity.label} />
    <div><small>{identity.label}</small><strong><i className={connected ? 'is-online' : ''} />{connected ? 'HELPER CONNECTED' : 'HELPER UNAVAILABLE'}</strong></div>
  </div>
}

async function readWallpaperLibrary() {
  const database = await openWallpaperDatabase()
  return new Promise<Array<{ id: string; wallpaper: SavedWallpaper }>>((resolve, reject) => {
    const store = database.transaction(STORE, 'readonly').objectStore(STORE)
    const keysRequest = store.getAllKeys()
    const valuesRequest = store.getAll()
    let keys: IDBValidKey[] = []
    let values: unknown[] = []
    const finish = () => {
      if (keysRequest.readyState !== 'done' || valuesRequest.readyState !== 'done') return
      database.close()
      resolve(keys.flatMap((key, index) => {
        const id = String(key)
        const wallpaper = values[index] as SavedWallpaper
        return (id === KEY || id.startsWith('saved:')) && wallpaper?.blob
          ? [{ id, wallpaper }]
          : []
      }))
    }
    keysRequest.onsuccess = () => { keys = keysRequest.result; finish() }
    valuesRequest.onsuccess = () => { values = valuesRequest.result; finish() }
    keysRequest.onerror = valuesRequest.onerror = () => { database.close(); reject(keysRequest.error ?? valuesRequest.error) }
  })
}

async function saveWallpaper(selection: SavedWallpaper, addToLibrary = true) {
  const database = await openWallpaperDatabase()
  return new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE, 'readwrite')
    const store = transaction.objectStore(STORE)
    store.put(selection, KEY)
    if (addToLibrary) store.put(selection, `saved:${Date.now()}-${Math.random().toString(36).slice(2, 8)}`)
    transaction.oncomplete = () => { database.close(); resolve() }
    transaction.onerror = () => { database.close(); reject(transaction.error) }
    transaction.onabort = () => { database.close(); reject(transaction.error) }
  })
}

function decodeImage(url: string) {
  return new Promise<void>((resolve, reject) => {
    const image = new Image()
    const timeout = window.setTimeout(() => reject(new Error('Wallpaper decoding timed out.')), 10000)
    image.onload = () => { window.clearTimeout(timeout); resolve() }
    image.onerror = () => { window.clearTimeout(timeout); reject(new Error('The selected file is not a readable image.')) }
    image.src = url
  })
}

function displayPercent(value: number | null) {
  return value === null ? 'UNAVAILABLE' : value.toFixed(1) + '%'
}

function displayMegabytesPerSecond(value: number | null) {
  return value === null ? 'UNAVAILABLE' : (value / (1024 * 1024)).toFixed(2) + ' MB/S'
}

function hardwareStatusLabel(status: HardwareFeedStatus) {
  if (status === 'live') return 'LIVE'
  if (status === 'stale') return 'STALE'
  if (status === 'browser') return 'SAMPLE DATA'
  if (status === 'invalid') return 'INVALID DATA'
  return 'WAITING FOR LIVELY'
}

function DiagnosticMeter({ label, value, percent, history, detail }: { label: string; value: string; percent: number | null; history: number[]; detail?: string }) {
  const samples = history.filter((point) => Number.isFinite(point)).map((point) => Math.max(0, Math.min(100, point)))
  const points = samples.length > 1 ? samples.map((point, index) => `${(index / (samples.length - 1)) * 100},${100 - point}`).join(' ') : ''
  const area = points ? `M0 100 L${points.replaceAll(',', ' ').replaceAll(' ', ' ')} L100 100 Z` : ''
  const gradientId = `meter-area-${label.replace(/[^a-z0-9]/gi, '').toLowerCase()}`
  return <div className={`diagnostic-meter${percent === null ? ' is-unavailable' : ''}`}>
    <div className="diagnostic-meter-label"><b>{label}</b><strong>{value}</strong></div>
    <div className="diagnostic-meter-track" style={{ '--meter-value': `${percent ?? 0}%` } as CSSProperties}><i /></div>
    {points ? <svg className="diagnostic-meter-history" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="currentColor" stopOpacity=".28" /><stop offset="1" stopColor="currentColor" stopOpacity="0" /></linearGradient></defs><path className="diagnostic-meter-area" d={area} fill={`url(#${gradientId})`} /><polyline points={points} /></svg> : <span className="diagnostic-meter-history empty">NO SAMPLE HISTORY</span>}
    {detail && <small>{detail}</small>}
  </div>
}

async function detectConnectedMonitorCount(token: string): Promise<number | null> {
  if (!token) return null
  try {
    const result = await readBrightnessMonitors(token)
    return result.monitors.length
  } catch {
    return null
  }
}


async function detectSequenceViewports(token: string): Promise<SequenceViewport[] | null> {
  console.log('[ELUCIDATOR MIRROR DEBUG]', {
    width: window.innerWidth,
    height: window.innerHeight,
    protocol: window.location.protocol,
    devicePixelRatio: window.devicePixelRatio,
    helperTokenAvailable: Boolean(token),
    hostViewport: window.elucidatorLivelySpanViewport ?? null,
  })
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight

  // This fallback is specific to a verified 3840x1080
  // Lively Span instance. Never apply it to a normal browser.
  const isKnownDualMonitorSpan =
    !import.meta.env.DEV &&
    location.protocol === 'file:' &&
    Math.abs(viewportWidth - 3840) <= 2 &&
    Math.abs(viewportHeight - 1080) <= 2

  const knownDualMonitorViewports: SequenceViewport[] | null =
    isKnownDualMonitorSpan
      ? [
        {
          left: 0,
          top: 0,
          width: viewportWidth / 2,
          height: viewportHeight,
        },
        {
          left: viewportWidth / 2,
          top: 0,
          width: viewportWidth / 2,
          height: viewportHeight,
        },
      ]
      : null

  if (token) {
    try {
      const { displays } = await readDisplayGeometry(token)

      if (displays.length === 2) {
        const left = Math.min(...displays.map(screen => screen.left))
        const top = Math.min(...displays.map(screen => screen.top))
        const right = Math.max(
          ...displays.map(screen => screen.left + screen.width)
        )
        const bottom = Math.max(
          ...displays.map(screen => screen.top + screen.height)
        )

        const desktopWidth = right - left
        const desktopHeight = bottom - top

        const hostViewport =
          window.elucidatorLivelySpanViewport ??
          (location.protocol === 'file:'
            ? { width: viewportWidth, height: viewportHeight }
            : null)

        if (
          hostViewport &&
          hostViewport.width === viewportWidth &&
          hostViewport.height === viewportHeight &&
          desktopWidth > 0 &&
          desktopHeight > 0 &&
          !import.meta.env.DEV &&
          !/^https?:$/.test(location.protocol)
        ) {
          const scaleX = viewportWidth / desktopWidth
          const scaleY = viewportHeight / desktopHeight

          if (
            Number.isFinite(scaleX) &&
            Number.isFinite(scaleY) &&
            Math.abs(scaleX - scaleY) <= 0.015
          ) {
            return displays
              .map(screen => ({
                left: (screen.left - left) * scaleX,
                top: (screen.top - top) * scaleY,
                width: screen.width * scaleX,
                height: screen.height * scaleY,
              }))
              .sort((a, b) => a.left - b.left)
          }
        }
      }
    } catch (error) {
      console.warn(
        '[Elucidator] Monitor geometry unavailable; checking span fallback.',
        error
      )
    }
  }

  return knownDualMonitorViewports
}


const COMMAND_COMPLETIONS = [
  'admin sys config save',
  'sys status', 'sys wallpaper', 'sys wallpaper current', 'sys wallpaper select', 'sys wallpaper list',
  'sys storage status',
  'sys wallpaper default', 'sys wallpaper default set', 'sys wallpaper default select', 'sys wallpaper default clear',
  'sys theme list', 'sys theme activate', 'sys theme default', 'sys theme default set', 'sys theme default select',
  'sys wallpaper next', 'sys wallpaper previous', 'sys wallpaper scan', 'sys hardware', 'sys time', 'sys audio',
  'sys mode', 'sys mode normal', 'sys mode stealth', 'sys mode combat', 'sys mode idle', 'sys mode diagnostic',
  'sys session', 'sys anime',
  'sys widgets', 'sys widgets all on', 'sys widgets all off', 'sys animation mirror', 'sys animation mirror on', 'sys animation mirror off', 'sys animation mirror status', 'sys sequence mirror', 'sys sequence mirror on', 'sys sequence mirror off', 'sys sequence mirror status',
  'sys widget 1 on', 'sys widget 1 off', 'sys widget 2 on', 'sys widget 2 off',
  'sys widget 3 on', 'sys widget 3 off', 'sys widget 4 on', 'sys widget 4 off', 'sys widget 5 on', 'sys widget 5 off',
  'sys widget move 1 50 20', 'sys widget position info', 'sys widget size 1 1', 'sys widgets size 1', 'sys scale 1', 'sys compact on', 'sys compact off', 'sys compact httyd save 1', 'sys compact kagune save 1', 'sys widget reset', 'sys layout list', 'sys layout free', 'sys layout left', 'sys layout right', 'sys layout top', 'sys layout bottom', 'sys layout save desk', 'sys layout load desk', 'sys layout reset', 'sys standby', 'sys arise', 'sys link start',
  'sys pair', 'sys brightness', 'sys brightness status', 'sys brightness list', 'sys brightness help', 'sys brightness 40', 'sys brightness monitor 1 60', 'sys brightness unpair', 'sys lock',
  'sys wallpaper fit cover', 'sys wallpaper fit contain', 'sys wallpaper fit stretch', 'sys wallpaper fit span',
  'sys grimoire', 'sys limitless',
  'sys hinokami kagura', 'sys demon mode', 'sys httyd', 'sys night fury', 'sys kagune', 'sys stealth', 'sys help', 'help',
  'visual list', 'visual haze', 'visual rain', 'visual lightning', 'visual particles', 'visual vignette', 'visual off', 'visual status',
]

function findCommandCompletions(value: string, savedWallpaperCount = 0) {
  const prefix = value.toLowerCase().replace(/\s+/g, ' ')
  if (/^visual\s+$/.test(prefix)) return COMMAND_COMPLETIONS.filter((candidate) => candidate.startsWith('visual '))
  if (/^sys wallpaper\s+$/.test(prefix)) {
    return ['current', 'select', 'list', 'next', 'previous', 'scan', 'fit', 'default'].map((action) => `sys wallpaper ${action}`)
  }
  if (/^sys wallpaper default\s+$/.test(prefix)) return ['set', 'select', 'clear'].map((action) => `sys wallpaper default ${action}`)
  if (/^sys wallpaper default select\s+$/.test(prefix)) return Array.from({ length: savedWallpaperCount }, (_, index) => `sys wallpaper default select ${index + 1}`)
  if (/^sys theme\s+$/.test(prefix)) return ['list', 'activate', 'feature', 'default'].map((action) => `sys theme ${action}`)
  if (/^sys theme default\s+$/.test(prefix)) return ['set', 'select'].map((action) => `sys theme default ${action}`)
  if (/^sys theme default select\s+$/.test(prefix)) return THEME_CHOICES.map((choice) => `sys theme default select ${choice.command}`)
  if (/^sys theme activate\s+$/.test(prefix)) return THEME_CHOICES.map((choice) => `sys theme activate ${choice.command}`)
  if (/^sys wallpaper fit\s+$/.test(prefix)) return WALLPAPER_FITS.map((fit) => `sys wallpaper fit ${fit}`)
  if (/^sys animation\s+$/.test(prefix)) return ['sys animation mirror', 'sys animation mirror on', 'sys animation mirror off', 'sys animation mirror status']
  if (/^sys animation mirror\s+$/.test(prefix)) return ['on', 'off', 'status'].map((action) => `sys animation mirror ${action}`)
  if (/^sys brightness\s+$/.test(prefix)) return ['sys brightness status', 'sys brightness list', 'sys brightness help']
  if (/^sys brightness monitor\s+$/.test(prefix)) return ['sys brightness monitor 1 ', 'sys brightness monitor 2 ']
  if (/^sys brightness monitor \d+\s+$/.test(prefix)) return [0, 20, 40, 60, 80, 100].map((value) => `sys brightness monitor ${prefix.match(/^sys brightness monitor (\d+)/)?.[1]} ${value}`)
  if (/^sys mode\s+$/.test(prefix)) {
    return ['normal', 'stealth', 'combat', 'idle', 'diagnostic'].map((mode) => `sys mode ${mode}`)
  }
  if (/^sys widgets\s+$/.test(prefix)) return ['sys widgets all on', 'sys widgets all off', 'sys widgets size ']
  if (/^sys widgets size\s+$/.test(prefix)) return WIDGET_SCALES.map((scale) => `sys widgets size ${scale}`)
  if (/^sys scale\s+$/.test(prefix)) return WIDGET_SCALES.map((scale) => `sys scale ${scale}`)
  if (/^sys widget size\s+$/.test(prefix)) return WIDGET_IDS.map((id) => `sys widget size ${id} `)
  if (/^sys widget size [1-5]\s+$/.test(prefix)) return WIDGET_SCALES.map((scale) => `sys widget size ${prefix.match(/^sys widget size ([1-5])/i)?.[1]} ${scale}`)
  if (/^sys layout\s+$/.test(prefix)) return ['sys layout list', 'sys layout free', 'sys layout left', 'sys layout right', 'sys layout top', 'sys layout bottom', 'sys layout save ', 'sys layout load ', 'sys layout reset']
  if (/^sys layout (save|load)\s+$/.test(prefix)) return []
  if (/^sys widget\s+$/.test(prefix)) return [
    'sys widget 1 on', 'sys widget 1 off', 'sys widget 2 on', 'sys widget 2 off',
    'sys widget 3 on', 'sys widget 3 off', 'sys widget 4 on', 'sys widget 4 off', 'sys widget 5 on', 'sys widget 5 off',
    'sys widget move 1 50 20', 'sys widget position info', 'sys widget size ', 'sys widget reset',
  ]
  return COMMAND_COMPLETIONS.filter((candidate) => candidate.startsWith(prefix))
}

function App() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const objectUrlRef = useRef<string | null>(null)
  const finishingBootRef = useRef(false)
  const wallpaperRequestRef = useRef(0)
  const sessionStartedAt = useRef(Date.now())
  const wallpaperStartedAt = useRef(Date.now())
  const commandHistoryRef = useRef<string[]>([])
  const historyIndexRef = useRef(0)
  const commandDraftRef = useRef('')
  const completionRef = useRef<{ lastValue: string; candidates: string[]; index: number } | null>(null)
  const credentialRecoveryRef = useRef<() => Promise<'restored' | 'missing' | 'helper-unavailable' | 'rejected'>>(async () => 'missing')
  const draggingWidgetRef = useRef<{ id: number; pointerId: number; offsetX: number; offsetY: number; startX: number; startY: number; activated: boolean; compact?: boolean; originX?: number; originY?: number } | null>(null)
  const draggingCompactPanelRef = useRef<{ pointerId: number; offsetX: number; offsetY: number } | null>(null)
  const compactPreferencesLoadedRef = useRef(false)
  const widgetExitTimersRef = useRef<Map<number, number>>(new Map())
  const draggingConsoleRef = useRef<{ offsetX: number; offsetY: number; frame: ConsoleFrame } | null>(null)
  const effectIdRef = useRef(0)
  const hardwareLastPublishedRef = useRef(0)
  const [wallpaperUrl, setWallpaperUrl] = useState('')
  const [wallpaperName, setWallpaperName] = useState('NO WALLPAPER SELECTED')
  const [defaultWallpaperName, setDefaultWallpaperName] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const storageErrorsRef = useRef<Record<string, string>>({})
  const [booting, setBooting] = useState(true)
  const [bootStage, setBootStage] = useState<'sequence' | 'standby'>('sequence')
  const [standbyActive, setStandbyActive] = useState(false)
  const [revealComplete, setRevealComplete] = useState(false)
  const [wallpaperMediaReady, setWallpaperMediaReady] = useState(false)
  const [bootToken, setBootToken] = useState(0)
  const [command, setCommand] = useState('')
  const [brightnessToken, setBrightnessToken] = useState('')
  const [credentialBootstrapAvailable, setCredentialBootstrapAvailable] = useState(false)
  const [brightnessHelperOnline, setBrightnessHelperOnline] = useState(false)
  const [status, setStatus] = useState('SYSTEM CONSOLE ONLINE · SYS HELP')
  const [mode, setMode] = useState<SystemMode>('NORMAL')
  const [defaultTheme, setDefaultTheme] = useState<ThemeId | null>(() => readThemePreference(DEFAULT_THEME_PREF_KEY))
  const [theme, setTheme] = useState<ThemeId>(() => readThemePreference(DEFAULT_THEME_PREF_KEY) ?? readThemePreference(THEME_PREF_KEY) ?? 'tokyo-ghoul')
  const [startupConfigHydrated, setStartupConfigHydrated] = useState(false)
  const [wallpaperFit, setWallpaperFit] = useState<WallpaperFit>(() => {
    try {
      const saved = localStorage.getItem(WALLPAPER_FIT_PREF_KEY) as WallpaperFit | null
      return saved && WALLPAPER_FITS.includes(saved) ? saved : 'cover'
    } catch (error) { startupStorageErrors['wallpaper fit restore'] = describeStorageError(error); return 'cover' }
  })
  const [animationMirror, setAnimationMirror] = useState<boolean>(() => {
    try { return localStorage.getItem(ANIMATION_MIRROR_KEY) === 'true' } catch (error) { startupStorageErrors['animation preference restore'] = describeStorageError(error); return false }
  })
  const [sequenceMirror, setSequenceMirror] = useState<boolean>(() => {
    try { return localStorage.getItem(SEQUENCE_MIRROR_KEY) === 'true' } catch (error) { startupStorageErrors['sequence preference restore'] = describeStorageError(error); return false }
  })
  const [sequenceViewports, setSequenceViewports] = useState<SequenceViewport[] | null>(null)
  const [connectedMonitorCount, setConnectedMonitorCount] = useState<number | null>(null)
  const [visualTheme, setVisualTheme] = useState<VisualTheme>(() => {
    try {
      const saved = localStorage.getItem(VISUAL_THEME_PREF_KEY) as VisualTheme | null
      return saved && VISUAL_THEMES.includes(saved) ? saved : 'off'
    } catch (error) {
      startupStorageErrors['visual theme restore'] = describeStorageError(error)
      return 'off'
    }
  })
  const [specialEffect, setSpecialEffect] = useState<SpecialEffect | null>(null)
  const [consoleEntry, setConsoleEntry] = useState<{ theme: ThemeId; id: number } | null>(null)
  const [saoWidgetsStarting, setSaoWidgetsStarting] = useState(false)
  const [nightStealth, setNightStealth] = useState(false)
  const [hardwareFeed, setHardwareFeed] = useState<HardwareFeed>({ status: 'browser', readings: SAMPLE_HARDWARE_READINGS, updatedAt: null })
  const [nowPlaying, setNowPlaying] = useState<NowPlayingTrack | null>(SAMPLE_NOW_PLAYING)
  const [nowPlayingStatus, setNowPlayingStatus] = useState<NowPlayingStatus>('sample')
  const [quickShortcuts] = useState<QuickShortcut[]>(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(QUICK_SHORTCUTS_KEY) ?? 'null') as unknown
      if (!Array.isArray(stored) || stored.length !== QUICK_SHORTCUTS.length) return QUICK_SHORTCUTS
      const valid = stored.every((item) => item && typeof item === 'object' && typeof (item as QuickShortcut).id === 'string' && typeof (item as QuickShortcut).label === 'string' && typeof (item as QuickShortcut).icon === 'string' && typeof (item as QuickShortcut).target === 'string')
      return valid ? stored as QuickShortcut[] : QUICK_SHORTCUTS
    } catch { return QUICK_SHORTCUTS }
  })
  const [brightnessLevel, setBrightnessLevel] = useState(60)
  const [wallpaperLibrary, setWallpaperLibrary] = useState<Array<{ id: string; wallpaper: SavedWallpaper }>>([])
  const [enabledWidgets, setEnabledWidgets] = useState<number[]>(readEnabledWidgetPreferences)
  const [renderedWidgets, setRenderedWidgets] = useState<number[]>(readEnabledWidgetPreferences)
  const [leavingWidgetIds, setLeavingWidgetIds] = useState<number[]>([])
  const [openingWidgetIds, setOpeningWidgetIds] = useState<number[]>([])
  const [widgetPositions, setWidgetPositions] = useState<WidgetPositions>(readWidgetPositionPreferences)
  const [widgetScales, setWidgetScales] = useState<WidgetScales>(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(WIDGET_SCALE_KEY) ?? '{}') as unknown
      if (!stored || typeof stored !== 'object' || Array.isArray(stored)) return {}
      return Object.fromEntries(Object.entries(stored).flatMap(([id, scale]) =>
        WIDGET_IDS.includes(Number(id) as typeof WIDGET_IDS[number]) && WIDGET_SCALES.includes(scale as WidgetScale)
          ? [[Number(id), scale as WidgetScale]]
          : [],
      )) as WidgetScales
    } catch (error) { startupStorageErrors['widget scales restore'] = describeStorageError(error); return {} }
  })
  const [interfaceScale, setInterfaceScale] = useState<WidgetScale>(() => {
    try { const stored = Number(localStorage.getItem(INTERFACE_SCALE_KEY)); return WIDGET_SCALES.includes(stored as WidgetScale) ? stored as WidgetScale : 1 } catch { return 1 }
  })
  const [widgetLayout, setWidgetLayout] = useState<WidgetLayout>(() => {
    try {
      const saved = localStorage.getItem(WIDGET_LAYOUT_KEY) as WidgetLayout | null
      return saved && ['free', 'left', 'right', 'top', 'bottom'].includes(saved) ? saved : 'right'
    } catch (error) { startupStorageErrors['widget layout restore'] = describeStorageError(error); return 'right' }
  })
  const [widgetsCompact, setWidgetsCompact] = useState(false)
  const [compactRestore, setCompactRestore] = useState<CompactRestore | null>(null)
  const [compactPanelPosition, setCompactPanelPosition] = useState<CompactPanelPosition | null>(null)
  const [compactWidgetOffsets, setCompactWidgetOffsets] = useState<CompactWidgetOffsets>({})
  const [compactThemeLayouts, setCompactThemeLayouts] = useState<Record<string, CompactThemeLayout>>({})
  const [consoleFrame, setConsoleFrame] = useState<ConsoleFrame | null>(null)
  const [layoutPresets, setLayoutPresets] = useState<Record<string, LayoutSnapshot>>(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(LAYOUT_PRESETS_KEY) ?? '{}') as unknown
      return stored && typeof stored === 'object' && !Array.isArray(stored) ? stored as Record<string, LayoutSnapshot> : {}
    } catch (error) { startupStorageErrors['layout presets restore'] = describeStorageError(error); return {} }
  })
  const [clockNow, setClockNow] = useState(() => new Date())
  const [hardwareHistory, setHardwareHistory] = useState<Record<'cpu' | 'gpu' | 'ram', number[]>>({ cpu: [26, 30, 28, 35, 32, 34, 32], gpu: [12, 15, 17, 16, 21, 18, 18], ram: [61, 62, 63, 62, 64, 63, 64] })
  const saoBootSequenceRef = useRef<number | null>(null)
  const setStorageIssue = useCallback((area: string, error: unknown | null) => {
    if (error === null) delete storageErrorsRef.current[area]
    else storageErrorsRef.current[area] = describeStorageError(error)
  }, [])
  const [consoleLines, setConsoleLines] = useState<string[]>(['ELUCIDATOR // MAINFRAME', 'SYSTEM ONLINE · WALLPAPER READY', 'ENTER SYS HELP FOR COMMANDS.'])
  const handleBootStandby = useCallback(() => {
    setRevealComplete(true)
    setStandbyActive(true)
  }, [])
  const handleBootActivate = useCallback(() => {
    finishingBootRef.current = true
    setBootStage('sequence')
    setStandbyActive(false)
    setBooting(false)
  }, [])
  // Retained solely for the unreachable legacy markup until that markup is removed in
  // a dedicated cleanup; the cinematic component owns the actual boot timeline.
  const timeline: LegacyBootTimeline = { phases: [], duration: 0 }
  const bootElapsed = 0
  const progressPercent = 0
  const readyMessage = false
  const clockSeconds = clockNow.getSeconds()
  const clockMinutes = clockNow.getMinutes() + clockSeconds / 60
  const clockHours = (clockNow.getHours() % 12) + clockMinutes / 60
  const clockStyle = {
    '--clock-hour-angle': `${clockHours * 30}deg`,
    '--clock-minute-angle': `${clockMinutes * 6}deg`,
    '--clock-second-angle': `${clockSeconds * 6}deg`,
  } as CSSProperties
  const clockZone = Intl.DateTimeFormat().resolvedOptions().timeZone.split('/').pop()?.replaceAll('_', ' ') ?? 'LOCAL TIME'
  const animeStatus = THEME_STATUS[theme]
  const activeThemeSystem = THEME_SYSTEMS.find((system) => system.id === theme)
  const stealthIdentity = nightStealth || mode === 'STEALTH'
  const activePresentation: ThemeActivationPresentation = stealthIdentity
    ? STEALTH_PRESENTATION
    : activeThemeSystem?.activationPresentation ?? STEALTH_PRESENTATION
  const activationStyle = {
    '--activation-accent': activePresentation.accent,
    '--activation-secondary': activePresentation.secondary,
  } as CSSProperties
  const themeSignature = activeThemeSystem?.signature ?? 'none'

  useEffect(() => {
    let active = true
    const refreshHealth = async () => {
      const online = await checkBrightnessHelperHealth()
      if (active) setBrightnessHelperOnline(online)
    }
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') void refreshHealth()
    }
    void refreshHealth()
    const timer = window.setInterval(() => void refreshHealth(), 10000)
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      active = false
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [])

  useEffect(() => {
    let active = true
    let retryTimer: number | undefined
    const scheduleRetry = () => {
      if (retryTimer === undefined && active) retryTimer = window.setTimeout(() => { retryTimer = undefined; void restoreCredential() }, 5000)
    }
    const syncVerifiedToken = async (token: string, monitorCount: number, bootstrapWasPresent: boolean) => {
      if (!active) return
      setBrightnessToken(token)
      setConnectedMonitorCount(monitorCount)
      if (!saveBrightnessToken(token)) setStorageIssue('brightness token restore', new Error('Could not restore token to localStorage'))
      try { await writeBrightnessTokenBackup(token); if (active) setStorageIssue('brightness token backup write', null) }
      catch (error) { if (active) setStorageIssue('brightness token backup write', error) }
      try {
        const bootstrap = await persistPrivateCredentialBootstrap(token)
        if (!bootstrap.saved) throw new Error('Private credential bootstrap was not confirmed')
        if (active) { setCredentialBootstrapAvailable(true); setStorageIssue('brightness credential bootstrap write', null) }
      } catch (error) {
        if (active) {
          setCredentialBootstrapAvailable(bootstrapWasPresent)
          setStorageIssue('brightness credential bootstrap write', error)
        }
      }
    }
    const restoreCredential = async () => {
      try {
        let bootstrapToken = ''
        try {
          bootstrapToken = await readPrivateCredentialBootstrap()
          setStorageIssue('brightness credential bootstrap restore', null)
        } catch (error) { setStorageIssue('brightness credential bootstrap restore', error) }
        if (!active) return 'missing'
        setCredentialBootstrapAvailable(Boolean(bootstrapToken))
        let tokenBackup = ''
        try { tokenBackup = await readBrightnessTokenBackup() }
        catch (error) { setStorageIssue('brightness token backup restore', error) }
        if (!active) return 'missing'
        const localToken = getBrightnessToken()
        const candidates = [...new Set([bootstrapToken, localToken, tokenBackup].filter((token) => /^[A-Za-z0-9_-]{40,60}$/.test(token)))]
        if (!candidates.length) { if (active) setBrightnessToken(''); return 'missing' }
        const health = await getBrightnessHelperHealth()
        if (!active) return 'missing'
        setBrightnessHelperOnline(health.state === 'online')
        if (health.state !== 'online') {
          setStorageIssue('brightness credential validation', new Error(health.message))
          scheduleRetry()
          return 'helper-unavailable'
        }
        for (const candidate of candidates) {
          try {
            const result = await validateBrightnessToken(candidate)
            if (!active) return 'missing'
            setStorageIssue('brightness credential validation', null)
            await syncVerifiedToken(candidate, result.monitors.length, Boolean(bootstrapToken))
            return 'restored'
          } catch (error) {
            if (!active) return 'missing'
            const message = error instanceof Error ? error.message : 'Pairing validation failed'
            if (message.includes('WINDOWS HELPER') || message.includes('TIMED OUT')) {
              setStorageIssue('brightness credential validation', error)
              scheduleRetry()
              return 'helper-unavailable'
            }
          }
        }
        // Stale browser copies must not shadow a valid Windows helper token.
        // Never delete or regenerate the helper token from this path.
        if (active) {
          setBrightnessToken('')
          saveBrightnessToken(null)
          try { await writeBrightnessTokenBackup(null) } catch (error) { setStorageIssue('brightness token backup write', error) }
          setStorageIssue('brightness credential validation', new Error('Stored pairing credentials were rejected by the Windows helper'))
        }
        return 'rejected'
      } catch (error) {
        if (active) setStorageIssue('brightness credential restore', error)
        return 'helper-unavailable'
      }
    }
    credentialRecoveryRef.current = restoreCredential
    void restoreCredential()
    return () => {
      active = false
      credentialRecoveryRef.current = async () => 'missing'
      if (retryTimer !== undefined) window.clearTimeout(retryTimer)
    }
  }, [setStorageIssue])

  useEffect(() => {
    let cancelled = false
    const restore = async () => {
      try {
        let durableConfigReadFailed = false
        const durableConfigPromise = readDurableStartupConfiguration().catch((error: unknown) => {
          durableConfigReadFailed = true
          setStorageIssue('durable startup configuration restore', error)
          return null
        })
        const installedConfigPromise = readWallpaperStartupManifest().catch((error: unknown) => {
          setStorageIssue('installed startup configuration restore', error)
          return null
        })
        const [savedDefault, saved, library, defaultVersion, durableConfig, installedConfig] = await Promise.all([
          readDefaultWallpaper(),
          readSavedWallpaper(),
          readWallpaperLibrary(),
          readDefaultWallpaperVersion(),
          durableConfigPromise,
          installedConfigPromise,
        ])
        const startupConfig: StartupConfiguration & { wallpaperBlob?: Blob } | null = durableConfig ?? installedConfig
        if (cancelled) return
        if (!durableConfigReadFailed) setStorageIssue('durable startup configuration restore', null)
        if (!installedConfig) setStorageIssue('installed startup configuration restore', null)
        if (durableConfig?.wallpaperError) setStorageIssue('durable startup wallpaper integrity', new Error(durableConfig.wallpaperError))
        else setStorageIssue('durable startup wallpaper integrity', null)
        if (startupConfig?.theme && THEME_SYSTEMS.some((system) => system.id === startupConfig.theme)) {
          const restoredTheme = startupConfig.theme as ThemeId
          setTheme(restoredTheme)
          setDefaultTheme(restoredTheme)
        }
        const preferences = startupConfig?.settings
        if (preferences) {
          const enabled = Array.isArray(preferences.enabledWidgets)
            ? [...new Set(preferences.enabledWidgets.filter((id) => WIDGET_IDS.includes(id as typeof WIDGET_IDS[number])))]
            : null
          if (enabled) { setEnabledWidgets(enabled); setRenderedWidgets(enabled) }
          if (preferences.widgetPositions && typeof preferences.widgetPositions === 'object') {
            const valid = Object.fromEntries(Object.entries(preferences.widgetPositions).flatMap(([id, position]) => {
              const item = position as WidgetPosition
              return WIDGET_IDS.includes(Number(id) as typeof WIDGET_IDS[number]) && Number.isFinite(item?.x) && Number.isFinite(item?.y)
                ? [[Number(id), { x: Math.min(100, Math.max(-100, item.x)), y: Math.min(100, Math.max(-100, item.y)), ...(Number.isFinite(item?.width) && item.width! > 0 ? { width: item.width } : {}) }]]
                : []
            })) as WidgetPositions
            setWidgetPositions(valid)
          }
          if (preferences.widgetScales && typeof preferences.widgetScales === 'object') {
            const valid = Object.fromEntries(Object.entries(preferences.widgetScales).flatMap(([id, scale]) =>
              WIDGET_IDS.includes(Number(id) as typeof WIDGET_IDS[number]) && WIDGET_SCALES.includes(scale as WidgetScale) ? [[Number(id), scale]] : [],
            )) as WidgetScales
            setWidgetScales(valid)
          }
          if (WIDGET_SCALES.includes(preferences.interfaceScale as WidgetScale)) setInterfaceScale(preferences.interfaceScale as WidgetScale)
          if (['free', 'left', 'right', 'top', 'bottom'].includes(preferences.widgetLayout)) setWidgetLayout(preferences.widgetLayout as WidgetLayout)
          if (typeof preferences.widgetsCompact === 'boolean') {
            setWidgetsCompact(preferences.widgetsCompact)
            const restore = preferences.compactRestore
            if (restore && ['free', 'left', 'right', 'top', 'bottom'].includes(restore.widgetLayout) && restore.widgetPositions && typeof restore.widgetPositions === 'object') {
              setCompactRestore({ widgetLayout: restore.widgetLayout as WidgetLayout, widgetPositions: restore.widgetPositions as WidgetPositions })
            }
            const panel = preferences.compactPanelPosition
            if (panel && Number.isFinite(panel.x) && Number.isFinite(panel.y)) setCompactPanelPosition({ x: panel.x, y: panel.y })
            if (preferences.compactWidgetOffsets && typeof preferences.compactWidgetOffsets === 'object') setCompactWidgetOffsets(preferences.compactWidgetOffsets as CompactWidgetOffsets)
            if (preferences.compactThemeLayouts && typeof preferences.compactThemeLayouts === 'object') setCompactThemeLayouts(preferences.compactThemeLayouts as Record<string, CompactThemeLayout>)
            compactPreferencesLoadedRef.current = true
          }
          if (preferences.layoutPresets && typeof preferences.layoutPresets === 'object' && !Array.isArray(preferences.layoutPresets)) setLayoutPresets(preferences.layoutPresets as Record<string, LayoutSnapshot>)
          if (WALLPAPER_FITS.includes(preferences.wallpaperFit as WallpaperFit)) setWallpaperFit(preferences.wallpaperFit as WallpaperFit)
          if (typeof preferences.animationMirror === 'boolean') setAnimationMirror(preferences.animationMirror)
          if (typeof preferences.sequenceMirror === 'boolean') setSequenceMirror(preferences.sequenceMirror)
          if (VISUAL_THEMES.includes(preferences.visualTheme as VisualTheme)) setVisualTheme(preferences.visualTheme as VisualTheme)
          const frame = preferences.consoleFrame
          if (frame && [frame.x, frame.y, frame.width, frame.height].every(Number.isFinite)) {
            setConsoleFrame({ x: frame.x, y: frame.y, width: frame.width, height: frame.height, anchor: frame.anchor === 'bottom' ? 'bottom' : 'top' })
          }
        }
        setWallpaperLibrary(library)
        let activeDefault = savedDefault
        // Package updates may refresh the bundled default, but must never replace a
        // wallpaper the user explicitly saved as their startup default.
        if (!savedDefault?.blob && defaultVersion !== DEFAULT_WALLPAPER_VERSION) {
          const response = await fetch(DEFAULT_WALLPAPER_URL)
          if (!response.ok) throw new Error(`Bundled default wallpaper could not be loaded (${response.status})`)
          const bundledDefault = { blob: await response.blob(), name: DEFAULT_WALLPAPER_NAME }
          await writeBundledDefaultWallpaper(bundledDefault, DEFAULT_WALLPAPER_VERSION)
          activeDefault = bundledDefault
        }
        let durableWallpaper: SavedWallpaper | null = null
        try {
          if (startupConfig && 'wallpaperBlob' in startupConfig && startupConfig.wallpaperBlob instanceof Blob && startupConfig.wallpaperName) {
            durableWallpaper = { blob: startupConfig.wallpaperBlob, name: startupConfig.wallpaperName }
          } else if (startupConfig) durableWallpaper = startupWallpaperFromConfig(startupConfig)
        }
        catch (error) { setStorageIssue('durable startup wallpaper decode', error) }
        const startupWallpaper = durableWallpaper ?? (activeDefault?.blob ? activeDefault : saved)
        setDefaultWallpaperName(durableWallpaper?.name ?? activeDefault?.name ?? null)
        if (startupWallpaper?.blob) {
          const url = URL.createObjectURL(startupWallpaper.blob)
          objectUrlRef.current = url
          wallpaperStartedAt.current = Date.now()
          setWallpaperMediaReady(false)
          setWallpaperUrl(url)
          setWallpaperName(startupWallpaper.name)
          setStatus(`${durableWallpaper ? 'DURABLE DEFAULT' : savedDefault?.blob ? 'DEFAULT WALLPAPER' : 'WALLPAPER'} RESTORED · ${startupWallpaper.name.toUpperCase()}`)
        } else {
          wallpaperStartedAt.current = Date.now()
          setWallpaperMediaReady(false)
          setWallpaperUrl(DEFAULT_WALLPAPER_URL)
          setWallpaperName(DEFAULT_WALLPAPER_NAME)
          setStatus('DEFAULT WALLPAPER LOADED · MOONLIT ALPINE MIRROR LAKE')
        }
      } catch (error) {
        if (!cancelled) {
          setStorageIssue('wallpaper restore', error)
          wallpaperStartedAt.current = Date.now()
          setWallpaperMediaReady(false)
          setWallpaperUrl(DEFAULT_WALLPAPER_URL)
          setWallpaperName(DEFAULT_WALLPAPER_NAME)
        }
        if (!cancelled) setStatus('WALLPAPER RESTORE ERROR · BUNDLED MOONLIT ALPINE ACTIVE')
      } finally {
        if (!cancelled) { setStartupConfigHydrated(true); setReady(true) }
      }
    }
    void restore()
    return () => { cancelled = true }
  }, [setStorageIssue])

  useEffect(() => {
    const browserTimer = window.setTimeout(() => {
      setNowPlayingStatus((current) => current === 'waiting' ? 'browser' : current)
    }, 5000)
    const listener = (data: unknown) => {
      const track = parseNowPlaying(data)
      window.clearTimeout(browserTimer)
      if (track === undefined) {
        setNowPlaying(null)
        setNowPlayingStatus('invalid')
      } else if (track === null) {
        setNowPlaying(null)
        setNowPlayingStatus('none')
      } else {
        setNowPlaying(track)
        setNowPlayingStatus('track')
      }
    }
    const previousListener = window.livelyCurrentTrack
    window.livelyCurrentTrack = listener
    return () => {
      window.clearTimeout(browserTimer)
      if (window.livelyCurrentTrack === listener) {
        if (previousListener) window.livelyCurrentTrack = previousListener
        else delete window.livelyCurrentTrack
      }
    }
  }, [])

  useEffect(() => {
    if (!startupConfigHydrated) return
    try { localStorage.setItem(WIDGET_PREF_KEY, JSON.stringify({ version: 2, enabled: enabledWidgets })); setStorageIssue('widget visibility write', null) }
    catch (error) { setStorageIssue('widget visibility write', error) }
  }, [enabledWidgets, setStorageIssue, startupConfigHydrated])

  useEffect(() => {
    if (!startupConfigHydrated) return
    try { localStorage.setItem(WIDGET_POSITION_KEY, JSON.stringify(widgetPositions)); setStorageIssue('widget positions write', null) }
    catch (error) { setStorageIssue('widget positions write', error) }
  }, [setStorageIssue, startupConfigHydrated, widgetPositions])

  useEffect(() => {
    if (!startupConfigHydrated) return
    try { localStorage.setItem(WIDGET_SCALE_KEY, JSON.stringify(widgetScales)); setStorageIssue('widget scale write', null) }
    catch (error) { setStorageIssue('widget scale write', error) }
  }, [setStorageIssue, startupConfigHydrated, widgetScales])

  useEffect(() => {
    if (!startupConfigHydrated) return
    try { localStorage.setItem(INTERFACE_SCALE_KEY, String(interfaceScale)) }
    catch { /* The current session remains scaled if storage is unavailable. */ }
  }, [interfaceScale, startupConfigHydrated])

  useEffect(() => {
    try { localStorage.setItem(QUICK_SHORTCUTS_KEY, JSON.stringify(quickShortcuts)) } catch { /* shortcuts remain usable for this session */ }
  }, [quickShortcuts])

  useEffect(() => {
    if (!startupConfigHydrated) return
    try { localStorage.setItem(WIDGET_LAYOUT_KEY, widgetLayout); setStorageIssue('widget layout write', null) }
    catch (error) { setStorageIssue('widget layout write', error) }
  }, [setStorageIssue, startupConfigHydrated, widgetLayout])

  useEffect(() => {
    if (!startupConfigHydrated) return
    if (!compactPreferencesLoadedRef.current) {
      compactPreferencesLoadedRef.current = true
      try {
        const saved = JSON.parse(localStorage.getItem(WIDGET_COMPACT_KEY) ?? 'null') as { enabled?: unknown; restore?: unknown; panelPosition?: unknown; widgetOffsets?: unknown; themeLayouts?: unknown } | null
        if (saved?.enabled === true) setWidgetsCompact(true)
        const restore = saved?.restore as CompactRestore | undefined
        if (restore && ['free', 'left', 'right', 'top', 'bottom'].includes(restore.widgetLayout) && restore.widgetPositions && typeof restore.widgetPositions === 'object') setCompactRestore(restore)
        const panel = saved?.panelPosition as CompactPanelPosition | undefined
        if (panel && Number.isFinite(panel.x) && Number.isFinite(panel.y)) setCompactPanelPosition(panel)
        if (saved?.widgetOffsets && typeof saved.widgetOffsets === 'object') setCompactWidgetOffsets(saved.widgetOffsets as CompactWidgetOffsets)
        if (saved?.themeLayouts && typeof saved.themeLayouts === 'object') setCompactThemeLayouts(saved.themeLayouts as Record<string, CompactThemeLayout>)
      } catch (error) { setStorageIssue('compact panel restore', error) }
    }
    try {
      localStorage.setItem(WIDGET_COMPACT_KEY, JSON.stringify({ enabled: widgetsCompact, restore: compactRestore, panelPosition: compactPanelPosition, widgetOffsets: compactWidgetOffsets, themeLayouts: compactThemeLayouts }))
      setStorageIssue('compact panel write', null)
    } catch (error) { setStorageIssue('compact panel write', error) }
  }, [compactPanelPosition, compactRestore, compactThemeLayouts, compactWidgetOffsets, setStorageIssue, startupConfigHydrated, widgetsCompact])

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(CONSOLE_FRAME_KEY) ?? 'null') as ConsoleFrame | null
      if (stored && [stored.x, stored.y, stored.width, stored.height].every(Number.isFinite)) {
        const width = Math.min(window.innerWidth, Math.max(260, stored.width))
        const height = Math.min(window.innerHeight, Math.max(96, stored.height))
        setConsoleFrame({
          x: Math.max(0, Math.min(window.innerWidth - width, stored.x)),
          y: Math.max(0, Math.min(window.innerHeight - height, stored.y)),
          width,
          height,
          anchor: stored.anchor === 'bottom' ? 'bottom' : 'top',
        })
      }
    } catch (error) { setStorageIssue('console frame restore', error) }
  }, [setStorageIssue])

  useEffect(() => {
    if (!startupConfigHydrated) return
    try { localStorage.setItem(LAYOUT_PRESETS_KEY, JSON.stringify(layoutPresets)); setStorageIssue('layout presets write', null) }
    catch (error) { setStorageIssue('layout presets write', error) }
  }, [layoutPresets, setStorageIssue, startupConfigHydrated])

  useEffect(() => {
    if (!startupConfigHydrated) return
    try { localStorage.setItem(THEME_PREF_KEY, theme); setStorageIssue('theme preference write', null) }
    catch (error) { setStorageIssue('theme preference write', error) }
  }, [setStorageIssue, startupConfigHydrated, theme])

  useEffect(() => {
    if (!startupConfigHydrated) return
    try {
      if (defaultTheme) localStorage.setItem(DEFAULT_THEME_PREF_KEY, defaultTheme)
      else localStorage.removeItem(DEFAULT_THEME_PREF_KEY)
    } catch (error) { setStorageIssue('default theme preference write', error) }
  }, [defaultTheme, setStorageIssue, startupConfigHydrated])

  useEffect(() => {
    let receivedValidData = false
    let staleTimer = 0
    let publishTimer = 0
    let latestReadings: LivelySystemInfo | null = null
    const browserTimer = window.setTimeout(() => {
      if (!receivedValidData) setHardwareFeed((current) => current.status === 'waiting' ? { ...current, status: 'browser' } : current)
    }, 5000)

    const publish = () => {
      publishTimer = 0
      if (!latestReadings) return
      const now = Date.now()
      hardwareLastPublishedRef.current = now
      setHardwareFeed({ status: 'live', readings: latestReadings, updatedAt: now })
    }

    const listener = (data: unknown) => {
      const readings = parseLivelySystemInfo(data)
      if (!readings) {
        if (!receivedValidData) setHardwareFeed((current) => current.status === 'waiting' ? { ...current, status: 'invalid' } : current)
        return
      }

      receivedValidData = true
      window.clearTimeout(browserTimer)
      latestReadings = readings
      window.clearTimeout(staleTimer)
      staleTimer = window.setTimeout(() => {
        setHardwareFeed((current) => current.status === 'live' ? { ...current, status: 'stale' } : current)
      }, 6000)

      const delay = 1000 - (Date.now() - hardwareLastPublishedRef.current)
      if (delay <= 0) {
        window.clearTimeout(publishTimer)
        publishTimer = 0
        publish()
      }
      else if (!publishTimer) publishTimer = window.setTimeout(publish, delay)
    }

    const previousListener = window.livelySystemInformation
    window.livelySystemInformation = listener
    return () => {
      window.clearTimeout(browserTimer)
      window.clearTimeout(staleTimer)
      window.clearTimeout(publishTimer)
      if (window.livelySystemInformation === listener) {
        if (previousListener) window.livelySystemInformation = previousListener
        else delete window.livelySystemInformation
      }
    }
  }, [])

  useEffect(() => {
    if (!startupConfigHydrated) return
    try { localStorage.setItem(VISUAL_THEME_PREF_KEY, visualTheme); setStorageIssue('visual theme preference write', null) }
    catch (error) { setStorageIssue('visual theme preference write', error) }
  }, [setStorageIssue, startupConfigHydrated, visualTheme])

  useEffect(() => {
    if (!startupConfigHydrated) return
    try { localStorage.setItem(WALLPAPER_FIT_PREF_KEY, wallpaperFit); setStorageIssue('wallpaper fit preference write', null) }
    catch (error) { setStorageIssue('wallpaper fit preference write', error) }
  }, [setStorageIssue, startupConfigHydrated, wallpaperFit])

  useEffect(() => {
    if (!startupConfigHydrated) return
    try { localStorage.setItem(ANIMATION_MIRROR_KEY, String(animationMirror)); setStorageIssue('animation preference write', null) }
    catch (error) { setStorageIssue('animation preference write', error) }
  }, [animationMirror, setStorageIssue, startupConfigHydrated])

  useEffect(() => {
    if (!startupConfigHydrated) return
    try { localStorage.setItem(SEQUENCE_MIRROR_KEY, String(sequenceMirror)); setStorageIssue('sequence preference write', null) }
    catch (error) { setStorageIssue('sequence preference write', error) }
  }, [sequenceMirror, setStorageIssue, startupConfigHydrated])

  useEffect(() => {
    if (!sequenceMirror) { setSequenceViewports(null); return }
    let active = true
    void detectSequenceViewports(brightnessToken).then((viewports) => { if (active) setSequenceViewports(viewports) })
    return () => { active = false }
  }, [brightnessToken, sequenceMirror])

  useEffect(() => {
    let active = true
    if (!brightnessToken) {
      setConnectedMonitorCount(null)
      return () => { active = false }
    }
    void detectConnectedMonitorCount(brightnessToken).then((count) => {
      if (active) setConnectedMonitorCount(count)
    })
    return () => { active = false }
  }, [brightnessToken])

  useEffect(() => {
    if (!specialEffect) return
    const duration = specialEffect.kind === 'demon' ? 2200 : specialEffect.kind === 'grimoire' ? 2050 : specialEffect.kind === 'breathing-sun' || specialEffect.kind === 'link-start' || specialEffect.kind === 'tokyo-ghoul' ? 1900 : 1700
    const timer = window.setTimeout(() => setSpecialEffect(null), duration)
    return () => window.clearTimeout(timer)
  }, [specialEffect])

  useEffect(() => {
    if (!consoleEntry) return
    const timer = window.setTimeout(() => setConsoleEntry(null), 1150)
    return () => window.clearTimeout(timer)
  }, [consoleEntry])

  useEffect(() => {
    const isInitialSaoBoot = theme === 'sao' && !booting && saoBootSequenceRef.current !== bootToken
    const isSaoCommandEntry = consoleEntry?.theme === 'sao'
    if (!isInitialSaoBoot && !isSaoCommandEntry) return
    saoBootSequenceRef.current = bootToken
    setSaoWidgetsStarting(true)
    const timer = window.setTimeout(() => setSaoWidgetsStarting(false), 1150)
    return () => window.clearTimeout(timer)
  }, [bootToken, booting, consoleEntry, theme])

  useEffect(() => {
    if (!startupConfigHydrated) return
    try {
      if (consoleFrame) localStorage.setItem(CONSOLE_FRAME_KEY, JSON.stringify(consoleFrame))
      setStorageIssue('console frame write', null)
    } catch (error) { setStorageIssue('console frame write', error) }
  }, [consoleFrame, setStorageIssue, startupConfigHydrated])

  useEffect(() => {
    if (!enabledWidgets.some((id) => id === 2 || id === 3)) return
    const timer = window.setInterval(() => setClockNow(new Date()), 1000)
    return () => window.clearInterval(timer)
  }, [enabledWidgets])

  useEffect(() => {
    if (!hardwareFeed.readings || hardwareFeed.status === 'invalid') return
    const readings = hardwareFeed.readings
    const ram = readings.ramTotalMb && readings.ramAvailableMb != null ? (readings.ramTotalMb - readings.ramAvailableMb) / readings.ramTotalMb * 100 : null
    setHardwareHistory((current) => {
      const append = (values: number[], value: number | null) => value === null ? values : [...values, Math.max(0, Math.min(100, value))].slice(-24)
      return { cpu: append(current.cpu, readings.cpuPercent), gpu: append(current.gpu, readings.gpu3dPercent), ram: append(current.ram, ram) }
    })
  }, [hardwareFeed])

  useEffect(() => () => {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
  }, [])

  useEffect(() => () => {
    widgetExitTimersRef.current.forEach((timer) => window.clearTimeout(timer))
    widgetExitTimersRef.current.clear()
  }, [])


  // Enter the animated standby HUD after five minutes
  // without interaction with the console or widgets.
  useEffect(() => {
    if (!ready || booting || standbyActive) return

    const IDLE_TIMEOUT = 15 * 1000
    let idleTimer: number | undefined

    const enterIdleStandby = () => {
      finishingBootRef.current = false
      setRevealComplete(false)
      setBootStage('standby')
      setStandbyActive(true)
      setBooting(true)
      setStatus('AUTO STANDBY · AWAITING INPUT')
    }

    const resetIdleTimer = () => {
      window.clearTimeout(idleTimer)
      idleTimer = window.setTimeout(
        enterIdleStandby,
        IDLE_TIMEOUT
      )
    }

    const onInteraction = (event: Event) => {
      const target = event.target

      if (!(target instanceof Element)) return

      if (
        target.closest(
          '.command-console, .system-widget, .compact-panel-handle'
        )
      ) {
        resetIdleTimer()
      }
    }

    const events = [
      'pointerdown',
      'pointermove',
      'keydown',
      'wheel',
      'input',
    ] as const

    events.forEach(eventName => {
      document.addEventListener(
        eventName,
        onInteraction,
        true
      )
    })

    resetIdleTimer()

    return () => {
      window.clearTimeout(idleTimer)

      events.forEach(eventName => {
        document.removeEventListener(
          eventName,
          onInteraction,
          true
        )
      })
    }
  }, [ready, booting, standbyActive])


  useEffect(() => {
    if (!ready) return
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    finishingBootRef.current = false
    setBootStage('sequence')
    setStandbyActive(false)
    setRevealComplete(!wallpaperUrl || reducedMotion)

    if (reducedMotion) {
      setBooting(false)
      return
    }

    setBooting(true)
  }, [ready, bootToken, wallpaperUrl])

  useEffect(() => {
    if (!ready || !booting || standbyActive || finishingBootRef.current || !revealComplete || (wallpaperUrl && !wallpaperMediaReady)) return
    finishingBootRef.current = true
    setBooting(false)
  }, [ready, booting, revealComplete, wallpaperMediaReady, wallpaperUrl])

  // A selected image is decoded before a boot starts. This recovery only runs
  // when a lifecycle race prevents either the mounted image or the timeline
  // from reporting completion; it keeps the console reachable on failure.
  useEffect(() => {
    if (!ready || !booting || standbyActive) return
    const request = wallpaperRequestRef.current
    const timeout = window.setTimeout(() => {
      if (request !== wallpaperRequestRef.current || finishingBootRef.current) return
      setStatus('BOOT RECOVERY · REVEAL TIMEOUT')
      setWallpaperMediaReady(true)
      setRevealComplete(true)
    }, 15000)
    return () => window.clearTimeout(timeout)
  }, [bootToken, booting, ready, standbyActive])

  const openFilePicker = () => {
    setStatus('SELECT A WALLPAPER FILE')
    fileInputRef.current?.click()
  }

  const report = (lines: string[]) => setConsoleLines(lines)
  const onLaunchShortcut = (shortcut: QuickShortcut) => {
    report(['QUICK LAUNCH', `${shortcut.label.toUpperCase()} ............ PLACEHOLDER`, 'LAUNCH INTEGRATION COMING SOON'])
    setStatus(`QUICK LAUNCH · ${shortcut.label.toUpperCase()} · COMING SOON`)
  }
  const activateVisualEffect = (selected: VisualTheme) => {
    setVisualTheme(selected)
    report(selected === 'off' ? ['VISUAL EFFECTS', 'ALL ATMOSPHERIC LAYERS .... OFF'] : ['VISUAL EFFECT UPDATED', `ACTIVE ................. ${selected.toUpperCase()}`, 'WALLPAPER AND SYSTEM THEME .. UNCHANGED'])
    setStatus(`VISUAL THEME · ${selected.toUpperCase()}`)
  }
  const openWidget = (id: number) => {
    if (id === 2 || id === 3) setClockNow(new Date())
    const timer = widgetExitTimersRef.current.get(id)
    if (timer !== undefined) window.clearTimeout(timer)
    widgetExitTimersRef.current.delete(id)
    setLeavingWidgetIds((current) => current.filter((widgetId) => widgetId !== id))
    setRenderedWidgets((current) => [...new Set([...current, id])])
    setEnabledWidgets((current) => [...new Set([...current, id])])
    setOpeningWidgetIds((current) => [...new Set([...current, id])])
    window.setTimeout(() => setOpeningWidgetIds((current) => current.filter((widgetId) => widgetId !== id)), 950)
  }
  const closeWidget = (id: number) => {
    setEnabledWidgets((current) => current.filter((widgetId) => widgetId !== id))
    if (!renderedWidgets.includes(id)) return
    setLeavingWidgetIds((current) => [...new Set([...current, id])])
    const existingTimer = widgetExitTimersRef.current.get(id)
    if (existingTimer !== undefined) window.clearTimeout(existingTimer)
    const timer = window.setTimeout(() => {
      setRenderedWidgets((current) => current.filter((widgetId) => widgetId !== id))
      setLeavingWidgetIds((current) => current.filter((widgetId) => widgetId !== id))
      widgetExitTimersRef.current.delete(id)
    }, 300)
    widgetExitTimersRef.current.set(id, timer)
  }
  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600).toString().padStart(2, '0')
    const minutes = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0')
    const remainder = Math.floor(seconds % 60).toString().padStart(2, '0')
    return `${hours}:${minutes}:${remainder}`
  }

  const activateWallpaper = async (selection: SavedWallpaper, persistSelection = true) => {
    const nextUrl = URL.createObjectURL(selection.blob)
    try {
      await decodeImage(nextUrl)
      if (persistSelection) await saveWallpaper(selection, false)
      const previousUrl = objectUrlRef.current
      objectUrlRef.current = nextUrl
      wallpaperStartedAt.current = Date.now()
      wallpaperRequestRef.current += 1
      // Set this before mounting the keyed image. Doing it in a later effect
      // can overwrite a synchronous cached-image load and deadlock the reveal.
      setWallpaperMediaReady(false)
      setWallpaperUrl(nextUrl)
      setWallpaperName(selection.name)
      setRevealComplete(false)
      setBooting(true)
      setStatus(`WALLPAPER ACTIVE · ${selection.name.toUpperCase()}`)
      setBootToken((token) => token + 1)
      if (previousUrl) URL.revokeObjectURL(previousUrl)
    } catch (error) {
      URL.revokeObjectURL(nextUrl)
      setStatus(error instanceof Error ? error.message.toUpperCase() : 'WALLPAPER LOAD FAILED')
    }
  }

  const submitCommand = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const submittedCommand = command.trim()
    const normalized = submittedCommand.toLowerCase().replace(/^\/+/, '').replace(/\s+/g, ' ')
    if (submittedCommand && !/^sys\s+brightness\s+pair\s+/i.test(submittedCommand)) commandHistoryRef.current.push(submittedCommand)
    historyIndexRef.current = commandHistoryRef.current.length
    commandDraftRef.current = ''
    setCommand('')

    const args = normalized.replace(/^sys\s*/, '').split(' ').filter(Boolean)
    const [domain, action] = args
    const activateTheme = (nextTheme: ThemeId, effect: SpecialEffect['kind']) => {
      const isThemeChange = theme !== nextTheme
      setTheme(nextTheme)
      if (isThemeChange) setConsoleEntry({ theme: nextTheme, id: ++effectIdRef.current })
      setSpecialEffect({ kind: effect, id: ++effectIdRef.current })
    }
    const persistDurableWallpaper = async (selection: SavedWallpaper | null) => {
      if (!brightnessToken) throw new Error('HELPER AUTHORIZATION REQUIRED · PAIR ONCE WITH SYS BRIGHTNESS PAIR <TOKEN>')
      const patch: Partial<StartupConfiguration> = selection
        ? { wallpaperName: selection.name, wallpaperType: selection.blob.type || 'application/octet-stream', wallpaperData: await blobToBase64(selection.blob) }
        : { wallpaperName: null, wallpaperType: null, wallpaperData: null }
      const result = await saveDurableStartupConfiguration(brightnessToken, patch)
      if (!result.saved) throw new Error('WINDOWS HELPER DID NOT CONFIRM THE CONFIGURATION SAVE')
    }
    const persistDurableTheme = async (nextTheme: ThemeId) => {
      if (!brightnessToken) throw new Error('HELPER AUTHORIZATION REQUIRED · PAIR ONCE WITH SYS BRIGHTNESS PAIR <TOKEN>')
      const result = await saveDurableStartupConfiguration(brightnessToken, { theme: nextTheme })
      if (!result.saved) throw new Error('WINDOWS HELPER DID NOT CONFIRM THE CONFIGURATION SAVE')
    }

    if (domain === 'pair' && args.length === 1) {
      report([
        'PAIRING RECOVERY STARTED',
        'CHECKING THE WINDOWS HELPER AND EXISTING LOCAL CREDENTIALS',
        'NO CREDENTIALS ARE DISPLAYED, COPIED OR GENERATED',
      ])
      setStatus('PAIRING RECOVERY IN PROGRESS')
      const recovery = await credentialRecoveryRef.current()
      if (recovery === 'restored') {
        report(['PAIRING RECOVERY COMPLETE', 'AUTHENTICATED HELPER SESSION RESTORED'])
        setStatus('PAIRING RECOVERY COMPLETE')
      } else if (recovery === 'helper-unavailable') {
        report(['PAIRING RECOVERY WAITING', 'WINDOWS HELPER IS UNAVAILABLE OR RESTARTING', 'RECOVERY WILL RETRY AUTOMATICALLY'])
        setStatus('PAIRING RECOVERY WAITING FOR HELPER')
      } else {
        report(['PAIRING RECOVERY PENDING', 'NO VALID EXISTING CREDENTIAL WAS AVAILABLE', 'RUN SYS BRIGHTNESS PAIR <TOKEN> ONLY AFTER EXPLICIT LOCAL AUTHORIZATION'])
        setStatus('PAIRING RECOVERY REQUIRES AUTHORIZATION')
      }
    } else if (domain === 'admin' && action === 'sys' && args[2] === 'config' && args[3] === 'save' && args.length === 4) {
      if (!wallpaperUrl) {
        report(['STARTUP CONFIGURATION NOT SAVED', 'LOAD THE WALLPAPER YOU WANT FIRST.', 'USE SYS WALLPAPER SELECT.'])
        setStatus('STARTUP CONFIGURATION NEEDS A WALLPAPER')
      } else {
        try {
          const response = await fetch(wallpaperUrl)
          if (!response.ok) throw new Error('ACTIVE WALLPAPER BYTES COULD NOT BE READ')
          const blob = await response.blob()
          if (!brightnessToken) throw new Error('HELPER AUTHORIZATION REQUIRED · PAIR ONCE WITH SYS BRIGHTNESS PAIR <TOKEN>')
          const settings = {
            enabledWidgets,
            widgetPositions,
            widgetScales,
            interfaceScale,
            widgetLayout,
            widgetsCompact,
            compactRestore,
            compactPanelPosition,
            compactWidgetOffsets,
            compactThemeLayouts,
            layoutPresets,
            wallpaperFit,
            animationMirror,
            sequenceMirror,
            visualTheme,
            consoleFrame,
          }
          const saved = await saveDurableStartupConfiguration(brightnessToken, {
            wallpaperName,
            wallpaperType: blob.type || 'application/octet-stream',
            wallpaperData: await blobToBase64(blob),
            theme,
            settings,
            installIntoLively: true,
          })
          if (!saved.saved) throw new Error('HELPER DID NOT CONFIRM THE DURABLE CONFIGURATION SAVE')
          const verified = await readDurableStartupConfiguration()
          if (!verified || verified.theme !== theme || verified.wallpaperName !== wallpaperName ||
            verified.settings?.animationMirror !== animationMirror || verified.settings?.sequenceMirror !== sequenceMirror) {
            throw new Error('HELPER CONFIGURATION READBACK DID NOT MATCH THE SAVED STATE')
          }
          try { await writeDefaultWallpaper({ name: wallpaperName, blob }) }
          catch (error) { setStorageIssue('startup wallpaper browser cache write', error) }
          setDefaultWallpaperName(wallpaperName)
          setDefaultTheme(theme)
          setCredentialBootstrapAvailable(true)
          const saveReport = ['STARTUP CONFIGURATION SAVED + READBACK VERIFIED', `WALLPAPER .............. ${wallpaperName.toUpperCase()}`, `THEME .................. ${THEME_CHOICES.find((choice) => choice.id === theme)?.label ?? theme.toUpperCase()}`, 'WIDGET LAYOUT + SETTINGS ........ SAVED', `ACTIVATION MIRROR ............... ${animationMirror ? 'ON' : 'OFF'} + SAVED`, `SEQUENCE MIRROR ................. ${sequenceMirror ? 'ON' : 'OFF'} + SAVED`]
          saveReport.push(saved.installedProjectUpdated ? 'INSTALLED LIVELY PROJECT UPDATED' : 'INSTALLED LIVELY PROJECT UPDATE NOT REQUESTED')
          saveReport.push(saved.reloadRequested ? 'LIVELY RELOAD REQUEST ACCEPTED' : `LIVELY RELOAD NOT REQUESTED · ${(saved.reloadMessage ?? 'CHECK LIVELY INSTALLATION').toUpperCase()}`)
          report(saveReport)
          setStatus(saved.reloadRequested ? 'STARTUP CONFIG SAVED · LIVELY RELOADING' : 'STARTUP CONFIG SAVED · RELOAD UNAVAILABLE')
        } catch (error) {
          const message = error instanceof Error ? error.message : 'STARTUP CONFIGURATION SAVE FAILED'
          report(['STARTUP CONFIGURATION SAVE FAILED', message.toUpperCase(), 'NO DURABLE SAVE WAS CONFIRMED.'])
          setStatus('STARTUP CONFIGURATION SAVE FAILED')
        }
      }
    } else if (domain === 'lock' && args.length === 1) {
      if (!brightnessToken) {
        report(['WINDOWS LOCK UNAVAILABLE', 'INSTALL THE WINDOWS HELPER', 'THEN PAIR · SYS BRIGHTNESS PAIR <TOKEN>'])
        setStatus('WINDOWS HELPER NEEDS PAIRING')
      } else {
        try {
          const result = await lockWindowsSession(brightnessToken)
          report(['ELUCIDATOR // SECURITY', result.message, 'WORKSTATION LOCK REQUEST SENT'])
          setStatus('WINDOWS SESSION LOCKING')
        } catch (error) {
          const message = error instanceof Error ? error.message : 'WINDOWS LOCK REQUEST FAILED'
          report(['WINDOWS LOCK FAILED', message.toUpperCase()])
          setStatus('WINDOWS LOCK FAILED')
        }
      }
    } else if (domain === 'storage' && action === 'status' && args.length === 2) {
      let localStorageError: string | null = null
      try {
        const probeKey = `__elucidator_storage_probe_${Date.now()}_${Math.random().toString(36).slice(2)}`
        localStorage.setItem(probeKey, 'ok')
        if (localStorage.getItem(probeKey) !== 'ok') throw new Error('Storage probe value did not round-trip')
        localStorage.removeItem(probeKey)
      } catch (error) {
        localStorageError = describeStorageError(error)
      }

      let savedDefault: SavedWallpaper | undefined
      let durableConfigStatus: string
      let durableConfigName: string | null = null
      try {
        const config = await readDurableStartupConfiguration()
        durableConfigStatus = config ? 'AVAILABLE · LOCALAPPDATA' : 'NOT SAVED'
        durableConfigName = config?.wallpaperName ?? null
        setStorageIssue('durable startup configuration diagnostic', null)
      } catch (error) {
        durableConfigStatus = 'READ FAILED'
        setStorageIssue('durable startup configuration diagnostic', error)
      }
      let databaseStatus = 'OPEN FAILED'
      let databaseError: string | null = null
      let tokenBackupExists = false
      try {
        const database = await openWallpaperDatabase()
        databaseStatus = 'OPEN'
        database.close()
        const result = await readDefaultWallpaper()
        savedDefault = result
        databaseStatus = 'OPEN · READ OK'
      } catch (error) {
        databaseError = describeStorageError(error)
      }
      try {
        tokenBackupExists = Boolean(await readBrightnessTokenBackup())
        setStorageIssue('brightness token backup diagnostic', null)
      } catch (error) {
        setStorageIssue('brightness token backup diagnostic', error)
      }

      const localRead = (key: string) => {
        try { return localStorage.getItem(key) }
        catch (error) { localStorageError ??= describeStorageError(error); return null }
      }
      const localTokenExists = Boolean(localRead('project-elucidator-brightness-token'))
      const tokenExists = localTokenExists || tokenBackupExists || credentialBootstrapAvailable || Boolean(brightnessToken)
      const savedThemeExists = Boolean(localRead(DEFAULT_THEME_PREF_KEY) ?? localRead(THEME_PREF_KEY))
      const widgetKeys = [WIDGET_PREF_KEY, WIDGET_POSITION_KEY, WIDGET_SCALE_KEY, INTERFACE_SCALE_KEY, WIDGET_LAYOUT_KEY, LAYOUT_PRESETS_KEY]
      const widgetPrefsExist = widgetKeys.some((key) => Boolean(localRead(key)))
      const savedPrefCount = STORAGE_PREF_KEYS.filter((key) => Boolean(localRead(key))).length
      const restoreIssues = { ...startupStorageErrors, ...storageErrorsRef.current }
      if (localStorageError) restoreIssues['localStorage diagnostic'] = localStorageError
      if (databaseError) {
        restoreIssues['IndexedDB diagnostic'] = databaseError
        setStorageIssue('IndexedDB diagnostic', databaseError)
      } else setStorageIssue('IndexedDB diagnostic', null)
      const issueLines = Object.entries(restoreIssues).map(([area, error]) => `ERROR · ${area.toUpperCase()} · ${error}`)

      report([
        'STORAGE STATUS · TOKEN VALUES ARE NEVER SHOWN',
        `ORIGIN ................. ${window.location.origin || 'FILE ORIGIN'}`,
        `PAGE PATH .............. ${window.location.pathname}`,
        `LOCAL STORAGE .......... ${localStorageError ? 'READ/WRITE FAILED' : 'READ/WRITE OK'}`,
        `INDEXEDDB .............. ${databaseStatus}`,
        `PAIRING TOKEN .......... ${tokenExists ? 'PRESENT' : 'MISSING'}`,
        `PRIVATE BOOTSTRAP ....... ${credentialBootstrapAvailable ? 'AVAILABLE' : 'MISSING'}`,
        `SAME-PROFILE TOKEN COPY . ${tokenBackupExists ? 'PRESENT IN INDEXEDDB' : 'NOT STORED'} · NOT CROSS-PROFILE`,
        `DEFAULT WALLPAPER ...... ${savedDefault?.name ?? 'NOT STORED'}`,
        `DURABLE STARTUP ........ ${durableConfigStatus}${durableConfigName ? ` · ${durableConfigName}` : ''}`,
        `STORED IMAGE ........... ${savedDefault?.blob instanceof Blob && savedDefault.blob.size > 0 ? `AVAILABLE · ${savedDefault.blob.size} BYTES` : 'MISSING'}`,
        `SAVED THEME PREF ....... ${savedThemeExists ? 'AVAILABLE' : 'MISSING'}`,
        `WIDGET PREFS ........... ${widgetPrefsExist ? 'AVAILABLE' : 'MISSING'}`,
        `SAVED PREFS ............ ${savedPrefCount}/${STORAGE_PREF_KEYS.length} KEYS PRESENT`,
        `RESTORE ERRORS ......... ${issueLines.length ? issueLines.join(' · ') : 'NONE REPORTED'}`,
      ])
      setStatus(`STORAGE DIAGNOSTIC · ${localStorageError || databaseError || issueLines.length ? 'ERROR' : 'READY'}`)
    } else if (domain === 'brightness') {
      const listMonitors = (monitors: BrightnessMonitor[]) => monitors.length
        ? monitors.map((monitor) => `DISPLAY ${monitor.id} · ${monitor.name.toUpperCase()} · ${monitor.supported && monitor.brightness !== null ? `${monitor.brightness}%` : 'DDC/CI UNAVAILABLE'}`)
        : ['NO DDC/CI MONITORS DETECTED']
      const helperInstructions = ['INSTALL HELPER · scripts/install-brightness-helper.ps1', 'THEN PAIR · SYS BRIGHTNESS PAIR <TOKEN>']

      if (action === 'pair' && args.length === 3) {
        const token = submittedCommand.match(/^(?:sys\s+)?brightness\s+pair\s+(\S+)$/i)?.[1] ?? args[2]
        if (!/^[A-Za-z0-9_-]{40,60}$/.test(token)) {
          report(['BRIGHTNESS PAIRING ERROR', 'TOKEN FORMAT INVALID · COPY THE TOKEN FROM THE HELPER INSTALLER'])
          setStatus('BRIGHTNESS PAIRING FAILED')
        } else {
          try {
            const verified = await validateBrightnessToken(token)
            const bootstrap = await persistPrivateCredentialBootstrap(token)
            if (!bootstrap.saved) throw new Error('PRIVATE LOCAL BOOTSTRAP WAS NOT CONFIRMED')
            if (!saveBrightnessToken(token)) throw new Error('BROWSER STORAGE IS UNAVAILABLE')
            setBrightnessToken(token)
            setConnectedMonitorCount(verified.monitors.length)
            setCredentialBootstrapAvailable(true)
            await writeBrightnessTokenBackup(token)
            setStorageIssue('brightness token backup write', null)
            setStorageIssue('brightness credential validation', null)
            report(['DDC/CI BRIDGE PAIRED + VALIDATED', `DDC/CI DISPLAYS ........ ${verified.monitors.length}`, 'PRIVATE LOCAL BOOTSTRAP SAVED', 'RUN SYS BRIGHTNESS STATUS TO READ MONITORS'])
            setStatus('BRIGHTNESS PAIRED · PRIVATE BOOTSTRAP SAVED')
          } catch (error) {
            const message = error instanceof Error ? error.message : 'PAIRING VALIDATION FAILED'
            setStorageIssue('brightness credential pairing', error)
            report(['BRIGHTNESS PAIRING FAILED', 'TOKEN WAS NOT SAVED', message.toUpperCase()])
            setStatus('BRIGHTNESS PAIRING FAILED')
          }
        }
      } else if (action === 'unpair' && args.length === 2) {
        if (brightnessToken) {
          try { await removePrivateCredentialBootstrap(brightnessToken) }
          catch (error) {
            const message = error instanceof Error ? error.message : 'PRIVATE BOOTSTRAP COULD NOT BE REMOVED'
            report(['UNPAIRING NOT COMPLETED', message.toUpperCase(), 'TOKEN REMAINS ACTIVE'])
            setStatus('BRIGHTNESS UNPAIR FAILED')
            return
          }
        }
        const removedLocally = saveBrightnessToken(null)
        setBrightnessToken('')
        setCredentialBootstrapAvailable(false)
        try {
          await writeBrightnessTokenBackup(null)
          setStorageIssue('brightness token backup write', null)
        } catch (error) { setStorageIssue('brightness token backup write', error) }
        if (!removedLocally) setStorageIssue('brightness token removal', new Error('Could not remove token from localStorage'))
        report(['DDC/CI BRIDGE UNPAIRED', 'LOCAL TOKEN REMOVED FROM THIS APP PROFILE'])
        setStatus('BRIGHTNESS HELPER UNPAIRED')
      } else if ((!action || action === 'status' || action === 'list') && args.length <= 2) {
        if (!brightnessToken) {
          report(['DDC/CI BRIGHTNESS CONTROL', ...helperInstructions])
          setStatus('BRIGHTNESS HELPER NEEDS PAIRING')
        } else {
          try {
            const result = await readBrightnessMonitors(brightnessToken)
            setConnectedMonitorCount(result.monitors.length)
            report(['MONITOR BRIGHTNESS STATUS', ...listMonitors(result.monitors), 'COMMAND · SYS BRIGHTNESS <0–100>', 'PER DISPLAY · SYS BRIGHTNESS MONITOR <ID> <0–100>'])
            setStatus('DDC/CI STATUS · ' + result.monitors.length + ' MONITOR(S)')
          } catch (error) {
            const message = error instanceof Error ? error.message : 'BRIGHTNESS HELPER UNAVAILABLE'
            report(['BRIGHTNESS STATUS UNAVAILABLE', message.toUpperCase(), ...(message.includes('NOT PAIRED') ? helperInstructions : [])])
            setStatus('BRIGHTNESS HELPER UNAVAILABLE')
          }
        }
      } else if (action === 'help' && args.length === 2) {
        report(['DDC/CI BRIGHTNESS COMMANDS', 'SYS BRIGHTNESS STATUS · SHOW DISPLAY LEVELS', 'SYS BRIGHTNESS <0–100> · SET ALL COMPATIBLE DISPLAYS', 'SYS BRIGHTNESS MONITOR <ID> <0–100> · SET ONE', 'SYS BRIGHTNESS PAIR <TOKEN> · CONNECT THE WINDOWS HELPER', 'SYS BRIGHTNESS UNPAIR · REMOVE THE STORED TOKEN'])
        setStatus('BRIGHTNESS COMMAND HELP')
      } else {
        const allLevel = action !== undefined && /^\d{1,3}$/.test(action) && args.length === 2 ? Number(action) : null
        const oneLevel = action === 'monitor' && args.length === 4 && /^\d+$/.test(args[2]) && /^\d{1,3}$/.test(args[3])
          ? { id: Number(args[2]), brightness: Number(args[3]) }
          : null
        const brightness = allLevel ?? oneLevel?.brightness
        if (brightness === undefined || brightness === null || brightness < 0 || brightness > 100 || (oneLevel && oneLevel.id < 1)) {
          report(['BRIGHTNESS COMMAND ERROR', 'USE SYS BRIGHTNESS HELP'])
          setStatus('BRIGHTNESS COMMAND ERROR')
        } else if (!brightnessToken) {
          report(['DDC/CI BRIDGE NOT PAIRED', ...helperInstructions])
          setStatus('BRIGHTNESS HELPER NEEDS PAIRING')
        } else {
          try {
            const result = await changeBrightness(brightnessToken, brightness, oneLevel?.id ?? null)
            report(['DDC/CI RESPONSE · VERIFY THE PANEL VISUALLY', result.message, ...listMonitors(result.monitors)])
            setStatus(result.message)
          } catch (error) {
            const message = error instanceof Error ? error.message : 'BRIGHTNESS CHANGE FAILED'
            report(['BRIGHTNESS CHANGE FAILED', message.toUpperCase()])
            setStatus('BRIGHTNESS CHANGE FAILED')
          }
        }
      }
    } else if (domain === 'visual') {
      if (!action || action === 'list') {
        report(['VISUAL THEMES', ...VISUAL_THEMES.map((item) => (item === visualTheme ? 'ACTIVE ' : 'AVAILABLE') + ' Â· VISUAL ' + item.toUpperCase()), 'SELECT ONE Â· VISUAL <THEME>'])
        setStatus('VISUAL THEMES Â· ' + visualTheme.toUpperCase() + ' ACTIVE')
      } else if (action === 'status' && args.length === 2) {
        report(['VISUAL THEME STATUS', 'ACTIVE ................. ' + visualTheme.toUpperCase(), 'INDEPENDENT OF WALLPAPER AND SYSTEM THEME'])
        setStatus('VISUAL THEME Â· ' + visualTheme.toUpperCase())
      } else if (VISUAL_THEMES.includes(action as VisualTheme) && args.length === 2) {
        const selected = action as VisualTheme
        activateVisualEffect(selected)
      } else {
        report(['VISUAL COMMAND ERROR', 'USAGE Â· VISUAL [LIST|STATUS|HAZE|RAIN|LIGHTNING|PARTICLES|VIGNETTE|OFF]'])
        setStatus('VISUAL COMMAND ERROR')
      }
    } else if (domain === 'theme' && action === 'default') {
      const defaultAction = args[2]
      if (defaultAction === 'set' && args.length === 3) {
        try {
          await persistDurableTheme(theme)
          setDefaultTheme(theme)
          report(['DEFAULT SYSTEM THEME SAVED', `STARTUP THEME .......... ${THEME_CHOICES.find((choice) => choice.id === theme)?.label ?? theme.toUpperCase()}`, 'WINDOWS HELPER CONFIRMED · LOCALAPPDATA CONFIG WRITTEN'])
          setStatus(`STARTUP THEME SET · ${theme.toUpperCase()}`)
        } catch (error) {
          const message = error instanceof Error ? error.message : 'DURABLE THEME SAVE FAILED'
          setDefaultTheme(theme)
          report(['DURABLE THEME SAVE FAILED', message.toUpperCase(), 'BROWSER PROFILE CACHE UPDATED ONLY · NO HELPER CONFIRMATION'])
          setStatus('DEFAULT THEME SAVED TO BROWSER CACHE ONLY')
        }
      } else if (defaultAction === 'select' && args.length === 3) {
        report([
          'SELECT STARTUP SYSTEM THEME',
          ...THEME_CHOICES.map((choice, index) => String(index + 1).padStart(2, '0') + ' · ' + choice.label + (choice.status === 'wip' ? ' · WIP' : '') + ' · ' + choice.command.toUpperCase() + (choice.id === defaultTheme ? ' · CURRENT DEFAULT' : '')),
          'SET ONE · SYS THEME DEFAULT SELECT <NUMBER OR THEME NAME>',
        ])
        setStatus('CHOOSE A SAVED STARTUP THEME')
      } else if (defaultAction === 'select' && args.length > 3) {
        const requested = args.slice(3).join(' ')
        const number = /^\d+$/.test(requested) ? Number(requested) : 0
        const selected = number > 0 ? THEME_CHOICES[number - 1]?.id : resolveThemeChoice(requested)
        if (!selected) {
          report(['DEFAULT THEME NOT FOUND', 'RUN SYS THEME DEFAULT SELECT TO VIEW AVAILABLE THEMES.'])
          setStatus('DEFAULT THEME SELECTION INVALID')
        } else {
          try {
            await persistDurableTheme(selected)
            setDefaultTheme(selected)
            const label = THEME_CHOICES.find((choice) => choice.id === selected)?.label ?? selected.toUpperCase()
            report(['DEFAULT SYSTEM THEME UPDATED', `STARTUP THEME .......... ${label}`, 'WINDOWS HELPER CONFIRMED · NEW DEFAULT APPLIES ON NEXT START'])
            setStatus(`STARTUP THEME SET · ${selected.toUpperCase()}`)
          } catch (error) {
            const message = error instanceof Error ? error.message : 'DURABLE THEME SAVE FAILED'
            setDefaultTheme(selected)
            report(['DURABLE THEME SAVE FAILED', message.toUpperCase(), 'BROWSER PROFILE CACHE UPDATED ONLY · NO HELPER CONFIRMATION'])
            setStatus('DEFAULT THEME SAVED TO BROWSER CACHE ONLY')
          }
        }
      } else {
        report(['SYSTEM THEME DEFAULT', `ACTIVE DEFAULT ......... ${defaultTheme ? defaultTheme.toUpperCase() : 'NONE · LAST ACTIVE THEME'}`, 'USE · SET | SELECT'])
        setStatus(defaultTheme ? `STARTUP THEME · ${defaultTheme.toUpperCase()}` : 'NO CUSTOM STARTUP THEME')
      }
    } else if (domain === 'theme' && action === 'list' && args.length === 2) {
      report(['ELUCIDATOR THEMES', ...THEME_SYSTEMS.map((system) => {
        const state = system.id === theme ? (system.status === 'wip' ? 'ACTIVE · WIP' : 'ACTIVE') : system.status.toUpperCase()
        return state + ' · ' + system.label + ' · SYS THEME ACTIVATE ' + system.command.toUpperCase()
      }), 'SELECT A THEME WITH ITS SYS COMMAND OR SYS THEME ACTIVATE.'])
      setStatus(`${THEME_SYSTEMS.length} THEME SYSTEMS REGISTERED`)
    } else if (domain === 'theme' && action === 'activate') {
      const selectedId = resolveThemeId(args.slice(2).join(' '))
      const selectedSystem = THEME_SYSTEMS.find((system) => system.id === selectedId)
      if (!selectedSystem) {
        report(['THEME ACTIVATION ERROR', 'USE SYS THEME ACTIVATE <THEME>', 'RUN SYS THEME LIST TO VIEW AVAILABLE SYSTEMS.'])
        setStatus('THEME ACTIVATION COMMAND INVALID')
      } else {
        const isThemeChange = theme !== selectedSystem.id
        setTheme(selectedSystem.id)
        setNightStealth(false)
        if (isThemeChange) setConsoleEntry({ theme: selectedSystem.id, id: ++effectIdRef.current })
        setSpecialEffect(selectedSystem.activationEffect
          ? { kind: selectedSystem.activationEffect, id: ++effectIdRef.current }
          : { kind: 'theme-activation', id: ++effectIdRef.current })
        // Theme defaults are only for an untouched right dock. A chosen dock
        // or captured free positions are layout preferences, not theme chrome.
        if (selectedSystem.defaultWidgetLayout && widgetLayout === 'right' && Object.keys(widgetPositions).length === 0) {
          setWidgetLayout(selectedSystem.defaultWidgetLayout)
        }
        report(selectedSystem.activationResponse)
        setStatus(`${selectedSystem.label} ACTIVATED`)
      }
    } else if (domain === 'animation' && action === 'mirror' && args.length <= 3 && (!args[2] || ['on', 'off', 'status'].includes(args[2]))) {
      if (args[2] === 'off') {
        setAnimationMirror(false)
        report(['ACTIVATION MIRROR DISABLED', 'THEME ANIMATIONS WILL PLAY ONCE PER ACTIVATION.'])
        setStatus('ACTIVATION MIRROR DISABLED')
      } else {
        const monitorCount = await detectConnectedMonitorCount(brightnessToken)
        setConnectedMonitorCount(monitorCount)
        if (args[2] === 'status') {
          const state = animationMirror
            ? monitorCount === 2 ? 'READY ON TWO DISPLAYS' : monitorCount === null ? 'WAITING FOR DDC/CI DISPLAY COUNT' : `INACTIVE · ${monitorCount} DISPLAY(S) DETECTED`
            : 'DISABLED'
          report(['ACTIVATION MIRROR STATUS', `SETTING ................. ${animationMirror ? 'ON' : 'OFF'}`, `DDC/CI DISPLAYS ......... ${monitorCount ?? 'UNKNOWN'}`, `MIRROR STATE ............ ${state}`])
          setStatus(`ACTIVATION MIRROR · ${state}`)
        } else {
          const nextMirror = args[2] === 'on' ? true : !animationMirror
          setAnimationMirror(nextMirror)
          const state = !nextMirror ? 'DISABLED' : monitorCount === 2
            ? 'READY WHEN WALLPAPER SPANS BOTH DISPLAYS'
            : monitorCount === null ? 'ARMED · PAIR DDC/CI TO VERIFY DISPLAY COUNT' : `ARMED · WAITING FOR EXACTLY 2 DISPLAYS (FOUND ${monitorCount})`
          report(['ACTIVATION MIRROR', `SETTING ................. ${nextMirror ? 'ON' : 'OFF'}`, `DDC/CI DISPLAYS ......... ${monitorCount ?? 'UNKNOWN'}`, `MIRROR STATE ............ ${state}`])
          setStatus(`ACTIVATION MIRROR · ${state}`)
        }
      }
    } else if (domain === 'sequence' && action === 'mirror' && args.length <= 3 && (!args[2] || ['on', 'off', 'status'].includes(args[2]))) {
      if (args[2] === 'off') {
        setSequenceMirror(false)
        setSequenceViewports(null)
        report(['SEQUENCE MIRROR DISABLED', 'CINEMATIC BOOT WILL USE THE FULL LIVELY SPAN.'])
        setStatus('SEQUENCE MIRROR DISABLED')
      } else {
        const viewports = await detectSequenceViewports(brightnessToken)
        setSequenceViewports(viewports)
        if (args[2] === 'status') {
          const state = !sequenceMirror ? 'DISABLED' : viewports ? 'READY · TWO DISPLAY RECTANGLES' : 'SAFE FALLBACK · DISPLAY GEOMETRY UNAVAILABLE'

          report([
            'SEQUENCE MIRROR STATUS',
            `SETTING ................. ${sequenceMirror ? 'ON' : 'OFF'}`,
            `DISPLAY GEOMETRY ....... ${viewports ? 'TWO SCREENS RESOLVED' : 'UNAVAILABLE'}`,
            `MIRROR STATE ............ ${state}`,
            `VIEWPORT WIDTH .......... ${window.innerWidth}`,
            `VIEWPORT HEIGHT ......... ${window.innerHeight}`,
            `DEVICE PIXEL RATIO ...... ${window.devicePixelRatio}`,
            `PAGE PROTOCOL ........... ${window.location.protocol}`,
            `HELPER TOKEN ............ ${brightnessToken ? 'AVAILABLE' : 'MISSING'}`,
            `HOST SPAN ............... ${window.elucidatorLivelySpanViewport
              ? `${window.elucidatorLivelySpanViewport.width} x ${window.elucidatorLivelySpanViewport.height}`
              : 'NOT PROVIDED'}`,
            ...(viewports?.map((screen, index) =>
              `DISPLAY ${index + 1} ............... ${Math.round(screen.width)}x${Math.round(screen.height)} @ ${Math.round(screen.left)},${Math.round(screen.top)}`
            ) ?? []),
          ])

          setStatus(`SEQUENCE MIRROR · ${state}`)
        } else {
          const nextMirror = args[2] === 'on' ? true : !sequenceMirror
          setSequenceMirror(nextMirror)
          const state = !nextMirror ? 'DISABLED' : viewports ? 'READY · NEXT BOOT MIRRORS PER DISPLAY' : 'ARMED · FULL-SPAN FALLBACK UNTIL DISPLAY GEOMETRY IS AVAILABLE'
          report(['SEQUENCE MIRROR', `SETTING ................. ${nextMirror ? 'ON' : 'OFF'}`, `DISPLAY GEOMETRY ....... ${viewports ? 'TWO SCREENS RESOLVED' : 'UNAVAILABLE'}`, `MIRROR STATE ............ ${state}`])
          setStatus(`SEQUENCE MIRROR · ${state}`)
        }
      }
    } else if (normalized === 'help' || normalized === 'sys help' || normalized === '?') {
      report(['ELUCIDATOR // MAINFRAME', 'SYS STATUS · SYS STORAGE STATUS · SYS WALLPAPER [SELECT|SCAN|FIT]', 'SYS TEST · REPLAY THE SYSTEM BOOT SEQUENCE', 'SYS WALLPAPER DEFAULT [SET|SELECT|CLEAR]', 'SYS THEME [LIST|ACTIVATE]', 'SYS THEME DEFAULT [SET|SELECT]', 'ADMIN SYS CONFIG SAVE · SAVE ACTIVE WALLPAPER + THEME FOR STARTUP', 'SYS WALLPAPER FIT [COVER|CONTAIN|STRETCH|SPAN]', 'SYS HARDWARE · SYS TIME · SYS AUDIO · SYS SESSION · SYS ANIME', 'SYS BRIGHTNESS STATUS · SYS BRIGHTNESS <0–100>', 'SYS LOCK · LOCK THE WINDOWS SESSION', 'SYS WIDGETS · SYS WIDGET <1–5> ON|OFF', 'SYS WIDGET POSITION INFO · REPORT CURRENT X/Y', 'SYS ANIMATION MIRROR [ON|OFF|STATUS]', 'SYS SEQUENCE MIRROR [ON|OFF|STATUS]', 'SYS WIDGETS SIZE <SCALE> · SYS WIDGET SIZE <ID> <SCALE>', 'SCALE · 0.5 · 0.75 · 1 · 1.25 · 1.5 · 1.75 · 2', 'SYS LAYOUT [LIST|FREE|LEFT|RIGHT|TOP|BOTTOM|SAVE|LOAD|RESET]', 'SYS ARISE · SYS GRIMOIRE · SYS LIMITLESS', 'SYS HINOKAMI KAGURA · SYS DEMON MODE', 'SYS HTTYD · SYS KAGUNE · SYS STEALTH', 'SYS LINK START · ACTIVATE THE SAO SYSTEM'])
      setStatus('SYSTEM HELP · COMMAND INDEX')
    } else if ((domain === 'httyd' && args.length === 1) || (domain === 'night' && action === 'fury' && args.length === 2)) {
      activateTheme('dragon', 'night-fury-stealth')
      setNightStealth(false)
      report(['NIGHT FURY SYSTEM', 'ALPHA SIGNATURE ......... LINKED', 'PLASMA CORE ............. STANDBY', 'FLIGHT PROTOCOL .......... READY'])
      setStatus('NIGHT FURY PROTOCOL ACTIVATED')
    } else if (domain === 'stealth' && args.length === 1) {
      activateTheme('dragon', 'night-fury-stealth')
      const activate = !nightStealth
      setNightStealth(activate)
      report(activate
        ? ['NIGHT FURY STEALTH', 'SIGNATURE .............. SUPPRESSED', 'LOW-LIGHT PROFILE ...... ACTIVE', 'WIDGET ARRAY ........... HIDDEN · CLICK COMMAND INPUT TO RESTORE']
        : ['NIGHT FURY STEALTH', 'SIGNATURE .............. RESTORED', 'WIDGET ARRAY ........... ONLINE'])
      setStatus(activate ? 'NIGHT FURY STEALTH ENGAGED' : 'NIGHT FURY STEALTH DISENGAGED')
    } else if (domain === 'grimoire' && args.length === 1) {
      setNightStealth(false)
      activateTheme('grimoire', 'grimoire')
      report(['FIVE-LEAF GRIMOIRE DETECTED', 'CRIMSON SYSTEM .......... ONLINE', 'GRIMOIRE INTERFACE ...... READY'])
      setStatus('GRIMOIRE PROTOCOL ACTIVATED')
    } else if (domain === 'limitless' && args.length === 1) {
      setNightStealth(false)
      activateTheme('limitless', 'limitless')
      report(['LIMITLESS TECHNIQUE', 'SPATIAL DISTORTION ....... ACTIVE', 'INFINITY FIELD .......... STABLE'])
      setStatus('LIMITLESS PROTOCOL ACTIVATED')
    } else if (domain === 'hinokami' && action === 'kagura' && args.length === 2) {
      setNightStealth(false)
      activateTheme('breathing-sun', 'breathing-sun')
      report(['HINOKAMI KAGURA', 'SUN BREATHING .......... IGNITED', 'NICHIRIN BLADE ......... READY'])
      setStatus('HINOKAMI KAGURA ACTIVATED')
    } else if (domain === 'demon' && action === 'mode' && args.length === 2) {
      setNightStealth(false)
      activateTheme('demon-mode', 'demon')
      report(THEME_SYSTEMS.find((system) => system.id === 'demon-mode')?.activationResponse ?? ['DEMON MODE ACTIVATED'])
      setStatus('DEMON MODE AWAKENED')
    } else if (domain === 'arise' && args.length === 1) {
      setNightStealth(false)
      activateTheme('arise', 'arise')
      report(['SHADOW PROTOCOL // ARISE', 'PURPLE INTERFACE ........ ACTIVE', 'THEME SAVED TO LOCAL SYSTEM.'])
      setStatus('ARISE THEME ACTIVATED')
    } else if (domain === 'kagune' && args.length === 1) {
      const tokyoGhoul = THEME_SYSTEMS.find((system) => system.id === 'tokyo-ghoul')
      if (tokyoGhoul) {
        setNightStealth(false)
        activateTheme(tokyoGhoul.id, 'tokyo-ghoul')
        report(tokyoGhoul.activationResponse)
        setStatus('KAGUNE PROTOCOL ACTIVATED')
      }
    } else if (domain === 'link' && action === 'start' && args.length === 2) {
      activateTheme('sao', 'link-start')
      setNightStealth(false)
      report(THEME_SYSTEMS.find((system) => system.id === 'sao')?.activationResponse ?? ['SYSTEM LINK ESTABLISHED'])
      setStatus('SYSTEM LINK STARTED')
    } else if (domain === 'status' && args.length === 1) {
      report([
        'ELUCIDATOR // SYSTEM CONSOLE',
        `SYSTEM VERSION ......... ${SYSTEM_VERSION}`,
        'SYSTEM STATUS: NOMINAL',
        'CORE STATUS ............ NOMINAL',
        'DISPLAY ENGINE ......... ONLINE',
        `WALLPAPER .............. ${wallpaperUrl ? wallpaperName.toUpperCase() : 'NOT CONFIGURED'}`,
        'MEMORY CACHE ........... ' + (wallpaperUrl ? 'READY' : 'EMPTY · AWAITING IMAGE'),
        `USER SESSION ........... ACTIVE · ${formatUptime((Date.now() - sessionStartedAt.current) / 1000)}`,
        `OPERATING MODE ......... ${mode}`,
        'HARDWARE TELEMETRY ...... ' + hardwareStatusLabel(hardwareFeed.status),
        `WINDOWS BRIDGE .......... ${brightnessHelperOnline ? (brightnessToken ? 'ONLINE · PAIRED' : 'ONLINE · NOT PAIRED') : 'OFFLINE'}`,
        'ALL SYSTEMS OPERATIONAL.',
      ])
      setStatus('SYSTEM STATUS: NOMINAL')
    } else if (domain === 'wallpaper') {
      if (action === 'default') {
        const defaultAction = args[2]
        const entries = wallpaperLibrary.filter((entry, index, all) => all.findIndex((candidate) => candidate.wallpaper.name === entry.wallpaper.name) === index)
        if (defaultAction === 'set' && args.length === 3) {
          if (!wallpaperUrl) {
            report(['DEFAULT WALLPAPER NOT SET', 'LOAD A WALLPAPER FIRST · SYS WALLPAPER SELECT'])
            setStatus('NO ACTIVE WALLPAPER')
          } else {
            try {
              const response = await fetch(wallpaperUrl)
              if (!response.ok) throw new Error('ACTIVE IMAGE COULD NOT BE READ')
              const selection = { blob: await response.blob(), name: wallpaperName }
              let durableSaveError: unknown = null
              try { await persistDurableWallpaper(selection) } catch (error) { durableSaveError = error }
              await writeDefaultWallpaper(selection)
              setDefaultWallpaperName(wallpaperName)
              if (durableSaveError) {
                const message = durableSaveError instanceof Error ? durableSaveError.message : 'HELPER DID NOT CONFIRM SAVE'
                report(['DURABLE WALLPAPER SAVE FAILED', message.toUpperCase(), 'BROWSER PROFILE CACHE UPDATED ONLY · NO HELPER CONFIRMATION'])
                setStatus('DEFAULT WALLPAPER SAVED TO BROWSER CACHE ONLY')
              } else {
                report(['DEFAULT WALLPAPER SAVED', `STARTUP IMAGE .......... ${wallpaperName.toUpperCase()}`, 'WINDOWS HELPER CONFIRMED · LOCALAPPDATA CONFIG WRITTEN'])
                setStatus(`STARTUP WALLPAPER SET · ${wallpaperName.toUpperCase()}`)
              }
            } catch (error) {
              const message = error instanceof Error ? error.message : 'DEFAULT WALLPAPER SAVE FAILED'
              report(['DEFAULT WALLPAPER SAVE FAILED', message.toUpperCase(), 'NO DURABLE SAVE WAS CONFIRMED.'])
              setStatus('DEFAULT WALLPAPER SAVE FAILED')
            }
          }
        } else if (defaultAction === 'select' && args.length === 3) {
          report([
            'SELECT STARTUP WALLPAPER',
            ...entries.map((entry, index) => `${String(index + 1).padStart(2, '0')} · ${entry.wallpaper.name.toUpperCase()}${entry.wallpaper.name === defaultWallpaperName ? ' · CURRENT DEFAULT' : ''}`),
            entries.length ? 'SET ONE · SYS WALLPAPER DEFAULT SELECT <NUMBER OR FILENAME>' : 'NO SAVED WALLPAPERS · USE SYS WALLPAPER SELECT FIRST',
          ])
          setStatus(entries.length ? 'CHOOSE A SAVED STARTUP WALLPAPER' : 'NO SAVED WALLPAPERS FOUND')
        } else if (defaultAction === 'select' && args.length > 3) {
          const requested = args.slice(3).join(' ').toLowerCase()
          const number = /^\d+$/.test(requested) ? Number(requested) : 0
          const selected = number > 0 ? entries[number - 1] : entries.find((entry) => entry.wallpaper.name.toLowerCase() === requested)
          if (!selected) {
            report(['DEFAULT WALLPAPER NOT FOUND', 'RUN SYS WALLPAPER DEFAULT SELECT TO VIEW SAVED IMAGES.'])
            setStatus('DEFAULT WALLPAPER SELECTION INVALID')
          } else {
            try {
              let durableSaveError: unknown = null
              try { await persistDurableWallpaper(selected.wallpaper) } catch (error) { durableSaveError = error }
              await writeDefaultWallpaper(selected.wallpaper)
              setDefaultWallpaperName(selected.wallpaper.name)
              if (durableSaveError) {
                const message = durableSaveError instanceof Error ? durableSaveError.message : 'HELPER DID NOT CONFIRM SAVE'
                report(['DURABLE WALLPAPER SAVE FAILED', message.toUpperCase(), 'BROWSER PROFILE CACHE UPDATED ONLY · NO HELPER CONFIRMATION'])
                setStatus('DEFAULT WALLPAPER SAVED TO BROWSER CACHE ONLY')
              } else {
                report(['DEFAULT WALLPAPER UPDATED', `STARTUP IMAGE .......... ${selected.wallpaper.name.toUpperCase()}`, 'WINDOWS HELPER CONFIRMED · NEW DEFAULT APPLIES NEXT START'])
                setStatus(`STARTUP WALLPAPER SET · ${selected.wallpaper.name.toUpperCase()}`)
              }
            } catch (error) {
              const message = error instanceof Error ? error.message : 'DEFAULT WALLPAPER SAVE FAILED'
              report(['DEFAULT WALLPAPER SAVE FAILED', message.toUpperCase(), 'NO DURABLE SAVE WAS CONFIRMED.'])
              setStatus('DEFAULT WALLPAPER SAVE FAILED')
            }
          }
        } else if (defaultAction === 'clear' && args.length === 3) {
          let durableSaveError: unknown = null
          try {
            await persistDurableWallpaper(null)
          } catch (error) { durableSaveError = error }
          try {
            await clearDefaultWallpaper()
            setDefaultWallpaperName(null)
            if (durableSaveError) {
              const message = durableSaveError instanceof Error ? durableSaveError.message : 'HELPER DID NOT CONFIRM SAVE'
              report(['DURABLE WALLPAPER CLEAR FAILED', message.toUpperCase(), 'BROWSER PROFILE CACHE CLEARED ONLY · NO HELPER CONFIRMATION'])
              setStatus('DEFAULT WALLPAPER CLEARED FROM BROWSER CACHE ONLY')
            } else {
              report(['DEFAULT WALLPAPER CLEARED', 'WINDOWS HELPER CONFIRMED · STARTUP WILL USE BROWSER CACHE OR BUNDLED IMAGE'])
              setStatus('STARTUP WALLPAPER DEFAULT CLEARED')
            }
          } catch (error) {
            const message = error instanceof Error ? error.message : 'DEFAULT WALLPAPER CLEAR FAILED'
            report(['DEFAULT WALLPAPER CLEAR FAILED', message.toUpperCase(), 'NO DURABLE SAVE WAS CONFIRMED.'])
            setStatus('DEFAULT WALLPAPER CLEAR FAILED')
          }
        } else {
          report(['WALLPAPER DEFAULT', `ACTIVE DEFAULT ......... ${defaultWallpaperName?.toUpperCase() ?? 'NONE · USE LAST IMAGE / BUNDLED 3D RENDER'}`, 'USE · SET | SELECT | CLEAR'])
          setStatus(defaultWallpaperName ? `STARTUP WALLPAPER · ${defaultWallpaperName.toUpperCase()}` : 'NO CUSTOM STARTUP WALLPAPER')
        }
      } else if (action === 'fit' && args.length === 2) {
        report(['WALLPAPER FIT', `ACTIVE ................ ${wallpaperFit.toUpperCase()}`, 'OPTIONS ............... COVER · CONTAIN · STRETCH · SPAN'])
        setStatus(`WALLPAPER FIT · ${wallpaperFit.toUpperCase()}`)
      } else if (action === 'fit' && args.length === 3) {
        const requested = args[2] === 'panoramic' ? 'span' : args[2]
        if (!WALLPAPER_FITS.includes(requested as WallpaperFit)) {
          report(['WALLPAPER FIT ERROR', 'USE SYS WALLPAPER FIT [COVER|CONTAIN|STRETCH|SPAN]'])
        } else {
          setWallpaperFit(requested as WallpaperFit)
          report(['WALLPAPER FIT UPDATED', `MODE .................. ${requested === 'span' ? 'SPAN / PANORAMIC' : requested.toUpperCase()}`, requested === 'span' ? 'FULL IMAGE FITS THE COMBINED SPAN VIEWPORT.' : 'APPLIES TO THE ACTIVE AND FUTURE WALLPAPERS.'])
          setStatus(`WALLPAPER FIT · ${requested.toUpperCase()}`)
        }
      } else if (action === 'scan') {
        if (!wallpaperUrl) {
          report(['WALLPAPER SCAN', 'NO ACTIVE WALLPAPER · USE SYS WALLPAPER SELECT'])
          setStatus('SCAN UNAVAILABLE · NO WALLPAPER SELECTED')
        } else {
          setRevealComplete(false)
          setBooting(true)
          setBootToken((token) => token + 1)
          report(['WALLPAPER SCAN', `TARGET ................. ${wallpaperName.toUpperCase()}`, 'IMAGE BUFFER ........... SYNCHRONIZING', 'VISUAL LAYER ........... MATERIALIZING'])
          setStatus('WALLPAPER SCAN STARTED')
        }
      } else if (action === 'select') {
        report(['WALLPAPER CONTROL', `CURRENT ................ ${wallpaperUrl ? wallpaperName.toUpperCase() : 'NONE'}`, 'SELECT IMAGE ........... READY'])
        openFilePicker()
      } else if (action === 'list') {
        const entries = wallpaperLibrary.filter((entry, index, all) => all.findIndex((candidate) => candidate.wallpaper.name === entry.wallpaper.name) === index)
        report(['SAVED WALLPAPERS', ...entries.map((entry, index) => `${String(index + 1).padStart(2, '0')} · ${entry.wallpaper.name.toUpperCase()}${entry.wallpaper.name === wallpaperName ? ' · ACTIVE' : ''}${entry.wallpaper.name === defaultWallpaperName ? ' · STARTUP DEFAULT' : ''}`), entries.length ? 'USE SYS WALLPAPER NEXT TO SWITCH.' : 'NO SAVED IMAGES FOUND.'])
        setStatus(`${entries.length} SAVED WALLPAPER${entries.length === 1 ? '' : 'S'} FOUND`)
      } else if (action === 'next' || action === 'previous') {
        const entries = wallpaperLibrary.filter((entry, index, all) => all.findIndex((candidate) => candidate.wallpaper.name === entry.wallpaper.name) === index)
        if (entries.length < 2) {
          report(['WALLPAPER SWITCH', 'SAVE AT LEAST TWO DISTINCT WALLPAPERS TO THE LIBRARY.', 'USE SYS WALLPAPER SELECT TO ADD AN IMAGE.'])
        } else {
          const current = entries.findIndex((entry) => entry.wallpaper.name === wallpaperName)
          const direction = action === 'next' ? 1 : -1
          const target = entries[(current + direction + entries.length) % entries.length]
          report(['WALLPAPER SWITCH', `LOADING ............... ${target.wallpaper.name.toUpperCase()}`, 'SCAN TRANSITION ........ STARTING'])
          await activateWallpaper(target.wallpaper)
        }
      } else if (!action || action === 'current' || action === 'show') {
        report(['WALLPAPER STATUS', `ACTIVE ................. ${wallpaperUrl ? wallpaperName.toUpperCase() : 'NONE'}`, `FIT MODE ............... ${wallpaperFit.toUpperCase()}`, `CACHE ................. ${wallpaperUrl ? 'READY' : 'EMPTY'}`])
        setStatus(wallpaperUrl ? `ACTIVE WALLPAPER · ${wallpaperName.toUpperCase()}` : 'NO WALLPAPER SELECTED')
      } else {
        report(['WALLPAPER COMMAND ERROR', 'USAGE · SYS WALLPAPER [CURRENT|SELECT|LIST|NEXT|PREVIOUS|SCAN|FIT]'])
      }
    } else if (domain === 'time' && args.length === 1) {
      openWidget(2)
      const now = new Date()
      report(['WORLD CLOCK', `LOCAL TIME ............. ${new Intl.DateTimeFormat(undefined, { dateStyle: 'full', timeStyle: 'medium' }).format(now)}`, `SESSION UPTIME ......... ${formatUptime((Date.now() - sessionStartedAt.current) / 1000)}`, `AINCRAD CLOCK .......... DAY ${Math.floor((Date.now() - sessionStartedAt.current) / 86_400_000) + 1} · ${now.toLocaleTimeString()}`])
      setStatus('WORLD CLOCK SYNCHRONIZED')
    } else if (domain === 'session' && args.length === 1) {
      openWidget(3)
      report(['SESSION MONITOR', `SYSTEM UPTIME .......... ${formatUptime((Date.now() - sessionStartedAt.current) / 1000)}`, `WALLPAPER ACTIVE ....... ${wallpaperUrl ? formatUptime((Date.now() - wallpaperStartedAt.current) / 1000) : 'NO WALLPAPER'}`, `ACTIVE IMAGE ........... ${wallpaperUrl ? wallpaperName.toUpperCase() : 'NONE'}`])
      setStatus('SESSION MONITOR ONLINE')
    } else if (domain === 'anime' && args.length === 1) {
      openWidget(5)
      const readout = THEME_STATUS[theme]
      report([readout.title, readout.state, `${readout.metric} ............ ${readout.value}`, `ACTIVE THEME ........... ${theme.toUpperCase()}`])
      setStatus(`ANIME STATUS · ${theme.toUpperCase()}`)
    } else if (domain === 'mode') {
      const modes: SystemMode[] = ['NORMAL', 'STEALTH', 'COMBAT', 'IDLE', 'DIAGNOSTIC']
      const requested = action?.toUpperCase() as SystemMode | undefined
      if (!requested) report(['SYSTEM MODES', ...modes.map((item) => `${item === mode ? '●' : '○'} ${item}`), 'USAGE · SYS MODE <MODE>'])
      else if (modes.includes(requested)) {
        setMode(requested)
        if (requested === 'STEALTH') setSpecialEffect({ kind: 'theme-activation', id: ++effectIdRef.current })
        report(['OPERATING MODE UPDATED', `MODE .................. ${requested}`, requested === 'STEALTH' ? 'VISUAL OUTPUT .......... REDUCED' : requested === 'COMBAT' ? 'SCAN PROFILE ........... HIGH INTENSITY' : requested === 'DIAGNOSTIC' ? 'SYSTEM TELEMETRY ....... ENABLED' : 'SYSTEM PROFILE ......... ACTIVE'])
        setStatus(`OPERATING MODE · ${requested}`)
      } else report(['MODE ERROR', `UNKNOWN MODE · ${action?.toUpperCase()}`, 'AVAILABLE · NORMAL / STEALTH / COMBAT / IDLE / DIAGNOSTIC'])
    } else if (domain === 'hardware' && args.length === 1) {
      openWidget(1)
      const readings = hardwareFeed.readings
      const ramUsed = readings?.ramTotalMb != null && readings.ramAvailableMb != null
        ? Math.max(0, readings.ramTotalMb - readings.ramAvailableMb)
        : null
      report([
        'HARDWARE DIAGNOSTICS · ' + hardwareStatusLabel(hardwareFeed.status),
        'CPU · ' + (readings?.cpuName ?? 'UNAVAILABLE') + ' · ' + displayPercent(readings?.cpuPercent ?? null),
        'GPU 3D · ' + (readings?.gpuName ?? 'UNAVAILABLE') + ' · ' + displayPercent(readings?.gpu3dPercent ?? null),
        'RAM USED · ' + (ramUsed === null ? 'UNAVAILABLE' : Math.round(ramUsed) + ' MB') + ' / ' + (readings?.ramTotalMb == null ? 'UNAVAILABLE' : Math.round(readings.ramTotalMb) + ' MB'),
        'NETWORK DOWN · ' + displayMegabytesPerSecond(readings?.networkDownBytesPerSecond ?? null),
        'NETWORK UP · ' + displayMegabytesPerSecond(readings?.networkUpBytesPerSecond ?? null),
        'TEMPERATURE · NOT PROVIDED BY LIVELY',
        'FRAME RATE · NOT PROVIDED BY LIVELY',
      ])
      setStatus('HARDWARE REPORT · ' + hardwareStatusLabel(hardwareFeed.status))
    } else if (domain === 'audio' && args.length === 1) {
      openWidget(4)
      const audioStatus = nowPlayingStatus === 'track' && nowPlaying ? 'TRACK LINKED' : nowPlayingStatus === 'none' ? 'NO ACTIVE TRACK' : nowPlayingStatus === 'browser' ? 'LIVELY HOST REQUIRED' : nowPlayingStatus === 'invalid' ? 'INVALID MEDIA DATA' : 'WAITING FOR LIVELY'
      report(nowPlaying
        ? ['AUDIO LINK // NOW PLAYING', `TRACK .................. ${nowPlaying.title.toUpperCase()}`, `ARTIST ................. ${nowPlaying.artist.toUpperCase()}`, `ALBUM .................. ${nowPlaying.album.toUpperCase()}`, 'PLAYBACK CONTROLS ...... NOT EXPOSED BY LIVELY']
        : ['AUDIO LINK // MEDIA SESSION', `STATUS ................. ${audioStatus}`, nowPlayingStatus === 'browser' ? 'LOAD THIS WALLPAPER IN LIVELY TO CONNECT.' : 'TRACK INFO APPEARS WHEN A SUPPORTED PLAYER IS ACTIVE.', 'PLAYBACK CONTROLS ...... NOT EXPOSED BY LIVELY'])
      setStatus(`AUDIO LINK · ${audioStatus}`)
    } else if (domain === 'test' && args.length === 1) {
      setRevealComplete(false)
      setBootStage('sequence')
      setStandbyActive(false)
      setBooting(true)
      setBootToken((token) => token + 1)
      report(['SYSTEM BOOT TEST', 'REPLAYING CONNECTION / COMPILATION / ASSEMBLY.', wallpaperUrl ? 'WALLPAPER REVEAL WILL FOLLOW READINESS.' : 'NO WALLPAPER ACTIVE · SYSTEM-ONLY REVEAL.'])
      setStatus('SYSTEM BOOT TEST STARTED')
    } else if (domain === 'standby' && args.length === 1) {
      finishingBootRef.current = false
      setRevealComplete(false)
      setBootStage('standby')
      setStandbyActive(true)
      setBooting(true)
      report(['REVEAL STANDBY', 'WALLPAPER LAYER ........... READY', 'PRESS ANY KEY OR MOVE MOUSE TO CONTINUE.'])
      setStatus('REVEAL STANDBY · AWAITING INPUT')
    } else if (domain === 'scale') {
      if (!action && args.length === 1) {
        report(['INTERFACE SCALE', `CURRENT ................. ${interfaceScale}X`, 'APPLIES TO .............. COMMAND CONSOLE + WIDGETS', 'LOAD ANIMATIONS .......... UNCHANGED', 'USAGE ................... SYS SCALE <0.5|0.75|1|1.25|1.5|1.75|2>'])
        setStatus(`INTERFACE SCALE Â· ${interfaceScale}X`)
      } else {
        const scale = Number(action)
        if (args.length !== 2 || !WIDGET_SCALES.includes(scale as WidgetScale)) {
          report(['INTERFACE SCALE ERROR', 'USAGE Â· SYS SCALE <0.5|0.75|1|1.25|1.5|1.75|2>'])
          setStatus('INVALID INTERFACE SCALE')
        } else {
          setInterfaceScale(scale as WidgetScale)
          report(['INTERFACE SCALE APPLIED', `COMMAND CONSOLE + WIDGETS .. ${scale}X`, 'LOAD ANIMATIONS .......... UNCHANGED', 'SCALE SAVED TO LOCAL SYSTEM.'])
          setStatus(`INTERFACE SCALE Â· ${scale}X`)
        }
      }
    } else if (domain === 'compact' && args[2] === 'save' && args.length === 4) {
      const targetTheme = resolveThemeChoice(action)
      const slot = Number(args[3])
      if (!targetTheme || !Number.isInteger(slot) || slot < 1 || slot > 9) {
        report(['COMPACT SAVE ERROR', 'USE SYS COMPACT <THEME> SAVE <1-9>.', 'EXAMPLE ............... SYS COMPACT HTTYD SAVE 1'])
        setStatus('COMPACT SAVE COMMAND INVALID')
      } else if (targetTheme !== theme) {
        report(['COMPACT SAVE ERROR', `ACTIVE THEME .......... ${theme.toUpperCase()}`, `ACTIVATE ${targetTheme.toUpperCase()} BEFORE SAVING ITS PANEL.`])
        setStatus('COMPACT SAVE THEME IS NOT ACTIVE')
      } else {
        const key = `${targetTheme}:${slot}`
        const layout: CompactThemeLayout = {
          theme: targetTheme,
          slot,
          panelPosition: compactPanelPosition ? { ...compactPanelPosition } : null,
          widgetOffsets: Object.fromEntries(Object.entries(compactWidgetOffsets).map(([id, offset]) => [id, { ...offset }])) as CompactWidgetOffsets,
        }
        setCompactThemeLayouts((current) => ({ ...current, [key]: layout }))
        report(['COMPACT THEME LAYOUT SAVED', `THEME .................. ${targetTheme.toUpperCase()}`, `SLOT ................... ${slot}`, 'PANEL + CARD OFFSETS ... STORED', 'ADMIN SYS CONFIG SAVE .. INCLUDES THIS PROFILE'])
        setStatus(`COMPACT ${targetTheme.toUpperCase()} SLOT ${slot} SAVED`)
      }
    } else if (domain === 'compact' && ['on', 'off'].includes(action) && args.length === 2) {
      const compact = action === 'on'
      if (compact) {
        // Snapshot once. Repeating ON must never replace the layout the user
        // expects OFF to restore.
        if (!widgetsCompact) {
          setCompactRestore({
            widgetLayout,
            widgetPositions: Object.fromEntries(Object.entries(widgetPositions).map(([id, position]) => [id, { ...position }])) as WidgetPositions,
          })
        }
        setWidgetsCompact(true)
        report(['WIDGET COMPACT PANEL', 'STATE .................. ON', 'COMPOSITION ............ 3 + 2 GRID', 'DRAG HANDLE ............ PANEL HEADER', 'INDIVIDUAL LAYOUT ...... SNAPSHOTTED'])
      } else {
        setWidgetsCompact(false)
        if (compactRestore) {
          setWidgetLayout(compactRestore.widgetLayout)
          setWidgetPositions(compactRestore.widgetPositions)
          setCompactRestore(null)
        }
        report(['WIDGET COMPACT PANEL', 'STATE .................. OFF', compactRestore ? 'PREVIOUS LAYOUT ........ RESTORED' : 'PREVIOUS LAYOUT ........ ALREADY ACTIVE'])
      }
      setStatus(`WIDGET COMPACT · ${compact ? 'ON' : 'OFF'}`)
    } else if (domain === 'widgets' && args[1] === 'all' && ['on', 'off'].includes(args[2])) {
      const enable = args[2] === 'on'
      if (enable) WIDGET_IDS.forEach(openWidget)
      else WIDGET_IDS.forEach(closeWidget)
      report(['DIGITAL WIDGET ARRAY', `ALL DISPLAYS ........... ${enable ? '05 / 05' : '00 / 05'}`])
      setStatus(`ALL WIDGETS ${enable ? 'ENABLED' : 'DISABLED'}`)
    } else if (domain === 'widgets' && action === 'size' && args.length === 3) {
      const scale = Number(args[2])
      if (!WIDGET_SCALES.includes(scale as WidgetScale)) {
        report(['WIDGET SCALE ERROR', 'USAGE · SYS WIDGETS SIZE <0.5|0.75|1|1.25|1.5|1.75|2>'])
        setStatus('INVALID WIDGET SCALE')
      } else {
        setWidgetScales(Object.fromEntries(WIDGET_IDS.map((id) => [id, scale])) as WidgetScales)
        report(['WIDGET SCALE APPLIED', `ALL WIDGETS ............ ${scale}X`, 'SCALE SAVED TO LOCAL SYSTEM.'])
        setStatus(`ALL WIDGETS SCALED · ${scale}X`)
      }
    } else if (domain === 'widgets' && args.length === 1) {
      report(['DIGITAL WIDGETS · 1–5', ...WIDGET_IDS.map((id) => `${enabledWidgets.includes(id) ? 'ONLINE ' : 'OFFLINE'} · ${id} · ${WIDGET_TITLES[id]}`), 'CONTROL · SYS WIDGET <1–5> ON|OFF'])
      setStatus(`${enabledWidgets.length} WIDGET${enabledWidgets.length === 1 ? '' : 'S'} ACTIVE`)
    } else if (domain === 'layout') {
      if (!action || action === 'list') {
        report(['WIDGET LAYOUT PRESETS', 'FREE · INDIVIDUAL DRAG POSITIONING', 'LEFT · VERTICAL STACK ALONG LEFT EDGE', 'RIGHT · VERTICAL STACK ALONG RIGHT EDGE', 'TOP · EVEN HORIZONTAL ROW AT TOP', 'BOTTOM · EVEN HORIZONTAL ROW AT BOTTOM', ...Object.keys(layoutPresets).map((name) => `SAVED · ${name.toUpperCase()}`), 'WIDGET PRESETS LEAVE THE CONSOLE IN PLACE.'])
        setStatus('LAYOUT PRESETS READY')
      } else if ((action === 'night-fury' || action === 'nightfury') && args.length === 2) {
        setWidgetPositions({})
        setWidgetScales({})
        setWidgetLayout('right')
        report(['NIGHT FURY WIDGET PRESET APPLIED', 'COMPACT WIDGETS ........ RIGHT DOCK', 'SYSTEM CONTROL ......... WIDE LANDSCAPE SURFACE', 'USE SYS LAYOUT RIGHT TO REAPPLY THE SAME DOCK.'])
        setStatus('NIGHT FURY WIDGET PRESET APPLIED')
      } else if (action === 'free' && args.length === 2) {
        setWidgetPositions(captureVisibleWidgetPositions())
        setWidgetLayout('free')
        report(['WIDGET LAYOUT APPLIED', 'ARRANGEMENT ............ FREE', 'VISIBLE WIDGET POSITIONS PRESERVED.'])
        setStatus('LAYOUT · FREE')
      } else if (['left', 'right', 'top', 'bottom'].includes(action) && args.length === 2) {
        setWidgetLayout(action as WidgetLayout)
        report(['WIDGET LAYOUT APPLIED', `ARRANGEMENT ............ ${action.toUpperCase()}`, `ACTIVE WIDGETS ......... ${renderedWidgets.length} / ${WIDGET_IDS.length}`, 'COMMAND CONSOLE POSITION UNCHANGED.'])
        setStatus(`LAYOUT · ${action.toUpperCase()}`)
      } else if (action === 'save' && args.length === 3) {
        const name = args[2].toLowerCase()
        if (!/^[a-z0-9_-]{1,18}$/.test(name)) {
          report(['LAYOUT SAVE ERROR', 'NAME MUST BE 1–18 LETTERS, NUMBERS, _ OR -.'])
        } else {
          setLayoutPresets((current) => ({ ...current, [name]: { consoleFrame, widgetPositions, widgetLayout } }))
          report(['LAYOUT SAVED', `PRESET ................ ${name.toUpperCase()}`, 'CONSOLE AND WIDGET POSITIONS STORED.'])
          setStatus(`LAYOUT SAVED · ${name.toUpperCase()}`)
        }
      } else if (action === 'load' && args.length === 3) {
        const name = args[2].toLowerCase()
        const preset = layoutPresets[name]
        if (!preset) report(['LAYOUT NOT FOUND', `NO SAVED PRESET NAMED ${name.toUpperCase()}.`, 'USE SYS LAYOUT LIST TO VIEW PRESETS.'])
        else {
          setConsoleFrame(preset.consoleFrame)
          setWidgetPositions(preset.widgetPositions)
          setWidgetLayout(preset.widgetLayout ?? 'free')
          report(['LAYOUT LOADED', `PRESET ................ ${name.toUpperCase()}`, 'CONSOLE AND WIDGET POSITIONS RESTORED.'])
          setStatus(`LAYOUT LOADED · ${name.toUpperCase()}`)
        }
      } else if (action === 'reset' && args.length === 2) {
        setConsoleFrame(null)
        setWidgetPositions({})
        setWidgetLayout('right')
        try { localStorage.removeItem(CONSOLE_FRAME_KEY) } catch { /* Reset remains applied for this session. */ }
        report(['LAYOUT RESET', 'CONSOLE AND WIDGETS RETURNED TO DEFAULT POSITIONS.'])
        setStatus('DEFAULT LAYOUT RESTORED')
      } else {
        report(['LAYOUT COMMAND ERROR', 'USAGE · SYS LAYOUT [LIST|FREE|LEFT|RIGHT|TOP|BOTTOM|SAVE <NAME>|LOAD <NAME>|RESET]'])
      }
    } else if (domain === 'widget' && action === 'position' && args[2] === 'info' && args.length === 3) {
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight
      const positions = WIDGET_IDS.map((id) => {
        const widget = document.querySelector<HTMLElement>(`.system-widget.widget-${id}`)
        if (widget) {
          const rect = widget.getBoundingClientRect()
          const x = rect.left / viewportWidth * 100
          const y = rect.top / viewportHeight * 100
          return `${String(id).padStart(2, '0')} ${WIDGET_TITLES[id]} · X ${x.toFixed(2)}% (${Math.round(rect.left)}PX) · Y ${y.toFixed(2)}% (${Math.round(rect.top)}PX)`
        }
        const saved = widgetPositions[id]
        return saved
          ? `${String(id).padStart(2, '0')} ${WIDGET_TITLES[id]} · SAVED X ${saved.x.toFixed(2)}% · Y ${saved.y.toFixed(2)}% · OFFLINE`
          : `${String(id).padStart(2, '0')} ${WIDGET_TITLES[id]} · OFFLINE · NO SAVED POSITION`
      })
      report([
        'WIDGET POSITION SNAPSHOT',
        `VIEWPORT ............... ${viewportWidth} X ${viewportHeight} PX`,
        `LAYOUT ................. ${widgetLayout.toUpperCase()}`,
        ...positions,
        'X/Y ARE TOP-LEFT VIEWPORT PERCENTAGES · USE SYS WIDGET MOVE <ID> <X> <Y>',
      ])
      setStatus(`WIDGET POSITIONS · ${viewportWidth}X${viewportHeight}`)
    } else if (domain === 'widget' && action === 'size' && args.length === 4) {
      const id = Number(args[2])
      const scale = Number(args[3])
      if (!WIDGET_IDS.includes(id as typeof WIDGET_IDS[number]) || !WIDGET_SCALES.includes(scale as WidgetScale)) {
        report(['WIDGET SCALE ERROR', 'USAGE · SYS WIDGET SIZE <1–5> <0.5|0.75|1|1.25|1.5|1.75|2>'])
        setStatus('INVALID WIDGET SCALE')
      } else {
        setWidgetScales((current) => ({ ...current, [id]: scale as WidgetScale }))
        report([`WIDGET ${String(id).padStart(2, '0')} SCALE`, `${WIDGET_TITLES[id]} ........ ${scale}X`, 'SCALE SAVED TO LOCAL SYSTEM.'])
        setStatus(`WIDGET ${id} SCALED · ${scale}X`)
      }
    } else if (domain === 'widget' && action === 'move' && args.length === 5) {
      const id = Number(args[2])
      const x = Number(args[3])
      const y = Number(args[4])
      if (!WIDGET_IDS.includes(id as typeof WIDGET_IDS[number]) || !Number.isFinite(x) || !Number.isFinite(y) || x < 0 || x > 100 || y < 0 || y > 100) {
        report(['WIDGET POSITION ERROR', 'USAGE · SYS WIDGET MOVE <1–5> <X% 0–100> <Y% 0–100>'])
      } else {
        const visiblePositions = Object.fromEntries(
          Array.from(document.querySelectorAll<HTMLElement>('.system-widget:not(.widget-leaving)')).flatMap((widget) => {
            const widgetClass = Array.from(widget.classList).find((name) => /^widget-[1-5]$/.test(name))
            if (!widgetClass) return []
            const widgetId = Number(widgetClass.slice('widget-'.length))
            const rect = widget.getBoundingClientRect()
            return [[widgetId, { x: rect.left / window.innerWidth * 100, y: rect.top / window.innerHeight * 100 }]]
          }),
        ) as WidgetPositions
        setWidgetLayout('free')
        setWidgetPositions((current) => ({ ...current, ...visiblePositions, [id]: { x, y } }))
        openWidget(id)
        report([`WIDGET ${String(id).padStart(2, '0')} POSITION`, `HORIZONTAL ............ ${x}%`, `VERTICAL .............. ${y}%`, 'POSITION SAVED.'])
        setStatus(`WIDGET ${id} POSITION UPDATED`)
      }
    } else if (domain === 'widget' && action === 'reset' && args.length === 2) {
      setWidgetPositions({})
      setWidgetLayout('right')
      report(['WIDGET LAYOUT', 'CUSTOM POSITIONS CLEARED.', 'DEFAULT RIGHT-SIDE LAYOUT RESTORED.'])
      setStatus('WIDGET LAYOUT RESET')
    } else if (domain === 'widget' && args.length === 3) {
      const id = Number(action)
      const setting = args[2]
      if (!WIDGET_IDS.includes(id as typeof WIDGET_IDS[number]) || !['on', 'off', 'enable', 'disable'].includes(setting)) {
        report(['WIDGET COMMAND ERROR', 'USAGE · SYS WIDGET <1–5> ON|OFF'])
      } else {
        const enable = setting === 'on' || setting === 'enable'
        if (enable) openWidget(id)
        else closeWidget(id)
        report([`WIDGET ${String(id).padStart(2, '0')} · ${WIDGET_TITLES[id]}`, `DISPLAY ............... ${enable ? 'ENABLED' : 'DISABLED'}`, `ACTIVE WIDGETS ........ ${enable ? 'UPDATED' : 'UPDATED'}`])
        setStatus(`WIDGET ${id} ${enable ? 'ENABLED' : 'DISABLED'}`)
      }
    } else if (['wallpaper', 'wallpaper select', 'select wallpaper', 'wallpaper.load'].includes(normalized)) {
      openFilePicker()
    } else if (!normalized) {
      setStatus('ENTER A COMMAND · HELP')
      report(['ENTER A COMMAND · SYS HELP'])
    } else {
      setStatus(`UNKNOWN COMMAND · ${normalized.toUpperCase()}`)
      report([`UNKNOWN COMMAND · ${normalized.toUpperCase()}`, 'TYPE SYS HELP FOR THE COMMAND INDEX.'])
    }
  }

  const handleCommandKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Tab' && !event.shiftKey) {
      event.preventDefault()
      const value = event.currentTarget.value
      const previous = completionRef.current
      let candidates: string[]
      let index = 0
      let completed: string

      if (previous && value === previous.lastValue && previous.candidates.length > 1) {
        candidates = previous.candidates
        index = (previous.index + 1) % candidates.length
        completed = candidates[index]
      } else {
        const savedWallpaperCount = wallpaperLibrary.filter((entry, index, all) => all.findIndex((candidate) => candidate.wallpaper.name === entry.wallpaper.name) === index).length
        candidates = findCommandCompletions(value, savedWallpaperCount)
        if (candidates.length === 0) return
        if (candidates.length === 1) {
          completed = candidates[0]
        } else {
          const common = candidates.reduce((prefix, candidate) => {
            let length = 0
            while (length < prefix.length && length < candidate.length && prefix[length] === candidate[length]) length += 1
            return prefix.slice(0, length)
          })
          if (common.length > value.length) completed = common
          else completed = candidates[index]
          index = candidates.indexOf(completed)
        }
      }

      completionRef.current = { lastValue: completed, candidates, index }
      commandDraftRef.current = completed
      setCommand(completed)
      return
    }

    const history = commandHistoryRef.current
    if (event.key === 'ArrowUp' && history.length > 0) {
      event.preventDefault()
      completionRef.current = null
      if (historyIndexRef.current === history.length) commandDraftRef.current = event.currentTarget.value
      historyIndexRef.current = Math.max(0, historyIndexRef.current - 1)
      while (historyIndexRef.current > 0
        && history[historyIndexRef.current - 1] === history[historyIndexRef.current]) {
        historyIndexRef.current -= 1
      }
      setCommand(history[historyIndexRef.current])
    } else if (event.key === 'ArrowDown' && historyIndexRef.current < history.length) {
      event.preventDefault()
      completionRef.current = null
      const currentHistoryCommand = history[historyIndexRef.current]
      historyIndexRef.current += 1
      while (historyIndexRef.current < history.length
        && history[historyIndexRef.current] === currentHistoryCommand) {
        historyIndexRef.current += 1
      }
      setCommand(historyIndexRef.current === history.length
        ? commandDraftRef.current
        : history[historyIndexRef.current])
    }
  }

  const captureVisibleWidgetPositions = (): WidgetPositions => {
    const host = document.querySelector<HTMLElement>('.system-widgets')
    // Dock themes may deliberately narrow .system-widgets to a sidebar. Free
    // placement always uses its full parent canvas, so capture against that
    // stable canvas rather than the temporary dock rail.
    const canvasBounds = host?.parentElement?.getBoundingClientRect()
    if (!canvasBounds?.width || !canvasBounds.height) return widgetPositions
    return Object.fromEntries(Array.from(document.querySelectorAll<HTMLElement>('.system-widget:not(.widget-leaving)')).flatMap((widget) => {
      const id = Number(widget.dataset.widgetId)
      if (!WIDGET_IDS.includes(id as typeof WIDGET_IDS[number])) return []
      const rect = widget.getBoundingClientRect()
      return [[id, {
        x: (rect.left - canvasBounds.left) / canvasBounds.width * 100,
        y: (rect.top - canvasBounds.top) / canvasBounds.height * 100,
        // offsetWidth is intentionally pre-zoom, so reapplying it does not
        // double the interface or per-widget scale after detaching from a dock.
        width: widget.offsetWidth,
      }]]
    })) as WidgetPositions
  }

  const startCompactPanelDrag = (event: ReactPointerEvent<HTMLElement>) => {
    if (event.button !== 0) return
    const panel = event.currentTarget.closest('.system-widgets') as HTMLElement | null
    if (!panel) return
    const bounds = panel.getBoundingClientRect()
    draggingCompactPanelRef.current = { pointerId: event.pointerId, offsetX: event.clientX - bounds.left, offsetY: event.clientY - bounds.top }
    event.currentTarget.setPointerCapture(event.pointerId)
    event.preventDefault()
  }

  const moveCompactPanelDrag = (event: ReactPointerEvent<HTMLElement>) => {
    const drag = draggingCompactPanelRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    const panel = event.currentTarget.closest('.system-widgets') as HTMLElement | null
    const canvas = panel?.parentElement?.getBoundingClientRect()
    const bounds = panel?.getBoundingClientRect()
    if (!canvas?.width || !canvas.height || !bounds) return
    const left = Math.max(canvas.left, Math.min(canvas.right - bounds.width, event.clientX - drag.offsetX))
    const top = Math.max(canvas.top, Math.min(canvas.bottom - bounds.height, event.clientY - drag.offsetY))
    setCompactPanelPosition({ x: (left - canvas.left) / canvas.width * 100, y: (top - canvas.top) / canvas.height * 100 })
  }

  const finishCompactPanelDrag = (event: ReactPointerEvent<HTMLElement>) => {
    const drag = draggingCompactPanelRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    draggingCompactPanelRef.current = null
  }

  const startWidgetDrag = (event: ReactPointerEvent<HTMLElement>, id: number) => {
    if ((event.target as HTMLElement).closest('button,input,select,textarea,label,a,[data-widget-control]')) return
    if (event.button !== 0) return
    const card = event.currentTarget.closest('.system-widget') as HTMLElement | null
    if (!card) return
    const bounds = card.getBoundingClientRect()
    const compactOffset = compactWidgetOffsets[id] ?? { x: 0, y: 0 }
    draggingWidgetRef.current = { id, pointerId: event.pointerId, offsetX: event.clientX - bounds.left, offsetY: event.clientY - bounds.top, startX: event.clientX, startY: event.clientY, activated: widgetsCompact || widgetLayout === 'free', compact: widgetsCompact, originX: compactOffset.x, originY: compactOffset.y }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const moveWidgetDrag = (event: ReactPointerEvent<HTMLElement>) => {
    const drag = draggingWidgetRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    const card = event.currentTarget.closest('.system-widget') as HTMLElement | null
    if (!card) return
    if (drag.compact) {
      const panelBounds = card.parentElement?.getBoundingClientRect()
      const bounds = card.getBoundingClientRect()
      if (!panelBounds?.width || !panelBounds.height) return
      const intendedLeft = event.clientX - drag.offsetX
      const intendedTop = event.clientY - drag.offsetY
      const left = Math.max(panelBounds.left, Math.min(panelBounds.right - bounds.width, intendedLeft))
      const top = Math.max(panelBounds.top, Math.min(panelBounds.bottom - bounds.height, intendedTop))
      setCompactWidgetOffsets((current) => {
        const currentOffset = current[drag.id] ?? { x: 0, y: 0 }
        return { ...current, [drag.id]: { x: currentOffset.x + left - bounds.left, y: currentOffset.y + top - bounds.top } }
      })
      return
    }
    if (!drag.activated) {
      if (Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) < 7) return
      setWidgetPositions(captureVisibleWidgetPositions())
      setWidgetLayout('free')
      drag.activated = true
    }
    const bounds = card.getBoundingClientRect()
    // The state update above is applied after this pointer event. During this
    // first move the immediate parent can still be the narrow dock rail, so
    // use the same stable free-position canvas as the capture step.
    const canvasBounds = card.parentElement?.parentElement?.getBoundingClientRect()
    if (!canvasBounds?.width || !canvasBounds.height) return
    const left = Math.max(canvasBounds.left, Math.min(canvasBounds.right - bounds.width, event.clientX - drag.offsetX))
    const top = Math.max(canvasBounds.top, Math.min(canvasBounds.bottom - bounds.height, event.clientY - drag.offsetY))
    setWidgetPositions((current) => ({
      ...current,
      [drag.id]: { ...current[drag.id], x: (left - canvasBounds.left) / canvasBounds.width * 100, y: (top - canvasBounds.top) / canvasBounds.height * 100, width: current[drag.id]?.width ?? card.offsetWidth },
    }))
  }

  const finishWidgetDrag = (event: ReactPointerEvent<HTMLElement>) => {
    const drag = draggingWidgetRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    draggingWidgetRef.current = null
  }

  const positionWidget = (id: number) => {
    if (widgetsCompact) {
      const offset = compactWidgetOffsets[id]
      return offset ? { '--compact-widget-x': `${offset.x}px`, '--compact-widget-y': `${offset.y}px`, zIndex: 4 } as CSSProperties : undefined
    }
    const scale = widgetScales[id] ?? 1
    const scaleStyle = { '--widget-user-scale': scale } as CSSProperties
    if (widgetLayout !== 'free') return scale === 1 ? undefined : scaleStyle
    const position = widgetPositions[id]
    if (!position) return scale === 1 ? undefined : scaleStyle
    return {
      left: `${Math.min(position.x, 100)}%`,
      top: `${Math.min(position.y, 100)}%`,
      right: 'auto',
      ...(position.width ? { width: `${position.width}px` } : {}),
      ...scaleStyle,
    }
  }

  const startConsoleDrag = (event: ReactPointerEvent<HTMLElement>) => {
    if ((event.target as HTMLElement).closest('button')) return
    const bounds = event.currentTarget.closest('.command-console')?.getBoundingClientRect()
    if (!bounds) return
    draggingConsoleRef.current = {
      offsetX: event.clientX - bounds.left,
      offsetY: event.clientY - bounds.top,
      frame: { x: bounds.left, y: bounds.top, width: bounds.width, height: bounds.height },
    }
    event.currentTarget.setPointerCapture(event.pointerId)
    event.preventDefault()
  }

  const moveConsole = (event: ReactPointerEvent<HTMLElement>) => {
    const drag = draggingConsoleRef.current
    if (!drag) return
    const x = Math.max(0, Math.min(window.innerWidth - drag.frame.width, event.clientX - drag.offsetX))
    const y = Math.max(0, Math.min(window.innerHeight - drag.frame.height, event.clientY - drag.offsetY))
    setConsoleFrame({ ...drag.frame, x, y: window.innerHeight - y - drag.frame.height, anchor: 'bottom' })
  }

  const chooseWallpaper = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0]
    event.currentTarget.value = ''
    if (!file) return

    const nextUrl = URL.createObjectURL(file)
    setStatus('DECODING WALLPAPER…')
    try {
      await decodeImage(nextUrl)
      let persisted = true
      try {
        await saveWallpaper({ blob: file, name: file.name })
        setWallpaperLibrary(await readWallpaperLibrary())
      } catch {
        persisted = false
      }
      const previousUrl = objectUrlRef.current
      objectUrlRef.current = nextUrl
      wallpaperStartedAt.current = Date.now()
      wallpaperRequestRef.current += 1
      setWallpaperMediaReady(false)
      setWallpaperUrl(nextUrl)
      setWallpaperName(file.name)
      setRevealComplete(false)
      setBooting(true)
      setStatus(persisted
        ? `WALLPAPER STORED · ${file.name.toUpperCase()}`
        : 'LOADED FOR THIS SESSION · CACHE WRITE FAILED')
      setBootToken((token) => token + 1)
      if (previousUrl) URL.revokeObjectURL(previousUrl)
    } catch (error) {
      URL.revokeObjectURL(nextUrl)
      setStatus(error instanceof Error ? error.message.toUpperCase() : 'WALLPAPER LOAD FAILED')
    }
  }

  const renderActivationScene = (activationKind: string, stageId: string) => (
    <>
      {activationKind === 'link-start' && (
        <div className="sao-activation-interface">
          <div className="sao-activation-flare">
            <svg className="sao-flare-geometry" viewBox="0 0 600 600" aria-hidden="true">
              <circle className="sao-flare-ring outer" cx="300" cy="300" r="226" />
              <circle className="sao-flare-ring orbit" cx="300" cy="300" r="184" />
              <circle className="sao-flare-ring inner" cx="300" cy="300" r="112" />
              <path className="sao-flare-crosshair" d="M300 34V200M300 400V566M34 300H200M400 300H566" />
              <path className="sao-flare-slash slash-a" d="M165 435L435 165" />
              <path className="sao-flare-slash slash-b" d="M210 470L470 210" />
              <path className="sao-flare-diamond" d="M300 58L311 74L300 90L289 74Z" />
              <path className="sao-flare-diamond" d="M542 300L526 311L510 300L526 289Z" />
              <path className="sao-flare-diamond" d="M300 542L289 526L300 510L311 526Z" />
              <path className="sao-flare-diamond" d="M58 300L74 289L90 300L74 311Z" />
            </svg>
            <img className="sao-flare-swords" src={activeThemeSystem?.emblemAsset ?? './assets/emblems/link-start-crossed-swords.png'} alt="" />
            <div className="sao-flare-copy"><strong>LINK START</strong><span>ESTABLISHING AINCRAD CONNECTION</span></div>
          </div>
        </div>
      )}
      {activationKind === 'demon' && (
        <div className="demon-mode-activation">
          <div className="demon-activation-aura" />
          <svg className="demon-activation-frame" viewBox="0 0 1000 600" preserveAspectRatio="none" aria-hidden="true">
            <path className="demon-frame-outer" d="M96 34H904L966 96V504L904 566H96L34 504V96Z" />
            <path className="demon-frame-inner" d="M116 54H884L946 116V484L884 546H116L54 484V116Z" />
            <path className="demon-frame-locks" d="M96 84H208M792 84H904M96 516H208M792 516H904" />
          </svg>
          <img className="demon-activation-clasp clasp-top-left" src="./assets/emblems/demon-corner-clasp-trimmed.png" alt="" />
          <img className="demon-activation-clasp clasp-top-right" src="./assets/emblems/demon-corner-clasp-trimmed.png" alt="" />
          <img className="demon-activation-clasp clasp-bottom-left" src="./assets/emblems/demon-corner-clasp-trimmed.png" alt="" />
          <img className="demon-activation-clasp clasp-bottom-right" src="./assets/emblems/demon-corner-clasp-trimmed.png" alt="" />
          <img className="demon-activation-fissure fissure-upper" src="./assets/emblems/demon-fissure-trimmed.png" alt="" />
          <img className="demon-activation-fissure fissure-lower" src="./assets/emblems/demon-fissure-trimmed.png" alt="" />
          <img className="demon-activation-dragon" src={THEME_SYSTEMS.find((system) => system.id === 'demon-mode')?.emblemAsset ?? './assets/emblems/dragon-sin-of-wrath.png'} alt="" />
          <img className="demon-activation-crescent" src="./assets/emblems/demon-crescent-trimmed.png" alt="" />
          <div className="demon-activation-copy"><strong>DEMON MODE</strong><span>DRAGON SIN OF WRATH // MELIODAS</span></div>
          <div className="demon-activation-state"><img src="./assets/emblems/demon-seal-gem-trimmed.png" alt="" /><span>POWER UNSEALED</span></div>
          <div className="demon-activation-rule">
            <img className="demon-rule-segments" src="./assets/emblems/demon-underline-segments.png" alt="" />
            <span />
            <img className="demon-rule-tip" src="./assets/emblems/demon-underline-tip.png" alt="" />
          </div>
        </div>
      )}
      {activationKind === 'grimoire' && (
        <div className="grimoire-seal-activation">
          <div className="grimoire-seal-cover">
            <svg className="grimoire-seal-lines" viewBox="0 0 640 400" preserveAspectRatio="none" aria-hidden="true">
              <defs>
                <g id={`grimoire-seal-leaf-corner-${stageId}`}>
                  <path d="M8 9C18 16 25 25 31 37C39 52 49 62 64 72" />
                  <path d="M24 28C14 27 8 21 7 13C16 14 23 19 27 26Z" />
                  <path d="M39 48C30 48 24 43 22 35C31 36 38 40 42 47Z" />
                  <path d="M53 62C46 63 40 59 37 53C45 52 51 55 56 61Z" />
                </g>
              </defs>
              <path className="grimoire-cover-outline" d="M32 4H608L636 32V368L608 396H32L4 368V32Z" />
              <path className="grimoire-cover-inner" d="M42 15H598L625 42V358L598 385H42L15 358V42Z" />
              <use className="grimoire-cover-flourish" href={`#grimoire-seal-leaf-corner-${stageId}`} transform="translate(20 22) scale(.78)" />
              <use className="grimoire-cover-flourish" href={`#grimoire-seal-leaf-corner-${stageId}`} transform="translate(620 22) scale(-.78 .78)" />
              <use className="grimoire-cover-flourish" href={`#grimoire-seal-leaf-corner-${stageId}`} transform="translate(20 378) scale(.78 -.78)" />
              <use className="grimoire-cover-flourish" href={`#grimoire-seal-leaf-corner-${stageId}`} transform="translate(620 378) scale(-.78 -.78)" />
              <path className="grimoire-cover-fissures" d="M74 37L91 29L101 20M566 363L550 371L540 380" />
            </svg>
            <div className="grimoire-seal-content">
              <ThemeEmblem className="grimoire-seal-emblem theme-emblem-image" src={activeThemeSystem?.emblemAsset ?? './assets/emblems/grimoire.png'} title="Five-leaf grimoire" />
              <strong>BLACK CLOVER</strong>
              <small>SYSTEM SEAL</small>
            </div>
            <div className="grimoire-seal-messages">
              <span>FIVE-LEAF GRIMOIRE DETECTED</span>
              <span>ANTI-MAGIC AWAKENED</span>
            </div>
          </div>
        </div>
      )}
      {activationKind === 'breathing-sun' && (
        <div className="hinokami-activation">
          <div className="hinokami-warmth" />
          <svg className="hinokami-arc" viewBox="0 0 1000 700" preserveAspectRatio="none">
            <path d="M260 524A305 305 0 0 1 740 220" />
          </svg>
          <div className="hinokami-fireblade-wrap">
            <img className="hinokami-activation-sword" src={HINOKAMI_FIREBLADE} alt="" />
            <span className="hinokami-fireblade-light" style={{ maskImage: `url(${HINOKAMI_FIREBLADE})`, WebkitMaskImage: `url(${HINOKAMI_FIREBLADE})` }} />
          </div>
          <div className="hinokami-activation-copy"><strong>HINOKAMI KAGURA</strong><span>SUN BREATHING // IGNITED</span></div>
        </div>
      )}
      {activationKind === 'tokyo-ghoul' && (
        <div className="kagune-activation">
          <div className="kagune-activation-glow" />
          <svg className="kagune-activation-sigil" viewBox="0 0 600 600" aria-hidden="true">
            <circle className="kagune-sigil-ring kagune-sigil-ring-outer" cx="300" cy="300" r="260" />
            <circle className="kagune-sigil-ring kagune-sigil-ring-inner" cx="300" cy="300" r="228" />
            <path className="kagune-sigil-spokes" d="M300 8V96M300 504V592M8 300H96M504 300H592M94 94L156 156M444 444L506 506M506 94L444 156M156 444L94 506" />
            <path className="kagune-sigil-cuts" d="M116 138L164 162L190 205M484 462L436 438L410 395M484 138L436 162L410 205M116 462L164 438L190 395" />
          </svg>
          <img className="kagune-activation-header-emblem" src="./assets/kagune/kagune-header-emblem-trimmed.png" alt="" />
          <img className="kagune-activation-header-tendril" src="./assets/kagune/kagune-header-tendril-trimmed.png" alt="" />
          <img className="kagune-activation-right-tendril" src="./assets/kagune/kagune-right-tendril-trimmed.png" alt="" />
          <img className="kagune-activation-bottom-tendril" src="./assets/kagune/kagune-bottom-tendril-trimmed.png" alt="" />
          <div className="kagune-activation-copy"><strong>TOKYO GHOUL</strong><span>ONE-EYED KING // KANEKI PROTOCOL</span></div>
        </div>
      )}
      {activationKind === 'night-fury-stealth' && (
        <div className="night-fury-activation" style={activationStyle}>
          <div className="night-fury-activation-aura" />
          <svg className="night-fury-flight-path" viewBox="0 0 1000 600" preserveAspectRatio="none" aria-hidden="true">
            <path className="night-fury-flight-orbit" d="M90 350C178 145 354 74 537 118c164 39 277 180 358 99" />
            <path className="night-fury-flight-streak" d="M110 403c174-92 339-100 491-49 100 34 193 31 279-15" />
            <path className="night-fury-flight-glint" d="M220 160c134-90 318-75 427 13" />
          </svg>
          <img className="night-fury-flight-tail" src="./assets/emblems/night-fury-header-tail-trimmed.png" alt="" />
          <img className="night-fury-flight-wings" src="./assets/emblems/night-fury-corner-fins-trimmed.png" alt="" />
          <img className="night-fury-flight-lower" src="./assets/emblems/night-fury-bottom-tail-trimmed.png" alt="" />
          <ThemeEmblem
            className="night-fury-activation-emblem theme-emblem-image"
            src={activeThemeSystem?.emblemAsset ?? './assets/emblems/night-fury.png'}
            title="NIGHT FURY"
          />
          <div className="night-fury-activation-copy"><strong>NIGHT FURY</strong><span>HTTYD // TOOTHLESS PROTOCOL</span></div>
          <div className="night-fury-activation-status"><i /> ALPHA CLASS // LINKED</div>
        </div>
      )}
      {['theme-activation', 'arise', 'limitless'].includes(activationKind) && (
        <div className={`theme-emblem-activation activation-${theme}`} style={activationStyle}>
          <ThemeEmblem
            className="theme-emblem-activation-image theme-emblem-image"
            src={activeThemeSystem?.emblemAsset ?? './assets/emblems/tokyo-ghoul.png'}
            title={activePresentation.title}
          />
          <span>{stealthIdentity ? activePresentation.title : activeThemeSystem?.activationPresentation.title ?? activePresentation.title}</span>
        </div>
      )}
    </>
  )

  const shouldMirrorActivation = animationMirror && connectedMonitorCount === 2
  // Physical display geometry is meaningful only in Lively Span mode. A normal
  // browser preview remains a single viewport even if Windows has two screens.
  // `wallpaperFit` controls image fitting only; it cannot establish where
  // Lively placed this DOM viewport. `sequenceViewports` is populated solely
  // after the host-placement verification in detectSequenceViewports.
  const sequenceBootViewports = sequenceMirror && sequenceViewports?.length === 2 ? sequenceViewports : null
  const animationMirrorClass = shouldMirrorActivation ? ' activation-mirror-enabled' : ''
  const consoleEntryClass = consoleEntry?.theme === theme ? ` console-entering console-entering-${theme}` : ''

  return (
    <main className={`wallpaper-experience mode-${mode.toLowerCase()} theme-${theme}${!ready || !startupConfigHydrated || booting ? ' startup-interface-locked' : ''}${standbyActive ? ' reveal-standby-active' : ''}${nightStealth ? ' night-stealth-active' : ''}${specialEffect ? ' activation-active' : ''}${specialEffect?.kind === 'night-fury-stealth' ? ' night-fury-activating' : ''}${specialEffect?.kind === 'breathing-sun' ? ' hinokami-activating' : ''}`} style={{ '--interface-scale': interfaceScale } as CSSProperties}>
      {wallpaperUrl && (
        <img
          key={`wallpaper-${bootToken}`}
          className={`wallpaper-backdrop wallpaper-fit-${wallpaperFit}${!ready ? ' is-loading' : booting && !standbyActive ? ' is-booting' : ' is-ready'}`}
          src={wallpaperUrl}
          alt={wallpaperName}
          onLoad={() => setWallpaperMediaReady(true)}
          onError={() => { setWallpaperMediaReady(true); setRevealComplete(true) }}
        />
      )}

      {specialEffect && (
        <div key={specialEffect.id} className={`special-effect effect-${specialEffect.kind}${animationMirrorClass}`} aria-hidden="true">
          <div className="activation-world-ripple" />
          <div className="activation-scene-normal">{renderActivationScene(specialEffect.kind, 'normal')}</div>
          {shouldMirrorActivation && (
            <>
              <div className="activation-dual-stage activation-dual-left">{renderActivationScene(specialEffect.kind, 'left')}</div>
              <div className="activation-dual-stage activation-dual-right">{renderActivationScene(specialEffect.kind, 'right')}</div>
            </>
          )}
        </div>
      )}

      {ready && booting && (sequenceBootViewports
        ? sequenceBootViewports.map((viewport, index) => <BootSequence key={`${bootToken}-${index}`} active={booting} standby={bootStage === 'standby'} short={bootToken > 1} wallpaperReady={!wallpaperUrl || wallpaperMediaReady} onStandby={index === 0 ? handleBootStandby : () => undefined} onActivate={index === 0 ? handleBootActivate : () => undefined} debug={index === 0} viewport={{ left: viewport.left, top: viewport.top, width: viewport.width, height: viewport.height, right: 'auto', bottom: 'auto' }} />)
        : <BootSequence key={`boot-${bootToken}`} active={booting} standby={bootStage === 'standby'} short={bootToken > 1} wallpaperReady={!wallpaperUrl || wallpaperMediaReady} onStandby={handleBootStandby} onActivate={handleBootActivate} />)}
      {false && ready && (
        <section className={`boot-sequence${booting ? ' boot-legacy-hidden' : ' is-complete'}`} aria-label="Wallpaper system boot sequence">
          <div className="boot-scan" aria-hidden="true" />
          <svg className="boot-aperture" viewBox="0 0 1000 600" preserveAspectRatio="none" aria-hidden="true">
            <g className="boot-tunnel-rails"><path d="M110 90H890L760 200H240Z M165 145H835L710 245H290Z M225 200H775L660 290H340Z M285 255H715L610 335H390Z" /><path d="M110 510H890L760 400H240Z M165 455H835L710 355H290Z M225 400H775L660 310H340Z" /></g>
            <path className="boot-aperture-brackets" d="M455 270h-24v24M545 270h24v24M455 330h-24v-24M545 330h24v-24" />
            <path className="boot-aperture-axis" d="M60 300H940M500 60V540" />
          </svg>
          <div className="boot-core" aria-hidden="true"><strong>ELUCIDATOR</strong><span>SYSTEM SYNCHRONISATION</span></div>
          <div className="boot-log">
            <div className="boot-assembly" aria-hidden="true"><i /><i /><i /><i /></div>
            <p className="boot-prompt">ELUCIDATOR // SYSTEM LINK<span className="boot-cursor">_</span></p>
            <div className="boot-progress-row">
              <span>BOOT.PROGRESS</span>
              <span className="boot-progress-track" role="progressbar" aria-label="Boot progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progressPercent}>
                <span style={{ width: `${progressPercent}%` }} />
              </span>
              <span>{String(progressPercent).padStart(2, '0')}%</span>
            </div>

            {timeline.phases.map((phase) => bootElapsed >= phase.start && (
              <div className="boot-phase" key={phase.id}>
                <p className="boot-phase-title"><span>PHASE {phase.id}</span>{phase.title}</p>
                {phase.messages.map((message) => {
                  if (bootElapsed < message.start) return null
                  const complete = bootElapsed >= message.end
                  return (
                    <p className={`boot-line${complete ? ' is-complete' : ' is-active'}`} key={message.text}>
                      <span>{message.text}</span>
                      {!complete && <span className="line-cursor" aria-hidden="true">▌</span>}
                      {complete && <span className="line-result">[ {message.result} ]</span>}
                    </p>
                  )
                })}
              </div>
            ))}

            {readyMessage && (
              <p className="boot-ready">
                &gt; {wallpaperUrl ? 'SYSTEM.READY — WELCOME BACK' : 'SYSTEM.READY — SELECT WALLPAPER'}
                <span className="boot-cursor">_</span>
              </p>
            )}
          </div>
        </section>
      )}

      {visualTheme !== 'off' && (
        <div className={'visual-effects visual-' + visualTheme} aria-hidden="true">
          {visualTheme === 'rain' && Array.from({ length: 8 }, (_, index) => <i className="visual-rain-streak" key={index} />)}
          {visualTheme === 'particles' && Array.from({ length: 8 }, (_, index) => <i className="visual-particle" key={index} />)}
        </div>
      )}

      <aside className={`system-widgets widget-layout-${widgetLayout}${widgetsCompact ? ' widgets-compact' : ''}${theme === 'sao' && saoWidgetsStarting ? ' sao-widgets-starting' : ''}`} aria-label="System widgets" style={widgetsCompact && compactPanelPosition ? { '--compact-panel-left': `${compactPanelPosition.x}%`, '--compact-panel-top': `${compactPanelPosition.y}%`, '--compact-panel-right': 'auto' } as CSSProperties : undefined}>
        {widgetsCompact && <div className="compact-panel-handle" aria-label="Drag compact widget panel" onPointerDown={startCompactPanelDrag} onPointerMove={moveCompactPanelDrag} onPointerUp={finishCompactPanelDrag} onPointerCancel={finishCompactPanelDrag} onLostPointerCapture={finishCompactPanelDrag} />}
        {renderedWidgets.includes(1) && (
          <article data-widget-id="1" className={`system-widget widget-1${leavingWidgetIds.includes(1) ? ' widget-leaving' : ''}${consoleEntry?.theme === theme || openingWidgetIds.includes(1) ? ` widget-entering widget-entering-${theme}` : ''}`} aria-hidden={leavingWidgetIds.includes(1)} style={positionWidget(1)}>
            {theme === 'sao' && <SaoWidgetFrame />}
            <ThemeWidgetFrame theme={theme} />
            <header onPointerDown={(event) => startWidgetDrag(event, 1)} onPointerMove={moveWidgetDrag} onPointerUp={finishWidgetDrag} onPointerCancel={finishWidgetDrag} onLostPointerCapture={finishWidgetDrag}>{theme === 'sao' ? <SaoWidgetTitle id={1} title="HARDWARE" /> : theme === 'grimoire' ? <span className="grimoire-widget-title"><b>01</b><strong>HARDWARE</strong></span> : theme === 'demon-mode' ? <span className="demon-widget-title"><b>01</b><strong>HARDWARE</strong></span> : <span>01 / HARDWARE</span>}<i>{hardwareStatusLabel(hardwareFeed.status)}</i><button className="widget-close" onClick={() => closeWidget(1)} aria-label="Close hardware widget">×</button></header>
            <strong className="hardware-host">{hardwareFeed.readings?.cpuName ?? 'HOST TELEMETRY'} · {hardwareFeed.readings?.gpuName ?? 'GPU'} </strong>
            {(() => {
              const readings = hardwareFeed.readings
              const ramPercent = readings?.ramTotalMb != null && readings.ramTotalMb > 0 && readings.ramAvailableMb != null ? (readings.ramTotalMb - readings.ramAvailableMb) / readings.ramTotalMb * 100 : null
              const ramUsed = readings?.ramTotalMb != null && readings.ramAvailableMb != null ? readings.ramTotalMb - readings.ramAvailableMb : null
              return <div className={theme === 'demon-mode' ? 'demon-hardware-grid' : theme === 'tokyo-ghoul' ? 'kagune-hardware-grid' : theme === 'dragon' ? 'night-fury-hardware-grid' : 'instrument-hardware-grid'}>
                <DiagnosticMeter label={theme === 'sao' ? 'CPU' : 'CPU LOAD'} percent={readings?.cpuPercent ?? null} value={readings?.cpuPercent == null ? (theme === 'tokyo-ghoul' ? '—' : 'UNAVAILABLE') : `${Math.round(readings.cpuPercent)}%`} history={hardwareHistory.cpu} />
                <DiagnosticMeter label={theme === 'sao' ? 'GPU' : 'GPU 3D'} percent={readings?.gpu3dPercent ?? null} value={readings?.gpu3dPercent == null ? (theme === 'tokyo-ghoul' ? '—' : 'UNAVAILABLE') : `${Math.round(readings.gpu3dPercent)}%`} history={hardwareHistory.gpu} />
                <DiagnosticMeter label="RAM" percent={ramPercent} value={ramPercent == null ? (theme === 'tokyo-ghoul' ? '—' : 'UNAVAILABLE') : `${Math.round(ramPercent)}%`} history={hardwareHistory.ram} detail={ramUsed == null || readings?.ramTotalMb == null ? undefined : `${(ramUsed / 1024).toFixed(1)} / ${(readings.ramTotalMb / 1024).toFixed(1)} GB`} />
              </div>
            })()}
            {theme === 'sao'
              ? <p className="sao-network-footer"><span>NETWORK</span><span aria-label="Download">↓ <b>{displayMegabytesPerSecond(hardwareFeed.readings?.networkDownBytesPerSecond ?? null)}</b></span><span aria-label="Upload">↑ <b>{displayMegabytesPerSecond(hardwareFeed.readings?.networkUpBytesPerSecond ?? null)}</b></span></p>
              : theme === 'tokyo-ghoul'
                ? <p className="kagune-network-footer"><span>↓ <b>{displayMegabytesPerSecond(hardwareFeed.readings?.networkDownBytesPerSecond ?? null)}</b></span><span>↑ <b>{displayMegabytesPerSecond(hardwareFeed.readings?.networkUpBytesPerSecond ?? null)}</b></span></p>
                : <p>NET DOWN / UP <b>{displayMegabytesPerSecond(hardwareFeed.readings?.networkDownBytesPerSecond ?? null)} / {displayMegabytesPerSecond(hardwareFeed.readings?.networkUpBytesPerSecond ?? null)}</b></p>}
            {theme !== 'sao' && <small>{hardwareFeed.updatedAt ? 'UPDATED ' + new Date(hardwareFeed.updatedAt).toLocaleTimeString() : 'WAITING FOR LIVELY SYSTEM DATA'} · TEMPERATURE / FPS NEED A SENSOR FEED</small>}
          </article>
        )}
        {renderedWidgets.includes(2) && (
          <article data-widget-id="2" className={`system-widget widget-2${leavingWidgetIds.includes(2) ? ' widget-leaving' : ''}${consoleEntry?.theme === theme || openingWidgetIds.includes(2) ? ` widget-entering widget-entering-${theme}` : ''}`} aria-hidden={leavingWidgetIds.includes(2)} style={positionWidget(2)}>
            {theme === 'sao' && <SaoWidgetFrame />}
            <ThemeWidgetFrame theme={theme} />
            <header onPointerDown={(event) => startWidgetDrag(event, 2)} onPointerMove={moveWidgetDrag} onPointerUp={finishWidgetDrag} onPointerCancel={finishWidgetDrag} onLostPointerCapture={finishWidgetDrag}>{theme === 'sao' ? <SaoWidgetTitle id={2} title="LOCAL TIME" /> : theme === 'grimoire' ? <span className="grimoire-widget-title"><b>02</b><strong>LOCAL TIME</strong></span> : theme === 'demon-mode' ? <span className="demon-widget-title"><b>02</b><strong>LOCAL TIME</strong></span> : <span>02 / LOCAL TIME</span>}<i>SYNC</i><button className="widget-close" onClick={() => closeWidget(2)} aria-label="Close local time widget">×</button></header>
            <div className={`clock-widget-display${theme === 'demon-mode' ? ' demon-digital-clock' : theme === 'tokyo-ghoul' ? ' kagune-digital-clock' : ''}`}>
              {theme !== 'sao' && theme !== 'demon-mode' && theme !== 'tokyo-ghoul' && theme !== 'dragon' && <div className="clock-face" style={clockStyle} aria-hidden="true">
                <span className="clock-hand clock-hand-hour" />
                <span className="clock-hand clock-hand-minute" />
                <span className="clock-hand clock-hand-second" />
                <span className="clock-pin" />
              </div>}
              {theme === 'demon-mode' && <img className="demon-clock-gem" src="./assets/emblems/demon-seal-gem-trimmed.png" alt="" aria-hidden="true" />}
              <div className="clock-widget-copy">
                <strong className="widget-clock">{clockNow.toLocaleTimeString(undefined, theme === 'tokyo-ghoul' || theme === 'grimoire' || theme === 'demon-mode' || theme === 'limitless' ? { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' } : theme === 'sao' || theme === 'dragon' ? { hour: '2-digit', minute: '2-digit' } : { hour: '2-digit', minute: '2-digit', second: '2-digit' })}{(theme === 'sao' || theme === 'demon-mode' || theme === 'tokyo-ghoul' || theme === 'dragon' || theme === 'grimoire' || theme === 'limitless') && <em>:{String(clockNow.getSeconds()).padStart(2, '0')}</em>}</strong>
                <p>{clockNow.toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }).toUpperCase()}</p>
                <small>{theme === 'tokyo-ghoul' || theme === 'grimoire' || theme === 'demon-mode' || theme === 'limitless' ? clockZone.toUpperCase() : `LOCAL CHRONOMETER · ${clockZone.toUpperCase()}`}</small>
              </div>
            </div>
          </article>
        )}
        {renderedWidgets.includes(3) && (
          <article data-widget-id="3" className={`system-widget widget-3${leavingWidgetIds.includes(3) ? ' widget-leaving' : ''}${consoleEntry?.theme === theme || openingWidgetIds.includes(3) ? ` widget-entering widget-entering-${theme}` : ''}`} aria-hidden={leavingWidgetIds.includes(3)} style={positionWidget(3)}>
            {theme === 'sao' && <SaoWidgetFrame />}
            <ThemeWidgetFrame theme={theme} />
            <header onPointerDown={(event) => startWidgetDrag(event, 3)} onPointerMove={moveWidgetDrag} onPointerUp={finishWidgetDrag} onPointerCancel={finishWidgetDrag} onLostPointerCapture={finishWidgetDrag}>{theme === 'sao' ? <SaoWidgetTitle id={3} title="QUICK LAUNCH" /> : theme === 'grimoire' ? <span className="grimoire-widget-title"><b>03</b><strong>QUICK LAUNCH</strong></span> : theme === 'demon-mode' ? <span className="demon-widget-title"><b>03</b><strong>QUICK LAUNCH</strong></span> : <span>03 / QUICK LAUNCH</span>}<i>PLACEHOLDER</i><button className="widget-close" onClick={() => closeWidget(3)} aria-label="Close quick launch widget">×</button></header>
            <div className="quick-launch-grid">{quickShortcuts.map((shortcut) => <button key={shortcut.id} className={`quick-launch-tile shortcut-${shortcut.id}`} onClick={() => onLaunchShortcut(shortcut)} title={`${shortcut.label} · launch integration coming soon`}><span className="quick-launch-icon" aria-hidden="true">{typeof shortcut.icon === 'string' ? shortcut.icon : <svg viewBox="0 0 24 24" focusable="false"><path d={shortcut.icon.path} /></svg>}</span><b>{shortcut.label}</b></button>)}</div>
          </article>
        )}
        {renderedWidgets.includes(4) && (
          <article data-widget-id="4" className={`system-widget widget-4${leavingWidgetIds.includes(4) ? ' widget-leaving' : ''}${consoleEntry?.theme === theme || openingWidgetIds.includes(4) ? ` widget-entering widget-entering-${theme}` : ''}`} aria-hidden={leavingWidgetIds.includes(4)} style={positionWidget(4)}>
            {theme === 'sao' && <SaoWidgetFrame />}
            <ThemeWidgetFrame theme={theme} />
            <header onPointerDown={(event) => startWidgetDrag(event, 4)} onPointerMove={moveWidgetDrag} onPointerUp={finishWidgetDrag} onPointerCancel={finishWidgetDrag} onLostPointerCapture={finishWidgetDrag}>{theme === 'sao' ? <SaoWidgetTitle id={4} title="NOW PLAYING" /> : theme === 'grimoire' ? <span className="grimoire-widget-title"><b>04</b><strong>NOW PLAYING</strong></span> : theme === 'demon-mode' ? <span className="demon-widget-title"><b>04</b><strong>NOW PLAYING</strong></span> : <span>04 / NOW PLAYING</span>}<i>{nowPlayingStatus === 'track' ? 'LINKED' : nowPlayingStatus === 'sample' ? 'SAMPLE DATA' : nowPlayingStatus === 'none' ? 'IDLE' : nowPlayingStatus === 'browser' ? 'LIVELY ONLY' : nowPlayingStatus === 'invalid' ? 'DATA ERROR' : 'WAITING'}</i><button className="widget-close" onClick={() => closeWidget(4)} aria-label="Close now playing widget">×</button></header>
            {nowPlaying ? (
              <div className="audio-now-playing">
                {nowPlaying.artwork
                  ? <img src={nowPlaying.artwork} alt="Album artwork" />
                  : <div className="audio-art-placeholder" aria-hidden="true">♪</div>}
                <div className="audio-track-copy">
                  <strong>{nowPlaying.title}</strong>
                  <p>{nowPlaying.artist}</p>
                  <small>{nowPlaying.album} · {nowPlaying.playbackType.toUpperCase()}</small>
                </div>
              </div>
            ) : (
              <>
                <strong>{nowPlayingStatus === 'browser' ? 'LIVELY HOST REQUIRED' : nowPlayingStatus === 'none' ? 'NO ACTIVE TRACK' : nowPlayingStatus === 'invalid' ? 'MEDIA DATA UNAVAILABLE' : 'SEARCHING MEDIA SESSIONS'}</strong>
                <p>TRACK DATA <b>{nowPlayingStatus === 'browser' ? 'LIVELY ONLY' : nowPlayingStatus === 'none' ? 'IDLE' : 'WAITING'}</b></p>
                <small>SUPPORTED WINDOWS MEDIA SESSION REQUIRED</small>
              </>
            )}
            <small className="audio-controls-note">READ-ONLY · PLAYBACK KEYS ARE NOT EXPOSED BY LIVELY</small>
          </article>
        )}
        {renderedWidgets.includes(5) && (
          <article data-widget-id="5" className={`system-widget widget-5${leavingWidgetIds.includes(5) ? ' widget-leaving' : ''}${consoleEntry?.theme === theme || openingWidgetIds.includes(5) ? ` widget-entering widget-entering-${theme}` : ''}`} aria-hidden={leavingWidgetIds.includes(5)} style={positionWidget(5)}>
            {theme === 'sao' && <SaoWidgetFrame />}
            <ThemeWidgetFrame theme={theme} />
            <header onPointerDown={(event) => startWidgetDrag(event, 5)} onPointerMove={moveWidgetDrag} onPointerUp={finishWidgetDrag} onPointerCancel={finishWidgetDrag} onLostPointerCapture={finishWidgetDrag}>{theme === 'sao' ? <SaoWidgetTitle id={5} title="SYSTEM CONTROL" /> : theme === 'grimoire' ? <span className="grimoire-widget-title"><b>05</b><strong>SYSTEM CONTROL</strong></span> : theme === 'demon-mode' ? <span className="demon-widget-title"><b>05</b><strong>SYSTEM CONTROL</strong></span> : <span>05 / SYSTEM CONTROL</span>}<i>UTILITY</i><button className="widget-close" onClick={() => closeWidget(5)} aria-label="Close system control widget">×</button></header>
            {theme === 'dragon' && <div className="night-fury-system-control"><div className="night-fury-control-identity"><img src="./assets/emblems/night-fury-header-emblem-trimmed.png" alt="" /><div><strong>NIGHT FURY</strong><small>{brightnessHelperOnline ? brightnessToken ? 'HELPER CONNECTED' : 'HELPER ONLINE · UNPAIRED' : 'HELPER UNAVAILABLE'}</small></div></div></div>}
            {(['arise', 'grimoire', 'limitless', 'breathing-sun'] as ThemeId[]).includes(theme) && <ThemeControlIdentity theme={theme} connected={brightnessHelperOnline} />}
            {theme === 'demon-mode' && <div className="demon-real-control-identity"><img src="./assets/emblems/dragon-sin-of-wrath.png" alt="" /><div><strong>DRAGON SIN</strong><small>DEMON MODE</small><em><i className={brightnessHelperOnline ? 'is-online' : ''} />{brightnessHelperOnline ? brightnessToken ? 'HELPER CONNECTED' : 'HELPER ONLINE · UNPAIRED' : 'HELPER UNAVAILABLE'}</em></div></div>}
            {theme === 'sao' ? <div className="sao-control-identity"><ThemeEmblem className="sao-control-emblem" src={activeThemeSystem?.emblemAsset ?? './assets/emblems/link-start-crossed-swords.png'} title="AINCRAD SYSTEM" /><div><small>AINCRAD SYSTEM</small><strong><i className={brightnessHelperOnline ? 'is-online' : ''} />{brightnessHelperOnline ? brightnessToken ? 'HELPER CONNECTED' : 'HELPER ONLINE · UNPAIRED' : 'HELPER UNAVAILABLE'}</strong></div></div> : theme === 'tokyo-ghoul' ? <div className="kagune-system-control"><div className="kagune-control-brand"><img src="./assets/kagune/kagune-header-emblem-trimmed.png" alt="" /><b>KAGUNE <small>ELUCIDATOR</small></b></div><p><span>ACTIVE EFFECT</span><b>{visualTheme.toUpperCase()}</b></p><p><span>WALLPAPER FIT</span><b>{wallpaperFit.toUpperCase()}</b></p><p><span>BRIGHTNESS BRIDGE</span><b>{brightnessHelperOnline ? brightnessToken ? 'PAIRED' : 'ONLINE · UNPAIRED' : 'OFFLINE'}</b></p><div className="kagune-control-actions"><button onClick={() => activateVisualEffect(visualTheme === 'vignette' ? 'off' : 'vignette')}>EFFECT {visualTheme === 'vignette' ? 'OFF' : 'ON'}</button><button disabled={!brightnessToken || !brightnessHelperOnline} onClick={() => void changeBrightness(brightnessToken, 60, null)}>BRIGHTNESS 60%</button></div></div> : theme !== 'dragon' && theme !== 'demon-mode' && <><div className="anime-status-heading">
              <ThemeEmblem className="anime-status-orb theme-emblem-image" src={activeThemeSystem?.emblemAsset ?? './assets/emblems/link-start-crossed-swords.png'} title={`${activeThemeSystem?.label ?? 'Theme'} emblem`} />
              <div><small>{theme.replaceAll('-', ' ').toUpperCase()} PROTOCOL</small><strong>{animeStatus.title}</strong></div>
            </div>
              <p className="anime-status-state">{animeStatus.state}</p>
              <div className="anime-signal" aria-hidden="true">{Array.from({ length: 16 }, (_, index) => <i key={index} />)}</div>
              <p className="anime-status-metric"><span>{animeStatus.metric}</span><b>{animeStatus.value}</b></p></>}
            <label className="widget-brightness-control" style={{ '--brightness-value': brightnessLevel } as CSSProperties}>BRIGHTNESS <input type="range" min="0" max="100" value={brightnessLevel} onChange={(event) => { const value = Number(event.target.value); setBrightnessLevel(value); if (brightnessToken && brightnessHelperOnline) void changeBrightness(brightnessToken, value, null) }} /><output>{brightnessLevel}%</output></label>
            <div className="effect-tile-grid" aria-label="Visual effects">{([{ id: 'off', label: 'Off', icon: '○' }, { id: 'haze', label: 'Haze', icon: '≋' }, { id: 'rain', label: 'Rain', icon: '⌇' }, { id: 'lightning', label: 'Lightning', icon: 'ϟ' }, { id: 'particles', label: 'Particles', icon: '✦' }, { id: 'vignette', label: 'Vignette', icon: '◉' }] as const).map((effect) => <button key={effect.id} className={visualTheme === effect.id ? 'is-active' : ''} onClick={() => activateVisualEffect(effect.id)} aria-pressed={visualTheme === effect.id}><span aria-hidden="true">{effect.icon}</span>{effect.label}</button>)}</div>
          </article>
        )}
      </aside>

      <section
        className={`command-console mode-${mode.toLowerCase()}${booting ? ' is-hidden' : ''}${themeSignature === 'aincrad' ? ' sao-console' : ''}${themeSignature === 'aincrad' && (consoleEntry?.theme === 'sao' || saoWidgetsStarting) ? ' sao-starting' : ''}${theme === 'grimoire' ? ' grimoire-console' : ''}${theme === 'limitless' ? ' limitless-console' : ''}${theme === 'breathing-sun' ? ' hinokami-console' : ''}${theme === 'demon-mode' ? ' demon-mode-console' : ''}${theme === 'dragon' ? ' night-fury-console' : ''}${theme === 'tokyo-ghoul' ? ' tokyo-ghoul-console' : ''}${consoleEntryClass}`}
        aria-label="Elucidator system console"
        style={consoleFrame ? {
          left: consoleFrame.x,
          top: consoleFrame.anchor === 'bottom' ? 'auto' : consoleFrame.y,
          right: 'auto',
          bottom: consoleFrame.anchor === 'bottom' ? consoleFrame.y : 'auto',
          width: consoleFrame.width,
        } : undefined}
        onPointerMove={moveConsole}
        onPointerUp={() => { draggingConsoleRef.current = null }}
        onPointerCancel={() => { draggingConsoleRef.current = null }}
      >
        {themeSignature === 'aincrad' && (
          <>
            <svg className="sao-frame-ornaments" viewBox="0 0 1000 400" preserveAspectRatio="none" aria-hidden="true">
              <path className="sao-frame-shadow" d="M17 3H948L997 55V345L950 397H17L3 383V17Z" />
              <path className="sao-frame-outer" d="M17 3H948L997 55V345L950 397H17L3 383V17Z" />
              <path className="sao-frame-inner" d="M22 9H944L991 59V342L947 390H20L9 379V21Z" />
              <path className="sao-frame-glass" d="M24 13H937L982 61V337L940 383H25L15 373V25Z" />
              <path className="sao-frame-top-shade" d="M865 13H935L980 61V96H929Z" />
              <path className="sao-frame-bottom-shade" d="M950 384L990 340V365L963 391H950Z" />
              <path className="sao-frame-rails" d="M944 4L996 59M960 4L997 45M976 4L998 30M950 395L996 347M965 395L997 360M980 395L998 374" />
              <path className="sao-frame-orange" d="M12 35V91" />
              <path className="sao-frame-ticks" d="M12 101l5 5M12 111l5 5M12 121l5 5M12 131l5 5M12 141l5 5" />
              <path className="sao-frame-divider" d="M4 303H996" />
              <path className="sao-frame-lower-accent" d="M950 391l45-48M964 393l34-36" />
            </svg>
            <header className="sao-console-header" onPointerDown={startConsoleDrag}>
              <ThemeEmblem
                className="sao-console-swords theme-emblem-image"
                src={activeThemeSystem?.emblemAsset ?? './assets/emblems/link-start-crossed-swords.png'}
                title="Link Start crossed swords"
              />
              <span className="sao-console-title">
                <strong>AINCRAD SYSTEM</strong>
                <small>SWORD ART ONLINE // LINK START</small>
              </span>
              <span className="sao-console-floor"><span>FLOOR 01</span><i aria-hidden="true" /></span>
              <svg className="sao-header-underline" viewBox="0 0 1000 80" preserveAspectRatio="none" aria-hidden="true">
                <path className="sao-underline-shadow" d="M18 67H132L170 22H438L451 34H790L804 39H963" />
                <path className="sao-underline-main" d="M18 63H128L166 18H435L448 30H785L800 35H963" />
                <path className="sao-underline-secondary" d="M18 70H134L173 26H439L453 38H786" />
                <path className="sao-underline-cyan" d="M806 35H842M856 35H887M902 35H929" />
                <path className="sao-underline-end" d="M963 27L972 35L963 43L954 35Z" />
              </svg>
            </header>
          </>
        )}
        {theme === 'grimoire' && (
          <>
            <svg className="grimoire-frame-ornaments" viewBox="0 0 1000 460" preserveAspectRatio="none" aria-hidden="true">
              <path className="grimoire-frame-outer" d="M20 3H980L997 20V440L980 457H20L3 440V20Z" />
              <path className="grimoire-frame-inner" d="M25 9H975L991 25V435L975 451H25L9 435V25Z" />
              <path className="grimoire-spine" d="M23 30V430M29 30V430" />
              <path className="grimoire-input-rule" d="M4 385H996" />
            </svg>
            <header className="grimoire-console-header" onPointerDown={startConsoleDrag}>
              <ThemeEmblem className="grimoire-console-emblem theme-emblem-image" src={activeThemeSystem?.emblemAsset ?? './assets/emblems/grimoire.png'} title="Five-leaf grimoire" />
              <span className="grimoire-console-title"><strong>GRIMOIRE</strong><small>BLACK CLOVER SYSTEM</small></span>
              <span className="grimoire-console-mark">FIVE-LEAF // ANTI-MAGIC</span>
              <svg className="grimoire-header-underline" viewBox="0 0 1000 110" preserveAspectRatio="none" aria-hidden="true">
                <path className="grimoire-underline-main" d="M24 87C45 86 60 76 77 59C91 45 106 39 123 43C137 46 145 57 159 65C175 75 188 78 210 78H474M518 78H897" />
                <path className="grimoire-underline-secondary" d="M24 92C48 91 63 81 81 64C95 51 108 46 122 49C137 52 147 63 162 71C179 81 191 84 211 84H474M518 84H897" />
                <path className="grimoire-underline-stem" d="M24 87C38 78 44 66 45 51M47 68C34 69 27 64 24 55C35 55 43 59 47 68ZM56 59C48 51 48 43 53 36C60 43 62 51 56 59ZM39 76C30 77 24 73 21 66C30 65 36 69 39 76ZM159 65C177 64 187 54 195 41M176 60C182 51 191 48 200 50C194 58 186 61 176 60ZM186 72C196 68 205 71 211 78C201 81 193 79 186 72Z" />
                <path className="grimoire-underline-diamond" d="M496 63L507 81L496 99L485 81Z" />
                <path className="grimoire-underline-leaf" d="M897 78C920 78 936 69 948 54C962 41 976 42 988 49C975 51 966 58 958 68C949 79 934 86 913 86C930 87 943 93 950 102C933 100 920 94 909 86H897Z" />
              </svg>
            </header>
          </>
        )}
        {theme === 'limitless' && (
          <>
            <svg className="limitless-frame-ornaments" viewBox="0 0 1000 460" preserveAspectRatio="none" aria-hidden="true">
              <defs>
                <linearGradient id="limitless-frame-gradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#17d9ff" />
                  <stop offset="48%" stopColor="#396eff" />
                  <stop offset="100%" stopColor="#c060ff" />
                </linearGradient>
              </defs>
              <path className="limitless-frame-outer" d="M42 4H958Q996 4 996 42V418Q996 456 958 456H42Q4 456 4 418V42Q4 4 42 4Z" />
              <path className="limitless-frame-inner" d="M46 10H954Q990 10 990 46V414Q990 450 954 450H46Q10 450 10 414V46Q10 10 46 10Z" />
              <path className="limitless-frame-arcs" d="M10 158C10 80 66 18 153 10M10 190C10 94 81 28 185 10M10 222C10 112 96 43 218 10M990 302C990 380 934 442 847 450M990 270C990 366 919 432 815 450M990 238C990 348 904 417 782 450" />
              <circle className="limitless-arc-point blue" cx="30" cy="93" r="2.1" />
              <circle className="limitless-arc-point blue" cx="67" cy="42" r="1.6" />
              <circle className="limitless-arc-point violet" cx="950" cy="377" r="1.8" />
              <circle className="limitless-arc-point violet" cx="974" cy="338" r="2.1" />
            </svg>
            <header className="limitless-console-header" onPointerDown={startConsoleDrag}>
              <ThemeEmblem className="limitless-console-emblem theme-emblem-image" src={activeThemeSystem?.emblemAsset ?? './assets/emblems/limitless1.png'} title="Limitless infinity emblem" />
              <span className="limitless-console-title"><strong>LIMITLESS</strong><small>JUJUTSU KAISEN SYSTEM</small></span>
              <span className="limitless-console-state">INFINITY // STABLE<i className="limitless-dot-blue" /><i className="limitless-dot-violet" /></span>
              <svg className="limitless-header-underline" viewBox="0 0 1000 120" preserveAspectRatio="none" aria-hidden="true">
                <path className="limitless-underline-left" d="M25 84C68 84 91 81 123 84C150 87 165 100 207 101H462" />
                <path className="limitless-underline-left second" d="M25 92C68 92 93 88 124 91C151 94 168 108 208 109H462" />
                <path className="limitless-underline-right" d="M538 84H855C896 84 921 70 950 48C969 34 983 32 989 39C995 47 980 61 962 73C933 92 907 101 855 101H538" />
                <path className="limitless-underline-right second" d="M538 92H853C894 92 920 78 947 57C965 43 978 40 983 45C988 51 975 63 957 76C930 94 904 109 853 109H538" />
                <circle className="limitless-gap-dot blue" cx="482" cy="88" r="3.2" />
                <circle className="limitless-gap-dot violet" cx="518" cy="96" r="3.2" />
                <circle className="limitless-loop-point" cx="989" cy="39" r="2.4" />
                <circle className="limitless-loop-point second" cx="962" cy="73" r="2" />
              </svg>
            </header>
          </>
        )}
        {theme === 'breathing-sun' && (
          <>
            <svg className="hinokami-frame-ornaments" viewBox="0 0 1000 460" preserveAspectRatio="none" aria-hidden="true">
              <path className="hinokami-frame-outer" d="M18 4H982V456H18Z" />
              <path className="hinokami-frame-inner" d="M24 10H976V450H24Z" />
              <path className="hinokami-checks" d="M38 34h13v13H38zM51 47h13v13H51zM38 60h13v13H38zM51 73h13v13H51zM38 86h13v13H38zM51 99h13v13H51zM38 112h13v13H38zM51 125h13v13H51zM38 138h13v13H38zM51 151h13v13H51zM38 164h13v13H38zM51 177h13v13H51zM38 190h13v13H38zM51 203h13v13H51zM38 216h13v13H38zM51 229h13v13H51z" />
              <path className="hinokami-checks-dark" d="M51 34h13v13H51zM38 47h13v13H38zM51 60h13v13H51zM38 73h13v13H38zM51 86h13v13H51zM38 99h13v13H38zM51 112h13v13H51zM38 125h13v13H38zM51 138h13v13H51zM38 151h13v13H38zM51 164h13v13H51zM38 177h13v13H38zM51 190h13v13H51zM38 203h13v13H38zM51 216h13v13H51zM38 229h13v13H38z" />
              <path className="hinokami-checks right" d="M949 18h10v10h-10zM959 28h10v10h-10zM949 38h10v10h-10zM959 48h10v10h-10z" />
            </svg>
            <header className="hinokami-console-header" onPointerDown={startConsoleDrag}>
              <div className="hinokami-header-main">
                <img className="hinokami-console-sword" src={SUN_BREATHING_KATANA} alt="Nichirin katana" />
                <span className="hinokami-console-title"><strong>HINOKAMI KAGURA</strong><small>DEMON SLAYER // TANJIRO KAMADO</small></span>
                <svg className="hinokami-header-underline" viewBox="0 0 1000 100" preserveAspectRatio="none" aria-hidden="true">
                  <path className="hinokami-underline-ivory" d="M0 90H1000" />
                </svg>
              </div>
              <img className="hinokami-console-flame" src="./assets/emblems/flame-short-trimmed.png" alt="" aria-hidden="true" />
            </header>
            <svg className="hinokami-hanafuda" viewBox="0 0 80 130" aria-hidden="true">
              <rect x="3" y="3" width="74" height="124" />
              <circle cx="40" cy="38" r="19" />
              <path d="M9 78L28 62L39 70L53 58L72 76M9 91L25 84L36 91L53 82L72 90M8 105C20 99 27 112 39 105S58 99 72 107" />
              <path className="hana-leaf" d="M49 18C60 15 64 21 66 28C57 29 51 25 49 18ZM13 48C22 43 29 47 32 54C23 57 17 54 13 48Z" />
            </svg>
          </>
        )}
        {theme === 'demon-mode' && (
          <>
            <svg className="demon-console-frame" viewBox="0 0 1000 460" preserveAspectRatio="none" aria-hidden="true">
              <path className="demon-frame-outer" d="M20 4H980L996 20V440L980 456H20L4 440V20Z" />
              <path className="demon-frame-inner" d="M25 10H975L990 25V435L975 450H25L10 435V25Z" />
            </svg>
            <div className="demon-console-ornaments" aria-hidden="true">
              <img className="demon-corner-art demon-corner-top-left" src="./assets/emblems/demon-corner-clasp-trimmed.png" alt="" />
              <img className="demon-corner-art demon-corner-top-right" src="./assets/emblems/demon-corner-clasp-trimmed.png" alt="" />
              <img className="demon-corner-art demon-corner-bottom-left" src="./assets/emblems/demon-corner-clasp-trimmed.png" alt="" />
              <img className="demon-corner-art demon-corner-bottom-right" src="./assets/emblems/demon-corner-clasp-trimmed.png" alt="" />
              <img className="demon-fissure-art demon-fissure-upper-right" src="./assets/emblems/demon-fissure-trimmed.png" alt="" />
              <img className="demon-fissure-art demon-fissure-lower-left" src="./assets/emblems/demon-fissure-trimmed.png" alt="" />
            </div>
            <header className="demon-console-header" onPointerDown={startConsoleDrag}>
              <div className="demon-header-main">
                <ThemeEmblem className="demon-console-emblem theme-emblem-image" src="./assets/emblems/dragon-emblem.png" title="Golden dragon emblem" />
                <span className="demon-console-title"><strong>DRAGON MODE</strong><small>DRAGON SIN OF WRATH // MELIODAS</small></span>
                <span className="demon-console-state"><img src="./assets/emblems/demon-seal-gem-trimmed.png" alt="" />POWER UNSEALED</span>
                <div className="demon-header-underline" aria-hidden="true">
                  <img className="demon-crescent-art" src="./assets/emblems/demon-crescent-trimmed.png" alt="" />
                  <div className="demon-underline-track">
                    <img className="demon-underline-segments" src="./assets/emblems/demon-underline-segments.png" alt="" />
                    <span className="demon-underline-rule" />
                    <img className="demon-underline-tip" src="./assets/emblems/demon-underline-tip.png" alt="" />
                  </div>
                </div>
              </div>
            </header>
          </>
        )}
        {theme === 'dragon' && (
          <>
            <svg className="night-fury-frame" viewBox="0 0 1000 460" preserveAspectRatio="none" aria-hidden="true">
              <path className="night-fury-frame-outer" d="M22 4H978L996 22V438L978 456H22L4 438V22Z" />
            </svg>
            <div className="night-fury-ornaments" aria-hidden="true">
              <img className="night-fury-corner night-fury-corner-tl" src="./assets/emblems/night-fury-corner-trimmed.png" alt="" />
              <img className="night-fury-corner night-fury-corner-tr" src="./assets/emblems/night-fury-corner-trimmed.png" alt="" />
              <img className="night-fury-corner night-fury-corner-bl" src="./assets/emblems/night-fury-corner-trimmed.png" alt="" />
              <img className="night-fury-corner night-fury-corner-br" src="./assets/emblems/night-fury-corner-trimmed.png" alt="" />
              <img className="night-fury-corner-fins" src="./assets/emblems/night-fury-corner-fins-trimmed.png" alt="" />
            </div>
            <header className="night-fury-header" onPointerDown={startConsoleDrag}>
              <img className="night-fury-header-emblem" src={activeThemeSystem?.emblemAsset ?? './assets/emblems/night-fury.png'} alt="Night Fury" />
              <span className="night-fury-header-title"><strong>NIGHT FURY</strong><small>HTTYD // TOOTHLESS PROTOCOL</small></span>
              <span className="night-fury-header-state"><i />ALPHA CLASS // LINKED</span>
              <img className="night-fury-header-tail" src="./assets/emblems/night-fury-header-tail-trimmed.png" alt="" aria-hidden="true" />
            </header>
          </>
        )}
        {theme === 'tokyo-ghoul' && (
          <>
            <svg className="kagune-console-frame" viewBox="0 0 1000 460" preserveAspectRatio="none" aria-hidden="true">
              <path className="kagune-frame-outer" d="M28 4H972L996 28V432L972 456H28L4 432V28Z" />
              <path className="kagune-frame-slashes" d="M14 39L31 22M14 48L40 22M14 57L49 22M986 39L969 22M986 48L960 22M986 57L951 22M14 421L31 438M14 412L40 438M14 403L49 438M986 421L969 438M986 412L960 438M986 403L951 438" />
            </svg>
            <header className="kagune-console-header" onPointerDown={startConsoleDrag}>
              <img className="kagune-header-emblem" src="./assets/kagune/kagune-header-emblem-trimmed.png" alt="" aria-hidden="true" />
              <span className="kagune-console-title"><strong>TOKYO GHOUL</strong><small><span>ONE-EYED KING //</span><span>KANEKI PROTOCOL</span></small></span>
              <span className="kagune-rc-tab"><i>//</i><b>RC TYPE // RINKAKU</b></span>
              <img className="kagune-header-tendril" src="./assets/kagune/kagune-header-tendril-trimmed.png" alt="" aria-hidden="true" />
              <img className="kagune-right-tendril" src="./assets/kagune/kagune-right-tendril-trimmed.png" alt="" aria-hidden="true" />
            </header>
          </>
        )}
        {themeSignature === 'none' && theme !== 'grimoire' && theme !== 'limitless' && theme !== 'breathing-sun' && theme !== 'dragon' && theme !== 'tokyo-ghoul' && (
          <div
            className={`console-theme-signature signature-${theme}`}
            style={{ '--signature-accent': activeThemeSystem?.activationPresentation.accent ?? STEALTH_PRESENTATION.accent, '--signature-secondary': activeThemeSystem?.activationPresentation.secondary ?? STEALTH_PRESENTATION.secondary } as CSSProperties}
            aria-hidden="true"
          >
            <span className="theme-signature-emblem-frame"><ThemeEmblem
              className="theme-signature-emblem theme-emblem-image"
              src={activeThemeSystem?.emblemAsset ?? './assets/emblems/tokyo-ghoul.png'}
              title={activeThemeSystem?.activationPresentation.title ?? 'SYSTEM'}
            /></span>
            <span className="theme-signature-copy"><b>{activeThemeSystem?.activationPresentation.title ?? 'SYSTEM'}</b><small>{activeThemeSystem?.activationPresentation.subtitle ?? ''}</small></span>
          </div>
        )}
        <div className="console-output" aria-live="polite">
          {consoleLines.map((line, index) => {
            const highlightedStatus = themeSignature === 'aincrad' || theme === 'grimoire' || theme === 'limitless' || theme === 'breathing-sun' || theme === 'demon-mode' || theme === 'dragon' || theme === 'tokyo-ghoul' ? line.match(/^(.*?)(\s+\.{2,}\s+)(.+)$/) : null
            const outputTone = theme === 'grimoire' ? 'grimoire' : theme === 'limitless' ? 'limitless' : theme === 'breathing-sun' ? 'hinokami' : theme === 'demon-mode' ? 'demon-mode' : theme === 'dragon' ? 'night-fury' : theme === 'tokyo-ghoul' ? 'tokyo-ghoul' : 'sao'
            return (
              <p key={`${index}-${line}`} className={index < 2 ? 'console-heading' : ''} onPointerDown={index === 0 ? startConsoleDrag : undefined}>
                {highlightedStatus ? <><span>{highlightedStatus[1]}</span><span className={`${outputTone}-output-leader`}>{highlightedStatus[2]}</span><span className={`${outputTone}-output-value${(theme === 'limitless' || theme === 'dragon') && /STABLE|STANDBY/i.test(highlightedStatus[3]) ? ' stable' : ''}${theme === 'demon-mode' && /AWAKENING|UNRESTRICTED/i.test(highlightedStatus[3]) ? ' awakening' : ''}`}>{highlightedStatus[3]}</span></> : line}
              </p>
            )
          })}
        </div>
        {theme === 'dragon' && (
          <div className="night-fury-bottom-divider" aria-hidden="true">
            <svg viewBox="0 0 1000 24" preserveAspectRatio="none">
              <path d="M8 12H484M516 12H992" />
              <path className="night-fury-divider-diamond" d="M500 3L509 12L500 21L491 12Z" />
            </svg>
          </div>
        )}
        <form className="command-line" onSubmit={submitCommand}>
          {theme === 'tokyo-ghoul' && <img className="kagune-bottom-tendril" src="./assets/kagune/kagune-bottom-tendril-trimmed.png" alt="" aria-hidden="true" />}
          <span className="command-entry">
            <span className="command-prefix">C:\ELUCIDATOR\SYSTEM&gt;</span>
            <input
              autoComplete="off"
              aria-label="Enter a wallpaper command"
              spellCheck={false}
              value={command}
              onChange={(event) => {
                setCommand(event.target.value)
                completionRef.current = null
                if (historyIndexRef.current === commandHistoryRef.current.length) commandDraftRef.current = event.target.value
              }}
              onKeyDown={handleCommandKeyDown}
              onClick={() => {
                if (!nightStealth) return
                setNightStealth(false)
                report(['NIGHT FURY STEALTH', 'COMMAND INPUT CONFIRMED', 'WIDGET ARRAY ........... RESTORED'])
                setStatus('NIGHT FURY STEALTH DISENGAGED')
              }}
              placeholder="sys status"
            />
          </span>
          <button type="submit" aria-label="Run command">↵</button>
        </form>
        <p className="console-status" aria-live="polite">{status}</p>
      </section>

      <input
        ref={fileInputRef}
        className="wallpaper-file-input"
        type="file"
        accept="image/*"
        onChange={chooseWallpaper}
        tabIndex={-1}
        aria-hidden="true"
      />
    </main>
  )
}

export default App
