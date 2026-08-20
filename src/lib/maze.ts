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
  /** how much of the leftover grid gets carved into corridors (0–1) */
  fillCoverage: number;
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
function walkPath(cols: number, rows: number, start: Pt, target: number, twistiness: number): Pt[] | null {
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

/** BFS distances from a source over the carved corridor graph. */
function distances(cells: Cell[][], cols: number, rows: number, src: Pt): Map<string, number> {
  const out = new Map<string, number>([[key(src), 0]]);
  const queue: Pt[] = [src];
  for (let i = 0; i < queue.length; i++) {
    const p = queue[i]!;
    const d0 = out.get(key(p))!;
    for (const d of DIRS) {
      if (cells[p.row]![p.col]!.walls[d]) continue;
      const q = { col: p.col + DELTA[d].dc, row: p.row + DELTA[d].dr };
      if (q.col < 0 || q.col >= cols || q.row < 0 || q.row >= rows) continue;
      if (out.has(key(q))) continue;
      out.set(key(q), d0 + 1);
      queue.push(q);
    }
  }
  return out;
}

/**
 * Carve every remaining untouched cell into the corridor network as a spanning
 * forest: a wall is only removed when it joins two different components, so no
 * cycle (and therefore no shortcut around the solution) can ever be created.
 */
function fillRemaining(cells: Cell[][], cols: number, rows: number, used: Set<string>, shape: MazeShape) {
  const parent = new Map<string, string>();
  const find = (k: string): string => {
    const p = parent.get(k);
    if (!p || p === k) return k;
    const root = find(p);
    parent.set(k, root);
    return root;
  };
  const union = (a: string, b: string) => parent.set(find(a), find(b));

  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const k = `${c},${r}`;
      parent.set(k, k);
    }
  // seed components from the corridors carved so far
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      for (const d of ["E", "S"] as Dir[]) {
        if (cells[r]![c]!.walls[d]) continue;
        const nc = c + DELTA[d].dc;
        const nr = r + DELTA[d].dr;
        if (nc < 0 || nc >= cols || nr < 0 || nr >= rows) continue;
        union(`${c},${r}`, `${nc},${nr}`);
      }

  const free: Pt[] = [];
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const p = { col: c, row: r };
      if (!used.has(key(p))) free.push(p);
    }
  const coverage = Math.max(0, Math.min(1, shape.fillCoverage ?? 1));
  let budget = Math.round(free.length * coverage);
  if (budget <= 0) return;

  let progress = true;
  while (progress && budget > 0) {
    progress = false;
    for (const p of shuffle(free)) {
      if (budget <= 0) break;
      if (used.has(key(p))) continue;
      // prefer joining an existing corridor, otherwise any distinct component
      const options: Dir[] = [];
      for (const d of biasedDirs(null, shape.twistiness)) {
        const q = { col: p.col + DELTA[d].dc, row: p.row + DELTA[d].dr };
        if (q.col < 0 || q.col >= cols || q.row < 0 || q.row >= rows) continue;
        if (find(key(p)) === find(key(q))) continue;
        options.push(d);
      }
      if (!options.length) continue;
      const carved = options.find((d) => used.has(`${p.col + DELTA[d].dc},${p.row + DELTA[d].dr}`));
      const dir = carved ?? options[0]!;
      const q = { col: p.col + DELTA[dir].dc, row: p.row + DELTA[dir].dr };
      carveBetween(cells, p, dir);
      union(key(p), key(q));
      used.add(key(p));
      used.add(key(q));
      budget--;
      progress = true;
    }
  }
}

function generateOnce(level: number, shape: MazeShape, fakeGoals: number): Maze {
  const { cols, rows, targetLength } = levelConfig(level);
  const cells = makeGrid(cols, rows);

  // try random start cells so neither start nor goal sits in a fixed corner
  const candidates = shuffle(
    Array.from({ length: cols * rows }, (_, i) => ({
      col: i % cols,
      row: Math.floor(i / cols),
    })),
  );

  let start: Pt = candidates[0]!;
  let path: Pt[] | null = null;
  let length = targetLength;
  while (!path && length > 3) {
    for (const c of candidates.slice(0, 24)) {
      const attempt = walkPath(cols, rows, c, length, shape.twistiness);
      if (attempt) {
        start = c;
        path = attempt;
        break;
      }
    }
    if (!path) length -= 1;
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
  const junctionSpots = shuffle(route.slice(0, -1).flatMap((p) => DIRS.map((d) => ({ p, d }))));
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

  // fill the rest of the grid so no cell is left sealed off
  fillRemaining(cells, cols, rows, used, shape);

  // optional loops between off-route corridors only
  if (shape.loopiness > 0) {
    const offRoute: Pt[] = [];
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) {
        const p = { col: c, row: r };
        if (used.has(key(p)) && !pathSet.has(key(p))) offRoute.push(p);
      }
    const pairs = shuffle(offRoute.flatMap((pt) => (["E", "S"] as Dir[]).map((d) => ({ pt, d }))));
    let loops = Math.round(offRoute.length * shape.loopiness * 0.35);
    for (const { pt, d } of pairs) {
      if (loops <= 0) break;
      const q = { col: pt.col + DELTA[d].dc, row: pt.row + DELTA[d].dr };
      if (q.col < 0 || q.col >= cols || q.row < 0 || q.row >= rows) continue;
      if (!used.has(key(q)) || pathSet.has(key(q)) || pathSet.has(key(pt))) continue;
      if (!cells[pt.row]![pt.col]!.walls[d]) continue;
      carveBetween(cells, pt, d);
      // never let a loop create a shortcut around the recorded solution
      const goalCell = route[route.length - 1]!;
      if ((distances(cells, cols, rows, start).get(key(goalCell)) ?? 0) < route.length - 1) {
        cells[pt.row]![pt.col]!.walls[d] = true;
        cells[q.row]![q.col]!.walls[OPPOSITE[d]] = true;
        continue;
      }
      loops--;
    }
  }

  // decoy goals: deepest off-route dead ends, spread across the whole map
  const dist = distances(cells, cols, rows, start);
  const deadEnds: BranchCell[] = [];
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const p = { col: c, row: r };
      if (pathSet.has(key(p)) || !used.has(key(p))) continue;
      if (DIRS.filter((d) => !cells[r]![c]!.walls[d]).length !== 1) continue;
      deadEnds.push({ pt: p, depth: dist.get(key(p)) ?? 0 });
    }
  deadEnds.sort((a, b) => b.depth - a.depth);
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
  decoyDensity: 0.75,
  branchDepth: 4,
  loopiness: 0.2,
  twistiness: 0.1,
  fillCoverage: 1,
};

/** Generate several layouts and keep the one offering the most false turns. */
export function generateMaze(level: number, shape: MazeShape = DEFAULT_SHAPE, fakeGoals = 0): Maze {
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
