# Project Elucidator

Project Elucidator is a full-screen, SAO-inspired wallpaper launcher. A short system boot sequence reveals the selected wallpaper, then a small terminal prompt lets the user load another image without leaving the screen.

## Experience

1. The screen opens on a black field with a cyan `> SYS_` prompt.
2. System and display diagnostics type in as the selected wallpaper is decoded and revealed by a scan.
3. The wallpaper settles into a full-screen view.
4. A minimal command line remains available in the lower-left corner.

The boot sequence runs on each app launch and when a different wallpaper is selected. On a fresh install with no saved wallpaper, the bundled `sword-art-online-3840x2160-10492.jpg` image is loaded. The last active wallpaper and theme are restored on later launches unless an explicit startup default is set; explicit defaults take precedence until cleared or changed.

## System console

Click the terminal line, enter a command, and press Enter (or use the return button):

Press Tab to complete a command. When a prefix has multiple matches, press Tab repeatedly to cycle through them; subcommands such as wallpaper actions and modes are suggested after a space.

| Command | Action |
| --- | --- |
| `sys status` | Show system, wallpaper cache, session uptime, and mode status |
| `sys wallpaper` / `sys wallpaper current` | Show the active wallpaper |
| `sys wallpaper select` | Open the system file picker and choose an image |
| `sys wallpaper list` | List wallpapers saved through the app |
| `sys wallpaper default set` | Save the currently active image as the startup wallpaper |
| `sys wallpaper default select` | List saved images; append a number or filename to choose the startup wallpaper |
| `sys wallpaper default clear` | Remove the explicit default and return to last-active / bundled startup behavior |
| `sys wallpaper next` / `previous` | Switch between saved wallpapers |
| `sys wallpaper scan` | Replay the coordinated wallpaper reveal and scan |
| `sys wallpaper fit` | Show the current image fit mode |
| `sys wallpaper fit cover` / `contain` / `stretch` / `span` | Choose crop-to-fill, show-entire-image, distortion-to-fill, or panoramic fit |
| `sys time` | Open the analog/digital local clock and show local date/time |
| `sys session` | Open the monitor for app uptime and time on the active wallpaper |
| `sys anime` | Open a theme-aware status panel for the active anime interface |
| `sys mode` | List modes; use `sys mode normal`, `stealth`, `combat`, `idle`, or `diagnostic` to switch |
| `sys hardware` | Show live CPU, GPU 3D, RAM and network metrics when Lively provides them; otherwise report browser/unavailable state |
| `sys brightness status` / `sys brightness list` | Read current brightness from connected DDC/CI displays |
| `sys brightness <0–100>` | Set brightness on every compatible display |
| `sys brightness monitor <ID> <0–100>` | Set one display from the ID shown by the status command |
| `sys brightness pair <TOKEN>` / `sys brightness unpair` | Pair or disconnect this app profile from the local Windows helper |
| `sys lock` | Lock the current Windows session through the paired helper |
| `sys audio` | Open the Audio Link widget and show the active Windows media session when Lively provides it |
| `sys widgets` | List widget IDs and which displays are active |
| `sys widgets all on` / `sys widgets all off` | Enable or disable all five widgets at once |
| `sys widget <ID> on` / `sys widget <ID> off` | Enable or disable any widget; `enable` / `disable` also work |
| `sys widgets size <SCALE>` | Set all widget sizes to `0.5`, `0.75`, `1`, `1.25`, `1.5`, `1.75`, or `2` |
| `sys widget size <ID> <SCALE>` | Set one widget to one of the supported size scales |
| `sys widget move 1 70 20` | Place widget 1 at 70% from the left and 20% from the top |
| `sys widget reset` | Restore the default widget positions |
| `sys layout list` | List the four widget arrangements and saved layouts |
| `sys layout left` / `right` / `top` / `bottom` | Align active widgets into a uniform column or row; the console stays in place |
| `sys layout save desk` / `sys layout load desk` | Save or restore the current console and widget positions under a name |
| `sys layout reset` | Restore the default console and widget positions |
| `sys standby` | Return the console output to the `ELUCIDATOR // MAINFRAME` home screen |
| `sys arise` | Activate the persistent Solo Leveling purple interface |
| `sys link start` | Activate the SAO interface with its Aincrad scan and holographic menu |
| `sys theme default set` | Save the currently active system theme as the startup theme |
| `sys theme default select` | List themes; append a number or theme name to choose the startup theme |
| `sys theme list` | Show registered theme systems and their READY/WIP status |
| `sys theme activate <THEME>` | Activate a registered theme by name or alias, such as `sao`, `link start`, or `demon mode` |
| `sys grimoire` | Activate the Black Clover theme |
| `sys limitless` | Activate the Jujutsu Kaisen theme and spatial ripple effect |
| `sys demon slayer` | Activate the Hinokami Kagura / Sun Breathing theme (`sys hinokami kagura` remains an alias) |
| `sys demon mode` | Activate Seven Deadly Sins gold and purple theme |
| `sys httyd` / `sys night fury` | Activate the Toothless Night Fury theme: black `#080B10`, plasma cyan `#70E8FF`, Night Fury blue `#5265D8`, and steel grey `#A8B2C1` |
| `sys tokyo ghoul` | Activate the Tokyo Ghoul crimson and silver theme |
| `sys stealth` | Toggle persistent Night Fury stealth; clicking the command input restores the widgets and interface |
| `visual list` / `visual status` | List visual overlays or show the active one |
| `visual haze` / `visual rain` / `visual lightning` | Activate one lightweight atmospheric overlay |
| `visual particles` / `visual vignette` / `visual off` | Activate a restrained overlay or disable visual effects |
| `sys help` / `help` | Show the command index |

