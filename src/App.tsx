import { useEffect, useRef, useState, type AnimationEvent, type ChangeEvent, type FormEvent, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react'
import { parseLivelySystemInfo, type LivelySystemInfo } from './livelySystemInfo'
import './App.css'

declare global {
  interface Window {
    livelySystemInformation?: (data: unknown) => void
  }
}

type SavedWallpaper = { blob: Blob; name: string }
type SystemMode = 'NORMAL' | 'STEALTH' | 'COMBAT' | 'IDLE' | 'DIAGNOSTIC'
type ThemeId = 'sao' | 'arise' | 'grimoire' | 'anti-magic' | 'domain-expansion' | 'limitless' | 'breathing-water' | 'breathing-sun' | 'demon-mode' | 'dragon'
type VisualTheme = 'off' | 'haze' | 'rain' | 'lightning' | 'particles' | 'vignette'
type SpecialEffect = { kind: string; id: number }
type WidgetPosition = { x: number; y: number }
type WidgetPositions = Record<number, WidgetPosition>
type ConsoleFrame = { x: number; y: number; width: number; height: number }
type BootMessage = { text: string; result: string; pause?: number }
type BootPhase = { id: string; title: string; messages: BootMessage[] }
type TimedMessage = BootMessage & { start: number; duration: number; end: number }
type TimedPhase = { id: string; title: string; start: number; messages: TimedMessage[] }
type BootTimeline = { phases: TimedPhase[]; duration: number }
type HardwareFeedStatus = 'waiting' | 'live' | 'browser' | 'stale' | 'invalid'
type HardwareFeed = { status: HardwareFeedStatus; readings: LivelySystemInfo | null; updatedAt: number | null }

const DATABASE = 'project-elucidator-wallpaper'
const STORE = 'selection'
const KEY = 'active'
const WIDGET_PREF_KEY = 'project-elucidator-widgets'
const WIDGET_POSITION_KEY = 'project-elucidator-widget-positions'
const CONSOLE_FRAME_KEY = 'project-elucidator-console-frame'
const THEME_PREF_KEY = 'project-elucidator-theme'
const VISUAL_THEME_PREF_KEY = 'project-elucidator-visual-theme'
const VISUAL_THEMES: VisualTheme[] = ['off', 'haze', 'rain', 'lightning', 'particles', 'vignette']
const TYPE_RATE = 185
const LINE_GAP = 0.035
const PHASE_PAUSE = 0.2
const SYSTEM_VERSION = '1.0.0'

function createBootTimeline(hasWallpaper: boolean): BootTimeline {
  const phases: BootPhase[] = [
    {
      id: '01',
      title: 'SYSTEM INITIALIZATION',
      messages: [
        { text: 'SYSTEM.INIT()', result: 'OK', pause: 0.09 },
        { text: 'MEMORY.CHECK: 16384 MB', result: 'OK' },
        { text: 'KERNEL: INITIALIZING...', result: 'READY', pause: 0.12 },
        { text: 'SYSTEM.CLOCK: SYNCHRONIZED', result: 'OK' },
        { text: 'SECURITY.CORE: ONLINE', result: 'READY' },
        { text: 'PROCESS.TABLE: MOUNTED', result: 'OK' },
        { text: 'CACHE.CONTROLLER: READY', result: 'OK' },
        { text: 'SIGNAL.BUS: 12/12 CHANNELS', result: 'STABLE' },
      ],
    },
    {
      id: '02',
      title: 'WORLD / DISPLAY INITIALIZATION',
      messages: [
        { text: 'DISPLAY.DRIVER: LOADED', result: 'OK' },
        { text: 'RENDER.ENGINE: ONLINE', result: 'READY' },
        { text: 'FRAME.BUFFER: ALLOCATED', result: 'OK' },
        { text: 'ASSET.DECODER: READY', result: 'READY' },
        { text: 'SHADER.CACHE: WARM', result: 'OK' },
        { text: 'COLOR.PIPELINE: SYNCHRONIZED', result: 'OK' },
        { text: 'WORLD.INSTANCE: RESTORING', result: 'RUN', pause: 0.12 },
        { text: 'SCENE.GRAPH: LINKED', result: 'OK' },
        { text: 'RESOLUTION.ADAPTER: ONLINE', result: 'READY' },
      ],
    },
    {
      id: '03',
      title: 'WALLPAPER SYNCHRONIZATION',
      messages: [
        { text: `WALLPAPER.CACHE: ${hasWallpaper ? 'RESTORED' : 'EMPTY'}`, result: hasWallpaper ? 'HIT' : 'MISS' },
        { text: 'FILE.SELECTOR: READY', result: 'READY' },
        { text: `IMAGE.BUFFER: ${hasWallpaper ? 'SYNCHRONIZING' : 'AWAITING FILE'}`, result: hasWallpaper ? 'RUN' : 'IDLE' },
        { text: `TEXTURE.DECODER: ${hasWallpaper ? 'ONLINE' : 'STANDBY'}`, result: hasWallpaper ? 'OK' : 'IDLE' },
        { text: `VISUAL.LAYER: ${hasWallpaper ? 'MATERIALIZING' : 'AWAITING IMAGE'}`, result: hasWallpaper ? 'RUN' : 'IDLE', pause: 0.12 },
        { text: 'ENVIRONMENT: STABLE', result: 'OK' },
        { text: 'COMPOSITOR: LOCKED', result: 'OK' },
        { text: 'DISPLAY.SYNC: COMPLETE', result: 'READY' },
        { text: 'INPUT.CONSOLE: ACTIVE', result: 'READY' },
      ],
    },
  ]

  let cursor = 0.12
  const timedPhases = phases.map((phase) => {
    const start = cursor
    cursor += PHASE_PAUSE
    const messages = phase.messages.map((message) => {
      const duration = Math.max(0.13, message.text.length / TYPE_RATE)
      const timedMessage = { ...message, start: cursor, duration, end: cursor + duration }
      cursor = timedMessage.end + LINE_GAP + (message.pause ?? 0)
      return timedMessage
    })
    cursor += PHASE_PAUSE
    return { id: phase.id, title: phase.title, start, messages }
  })

  return { phases: timedPhases, duration: cursor }
}

function openWallpaperDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1)
    request.onupgradeneeded = () => request.result.createObjectStore(STORE)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function readSavedWallpaper() {
  const database = await openWallpaperDatabase()
  return new Promise<SavedWallpaper | undefined>((resolve, reject) => {
    const request = database.transaction(STORE, 'readonly').objectStore(STORE).get(KEY)
    request.onsuccess = () => { database.close(); resolve(request.result as SavedWallpaper | undefined) }
    request.onerror = () => { database.close(); reject(request.error) }
  })
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
    image.onload = () => resolve()
    image.onerror = () => reject(new Error('The selected file is not a readable image.'))
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
  if (status === 'browser') return 'BROWSER MODE'
  if (status === 'invalid') return 'INVALID DATA'
  return 'WAITING FOR LIVELY'
}

