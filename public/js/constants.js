// Board dimensions
export const COLS = 10;
export const ROWS = 20;
export const CELL_SIZE = 30;

// Tetromino shapes — each piece has 4 rotation states
// 1 = filled cell, 0 = empty
export const TETROMINOES = {
  I: {
    shape: [
      [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
      [[0,0,1,0],[0,0,1,0],[0,0,1,0],[0,0,1,0]],
      [[0,0,0,0],[0,0,0,0],[1,1,1,1],[0,0,0,0]],
      [[0,1,0,0],[0,1,0,0],[0,1,0,0],[0,1,0,0]]
    ],
    color: '#00e5ff'
  },
  O: {
    shape: [
      [[1,1],[1,1]],
      [[1,1],[1,1]],
      [[1,1],[1,1]],
      [[1,1],[1,1]]
    ],
    color: '#ffd600'
  },
  T: {
    shape: [
      [[0,1,0],[1,1,1],[0,0,0]],
      [[0,1,0],[0,1,1],[0,1,0]],
      [[0,0,0],[1,1,1],[0,1,0]],
      [[0,1,0],[1,1,0],[0,1,0]]
    ],
    color: '#aa00ff'
  },
  S: {
    shape: [
      [[0,1,1],[1,1,0],[0,0,0]],
      [[0,1,0],[0,1,1],[0,0,1]],
      [[0,0,0],[0,1,1],[1,1,0]],
      [[1,0,0],[1,1,0],[0,1,0]]
    ],
    color: '#76ff03'
  },
  Z: {
    shape: [
      [[1,1,0],[0,1,1],[0,0,0]],
      [[0,0,1],[0,1,1],[0,1,0]],
      [[0,0,0],[1,1,0],[0,1,1]],
      [[0,1,0],[1,1,0],[1,0,0]]
    ],
    color: '#ff1744'
  },
  J: {
    shape: [
      [[1,0,0],[1,1,1],[0,0,0]],
      [[0,1,1],[0,1,0],[0,1,0]],
      [[0,0,0],[1,1,1],[0,0,1]],
      [[0,1,0],[0,1,0],[1,1,0]]
    ],
    color: '#2979ff'
  },
  L: {
    shape: [
      [[0,0,1],[1,1,1],[0,0,0]],
      [[0,1,0],[0,1,0],[0,1,1]],
      [[0,0,0],[1,1,1],[1,0,0]],
      [[1,1,0],[0,1,0],[0,1,0]]
    ],
    color: '#ff9100'
  }
};

// SRS Wall Kick Data
// Offsets for J, L, S, Z, T pieces
export const WALL_KICKS = {
  '0>1': [[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]],
  '1>0': [[0,0],[1,0],[1,-1],[0,2],[1,2]],
  '1>2': [[0,0],[1,0],[1,-1],[0,2],[1,2]],
  '2>1': [[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]],
  '2>3': [[0,0],[1,0],[1,1],[0,-2],[1,-2]],
  '3>2': [[0,0],[-1,0],[-1,-1],[0,2],[-1,2]],
  '3>0': [[0,0],[-1,0],[-1,-1],[0,2],[-1,2]],
  '0>3': [[0,0],[1,0],[1,1],[0,-2],[1,-2]]
};

// Offsets for I piece
export const WALL_KICKS_I = {
  '0>1': [[0,0],[-2,0],[1,0],[-2,-1],[1,2]],
  '1>0': [[0,0],[2,0],[-1,0],[2,1],[-1,-2]],
  '1>2': [[0,0],[-1,0],[2,0],[-1,2],[2,-1]],
  '2>1': [[0,0],[1,0],[-2,0],[1,-2],[-2,1]],
  '2>3': [[0,0],[2,0],[-1,0],[2,1],[-1,-2]],
  '3>2': [[0,0],[-2,0],[1,0],[-2,-1],[1,2]],
  '3>0': [[0,0],[1,0],[-2,0],[1,-2],[-2,1]],
  '0>3': [[0,0],[-1,0],[2,0],[-1,2],[2,-1]]
};

// Gravity speeds per level (ms per tick)
export const TICK_SPEEDS = [
  800, 720, 630, 550, 470, 380, 300, 220, 140, 100,
  80, 67, 50, 33, 17
];

// Scoring: index = lines cleared
export const SCORING = [0, 100, 300, 500, 800];

// Garbage sent: index = lines cleared
export const GARBAGE_TABLE = [0, 0, 1, 2, 4];

// Lines needed per level
export const LINES_PER_LEVEL = 10;

// Key bindings
export const KEYS = {
  LEFT: 'ArrowLeft',
  RIGHT: 'ArrowRight',
  DOWN: 'ArrowDown',
  ROTATE_CW: 'ArrowUp',
  ROTATE_CCW: 'KeyZ',
  HARD_DROP: 'Space'
};

// DAS (Delayed Auto Shift) settings
export const DAS_DELAY = 170;  // ms before auto-repeat starts
export const DAS_RATE = 50;    // ms between auto-repeat moves

// Piece types for bag randomizer
export const PIECE_TYPES = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];

// Multiplayer state sync rate
export const SYNC_RATE = 100; // ms between state broadcasts

// Board palette encoding: maps palette index (char code - 48) → hex color
// Index 0 = empty, 1-7 = piece colors, 8 = garbage
export const BOARD_PALETTE = [
  null,        // 0 = empty
  '#00e5ff',   // 1 = I
  '#ffd600',   // 2 = O
  '#aa00ff',   // 3 = T
  '#76ff03',   // 4 = S
  '#ff1744',   // 5 = Z
  '#2979ff',   // 6 = J
  '#ff9100',   // 7 = L
  '#888888',   // 8 = garbage
];

// Reverse lookup: hex color → palette index char
export const BOARD_PALETTE_INDEX = Object.fromEntries(
  BOARD_PALETTE.map((color, i) => [color, String.fromCharCode(48 + i)])
);

// Game timing
export const FLASH_DURATION = 400;      // ms for line-clear flash animation
export const SOFT_DROP_INTERVAL = 50;   // ms between soft-drop ticks
export const COUNTDOWN_GO_DURATION = 600; // ms "GO!" stays on screen before game starts

// Particles
export const PARTICLE_GRAVITY = 0.12;       // vy added per update tick
export const PARTICLE_STAGGER_MS = 30;      // ms delay per row in game-over effect
export const TETRIS_SHAKE_DURATION = 300;   // ms screen shake on 4-line clear
