import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type * as THREE from "three";

const BASE = 4.2;

/** Warm lantern-like glow carried by the player; parented to the rig group. */
export function PlayerGlow() {
  const ref = useRef<THREE.PointLight>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const flicker = 1 + Math.sin(t * 5.3) * 0.035 + Math.sin(t * 11.7) * 0.02;
    if (ref.current) ref.current.intensity = BASE * flicker;
  });

  return (
    <pointLight
      ref={ref}
      color="#ffb877"
      intensity={BASE}
      distance={6}
      decay={2}
      position={[0, 1.2, 0]}
      castShadow={false}
    />
  );
}
