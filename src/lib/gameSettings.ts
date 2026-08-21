import { DEFAULT_SHAPE, type MazeShape } from "./maze";

export type TurnStyle = "snap" | "smooth";

export const SNAP_ANGLES = [15, 30, 90] as const;
export type SnapAngle = (typeof SNAP_ANGLES)[number];

export interface GameSettings {
  /** seconds you may study the briefing map at level 3 */
  briefingBase: number;
  /** extra briefing seconds per level above 3 */
  briefingPerLevel: number;
  /** seconds to complete the maze at level 3 */
  mazeBase: number;
  /** extra maze seconds per level above 3 */
  mazePerLevel: number;
  /** snap (discrete) or smooth (continuous) thumbstick turning */
  turnStyle: TurnStyle;
  /** degrees rotated per snap turn */
  snapDegrees: SnapAngle;
  /** degrees per second while holding the stick in smooth mode */
  smoothDegPerSec: number;
  /** place decoy goal markers in false branches */
  fakeGoalsEnabled: boolean;
  /** how many decoy goals to place */
  fakeGoalCount: number;
  /** give decoys their own colour instead of matching the real goal */
  fakeGoalDistinct: boolean;
  /** background music volume, 0..1 */
  musicVolume: number;
  /** never fail for leaving the solution route */
  godMode: boolean;
  /** procedural layout knobs */
  mazeShape: MazeShape;
}

export interface HighscoreEntry {
  level: number;
  timeMs: number;
  date: number;
}

export const MIN_LEVEL = 3;
export const MAX_LEVEL = 20;

export const SETTING_RANGES = {
  briefingBase: { min: 10, max: 30, step: 1, label: "Briefing time", unit: "s" },
  briefingPerLevel: { min: 1, max: 30, step: 1, label: "Briefing + per level", unit: "s" },
  mazeBase: { min: 60, max: 300, step: 10, label: "Maze time", unit: "s" },
  mazePerLevel: { min: 0, max: 60, step: 5, label: "Maze + per level", unit: "s" },
} as const;

export const SMOOTH_TURN_RANGE = { min: 45, max: 240, step: 15 } as const;

export const MUSIC_VOLUME_RANGE = { min: 0, max: 1, step: 0.05 } as const;

export const FAKE_GOAL_RANGE = { min: 0, max: 6, step: 1 } as const;

export const SHAPE_RANGES = {
  decoyDensity: { min: 0, max: 1, step: 0.05, label: "Fake paths" },
  branchDepth: { min: 1, max: 8, step: 1, label: "Decoy corridor length" },
  loopiness: { min: 0, max: 1, step: 0.05, label: "Decoy loops" },
  twistiness: { min: 0, max: 1, step: 0.05, label: "Corridor twistiness" },
  fillCoverage: { min: 0, max: 1, step: 0.05, label: "Fill coverage" },
} as const;

export type ShapeKey = keyof typeof SHAPE_RANGES;

export const DEFAULT_SETTINGS: GameSettings = {
  briefingBase: 15,
  briefingPerLevel: 3,
  mazeBase: 120,
  mazePerLevel: 15,
  turnStyle: "snap",
  snapDegrees: 30,
  smoothDegPerSec: 120,
  fakeGoalsEnabled: true,
  fakeGoalCount: 3,
  fakeGoalDistinct: false,
  godMode: false,
  musicVolume: 0.1,
  mazeShape: { ...DEFAULT_SHAPE },
};

const SETTINGS_KEY = "maze-recall:settings:v1";
const SCORES_KEY = "maze-recall:scores:v1";

export function loadSettings(): GameSettings {
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<GameSettings>;
      return {
        ...DEFAULT_SETTINGS,
        ...parsed,
        mazeShape: { ...DEFAULT_SETTINGS.mazeShape, ...(parsed.mazeShape ?? {}) },
      };
    }
  } catch {
    /* ignore */
  }
  return { ...DEFAULT_SETTINGS, mazeShape: { ...DEFAULT_SHAPE } };
}

export function saveSettings(s: GameSettings) {
  try {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

export function loadScores(): HighscoreEntry[] {
  try {
    const raw = window.localStorage.getItem(SCORES_KEY);
    if (raw) return JSON.parse(raw) as HighscoreEntry[];
  } catch {
    /* ignore */
  }
  return [];
}

export function saveScores(list: HighscoreEntry[]) {
  try {
    window.localStorage.setItem(SCORES_KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
}

export function addScore(list: HighscoreEntry[], entry: HighscoreEntry): HighscoreEntry[] {
  const next = [...list, entry].sort((a, b) => (a.level === b.level ? a.timeMs - b.timeMs : b.level - a.level));
  return next.slice(0, 50);
}

export function briefingSeconds(level: number, s: GameSettings) {
  return s.briefingBase + Math.max(0, level - MIN_LEVEL) * s.briefingPerLevel;
}

export function mazeSeconds(level: number, s: GameSettings) {
  return s.mazeBase + Math.max(0, level - MIN_LEVEL) * s.mazePerLevel;
}

export function formatClock(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const sec = total % 60;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

export function formatSeconds(sec: number) {
  if (sec < 60) return `${Math.round(sec)}s`;
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return s ? `${m}m ${s}s` : `${m}m`;
}
