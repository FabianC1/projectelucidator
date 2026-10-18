# PROJECT ELUCIDATOR
## SAO: Dual Wield — System Override

**Project type:** Animated Windows desktop wallpaper  
**Visual inspiration:** Sword Art Online (SAO)  
**Repository:** `projectelucidator`  
**Target platform:** Windows 11  
**Wallpaper host:** Lively Wallpaper  
**Technology:** React, TypeScript, Vite, Three.js and WebGL

---

## 1. Project vision

Build a cinematic, interactive-feeling Sword Art Online desktop wallpaper in which two legendary weapons are compiled into existence by a futuristic digital system.

The experience should feel like watching the SAO system initialise, process weapon data, construct two weapons out of thousands of individual code characters, and synchronise them in a dramatic crossing event.

The final result is not a video or a static image. It is a real-time animated web application running as a Windows desktop wallpaper.

### Core principles

- **Geometry-guided code.** Three-dimensional weapon guide meshes define the exact surfaces for glyph placement, then stay hidden so the visible crossed swords are made from code.
- **Recognisable silhouettes.** Elucidator and Lambent Light must have deliberately designed shapes, including their distinctive blades, guards, grips and pommels.
- **Cinematic construction.** The weapons are progressively compiled into existence, rather than simply fading into view.
- **Controlled movement.** The final wallpaper should feel alive without becoming distracting.
- **Performance first.** The wallpaper must remain lightweight enough for everyday desktop use and gaming on the target PC.
- **One intro, endless idle.** The boot sequence plays once when the wallpaper launches. The completed weapons then remain on screen while the idle animation loops independently.

---

## 2. Final visual concept

The entire screen begins as a black void.

A tiny cyan cursor awakens in the centre. System commands begin appearing, multiplying and breaking apart into streams of digital characters. The streams separate into two weapon signatures: electric blue and dark metallic tones for Elucidator, and silver-white with a pale-pink tint for Lambent Light.

The characters begin to organise themselves. They trace the weapons' silhouettes, fill the blades and assemble the finer details over three-dimensional weapon geometry. The guide meshes stay hidden; aligned glyphs define the visible dark-blue Elucidator and silver-white Lambent Light forms.

Both weapons rotate inward and cross at the centre. A brilliant blue-white flash erupts at the intersection, scattering hexadecimal characters outward in a circular shockwave.

When the light fades, the swords remain crossed as dense, geometry-guided code. Restrained rings and a few drifting fragments carry the digital identity into the idle scene.

The scene settles into a near-black background. Thin luminous rings rotate around the weapons, a few particles drift around the intersection, and a subtle camera movement creates a sense of depth. The aligned glyphs remain the visible weapon surfaces.

The result should resemble a living SAO system display, not a conventional screensaver.

---

## 3. Animation storyboard

**Target intro duration: approximately 18–22 seconds.** Timings are initial targets and can be adjusted during development.

### Phase 1 — The void (00:00–00:02)

- Completely black screen.
- A small cyan cursor appears in the exact centre.
- The first characters appear slowly: `>`, `S`, `SY`, `SYS_`.
- The cursor blinks with a subtle blue glow.
- No other significant visual elements are present.

**Goal:** Establish anticipation and restraint.

### Phase 2 — System initialization (00:02–00:05)

System commands begin typing faster:

```text
SYSTEM.INIT()
LOADING.WEAPON_ENGINE...
MEMORY.ALLOCATE(0xFF)
RENDER_MODE = DIGITAL
```

- New lines appear beneath the original command.
- Characters rise, fall and detach from the text.
- Small fragments drift away from the central cluster.
- Lines of code stretch, bend and follow curved paths.
- The central code cluster grows brighter and denser.

**Goal:** Make the code feel as if it is beginning to behave independently.

### Phase 3 — Dual-wield activation (00:05–00:07)

The code separates into two streams:

```text
WEAPON_01 = ELUCIDATOR
WEAPON_02 = LAMBENT_LIGHT

DUAL_WIELD: ACTIVATING
```

- The left stream becomes electric blue.
- The opposite stream becomes silver-white with a pale-pink tint.
- Both streams travel towards opposite sides of the screen.
- Thin trails of characters remain in their wake.
- Subtle system diagnostics appear near the screen edges.

**Goal:** Establish two distinct weapon identities.

### Phase 4 — Code becomes steel (00:07–00:11)

This is the central technical and visual challenge.

The swords are constructed progressively:

1. **Outline:** Characters snap into position along the blade edges and weapon silhouettes.
2. **Blade formation:** Dense rows of code fill the interior while continuing to flow.
3. **Weapon details:** Guards, grips and pommels assemble from brighter, more concentrated characters.
4. **Stabilisation:** Scattered characters align into crisp and recognisable weapon shapes.

