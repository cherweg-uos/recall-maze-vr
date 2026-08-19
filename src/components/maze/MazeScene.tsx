import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { XR, XROrigin, useXRInputSourceState, type XRStore } from "@react-three/xr";
import { useEffect, useMemo, useRef } from "react";
import { Grid } from "@react-three/drei";
import * as THREE from "three";
import type { Maze } from "@/lib/maze";

export const CELL = 3;
const WALL_H = 2.5;
const THICK = 0.18;
const RADIUS = 0.45;
const SPEED = 3.2;
const TURN_SPEED = 2.0;

interface WallBox {
  x: number;
  z: number;
  w: number;
  d: number;
}

function buildWalls(maze: Maze): WallBox[] {
  const out: WallBox[] = [];
  for (const rowCells of maze.cells) {
    for (const c of rowCells) {
      const x0 = c.col * CELL;
      const z0 = c.row * CELL;
      if (c.walls.N) out.push({ x: x0 + CELL / 2, z: z0, w: CELL + THICK, d: THICK });
      if (c.walls.W) out.push({ x: x0, z: z0 + CELL / 2, w: THICK, d: CELL + THICK });
      if (c.row === maze.rows - 1 && c.walls.S)
        out.push({ x: x0 + CELL / 2, z: z0 + CELL, w: CELL + THICK, d: THICK });
      if (c.col === maze.cols - 1 && c.walls.E)
        out.push({ x: x0 + CELL, z: z0 + CELL / 2, w: THICK, d: CELL + THICK });
    }
  }
  return out;
}

/** Slide-along-walls collision using the grid, no physics engine. */
function resolve(maze: Maze, from: THREE.Vector2, to: THREE.Vector2): THREE.Vector2 {
  const col = Math.min(maze.cols - 1, Math.max(0, Math.floor(from.x / CELL)));
  const row = Math.min(maze.rows - 1, Math.max(0, Math.floor(from.y / CELL)));
  const cell = maze.cells[row]?.[col];
  const next = to.clone();
  if (!cell) return next;

  const minX = col * CELL + RADIUS;
  const maxX = (col + 1) * CELL - RADIUS;
  const minZ = row * CELL + RADIUS;
  const maxZ = (row + 1) * CELL - RADIUS;

  if (cell.walls.W && next.x < minX) next.x = minX;
  if (cell.walls.E && next.x > maxX) next.x = maxX;
  if (cell.walls.N && next.y < minZ) next.y = minZ;
  if (cell.walls.S && next.y > maxZ) next.y = maxZ;

  // keep corners clean: never cut diagonally across a wall junction
  if (next.x < minX && next.y < minZ) {
    if (maze.cells[row - 1]?.[col - 1] === undefined) {
      next.x = Math.max(next.x, minX);
      next.y = Math.max(next.y, minZ);
    }
  }

  next.x = Math.min(maze.cols * CELL - RADIUS, Math.max(RADIUS, next.x));
  next.y = Math.min(maze.rows * CELL - RADIUS, Math.max(RADIUS, next.y));
  return next;
}

function useKeys() {
  const keys = useRef<Record<string, boolean>>({});
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      keys.current[e.code] = true;
    };
    const up = (e: KeyboardEvent) => {
      keys.current[e.code] = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);
  return keys;
}

interface PlayerProps {
  maze: Maze;
  onCell: (col: number, row: number) => void;
}

