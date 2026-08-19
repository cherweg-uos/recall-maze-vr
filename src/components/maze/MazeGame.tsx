import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { XR, XROrigin, createXRStore } from "@react-three/xr";
import * as THREE from "three";
import { generateMaze, pathToSteps } from "@/lib/maze";
import MazeWorld from "./MazeScene";
import { BriefingBoard } from "./vr/BriefingBoard";
import {
  HighscoresPanel,
  LevelSelectPanel,
  MenuRoom,
  ResultPanel,
  SettingsPanel,
  TitlePanel,
} from "./vr/Menus";
import {
  DEFAULT_SETTINGS,
  MIN_LEVEL,
  addScore,
  briefingSeconds,
  formatClock,
  loadScores,
  loadSettings,
  mazeSeconds,
  saveScores,
  saveSettings,
  type GameSettings,
  type HighscoreEntry,
} from "@/lib/gameSettings";

type Phase =
  | "enter"
  | "title"
  | "levels"
  | "settings"
  | "scores"
  | "briefing"
  | "playing"
  | "failed"
  | "cleared";

const store = createXRStore({ emulate: false });

/** Keeps the flat-screen camera parked in the menu room. */
function MenuCamera() {
  const { camera } = useThree();
  useFrame((state) => {
    if (state.gl.xr.isPresenting) return;
    camera.position.set(0, 1.6, 0);
    camera.quaternion.copy(new THREE.Quaternion());
  });
  useEffect(() => {
    if (document.pointerLockElement) document.exitPointerLock?.();
  }, []);
  return <XROrigin position={[0, 0, 0]} />;
}

