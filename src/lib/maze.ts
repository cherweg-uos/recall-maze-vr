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
  const size = Math.min(4 + Math.floor(level * 0.6), 15);
  const targetLength = 4 + Math.max(0, level - 3) * 2;
  return { cols: size, rows: size, targetLength };
}

function key(col: number, row: number) {
  return `${col},${row}`;
}

function openSides(cell: Cell) {
  return DIRS.reduce((n, d) => n + (cell.walls[d] ? 0 : 1), 0);
}

/** Seal every wall that is not part of the solution corridor. */
function sealAllButPath(cells: Cell[][], path: { col: number; row: number }[]) {
  for (const rowCells of cells)
    for (const c of rowCells) c.walls = { N: true, E: true, S: true, W: true };
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1]!;
    const b = path[i]!;
    const d = dirBetween(a, b);
    cells[a.row]![a.col]!.walls[d] = false;
    cells[b.row]![b.col]!.walls[OPPOSITE[d]] = false;
  }
}

interface Branch {
  cells: { col: number; row: number }[];
  end: { col: number; row: number };
}

/**
 * Grow decoy corridors off the solution route. Every branch is a simple
 * corridor with a single mouth: cells are only ever carved into unused
 * off-route cells, so no branch can loop back or shortcut the solution, and no
 * cell ever ends up with more than two open sides (a corridor or a corner).
 */
function growBranches(
  cells: Cell[][],
  cols: number,
  rows: number,
  path: { col: number; row: number }[],
  level: number,
): Branch[] {
  const used = new Set(path.map((p) => key(p.col, p.row)));
  const branches: Branch[] = [];

  const t = Math.min(1, Math.max(0, (level - 3) / 17));
  const spacing = 4 - 2 * t; // 1 mouth per 4 path cells at L3 → per 2 at L20
  const wanted = Math.max(2, Math.round((path.length - 1) / spacing));
  const maxLen = 2 + Math.round(t * 4);

  const free = (col: number, row: number) =>
    col >= 0 && col < cols && row >= 0 && row < rows && !used.has(key(col, row));

  const openBetween = (a: { col: number; row: number }, d: Dir) => {
    const nc = a.col + DELTA[d].dc;
    const nr = a.row + DELTA[d].dr;
    cells[a.row]![a.col]!.walls[d] = false;
    cells[nr]![nc]!.walls[OPPOSITE[d]] = false;
  };

  // one decoy mouth per path cell at most, skipping the goal
  const mouths = shuffle(path.slice(0, -1)).slice(0, wanted);

  for (const p of mouths) {
    const cell = cells[p.row]![p.col]!;
    if (openSides(cell) >= 3) continue;
    const options = shuffle(DIRS).filter((d) => {
      if (!cell.walls[d]) return false;
      return free(p.col + DELTA[d].dc, p.row + DELTA[d].dr);
    });
    const first = options[0];
    if (!first) continue;

    openBetween(p, first);
    let cur = { col: p.col + DELTA[first].dc, row: p.row + DELTA[first].dr };
    used.add(key(cur.col, cur.row));
    const branch: Branch = { cells: [cur], end: cur };

    let dir: Dir = first;
    const len = 1 + Math.floor(Math.random() * maxLen);
    for (let i = 0; i < len; i++) {
      // prefer running straight, occasionally take a 90° corner
      const turns: Dir[] = DIRS.filter((d) => d !== dir && d !== OPPOSITE[dir]);
      const order = Math.random() < 0.65 ? [dir, ...shuffle(turns)] : [...shuffle(turns), dir];
      const next = order.find((d) => free(cur.col + DELTA[d].dc, cur.row + DELTA[d].dr));
      if (!next) break;
      openBetween(cur, next);
      dir = next;
      cur = { col: cur.col + DELTA[next].dc, row: cur.row + DELTA[next].dr };
      used.add(key(cur.col, cur.row));
      branch.cells.push(cur);
    }
    branch.end = branch.cells[branch.cells.length - 1]!;
    branches.push(branch);
  }

  return branches;
}

/** Quality of a layout: how many convincing false turns it offers. */
function layoutScore(branches: Branch[]) {
  const total = branches.reduce((n, b) => n + b.cells.length, 0);
  return branches.length * 2 + total;
}

function generateOnce(level: number): Maze {
  const { cols, rows, targetLength } = levelConfig(level);
  const cells = makeGrid(cols, rows);
  const start = { col: 0, row: rows - 1 };
  carve(cells, cols, rows, start.col, start.row);

  const { dist, prev } = bfs(cells, cols, rows, start);

  // pick the reachable cell whose distance is closest to the target path length
  let goalKey = key(start.col, start.row);
  let best = Infinity;
  for (const [k, d] of dist) {
    if (d === 0) continue;
    const score = Math.abs(d - targetLength);
    if (score < best) {
      best = score;
      goalKey = k;
    }
  }

  const path: { col: number; row: number }[] = [];
  let cursor: string | undefined = goalKey;
  while (cursor) {
    const [c, r] = cursor.split(",").map(Number);
    path.unshift({ col: c!, row: r! });
    cursor = prev.get(cursor);
  }

  sealAllButPath(cells, path);
  const branches = growBranches(cells, cols, rows, path, level);

  const [gc, gr] = goalKey.split(",").map(Number);
  const goal = { col: gc!, row: gr! };
  const decoySpots = branches
    .filter((b) => b.cells.length >= 2)
    .map((b) => b.end)
    .filter((e) => Math.abs(e.col - goal.col) + Math.abs(e.row - goal.row) > 1);

  return {
    cols,
    rows,
    cells,
    start,
    goal,
    path,
    level,
    decoySpots,
    score: layoutScore(branches),
  };
}


/** Generate several layouts and keep the one offering the most false turns. */
export function generateMaze(level: number): Maze {
  let best: Maze | null = null;
  for (let i = 0; i < 5; i++) {
    const candidate = generateOnce(level);
    if (!best || candidate.score > best.score) best = candidate;
  }
  return best!;
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