### Theme palettes

The primary color drives the console and widget structure, the secondary color highlights status and hardware dial arcs, and the tertiary color adds panel depth and glow. Theme changes transition across these elements together. Theme activation uses the registered emblem, palette, messages, and lightweight transition for the selected system.

| Theme command | Primary | Secondary | Depth accent |
| --- | --- | --- | --- |
| `sys link start` / `sys theme activate sao` | SAO cyan `#00D8FF` | Ice `#EAFCFF` | Blue `#286BFF` |
| `sys arise` | Solo Leveling purple `#9B5DE5` | Pale violet `#E0C2FF` | Deep purple `#5A189A` |
| `sys grimoire` | Crimson `#E63946` | Pale red `#FFB4B8` | Burgundy `#7F1D2D` |
| `sys limitless` | Electric blue `#60A5FA` | Pale violet `#C4B5FD` | Cobalt `#1D4ED8` |
| `sys demon slayer` | Sun orange `#F47B20` | Tanjiro blue `#5DA8FF` | Burnt orange `#9A3412` |
| `sys demon mode` | Gold `#E7C65A` | Purple `#A879FF` | Deep violet `#51317E` |
| `sys httyd` / `sys night fury` | Plasma cyan `#70E8FF` | Night Fury blue `#5265D8` | Steel `#A8B2C1` |
| `sys tokyo ghoul` | Crimson `#E53946` | Silver `#E8E8ED` | Dark crimson `#721C2B` |

Theme behavior is registered in `src/themeSystems.ts`: each entry declares aliases, activation response, transition, emblem, and visual identity. `sys theme activate` uses the registry so themes reuse the existing activation framework.

### Theme design checklist

- [x] **Arise** — console design and activation animation complete.
- [ ] **Demon Mode** — activation animation complete; console design still needs work (half complete).
- [x] **Limitless** — console design and activation animation complete.
- [ ] **Hinokami Kagura** — activation animation complete; console design still needs work (half complete).
- [x] **SAO / Link Start** — console design and activation animation complete.
- [x] **Grimoire** — console design and activation animation complete.
- [ ] **HTTYD / Night Fury** — activation animation complete; console design still needs work (half complete).
- [ ] **Tokyo Ghoul** — not started.