const COMMAND_COMPLETIONS = [
  'sys status', 'sys wallpaper', 'sys wallpaper current', 'sys wallpaper select', 'sys wallpaper list',
  'sys wallpaper next', 'sys wallpaper previous', 'sys wallpaper scan', 'sys hardware', 'sys time', 'sys audio',
  'sys mode', 'sys mode normal', 'sys mode stealth', 'sys mode combat', 'sys mode idle', 'sys mode diagnostic',
  'sys widgets', 'sys widgets all on', 'sys widgets all off',
  'sys widget 1 on', 'sys widget 1 off', 'sys widget 2 on', 'sys widget 2 off',
  'sys widget 3 on', 'sys widget 3 off', 'sys widget 4 on', 'sys widget 4 off',
  'sys widget move 1 50 20', 'sys widget reset', 'sys standby', 'sys arise', 'sys link start',
  'sys grimoire', 'sys anti-magic', 'sys domain expansion', 'sys limitless',
  'sys breathing water', 'sys hinokami kagura', 'sys demon mode', 'sys full counter', 'sys httyd', 'sys night fury', 'sys plasma', 'sys stealth', 'sys alpha', 'sys help', 'help',
  'visual list', 'visual haze', 'visual rain', 'visual lightning', 'visual particles', 'visual vignette', 'visual off', 'visual status',
]

function findCommandCompletions(value: string) {
  const prefix = value.toLowerCase().replace(/\s+/g, ' ')
  if (/^visual\s+$/.test(prefix)) return COMMAND_COMPLETIONS.filter((candidate) => candidate.startsWith('visual '))
  if (/^sys wallpaper\s+$/.test(prefix)) {
    return ['current', 'select', 'list', 'next', 'previous', 'scan'].map((action) => `sys wallpaper ${action}`)
  }
  if (/^sys mode\s+$/.test(prefix)) {
    return ['normal', 'stealth', 'combat', 'idle', 'diagnostic'].map((mode) => `sys mode ${mode}`)
  }
  if (/^sys breathing\s+$/.test(prefix)) return ['sys breathing water', 'sys hinokami kagura']
  if (/^sys widgets\s+$/.test(prefix)) return ['sys widgets all on', 'sys widgets all off']
  if (/^sys widget\s+$/.test(prefix)) return [
    'sys widget 1 on', 'sys widget 1 off', 'sys widget 2 on', 'sys widget 2 off',
    'sys widget 3 on', 'sys widget 3 off', 'sys widget 4 on', 'sys widget 4 off',
    'sys widget move 1 50 20', 'sys widget reset',
  ]
  return COMMAND_COMPLETIONS.filter((candidate) => candidate.startsWith(prefix))
}

