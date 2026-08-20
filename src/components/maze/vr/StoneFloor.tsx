import { useLayoutEffect, useMemo, useRef } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import stoneAsset from "@/assets/tileable_stone_floor.glb.asset.json";

const URL = stoneAsset.url;

/** deterministic RNG so a maze always lays out the same stones */
function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 100000) / 100000;
  };
}

/** how deep the slab sits in the base floor (visible thickness ~0.12) */
const SINK = -0.005;

interface Props {
  cols: number;
  rows: number;
  cell: number;
  /** extra metres of stone beyond the maze footprint */
  apron?: number;
  seed?: number;
  /** metres per render chunk; tiles are batched per chunk for culling */
  chunkSize?: number;
  /** chunk keys currently visible; apron chunks are always kept */
  visibleChunks?: Set<string>;
}

interface Placement {
  part: 0 | 1;
  x: number;
  z: number;
  y: number;
  yaw: number;
  scale: number;
  apron: boolean;
}

export function StoneFloor({ cols, rows, cell, apron = 14, seed = 1, chunkSize = 24, visibleChunks }: Props) {
  const gltf = useGLTF(URL);

  const parts = useMemo(() => {
    const found: THREE.Mesh[] = [];
    gltf.scene.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) found.push(o as THREE.Mesh);
    });
    return found;
  }, [gltf]);

  const placements = useMemo(() => {
    const rand = rng(seed);
    /** one tile per maze cell */
    const TILE = cell;
    const w = cols * cell;
    const d = rows * cell;
    const minX = -apron;
    const maxX = w + apron;
    const minZ = -apron;
    const maxZ = d + apron;
    const out: Placement[] = [];
    // in-maze tiles: exact grid, uniform scale — only yaw and height vary
    for (let x = 0; x < w; x += TILE) {
      for (let z = 0; z < d; z += TILE) {
        out.push({
          part: rand() < 0.5 ? 0 : 1,
          x: x + TILE / 2,
          z: z + TILE / 2,
          y: SINK + (rand() - 0.5) * 0.008,
          yaw: Math.floor(rand() * 4) * (Math.PI / 2) + (rand() - 0.5) * 0.035,
          scale: TILE,
          apron: false,
        });
      }
    }
    // apron: larger slabs on their own matching grid step, sparsely filled
    const APRON_SCALE = TILE * 1.6;
    const step = APRON_SCALE;
    for (let x = minX; x < maxX; x += step) {
      for (let z = minZ; z < maxZ; z += step) {
        if (x + step > 0 && x < w && z + step > 0 && z < d) continue;
        if (rand() > 0.5) continue;
        out.push({
          part: rand() < 0.5 ? 0 : 1,
          x: x + step / 2,
          z: z + step / 2,
          y: SINK + (rand() - 0.5) * 0.02,
          yaw: Math.floor(rand() * 4) * (Math.PI / 2) + (rand() - 0.5) * 0.05,
          scale: APRON_SCALE,
          apron: true,
        });
      }
    }
    return out;
  }, [cols, rows, cell, apron, seed]);

  /** one batch per (part, chunk) so frustum + occlusion culling can drop them */
  const batches = useMemo(() => {
    const map = new Map<string, { part: number; key: string; apron: boolean; items: Placement[] }>();
    for (const p of placements) {
      const ck = `${Math.floor(p.x / chunkSize)},${Math.floor(p.z / chunkSize)}`;
      const id = `${p.part}:${p.apron ? "a" : "m"}:${ck}`;
      let b = map.get(id);
      if (!b) {
        b = { part: p.part, key: ck, apron: p.apron, items: [] };
        map.set(id, b);
      }
      b.items.push(p);
    }
    return [...map.entries()];
  }, [placements, chunkSize]);

  return (
    <group>
      {batches.map(([id, b]) => {
        const mesh = parts[b.part];
        if (!mesh) return null;
        const visible = b.apron || !visibleChunks || visibleChunks.has(b.key);
        return <StonePart key={id} mesh={mesh} items={b.items} visible={visible} />;
      })}
    </group>
  );
}

/** clip everything below the ground plane — buried stone never gets shaded */
const GROUND_CLIP = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

const materialCache = new WeakMap<THREE.Mesh, THREE.Material>();

function clippedMaterial(mesh: THREE.Mesh) {
  const cached = materialCache.get(mesh);
  if (cached) return cached;
  const src = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material) as THREE.Material;
  const m = src.clone();
  m.clippingPlanes = [GROUND_CLIP];
  m.clipShadows = true;
  m.needsUpdate = true;
  materialCache.set(mesh, m);
  return m;
}

function StonePart({ mesh, items, visible }: { mesh: THREE.Mesh; items: Placement[]; visible: boolean }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const material = useMemo(() => clippedMaterial(mesh), [mesh]);

  useLayoutEffect(() => {
    const inst = ref.current;
    if (!inst) return;
    const dummy = new THREE.Object3D();
    items.forEach((p, i) => {
      dummy.position.set(p.x, p.y, p.z);
      dummy.rotation.set(0, p.yaw, 0);
      dummy.scale.setScalar(p.scale);
      dummy.updateMatrix();
      inst.setMatrixAt(i, dummy.matrix);
    });
    inst.instanceMatrix.needsUpdate = true;
    inst.computeBoundingSphere();
  }, [items]);

  if (!items.length) return null;

  return (
    <instancedMesh
      ref={ref}
      args={[mesh.geometry, material, items.length]}
      receiveShadow
      castShadow={false}
      frustumCulled
      visible={visible}
    />
  );
}

useGLTF.preload(URL);

export default StoneFloor;