export default function MazeGame() {
  const [phase, setPhase] = useState<Phase>("enter");
  const [level, setLevel] = useState(MIN_LEVEL);
  const [seed, setSeed] = useState(0);
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS);
  const [scores, setScores] = useState<HighscoreEntry[]>([]);
  const [vrSupported, setVrSupported] = useState(false);
  const [studyLeft, setStudyLeft] = useState(0);
  const [runLeft, setRunLeft] = useState(0);
  const [failReason, setFailReason] = useState("");
  const [clearedMs, setClearedMs] = useState(0);
  const runLeftRef = useRef(0);
  const startedAt = useRef(0);

  const maze = useMemo(() => generateMaze(level), [level, seed]);
  const steps = useMemo(() => pathToSteps(maze.path), [maze]);
  const pathSet = useMemo(
    () => new Set(maze.path.map((p) => `${p.col},${p.row}`)),
    [maze],
  );

  useEffect(() => {
    setSettings(loadSettings());
    setScores(loadScores());
    const xr = (
      navigator as Navigator & { xr?: { isSessionSupported: (m: string) => Promise<boolean> } }
    ).xr;
    xr?.isSessionSupported("immersive-vr")
      .then(setVrSupported)
      .catch(() => setVrSupported(false));
  }, []);

  const updateSettings = useCallback((s: GameSettings) => {
    setSettings(s);
    saveSettings(s);
  }, []);

  const studyEndsAt = useRef(0);

  const beginBriefing = useCallback(
    (lvl: number, freshLayout = true) => {
      setLevel(lvl);
      if (freshLayout) setSeed((s) => s + 1);
      const secs = briefingSeconds(lvl, settings);
      studyEndsAt.current = performance.now() + secs * 1000;
      setStudyLeft(secs);
      setPhase("briefing");
    },
    [settings],
  );

  const beginRun = useCallback(() => {
    const total = mazeSeconds(level, settings) * 1000;
    runLeftRef.current = total;
    setRunLeft(total);
    startedAt.current = performance.now();
    setPhase("playing");
  }, [level, settings]);

  // briefing countdown
  useEffect(() => {
    if (phase !== "briefing") return;
    const id = window.setInterval(() => {
      const left = (studyEndsAt.current - performance.now()) / 1000;
      setStudyLeft(Math.max(0, left));
      if (left <= 0) {
        window.clearInterval(id);
        beginRun();
      }
    }, 100);
    return () => window.clearInterval(id);
  }, [phase, beginRun]);

  // run countdown
  useEffect(() => {
    if (phase !== "playing") return;
    const total = mazeSeconds(level, settings) * 1000;
    const id = window.setInterval(() => {
      const left = total - (performance.now() - startedAt.current);
      runLeftRef.current = Math.max(0, left);
      setRunLeft(Math.max(0, left));
      if (left <= 0) {
        window.clearInterval(id);
        setFailReason("You ran out of time.");
        setPhase("failed");
      }
    }, 100);
    return () => window.clearInterval(id);
  }, [phase, level, settings]);

  const recordScore = useCallback(
    (lvl: number, timeMs: number) => {
      const next = addScore(loadScores(), { level: lvl, timeMs, date: Date.now() });
      setScores(next);
      saveScores(next);
    },
    [],
  );

  const handleCell = useCallback(
    (col: number, row: number) => {
      if (phase !== "playing") return;
      const key = `${col},${row}`;
      if (col === maze.goal.col && row === maze.goal.row) {
        const time = performance.now() - startedAt.current;
        setClearedMs(time);
        recordScore(level, time);
        setPhase("cleared");
        return;
      }
      if (!pathSet.has(key)) {
        setFailReason("You stepped off the route.");
        setPhase("failed");
      }
    },
    [phase, maze, pathSet, level, recordScore],
  );

  const backToTitle = useCallback(() => setPhase("title"), []);

  const exitVR = useCallback(() => {
    void store.getState().session?.end();
    setPhase("enter");
  }, []);

  const inMaze = phase === "playing";

  return (
    <div className="relative h-screen w-full">
      <Canvas shadows camera={{ fov: 72, near: 0.05, far: 200 }} dpr={[1, 1.75]}>
        <XR store={store}>
          <color attach="background" args={["#cfd8dc"]} />
          <fog attach="fog" args={["#cfd8dc", 10, 40]} />
          <hemisphereLight args={["#ffffff", "#b9b3a6", 1.15]} />
          <directionalLight position={[12, 18, 8]} intensity={1.1} castShadow />

          {inMaze ? (
            <MazeWorld maze={maze} onCell={handleCell} timeLeftRef={runLeftRef} />
          ) : (
            <>
              <MenuRoom />
              <MenuCamera />
              {phase === "title" && (
                <TitlePanel
                  onStart={() => beginBriefing(MIN_LEVEL)}
                  onLevelSelect={() => setPhase("levels")}
                  onSettings={() => setPhase("settings")}
                  onHighscores={() => setPhase("scores")}
                  onExit={exitVR}
                />
              )}
              {phase === "levels" && (
                <LevelSelectPanel
                  level={level}
                  onLevel={setLevel}
                  onStart={() => beginBriefing(level)}
                  onBack={backToTitle}
                />
              )}
              {phase === "settings" && (
                <SettingsPanel settings={settings} onChange={updateSettings} onBack={backToTitle} />
              )}
              {phase === "scores" && <HighscoresPanel scores={scores} onBack={backToTitle} />}
              {phase === "briefing" && (
                <BriefingBoard
                  maze={maze}
                  level={level}
                  secondsLeft={studyLeft}
                  onReady={beginRun}
                  onQuit={backToTitle}
                />
              )}
              {phase === "failed" && (
                <ResultPanel
                  danger
                  title="Run failed"
                  subtitle={`${failReason} Restarting generates a new layout at level ${level}.`}
                  primaryLabel="Restart level"
                  onPrimary={() => beginBriefing(level)}
                  onTitle={backToTitle}
                />
              )}
              {phase === "cleared" && (
                <ResultPanel
                  title={`Level ${level} cleared`}
                  subtitle={`Time ${formatClock(clearedMs)} · ${steps.length} turns memorised`}
                  primaryLabel="Next maze"
                  onPrimary={() => beginBriefing(level + 1)}
                  onTitle={backToTitle}
                />
              )}
            </>
          )}
        </XR>
      </Canvas>

      {phase === "enter" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 bg-background/95 px-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
            WebXR experience
          </p>
          <h1 className="text-5xl font-semibold tracking-tight text-foreground">Maze Recall</h1>
          <p className="max-w-md text-balance text-muted-foreground">
            Everything happens in the headset: menus, the map briefing and the maze itself. Study
            the route, then walk it from memory without stepping off the path.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => {
                setPhase("title");
                void store.enterVR();
              }}
              className="rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Enter VR
            </button>
            <button
              onClick={() => setPhase("title")}
              className="rounded-md border border-border px-6 py-3 text-sm font-medium text-foreground transition-colors hover:bg-accent"
            >
              Preview on screen
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            {vrSupported
              ? "Headset detected."
              : "No headset detected — the on-screen preview is for testing only."}
          </p>
        </div>
      )}

      {inMaze && (
        <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-card/85 px-4 py-1.5 text-center text-xs text-muted-foreground shadow-sm">
          Thumbsticks to move · hold the X button (or X key on screen) to check the time left
        </div>
      )}
    </div>
  );
}
