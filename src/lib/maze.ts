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
  /** purely decorative decoy goals sitting in false branches */
  decoyGoals: { col: number; row: number }[];
  level: number;
}

export interface Step {
  dir: Dir;
  count: number;
}

/** Layout knobs exposed in the settings menu. */
export interface MazeShape {
  /** how many false branches sprout off the solution route (0–1) */
  decoyDensity: number;
  /** how many cells a false branch runs before dead-ending */
  branchDepth: number;
  /** how often off-route corridors reconnect to each other (0–1) */
  loopiness: number;
  /** bias towards turning instead of running straight (0–1) */
  twistiness: number;
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

/** Grid size and required path length grow with the level (levels 3–20). */
export function levelConfig(level: number) {
  const size = Math.min(5 + Math.floor(level * 0.65), 16);
  const targetLength = 4 + Math.max(0, level - 3) * 2;
  return { cols: size, rows: size, targetLength };
}

interface Pt {
  col: number;
  row: number;
}

const key = (p: Pt) => `${p.col},${p.row}`;

function carveBetween(cells: Cell[][], p: Pt, dir: Dir) {
  const nc = p.col + DELTA[dir].dc;
  const nr = p.row + DELTA[dir].dr;
  cells[p.row]![p.col]!.walls[dir] = false;
  cells[nr]![nc]!.walls[OPPOSITE[dir]] = false;
}

/** Order directions with a bias against continuing in the same direction. */
function biasedDirs(from: Dir | null, twistiness: number): Dir[] {
  const shuffled = shuffle(DIRS);
  if (!from) return shuffled;
  const straightPenalty = twistiness;
  return shuffled
    .map((d) => ({ d, w: Math.random() + (d === from ? -straightPenalty : 0) }))
    .sort((a, b) => b.w - a.w)
    .map((x) => x.d);
}

/**
 * Depth-first random walk that carves a corridor of exactly `target` steps.
 * Cells adjacent to already-used cells are avoided so corridors stay closed
 * instead of merging into one open room.
 */
function walkPath(
  cols: number,
  rows: number,
  start: Pt,
  target: number,
  twistiness: number,
): Pt[] | null {
  const used = new Set<string>([key(start)]);
  const path: Pt[] = [start];
  const dirs: Dir[] = [];

  const neighbourCount = (p: Pt) => {
    let n = 0;
    for (const d of DIRS) {
      const q = { col: p.col + DELTA[d].dc, row: p.row + DELTA[d].dr };
      if (used.has(key(q))) n++;
    }
    return n;
  };

  const attempt = (depth: number): boolean => {
    if (depth === target) return true;
    const cur = path[path.length - 1]!;
    const from = dirs[dirs.length - 1] ?? null;
    for (const d of biasedDirs(from, twistiness)) {
      const q = { col: cur.col + DELTA[d].dc, row: cur.row + DELTA[d].dr };
      if (q.col < 0 || q.col >= cols || q.row < 0 || q.row >= rows) continue;
      if (used.has(key(q))) continue;
      // only the cell we came from may already be a corridor
      if (neighbourCount(q) > 1) continue;
      used.add(key(q));
      path.push(q);
      dirs.push(d);
      if (attempt(depth + 1)) return true;
      used.delete(key(q));
      path.pop();
      dirs.pop();
    }
    return false;
  };

  return attempt(0) ? path : null;
}

interface BranchCell {
  pt: Pt;
  depth: number;
}

/**
 * Grow closed false branches off already-carved corridors. Branch cells never
 * touch the solution path (except at their junction) so the route stays unique.
 */
function growBranch(
  cells: Cell[][],
  cols: number,
  rows: number,
  used: Set<string>,
  origin: Pt,
  maxDepth: number,
  twistiness: number,
  out: BranchCell[],
  startDepth = 1,
): void {
  let cur = origin;
  let from: Dir | null = null;
  for (let depth = startDepth; depth <= maxDepth; depth++) {
    let moved = false;
    for (const d of biasedDirs(from, twistiness)) {
      const q = { col: cur.col + DELTA[d].dc, row: cur.row + DELTA[d].dr };
      if (q.col < 0 || q.col >= cols || q.row < 0 || q.row >= rows) continue;
      if (used.has(key(q))) continue;
      carveBetween(cells, cur, d);
      used.add(key(q));
      out.push({ pt: q, depth });
      cur = q;
      from = d;
      moved = true;
      break;
    }
    if (!moved) return;
  }
}

function generateOnce(level: number, shape: MazeShape, fakeGoals: number): Maze {
  const { cols, rows, targetLength } = levelConfig(level);
  const cells = makeGrid(cols, rows);
  const start: Pt = { col: 0, row: rows - 1 };

  let path = walkPath(cols, rows, start, targetLength, shape.twistiness);
  let length = targetLength;
  while (!path && length > 3) {
    length -= 1;
    path = walkPath(cols, rows, start, length, shape.twistiness);
  }
  const route = path ?? [start];

  for (let i = 1; i < route.length; i++) {
    const a = route[i - 1]!;
    const b = route[i]!;
    carveBetween(cells, a, dirBetween(a, b));
  }

  const pathSet = new Set(route.map(key));
  const used = new Set(pathSet);
  const branchCells: BranchCell[] = [];

  // primary false branches off the route
  const branchTotal = Math.max(1, Math.round((route.length - 1) * shape.decoyDensity * 1.4));
  const junctionSpots = shuffle(
    route.slice(0, -1).flatMap((p) => DIRS.map((d) => ({ p, d }))),
  );
  let made = 0;
  for (const { p, d } of junctionSpots) {
    if (made >= branchTotal) break;
    const q = { col: p.col + DELTA[d].dc, row: p.row + DELTA[d].dr };
    if (q.col < 0 || q.col >= cols || q.row < 0 || q.row >= rows) continue;
    if (used.has(key(q))) continue;
    carveBetween(cells, p, d);
    used.add(key(q));
    branchCells.push({ pt: q, depth: 1 });
    const depth = 1 + Math.floor(Math.random() * Math.max(1, shape.branchDepth));
    growBranch(cells, cols, rows, used, q, depth, shape.twistiness, branchCells, 2);
    made++;
  }

  // secondary branches so wrong turns keep branching further in
  const secondary = Math.round(branchCells.length * shape.decoyDensity * 0.6);
  for (const { pt, depth } of shuffle(branchCells).slice(0, secondary)) {
    growBranch(
      cells,
      cols,
      rows,
      used,
      pt,
      depth + 1 + Math.floor(Math.random() * Math.max(1, shape.branchDepth - 1)),
      shape.twistiness,
      branchCells,
      depth + 1,
    );
  }

  // optional loops between off-route corridors only
  if (shape.loopiness > 0) {
    const pairs = shuffle(
      branchCells.flatMap(({ pt }) =>
        (["E", "S"] as Dir[]).map((d) => ({ pt, d })),
      ),
    );
    let loops = Math.round(branchCells.length * shape.loopiness * 0.35);
    for (const { pt, d } of pairs) {
      if (loops <= 0) break;
      const q = { col: pt.col + DELTA[d].dc, row: pt.row + DELTA[d].dr };
      if (q.col < 0 || q.col >= cols || q.row < 0 || q.row >= rows) continue;
      if (!used.has(key(q)) || pathSet.has(key(q)) || pathSet.has(key(pt))) continue;
      if (!cells[pt.row]![pt.col]!.walls[d]) continue;
      carveBetween(cells, pt, d);
      loops--;
    }
  }

  // decoy goals: deepest dead ends of the false branches
  const deadEnds = branchCells
    .filter(({ pt }) => DIRS.filter((d) => !cells[pt.row]![pt.col]!.walls[d]).length === 1)
    .sort((a, b) => b.depth - a.depth);
  const decoyGoals = deadEnds.slice(0, Math.max(0, fakeGoals)).map(({ pt }) => pt);

  const goal = route[route.length - 1]!;
  return { cols, rows, cells, start, goal, path: route, decoyGoals, level };
}

/** How many false turns branch off the solution route. */
function decoyScore(cells: Cell[][], path: Pt[]) {
  const pathSet = new Set(path.map(key));
  let score = 0;
  for (const p of path) {
    const cell = cells[p.row]![p.col]!;
    for (const d of DIRS) {
      if (cell.walls[d]) continue;
      const k = `${p.col + DELTA[d].dc},${p.row + DELTA[d].dr}`;
      if (!pathSet.has(k)) score++;
    }
  }
  return score;
}

export const DEFAULT_SHAPE: MazeShape = {
  decoyDensity: 0.8,
  branchDepth: 4,
  loopiness: 0.15,
  twistiness: 0.7,
};

/** Generate several layouts and keep the one offering the most false turns. */
export function generateMaze(
  level: number,
  shape: MazeShape = DEFAULT_SHAPE,
  fakeGoals = 0,
): Maze {
  let best: Maze | null = null;
  let bestScore = -1;
  for (let i = 0; i < 5; i++) {
    const candidate = generateOnce(level, shape, fakeGoals);
    const score = decoyScore(candidate.cells, candidate.path);
    if (score > bestScore) {
      bestScore = score;
      best = candidate;
    }
  }
  return best!;
}

export function dirBetween(a: Pt, b: Pt): Dir {
  if (b.row < a.row) return "N";
  if (b.row > a.row) return "S";
  if (b.col > a.col) return "E";
  return "W";
}

/** Compress the solution path into "3 x North" style steps. */
export function pathToSteps(path: Pt[]): Step[] {
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