Theme emblem artwork is loaded from `public/assets/emblems/` using the paths in `src/themeSystems.ts`: `link-start-crossed-swords.png`, `arise-shadow-monarch.png`, `grimoire.png`, `limitless1.png`, `hinokami-kagura.png`, `dragon-sin-of-wrath.png`, `night-fury.png`, and `tokyo-ghoul.png`. The Demon Slayer console and activation share the transparent katana asset at `public/assets/swords/sun-breathing-katana.png`. The browser image loader also accepts SVG and WebP; update the corresponding registry path if using another extension. Missing emblem artwork falls back to a compact theme label. Theme identity colors and activation copy are stored with each registry entry; STEALTH remains a system mode rather than a theme.

Activate a theme directly with its `sys` command or through `sys theme activate <name>`; `sys theme list` shows the available systems.

### Widgets

| ID | Widget | What it shows |
| --- | --- | --- |
| 1 | Hardware | CPU, GPU, and RAM dials plus network activity |
| 2 | World clock | Analog dial, digital time, date, and local timezone |
| 3 | Session monitor | Time since Elucidator started and time on the active wallpaper |
| 4 | Audio Link | Current Windows media session when Lively provides one |
| 5 | Anime status | Theme-specific readout that updates with the active system theme |

On a fresh install, all five widgets open in a right-side stack with a 5 px gap. The stack scales to fit the available screen height and keeps each widget's natural width, so the hardware panel can be wider than the others without overlap. Saved widget choices and layouts are restored on later launches. Use `sys widget <ID> on` / `off` to control an individual widget. `sys widgets all on` enables all five. Scale every widget with `sys widgets size 1.25`, or one widget with `sys widget size 3 1.5`; supported scales range from `0.5` to `2` in quarter-step increments. Scale preferences persist across restarts. `sys layout left`, `right`, `top`, and `bottom` arrange every active widget. `sys stealth` hides widgets without changing which ones are enabled; clicking the command input fades them back in and exits stealth.

Hardware, clock, session, anime status, and audio commands open their matching digital widgets. The Audio Link widget displays track, artist, album, and artwork from Lively's Windows now-playing feed when an active player exposes a Windows media session. It is read-only because Lively's documented feed does not provide playback controls. Multiple widgets can stay open together, can be closed with their `×` control, and their enabled state and positions are saved in the browser. Drag a widget by its header or drag the console heading to move it. `sys layout` applies a widget arrangement without moving the console, and named layouts save the current arrangement. The console no longer has mouse resize handles; use its saved position or drag its heading to move it. The hardware display uses dials for CPU, GPU 3D, and RAM readings. CPU/GPU temperatures and FPS remain unavailable unless the wallpaper host supplies those sensors.



### Monitor brightness (Windows DDC/CI)

Browser pages cannot directly access physical monitor controls or lock Windows. For DDC/CI brightness and `sys lock`, create the Lively build and companion helper ZIP with `npm run package:lively`; install the companion by extracting `ProjectElucidator.BrightnessHelper.zip` and running `install-brightness-helper.ps1` in PowerShell. The installer copies the helper and watchdog into your user profile, starts the bridge, and adds the watchdog to the current user's Windows Startup folder; it does not require administrator access. The watchdog checks the local health endpoint and restarts the helper if it exits or stops responding. The helper runs independently of Lively, and the wallpaper checks its status at launch and periodically while running. Copy the pairing command it prints into Elucidator, for example `sys brightness pair <TOKEN>`. The pairing token is stored in that browser profile. Then use `sys brightness status`, `sys brightness 40`, `sys brightness monitor 2 60`, or `sys lock`. Use `sys brightness unpair` to clear the app's token, and `uninstall-brightness-helper.ps1` to remove the Windows helper and watchdog.

