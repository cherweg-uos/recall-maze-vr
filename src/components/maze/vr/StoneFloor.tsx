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

const TILE = 1; // model is ~1x1 unit
/** how deep the slab sits in the base floor (visible thickness ~0.12) */
const SINK = -0.005;

interface Props {
  /** maze footprint (ignored when width/depth are given) */
  cols?: number;
  rows?: number;
  cell?: number;
  /** explicit footprint in metres */
  width?: number;
  depth?: number;
  centerX?: number;
  centerZ?: number;
  /** extra metres of stone beyond the footprint */
  apron?: number;
  /** circular mode: solid tiles within this radius (metres) */
  radius?: number;
  /** circular mode: tiles thin out between radius and this */
  fadeRadius?: number;
  seed?: number;
}

interface Placement {
  part: 0 | 1;
  x: number;
  z: number;
  y: number;
  yaw: number;
  scale: number;
}

export function StoneFloor({
  cols = 0,
  rows = 0,
  cell = 1,
  width,
  depth,
  centerX,
  centerZ,
  apron = 14,
  radius,
  fadeRadius,
  seed = 1,
}: Props) {
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
    const w = width ?? cols * cell;
    const d = depth ?? rows * cell;
    const originX = centerX !== undefined ? centerX - w / 2 : 0;
    const originZ = centerZ !== undefined ? centerZ - d / 2 : 0;
    const minX = originX - apron;
    const maxX = originX + w + apron;
    const minZ = originZ - apron;
    const maxZ = originZ + d + apron;
    const out: Placement[] = [];
    // inner tiles: exact grid, uniform scale — only yaw and height vary
    for (let x = 0; x < w; x += TILE) {
      for (let z = 0; z < d; z += TILE) {
        out.push({
          part: rand() < 0.5 ? 0 : 1,
          x: originX + x + TILE / 2,
          z: originZ + z + TILE / 2,
          y: SINK + (rand() - 0.5) * 0.008,
          yaw: Math.floor(rand() * 4) * (Math.PI / 2) + (rand() - 0.5) * 0.035,
          scale: 1,
        });
      }
    }
    // apron: larger slabs on their own matching grid step, sparsely filled
    const APRON_SCALE = 1.6;
    const step = TILE * APRON_SCALE;
    for (let x = minX; x < maxX; x += step) {
      for (let z = minZ; z < maxZ; z += step) {
        if (x + step > originX && x < originX + w && z + step > originZ && z < originZ + d) continue;
        if (rand() > 0.5) continue;
        out.push({
          part: rand() < 0.5 ? 0 : 1,
          x: x + step / 2,
          z: z + step / 2,
          y: SINK + (rand() - 0.5) * 0.02,
          yaw: Math.floor(rand() * 4) * (Math.PI / 2) + (rand() - 0.5) * 0.05,
          scale: APRON_SCALE,
        });
      }
    }
    return out;
  }, [cols, rows, cell, width, depth, centerX, centerZ, apron, seed]);


  const groups = useMemo(
    () => [placements.filter((p) => p.part === 0), placements.filter((p) => p.part === 1)],
    [placements],
  );

  return (
    <group>
      {parts.map((mesh, i) => (
        <StonePart key={i} mesh={mesh} items={groups[i] ?? []} />
      ))}
    </group>
  );
}

function StonePart({ mesh, items }: { mesh: THREE.Mesh; items: Placement[] }) {
  const ref = useRef<THREE.InstancedMesh>(null);

  const material = useMemo(() => {
    const m = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material) as THREE.Material;
    return m;
  }, [mesh]);

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
    />
  );
}

useGLTF.preload(URL);

export default StoneFloor;
