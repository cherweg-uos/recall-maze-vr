import { useFrame, useThree } from "@react-three/fiber";
import { XROrigin, useXRInputSourceState } from "@react-three/xr";
import { Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { CHUNK_CELLS, chunkKey, visibleChunks } from "@/lib/mazeVisibility";
import { StoneFloor } from "./vr/StoneFloor";
import { Text } from "@react-three/drei";
import * as THREE from "three";
import type { Dir, Maze } from "@/lib/maze";
import { DELTA, dirBetween } from "@/lib/maze";
import { formatClock, type GameSettings } from "@/lib/gameSettings";
import { UI } from "./vr/ui3d";
import { TeleportFloor, movementLocked, snapAngle, useSticks, type TeleportTarget } from "./vr/locomotion";

export const CELL = 3;
const WALL_H = 2.5;
const THICK = 0.18;

interface WallBox {
  x: number;
  z: number;
  w: number;
  d: number;
  col: number;
  row: number;
}

function buildWalls(maze: Maze): WallBox[] {
  const out: WallBox[] = [];
  for (const rowCells of maze.cells) {
    for (const c of rowCells) {
      const x0 = c.col * CELL;
      const z0 = c.row * CELL;
      const at = { col: c.col, row: c.row };
      if (c.walls.N) out.push({ x: x0 + CELL / 2, z: z0, w: CELL + THICK, d: THICK, ...at });
      if (c.walls.W) out.push({ x: x0, z: z0 + CELL / 2, w: THICK, d: CELL + THICK, ...at });
      if (c.row === maze.rows - 1 && c.walls.S)
        out.push({ x: x0 + CELL / 2, z: z0 + CELL, w: CELL + THICK, d: THICK, ...at });
      if (c.col === maze.cols - 1 && c.walls.E)
        out.push({ x: x0 + CELL, z: z0 + CELL / 2, w: THICK, d: CELL + THICK, ...at });
    }
  }
  return out;
}


const CARDINALS: Dir[] = ["N", "E", "S", "W"];

/** Nearest cardinal direction for a heading angle (0 = looking towards -Z = North). */
function headingToDir(heading: number): Dir {
  const idx = ((Math.round(-heading / (Math.PI / 2)) % 4) + 4) % 4;
  return CARDINALS[idx]!;
}

/** A neighbouring cell may be entered only when there is no wall between them. */
function canStep(maze: Maze, col: number, row: number, dir: Dir): boolean {
  const cell = maze.cells[row]?.[col];
  if (!cell || cell.walls[dir]) return false;
  const nc = col + DELTA[dir].dc;
  const nr = row + DELTA[dir].dr;
  return nc >= 0 && nc < maze.cols && nr >= 0 && nr < maze.rows;
}

function useKeyPress(handler: (code: string) => void) {
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => {
    const down = (e: KeyboardEvent) => ref.current(e.code);
    window.addEventListener("keydown", down);
    return () => window.removeEventListener("keydown", down);
  }, []);
}

interface PlayerProps {
  maze: Maze;
  settings: GameSettings;
  onCell: (col: number, row: number) => void;
  /** ms remaining, shown while the X button (or desktop X key) is held */
  timeLeftRef: React.RefObject<number>;
  /** B / Y button (or desktop B key) gives up the run */
  onAbort?: (() => void) | undefined;
}

