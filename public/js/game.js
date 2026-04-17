import { Board } from './board.js';
import { Piece, createBagRandomizer } from './piece.js';
import { Renderer } from './renderer.js';
import { ParticleSystem } from './particles.js';
import {
  COLS, ROWS, CELL_SIZE, TICK_SPEEDS, SCORING, GARBAGE_TABLE,
  LINES_PER_LEVEL, KEYS, DAS_DELAY, DAS_RATE
} from './constants.js';
import * as Sound from './sound.js';

export class Game {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.renderer = new Renderer(canvas);
    this.particles = new ParticleSystem();
    this.renderer.setParticleSystem(this.particles);

    this.startLevel = options.level || 1;
    this.onScoreChange = options.onScoreChange || (() => {});
    this.onLinesChange = options.onLinesChange || (() => {});
    this.onLevelChange = options.onLevelChange || (() => {});
    this.onLineClear = options.onLineClear || (() => {});
    this.onGameOver = options.onGameOver || (() => {});
    this.onBoardUpdate = options.onBoardUpdate || (() => {});
    this.onNextPiece = options.onNextPiece || (() => {});
    this.onGarbage = options.onGarbage || (() => {});

    this.board = null;
    this.bag = null;
    this.currentPiece = null;
    this.nextPieceType = null;
    this.ghostPiece = null;
    this.score = 0;
    this.lines = 0;
    this.level = this.startLevel;
    this.state = 'idle'; // idle, playing, lineClear, gameOver

    // Timing
    this.lastTick = 0;
    this.lastFrame = 0;
    this.animFrameId = null;

    // Line clear animation
    this.flashRows = null;
    this.flashStart = 0;
    this.flashDuration = 400; // ms

    // DAS state
    this.dasDirection = null;
    this.dasTimer = null;
    this.dasInterval = null;

    // Soft drop
    this.softDropping = false;

