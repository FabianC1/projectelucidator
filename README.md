# Project Elucidator

Project Elucidator is a full-screen, SAO-inspired wallpaper launcher. A short system boot sequence reveals the selected wallpaper, then a small terminal prompt lets the user load another image without leaving the screen.

## Experience

1. The screen opens on a black field with a cyan `> SYS_` prompt.
2. System and display diagnostics type in as the selected wallpaper is decoded and revealed by a scan.
3. The wallpaper settles into a full-screen view.
4. A minimal command line remains available in the lower-left corner.

The boot sequence runs on each app launch and when a different wallpaper is selected. If no wallpaper has been selected yet, the system boots to black and waits for a file selection.

## System console

Click the terminal line, enter a command, and press Enter (or use the return button):

Press Tab to complete a command. When a prefix has multiple matches, press Tab repeatedly to cycle through them; subcommands such as wallpaper actions and modes are suggested after a space.

| Command | Action |
| --- | --- |
| `sys status` | Show system, wallpaper cache, session uptime, and mode status |
| `sys wallpaper` / `sys wallpaper current` | Show the active wallpaper |
| `sys wallpaper select` | Open the system file picker and choose an image |
| `sys wallpaper list` | List wallpapers saved through the app |
| `sys wallpaper next` / `previous` | Switch between saved wallpapers |
| `sys wallpaper scan` | Replay the coordinated wallpaper reveal and scan |
| `sys wallpaper fit` | Show the current image fit mode |
| `sys wallpaper fit cover` / `contain` / `stretch` / `span` | Choose crop-to-fill, show-entire-image, distortion-to-fill, or panoramic fit |
| `sys time` | Show local date/time and session uptime |
| `sys mode` | List modes; use `sys mode normal`, `stealth`, `combat`, `idle`, or `diagnostic` to switch |
| `sys hardware` | Show live CPU, GPU 3D, RAM and network metrics when Lively provides them; otherwise report browser/unavailable state |
| `sys audio` | Open the Audio Link widget and show the active Windows media session when Lively provides it |
| `sys widgets` | List widget IDs and which displays are active |
| `sys widgets all on` / `sys widgets all off` | Enable or disable all four widgets at once |
| `sys widget 1 on` / `sys widget 1 off` | Enable or disable a widget (IDs 1–4); `enable` / `disable` also work |
| `sys widget move 1 70 20` | Place widget 1 at 70% from the left and 20% from the top |
| `sys widget reset` | Restore the default widget positions |
| `sys layout list` | List the four widget arrangements and saved layouts |
| `sys layout left` / `right` / `top` / `bottom` | Align active widgets into a uniform column or row; the console stays in place |
| `sys layout save desk` / `sys layout load desk` | Save or restore the current console and widget positions under a name |
| `sys layout reset` | Restore the default console and widget positions |
| `sys standby` | Return the console output to the `ELUCIDATOR // MAINFRAME` home screen |
| `sys arise` | Activate the persistent Solo Leveling purple interface |
| `sys link start` | Restore the standard cyan interface |
| `sys grimoire` / `sys anti-magic` | Activate Black Clover crimson themes; anti-magic also pulses across the screen |
| `sys domain expansion` / `sys limitless` | Activate Jujutsu Kaisen violet-blue themes and spatial ripple effects |
| `sys breathing water` | Activate Tanjiro-inspired deep blue Water Breathing |
| `sys hinokami kagura` | Activate the orange Sun Breathing theme |
| `sys demon mode` | Activate Seven Deadly Sins gold and purple theme |
| `sys httyd` / `sys night fury` | Activate the Toothless Night Fury theme: black `#080B10`, plasma cyan `#70E8FF`, Night Fury blue `#5265D8`, and steel grey `#A8B2C1` |
| `sys plasma` | Trigger a plasma-core charge ripple |
| `sys stealth` | Dim the Night Fury interface and suppress its glow for eight seconds |
| `sys alpha` | Trigger the Night Fury full-power flare |
| `sys full counter` | Send a purple scan wave back across the wallpaper |
| `visual list` / `visual status` | List visual overlays or show the active one |
| `visual haze` / `visual rain` / `visual lightning` | Activate one lightweight atmospheric overlay |
| `visual particles` / `visual vignette` / `visual off` | Activate a restrained overlay or disable visual effects |
| `sys help` / `help` | Show the command index |

Hardware, clock, system status, and audio commands also open their matching digital widget. The Audio Link widget displays track, artist, album, and artwork from Lively's Windows now-playing feed when an active player exposes a Windows media session. It is read-only because Lively's documented feed does not provide playback controls. Multiple widgets can stay open together, can be closed with their `×` control, and their enabled state and positions are saved in the browser. Drag a widget by its header or drag the console heading to move it. `sys layout` applies a widget arrangement without moving the console, and named layouts save the current arrangement. The console no longer has mouse resize handles; use its saved position or drag its heading to move it. The hardware display uses dials for CPU, GPU 3D, and RAM readings. CPU/GPU temperatures and FPS remain unavailable unless the wallpaper host supplies those sensors.

### Built-in widget layouts

All presets adapt to the current viewport and arrange every active widget with consistent sizing and spacing. They leave the command console where it is. The top and bottom layouts centre a horizontal row; the left and right layouts align a vertical stack to the corresponding edge.

| Command | Arrangement | Alignment |
| --- | --- | --- |
| `sys layout left` | Vertical stack | Left edge, centred vertically |
| `sys layout right` | Vertical stack | Right edge, centred vertically |
| `sys layout top` | Horizontal row | Centred along the top edge |
| `sys layout bottom` | Horizontal row | Centred along the bottom edge |
The active image and images selected through the app are stored in IndexedDB in the browser profile and restored on the next launch. The wallpaper fit mode is saved separately in local storage and applies to all imported images. `span` uses the full combined viewport supplied by Lively when its display placement is set to Span across screens, and fits the entire source image within that viewport. A source image that is not wide enough may leave black space; the mode cannot create missing artwork. `cover` fills the combined viewport but may crop the image. The page cannot scan arbitrary folders directly; the file picker is the browser-approved way to add a saved image. If the browser blocks persistent storage, the selected image still works for the current session. In a regular browser, `sys hardware` reports BROWSER MODE and unavailable values. Lively's system-information feed supplies CPU usage, GPU 3D usage, RAM total/available, and network adapter throughput; it does not provide temperatures or frame rate. Audio controls still need a supported player integration.

### Lively Wallpaper

The project includes `public/LivelyInfo.json`, which Vite copies into `dist` and configures with Lively's `--system-information --system-nowplaying` arguments. Lively treats a folder containing `LivelyInfo.json` as an already packaged wallpaper, so do not add the `dist` folder through its new-project wizard. Run `npm run package:lively` to build the project and create `ProjectElucidator.Lively.zip` with `LivelyInfo.json` at the archive root, then drag that ZIP into the Lively library. The hardware widget and `sys hardware` show live readings when Lively calls `livelySystemInformation(data)`; the Audio Link widget receives track metadata through `livelyCurrentTrack(data)`. In a normal browser, these callbacks do not arrive, so the interface reports the host requirement instead of inventing readings.

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
- No wallpaper image is bundled into the runtime; only the selected image is loaded.
