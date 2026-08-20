# Hedge walls + one-tile-per-cell floor

## What changes
- Every maze wall segment becomes one hedge prop (your uploaded model), instead of the current white box.
- Stone floor tiles get scaled up so exactly one tile covers one maze cell (3 m), instead of four smaller tiles.

## Hedge walls
- Upload `hedge_wall.glb` to the CDN as a project asset and load it with `useGLTF`.
- Replace the placeholder box geometry/material in `MazeScene.tsx` (`WALL_GEOMETRY` / `WALL_MATERIAL`) with the hedge mesh's geometry and material, keeping the existing chunked `instancedMesh` batching so draw calls and frustum/occlusion culling stay as they are.
- Scale/orient per instance: measure the model's bounding box once, then scale so its long axis matches one cell (3 m + wall thickness), its height matches the current wall height (2.5 m), and its depth matches the wall thickness. Segments running north/south get a 90 degrees yaw so the prop always spans the full wall opening.
- Walls stay fully solid; collision and teleport validation are unchanged (they use the maze grid, not the mesh).

## Floor
- In `StoneFloor.tsx`, set the tile footprint to the maze cell size (3 m) so one slab covers one grid square; the apron slabs scale up proportionally.
- Keep the locked (jitter-free) grid inside the maze footprint so tiles stay gapless, and keep random 90 degrees rotations to hide repetition.

## Notes
- Wall height stays 2.5 m. If the hedge model looks stretched at that ratio I will keep the width/depth exact (so no gaps between segments) and adjust height to the model's natural proportion, and mention it.
