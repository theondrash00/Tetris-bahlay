# Tetris with Online Multiplayer — Implementation Plan

## Context
Building a modern Tetris game from scratch with online multiplayer using the DraftKings color palette. The project is a new, empty directory. The game will feature classic Tetris gameplay, player-selectable difficulty, synthesized sound effects, particle animations, high score persistence, and WebSocket-based multiplayer with room codes and garbage line attacks.

---

## Tech Stack
- **Frontend:** Vanilla JS (ES Modules), Canvas rendering, Web Audio API
- **Backend:** Node.js + Express + Socket.io
- **No bundler** — native ES module imports via `<script type="module">`

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
├── package.json              # express + socket.io deps
├── server.js                 # Express static server + Socket.io room/relay logic
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

## Build Phases

### Phase 1: Solo Tetris Core
1. **Scaffold** — `package.json`, `server.js` (Express static), `index.html` with canvas
2. **Constants + Piece** — Tetromino shapes, SRS kicks, 7-bag randomizer
3. **Board** — Grid, collision, line clearing
4. **Renderer** — Canvas drawing: grid, cells (beveled 3D look), ghost piece
5. **Game loop** — Gravity, input with DAS, locking, scoring, level progression

### Phase 2: Polish
6. **Sound** — Web Audio synthesized effects (move, rotate, drop, clear, game over)
7. **Particles** — Line clear bursts (green/orange), lock sparkles, Tetris screen shake
8. **UI + Styling** — Menu screens, DraftKings themed CSS, game layout
9. **High scores** — localStorage top 10, name entry on game over
10. **Difficulty** — Starting level selector (1-10), affects initial gravity speed

### Phase 3: Multiplayer
11. **Server rooms** — Socket.io room creation/joining/ready/countdown
12. **Client multiplayer** — Lobby UI, socket connection, room management
13. **State sync** — Board snapshot broadcast, opponent mini-canvas rendering
14. **Garbage lines** — Send on clear, receive and insert from below
15. **Win/loss** — Top-out detection, server declares winner, result overlay
16. **Disconnection** — Graceful handling, remaining player wins

### Phase 4: Final Polish
17. Tune particle effects, animations, screen shake
18. Audio volume balancing
19. Cross-browser testing (Chrome, Firefox, Edge)

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

## Verification
1. **Solo play:** Open `http://localhost:3000`, play a full game, verify pieces rotate/kick correctly, lines clear with particles, score updates, ghost piece visible, sounds play, high score saves
2. **Multiplayer:** Open two browser tabs, create room in tab 1, join with code in tab 2, both ready, verify countdown syncs, opponent board updates in real-time, garbage lines appear when opponent clears, winner declared on top-out
3. **Edge cases:** Rapid disconnect during game, simultaneous top-outs, room cleanup after both leave
