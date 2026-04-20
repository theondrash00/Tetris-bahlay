# Tetris with Online Multiplayer — Implementation Plan

## Context
Built a modern Tetris game from scratch with online multiplayer using the DraftKings color palette. Solo play is confirmed working. Multiplayer is confirmed working after a join bug fix. Project is deployed on GitHub and on Render.

---

## Status: COMPLETE ✅

All phases built, tested, and deployed. VS Bot feature added (Phase 5).

---

## Tech Stack
- **Frontend:** Vanilla JS (ES Modules), Canvas rendering, Web Audio API
- **Backend:** Node.js + Express + Socket.io
- **No bundler** — native ES module imports via `<script type="module">`
- **Node.js location (this machine):** `C:\node-v24.15.0-win-x64\node.exe`
- **Run server:** `"C:/node-v24.15.0-win-x64/node.exe" server.js` or add Node to PATH first

## DraftKings Palette
| Color | Hex | Usage |
|---|---|---|
| Green | `#9ac434` | Primary accent, buttons, particles |
| Orange | `#f46c22` | Secondary accent, highlights, particles |
| Grey | `#d8d8d8` | Text, UI elements |
| Black | `#000000` | Background |

---

## File Structure
```
Tetris-bahlay/
├── .gitignore
├── package.json              # express + socket.io deps
├── server.js                 # Express static server + Socket.io room/relay logic
├── vast-gliding-island.md    # This file
├── public/
│   ├── index.html            # Single page with layered screens (menu, lobby, game, scores)
│   ├── style.css             # Full styling with DK palette as CSS vars
│   └── js/
│       ├── main.js           # Entry point: screen orchestration, event wiring
│       ├── constants.js      # Tetrominoes (SRS), colors, speeds, keys, scoring tables
│       ├── board.js          # Grid state, collision, line clearing, garbage insertion
│       ├── piece.js          # Piece position/rotation, SRS wall kicks, 7-bag randomizer
│       ├── game.js           # Game loop, input (DAS), scoring, state machine
│       ├── renderer.js       # Canvas drawing: board, pieces, ghost, beveled cells
│       ├── particles.js      # Particle system for line clear/lock/game-over effects
│       ├── sound.js          # Web Audio API synthesized SFX (no external files)
│       ├── ui.js             # DOM UI: screen toggling, score display, overlays, toasts
│       ├── highscores.js     # localStorage CRUD for top 10 scores
│       └── multiplayer.js    # Socket.io client: room management, state sync, garbage relay
```

---

## Architecture Decisions

| Decision | Choice | Why |
|---|---|---|
| Rendering | Canvas (+ DOM for UI) | Particles, ghost piece, opponent mini-board need pixel control |
| Server role | Thin relay (not authoritative) | Each client runs its own game engine; server relays state + declares winners |
| State sync | 10 updates/sec (100ms throttle) | Smooth opponent preview without flooding bandwidth |
| Rotation system | SRS with wall kicks | Industry standard, expected by players |
| Input | DAS: 170ms delay, 50ms repeat | Responsive modern Tetris feel |
| Randomizer | 7-bag | Fair piece distribution, no droughts > 12 pieces |
| Sound | Web Audio synthesis | Zero external files, instant playback |

---

## Multiplayer Protocol

**Room flow:** Create room -> get 4-char code -> share code -> opponent joins -> both ready -> 3-2-1 countdown -> game starts

**During game:**
- Each client sends board snapshot + score every 100ms
- On line clear: send garbage count (0/1/2/4 for 1/2/3/4 lines)
- On top-out: notify server, server declares winner

**Events:**
| Client -> Server | Server -> Client |
|---|---|
| `room:create`, `room:join`, `room:leave` | `room:created`, `room:joined`, `room:error` |
| `player:ready` | `game:countdown`, `game:start` |
| `game:state`, `game:garbage`, `game:topout` | `opponent:state`, `opponent:garbage`, `game:over`, `opponent:disconnected` |

---

## Scoring
- Lines cleared: 100 / 300 / 500 / 800 (1/2/3/4 lines) x current level
- Soft drop: +1 per row
- Hard drop: +2 per row
- Level up every 10 lines

