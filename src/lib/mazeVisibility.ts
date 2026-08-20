import type { Maze } from "./maze";

/** How many maze cells fit in one render chunk along each axis. */
export const CHUNK_CELLS = 8;

/** Cells further away than this are never considered visible. */
export const VIEW_CELLS = 12;

export function chunkKey(col: number, row: number): string {
  return `${Math.floor(col / CHUNK_CELLS)},${Math.floor(row / CHUNK_CELLS)}`;
}

/**
 * Grid DDA line-of-sight between two points expressed in cell units
 * (x = column axis, y = row axis). Hedges/walls are fully solid.
 */
function losClear(maze: Maze, x0: number, y0: number, x1: number, y1: number): boolean {
  let cx = Math.floor(x0);
  let cy = Math.floor(y0);
  const ex = Math.floor(x1);
  const ey = Math.floor(y1);
  const dx = x1 - x0;
  const dy = y1 - y0;
  const stepX = dx > 0 ? 1 : -1;
  const stepY = dy > 0 ? 1 : -1;
  let tMaxX = dx !== 0 ? (dx > 0 ? cx + 1 - x0 : x0 - cx) / Math.abs(dx) : Infinity;
  let tMaxY = dy !== 0 ? (dy > 0 ? cy + 1 - y0 : y0 - cy) / Math.abs(dy) : Infinity;
  const tDeltaX = dx !== 0 ? 1 / Math.abs(dx) : Infinity;
  const tDeltaY = dy !== 0 ? 1 / Math.abs(dy) : Infinity;

  let guard = 0;
  while ((cx !== ex || cy !== ey) && guard++ < 512) {
    const cell = maze.cells[cy]?.[cx];
    if (!cell) return false;
    if (tMaxX < tMaxY) {
      if (cell.walls[stepX > 0 ? "E" : "W"]) return false;
      cx += stepX;
      tMaxX += tDeltaX;
    } else {
      if (cell.walls[stepY > 0 ? "S" : "N"]) return false;
      cy += stepY;
      tMaxY += tDeltaY;
    }
  }
  return true;
}

/** Sample offsets inside a target cell — conservative "any part visible" test. */
const SAMPLES: Array<[number, number]> = [
  [0.5, 0.5],
  [0.15, 0.15],
  [0.85, 0.15],
  [0.15, 0.85],
  [0.85, 0.85],
];

/** Chunk keys that can be seen from the given cell; everything else is occluded. */
export function visibleChunks(maze: Maze, col: number, row: number): Set<string> {
  const out = new Set<string>();
  const add = (c: number, r: number) => {
    out.add(chunkKey(c, r));
    // a wall bordering this cell may be owned by any of the four neighbours,
    // including the hidden cell it occludes — keep all their chunks
    out.add(chunkKey(Math.max(0, c - 1), r));
    out.add(chunkKey(c, Math.max(0, r - 1)));
    out.add(chunkKey(Math.min(maze.cols - 1, c + 1), r));
    out.add(chunkKey(c, Math.min(maze.rows - 1, r + 1)));
  };

  add(col, row);
  const x0 = col + 0.5;
  const y0 = row + 0.5;

  const minC = Math.max(0, col - VIEW_CELLS);
  const maxC = Math.min(maze.cols - 1, col + VIEW_CELLS);
  const minR = Math.max(0, row - VIEW_CELLS);
  const maxR = Math.min(maze.rows - 1, row + VIEW_CELLS);

  for (let r = minR; r <= maxR; r++) {
    for (let c = minC; c <= maxC; c++) {
      if (out.has(chunkKey(c, r)) && Math.abs(c - col) + Math.abs(r - row) > 1) {
        // chunk already kept — no need to prove this cell too
        continue;
      }
      for (const [ox, oy] of SAMPLES) {
        if (losClear(maze, x0, y0, c + ox, r + oy)) {
          add(c, r);
          break;
        }
      }
    }
  }
  return out;
}
