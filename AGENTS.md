# AGENTS.md

This file provides guidance to Codex (claude.ai/code) when working with code in this repository.

## Project

A dependency-free browser remake of a minimalist subway-line strategy game (London / Paris / New York; normal, endless, extreme, creative modes; tutorial). UI text, comments and README are in Chinese — keep new UI strings in Chinese.

## Files that matter

- `index.html` + `style.css` + `metro.js` — the development entry. No build step, no package.json, no framework.
- `Mini Metro.html` — single-file offline build: `style.css` inlined in `<style>`, the `index.html` body, and `metro.js` inlined in `<script>`. There is no generator script, so after changing the three source files, update this file to match by hand (or with a one-off script).
- `research/` — reference material only, never loaded by the game. `research/browser-check.js` is the end-to-end test. `research/reference/` is a separate third-party repo (its own `.git`, React/TS) and is just a reference.

## Run and test

Serve locally (the test hard-codes port 8767):

```powershell
python -m http.server 8767 --bind 127.0.0.1
```

End-to-end check with Playwright CLI in Chrome:

```powershell
npx --package @playwright/cli playwright-cli -s=minimetro open http://127.0.0.1:8767/ --browser=chrome
npx --package @playwright/cli playwright-cli -s=minimetro run-code --filename research/browser-check.js
```

`browser-check.js` is one async `page => {}` function that runs the whole scenario in order and throws on the first failed `check(value, label)`. There is no way to run a single case; to focus on one, temporarily cut the script down or write a small copy. Tests drive the game through globals (`stations`, `lines`, `trains`, `inventory`, `view`, `time`, `simulate(dt)`, `moveTrains(dt)`, `passengerChoices()`...) via `page.evaluate`, so renaming top-level identifiers in `metro.js` breaks tests.

## Architecture of `metro.js`

One classic (non-module) script in strict mode. All state is top-level `let` globals, which is intended: tests and the HUD read them directly.

- **Config at the top**: `themes` (per-city day/night palettes), `cities` (river polylines, start stations; New York has `vertical` and `eastRiver`), `extremeGoals`, `metrics` (statistics chart series), constants like `weekDuration`, `overloadLimit`.
- **Map model**: `stations[]` (each with `type` shape index and a `waiting` queue), `lines[]` (each route is an array of station ids; a loop repeats the first id at the end, see `looped`/`routeSize`), `trains[]`, `inventory` (trains/cars/interchanges/crossings). `edgeLines` / `rebuildTracks` index shared segments so parallel lines draw offset. `retiring` holds tracks of closed lines while their last train runs out.
- **Route edits** all go through `setRoute(index, route)`, which checks river-crossing budgets (`crossings`, `usedCrossings`) and handles trains on removed segments.
- **Simulation**: `frame(now)` → `simulate(dt)` (spawns, overload timers, week rollover → `upgrade()`), `moveTrains(dt)` (`advanceTrain`, `trainSpacing` keeps same-direction trains apart, `service` loads/unloads). Passengers pick trains with `passengerChoices`/`forecast` by estimated arrival time, including transfers.
- **Rendering**: `paint()` draws onto the `#map` canvas in world coordinates (960×570) mapped through `view` (`cameraView`/`updateCamera`). `paint` takes a target canvas so photo mode and replay GIF export (`gifPixels`, `gifPalette`) reuse it.
- **UI**: `showPanel` drives the single `<dialog id="screen">` for menus, results, weekly upgrades, statistics, replay and photo mode. Pointer handling (`stationAt`, `segmentAt`, `extendDraft`, `assignAsset`, `scheduleVehicleMove`) covers line drawing and dragging assets.
- **Tutorial / creative**: `lesson` state with `startTutorial`/`lessonStage`/`simulateTutorial`. Creative mode edits stations through `creativePointer`/`editCreativeStation`.
- `localStorage` is used only for small preferences/best scores (e.g. `metro-night`), and access is wrapped in try/catch.

## Research notes

`research/original-reverse-engineering.md` and the README's "对照范围" section explain where the numbers come from (station capacity 6/18, train and carriage capacity 6, city palettes from a public WebGL demo's Tube/Metro/Subway configs) and which behaviours are still approximations. Check them before you change gameplay constants.
