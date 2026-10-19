import { useEffect, useRef, useState, type ChangeEvent, type CSSProperties, type FormEvent } from 'react'
import './App.css'

type SavedWallpaper = { blob: Blob; name: string }

const DATABASE = 'project-elucidator-wallpaper'
const STORE = 'selection'
const KEY = 'active'
const BOOT_LINE_COUNT = 5
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

async function saveWallpaper(selection: SavedWallpaper) {
  const database = await openWallpaperDatabase()
  return new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE, 'readwrite')
    transaction.objectStore(STORE).put(selection, KEY)
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
  const [wallpaperUrl, setWallpaperUrl] = useState('')
  const [wallpaperName, setWallpaperName] = useState('NO WALLPAPER SELECTED')
  const [ready, setReady] = useState(false)
  const [booting, setBooting] = useState(true)
  const [bootStep, setBootStep] = useState(0)
  const [bootToken, setBootToken] = useState(0)
  const [command, setCommand] = useState('')
  const [status, setStatus] = useState('ENTER WALLPAPER SELECT · HELP')
  const bootLines = [
    'SYSTEM.INIT()',
    'DISPLAY.DRIVER: READY',
    `WALLPAPER.CACHE: ${wallpaperUrl ? 'RESTORED' : 'EMPTY'}`,
    wallpaperUrl ? 'IMAGE.BUFFER: SYNCHRONIZING' : 'FILE.SELECTOR: READY',
    'RENDER.PIPELINE: ONLINE',
  ]

  useEffect(() => {
    let cancelled = false
    const restore = async () => {
      try {
        const saved = await readSavedWallpaper()
        if (cancelled) return
        if (saved?.blob) {
          const url = URL.createObjectURL(saved.blob)
          objectUrlRef.current = url
          setWallpaperUrl(url)
          setWallpaperName(saved.name)
          setStatus(`WALLPAPER RESTORED · ${saved.name.toUpperCase()}`)
        }
      } catch {
        if (!cancelled) setStatus('CACHE UNAVAILABLE · USING DEFAULT WALLPAPER')
      } finally {
        if (!cancelled) setReady(true)
      }
    }
    void restore()
    return () => { cancelled = true }
  }, [])

  useEffect(() => () => {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
  }, [])

  useEffect(() => {
    if (!ready) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setBootStep(BOOT_LINE_COUNT)
      setBooting(false)
      return
    }
    setBooting(true)
    setBootStep(0)
    const timers: number[] = []
    for (let index = 0; index < BOOT_LINE_COUNT; index += 1) {
      timers.push(window.setTimeout(() => setBootStep(index + 1), 420 + index * 560))
    }
    timers.push(window.setTimeout(() => setBooting(false), 4200))
    return () => timers.forEach(window.clearTimeout)
  }, [ready, bootToken])

  const openFilePicker = () => {
    setStatus('SELECT A WALLPAPER FILE')
    fileInputRef.current?.click()
  }

  const submitCommand = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const normalized = command.trim().toLowerCase().replace(/^\/+/, '').replace(/\s+/g, ' ')
    setCommand('')

    if (['wallpaper', 'wallpaper select', 'select wallpaper', 'wallpaper.load'].includes(normalized)) {
      openFilePicker()
    } else if (normalized === 'help' || normalized === '?') {
      setStatus('COMMANDS · WALLPAPER SELECT · HELP')
    } else if (!normalized) {
      setStatus('ENTER A COMMAND · HELP')
    } else {
      setStatus(`UNKNOWN COMMAND · ${normalized.toUpperCase()}`)
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
      } catch {
        persisted = false
      }
      const previousUrl = objectUrlRef.current
      objectUrlRef.current = nextUrl
      setWallpaperUrl(nextUrl)
      setWallpaperName(file.name)
      setBootStep(0)
      setBooting(true)
      setStatus(persisted
        ? `WALLPAPER STORED · ${file.name.toUpperCase()}`
        : `LOADED FOR THIS SESSION · CACHE WRITE FAILED`)
      setBootToken((token) => token + 1)
      if (previousUrl) URL.revokeObjectURL(previousUrl)
    } catch (error) {
      URL.revokeObjectURL(nextUrl)
      setStatus(error instanceof Error ? error.message.toUpperCase() : 'WALLPAPER LOAD FAILED')
    }
  }

  return (
    <main className="wallpaper-experience">
      {wallpaperUrl && (
        <img
          key={bootToken}
          className={`wallpaper-backdrop${!ready ? ' is-loading' : booting ? ' is-booting' : ' is-ready'}`}
          src={wallpaperUrl}
          alt={wallpaperName}
        />
      )}

      {ready && booting && (
        <section className="boot-sequence" aria-live="polite" aria-label="Wallpaper system boot sequence">
          <div className="boot-log">
            <p className="boot-prompt">&gt; SYS<span className="boot-cursor">_</span></p>
            {bootLines.slice(0, bootStep).map((line, index) => (
              <p
                className="boot-line"
                key={line}
                style={{ '--line-steps': line.length, animationDelay: `${index * 30}ms` } as CSSProperties}
              >
                {line}
              </p>
            ))}
            {bootStep >= bootLines.length && <p className="boot-ready">&gt; WALLPAPER.READY<span className="boot-cursor">_</span></p>}
          </div>
          <div className="boot-scan" aria-hidden="true" />
        </section>
      )}

      <section className={`command-console${booting ? ' is-hidden' : ''}`} aria-label="Wallpaper command console">
        <form className="command-line" onSubmit={submitCommand}>
          <span className="command-prefix">&gt; SYS</span>
          <span className="command-cursor" aria-hidden="true">/</span>
          <input
            autoComplete="off"
            aria-label="Enter a wallpaper command"
            spellCheck={false}
            value={command}
            onChange={(event) => setCommand(event.target.value)}
            placeholder="wallpaper select"
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
