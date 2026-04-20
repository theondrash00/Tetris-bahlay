import { COLS, ROWS, CELL_SIZE, TETROMINOES, BOARD_PALETTE } from './constants.js';

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;
    this.cellSize = CELL_SIZE;
    this.particles = null; // set externally
  }

  setParticleSystem(particles) {
    this.particles = particles;
  }

  clear() {
    this.ctx.fillStyle = '#0a0a0a';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  drawGrid() {
    this.ctx.strokeStyle = '#1a1a1a';
    this.ctx.lineWidth = 0.5;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        this.ctx.strokeRect(
          c * this.cellSize,
          r * this.cellSize,
          this.cellSize,
          this.cellSize
        );
      }
    }
  }

  drawCell(x, y, size, color, alpha = 1) {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = alpha;

    const s = size;
    const bevel = Math.max(2, size * 0.1);

    // Base fill
    ctx.fillStyle = color;
    ctx.fillRect(x, y, s, s);

    // Lighter top-left bevel
    ctx.fillStyle = this.lightenColor(color, 0.4);
    ctx.fillRect(x, y, s, bevel); // top
    ctx.fillRect(x, y, bevel, s); // left

    // Darker bottom-right bevel
    ctx.fillStyle = this.darkenColor(color, 0.35);
    ctx.fillRect(x, y + s - bevel, s, bevel); // bottom
    ctx.fillRect(x + s - bevel, y, bevel, s); // right

    // Inner highlight
    ctx.fillStyle = this.lightenColor(color, 0.15);
    ctx.fillRect(x + bevel, y + bevel, s - bevel * 2, s - bevel * 2);

    // Black outline
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, s - 1, s - 1);

    ctx.restore();
  }

  drawBoard(board) {
    for (let r = 0; r < board.rows; r++) {
      for (let c = 0; c < board.cols; c++) {
        const cell = board.grid[r][c];
        if (cell) {
          this.drawCell(
            c * this.cellSize,
            r * this.cellSize,
            this.cellSize,
            cell
          );
        }
      }
    }
  }

  drawPiece(piece, alpha = 1) {
    const blocks = piece.getBlocks();
    for (const { row, col } of blocks) {
      if (row >= 0) {
        this.drawCell(
          col * this.cellSize,
          row * this.cellSize,
          this.cellSize,
          piece.color,
          alpha
        );
      }
    }
  }

  drawGhost(piece) {
    const blocks = piece.getBlocks();
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = 0.25;
    ctx.strokeStyle = piece.color;
    ctx.lineWidth = 2;
    for (const { row, col } of blocks) {
      if (row >= 0) {
        ctx.strokeRect(
          col * this.cellSize + 2,
          row * this.cellSize + 2,
          this.cellSize - 4,
          this.cellSize - 4
        );
      }
    }
    ctx.restore();
  }

  drawFlashingRows(rows, progress) {
    const ctx = this.ctx;
    ctx.save();
    const alpha = Math.abs(Math.sin(progress * Math.PI * 3));
    ctx.globalAlpha = alpha * 0.8;
    ctx.fillStyle = '#ffffff';
    for (const r of rows) {
      ctx.fillRect(0, r * this.cellSize, COLS * this.cellSize, this.cellSize);
    }
    ctx.restore();
  }

  render(board, currentPiece, ghostPiece, flashRows = null, flashProgress = 0) {
    this.clear();
    this.drawGrid();
    this.drawBoard(board);

    if (flashRows && flashRows.length > 0) {
      this.drawFlashingRows(flashRows, flashProgress);
    }

    if (ghostPiece) {
      this.drawGhost(ghostPiece);
    }

    if (currentPiece) {
      this.drawPiece(currentPiece);
    }

    if (this.particles) {
      this.particles.draw(this.ctx);
    }
  }

  renderNextPiece(canvas, pieceType) {
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (!pieceType) return;

    const shape = TETROMINOES[pieceType].shape[0];
    const color = TETROMINOES[pieceType].color;
    const cellSize = 24;
    const rows = shape.length;
    const cols = shape[0].length;

    // Center the piece in the canvas
    const offsetX = (canvas.width - cols * cellSize) / 2;
    const offsetY = (canvas.height - rows * cellSize) / 2;

    // Reuse the beveled drawing style
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (shape[r][c]) {
          const x = offsetX + c * cellSize;
          const y = offsetY + r * cellSize;
          this.drawCellOnCtx(ctx, x, y, cellSize, color);
        }
      }
    }
  }

  renderOpponentBoard(canvas, boardSnapshot) {
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (!boardSnapshot) return;

    const cellW = canvas.width / COLS;
    const cellH = canvas.height / ROWS;

    const encoded = typeof boardSnapshot === 'string';
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        let color;
        if (encoded) {
          const idx = boardSnapshot.charCodeAt(r * COLS + c) - 48;
          color = idx > 0 ? BOARD_PALETTE[idx] : null;
        } else {
          color = boardSnapshot[r]?.[c];
        }
        if (color) {
          ctx.fillStyle = color;
          ctx.fillRect(c * cellW, r * cellH, cellW - 0.5, cellH - 0.5);
        }
      }
    }

    // Subtle grid
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 0.3;
    for (let r = 0; r < ROWS; r++) {
      ctx.beginPath();
      ctx.moveTo(0, r * cellH);
      ctx.lineTo(canvas.width, r * cellH);
      ctx.stroke();
    }
    for (let c = 0; c < COLS; c++) {
      ctx.beginPath();
      ctx.moveTo(c * cellW, 0);
      ctx.lineTo(c * cellW, canvas.height);
      ctx.stroke();
    }
  }

  drawCellOnCtx(ctx, x, y, size, color, alpha = 1) {
    ctx.save();
    ctx.globalAlpha = alpha;
    const bevel = Math.max(2, size * 0.1);

    ctx.fillStyle = color;
    ctx.fillRect(x, y, size, size);

    ctx.fillStyle = this.lightenColor(color, 0.4);
    ctx.fillRect(x, y, size, bevel);
    ctx.fillRect(x, y, bevel, size);

    ctx.fillStyle = this.darkenColor(color, 0.35);
    ctx.fillRect(x, y + size - bevel, size, bevel);
    ctx.fillRect(x + size - bevel, y, bevel, size);

    ctx.fillStyle = this.lightenColor(color, 0.15);
    ctx.fillRect(x + bevel, y + bevel, size - bevel * 2, size - bevel * 2);

    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, size - 1, size - 1);

    ctx.restore();
  }

  lightenColor(hex, amount) {
    const rgb = this.hexToRgb(hex);
    return `rgb(${Math.min(255, rgb.r + (255 - rgb.r) * amount)}, ${Math.min(255, rgb.g + (255 - rgb.g) * amount)}, ${Math.min(255, rgb.b + (255 - rgb.b) * amount)})`;
  }

  darkenColor(hex, amount) {
    const rgb = this.hexToRgb(hex);
    return `rgb(${Math.max(0, rgb.r * (1 - amount))}, ${Math.max(0, rgb.g * (1 - amount))}, ${Math.max(0, rgb.b * (1 - amount))})`;
  }

  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) {
      // Try rgb() format
      const rgbMatch = hex.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
      if (rgbMatch) {
        return { r: parseInt(rgbMatch[1]), g: parseInt(rgbMatch[2]), b: parseInt(rgbMatch[3]) };
      }
      return { r: 128, g: 128, b: 128 };
    }
    return {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    };
  }
}
