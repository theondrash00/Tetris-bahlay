import { COLS, ROWS, BOARD_PALETTE_INDEX } from './constants.js';

export class Board {
  constructor(rows = ROWS, cols = COLS) {
    this.rows = rows;
    this.cols = cols;
    this.grid = this.createGrid();
  }

  createGrid() {
    return Array.from({ length: this.rows }, () => Array(this.cols).fill(null));
  }

  reset() {
    this.grid = this.createGrid();
  }

  isInBounds(row, col) {
    return col >= 0 && col < this.cols && row < this.rows;
  }

  isOccupied(row, col) {
    // Above the top is valid (pieces spawn there)
    if (row < 0) return false;
    // Out of bounds = occupied (walls/floor)
    if (!this.isInBounds(row, col)) return true;
    return this.grid[row][col] !== null;
  }

  canPlace(blocks) {
    return blocks.every(({ row, col }) => {
      // Allow blocks above the visible area
      if (row < 0 && col >= 0 && col < this.cols) return true;
      return this.isInBounds(row, col) && this.grid[row][col] === null;
    });
  }

  lock(blocks, color) {
    for (const { row, col } of blocks) {
      if (row >= 0 && row < this.rows && col >= 0 && col < this.cols) {
        this.grid[row][col] = color;
      }
    }
  }

  clearLines() {
    const clearedRows = [];
    for (let r = this.rows - 1; r >= 0; r--) {
      if (this.grid[r].every(cell => cell !== null)) {
        clearedRows.push(r);
      }
    }

    if (clearedRows.length === 0) return { count: 0, rows: [] };

    // Remove cleared rows and add empty ones at top
    for (const r of clearedRows) {
      this.grid.splice(r, 1);
    }
    for (let i = 0; i < clearedRows.length; i++) {
      this.grid.unshift(Array(this.cols).fill(null));
    }

    return { count: clearedRows.length, rows: clearedRows };
  }

  addGarbage(count) {
    const garbageColor = '#888888';
    for (let i = 0; i < count; i++) {
      // Random gap column
      const gap = Math.floor(Math.random() * this.cols);
      const row = Array(this.cols).fill(garbageColor);
      row[gap] = null;

      // Remove top row
      this.grid.shift();
      // Add garbage at bottom
      this.grid.push(row);
    }

    // Check if any blocks are now above the visible area
    // (top row occupied means potential top-out on next lock)
    return this.grid[0].some(cell => cell !== null);
  }

  isTopOut(blocks) {
    return blocks.some(({ row }) => row < 0);
  }

  getSnapshot() {
    return this.grid.map(row => [...row]);
  }

  getEncodedSnapshot() {
    let s = '';
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const cell = this.grid[r][c];
        s += cell ? (BOARD_PALETTE_INDEX[cell] ?? '8') : '0';
      }
    }
    return s;
  }
}
