# Hedge wall model replaces the placeholder walls

The new `hedge_wall.glb` is a proper wall panel, not a bush: one mesh, one material (basecolor + normal), 530 vertices, measuring about 1.0 m long, 1.0 m tall and 0.22 m thick, sitting on the ground.

## Fitting it to the walls

One panel per wall segment, non-uniformly scaled to fill it — a drop-in swap for the current box instance.

- Maze wall segments are 3.18 m long and 2.5 m tall, so each panel is scaled ~3.2x along its length and ~2.5x in height. The texture stretches accordingly; if it reads too smeared in the headset, the fallback is repeating the panel 3x along the length only (still one row).
- **Thickness:** kept near the model's natural ~0.22 m (close to the current 0.18 m boxes), so corridor width barely changes and no gameplay logic is touched.
- Panels are rotated per wall orientation (north/south walls run along X, east/west along Z).
- Alternating segments get a 180 degree flip so the repeat doesn't read as an obvious pattern.
- Material is double-sided in the file, so hedges look right from both corridor sides.

## Performance

Instance count is unchanged from today: one instance per wall segment, batched into one `InstancedMesh` per chunk. Existing frustum culling and line-of-sight chunk hiding keep working. At 500 triangles per panel a level-20 maze stays comfortably light for standalone headsets.

## Technical notes

- Register `hedge_wall.glb` with the asset CDN (`lovable-assets create`) and import the pointer JSON so the 2.6 MB binary stays out of the repo.
- New `src/components/maze/vr/HedgeWall.tsx`: `useGLTF` load (+ `preload`), extracts the single geometry/material, exports them for the wall batcher.
- `MazeScene.tsx` `WallChunk`: keeps its one-matrix-per-`WallBox` loop; only the composed scale/rotation changes (scale = box length / model length on the long axis, `WALL_H` / model height in Y, thickness axis to the box's thin dimension), plus a yaw of 0 or 90 degrees depending on wall orientation. `computeBoundingSphere()`, `castShadow`, `receiveShadow`, `frustumCulled` and the `visible` chunk flag all stay.
- The placeholder box geometry and white material are removed once the hedge renders; `THICK` stays as the logical layout thickness.
- Wall rendering is wrapped in `<Suspense fallback={null}>` like the stone floor so the GLB load never blocks the scene.
