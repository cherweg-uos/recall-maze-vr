import { useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import hedgeAsset from "@/assets/hedge_wall.glb.asset.json";

const URL = hedgeAsset.url;

/** Natural size of the hedge panel prop (metres), measured from the GLB. */
export const HEDGE_LENGTH = 0.994;
export const HEDGE_HEIGHT = 0.992;
export const HEDGE_THICK = 0.223;

export interface HedgeAsset {
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
}

/** Single hedge wall panel: one mesh, one double-sided material. */
export function useHedgeWall(): HedgeAsset | null {
  const gltf = useGLTF(URL);
  return useMemo(() => {
    let found: THREE.Mesh | null = null;
    gltf.scene.traverse((o) => {
      if (!found && (o as THREE.Mesh).isMesh) found = o as THREE.Mesh;
    });
    if (!found) return null;
    const mesh = found as THREE.Mesh;
    const material = (
      Array.isArray(mesh.material) ? mesh.material[0] : mesh.material
    ) as THREE.Material;
    return { geometry: mesh.geometry, material };
  }, [gltf]);
}

useGLTF.preload(URL);