Elucidator should feel heavier and more powerful. Lambent Light should feel thinner, faster and more precise.

The swords must remain identifiable even when viewed from a distance at normal desktop scale.

**Goal:** Make the viewer believe the system is compiling two actual weapons from digital information.

### Phase 5 — System Override (00:11–00:14)

- Both swords rotate inward in a deliberate, synchronised motion.
- They meet and cross at the centre of the screen.
- The animation briefly freezes at the point of contact.
- A blue-white flash erupts at the intersection.
- Hexadecimal characters burst outward in a circular shockwave.
- The flash illuminates the detailed code forming the blades.
- The swords remain crossed after the flash.

System messages appear briefly:

```text
DUAL_WIELD.SYNCHRONIZED()
WEAPON_LINK: STABLE
SYSTEM_OVERRIDE: COMPLETE
```

The messages then fade into the darkness.

**Goal:** Deliver the cinematic payoff without obscuring the finished weapons for too long.

### Phase 6 — The awakened weapons (approximately 00:14–00:20)

The scene settles into its final composition.

- Crossed swords occupy roughly half the screen's height.
- The background returns to near-total black.
- The code-built blade surfaces remain crisp and stable.
- Tiny fragments detach from the edges and occasionally return.
- The intersection emits a soft pulse every few seconds.
- A small number of hexadecimal characters drift through the background.
- The swords retain crisp, stable silhouettes.

The screen corners should remain mostly empty to leave room for desktop icons.

**Goal:** Transition from a cinematic sequence to a beautiful everyday wallpaper.

### Phase 7 — Infinite idle animation

The intro does not restart automatically.

Once the swords have formed, the wallpaper enters a separate idle state that continues indefinitely.

The idle animation includes:

- Luminous blue and pale-pink rings orbiting the crossed swords.
- Small code fragments travelling around the rings.
- Subtle movement of the swords themselves.
- Gentle glow pulses.
- Gentle glow pulses over the code-built weapon surfaces.
- Occasional particles drifting away from the intersection.
- Very slow camera movement to create a sense of depth.

The rings should be the most visible movement. Sword rotation should be almost imperceptible, and camera movement should be slow and restrained.

**Important:** The intro timeline and idle loop must be implemented as separate animation states. The idle loop must never reset the entire animation to the opening cursor.

---

## 4. Technical architecture

### Core technology

| Technology | Purpose |
|---|---|
| React | Application structure and interface elements |
| TypeScript | Type-safe animation and application code |
| Vite | Development server and production build |
| Three.js | 3D weapons, camera, geometry, particles and lighting |
| WebGL | Real-time rendering in the browser |
| Lively Wallpaper | Displays the finished application as the Windows wallpaper |
| Git and GitHub | Version control and project history |

### Rendering approach

Use Three.js directly rather than adding React Three Fiber initially.

The animation will need precise control over the construction timeline, character positions, particle movement, ring rotation and camera behaviour. A custom animation controller will manage these effects.

Use a combination of:

- Carefully defined sword silhouettes and geometry.
- Batched or instanced glyphs where appropriate.
- Animated character positions and material effects.
- Lightweight glow effects.
- A small number of carefully controlled particles.
- A separate timeline for the intro and idle state.

Avoid creating thousands of independent React components or expensive individual objects when a batched rendering approach can achieve the same visual result.

### Animation states

The application should have a clear state model:

```text
BOOT_SEQUENCE
      |
      v
  IDLE_LOOP
      |
      v
  IDLE_LOOP
  indefinitely
```

The boot sequence advances through timed phases. Once construction and the crossing event finish, control transfers to the idle animation.

The idle animation has its own continuous time and never returns to `BOOT_SEQUENCE`.

If the wallpaper is restarted, the intro may play again. Preventing repeated intros during the same Windows session can be considered later if needed.

---

## 5. Performance requirements

### Target hardware

- Windows 11 Home
- Intel Core i5-9400F
- NVIDIA GeForce GTX 1650 with 4 GB VRAM
- 16 GB RAM

### Initial performance targets

- Internal rendering resolution: start at 1920 × 1080.
- Frame rate: target 24–30 FPS initially.
- Minimal or carefully controlled glow.
- No expensive real-time shadows.
- Avoid heavy blur, reflections and unnecessary post-processing.
- Limit particle counts and background activity.
- Keep idle animation cheaper than the boot sequence.
- Pause or reduce wallpaper activity when fullscreen games are running, using Lively's available controls.

These are initial targets, not guarantees. Test the actual wallpaper while idle and while using the PC normally.

If the desktop display is 4K, begin with 1080p internal rendering and assess the result before increasing the resolution.

