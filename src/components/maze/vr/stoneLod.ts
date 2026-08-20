import * as THREE from "three";
import { SimplifyModifier } from "three/examples/jsm/modifiers/SimplifyModifier.js";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/** distance bands (metres from camera) for LOD 0 / 1 / 2 */
export const LOD_NEAR = 14;
export const LOD_FAR = 30;
/** hysteresis so tiles don't flicker between levels while walking */
export const LOD_HYSTERESIS = 2;

const cache = new WeakMap<THREE.BufferGeometry, THREE.BufferGeometry[]>();
const modifier = new SimplifyModifier();

function simplify(base: THREE.BufferGeometry, keep: number): THREE.BufferGeometry {
  try {
    const count = base.attributes.position?.count ?? 0;
    const remove = Math.floor(count * (1 - keep));
    if (remove < 1) return base;
    const out = modifier.modify(base, remove);
    out.computeVertexNormals();
    return out;
  } catch {
    return base;
  }
}

/**
 * Three geometry levels for one stone sub-part: full detail, ~35% and ~12%
 * of the original vertices. Built once per geometry and cached.
 */
export function stoneLods(geometry: THREE.BufferGeometry): THREE.BufferGeometry[] {
  const hit = cache.get(geometry);
  if (hit) return hit;
  // SimplifyModifier needs welded vertices to collapse edges
  const welded = mergeVertices(geometry.clone());
  const lods = [geometry, simplify(welded, 0.35), simplify(welded, 0.12)];
  cache.set(geometry, lods);
  return lods;
}

/** pick a level for a distance, keeping the previous one inside the hysteresis band */
export function lodForDistance(distance: number, previous: number): number {
  const pad = (level: number) => (previous > level ? LOD_HYSTERESIS : 0);
  if (distance < LOD_NEAR - pad(0)) return 0;
  if (distance < LOD_FAR - pad(1)) return 1;
  return 2;
}
