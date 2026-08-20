# Hedge wall model replaces the placeholder walls

The new `hedge_wall.glb` is a proper wall panel, not a bush: one mesh, one material (basecolor + normal), 530 vertices, measuring about 1.0 m long, 1.0 m tall and 0.22 m thick, sitting on the ground. That fits the maze walls far better than the earlier hedge blob — it tiles cleanly in both directions.

## Fitting it to the walls

Maze wall segments are 3.18 m long and 2.5 m tall.

- **Along the length:** 3 panels per segment, stretched ~1.06x so they butt together with no seam gaps.
- **In height:** 3 rows, each scaled to 0.833 m, so the stack lands exactly on the 2.5 m wall height.
- **Thickness:** kept at the model's natural ~0.22 m (close to the current 0.18 m boxes), so corridor width barely changes and no gameplay logic is touched.
- Panels are oriented per wall segment (north/south walls run along X, east/west walls along Z).
- Alternating panels get a 180 degree flip so the repeating texture doesn't read as an obvious pattern.
- Material is double-sided in the file, so hedges look right from both corridor sides.

## Performance

All panels of a chunk go into one `InstancedMesh`, exactly like today's wall boxes — 9 instances per wall segment but still one draw call per chunk. Existing frustum culling and the line-of-sight chunk hiding keep working unchanged. At 500 triangles per panel a level-20 maze stays comfortably light for standalone headsets.

## Technical notes

- Register `hedge_wall.glb` with the asset CDN (`lovable-assets create`) and import the pointer JSON so the 2.6 MB binary stays out of the repo.
- New `src/components/maze/vr/HedgeWall.tsx`: `useGLTF` load (+ `preload`), extracts the single geometry/material, exports them for the wall batcher.
- `MazeScene.tsx` `WallChunk`: expands each `WallBox` into 3x3 panel matrices (position offset along the box's long axis and in Y, scale `1.06 x 0.833 x lengthScale`, yaw per orientation); instance count becomes `boxes.length * 9`. Keeps `computeBoundingSphere()`, `castShadow`, `receiveShadow`, `frustumCulled`, and the `visible` chunk flag.
- The placeholder box geometry and white material are removed once the hedge renders; `THICK` stays as the logical layout thickness.
- Wall rendering is wrapped in `<Suspense fallback={null}>` like the stone floor so the GLB load never blocks the scene.
