import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createXRStore } from "@react-three/xr";
import { BriefingMap } from "./BriefingMap";
import MazeScene from "./MazeScene";
import { DIR_LABEL, generateMaze, pathToSteps } from "@/lib/maze";

type Phase = "title" | "briefing" | "playing" | "cleared";

const STORAGE_KEY = "vr-maze-progress";

interface Progress {
  level: number;
  bestTimes: Record<number, number>;
}

function loadProgress(): Progress {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Progress;
  } catch {
    /* ignore */
  }
  return { level: 1, bestTimes: {} };
}

function fmt(ms: number) {
  const s = ms / 1000;
  return `${s.toFixed(1)}s`;
}

export default function MazeGame() {
  const [progress, setProgress] = useState<Progress>({ level: 1, bestTimes: {} });
  const [level, setLevel] = useState(1);
  const [phase, setPhase] = useState<Phase>("title");
  const [seed, setSeed] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const startedAt = useRef(0);
  const [vrSupported, setVrSupported] = useState(false);

  const store = useMemo(() => createXRStore({ emulate: false }), []);
  const maze = useMemo(() => generateMaze(level), [level, seed]);
  const steps = useMemo(() => pathToSteps(maze.path), [maze]);

  useEffect(() => {
    const p = loadProgress();
    setProgress(p);
    setLevel(p.level);
    const xr = (navigator as Navigator & { xr?: { isSessionSupported: (m: string) => Promise<boolean> } }).xr;
    xr?.isSessionSupported("immersive-vr").then(setVrSupported).catch(() => setVrSupported(false));
  }, []);

  useEffect(() => {
    if (phase !== "playing") return;
    startedAt.current = performance.now();
    const id = window.setInterval(() => setElapsed(performance.now() - startedAt.current), 100);
    return () => window.clearInterval(id);
  }, [phase, level, seed]);

  const persist = useCallback((next: Progress) => {
    setProgress(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }, []);

  const handleCell = useCallback(
    (col: number, row: number) => {
      if (phase !== "playing") return;
      if (col !== maze.goal.col || row !== maze.goal.row) return;
      const time = performance.now() - startedAt.current;
      setElapsed(time);
      const best = progress.bestTimes[level];
      persist({
        level: Math.max(progress.level, level + 1),
        bestTimes: { ...progress.bestTimes, [level]: best ? Math.min(best, time) : time },
      });
      void store.getState().session?.end();
      setPhase("cleared");
    },
    [phase, maze, level, progress, persist, store],
  );

  const startRun = (vr: boolean) => {
    setPhase("playing");
    if (vr) void store.enterVR();
  };

  const nextMaze = (nextLevel: number) => {
    setLevel(nextLevel);
    setSeed((s) => s + 1);
    setElapsed(0);
    setPhase("briefing");
  };

  if (phase === "playing") {
    return (
      <div className="relative h-screen w-full">
        <MazeScene maze={maze} store={store} onCell={handleCell} />
        <div className="pointer-events-none absolute left-0 top-0 flex w-full items-start justify-between p-4 text-sm">
          <span className="rounded-full bg-card/85 px-3 py-1 font-medium text-foreground shadow-sm">
            Maze {level} · {steps.length} turns
          </span>
          <span className="rounded-full bg-card/85 px-3 py-1 tabular-nums text-muted-foreground shadow-sm">
            {fmt(elapsed)}
          </span>
        </div>
        <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-card/85 px-4 py-1.5 text-center text-xs text-muted-foreground shadow-sm">
          Click to look around · WASD or arrows to move
        </div>
        <button
          onClick={() => setPhase("briefing")}
          className="absolute bottom-4 right-4 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent"
        >
          Give up
        </button>
      </div>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-8 px-6 py-16">
      {phase === "title" && (
        <section className="flex flex-col items-center gap-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
            WebXR experience
          </p>
          <h1 className="text-5xl font-semibold tracking-tight text-foreground">Maze Recall</h1>
          <p className="max-w-md text-balance text-muted-foreground">
            Study the route on the map, then walk it from memory. Every maze is generated fresh and
            asks you to remember one more turn than the last.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => nextMaze(progress.level)}
              className="rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              {progress.level > 1 ? `Continue at maze ${progress.level}` : "Start"}
            </button>
            {progress.level > 1 && (
              <button
                onClick={() => nextMaze(1)}
                className="rounded-md border border-border px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
              >
                Restart from maze 1
              </button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {vrSupported
              ? "Headset detected — you can enter VR from the briefing screen."
              : "No headset detected: plays on screen with mouse and keyboard."}
          </p>
        </section>
      )}

      {phase === "briefing" && (
        <section className="flex w-full flex-col items-center gap-6">
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
              Maze {level}
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
              Memorise the route
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {steps.length} turns · {maze.path.length - 1} steps. The map disappears once you go in.
            </p>
          </div>

          <BriefingMap maze={maze} />

          <ol className="flex flex-wrap justify-center gap-2">
            {steps.map((s, i) => (
              <li
                key={i}
                className="rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-foreground"
              >
                {s.count} × {DIR_LABEL[s.dir]}
              </li>
            ))}
          </ol>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => startRun(false)}
              className="rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Enter maze
            </button>
            {vrSupported && (
              <button
                onClick={() => startRun(true)}
                className="rounded-md border border-border px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
              >
                Enter in VR
              </button>
            )}
            <button
              onClick={() => setSeed((s) => s + 1)}
              className="rounded-md px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              New layout
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            North is up on the map. In the maze you start facing north.
          </p>
        </section>
      )}

      {phase === "cleared" && (
        <section className="flex flex-col items-center gap-5 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
            Maze {level} cleared
          </p>
          <h2 className="text-4xl font-semibold tracking-tight text-foreground">{fmt(elapsed)}</h2>
          <p className="text-sm text-muted-foreground">
            Best for this maze: {fmt(progress.bestTimes[level] ?? elapsed)}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => nextMaze(level + 1)}
              className="rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Next maze
            </button>
            <button
              onClick={() => setPhase("title")}
              className="rounded-md border border-border px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
            >
              Back to start
            </button>
          </div>
        </section>
      )}
    </main>
  );
}
