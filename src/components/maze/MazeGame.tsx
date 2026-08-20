import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { XR, XROrigin, createXRStore } from "@react-three/xr";
import * as THREE from "three";
import { generateMaze, pathToSteps } from "@/lib/maze";
import MazeWorld from "./MazeScene";
import { BriefingBoard } from "./vr/BriefingBoard";
import { TeleportFloor, lockMovement, useSticks } from "./vr/locomotion";
import { FacingAnchor } from "./vr/facePlayer";
import { Stars, useTexture } from "@react-three/drei";
import moonAsset from "@/assets/full_moon.png.asset.json";
import {
  HighscoresPanel,
  LevelSelectPanel,
  MENU_RADIUS,
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

/** Direction the moonlight comes from; the moon disc is drawn along this ray. */
const MOON_DIR = new THREE.Vector3(14, 22, -10).normalize();

/** A moon far away in the sky, matching the moonlight direction. */
function Moon() {
  const p = MOON_DIR.clone().multiplyScalar(120);
  const tex = useTexture(moonAsset.url);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return (
    <group position={[p.x, p.y, p.z]} raycast={() => null}>
      <mesh raycast={() => null}>
        <sphereGeometry args={[5.5, 48, 48]} />
        <meshBasicMaterial map={tex} toneMapped={false} fog={false} />
      </mesh>
      <mesh raycast={() => null} scale={[3.2, 3.2, 3.2]}>
        <sphereGeometry args={[5.5, 24, 24]} />
        <meshBasicMaterial
          color="#8ea6dd"
          toneMapped={false}
          fog={false}
          transparent
          opacity={0.08}
          depthWrite={false}
          side={THREE.BackSide}
        />
      </mesh>
    </group>
  );
}

/** Menu locomotion: free teleport on the floor plus 30° snap turning. */
function MenuRig({ settings }: { settings: GameSettings }) {
  const { camera } = useThree();
  const originRef = useRef<THREE.Group>(null);
  const pos = useRef(new THREE.Vector2(0, 0));
  const yaw = useRef(0);

  // entering the menu space always drops the player centred and facing the panel
  useEffect(() => {
    pos.current.set(0, 0);
    yaw.current = 0;
  }, []);

  useSticks({ settings, onYaw: (r) => (yaw.current -= r) });

  useFrame((state) => {
    if (originRef.current) {
      originRef.current.position.set(pos.current.x, 0, pos.current.y);
      originRef.current.rotation.set(0, yaw.current, 0);
    }
    if (!state.gl.xr.isPresenting) {
      camera.position.set(pos.current.x, 1.6, pos.current.y);
      camera.rotation.set(0, yaw.current, 0, "YXZ");
    }
  });

  useEffect(() => {
    if (document.pointerLockElement) document.exitPointerLock?.();
  }, []);

  return (
    <>
      <XROrigin ref={originRef} />
      <TeleportFloor
        size={40}
        radius={MENU_RADIUS}
        onTeleport={(x, z) => pos.current.set(x, z)}
      />
    </>
  );

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
  const visited = useRef<Set<string>>(new Set());

  const maze = useMemo(
    () =>
      generateMaze(
        level,
        settings.mazeShape,
        settings.fakeGoalsEnabled ? settings.fakeGoalCount : 0,
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [level, seed, settings.mazeShape, settings.fakeGoalsEnabled, settings.fakeGoalCount],
  );

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
    visited.current = new Set([`${maze.start.col},${maze.start.row}`]);
    runLeftRef.current = total;
    setRunLeft(total);
    startedAt.current = performance.now();
    setPhase("playing");
  }, [level, settings, maze]);

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
        lockMovement(500);
        setClearedMs(time);
        recordScore(level, time);
        setPhase("cleared");
        return;
      }
      // backtracking onto an already visited cell is always safe
      if (!pathSet.has(key) && !visited.current.has(key)) {
        lockMovement(500);
        setFailReason("You stepped off the route.");
        setPhase("failed");
        return;
      }
      visited.current.add(key);
    },
    [phase, maze, pathSet, level, recordScore],
  );

  // every scene swap freezes locomotion briefly so a button press can't teleport
  useEffect(() => {
    lockMovement(500);
  }, [phase]);

  const backToTitle = useCallback(() => setPhase("title"), []);

  const exitVR = useCallback(() => {
    void store.getState().session?.end();
    setPhase("enter");
  }, []);

  const inMaze = phase === "playing";

  return (
    <div className="relative h-screen w-full">
      <Canvas
        shadows
        camera={{ fov: 72, near: 0.05, far: 200 }}
        dpr={[1, 1.75]}
        gl={{ localClippingEnabled: true }}
      >
        <XR store={store}>
          <color attach="background" args={["#070b16"]} />
          <fog attach="fog" args={["#070b16", 22, 75]} />
          <Stars radius={80} depth={40} count={4500} factor={4} saturation={0} fade speed={0.6} />
          <Suspense fallback={null}>
            <Moon />
          </Suspense>
          <hemisphereLight args={["#8fa6d8", "#141a24", 0.5]} />
          <ambientLight color="#4a5a80" intensity={0.35} />
          <directionalLight
            position={[14, 22, -10]}
            color="#cdd9ff"
            intensity={1.05}
            castShadow
          />


          {inMaze ? (
            <MazeWorld maze={maze} settings={settings} onCell={handleCell} timeLeftRef={runLeftRef} />
          ) : (
            <>
              <MenuRoom />
              <MenuRig settings={settings} />
              {phase === "title" && (
                <FacingAnchor>
                  <TitlePanel
                    onStart={() => beginBriefing(MIN_LEVEL)}
                    onLevelSelect={() => setPhase("levels")}
                    onSettings={() => setPhase("settings")}
                    onHighscores={() => setPhase("scores")}
                    onExit={exitVR}
                  />
                </FacingAnchor>
              )}
              {phase === "levels" && (
                <FacingAnchor>
                  <LevelSelectPanel
                    level={level}
                    onLevel={setLevel}
                    onStart={() => beginBriefing(level)}
                    onBack={backToTitle}
                  />
                </FacingAnchor>
              )}
              {phase === "settings" && (
                <FacingAnchor>
                  <SettingsPanel settings={settings} onChange={updateSettings} onBack={backToTitle} />
                </FacingAnchor>
              )}
              {phase === "scores" && (
                <FacingAnchor>
                  <HighscoresPanel scores={scores} onBack={backToTitle} />
                </FacingAnchor>
              )}
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
                <FacingAnchor>
                  <ResultPanel
                    danger
                    title="Run failed"
                    subtitle={`${failReason} Restarting generates a new layout at level ${level}.`}
                    primaryLabel="Restart level"
                    onPrimary={() => beginBriefing(level)}
                    onTitle={backToTitle}
                  />
                </FacingAnchor>
              )}
              {phase === "cleared" && (
                <FacingAnchor>
                  <ResultPanel
                    title={`Level ${level} cleared`}
                    subtitle={`Time ${formatClock(clearedMs)} · ${steps.length} turns memorised`}
                    primaryLabel="Next maze"
                    onPrimary={() => beginBriefing(level + 1)}
                    onTitle={backToTitle}
                  />
                </FacingAnchor>
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
          Trigger to teleport one cell · thumbstick forward to step, back to step back, sideways to turn · hold X for the time left
        </div>
      )}
    </div>
  );
}
