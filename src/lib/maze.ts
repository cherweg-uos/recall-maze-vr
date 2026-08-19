export type Dir = "N" | "E" | "S" | "W";

export interface Cell {
  col: number;
  row: number;
  /** true = wall present */
  walls: Record<Dir, boolean>;
}

export interface Maze {
  cols: number;
  rows: number;
  cells: Cell[][]; // [row][col]
  start: { col: number; row: number };
  goal: { col: number; row: number };
  /** solution path from start to goal, inclusive */
  path: { col: number; row: number }[];
  level: number;
}

export interface Step {
  dir: Dir;
  count: number;
}

export const DELTA: Record<Dir, { dc: number; dr: number }> = {
  N: { dc: 0, dr: -1 },
  S: { dc: 0, dr: 1 },
  E: { dc: 1, dr: 0 },
  W: { dc: -1, dr: 0 },
};

const OPPOSITE: Record<Dir, Dir> = { N: "S", S: "N", E: "W", W: "E" };
const DIRS: Dir[] = ["N", "E", "S", "W"];

function makeGrid(cols: number, rows: number): Cell[][] {
  return Array.from({ length: rows }, (_, row) =>
    Array.from({ length: cols }, (_, col) => ({
      col,
      row,
      walls: { N: true, E: true, S: true, W: true } as Record<Dir, boolean>,
    })),
  );
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

/** Recursive-backtracker carve: produces a perfect maze (exactly one path between any two cells). */
function carve(cells: Cell[][], cols: number, rows: number, startCol: number, startRow: number) {
  const visited = new Set<string>();
  const stack: Cell[] = [cells[startRow]![startCol]!];
  visited.add(`${startCol},${startRow}`);

  while (stack.length) {
    const cur = stack[stack.length - 1]!;
    const options = shuffle(DIRS).filter((d) => {
      const nc = cur.col + DELTA[d].dc;
      const nr = cur.row + DELTA[d].dr;
      return nc >= 0 && nc < cols && nr >= 0 && nr < rows && !visited.has(`${nc},${nr}`);
    });

    if (!options.length) {
      stack.pop();
      continue;
    }
    const d = options[0]!;
    const next = cells[cur.row + DELTA[d].dr]![cur.col + DELTA[d].dc]!;
    cur.walls[d] = false;
    next.walls[OPPOSITE[d]] = false;
    visited.add(`${next.col},${next.row}`);
    stack.push(next);
  }
}

/** BFS over carved passages; returns predecessor map + distances. */
function bfs(cells: Cell[][], cols: number, rows: number, from: { col: number; row: number }) {
  const dist = new Map<string, number>();
  const prev = new Map<string, string>();
  const queue: { col: number; row: number }[] = [from];
  dist.set(`${from.col},${from.row}`, 0);

  while (queue.length) {
    const cur = queue.shift()!;
    const cell = cells[cur.row]![cur.col]!;
    for (const d of DIRS) {
      if (cell.walls[d]) continue;
      const nc = cur.col + DELTA[d].dc;
      const nr = cur.row + DELTA[d].dr;
      if (nc < 0 || nc >= cols || nr < 0 || nr >= rows) continue;
      const key = `${nc},${nr}`;
      if (dist.has(key)) continue;
      dist.set(key, dist.get(`${cur.col},${cur.row}`)! + 1);
      prev.set(key, `${cur.col},${cur.row}`);
      queue.push({ col: nc, row: nr });
    }
  }
  return { dist, prev };
}

/** Grid size and required path length grow with the level (levels 3–20). */
export function levelConfig(level: number) {
  const size = Math.min(4 + Math.floor(level / 2), 14);
  const targetLength = 4 + Math.max(0, level - 3) * 2;
  return { cols: size, rows: size, targetLength };
}

export function generateMaze(level: number): Maze {
  const { cols, rows, targetLength } = levelConfig(level);
  const cells = makeGrid(cols, rows);
  const start = { col: 0, row: rows - 1 };
  carve(cells, cols, rows, start.col, start.row);

  const { dist, prev } = bfs(cells, cols, rows, start);

  // pick the reachable cell whose distance is closest to the target path length
  let goalKey = `${start.col},${start.row}`;
  let best = Infinity;
  for (const [key, d] of dist) {
    if (d === 0) continue;
    const score = Math.abs(d - targetLength);
    if (score < best) {
      best = score;
      goalKey = key;
    }
  }

  const path: { col: number; row: number }[] = [];
  let cursor: string | undefined = goalKey;
  while (cursor) {
    const [c, r] = cursor.split(",").map(Number);
    path.unshift({ col: c!, row: r! });
    cursor = prev.get(cursor);
  }

  const [gc, gr] = goalKey.split(",").map(Number);
  return { cols, rows, cells, start, goal: { col: gc!, row: gr! }, path, level };
}

export function dirBetween(
  a: { col: number; row: number },
  b: { col: number; row: number },
): Dir {
  if (b.row < a.row) return "N";
  if (b.row > a.row) return "S";
  if (b.col > a.col) return "E";
  return "W";
}

/** Compress the solution path into "3 x North" style steps. */
export function pathToSteps(path: { col: number; row: number }[]): Step[] {
  const steps: Step[] = [];
  for (let i = 1; i < path.length; i++) {
    const dir = dirBetween(path[i - 1]!, path[i]!);
    const last = steps[steps.length - 1];
    if (last && last.dir === dir) last.count += 1;
    else steps.push({ dir, count: 1 });
  }
  return steps;
}

export const DIR_LABEL: Record<Dir, string> = {
  N: "North",
  S: "South",
  E: "East",
  W: "West",
};
