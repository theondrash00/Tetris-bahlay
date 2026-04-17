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
