import { useEffect, useRef, type ReactNode } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";

export const PANEL_DISTANCE = 2.2;
export const PANEL_HEIGHT = 1.45;

interface Options {
  distance?: number;
  height?: number;
  /** When true at validation time, the single reposition check is skipped. */
  skipRef?: React.RefObject<boolean>;
}

/**
 * Places a group at a constant distance in front of the player, facing them.
 * Runs once on mount and validates/corrects exactly once 0.5 s later.
 */
export function useFacePlayer(
  ref: React.RefObject<THREE.Object3D | null>,
  { distance = PANEL_DISTANCE, height = PANEL_HEIGHT, skipRef }: Options = {},
) {
  const { camera } = useThree();

  useEffect(() => {
    const place = () => {
      const obj = ref.current;
      if (!obj) return;
      const camPos = camera.getWorldPosition(new THREE.Vector3());
      const dir = camera.getWorldDirection(new THREE.Vector3());
      dir.y = 0;
      if (dir.lengthSq() < 1e-6) dir.set(0, 0, -1);
      dir.normalize();
      obj.position.set(camPos.x + dir.x * distance, height, camPos.z + dir.z * distance);
      obj.rotation.set(0, Math.atan2(dir.x, dir.z) + Math.PI, 0);
    };

    place();

    // one validation pass, 0.5 s later — never repeated, so it cannot loop
    const id = window.setTimeout(() => {
      if (skipRef?.current) return;
      const obj = ref.current;
      if (!obj) return;
      const camPos = camera.getWorldPosition(new THREE.Vector3());
      const objPos = obj.getWorldPosition(new THREE.Vector3());
      const toObj = objPos.clone().sub(camPos);
      const dist = toObj.length();
      toObj.y = 0;
      const fwd = camera.getWorldDirection(new THREE.Vector3());
      fwd.y = 0;
      const inFront =
        toObj.lengthSq() > 1e-6 &&
        fwd.lengthSq() > 1e-6 &&
        toObj.normalize().dot(fwd.normalize()) > 0.85;
      const rightDistance = Math.abs(dist - distance) < 0.5;
      if (!inFront || !rightDistance) place();
    }, 500);

    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

/**
 * Fixed panel anchor. The player is always returned to the centre of the menu
 * platform between scenes, so panels sit at a constant spot in front of it.
 */
export function FacingAnchor({
  children,
  distance = PANEL_DISTANCE,
  height = PANEL_HEIGHT,
}: {
  children: ReactNode;
  distance?: number;
  height?: number;
}) {
  return <group position={[0, height, -distance]}>{children}</group>;
}

