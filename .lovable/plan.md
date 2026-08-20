# Block teleports through menus + maze culling

## 1. Menu panels stop the teleport ray

Today the controller ray passes through a panel and still lands a teleport disc on the floor behind it, because the floor catcher receives the same pointer event as the panel.

- Panels (and their buttons/sliders) become ray blockers: the pointer event stops at the topmost menu surface.
- The teleport floor only reacts when it is the first thing the ray hits. If the ray hits a panel, no landing disc appears and releasing the trigger does nothing.
- Clicking buttons and dragging sliders keeps working exactly as now; the only change is that the floor no longer gets a teleport out of the same press.
- Same rule for the grabbable briefing board, so pulling it around never teleports you.

## 2. Culling and draw-call reduction in the maze

Frustum culling is already on per object in three.js, but the maze currently spends it badly: every wall segment is three separate meshes, so a 20x20 maze is many hundreds of draw calls that all get tested and drawn.

- Merge maze walls into instanced meshes: one instanced mesh for the wall body, one for the top cap, one for the base trim. This cuts hundreds of draw calls to three.
- Give the instanced walls a correct bounding volume so the whole batch is frustum-culled when the maze is off-screen, and keep per-object frustum culling enabled everywhere else.
- Keep the stone floor as it is (already instanced), but make sure its bounding sphere is computed so it culls properly too.
- No occlusion culling: WebGL/WebXR has no built-in occlusion culling, and a software/portal-visibility system for corridors is a much bigger change with its own per-frame cost. With walls instanced, the remaining cost is fragment/overdraw, not draw calls.
- If you do want corridor-based hiding later, that would be a separate step (compute per-cell visibility from the player's cell and hide out-of-sight wall instances).

## Technical notes

- `ui3d.tsx`: add `e.stopPropagation()` on `onPointerMove`/`Down`/`Up` for the `Panel` backing meshes and `Button3D`/`SliderRow` hit surfaces.
- `locomotion.tsx` `TeleportFloor`: ignore events where `e.intersections[0].object !== floorMesh` (guards against any surface that forgets to stop propagation) and clear the target on those frames.
- `MazeScene.tsx` `Walls`: replace the per-box `<group>` map with three `THREE.InstancedMesh` batches built in a `useMemo` from `buildWalls`, writing per-instance matrices in a `useLayoutEffect`; call `computeBoundingSphere()` on the instanced geometry, keep `castShadow`/`receiveShadow` on the batch.
- `StoneFloor.tsx`: call `instancedMesh.computeBoundingSphere()` after filling matrices.
