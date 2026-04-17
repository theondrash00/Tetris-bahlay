import { Piece } from './piece.js';
import { Board } from './board.js';
import { COLS, ROWS } from './constants.js';

export const BOT_PERSONALITIES = {
  rookie: {
    name: 'Rookie',
    badge: 'EASY',
    badgeClass: 'easy',
    desc: 'Just learning the ropes. Makes plenty of mistakes.',
    thinkMin: 600,
    thinkMax: 900,
    errorRate: 0.30,
    weights: { holes: 2, height: 0.5, bumpiness: 0.5, lines: 5 }
  },
  cleaner: {
    name: 'Cleaner',
    badge: 'MEDIUM',
    badgeClass: 'medium',
    desc: 'Methodical and tidy. Loves a flat board.',
    thinkMin: 250,
    thinkMax: 400,
    errorRate: 0.10,
    weights: { holes: 5, height: 1.5, bumpiness: 2, lines: 8 }
  },
  aggressor: {
    name: 'Aggressor',
    badge: 'HARD',
    badgeClass: 'hard',
    desc: 'Sends garbage non-stop. Height means nothing.',
    thinkMin: 150,
    thinkMax: 250,
    errorRate: 0.15,
    weights: { holes: 3, height: 0.3, bumpiness: 0.5, lines: 12 }
  },
  pro: {
    name: 'Pro',
    badge: 'EXPERT',
    badgeClass: 'expert',
    desc: 'Near-perfect play. Good luck.',
    thinkMin: 80,
    thinkMax: 150,
    errorRate: 0.03,
    weights: { holes: 8, height: 2.5, bumpiness: 3, lines: 10 }
  }
};

export class BotPlayer {
  constructor(game, personalityKey) {
    this.game = game;
    this.personality = BOT_PERSONALITIES[personalityKey] || BOT_PERSONALITIES.rookie;
    this.running = false;
    this.thinkTimeout = null;
  }

  start() {
    this.running = true;
    this._scheduleThink();
  }

  stop() {
    this.running = false;
    if (this.thinkTimeout) {
      clearTimeout(this.thinkTimeout);
      this.thinkTimeout = null;
    }
  }

  _scheduleThink() {
    if (!this.running) return;
    const { thinkMin, thinkMax } = this.personality;
    const delay = thinkMin + Math.random() * (thinkMax - thinkMin);
    this.thinkTimeout = setTimeout(() => this._thinkAndAct(), delay);
  }

  _thinkAndAct() {
    if (!this.running) return;
    const g = this.game;
    if (g.state !== 'playing' || !g.currentPiece) {
      this._scheduleThink();
      return;
    }

    // Random error: pick a random move instead of best
    if (Math.random() < this.personality.errorRate) {
      this._executeRandomMove();
    } else {
      const best = this._findBestPlacement();
      if (best) {
        this._executeMove(best.rotation, best.col);
      } else {
        g.hardDrop();
      }
    }

    this._scheduleThink();
  }

  _findBestPlacement() {
    const g = this.game;
    const piece = g.currentPiece;
    const board = g.board;
    const rotationCount = piece.shape.length;

    let bestScore = -Infinity;
    let bestMove = null;

    for (let rot = 0; rot < rotationCount; rot++) {
      const testPiece = piece.clone();
      // Rotate to target rotation
      const rotations = (rot - piece.rotation + rotationCount) % rotationCount;
      for (let i = 0; i < rotations; i++) {
        testPiece.rotation = (testPiece.rotation + 1) % rotationCount;
      }

      // Try every column
      for (let col = -2; col < COLS + 2; col++) {
        const trial = testPiece.clone();
        trial.col = col;

        if (!board.canPlace(trial.getBlocks())) continue;

        // Drop it down
        while (trial.move(1, 0, board)) {/* drop */}

        const blocks = trial.getBlocks();
        if (blocks.length === 0) continue;
        if (blocks.every(b => b.row < 0)) continue; // entirely above board

        // Simulate locking
        const simGrid = board.grid.map(r => [...r]);
        for (const { row, col: c } of blocks) {
          if (row >= 0 && row < ROWS) simGrid[row][c] = 'sim';
        }

        const score = this._evaluateGrid(simGrid);
        if (score > bestScore) {
          bestScore = score;
          bestMove = { rotation: rot, col };
        }
      }
    }

    return bestMove;
  }

  _evaluateGrid(grid) {
    const w = this.personality.weights;
    const heights = this._columnHeights(grid);
    const aggregateHeight = heights.reduce((s, h) => s + h, 0);
    const holes = this._countHoles(grid, heights);
    const bumpiness = this._bumpiness(heights);
    const linesCleared = grid.filter(row => row.every(c => c !== null)).length;

    return (
      -holes * w.holes
      - aggregateHeight * w.height
      - bumpiness * w.bumpiness
      + linesCleared * w.lines
    );
  }

  _columnHeights(grid) {
    const heights = new Array(COLS).fill(0);
    for (let c = 0; c < COLS; c++) {
      for (let r = 0; r < ROWS; r++) {
        if (grid[r][c] !== null) {
          heights[c] = ROWS - r;
          break;
        }
      }
    }
    return heights;
  }

  _countHoles(grid, heights) {
    let holes = 0;
    for (let c = 0; c < COLS; c++) {
      const topRow = ROWS - heights[c];
      for (let r = topRow + 1; r < ROWS; r++) {
        if (grid[r][c] === null) holes++;
      }
    }
    return holes;
  }

  _bumpiness(heights) {
    let bump = 0;
    for (let c = 0; c < COLS - 1; c++) {
      bump += Math.abs(heights[c] - heights[c + 1]);
    }
    return bump;
  }

  _executeMove(targetRotation, targetCol) {
    const g = this.game;
    if (!g.currentPiece) return;

    const piece = g.currentPiece;
    const rotationCount = piece.shape.length;
    const rotations = (targetRotation - piece.rotation + rotationCount) % rotationCount;

    for (let i = 0; i < rotations; i++) {
      piece.rotate('cw', g.board);
    }
    g.computeGhost();

    const dc = targetCol - piece.col;
    const step = dc > 0 ? 1 : -1;
    for (let i = 0; i < Math.abs(dc); i++) {
      piece.move(0, step, g.board);
    }
    g.computeGhost();

    g.hardDrop();
  }

  _executeRandomMove() {
    const g = this.game;
    if (!g.currentPiece) return;
    const rot = Math.floor(Math.random() * g.currentPiece.shape.length);
    const col = Math.floor(Math.random() * COLS);
    this._executeMove(rot, col);
  }
}
