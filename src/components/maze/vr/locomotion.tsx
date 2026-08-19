import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { useXRInputSourceState } from "@react-three/xr";
import { useRef, useState } from "react";
import { UI } from "./ui3d";

export const SNAP_TURN = Math.PI / 6; // 30 degrees
const DEAD = 0.75;
const RECENTER = 0.25;

/**
 * Thumbstick locomotion: sideways push snaps the view, forward push triggers a
 * step. Both need a generous deadzone plus a return to centre before re-firing.
 */
export function useSticks({
  onTurn,
  onForward,
}: {
  onTurn: (dir: -1 | 1) => void;
  onForward?: (() => void) | undefined;
}) {
  const left = useXRInputSourceState("controller", "left");
  const right = useXRInputSourceState("controller", "right");
  const armedX = useRef(true);
  const armedY = useRef(true);

  useFrame(() => {
    let x = 0;
    let y = 0;
    for (const c of [left, right]) {
      const g = c?.gamepad?.["xr-standard-thumbstick"];
      if (!g) continue;
      if (Math.abs(g.xAxis ?? 0) > Math.abs(x)) x = g.xAxis ?? 0;
      if (Math.abs(g.yAxis ?? 0) > Math.abs(y)) y = g.yAxis ?? 0;
    }

    if (armedX.current && Math.abs(x) > DEAD) {
      armedX.current = false;
      onTurn(x > 0 ? 1 : -1);
    } else if (Math.abs(x) < RECENTER) {
      armedX.current = true;
    }

    if (armedY.current && y < -DEAD) {
      armedY.current = false;
      onForward?.();
    } else if (Math.abs(y) < RECENTER) {
      armedY.current = true;
    }
  });
}

export interface TeleportTarget {
  x: number;
  z: number;
  valid: boolean;
}

/**
 * Invisible ground catcher for controller rays / mouse. Hovering shows a landing
 * disc, releasing the trigger (or mouse) teleports when the spot is valid.
 */
export function TeleportFloor({
  size = 200,
  snap,
  onTeleport,
}: {
  size?: number;
  snap?: ((x: number, z: number) => TeleportTarget) | undefined;
  onTeleport: (x: number, z: number) => void;
}) {
  const [target, setTarget] = useState<TeleportTarget | null>(null);

  const resolve = (e: ThreeEvent<PointerEvent>): TeleportTarget =>
    snap ? snap(e.point.x, e.point.z) : { x: e.point.x, z: e.point.z, valid: true };

  return (
    <group>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.012, 0]}
        onPointerMove={(e: ThreeEvent<PointerEvent>) => setTarget(resolve(e))}
        onPointerDown={(e: ThreeEvent<PointerEvent>) => setTarget(resolve(e))}
        onPointerOut={() => setTarget(null)}
        onPointerUp={(e: ThreeEvent<PointerEvent>) => {
          const t = resolve(e);
          setTarget(t);
          if (t.valid) onTeleport(t.x, t.z);
        }}
      >
        <planeGeometry args={[size, size]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {target && (
        <group position={[target.x, 0.02, target.z]} rotation={[-Math.PI / 2, 0, 0]}>
          <mesh raycast={() => null}>
            <circleGeometry args={[0.42, 32]} />
            <meshBasicMaterial
              color={target.valid ? UI.accent : UI.inkSoft}
              transparent
              opacity={target.valid ? 0.38 : 0.18}
              depthWrite={false}
            />
          </mesh>
          <mesh raycast={() => null} position={[0, 0, 0.001]}>
            <ringGeometry args={[0.44, 0.5, 40]} />
            <meshBasicMaterial
              color={target.valid ? UI.accent : UI.inkSoft}
              transparent
              opacity={target.valid ? 0.85 : 0.35}
              depthWrite={false}
            />
          </mesh>
        </group>
      )}
    </group>
  );
}