## Garbage Table (multiplayer)
| Lines cleared | Garbage sent |
|---|---|
| 1 | 0 |
| 2 | 1 |
| 3 | 2 |
| 4 (Tetris) | 4 |

---

## Known Bugs Fixed
- **Multiplayer "Room is Full" on join:** The joining client wasn't storing the room code before receiving the `room:joined` event, causing the UI to not show the room panel. Fix: `multiplayer.js` now sets `this.roomCode` in `joinRoom()` before emitting the socket event. `main.js` `roomJoined` callback now calls `UI.showRoomInfo()` for the joiner too.

## UI Changes (post-launch)
- **Controls legend added** — key badges (green background, black text) with action descriptions. Visible in two places:
  - **Menu screen:** right sidebar separated by a vertical border line, next to the title/buttons
  - **Game screen:** left panel below SCORE / LEVEL / LINES
- Controls legend intentionally removed from the right panel (kept clean for NEXT piece + opponent board)

## Code Refactor (post-launch)
- **main.js split** — 523-line entry point split into 3 files: `main.js` (wiring only, ~140 lines), `gameController.js` (all game start/stop/teardown logic), `multiplayerCallbacks.js` (all socket event handlers)
- **Shared `createGame()` factory** — `startSoloGame`, `startBotGame`, `startMultiplayerGame` unified; shared callbacks wired once, mode-specific overrides passed as deltas
- **CSS consolidation** — `.panel-container` base class extracts shared `text-align/h2` rules duplicated across 4 screen containers (~20 lines saved)
- **Gzip compression** — `compression` npm package added to server; all JS/CSS/HTML compressed on the wire (~75% size reduction, 128KB → ~30KB transferred)
- **File structure** now: `main.js` (event wiring) → `gameController.js` (game modes) → `multiplayerCallbacks.js` (socket events)

## Difficulty Selector UX (post-launch)
- **Color-coded level buttons** — 1–3 green, 4–6 yellow, 7–8 orange, 9–10 red; active button uses tier color
- **Dynamic hint line** below selector updates on each click: speed label + score multiplier in matching color (e.g. *"Fast · 5× score"*)

## What's New screen (post-launch)
- **WHAT'S NEW ✦** button at bottom of menu (dimmed outline style) opens a dedicated changelog screen
- Lists 4 entries with NEW/UPDATE badges: VS Bot, instant rematch, multiplayer UX, controls legend
- BACK returns to menu

## VS Bot Feature (post-launch)
- **VS BOT button** in menu → bot-select-screen with 4 bot cards (Rookie/Cleaner/Aggressor/Pro)
- **Client-side only** — no server. Two `Game` instances run in same tab; bot's game uses a hidden canvas.
- **BotPlayer class** (`public/js/bot.js`) — board evaluator (holes, height, bumpiness, lines), `setTimeout`-based think loop, configurable think speed + error rate per personality
- **Garbage wired directly** — player's `onGarbage` → botGame.receiveGarbage() and vice versa
- **Game over overlay** shows REMATCH button for bot games; saves high score if player wins

## Multiplayer UX Improvements (post-launch)
- **Copy room code button** — `⧉` icon next to room code in lobby, copies to clipboard, shows toast
- **Player name above board** — your name shown above the game canvas in green during multiplayer (from lobby name input)
- **Rematch flow (Option B):**
  - Player A clicks REMATCH → button disables, toast shown, `game:rematch` sent to server
  - Server notifies opponent via `rematch:requested` event
  - Opponent sees toast: "[Name] wants a rematch! Click REMATCH to accept."
  - When both have sent `game:rematch`, server triggers 3-2-1 countdown immediately → new game starts
  - No lobby re-entry needed, same room/connection reused
  - **Note:** server must be restarted to pick up new socket handlers after code changes

---

## Deployment

- **GitHub:** https://github.com/theondrash00/Tetris-bahlay
- **Render (hosted):** Connected to GitHub repo, auto-deploys on push to `main`
- **Local:** `"C:/node-v24.15.0-win-x64/node.exe" server.js` -> http://localhost:3000

## New Machine Setup
```bash
git clone https://github.com/theondrash00/Tetris-bahlay.git
cd Tetris-bahlay
npm install
npm start
```
Requires Node.js installed. Install from https://nodejs.org (LTS).

Note: High scores are stored in browser localStorage — they do not persist across machines.
