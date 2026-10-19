import { useEffect, useRef, useState, type AnimationEvent, type ChangeEvent, type FormEvent, type KeyboardEvent } from 'react'
import './App.css'

type SavedWallpaper = { blob: Blob; name: string }
type SystemMode = 'NORMAL' | 'STEALTH' | 'COMBAT' | 'IDLE' | 'DIAGNOSTIC'
type BootMessage = { text: string; result: string; pause?: number }
type BootPhase = { id: string; title: string; messages: BootMessage[] }
type TimedMessage = BootMessage & { start: number; duration: number; end: number }
type TimedPhase = { id: string; title: string; start: number; messages: TimedMessage[] }
type BootTimeline = { phases: TimedPhase[]; duration: number }

const DATABASE = 'project-elucidator-wallpaper'
const STORE = 'selection'
const KEY = 'active'
const WIDGET_PREF_KEY = 'project-elucidator-widgets'
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

function App() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const objectUrlRef = useRef<string | null>(null)
  const finishingBootRef = useRef(false)
  const sessionStartedAt = useRef(Date.now())
  const commandHistoryRef = useRef<string[]>([])
  const historyIndexRef = useRef(0)
  const commandDraftRef = useRef('')
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
  const [wallpaperLibrary, setWallpaperLibrary] = useState<Array<{ id: string; wallpaper: SavedWallpaper }>>([])
  const [enabledWidgets, setEnabledWidgets] = useState<number[]>([])
  const [clockNow, setClockNow] = useState(() => new Date())
  const [consoleLines, setConsoleLines] = useState<string[]>(['ELUCIDATOR // SYSTEM CONSOLE', 'ONLINE', 'Type SYS HELP for commands.'])
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
      if (Array.isArray(stored)) setEnabledWidgets(stored.filter((id): id is number => Number.isInteger(id) && id >= 1 && id <= 4))
    } catch {
      // Keep widgets closed if saved preferences are unavailable.
    }
  }, [])

  useEffect(() => {
    try { localStorage.setItem(WIDGET_PREF_KEY, JSON.stringify(enabledWidgets)) } catch { /* Preferences are optional. */ }
  }, [enabledWidgets])

  useEffect(() => {
    if (!enabledWidgets.some((id) => id === 2 || id === 3)) return
    const timer = window.setInterval(() => setClockNow(new Date()), 1000)
    return () => window.clearInterval(timer)
  }, [enabledWidgets])

  useEffect(() => () => {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
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
  const closeWidget = (id: number) => setEnabledWidgets((current) => current.filter((widgetId) => widgetId !== id))
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

    if (normalized === 'help' || normalized === 'sys help' || normalized === '?') {
      report(['ELUCIDATOR // SYSTEM CONSOLE', 'SYS STATUS · SYS WALLPAPER [SELECT|SCAN]', 'SYS TIME · SYS MODE [NORMAL|STEALTH|COMBAT|IDLE|DIAGNOSTIC]', 'SYS HARDWARE · SYS AUDIO · SYS WIDGETS · HELP'])
      setStatus('SYSTEM HELP · COMMAND INDEX')
    } else if (domain === 'status' && args.length === 1) {
      setEnabledWidgets((current) => [...new Set([...current, 3])])
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
      setEnabledWidgets((current) => [...new Set([...current, 2])])
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
      setEnabledWidgets((current) => [...new Set([...current, 1])])
      const cores = navigator.hardwareConcurrency || 'UNKNOWN'
      const memory = 'deviceMemory' in navigator ? `${(navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 'UNKNOWN'} GB (BROWSER ESTIMATE)` : 'UNAVAILABLE'
      report(['HARDWARE DIAGNOSTICS', `LOGICAL CPU CORES ...... ${cores}`, `RAM ................... ${memory}`, 'CPU/GPU LOAD ........... BROWSER CANNOT READ', 'TEMPERATURE SENSORS .... UNAVAILABLE', 'FRAME RATE ............ NOT MEASURED', 'LIVE SENSOR DATA REQUIRES A NATIVE HOST INTEGRATION.'])
      setStatus('HARDWARE REPORT · BROWSER CAPABILITIES')
    } else if (domain === 'audio' && args.length === 1) {
      setEnabledWidgets((current) => [...new Set([...current, 4])])
      report(['AUDIO CONTROL', 'NO PLAYER INTEGRATION CONNECTED.', 'TRACK METADATA AND PLAYBACK CONTROL REQUIRE A SUPPORTED PLAYER API.'])
      setStatus('AUDIO INTEGRATION · OFFLINE')
    } else if (domain === 'widgets' && args.length === 1) {
      const titles = ['HARDWARE TELEMETRY', 'WORLD CLOCK', 'SYSTEM STATUS', 'AUDIO LINK']
      report(['DIGITAL WIDGETS · 1–4', ...titles.map((title, index) => `${enabledWidgets.includes(index + 1) ? 'ONLINE ' : 'OFFLINE'} · ${index + 1} · ${title}`), 'CONTROL · SYS WIDGET <1–4> ON|OFF'])
      setStatus(`${enabledWidgets.length} WIDGET${enabledWidgets.length === 1 ? '' : 'S'} ACTIVE`)
    } else if (domain === 'widget' && args.length === 3) {
      const id = Number(action)
      const setting = args[2]
      const titles = ['HARDWARE TELEMETRY', 'WORLD CLOCK', 'SYSTEM STATUS', 'AUDIO LINK']
      if (!Number.isInteger(id) || id < 1 || id > 4 || !['on', 'off', 'enable', 'disable'].includes(setting)) {
        report(['WIDGET COMMAND ERROR', 'USAGE · SYS WIDGET <1–4> ON|OFF'])
      } else {
        const enable = setting === 'on' || setting === 'enable'
        setEnabledWidgets((current) => enable
          ? [...new Set([...current, id])]
          : current.filter((widgetId) => widgetId !== id))
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
    const history = commandHistoryRef.current
    if (event.key === 'ArrowUp' && history.length > 0) {
      event.preventDefault()
      if (historyIndexRef.current === history.length) commandDraftRef.current = event.currentTarget.value
      historyIndexRef.current = Math.max(0, historyIndexRef.current - 1)
      setCommand(history[historyIndexRef.current])
    } else if (event.key === 'ArrowDown' && historyIndexRef.current < history.length) {
      event.preventDefault()
      historyIndexRef.current += 1
      setCommand(historyIndexRef.current === history.length
        ? commandDraftRef.current
        : history[historyIndexRef.current])
    }
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
    <main className={`wallpaper-experience mode-${mode.toLowerCase()}`}>
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

      <aside className="system-widgets" aria-label="System widgets">
        {enabledWidgets.includes(1) && (
          <article className="system-widget">
            <header><span>01 / HARDWARE</span><i>TELEMETRY</i><button className="widget-close" onClick={() => closeWidget(1)} aria-label="Close hardware widget">×</button></header>
            <strong>HOST INTERFACE</strong>
            <p>CPU CORES <b>{navigator.hardwareConcurrency || 'N/A'}</b></p>
            <p>RAM ESTIMATE <b>{'deviceMemory' in navigator ? `${(navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 'N/A'} GB` : 'N/A'}</b></p>
            <p>CPU / GPU LOAD <b>LOCKED</b></p>
            <small>BROWSER SENSOR ACCESS LIMITED</small>
          </article>
        )}
        {enabledWidgets.includes(2) && (
          <article className="system-widget">
            <header><span>02 / WORLD CLOCK</span><i>SYNC</i><button className="widget-close" onClick={() => closeWidget(2)} aria-label="Close world clock widget">×</button></header>
            <strong className="widget-clock">{clockNow.toLocaleTimeString()}</strong>
            <p>{clockNow.toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }).toUpperCase()}</p>
            <p>SESSION <b>{formatUptime((clockNow.getTime() - sessionStartedAt.current) / 1000)}</b></p>
          </article>
        )}
        {enabledWidgets.includes(3) && (
          <article className="system-widget">
            <header><span>03 / SYSTEM</span><i>NOMINAL</i><button className="widget-close" onClick={() => closeWidget(3)} aria-label="Close system status widget">×</button></header>
            <strong>ELUCIDATOR v{SYSTEM_VERSION}</strong>
            <p>WALLPAPER <b>{wallpaperUrl ? 'ONLINE' : 'EMPTY'}</b></p>
            <p>MODE <b>{mode}</b></p>
            <p>SESSION <b>{formatUptime((clockNow.getTime() - sessionStartedAt.current) / 1000)}</b></p>
          </article>
        )}
        {enabledWidgets.includes(4) && (
          <article className="system-widget">
            <header><span>04 / AUDIO LINK</span><i>STANDBY</i><button className="widget-close" onClick={() => closeWidget(4)} aria-label="Close audio widget">×</button></header>
            <strong>NO PLAYER LINKED</strong>
            <p>TRACK DATA <b>OFFLINE</b></p>
            <small>PLAYER INTEGRATION REQUIRED</small>
          </article>
        )}
      </aside>

      <section className={`command-console mode-${mode.toLowerCase()}${booting ? ' is-hidden' : ''}`} aria-label="Elucidator system console">
        <div className="console-output" aria-live="polite">
          {consoleLines.map((line, index) => <p key={`${index}-${line}`} className={index < 2 ? 'console-heading' : ''}>{line}</p>)}
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
              if (historyIndexRef.current === commandHistoryRef.current.length) commandDraftRef.current = event.target.value
            }}
            onKeyDown={handleCommandKeyDown}
            placeholder="sys status"
          />
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
