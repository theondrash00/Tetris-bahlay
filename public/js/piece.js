import { TETROMINOES, WALL_KICKS, WALL_KICKS_I, PIECE_TYPES } from './constants.js';

export class Piece {
  constructor(type) {
    this.type = type;
    this.shape = TETROMINOES[type].shape;
    this.color = TETROMINOES[type].color;
    this.rotation = 0;

    // Spawn position: centered at top
    const matrix = this.shape[0];
    this.col = Math.floor((10 - matrix[0].length) / 2);
    this.row = type === 'I' ? -1 : 0;
  }

  getMatrix() {
    return this.shape[this.rotation];
  }

  getBlocks() {
    const matrix = this.getMatrix();
    const blocks = [];
    for (let r = 0; r < matrix.length; r++) {
      for (let c = 0; c < matrix[r].length; c++) {
        if (matrix[r][c]) {
          blocks.push({ row: this.row + r, col: this.col + c });
        }
      }
    }
    return blocks;
  }

  clone() {
    const p = new Piece(this.type);
    p.row = this.row;
    p.col = this.col;
    p.rotation = this.rotation;
    return p;
  }

  move(dr, dc, board) {
    this.row += dr;
    this.col += dc;
    if (board.canPlace(this.getBlocks())) {
      return true;
    }
    // Revert
    this.row -= dr;
    this.col -= dc;
    return false;
  }

  rotate(direction, board) {
    const oldRotation = this.rotation;
    const newRotation = (this.rotation + (direction === 'cw' ? 1 : 3)) % 4;
    const kickKey = `${oldRotation}>${newRotation}`;
    const kicks = this.type === 'I' ? WALL_KICKS_I[kickKey] : WALL_KICKS[kickKey];

    this.rotation = newRotation;

    for (const [dc, dr] of kicks) {
      const origRow = this.row;
      const origCol = this.col;
      this.row += dr;
      this.col += dc;

      if (board.canPlace(this.getBlocks())) {
        return true;
      }

      this.row = origRow;
      this.col = origCol;
    }

    // All kicks failed — revert rotation
    this.rotation = oldRotation;
    return false;
  }
}

// 7-bag randomizer
export function createBagRandomizer() {
  let bag = [];

  function refill() {
    bag = [...PIECE_TYPES];
    // Fisher-Yates shuffle
    for (let i = bag.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [bag[i], bag[j]] = [bag[j], bag[i]];
    }
  }

  return {
    next() {
      if (bag.length === 0) refill();
      return bag.pop();
    },
    peek() {
      if (bag.length === 0) refill();
      return bag[bag.length - 1];
    }
  };
}