    // Input binding
    this.boundKeyDown = this.handleKeyDown.bind(this);
    this.boundKeyUp = this.handleKeyUp.bind(this);
  }

  start() {
    this.board = new Board();
    this.bag = createBagRandomizer();
    this.score = 0;
    this.lines = 0;
    this.level = this.startLevel;
    this.state = 'playing';
    this.flashRows = null;

    this.onScoreChange(this.score);
    this.onLinesChange(this.lines);
    this.onLevelChange(this.level);

    this.spawnPiece();

    document.addEventListener('keydown', this.boundKeyDown);
    document.addEventListener('keyup', this.boundKeyUp);

    this.lastTick = performance.now();
    this.lastFrame = performance.now();
    this.loop(performance.now());
  }

  stop() {
    this.state = 'idle';
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    this.clearDAS();
    document.removeEventListener('keydown', this.boundKeyDown);
    document.removeEventListener('keyup', this.boundKeyUp);
  }

  spawnPiece() {
    if (!this.nextPieceType) {
      this.nextPieceType = this.bag.next();
    }
    this.currentPiece = new Piece(this.nextPieceType);
    this.nextPieceType = this.bag.next();
    this.onNextPiece(this.nextPieceType);
    this.computeGhost();

    // Check if piece can be placed
    if (!this.board.canPlace(this.currentPiece.getBlocks())) {
      this.gameOver();
    }
  }

  computeGhost() {
    if (!this.currentPiece) {
      this.ghostPiece = null;
      return;
    }
    this.ghostPiece = this.currentPiece.clone();
    while (this.ghostPiece.move(1, 0, this.board)) {
      // Keep moving down
    }
  }

  getTickSpeed() {
    const idx = Math.min(this.level - 1, TICK_SPEEDS.length - 1);
    return TICK_SPEEDS[Math.max(0, idx)];
  }

  loop(timestamp) {
    if (this.state === 'idle' || this.state === 'gameOver') return;

    const dt = timestamp - this.lastFrame;
    this.lastFrame = timestamp;

    // Update particles
    this.particles.update(dt);

    if (this.state === 'lineClear') {
      const elapsed = timestamp - this.flashStart;
      const progress = Math.min(1, elapsed / this.flashDuration);

      this.renderer.render(this.board, null, null, this.flashRows, progress);

      if (progress >= 1) {
        this.finishLineClear();
      }

      this.animFrameId = requestAnimationFrame((t) => this.loop(t));
      return;
    }

    if (this.state === 'playing') {
      // Gravity tick
      const tickDelta = timestamp - this.lastTick;
      if (tickDelta >= this.getTickSpeed()) {
        this.lastTick = timestamp;
        if (!this.currentPiece.move(1, 0, this.board)) {
          this.lockPiece();
        } else {
          this.computeGhost();
        }
      }

      this.renderer.render(this.board, this.currentPiece, this.ghostPiece);
    }

    this.animFrameId = requestAnimationFrame((t) => this.loop(t));
  }

  lockPiece() {
    const blocks = this.currentPiece.getBlocks();

    // Check top-out
    if (this.board.isTopOut(blocks)) {
      this.board.lock(blocks, this.currentPiece.color);
      this.gameOver();
      return;
    }

    this.board.lock(blocks, this.currentPiece.color);
    Sound.playLock();
    this.particles.lockEffect(blocks);

    // Send board update for multiplayer
    this.onBoardUpdate(this.board.getSnapshot(), this.score, this.lines, this.level);

    // Check for line clears
    const { count, rows } = this.board.clearLines();
    if (count > 0) {
      this.startLineClear(count, rows);
    } else {
      this.spawnPiece();
    }
  }

  startLineClear(count, rows) {
    this.state = 'lineClear';
    this.flashRows = rows;
    this.flashStart = performance.now();

    Sound.playLineClear(count);
    this.particles.lineClearEffect(rows);

    // Update score
    this.score += SCORING[count] * this.level;
    this.onScoreChange(this.score);

    // Update lines and check level
    const oldLevel = this.level;
    this.lines += count;
    this.level = this.startLevel + Math.floor(this.lines / LINES_PER_LEVEL);
    this.onLinesChange(this.lines);
    if (this.level !== oldLevel) {
      this.onLevelChange(this.level);
      Sound.playLevelUp();
    }

    // Multiplayer: send garbage
    const garbage = GARBAGE_TABLE[count] || 0;
    if (garbage > 0) {
      this.onGarbage(garbage);
    }

    this.onLineClear(count, rows);
  }

  finishLineClear() {
    this.flashRows = null;
    this.state = 'playing';

    // Send updated board
    this.onBoardUpdate(this.board.getSnapshot(), this.score, this.lines, this.level);

    this.spawnPiece();
  }

  gameOver() {
    this.state = 'gameOver';
    Sound.playGameOver();
    this.particles.gameOverEffect(this.board);

    // Keep rendering for particle animation
    const animateGameOver = (timestamp) => {
      this.particles.update(16);
      this.renderer.render(this.board, null, null);
      if (this.particles.hasActiveParticles()) {
        requestAnimationFrame(animateGameOver);
      }
    };
    requestAnimationFrame(animateGameOver);

    this.clearDAS();
    document.removeEventListener('keydown', this.boundKeyDown);
    document.removeEventListener('keyup', this.boundKeyUp);

    this.onGameOver({
      score: this.score,
      lines: this.lines,
      level: this.level
    });
  }

  receiveGarbage(count) {
    if (this.state !== 'playing') return;
    Sound.playGarbageReceived();
    this.particles.garbageEffect();
    const topOut = this.board.addGarbage(count);
    this.computeGhost();
    if (topOut) {
      this.gameOver();
    }
  }

  // --- Input handling ---

  handleKeyDown(e) {
    if (this.state !== 'playing') return;

    // Prevent scrolling
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
      e.preventDefault();
    }

    switch (e.code) {
      case KEYS.LEFT:
        if (!e.repeat) {
          this.moveHorizontal(-1);
          this.startDAS('left');
        }
        break;
      case KEYS.RIGHT:
        if (!e.repeat) {
          this.moveHorizontal(1);
          this.startDAS('right');
        }
        break;
      case KEYS.DOWN:
        if (!e.repeat) {
          this.softDropping = true;
          this.softDrop();
        }
        break;
      case KEYS.ROTATE_CW:
        if (!e.repeat) {
          if (this.currentPiece.rotate('cw', this.board)) {
            Sound.playRotate();
            this.computeGhost();
          }
        }
        break;
      case KEYS.ROTATE_CCW:
        if (!e.repeat) {
          if (this.currentPiece.rotate('ccw', this.board)) {
            Sound.playRotate();
            this.computeGhost();
          }
        }
        break;
      case KEYS.HARD_DROP:
        if (!e.repeat) {
          this.hardDrop();
        }
        break;
    }
  }

  handleKeyUp(e) {
    switch (e.code) {
      case KEYS.LEFT:
        if (this.dasDirection === 'left') this.clearDAS();
        break;
      case KEYS.RIGHT:
        if (this.dasDirection === 'right') this.clearDAS();
        break;
      case KEYS.DOWN:
        this.softDropping = false;
        break;
    }
  }

  moveHorizontal(dc) {
    if (this.currentPiece.move(0, dc, this.board)) {
      Sound.playMove();
      this.computeGhost();
    }
  }

  startDAS(direction) {
    this.clearDAS();
    this.dasDirection = direction;
    const dc = direction === 'left' ? -1 : 1;
    this.dasTimer = setTimeout(() => {
      this.dasInterval = setInterval(() => {
        this.moveHorizontal(dc);
      }, DAS_RATE);
    }, DAS_DELAY);
  }

  clearDAS() {
    this.dasDirection = null;
    if (this.dasTimer) {
      clearTimeout(this.dasTimer);
      this.dasTimer = null;
    }
    if (this.dasInterval) {
      clearInterval(this.dasInterval);
      this.dasInterval = null;
    }
  }

  softDrop() {
    if (this.state !== 'playing' || !this.softDropping) return;
    if (this.currentPiece.move(1, 0, this.board)) {
      this.score += 1;
      this.onScoreChange(this.score);
      this.computeGhost();
      this.lastTick = performance.now(); // reset gravity timer
    }
    // Schedule next soft drop
    if (this.softDropping) {
      setTimeout(() => this.softDrop(), 50);
    }
  }

  hardDrop() {
    let rowsDropped = 0;
    while (this.currentPiece.move(1, 0, this.board)) {
      rowsDropped++;
    }
    this.score += rowsDropped * 2;
    this.onScoreChange(this.score);
    Sound.playHardDrop();
    this.lockPiece();
  }
}