**Priority order:** recognisable swords, beautiful code effects, smooth movement, then additional visual polish.

---

## 6. Software and setup

Install the following manually from their official websites.

- [Node.js — LTS download](https://nodejs.org/en/download/)
- [Visual Studio Code](https://code.visualstudio.com/)
- [Lively Wallpaper](https://www.rocksdanister.com/lively/)
- [Three.js installation guide](https://threejs.org/manual/pages/installation.html)
- [Vite guide](https://vite.dev/guide/)

Git must also be available for version control. If it is not already installed, obtain it from [git-scm.com](https://git-scm.com/).

Use a current Node.js LTS version that satisfies Vite's requirements.

No API keys, paid animation software, cloud services or backend are required for the initial project.

### Initial project setup

Open the local `projectelucidator` repository in VS Code.

Check the terminal location and existing files:

```powershell
Get-Location
Get-ChildItem -Force
```

Verify Node.js and npm:

```powershell
node -v
npm -v
```

If the repository is empty apart from Git metadata, initialise Vite:

```powershell
npm create vite@latest . -- --template react-ts
```

If the repository already contains project files, preserve them and resolve any prompts carefully. Never delete the `.git` directory.

Install the dependencies:

```powershell
npm install
npm install three
npm install -D @types/three
```

Start the development server:

```powershell
npm run dev
```

Open the local URL printed in the terminal, usually `http://localhost:5173/`.

Stop the development server with `Ctrl+C`.

Check that a production build succeeds:

```powershell
npm run build
```

The production output should be generated in the `dist` directory.

---

## 7. Development roadmap

Work through the milestones in order. Do not attempt to build the complete cinematic sequence in one enormous implementation.

### Milestone 1 — Project foundation

- [ ] Install Node.js LTS.
- [ ] Verify Node.js, npm and Git.
- [ ] Open the local GitHub repository.
- [ ] Initialise React, TypeScript and Vite if needed.
- [ ] Install Three.js and its TypeScript definitions.
- [ ] Run the development server successfully.
- [ ] Confirm the production build works.
- [ ] Commit the working foundation to Git.

**Definition of done:** The application runs locally and builds without errors.

### Milestone 2 — Rendering foundation

- [ ] Create the Three.js scene.
- [ ] Set the background to black.
- [ ] Add the camera and renderer.
- [ ] Handle browser resizing and aspect ratio.
- [ ] Establish the target rendering resolution and frame rate.
- [ ] Verify performance on the target PC.

**Definition of done:** A stable, lightweight real-time scene renders correctly.

### Milestone 3 — Weapon design

- [x] Define Elucidator's silhouette and proportions.
- [x] Define Lambent Light's silhouette and proportions.
- [ ] Construct recognisable blades, guards, grips and pommels.
- [ ] Position the swords in their final crossed composition.
- [ ] Establish the blue and pale-pink colour palettes.
- [ ] Check the composition at normal desktop viewing distance.

**Definition of done:** Both weapons are recognisable before the advanced code effects are added.

### Milestone 4 — Code-based weapon construction

- [x] Design how glyphs are positioned along each weapon.
- [x] Build the outline-drawing effect.
- [x] Fill the blade silhouettes with animated code.
- [x] Construct the guards, grips and pommels from denser glyphs.
- [x] Animate code flowing along the blade direction.
- [ ] Add the final stabilisation effect.
- [x] Ensure the code itself creates the sword silhouettes.

**Definition of done:** Both swords can be assembled from animated digital characters while remaining recognisable.

### Milestone 5 — Cinematic boot sequence

- [ ] Implement the opening cursor and typing effect.
- [ ] Add system initialisation commands.
- [x] Split the code into two weapon streams.
- [ ] Animate the construction of both weapons.
- [ ] Rotate the swords inward.
- [ ] Add the crossing flash and hexadecimal shockwave.
- [ ] Display and fade the system completion messages.
- [ ] Transfer cleanly into the idle state.

**Definition of done:** The complete intro plays from start to finish and ends with the swords crossed.

### Milestone 6 — Idle animation

- [ ] Add rotating blue and pale-pink rings.
- [ ] Add subtle lighting pulses to the materialized weapon surfaces.
- [ ] Add subtle weapon movement.
- [ ] Add restrained camera drift.
- [ ] Add occasional particles and gentle light pulses.
- [ ] Keep the background and screen corners uncluttered.
- [ ] Ensure the idle state loops without restarting the intro.

**Definition of done:** The finished wallpaper can run indefinitely without a visible reset or distracting movement.

### Milestone 7 — Performance and polish

- [ ] Measure frame rate during the intro.
- [ ] Measure frame rate during idle.
- [ ] Reduce unnecessary draw calls and particle counts.
- [ ] Optimise glow and other costly effects.
- [ ] Test resizing and different aspect ratios.
- [ ] Test normal desktop use and fullscreen gaming.
- [ ] Fix rendering errors and memory leaks.

**Definition of done:** The wallpaper remains stable and responsive on the target hardware.

### Milestone 8 — Windows wallpaper integration

- [ ] Generate the production build.
- [ ] Open Lively Wallpaper.
- [ ] Add the built web project as a wallpaper.
- [ ] Confirm the intro plays when the wallpaper launches.
- [ ] Confirm the idle animation continues indefinitely.
- [ ] Configure Lively's Windows startup settings.
- [ ] Configure fullscreen application behaviour.
- [ ] Test restarting Lively and restarting Windows.

**Definition of done:** The animation works as an actual Windows desktop wallpaper without requiring the development server to remain open.

### Milestone 9 — Final release

- [ ] Update the README with the final setup instructions.
- [ ] Confirm the repository contains the necessary source files.
- [ ] Document how to rebuild and reinstall the wallpaper.
- [ ] Commit the finished work to GitHub.
- [ ] Record any known limitations.

**Definition of done:** The project can be rebuilt from its repository and used without relying on an active Codex or VS Code session.

---

## 8. Project scope and exclusions

### Included in the initial version

- Cinematic boot sequence.
- Code-based construction of both swords.
- Distinct weapon colours and silhouettes.
- Synchronized sword crossing.
- Digital flash and hexadecimal shockwave.
- Infinite idle animation.
- Rotating rings.
- Digital code-based materialisation during the intro.
- Subtle camera movement.
- Windows wallpaper integration.
- Performance optimisation for the target PC.

### Not included initially

- Multiplayer or online functionality.
- Backend servers or databases.
- User accounts or cloud synchronisation.
- A configurable wallpaper settings interface.
- Audio and sound effects.
- Complex physics simulations.
- Expensive real-time reflections or cinematic post-processing.
- Unity or Unreal Engine integration.
- A full 3D recreation of the SAO world.

These can be considered later, but they must not delay the core wallpaper.

---

## 9. Working rules for Codex

Use Codex to implement the project incrementally, one milestone at a time.

1. Read this README before starting a new milestone.
2. Inspect the existing code before modifying it.
3. Explain the intended changes before making large architectural decisions.
4. Implement only the current milestone unless a prerequisite requires otherwise.
5. Run the relevant checks and fix errors before marking work complete.
6. Update the milestone checklist when work is genuinely finished.
7. Do not mark features complete merely because code has been written; verify that they work.
8. Keep performance in mind throughout development rather than postponing optimisation until the end.
9. Preserve existing files, configuration and Git history unless a change is necessary and understood.
10. Never require credentials, API keys or paid services unless the project scope is explicitly changed.

### Git workflow

Make a commit after each meaningful, working milestone. Use clear commit messages, for example:

```text
chore: initialise React and Three.js project
feat: create Three.js rendering foundation
feat: define dual-wield weapon silhouettes
feat: construct swords from animated code
feat: implement cinematic boot sequence
feat: add infinite idle animation
perf: optimise wallpaper rendering
feat: integrate Lively Wallpaper
```

---

## 10. Current status and next action

**Current milestone:** Milestone 1 — Project foundation.

The visual design and technical direction have been planned. Implementation and setup must still be verified.

### Immediate next steps

- [ ] Install Node.js LTS.
- [ ] Open `projectelucidator` locally in VS Code.
- [ ] Check the repository's existing files.
- [ ] Initialise Vite only if necessary.
- [ ] Install the project dependencies.
- [ ] Run the development server.
- [ ] Confirm the first production build succeeds.

After these steps, begin Milestone 2.

---

## Final acceptance criteria

The project is complete when all of the following are true:

- Launching the wallpaper begins with a black void and a blinking cyan cursor.
- System code appears and separates into two distinct streams.
- Elucidator and Lambent Light are progressively assembled from digital glyphs.
- The swords rotate inward, cross and trigger a digital shockwave.
- Hidden Three.js guide meshes define dense glyphs that form dimensional crossed swords.
- Luminous rings rotate around the weapons during idle.
- Rings, particles, lighting and camera movement provide restrained continuous motion after the weapon code has materialized.
- The intro does not repeat as part of the idle loop.
- The wallpaper can run continuously as a Windows desktop background.
- Performance is acceptable on the target PC.
- The application can be rebuilt from the GitHub repository without requiring VS Code, Codex or the development server to stay open.

**The ultimate goal:** A living SAO system display that compiles two legendary weapons in front of you at startup, then quietly keeps them awakened on your desktop for the rest of the day.
