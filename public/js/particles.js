import { COLS, CELL_SIZE, PARTICLE_GRAVITY, PARTICLE_STAGGER_MS, TETRIS_SHAKE_DURATION } from './constants.js';

const POOL_SIZE = 500;
const EFFECT_COLORS = ['#9ac434', '#f46c22', '#d8d8d8', '#ffffff'];

export class ParticleSystem {
  constructor() {
    // Object pool
    this.pool = [];
    this.active = [];
    for (let i = 0; i < POOL_SIZE; i++) {
      this.pool.push(this.createParticle());
    }
    this.shakeX = 0;
    this.shakeY = 0;
    this.shakeTimer = 0;
  }

  createParticle() {
    return { x: 0, y: 0, vx: 0, vy: 0, life: 0, decay: 0, color: '#fff', size: 2, type: 'square' };
  }

  acquire() {
    if (this.pool.length > 0) {
      return this.pool.pop();
    }
    return this.createParticle();
  }

  release(p) {
    p.life = 0;
    this.pool.push(p);
  }

  emit(x, y, count, options = {}) {
    const {
      vxRange = [-3, 3],
      vyRange = [-4, 1],
      sizeRange = [2, 5],
      decayRange = [0.015, 0.04],
      colors = EFFECT_COLORS,
      type = 'square'
    } = options;

    for (let i = 0; i < count; i++) {
      const p = this.acquire();
      p.x = x;
      p.y = y;
      p.vx = vxRange[0] + Math.random() * (vxRange[1] - vxRange[0]);
      p.vy = vyRange[0] + Math.random() * (vyRange[1] - vyRange[0]);
      p.life = 1;
      p.decay = decayRange[0] + Math.random() * (decayRange[1] - decayRange[0]);
      p.color = colors[Math.floor(Math.random() * colors.length)];
      p.size = sizeRange[0] + Math.random() * (sizeRange[1] - sizeRange[0]);
      p.type = type;
      this.active.push(p);
    }
  }

  lineClearEffect(rows) {
    const count = rows.length >= 4 ? 40 : 25;
    for (const row of rows) {
      const y = row * CELL_SIZE + CELL_SIZE / 2;
      for (let c = 0; c < COLS; c++) {
        const x = c * CELL_SIZE + CELL_SIZE / 2;
        this.emit(x, y, count / COLS, {
          vxRange: [-4, 4],
          vyRange: [-5, 2],
          sizeRange: rows.length >= 4 ? [3, 7] : [2, 5],
          decayRange: [0.01, 0.03],
          colors: EFFECT_COLORS
        });
      }
    }

    // Tetris (4 lines) — screen shake
    if (rows.length >= 4) {
      this.shakeTimer = TETRIS_SHAKE_DURATION;
    }
  }

  lockEffect(blocks) {
    for (const { row, col } of blocks) {
      if (row >= 0) {
        const x = col * CELL_SIZE + CELL_SIZE / 2;
        const y = row * CELL_SIZE + CELL_SIZE / 2;
        this.emit(x, y, 2, {
          vxRange: [-1.5, 1.5],
          vyRange: [-2, 0],
          sizeRange: [1, 3],
          decayRange: [0.04, 0.06],
          colors: ['#ffffff', '#d8d8d8']
        });
      }
    }
  }

  gameOverEffect(board) {
    for (let r = 0; r < board.rows; r++) {
      for (let c = 0; c < board.cols; c++) {
        if (board.grid[r][c]) {
          const x = c * CELL_SIZE + CELL_SIZE / 2;
          const y = r * CELL_SIZE + CELL_SIZE / 2;
          // Staggered timing via delayed life
          setTimeout(() => {
            this.emit(x, y, 3, {
              vxRange: [-1, 1],
              vyRange: [1, 4],
              sizeRange: [2, 4],
              decayRange: [0.008, 0.015],
              colors: [board.grid[r][c], '#666666']
            });
          }, r * PARTICLE_STAGGER_MS);
        }
      }
    }
  }

  garbageEffect() {
    // Flash from bottom
    for (let c = 0; c < COLS; c++) {
      const x = c * CELL_SIZE + CELL_SIZE / 2;
      const y = CELL_SIZE * 19;
      this.emit(x, y, 3, {
        vxRange: [-1, 1],
        vyRange: [-3, -1],
        sizeRange: [2, 4],
        decayRange: [0.03, 0.05],
        colors: ['#ff4444', '#ff8888']
      });
    }
  }

  update(dt) {
    // Update shake
    if (this.shakeTimer > 0) {
      this.shakeTimer -= dt;
      const intensity = Math.min(3, this.shakeTimer / 100);
      this.shakeX = (Math.random() - 0.5) * intensity * 2;
      this.shakeY = (Math.random() - 0.5) * intensity * 2;
      if (this.shakeTimer <= 0) {
        this.shakeX = 0;
        this.shakeY = 0;
      }
    }

    // Update particles
    for (let i = this.active.length - 1; i >= 0; i--) {
      const p = this.active[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += PARTICLE_GRAVITY;
      p.life -= p.decay;

      if (p.life <= 0) {
        this.active.splice(i, 1);
        this.release(p);
      }
    }
  }

  draw(ctx) {
    ctx.save();

    // Apply screen shake
    if (this.shakeTimer > 0) {
      ctx.translate(this.shakeX, this.shakeY);
    }

    for (const p of this.active) {
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;

      if (p.type === 'circle') {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      }
    }

    ctx.restore();
  }

  getShakeOffset() {
    return { x: this.shakeX, y: this.shakeY };
  }

  hasActiveParticles() {
    return this.active.length > 0 || this.shakeTimer > 0;
  }
}
