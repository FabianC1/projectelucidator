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
| `sys time` | Show local date/time and session uptime |
| `sys mode` | List modes; use `sys mode normal`, `stealth`, `combat`, `idle`, or `diagnostic` to switch |
| `sys hardware` | Show browser-accessible estimates and explain unavailable sensor readings |
| `sys audio` | Report player integration status |
| `sys widgets` | List widget IDs and which displays are active |
| `sys widgets all on` / `sys widgets all off` | Enable or disable all four widgets at once |
| `sys widget 1 on` / `sys widget 1 off` | Enable or disable a widget (IDs 1–4); `enable` / `disable` also work |
| `sys widget move 1 70 20` | Place widget 1 at 70% from the left and 20% from the top |
| `sys widget reset` | Restore the default widget positions |
| `sys standby` | Return the console output to the `ELUCIDATOR // MAINFRAME` home screen |
| `sys arise` | Activate the persistent Solo Leveling purple interface |
| `sys link start` | Restore the standard cyan interface |
| `sys grimoire` / `sys anti-magic` | Activate Black Clover crimson themes; anti-magic also pulses across the screen |
| `sys domain expansion` / `sys limitless` | Activate Jujutsu Kaisen violet-blue themes and spatial ripple effects |
| `sys breathing water` | Activate Tanjiro-inspired deep blue Water Breathing |
| `sys hinokami kagura` | Activate the orange Sun Breathing theme |
| `sys demon mode` | Activate Seven Deadly Sins gold and purple theme |
| `sys full counter` | Send a purple scan wave back across the wallpaper |
| `sys help` / `help` | Show the command index |

Hardware, clock, system status, and audio commands also open their matching digital widget on the right. Multiple widgets can stay open together, can be closed with their `×` control, and their enabled state and positions are saved in the browser. Drag a widget by its header to adjust its position with the pointer. The console can be resized from any edge or corner; its size and position are saved locally.

The active image and images selected through the app are stored in IndexedDB in the browser profile and restored on the next launch. The page cannot scan arbitrary folders directly; the file picker is the browser-approved way to add a saved image. If the browser blocks persistent storage, the selected image still works for the current session. Browser JavaScript cannot reliably read CPU/GPU utilization or temperature, and audio controls need a supported player integration; those commands report these limitations instead of inventing values.

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