The helper listens only on `127.0.0.1` and exposes authenticated control endpoints; it is separate from the Lively wallpaper ZIP because a web wallpaper cannot launch native Windows code. The health endpoint is read-only. Enable DDC/CI in each monitor's on-screen menu. Windows exposes brightness only if the monitor, connection, GPU path and OSD setting all support DDC/CI; unsupported screens are reported without pretending the command succeeded. The command changes the monitor's hardware brightness control, not Windows' software display brightness slider. `sys lock` requests the standard Windows workstation lock and does not unlock or bypass Windows sign-in.

### Built-in widget layouts

All presets adapt to the current viewport and arrange every active widget with consistent sizing and spacing. They leave the command console where it is. The top and bottom layouts centre a horizontal row; the left and right layouts align a vertical stack to the corresponding edge.

| Command | Arrangement | Alignment |
| --- | --- | --- |
| `sys layout left` | Vertical stack | Left edge, centred vertically |
| `sys layout right` | Vertical stack | Right edge, centred vertically |
| `sys layout top` | Horizontal row | Centred along the top edge |
| `sys layout bottom` | Horizontal row | Centred along the bottom edge |
The active image, saved images, and explicit startup wallpaper are stored in IndexedDB in the Lively browser profile. The active theme and explicit startup theme are stored in local storage. These preferences survive Lively reloads and PC restarts without rebuilding or reimporting the wallpaper, as long as the same Lively wallpaper profile and its site data are retained. `sys wallpaper default set` saves the current image; `sys wallpaper default select` lists saved images, then use `sys wallpaper default select 2` (or a filename) to choose one. `sys wallpaper default clear` returns startup to the last active image, then the bundled SAO image if there is no saved selection. `sys theme default set` saves the active theme; `sys theme default select` lists available themes, then use a number or theme command/name such as `sys theme default select httyd`. Changing a default does not change the current display; it takes effect the next time Elucidator starts. The wallpaper fit mode is saved separately in local storage and applies to all imported images. `span` uses the full combined viewport supplied by Lively when its display placement is set to Span across screens, and fits the entire source image within that viewport. A source image that is not wide enough may leave black space; the mode cannot create missing artwork. `cover` fills the combined viewport but may crop the image. The page cannot scan arbitrary folders directly; the file picker is the browser-approved way to add a saved image. If the browser blocks persistent storage, the selected image still works for the current session. In a regular browser, `sys hardware` reports BROWSER MODE and unavailable values. Lively's system-information feed supplies CPU usage, GPU 3D usage, RAM total/available, and network adapter throughput; it does not provide temperatures or frame rate. Audio controls still need a supported player integration.

### Lively Wallpaper

The project includes `public/LivelyInfo.json`, which Vite copies into `dist` and configures with Lively's `--system-information --system-nowplaying` arguments. Lively treats a folder containing `LivelyInfo.json` as an already packaged wallpaper, so do not add the `dist` folder through its new-project wizard. Run `npm run package:lively` to build the project and create `ProjectElucidator.Lively.zip` with `LivelyInfo.json` at the archive root, plus `ProjectElucidator.BrightnessHelper.zip` for the optional Windows DDC/CI companion. Drag the Lively ZIP into the Lively library; install the companion separately as described above. The hardware widget and `sys hardware` show live readings when Lively calls `livelySystemInformation(data)`; the Audio Link widget receives track metadata through `livelyCurrentTrack(data)`. In a normal browser, these callbacks do not arrive, so the interface reports the host requirement instead of inventing readings.

## Development

Built with React, TypeScript, Vite, and CSS. The wallpaper reveal uses a clipped image layer and a lightweight scan effect; no WebGL renderer is needed for this experience.

```powershell
npm install
npm run dev
npm run build
```

For Lively Wallpaper, use the built web project and keep the same browser profile if you want the saved selection to persist there.

## Current status

- SAO-style terminal boot and wallpaper reveal are implemented.
- Command entry, file picking, and IndexedDB persistence are implemented.
- The Sword Art Online image is bundled as the first-run default; subsequent launches restore the user's saved wallpaper.
