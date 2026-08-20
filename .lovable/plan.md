# Hedge walls

Swap the placeholder white boxes for the uploaded hedge model, keeping the existing chunked-instancing and culling system untouched.

## What the model is

One mesh, one PBR material (basecolor + normal + roughness/metal), 252 vertices — very cheap. Its natural footprint is about 0.98 m long, 0.58 m tall, 0.33 m thick, sitting on the ground (Y starts at 0).

## How it gets fitted to the walls

Maze walls are 3.18 m long and 2.5 m tall. Rather than stretching one copy into that shape (which would smear the foliage texture and make it ~1.4 m thick), each wall segment is built from repeated hedge pieces:

- Along the wall: 3 pieces per segment, each scaled slightly (~1.06x) so they meet with no gaps.
- In height: pieces stacked in rows using the same scale, so the hedge reads at natural leaf density up to the 2.5 m wall height, with the top row trimmed to land exactly on 2.5 m.
- Thickness stays at the model's natural proportion (about 0.35 m), which is wider than the current 0.18 m boxes — corridors get slightly narrower and feel more like a real hedge maze. Walkable cell centres and teleport logic are unchanged, so gameplay is unaffected.
- Alternating pieces get a 180 degree yaw flip and a couple of degrees of random tilt so the repetition isn't obvious.

If the stacked rows look wrong in practice (visible seams or over-dense foliage), the fallback is 3 pieces along the length with a single vertically stretched row — a one-line change in the same place.

## Performance

Everything stays instanced: all hedge pieces of a chunk go into one `InstancedMesh` per chunk, exactly like the current wall boxes, so draw calls stay per-chunk rather than per-piece, and existing frustum + line-of-sight chunk culling keeps working. At 252 triangles per piece even a level-20 maze stays light.

## Technical notes

- Register `hedge.glb` with the asset CDN (`lovable-assets create`) and import the pointer JSON — the 5 MB binary stays out of the repo.
- New `src/components/maze/vr/HedgeWalls.tsx`: loads the GLB with `useGLTF` (+ `preload`), extracts geometry/material, and exposes the existing `WallChunk` contract (`boxes`, `visible`).
- `MazeScene.tsx`: `WallChunk` expands each `WallBox` into per-piece matrices (position along the box's long axis, stacked in Y) instead of one matrix per box; instance count becomes `boxes.length * piecesPerBox`. `computeBoundingSphere()`, `castShadow`/`receiveShadow`, `frustumCulled` all kept.
- `THICK` stays as the logical wall thickness for maze layout; only the rendered hedge is wider.
- Placeholder box geometry/material removed once the hedge renders.
