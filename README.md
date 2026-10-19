# Project Elucidator

Project Elucidator is a full-screen, SAO-inspired wallpaper launcher. A short system boot sequence reveals the selected wallpaper, then a small terminal prompt lets the user load another image without leaving the screen.

## Experience

1. The screen opens on a black field with a cyan `> SYS_` prompt.
2. System and display diagnostics type in as the selected wallpaper is decoded and revealed by a scan.
3. The wallpaper settles into a full-screen view.
4. A minimal command line remains available in the lower-left corner.

The boot sequence runs on each app launch and when a different wallpaper is selected. If no wallpaper has been selected yet, the system boots to black and waits for a file selection.

## Wallpaper commands

Click the terminal line, enter a command, and press Enter (or use the return button):

| Command | Action |
| --- | --- |
| `wallpaper select` | Open the system file picker and choose an image |
| `wallpaper` | Alias for `wallpaper select` |
| `help` | Show the available commands |

The selected image is stored in IndexedDB in the browser profile and restored on the next launch. The page cannot scan arbitrary folders directly; the file picker is the browser-approved way to choose a saved image. If the browser blocks persistent storage, the selected image still works for the current session.

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