function Player({ maze, settings, onCell, timeLeftRef, onAbort }: PlayerProps) {
  const originRef = useRef<THREE.Group>(null);
  const hudRef = useRef<THREE.Group>(null);
  const hudTextRef = useRef<{ text: string } | null>(null);
  const { camera } = useThree();
  const cell = useRef({ col: maze.start.col, row: maze.start.row });
  const startYaw = useCallback((m: Maze) => {
    const a = m.path[0];
    const b = m.path[1];
    if (!a || !b) return 0;
    const idx = CARDINALS.indexOf(dirBetween(a, b));
    return idx < 0 ? 0 : -idx * (Math.PI / 2);
  }, []);
  const yaw = useRef(startYaw(maze));
  const xHeld = useRef(false);
  const abortArmed = useRef(true);
  const abortRef = useRef(onAbort);
  abortRef.current = onAbort;

  const leftCtrl = useXRInputSourceState("controller", "left");
  const rightCtrl = useXRInputSourceState("controller", "right");


  useEffect(() => {
    cell.current = { col: maze.start.col, row: maze.start.row };
    yaw.current = startYaw(maze);
  }, [maze, startYaw]);


  const goTo = useCallback(
    (col: number, row: number) => {
      cell.current = { col, row };
      onCell(col, row);
    },
    [onCell],
  );

  /** Snap a ray hit onto its cell, valid only when reachable in one step. */
  const snap = useCallback(
    (x: number, z: number): TeleportTarget => {
      const col = Math.min(maze.cols - 1, Math.max(0, Math.floor(x / CELL)));
      const row = Math.min(maze.rows - 1, Math.max(0, Math.floor(z / CELL)));
      const dc = col - cell.current.col;
      const dr = row - cell.current.row;
      let valid = false;
      if (Math.abs(dc) + Math.abs(dr) === 1) {
        const dir: Dir = dc === 1 ? "E" : dc === -1 ? "W" : dr === 1 ? "S" : "N";
        valid = canStep(maze, cell.current.col, cell.current.row, dir);
      }
      return { x: col * CELL + CELL / 2, z: row * CELL + CELL / 2, valid };
    },
    [maze],
  );

  const currentHeading = useCallback(() => {
    if (camera.parent) {
      const dir = new THREE.Vector3();
      camera.getWorldDirection(dir);
      if (Math.abs(dir.x) + Math.abs(dir.z) > 0.001) return Math.atan2(-dir.x, -dir.z);
    }
    return yaw.current;
  }, [camera]);

  const stepForward = useCallback(() => {
    const dir = headingToDir(currentHeading());
    if (!canStep(maze, cell.current.col, cell.current.row, dir)) return;
    goTo(cell.current.col + DELTA[dir].dc, cell.current.row + DELTA[dir].dr);
  }, [currentHeading, goTo, maze]);

  /** Step one cell backwards without changing facing. */
  const stepBack = useCallback(() => {
    const facing = headingToDir(currentHeading());
    const idx = CARDINALS.indexOf(facing);
    const dir = CARDINALS[(idx + 2) % 4]!;
    if (!canStep(maze, cell.current.col, cell.current.row, dir)) return;
    goTo(cell.current.col + DELTA[dir].dc, cell.current.row + DELTA[dir].dr);
  }, [currentHeading, goTo, maze]);

  const turn = useCallback(
    (d: -1 | 1) => {
      yaw.current -= d * snapAngle(settings);
    },
    [settings],
  );

  useSticks({
    settings,
    onYaw: (r) => (yaw.current -= r),
    onForward: stepForward,
    onBack: stepBack,
  });

  useKeyPress((code) => {
    if (code === "KeyX") {
      xHeld.current = true;
      return;
    }
    if (code === "KeyB") {
      abortRef.current?.();
      return;
    }
    if (movementLocked()) return;
    if (code === "ArrowLeft" || code === "KeyA") turn(-1);
    else if (code === "ArrowRight" || code === "KeyD") turn(1);
    else if (code === "KeyW" || code === "ArrowUp") stepForward();
    else if (code === "KeyS" || code === "ArrowDown") stepBack();
  });



  useEffect(() => {
    const up = (e: KeyboardEvent) => {
      if (e.code === "KeyX") xHeld.current = false;
    };
    window.addEventListener("keyup", up);
    return () => window.removeEventListener("keyup", up);
  }, []);

  useFrame((state) => {
    const x = cell.current.col * CELL + CELL / 2;
    const z = cell.current.row * CELL + CELL / 2;

    if (originRef.current) {
      originRef.current.position.set(x, 0, z);
      originRef.current.rotation.set(0, yaw.current, 0);
    }
    if (!state.gl.xr.isPresenting) {
      camera.position.set(x, 1.6, z);
      camera.rotation.set(0, yaw.current, 0, "YXZ");
    }

    // hold X (or the X key on desktop) to peek at the remaining time
    const xPressed =
      leftCtrl?.gamepad?.["x-button"]?.state === "pressed" ||
      rightCtrl?.gamepad?.["a-button"]?.state === "pressed" ||
      xHeld.current;
    if (hudRef.current) {
      hudRef.current.visible = xPressed;
      if (xPressed) {
        const dir = new THREE.Vector3();
        camera.getWorldDirection(dir);
        const camPos = camera.getWorldPosition(new THREE.Vector3());
        hudRef.current.position
          .copy(camPos)
          .addScaledVector(dir, 0.9)
          .add(new THREE.Vector3(0, -0.22, 0));
        hudRef.current.quaternion.copy(camera.getWorldQuaternion(new THREE.Quaternion()));
        if (hudTextRef.current) hudTextRef.current.text = formatClock(timeLeftRef.current ?? 0);
      }
    }
  });

  return (
    <>
      <XROrigin ref={originRef} />
      <TeleportFloor
        size={Math.max(maze.cols, maze.rows) * CELL * 2}
        snap={snap}
        onTeleport={(tx, tz) => goTo(Math.floor(tx / CELL), Math.floor(tz / CELL))}
      />
      <group ref={hudRef} visible={false} renderOrder={10}>
        <mesh>
          <boxGeometry args={[0.34, 0.16, 0.01]} />
          <meshBasicMaterial color={UI.ink} transparent opacity={0.85} />
        </mesh>
        <Text
          ref={hudTextRef as never}
          position={[0, 0, 0.008]}
          fontSize={0.075}
          color={UI.panel}
          anchorX="center"
          anchorY="middle"
        >
          0:00
        </Text>
      </group>
    </>
  );
}

