# Tetris — Project Guide for AI Assistants

## Project Overview

Modern Tetris with online multiplayer, DraftKings-themed. Vanilla JS frontend + Node.js/Express + Socket.IO backend. No build step — plain ES modules served as static files.

## Stack

- **Frontend:** Vanilla JS (ES modules), Canvas 2D API, CSS
- **Backend:** Node.js + Express + Socket.IO (`server.js`)
- **No framework, no bundler, no transpiler**

## Running the App

```bash
npm start          # production
npm run dev        # dev with --watch (auto-restart)
npm test           # run Playwright tests
npm run test:ui    # Playwright interactive UI mode
npm run test:report # view last HTML report
# App runs at http://localhost:3000
```

## Key File Map

| File | Purpose |
|------|---------|
| `server.js` | Express static server + all Socket.IO room/game logic |
| `public/index.html` | All screens defined as `<div class="screen">` — toggled via `.active` class |
| `public/js/main.js` | Button wiring, difficulty selection, multiplayer init |
| `public/js/gameController.js` | Orchestrates solo / bot / multiplayer modes; owns `state` object |
| `public/js/game.js` | Core game loop, board state machine (`idle → playing → lineClear → gameOver`) |
| `public/js/board.js` | 2D board logic, collision, line clears, garbage, board encoding |
| `public/js/piece.js` | Tetromino shapes, rotation (SRS), wall kicks |
| `public/js/renderer.js` | Canvas drawing (board, pieces, ghost, next-piece) |
| `public/js/ui.js` | All DOM updates (screen switching, score display, overlays, toasts) |
| `public/js/multiplayer.js` | Socket.IO client — emit/on wrappers |
| `public/js/multiplayerCallbacks.js` | Handles all incoming Socket.IO events |
| `public/js/bot.js` | AI opponent — 4 difficulty profiles (rookie/cleaner/aggressor/pro) |
| `public/js/highscores.js` | localStorage high scores |
| `public/js/constants.js` | All magic numbers (timing, scoring, colours, keys) |
| `public/js/sound.js` | Web Audio API sound effects |
| `public/js/particles.js` | Canvas particle effects on line clears |
| `playwright.config.js` | Playwright test configuration + webServer setup |
| `start-test-server.js` | Test server wrapper (sets `NODE_ENV=test`) |
| `.github/workflows/playwright.yml` | CI: runs Playwright tests on push/PR to main |

## Screens

All screens live in `public/index.html` as `<div id="X-screen" class="screen">`. The active screen has class `active`. Controlled via `UI.showScreen(id)`.

| Screen ID | Purpose |
|-----------|---------|
| `menu-screen` | Main menu, difficulty select |
| `bot-select-screen` | Choose AI opponent |
| `lobby-screen` | Multiplayer room create/join |
| `game-screen` | Active gameplay |
| `highscores-screen` | Leaderboard |
| `whats-new-screen` | Changelog |

Overlays on top of game-screen:
- `#overlay-countdown` — 3-2-1-GO
- `#overlay-gameover` — end-of-game stats + action buttons

## Socket.IO Event Contract

### Client → Server
| Event | Payload |
|-------|---------|
| `room:create` | `{name, difficulty}` |
| `room:join` | `{code, name}` |
| `room:leave` | — |
| `player:ready` | — |
| `game:state` | `{board, score, lines, level}` (100ms interval) |
| `game:garbage` | `{lines}` |
| `game:taunt` | `{message}` |
| `game:topout` | — |
| `game:rematch` | — |

### Server → Client
| Event | Payload |
|-------|---------|
| `room:created` | `{code}` |
| `room:joined` | `{players}` |
| `room:error` | `{message}` |
| `game:countdown` | `{seconds: 3\|2\|1}` |
| `game:start` | — |
| `opponent:state` | `{board, score, lines, level}` |
| `opponent:garbage` | `{lines}` |
| `game:over` | `{winnerId, winnerName, reason}` |
| `rematch:requested` | `{name}` |

## State Object (`gameController.js`)

```js
state = {
  game,              // Game instance (null when idle)
  botGame,           // Bot's Game instance (null when not in bot mode)
  multiplayer,       // MultiplayerClient instance (null when not connected)
  selectedDifficulty,// 1–10
  isMultiplayer,
  isBotGame,
  myName,
  lastBotKey,        // 'rookie' | 'cleaner' | 'aggressor' | 'pro'
}
```

## Game State Machine

`game.state` values: `'idle'` → `'playing'` → `'lineClear'` → `'gameOver'`

## Testing

Integration tests use **Playwright**. Tests live in `tests/`. CI runs on every push via GitHub Actions.

```bash
npm test                         # run all tests
npx playwright test solo         # run one file
npm run test:ui                  # interactive UI mode
npm run test:report              # view last HTML report
```

### Test Files

| File | What it covers |
|------|---------------|
| `tests/navigation.spec.js` | All screen transitions, back buttons |
| `tests/solo.spec.js` | Solo game flow: start → gameplay → game over |
| `tests/multiplayer.spec.js` | Two-context room create/join → ready → game starts |

### Test Design Principles

- Tests start the Express server automatically via `playwright.config.js` `webServer` config — no manual server needed
- Use stable element IDs already in the HTML — never select by text or CSS class
- Multiplayer tests use two independent `browser.newContext()` instances for real Socket.IO round-trips — no mocking
- Canvas content is not pixel-tested — assert element presence, visibility, and text values instead
- Timing-sensitive flows (countdown, line-clear animation) use `waitFor` / `waitForSelector` with generous timeouts

## Important Notes

- No mocking of Socket.IO in tests — real server, real sockets
- Test server uses faster Socket.IO ping timeout/interval for quicker disconnect detection (`start-test-server.js` sets `NODE_ENV=test`)
- Multiplayer client forces `websocket` transport (no polling fallback)
- Board encoding: string where `0`=empty, `1–7`=piece colours, `8`=garbage
- DAS (Delayed Auto Shift): 170ms initial delay, 50ms repeat
- High scores stored in `localStorage`
- Invite link: `?join=XXXX` in URL auto-fills room code and disables "Create Room"