function App() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const objectUrlRef = useRef<string | null>(null)
  const finishingBootRef = useRef(false)
  const sessionStartedAt = useRef(Date.now())
  const commandHistoryRef = useRef<string[]>([])
  const historyIndexRef = useRef(0)
  const commandDraftRef = useRef('')
  const completionRef = useRef<{ lastValue: string; candidates: string[]; index: number } | null>(null)
  const draggingWidgetRef = useRef<{ id: number; offsetX: number; offsetY: number } | null>(null)
  const widgetExitTimersRef = useRef<Map<number, number>>(new Map())
  const resizingConsoleRef = useRef<{ edge: string; startX: number; startY: number; frame: ConsoleFrame } | null>(null)
  const draggingConsoleRef = useRef<{ offsetX: number; offsetY: number; frame: ConsoleFrame } | null>(null)
  const effectIdRef = useRef(0)
  const hardwareLastPublishedRef = useRef(0)
  const [wallpaperUrl, setWallpaperUrl] = useState('')
  const [wallpaperName, setWallpaperName] = useState('NO WALLPAPER SELECTED')
  const [ready, setReady] = useState(false)
  const [booting, setBooting] = useState(true)
  const [bootElapsed, setBootElapsed] = useState(0)
  const [revealComplete, setRevealComplete] = useState(false)
  const [readyMessage, setReadyMessage] = useState(false)
  const [bootToken, setBootToken] = useState(0)
  const [command, setCommand] = useState('')
  const [status, setStatus] = useState('SYSTEM CONSOLE ONLINE · SYS HELP')
  const [mode, setMode] = useState<SystemMode>('NORMAL')
  const [theme, setTheme] = useState<ThemeId>('sao')
  const [visualTheme, setVisualTheme] = useState<VisualTheme>(() => {
    try {
      const saved = localStorage.getItem(VISUAL_THEME_PREF_KEY) as VisualTheme | null
      return saved && VISUAL_THEMES.includes(saved) ? saved : 'off'
    } catch {
      return 'off'
    }
  })
  const [specialEffect, setSpecialEffect] = useState<SpecialEffect | null>(null)
  const [stealthUntil, setStealthUntil] = useState(0)
  const [nightFuryAlpha, setNightFuryAlpha] = useState(false)
  const [hardwareFeed, setHardwareFeed] = useState<HardwareFeed>({ status: 'waiting', readings: null, updatedAt: null })
  const [wallpaperLibrary, setWallpaperLibrary] = useState<Array<{ id: string; wallpaper: SavedWallpaper }>>([])
  const [enabledWidgets, setEnabledWidgets] = useState<number[]>([])
  const [renderedWidgets, setRenderedWidgets] = useState<number[]>([])
  const [leavingWidgetIds, setLeavingWidgetIds] = useState<number[]>([])
  const [widgetPositions, setWidgetPositions] = useState<WidgetPositions>({})
  const [consoleFrame, setConsoleFrame] = useState<ConsoleFrame | null>(null)
  const [clockNow, setClockNow] = useState(() => new Date())
  const [consoleLines, setConsoleLines] = useState<string[]>(['ELUCIDATOR // MAINFRAME', 'SYSTEM ONLINE · WALLPAPER READY', 'ENTER SYS HELP FOR COMMANDS.'])
  const timeline = createBootTimeline(Boolean(wallpaperUrl))
  const progress = Math.min(1, bootElapsed / timeline.duration)
  const progressPercent = Math.round(progress * 100)

  useEffect(() => {
    let cancelled = false
    const restore = async () => {
      try {
        const saved = await readSavedWallpaper()
        const library = await readWallpaperLibrary()
        if (cancelled) return
        setWallpaperLibrary(library)
        if (saved?.blob) {
          const url = URL.createObjectURL(saved.blob)
          objectUrlRef.current = url
          setWallpaperUrl(url)
          setWallpaperName(saved.name)
          setStatus(`WALLPAPER RESTORED · ${saved.name.toUpperCase()}`)
        }
      } catch {
        if (!cancelled) setStatus('CACHE UNAVAILABLE · USING FILE SELECTOR')
      } finally {
        if (!cancelled) setReady(true)
      }
    }
    void restore()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(WIDGET_PREF_KEY) ?? '[]') as unknown
      if (Array.isArray(stored)) {
        const ids = stored.filter((id): id is number => Number.isInteger(id) && id >= 1 && id <= 4)
        setEnabledWidgets(ids)
        setRenderedWidgets(ids)
      }
    } catch {
      // Keep widgets closed if saved preferences are unavailable.
    }
  }, [])

  useEffect(() => {
    try { localStorage.setItem(WIDGET_PREF_KEY, JSON.stringify(enabledWidgets)) } catch { /* Preferences are optional. */ }
  }, [enabledWidgets])

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(WIDGET_POSITION_KEY) ?? '{}') as unknown
      if (stored && typeof stored === 'object') {
        const valid = Object.fromEntries(Object.entries(stored).flatMap(([id, value]) => {
          const position = value as WidgetPosition
          return Number(id) >= 1 && Number(id) <= 4 && Number.isFinite(position?.x) && Number.isFinite(position?.y)
            ? [[Number(id), { x: Math.min(100, Math.max(0, position.x)), y: Math.min(100, Math.max(0, position.y)) }]]
            : []
        })) as WidgetPositions
        setWidgetPositions(valid)
      }
    } catch { /* Default positions are used if preferences are unavailable. */ }
  }, [])

  useEffect(() => {
    try { localStorage.setItem(WIDGET_POSITION_KEY, JSON.stringify(widgetPositions)) } catch { /* Preferences are optional. */ }
  }, [widgetPositions])

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
        })
      }
    } catch { /* Use the default console dimensions if preferences are unavailable. */ }
  }, [])

  useEffect(() => {
    try {
      const saved = localStorage.getItem(THEME_PREF_KEY) as ThemeId | null
      const available: ThemeId[] = ['sao', 'arise', 'grimoire', 'anti-magic', 'domain-expansion', 'limitless', 'breathing-water', 'breathing-sun', 'demon-mode', 'dragon']
      if (saved && available.includes(saved)) setTheme(saved)
    } catch { /* Keep the default cyan theme if preferences are unavailable. */ }
  }, [])

  useEffect(() => {
    try { localStorage.setItem(THEME_PREF_KEY, theme) } catch { /* Theme preference is optional. */ }
  }, [theme])

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
    try { localStorage.setItem(VISUAL_THEME_PREF_KEY, visualTheme) } catch { /* Visual preference is optional. */ }
  }, [visualTheme])

  useEffect(() => {
    if (!specialEffect) return
    const timer = window.setTimeout(() => setSpecialEffect(null), 1700)
    return () => window.clearTimeout(timer)
  }, [specialEffect])

  useEffect(() => {
    if (!stealthUntil) return
    const timer = window.setTimeout(() => setStealthUntil(0), Math.max(0, stealthUntil - Date.now()))
    return () => window.clearTimeout(timer)
  }, [stealthUntil])

  useEffect(() => {
    try {
      if (consoleFrame) localStorage.setItem(CONSOLE_FRAME_KEY, JSON.stringify(consoleFrame))
    } catch { /* The default position remains usable without storage. */ }
  }, [consoleFrame])

  useEffect(() => {
    if (!enabledWidgets.some((id) => id === 2 || id === 3)) return
    const timer = window.setInterval(() => setClockNow(new Date()), 1000)
    return () => window.clearInterval(timer)
  }, [enabledWidgets])

  useEffect(() => () => {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
  }, [])

  useEffect(() => () => {
    widgetExitTimersRef.current.forEach((timer) => window.clearTimeout(timer))
    widgetExitTimersRef.current.clear()
  }, [])

  useEffect(() => {
    if (!ready) return
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    finishingBootRef.current = false
    setReadyMessage(false)
    setBootElapsed(0)
    setRevealComplete(!wallpaperUrl || reducedMotion)

    if (reducedMotion) {
      setBooting(false)
      setBootElapsed(timeline.duration)
      return
    }

    setBooting(true)
    const startedAt = performance.now()
    const interval = window.setInterval(() => {
      const elapsed = Math.min(timeline.duration, (performance.now() - startedAt) / 1000)
      setBootElapsed(elapsed)
      if (elapsed >= timeline.duration) window.clearInterval(interval)
    }, 32)
    return () => window.clearInterval(interval)
  }, [ready, bootToken, wallpaperUrl])

  useEffect(() => {
    if (!ready || !booting || finishingBootRef.current || !revealComplete || bootElapsed < timeline.duration) return
    finishingBootRef.current = true
    setReadyMessage(true)
    const timer = window.setTimeout(() => setBooting(false), 1050)
    return () => window.clearTimeout(timer)
  }, [ready, booting, revealComplete, bootElapsed, timeline.duration])

  const openFilePicker = () => {
    setStatus('SELECT A WALLPAPER FILE')
    fileInputRef.current?.click()
  }

  const report = (lines: string[]) => setConsoleLines(lines)
  const openWidget = (id: number) => {
    const timer = widgetExitTimersRef.current.get(id)
    if (timer !== undefined) window.clearTimeout(timer)
    widgetExitTimersRef.current.delete(id)
    setLeavingWidgetIds((current) => current.filter((widgetId) => widgetId !== id))
    setRenderedWidgets((current) => [...new Set([...current, id])])
    setEnabledWidgets((current) => [...new Set([...current, id])])
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
      setWallpaperUrl(nextUrl)
      setWallpaperName(selection.name)
      setBootElapsed(0)
      setRevealComplete(false)
      setReadyMessage(false)
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
    if (submittedCommand) commandHistoryRef.current.push(submittedCommand)
    historyIndexRef.current = commandHistoryRef.current.length
    commandDraftRef.current = ''
    setCommand('')

    const args = normalized.replace(/^sys\s*/, '').split(' ').filter(Boolean)
    const [domain, action] = args

    if (domain === 'visual') {
      if (!action || action === 'list') {
        report(['VISUAL THEMES', ...VISUAL_THEMES.map((item) => (item === visualTheme ? 'ACTIVE ' : 'AVAILABLE') + ' Â· VISUAL ' + item.toUpperCase()), 'SELECT ONE Â· VISUAL <THEME>'])
        setStatus('VISUAL THEMES Â· ' + visualTheme.toUpperCase() + ' ACTIVE')
      } else if (action === 'status' && args.length === 2) {
        report(['VISUAL THEME STATUS', 'ACTIVE ................. ' + visualTheme.toUpperCase(), 'INDEPENDENT OF WALLPAPER AND SYSTEM THEME'])
        setStatus('VISUAL THEME Â· ' + visualTheme.toUpperCase())
      } else if (VISUAL_THEMES.includes(action as VisualTheme) && args.length === 2) {
        const selected = action as VisualTheme
        setVisualTheme(selected)
        report(selected === 'off'
          ? ['VISUAL EFFECTS', 'ALL ATMOSPHERIC LAYERS .... OFF']
          : ['VISUAL EFFECT UPDATED', 'ACTIVE ................. ' + selected.toUpperCase(), 'WALLPAPER AND SYSTEM THEME .. UNCHANGED'])
        setStatus('VISUAL THEME Â· ' + selected.toUpperCase())
      } else {
        report(['VISUAL COMMAND ERROR', 'USAGE Â· VISUAL [LIST|STATUS|HAZE|RAIN|LIGHTNING|PARTICLES|VIGNETTE|OFF]'])
        setStatus('VISUAL COMMAND ERROR')
      }
    } else if (normalized === 'help' || normalized === 'sys help' || normalized === '?') {
      report(['ELUCIDATOR // MAINFRAME', 'SYS STATUS · SYS WALLPAPER [SELECT|SCAN]', 'SYS HARDWARE · SYS TIME · SYS AUDIO · SYS WIDGETS', 'SYS ARISE · SYS GRIMOIRE · SYS DOMAIN EXPANSION', 'SYS BREATHING WATER · SYS HINOKAMI KAGURA · SYS DEMON MODE', 'SYS HTTYD · SYS PLASMA · SYS STEALTH · SYS ALPHA', 'SYS LINK START · RESTORE CYAN'])
      setStatus('SYSTEM HELP · COMMAND INDEX')
    } else if ((domain === 'httyd' && args.length === 1) || (domain === 'night' && action === 'fury' && args.length === 2)) {
      setTheme('dragon')
      setNightFuryAlpha(false)
      setStealthUntil(0)
      report(['NIGHT FURY', 'ELUCIDATOR // TOOTHLESS PROTOCOL', 'ONLINE', 'PLASMA CORE // STANDBY', 'NIGHT FURY SIGNATURE DETECTED'])
      setStatus('NIGHT FURY PROTOCOL ACTIVATED')
    } else if (domain === 'plasma' && args.length === 1) {
      setTheme('dragon')
      setNightFuryAlpha(false)
      setStealthUntil(0)
      setSpecialEffect({ kind: 'plasma-charge', id: ++effectIdRef.current })
      report(['PLASMA CORE // CHARGING', 'NIGHT FURY SIGNATURE DETECTED', 'PLASMA OUTPUT .......... 78%'])
      setStatus('PLASMA CORE CHARGED · 78%')
    } else if (domain === 'stealth' && args.length === 1) {
      setTheme('dragon')
      setNightFuryAlpha(false)
      setStealthUntil(Date.now() + 8000)
      report(['NIGHT FURY STEALTH', 'SIGNATURE .............. SUPPRESSED', 'LOW-LIGHT PROFILE ...... ACTIVE · 8 SEC'])
      setStatus('TEMPORARY STEALTH ENGAGED')
    } else if (domain === 'alpha' && args.length === 1) {
      setTheme('dragon')
      setStealthUntil(0)
      setNightFuryAlpha(true)
      setSpecialEffect({ kind: 'alpha', id: ++effectIdRef.current })
      report(['ALPHA PROTOCOL // TOOTHLESS', 'PLASMA CORE ............ FULL POWER', 'NIGHT FURY SIGNATURE ... MAXIMUM'])
      setStatus('NIGHT FURY ALPHA · FULL POWER')
    } else if (domain === 'grimoire' && args.length === 1) {
      setTheme('grimoire')
      report(['FIVE-LEAF GRIMOIRE DETECTED', 'CRIMSON SYSTEM .......... ONLINE', 'ANTI-MAGIC SEAL ........ STANDBY'])
      setStatus('GRIMOIRE PROTOCOL ACTIVATED')
    } else if (domain === 'anti-magic' && args.length === 1) {
      setTheme('anti-magic')
      setSpecialEffect({ kind: 'anti-magic', id: ++effectIdRef.current })
      report(['ANTI-MAGIC RELEASE', 'DARK ENERGY PULSE ........ DISCHARGED', 'WALLPAPER FIELD .......... STABLE'])
      setStatus('ANTI-MAGIC PULSE RELEASED')
    } else if (domain === 'domain' && action === 'expansion' && args.length === 2) {
      setTheme('domain-expansion')
      setSpecialEffect({ kind: 'domain', id: ++effectIdRef.current })
      report(['CURSED ENERGY OUTPUT: UNRESTRICTED', 'DOMAIN EXPANSION ........ DEPLOYED', 'SPATIAL FIELD ........... STABLE'])
      setStatus('DOMAIN EXPANSION DEPLOYED')
    } else if (domain === 'limitless' && args.length === 1) {
      setTheme('limitless')
      setSpecialEffect({ kind: 'limitless', id: ++effectIdRef.current })
      report(['LIMITLESS TECHNIQUE', 'SPATIAL DISTORTION ....... ACTIVE', 'INFINITY FIELD .......... STABLE'])
      setStatus('LIMITLESS PROTOCOL ACTIVATED')
    } else if ((domain === 'breathing' && action === 'water' && args.length === 2)
      || (domain === 'hinokami' && action === 'kagura' && args.length === 2)
      || (domain === 'breathing' && action === 'sun' && args.length === 2)) {
      const sun = domain === 'hinokami' || action === 'sun'
      setTheme(sun ? 'breathing-sun' : 'breathing-water')
      setSpecialEffect({ kind: sun ? 'breathing-sun' : 'breathing-water', id: ++effectIdRef.current })
      report(sun
        ? ['HINOKAMI KAGURA', 'FLAME BREATHING .......... IGNITED', 'SYSTEM COLOR ............ SUNSET RED']
        : ['WATER BREATHING', 'FLOW STATE .............. SYNCHRONIZED', 'SYSTEM COLOR ............ DEEP WATER BLUE'])
      setStatus(`${sun ? 'SUN' : 'WATER'} BREATHING ACTIVATED`)
    } else if (domain === 'demon' && action === 'mode' && args.length === 2) {
      setTheme('demon-mode')
      setSpecialEffect({ kind: 'demon', id: ++effectIdRef.current })
      report(['DEMON MARK: DETECTED', 'MAGIC POWER: UNRESTRICTED', 'SYSTEM COLOR: GOLD / PURPLE', 'MELIODAS PROTOCOL // ACTIVATED'])
      setStatus('DEMON MODE AWAKENED')
    } else if (domain === 'full' && action === 'counter' && args.length === 2) {
      setSpecialEffect({ kind: 'full-counter', id: ++effectIdRef.current })
      report(['FULL COUNTER', 'INCOMING SCAN ........... REFLECTED', 'RETURN WAVE ............. RELEASED'])
      setStatus('FULL COUNTER RELEASED')
    } else if (domain === 'arise' && args.length === 1) {
      setTheme('arise')
      report(['SHADOW PROTOCOL // ARISE', 'PURPLE INTERFACE ........ ACTIVE', 'THEME SAVED TO LOCAL SYSTEM.'])
      setStatus('ARISE THEME ACTIVATED')
    } else if (domain === 'link' && action === 'start' && args.length === 2) {
      setTheme('sao')
      setSpecialEffect(null)
      setStealthUntil(0)
      setNightFuryAlpha(false)
      report(['ELUCIDATOR // MAINFRAME', 'SYSTEM LINK ............ ESTABLISHED', 'STANDARD CYAN INTERFACE .. RESTORED'])
      setStatus('SYSTEM LINK STARTED · CYAN THEME RESTORED')
    } else if (domain === 'status' && args.length === 1) {
      openWidget(3)
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
        'ALL SYSTEMS OPERATIONAL.',
      ])
      setStatus('SYSTEM STATUS: NOMINAL')
    } else if (domain === 'wallpaper') {
      if (action === 'scan') {
        if (!wallpaperUrl) {
          report(['WALLPAPER SCAN', 'NO ACTIVE WALLPAPER · USE SYS WALLPAPER SELECT'])
          setStatus('SCAN UNAVAILABLE · NO WALLPAPER SELECTED')
        } else {
          setBootElapsed(0)
          setRevealComplete(false)
          setReadyMessage(false)
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
        report(['SAVED WALLPAPERS', ...entries.map((entry, index) => `${String(index + 1).padStart(2, '0')} · ${entry.wallpaper.name.toUpperCase()}${entry.wallpaper.name === wallpaperName ? ' · ACTIVE' : ''}`), entries.length ? 'USE SYS WALLPAPER NEXT TO SWITCH.' : 'NO SAVED IMAGES FOUND.'])
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
        report(['WALLPAPER STATUS', `ACTIVE ................. ${wallpaperUrl ? wallpaperName.toUpperCase() : 'NONE'}`, `CACHE ................. ${wallpaperUrl ? 'READY' : 'EMPTY'}`])
        setStatus(wallpaperUrl ? `ACTIVE WALLPAPER · ${wallpaperName.toUpperCase()}` : 'NO WALLPAPER SELECTED')
      } else {
        report(['WALLPAPER COMMAND ERROR', 'USAGE · SYS WALLPAPER [CURRENT|SELECT|LIST|NEXT|PREVIOUS|SCAN]'])
      }
    } else if (domain === 'time' && args.length === 1) {
      openWidget(2)
      const now = new Date()
      report(['WORLD CLOCK', `LOCAL TIME ............. ${new Intl.DateTimeFormat(undefined, { dateStyle: 'full', timeStyle: 'medium' }).format(now)}`, `SESSION UPTIME ......... ${formatUptime((Date.now() - sessionStartedAt.current) / 1000)}`, `AINCRAD CLOCK .......... DAY ${Math.floor((Date.now() - sessionStartedAt.current) / 86_400_000) + 1} · ${now.toLocaleTimeString()}`])
      setStatus('WORLD CLOCK SYNCHRONIZED')
    } else if (domain === 'mode') {
      const modes: SystemMode[] = ['NORMAL', 'STEALTH', 'COMBAT', 'IDLE', 'DIAGNOSTIC']
      const requested = action?.toUpperCase() as SystemMode | undefined
      if (!requested) report(['SYSTEM MODES', ...modes.map((item) => `${item === mode ? '●' : '○'} ${item}`), 'USAGE · SYS MODE <MODE>'])
      else if (modes.includes(requested)) {
        setMode(requested)
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
      report(['AUDIO CONTROL', 'NO PLAYER INTEGRATION CONNECTED.', 'TRACK METADATA AND PLAYBACK CONTROL REQUIRE A SUPPORTED PLAYER API.'])
      setStatus('AUDIO INTEGRATION · OFFLINE')
    } else if (domain === 'standby' && args.length === 1) {
      report(['ELUCIDATOR // MAINFRAME', 'SYSTEM ONLINE · WALLPAPER READY', 'ENTER SYS HELP FOR COMMANDS.'])
      setStatus('MAINFRAME STANDBY · READY')
    } else if (domain === 'widgets' && args[1] === 'all' && ['on', 'off'].includes(args[2])) {
      const enable = args[2] === 'on'
      if (enable) [1, 2, 3, 4].forEach(openWidget)
      else [1, 2, 3, 4].forEach(closeWidget)
      report(['DIGITAL WIDGET ARRAY', `ALL DISPLAYS ........... ${enable ? 'ONLINE' : 'OFFLINE'}`, `WIDGETS ACTIVE ......... ${enable ? '04 / 04' : '00 / 04'}`])
      setStatus(`ALL WIDGETS ${enable ? 'ENABLED' : 'DISABLED'}`)
    } else if (domain === 'widgets' && args.length === 1) {
      const titles = ['HARDWARE TELEMETRY', 'WORLD CLOCK', 'SYSTEM STATUS', 'AUDIO LINK']
      report(['DIGITAL WIDGETS · 1–4', ...titles.map((title, index) => `${enabledWidgets.includes(index + 1) ? 'ONLINE ' : 'OFFLINE'} · ${index + 1} · ${title}`), 'CONTROL · SYS WIDGET <1–4> ON|OFF'])
      setStatus(`${enabledWidgets.length} WIDGET${enabledWidgets.length === 1 ? '' : 'S'} ACTIVE`)
    } else if (domain === 'widget' && action === 'move' && args.length === 5) {
      const id = Number(args[2])
      const x = Number(args[3])
      const y = Number(args[4])
      if (!Number.isInteger(id) || id < 1 || id > 4 || !Number.isFinite(x) || !Number.isFinite(y) || x < 0 || x > 100 || y < 0 || y > 100) {
        report(['WIDGET POSITION ERROR', 'USAGE · SYS WIDGET MOVE <1–4> <X% 0–100> <Y% 0–100>'])
      } else {
        setWidgetPositions((current) => ({ ...current, [id]: { x, y } }))
        openWidget(id)
        report([`WIDGET ${String(id).padStart(2, '0')} POSITION`, `HORIZONTAL ............ ${x}%`, `VERTICAL .............. ${y}%`, 'POSITION SAVED.'])
        setStatus(`WIDGET ${id} POSITION UPDATED`)
      }
    } else if (domain === 'widget' && action === 'reset' && args.length === 2) {
      setWidgetPositions({})
      report(['WIDGET LAYOUT', 'CUSTOM POSITIONS CLEARED.', 'DEFAULT RIGHT-SIDE LAYOUT RESTORED.'])
      setStatus('WIDGET LAYOUT RESET')
    } else if (domain === 'widget' && args.length === 3) {
      const id = Number(action)
      const setting = args[2]
      const titles = ['HARDWARE TELEMETRY', 'WORLD CLOCK', 'SYSTEM STATUS', 'AUDIO LINK']
      if (!Number.isInteger(id) || id < 1 || id > 4 || !['on', 'off', 'enable', 'disable'].includes(setting)) {
        report(['WIDGET COMMAND ERROR', 'USAGE · SYS WIDGET <1–4> ON|OFF'])
      } else {
        const enable = setting === 'on' || setting === 'enable'
        if (enable) openWidget(id)
        else closeWidget(id)
        report([`WIDGET ${String(id).padStart(2, '0')} · ${titles[id - 1]}`, `DISPLAY ............... ${enable ? 'ENABLED' : 'DISABLED'}`, `ACTIVE WIDGETS ........ ${enable ? 'UPDATED' : 'UPDATED'}`])
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
        candidates = findCommandCompletions(value)
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
      setCommand(history[historyIndexRef.current])
    } else if (event.key === 'ArrowDown' && historyIndexRef.current < history.length) {
      event.preventDefault()
      completionRef.current = null
      historyIndexRef.current += 1
      setCommand(historyIndexRef.current === history.length
        ? commandDraftRef.current
        : history[historyIndexRef.current])
    }
  }

  const startWidgetDrag = (event: ReactPointerEvent<HTMLElement>, id: number) => {
    if ((event.target as HTMLElement).closest('button')) return
    const card = event.currentTarget.closest('.system-widget') as HTMLElement | null
    if (!card) return
    const bounds = card.getBoundingClientRect()
    draggingWidgetRef.current = { id, offsetX: event.clientX - bounds.left, offsetY: event.clientY - bounds.top }
    event.currentTarget.setPointerCapture(event.pointerId)
    event.preventDefault()
  }

  const moveWidgetDrag = (event: ReactPointerEvent<HTMLElement>) => {
    const drag = draggingWidgetRef.current
    if (!drag) return
    const card = event.currentTarget.closest('.system-widget') as HTMLElement | null
    if (!card) return
    const left = Math.max(0, Math.min(window.innerWidth - card.offsetWidth, event.clientX - drag.offsetX))
    const top = Math.max(0, Math.min(window.innerHeight - card.offsetHeight, event.clientY - drag.offsetY))
    setWidgetPositions((current) => ({
      ...current,
      [drag.id]: { x: left / window.innerWidth * 100, y: top / window.innerHeight * 100 },
    }))
  }

  const positionWidget = (id: number) => {
    const position = widgetPositions[id]
    if (!position) return undefined
    const cardWidth = window.innerWidth <= 700
      ? Math.min(224, window.innerWidth - 20.8)
      : Math.min(288, window.innerWidth - 32)
    const maxX = Math.max(0, (window.innerWidth - cardWidth) / window.innerWidth * 100)
    const maxY = Math.max(0, (window.innerHeight - 120) / window.innerHeight * 100)
    return {
      left: `${Math.min(position.x, maxX)}%`,
      top: `${Math.min(position.y, maxY)}%`,
      right: 'auto',
    }
  }

  const startConsoleResize = (event: ReactPointerEvent<HTMLDivElement>, edge: string) => {
    const bounds = event.currentTarget.parentElement?.getBoundingClientRect()
    if (!bounds) return
    resizingConsoleRef.current = {
      edge,
      startX: event.clientX,
      startY: event.clientY,
      frame: { x: bounds.left, y: bounds.top, width: bounds.width, height: bounds.height },
    }
    event.currentTarget.setPointerCapture(event.pointerId)
    event.preventDefault()
    event.stopPropagation()
  }

  const moveConsoleResize = (event: ReactPointerEvent<HTMLElement>) => {
    const resize = resizingConsoleRef.current
    if (!resize) return
    const dx = event.clientX - resize.startX
    const dy = event.clientY - resize.startY
    const { edge, frame } = resize
    const minWidth = Math.min(260, window.innerWidth)
    const minHeight = Math.min(96, window.innerHeight)
    let left = frame.x
    let top = frame.y
    let width = frame.width
    let height = frame.height
    if (edge.includes('e')) width = Math.max(minWidth, frame.width + dx)
    if (edge.includes('s')) height = Math.max(minHeight, frame.height + dy)
    if (edge.includes('w')) {
      width = Math.max(minWidth, frame.width - dx)
      left = frame.x + frame.width - width
    }
    if (edge.includes('n')) {
      height = Math.max(minHeight, frame.height - dy)
      top = frame.y + frame.height - height
    }
    width = Math.min(width, window.innerWidth)
    height = Math.min(height, window.innerHeight)
    left = Math.max(0, Math.min(window.innerWidth - width, left))
    top = Math.max(0, Math.min(window.innerHeight - height, top))
    setConsoleFrame({ x: left, y: top, width, height })
  }

  const startConsoleDrag = (event: ReactPointerEvent<HTMLParagraphElement>) => {
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
    setConsoleFrame({ ...drag.frame, x, y })
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
      setWallpaperUrl(nextUrl)
      setWallpaperName(file.name)
      setBootElapsed(0)
      setRevealComplete(false)
      setReadyMessage(false)
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

  const handleWallpaperAnimationEnd = (event: AnimationEvent<HTMLImageElement>) => {
    if (event.animationName === 'decode-wallpaper') setRevealComplete(true)
  }

  return (
    <main className={`wallpaper-experience mode-${mode.toLowerCase()} theme-${theme}${stealthUntil > 0 ? ' night-stealth-active' : ''}${nightFuryAlpha ? ' night-fury-alpha' : ''}`}>
      {wallpaperUrl && (
        <img
          key={bootToken}
          className={`wallpaper-backdrop${!ready ? ' is-loading' : booting ? ' is-booting' : ' is-ready'}`}
          src={wallpaperUrl}
          alt={wallpaperName}
          onAnimationEnd={handleWallpaperAnimationEnd}
          onError={() => setRevealComplete(true)}
        />
      )}

      {specialEffect && <div key={specialEffect.id} className={`special-effect effect-${specialEffect.kind}`} aria-hidden="true" />}

      {ready && (
        <section className={`boot-sequence${booting ? '' : ' is-complete'}`} aria-label="Wallpaper system boot sequence">
          <div className="boot-scan" aria-hidden="true" />
          <div className="boot-log">
            <p className="boot-prompt">&gt; SYS<span className="boot-cursor">_</span></p>
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
                  const count = Math.min(message.text.length, Math.floor((bootElapsed - message.start) * TYPE_RATE))
                  const complete = count >= message.text.length
                  return (
                    <p className="boot-line" key={message.text}>
                      <span>{message.text.slice(0, count)}</span>
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

      <aside className="system-widgets" aria-label="System widgets">
        {renderedWidgets.includes(1) && (
          <article className={`system-widget widget-1${leavingWidgetIds.includes(1) ? ' widget-leaving' : ''}`} aria-hidden={leavingWidgetIds.includes(1)} style={positionWidget(1)}>
            <header onPointerDown={(event) => startWidgetDrag(event, 1)} onPointerMove={moveWidgetDrag} onPointerUp={() => { draggingWidgetRef.current = null }} onPointerCancel={() => { draggingWidgetRef.current = null }}><span>01 / HARDWARE</span><i>{hardwareStatusLabel(hardwareFeed.status)}</i><button className="widget-close" onClick={() => closeWidget(1)} aria-label="Close hardware widget">×</button></header>
            <strong>{hardwareFeed.readings?.cpuName ?? 'HOST TELEMETRY'}</strong>
            <p>CPU LOAD <b>{displayPercent(hardwareFeed.readings?.cpuPercent ?? null)}</b></p>
            <p>{hardwareFeed.readings?.gpuName ?? 'GPU 3D'} <b>{displayPercent(hardwareFeed.readings?.gpu3dPercent ?? null)}</b></p>
            <p>RAM USED <b>{hardwareFeed.readings?.ramTotalMb != null && hardwareFeed.readings.ramAvailableMb != null ? Math.round(hardwareFeed.readings.ramTotalMb - hardwareFeed.readings.ramAvailableMb) + ' / ' + Math.round(hardwareFeed.readings.ramTotalMb) + ' MB' : 'UNAVAILABLE'}</b></p>
            <p>NET DOWN / UP <b>{displayMegabytesPerSecond(hardwareFeed.readings?.networkDownBytesPerSecond ?? null)} / {displayMegabytesPerSecond(hardwareFeed.readings?.networkUpBytesPerSecond ?? null)}</b></p>
            <small>{hardwareFeed.updatedAt ? 'UPDATED ' + new Date(hardwareFeed.updatedAt).toLocaleTimeString() : 'WAITING FOR LIVELY SYSTEM DATA'}</small>
          </article>
        )}
        {renderedWidgets.includes(2) && (
          <article className={`system-widget widget-2${leavingWidgetIds.includes(2) ? ' widget-leaving' : ''}`} aria-hidden={leavingWidgetIds.includes(2)} style={positionWidget(2)}>
            <header onPointerDown={(event) => startWidgetDrag(event, 2)} onPointerMove={moveWidgetDrag} onPointerUp={() => { draggingWidgetRef.current = null }} onPointerCancel={() => { draggingWidgetRef.current = null }}><span>02 / WORLD CLOCK</span><i>SYNC</i><button className="widget-close" onClick={() => closeWidget(2)} aria-label="Close world clock widget">×</button></header>
            <strong className="widget-clock">{clockNow.toLocaleTimeString()}</strong>
            <p>{clockNow.toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }).toUpperCase()}</p>
            <p>SESSION <b>{formatUptime((clockNow.getTime() - sessionStartedAt.current) / 1000)}</b></p>
          </article>
        )}
        {renderedWidgets.includes(3) && (
          <article className={`system-widget widget-3${leavingWidgetIds.includes(3) ? ' widget-leaving' : ''}`} aria-hidden={leavingWidgetIds.includes(3)} style={positionWidget(3)}>
            <header onPointerDown={(event) => startWidgetDrag(event, 3)} onPointerMove={moveWidgetDrag} onPointerUp={() => { draggingWidgetRef.current = null }} onPointerCancel={() => { draggingWidgetRef.current = null }}><span>03 / SYSTEM</span><i>NOMINAL</i><button className="widget-close" onClick={() => closeWidget(3)} aria-label="Close system status widget">×</button></header>
            <strong>ELUCIDATOR v{SYSTEM_VERSION}</strong>
            <p>WALLPAPER <b>{wallpaperUrl ? 'ONLINE' : 'EMPTY'}</b></p>
            <p>MODE <b>{mode}</b></p>
            <p>SESSION <b>{formatUptime((clockNow.getTime() - sessionStartedAt.current) / 1000)}</b></p>
          </article>
        )}
        {renderedWidgets.includes(4) && (
          <article className={`system-widget widget-4${leavingWidgetIds.includes(4) ? ' widget-leaving' : ''}`} aria-hidden={leavingWidgetIds.includes(4)} style={positionWidget(4)}>
            <header onPointerDown={(event) => startWidgetDrag(event, 4)} onPointerMove={moveWidgetDrag} onPointerUp={() => { draggingWidgetRef.current = null }} onPointerCancel={() => { draggingWidgetRef.current = null }}><span>04 / AUDIO LINK</span><i>STANDBY</i><button className="widget-close" onClick={() => closeWidget(4)} aria-label="Close audio widget">×</button></header>
            <strong>NO PLAYER LINKED</strong>
            <p>TRACK DATA <b>OFFLINE</b></p>
            <small>PLAYER INTEGRATION REQUIRED</small>
          </article>
        )}
      </aside>

      <section
        className={`command-console mode-${mode.toLowerCase()}${booting ? ' is-hidden' : ''}`}
        aria-label="Elucidator system console"
        style={consoleFrame ? { left: consoleFrame.x, top: 'auto', bottom: window.innerHeight - consoleFrame.y - consoleFrame.height, width: consoleFrame.width, minHeight: consoleFrame.height } : undefined}
        onPointerMove={(event) => { moveConsoleResize(event); moveConsole(event) }}
        onPointerUp={() => { resizingConsoleRef.current = null; draggingConsoleRef.current = null }}
        onPointerCancel={() => { resizingConsoleRef.current = null; draggingConsoleRef.current = null }}
      >
        <div className="console-output" aria-live="polite">
          {consoleLines.map((line, index) => <p key={`${index}-${line}`} className={index < 2 ? 'console-heading' : ''} onPointerDown={index === 0 ? startConsoleDrag : undefined}>{line}</p>)}
        </div>
        <form className="command-line" onSubmit={submitCommand}>
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
            placeholder="sys status"
          />
          <button type="submit" aria-label="Run command">↵</button>
        </form>
        <p className="console-status" aria-live="polite">{status}</p>
        {['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'].map((edge) => (
          <div
            key={edge}
            className={`console-resize-handle resize-${edge}`}
            aria-hidden="true"
            onPointerDown={(event) => startConsoleResize(event, edge)}
          />
        ))}
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