/** Wall segments as chunked instanced batches — swap geometry/material later for hedges. */
const WALL_GEOMETRY = new THREE.BoxGeometry(1, 1, 1);
const WALL_MATERIAL = new THREE.MeshStandardMaterial({
  color: "#eceae4",
  roughness: 0.95,
  metalness: 0,
});

function WallChunk({ boxes, visible }: { boxes: WallBox[]; visible: boolean }) {
  const ref = useRef<THREE.InstancedMesh>(null);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const m = new THREE.Matrix4();
    boxes.forEach((w, i) => {
      m.compose(
        new THREE.Vector3(w.x, WALL_H / 2, w.z),
        new THREE.Quaternion(),
        new THREE.Vector3(w.w, WALL_H, w.d),
      );
      mesh.setMatrixAt(i, m);
    });
    mesh.count = boxes.length;
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [boxes]);

  return (
    <instancedMesh
      ref={ref}
      args={[WALL_GEOMETRY, WALL_MATERIAL, boxes.length]}
      castShadow
      receiveShadow
      frustumCulled
      visible={visible}
    />
  );
}

function Walls({ maze, visible }: { maze: Maze; visible: Set<string> }) {
  const chunks = useMemo(() => {
    const map = new Map<string, WallBox[]>();
    for (const w of buildWalls(maze)) {
      const key = chunkKey(w.col, w.row);
      const list = map.get(key);
      if (list) list.push(w);
      else map.set(key, [w]);
    }
    return [...map.entries()];
  }, [maze]);

  return (
    <group>
      {chunks.map(([key, boxes]) => (
        <WallChunk key={`${key}:${boxes.length}`} boxes={boxes} visible={visible.has(key)} />
      ))}
    </group>
  );
}


function GoalMarker({ col, row, color }: { col: number; row: number; color: string }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((_, d) => {
    if (ref.current) ref.current.rotation.y += d * 0.8;
  });
  const x = col * CELL + CELL / 2;
  const z = row * CELL + CELL / 2;
  return (
    <group position={[x, 0, z]}>
      <mesh ref={ref} position={[0, 1.1, 0]}>
        <octahedronGeometry args={[0.55]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.14, 0]}>
        <circleGeometry args={[1.1, 32]} />
        <meshBasicMaterial color={color} transparent opacity={0.25} />
      </mesh>
    </group>
  );
}

const DECOY_COLOR = "#4f9bd1";

function Goals({ maze, settings }: { maze: Maze; settings: GameSettings }) {
  const decoys = settings.fakeGoalsEnabled ? maze.decoyGoals : [];
  const decoyColor = settings.fakeGoalDistinct ? DECOY_COLOR : UI.accent;
  return (
    <group>
      <GoalMarker col={maze.goal.col} row={maze.goal.row} color={UI.accent} />
      {decoys.map((d) => (
        <GoalMarker key={`${d.col},${d.row}`} col={d.col} row={d.row} color={decoyColor} />
      ))}
    </group>
  );
}


interface WorldProps {
  maze: Maze;
  settings: GameSettings;
  onCell: (col: number, row: number) => void;
  timeLeftRef: React.RefObject<number>;
}

/** The playable maze: floor, walls, goal and the player rig. */
export function MazeWorld({ maze, settings, onCell, timeLeftRef }: WorldProps) {
  const [at, setAt] = useState({ col: maze.start.col, row: maze.start.row });

  useEffect(() => {
    setAt({ col: maze.start.col, row: maze.start.row });
  }, [maze]);

  const handleCell = useCallback(
    (col: number, row: number) => {
      setAt({ col, row });
      onCell(col, row);
    },
    [onCell],
  );

  const visible = useMemo(() => visibleChunks(maze, at.col, at.row), [maze, at]);

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[400, 400]} />
        <meshStandardMaterial color="#6f6a63" roughness={1} />
      </mesh>
      <Suspense fallback={null}>
        <StoneFloor
          cols={maze.cols}
          rows={maze.rows}
          cell={CELL}
          seed={maze.cols * 131 + maze.rows}
          chunkSize={CHUNK_CELLS * CELL}
          visibleChunks={visible}
        />
      </Suspense>
      <Walls maze={maze} visible={visible} />
      <Goals maze={maze} settings={settings} />
      <Player maze={maze} settings={settings} onCell={handleCell} timeLeftRef={timeLeftRef} />
    </group>
  );
}


export default MazeWorld;
