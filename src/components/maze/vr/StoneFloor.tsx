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
const SINK = 0.35;

interface Props {
  cols: number;
  rows: number;
  cell: number;
  /** extra metres of stone beyond the maze footprint */
  apron?: number;
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

export function StoneFloor({ cols, rows, cell, apron = 14, seed = 1 }: Props) {
  const gltf = useGLTF(URL);

  const parts = useMemo(() => {
    const found: THREE.Mesh[] = [];
    gltf.scene.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) found.push(o as THREE.Mesh);
    });
    return found;
  }, [gltf]);

  console.log("STONEFLOOR parts", parts.length);
  const placements = useMemo(() => {
    const rand = rng(seed);
    const w = cols * cell;
    const d = rows * cell;
    const minX = -apron;
    const maxX = w + apron;
    const minZ = -apron;
    const maxZ = d + apron;
    const out: Placement[] = [];
    for (let x = minX; x < maxX; x += TILE) {
      for (let z = minZ; z < maxZ; z += TILE) {
        const outside = x < -0.5 || z < -0.5 || x > w - 0.5 || z > d - 0.5;
        // sparser, larger slabs on the outer apron to keep instance counts low
        const scale = outside ? 1.6 : 1;
        if (outside && rand() > 0.42) continue;
        out.push({
          part: rand() < 0.5 ? 0 : 1,
          x: x + TILE / 2 + (rand() - 0.5) * 0.08,
          z: z + TILE / 2 + (rand() - 0.5) * 0.08,
          y: SINK + (rand() - 0.5) * 0.015,
          yaw: Math.floor(rand() * 4) * (Math.PI / 2) + (rand() - 0.5) * 0.06,
          scale: scale * (0.98 + rand() * 0.06),
        });
      }
    }
    return out;
  }, [cols, rows, cell, apron, seed]);

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
    mesh.geometry.computeBoundingBox();
    console.log("STONE", items.length, JSON.stringify(mesh.geometry.boundingBox), inst.count);
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