function Player({ maze, onCell }: PlayerProps) {
  const keys = useKeys();
  const originRef = useRef<THREE.Group>(null);
  const { camera, gl } = useThree();
  const pos = useRef(
    new THREE.Vector2(maze.start.col * CELL + CELL / 2, maze.start.row * CELL + CELL / 2),
  );
  const yaw = useRef(0);
  const pitch = useRef(0);
  const lastCell = useRef("");

  const leftStick = useXRInputSourceState("controller", "left");
  const rightStick = useXRInputSourceState("controller", "right");

  // Desktop mouse look via pointer lock
  useEffect(() => {
    const canvas = gl.domElement;
    const onMove = (e: MouseEvent) => {
      if (document.pointerLockElement !== canvas) return;
      yaw.current -= e.movementX * 0.0022;
      pitch.current = Math.max(
        -1.2,
        Math.min(1.2, pitch.current - e.movementY * 0.0022),
      );
    };
    const onClick = () => {
      if (document.pointerLockElement !== canvas) void canvas.requestPointerLock?.();
    };
    canvas.addEventListener("click", onClick);
    window.addEventListener("mousemove", onMove);
    return () => {
      canvas.removeEventListener("click", onClick);
      window.removeEventListener("mousemove", onMove);
    };
  }, [gl]);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    let forward = 0;
    let strafe = 0;
    let turn = 0;

    const k = keys.current;
    if (k["KeyW"] || k["ArrowUp"]) forward += 1;
    if (k["KeyS"] || k["ArrowDown"]) forward -= 1;
    if (k["KeyA"]) strafe -= 1;
    if (k["KeyD"]) strafe += 1;
    if (k["ArrowLeft"]) turn += 1;
    if (k["ArrowRight"]) turn -= 1;

    const lg = leftStick?.gamepad?.["xr-standard-thumbstick"];
    if (lg) {
      strafe += lg.xAxis ?? 0;
      forward -= lg.yAxis ?? 0;
    }
    const rg = rightStick?.gamepad?.["xr-standard-thumbstick"];
    if (rg) turn -= rg.xAxis ?? 0;

    yaw.current += turn * TURN_SPEED * dt;

    const inXR = state.gl.xr.isPresenting;
    // In VR the headset supplies the view direction; combine it with rig yaw.
    let heading = yaw.current;
    if (inXR) {
      const dir = new THREE.Vector3();
      camera.getWorldDirection(dir);
      heading = Math.atan2(-dir.x, -dir.z);
    }

    if (forward !== 0 || strafe !== 0) {
      const len = Math.hypot(forward, strafe) || 1;
      const fx = (forward / len) * -Math.sin(heading) + (strafe / len) * Math.cos(heading);
      const fz = (forward / len) * -Math.cos(heading) - (strafe / len) * Math.sin(heading);
      const target = new THREE.Vector2(
        pos.current.x + fx * SPEED * dt,
        pos.current.y + fz * SPEED * dt,
      );
      pos.current.copy(resolve(maze, pos.current, target));
    }

    if (originRef.current) {
      originRef.current.position.set(pos.current.x, 0, pos.current.y);
      originRef.current.rotation.set(0, yaw.current, 0);
    }

    if (!inXR) {
      camera.position.set(pos.current.x, 1.6, pos.current.y);
      camera.rotation.set(pitch.current, yaw.current, 0, "YXZ");
    }

    const col = Math.floor(pos.current.x / CELL);
    const row = Math.floor(pos.current.y / CELL);
    const key = `${col},${row}`;
    if (key !== lastCell.current) {
      lastCell.current = key;
      onCell(col, row);
    }
  });

  return <XROrigin ref={originRef} />;
}

function Walls({ maze }: { maze: Maze }) {
  const walls = useMemo(() => buildWalls(maze), [maze]);
  return (
    <group>
      {walls.map((w, i) => (
        <group key={i}>
          <mesh position={[w.x, WALL_H / 2, w.z]} castShadow receiveShadow>
            <boxGeometry args={[w.w, WALL_H, w.d]} />
            <meshStandardMaterial color="#eceae4" roughness={0.95} metalness={0} />
          </mesh>
          {/* cornice: gives the flat walls a readable top edge */}
          <mesh position={[w.x, WALL_H - 0.06, w.z]}>
            <boxGeometry args={[w.w + 0.06, 0.12, w.d + 0.06]} />
            <meshStandardMaterial color="#9aa3a8" roughness={0.8} />
          </mesh>
          {/* skirting: anchors the wall to the floor */}
          <mesh position={[w.x, 0.08, w.z]}>
            <boxGeometry args={[w.w + 0.05, 0.16, w.d + 0.05]} />
            <meshStandardMaterial color="#b6bec3" roughness={0.9} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function Goal({ maze }: { maze: Maze }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((_, d) => {
    if (ref.current) ref.current.rotation.y += d * 0.8;
  });
  const x = maze.goal.col * CELL + CELL / 2;
  const z = maze.goal.row * CELL + CELL / 2;
  return (
    <group position={[x, 0, z]}>
      <mesh ref={ref} position={[0, 1.1, 0]}>
        <octahedronGeometry args={[0.55]} />
        <meshStandardMaterial color="#f0733b" emissive="#f0733b" emissiveIntensity={0.5} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <circleGeometry args={[1.1, 32]} />
        <meshBasicMaterial color="#f0733b" transparent opacity={0.25} />
      </mesh>
    </group>
  );
}

interface SceneProps {
  maze: Maze;
  store: XRStore;
  onCell: (col: number, row: number) => void;
}

export function MazeScene({ maze, store, onCell }: SceneProps) {
  return (
    <Canvas shadows camera={{ fov: 72, near: 0.05, far: 200 }} dpr={[1, 1.75]}>
      <XR store={store}>
        <color attach="background" args={["#cfd8dc"]} />
        <fog attach="fog" args={["#cfd8dc", 8, 34]} />
        <hemisphereLight args={["#ffffff", "#b9b3a6", 1.15]} />
        <directionalLight position={[12, 18, 8]} intensity={1.1} castShadow />
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
          <planeGeometry args={[400, 400]} />
          <meshStandardMaterial color="#aab2b8" roughness={1} />
        </mesh>
        <Grid
          position={[(maze.cols * CELL) / 2, 0.01, (maze.rows * CELL) / 2]}
          args={[maze.cols * CELL, maze.rows * CELL]}
          cellSize={CELL / 3}
          cellColor="#98a1a7"
          sectionSize={CELL}
          sectionColor="#7d878e"
          fadeDistance={40}
          infiniteGrid={false}
        />
        <Walls maze={maze} />
        <Goal maze={maze} />
        <Player maze={maze} onCell={onCell} />
      </XR>
    </Canvas>
  );
}

export default MazeScene;
