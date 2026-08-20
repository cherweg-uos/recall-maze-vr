# Block teleports through menus + maze culling

## 1. Menu panels stop the teleport ray

Today the controller ray passes through a panel and still lands a teleport disc on the floor behind it, because the floor catcher receives the same pointer event as the panel.

- Panels (and their buttons/sliders) become ray blockers: the pointer event stops at the topmost menu surface.
- The teleport floor only reacts when it is the first thing the ray hits. If the ray hits a panel, no landing disc appears and releasing the trigger does nothing.
- Clicking buttons and dragging sliders keeps working exactly as now; the only change is that the floor no longer gets a teleport out of the same press.
- Same rule for the grabbable briefing board, so pulling it around never teleports you.

## 2. Culling and draw-call reduction in the maze

Frustum culling is already on per object in three.js, but the maze currently spends it badly: every wall segment is three separate meshes, so a 20x20 maze is many hundreds of draw calls that all get tested and drawn.

- Walls become a **single instanced mesh**: one box per wall segment, no separate cap/trim meshes. This is a clean swap point for the future hedge model — later only the geometry/material of that one batch changes.
- Give the instanced walls a correct bounding volume so the whole batch is frustum-culled when off-screen, and keep per-object frustum culling enabled everywhere else.
- Keep the stone floor as it is (already instanced), but make sure its bounding sphere is computed so it culls properly too.
- No occlusion culling: WebGL/WebXR has no built-in occlusion culling, and a software/portal-visibility system for corridors is a much bigger change with its own per-frame cost. With walls instanced, the remaining cost is fragment/overdraw, not draw calls.
- If you do want corridor-based hiding later, that would be a separate step (compute per-cell visibility from the player's cell and hide out-of-sight wall instances).

## 3. Menu orientation on return

When the player lands back in the menu space they are recentred on the platform **and** turned to face the panel, so the menu is always straight ahead regardless of where they were looking in the maze.

## 4. Moon in the sky

- A visible moon disc/sphere placed in the same direction as the moonlight, so shadows and highlights read as coming from it.
- Soft glow halo around it, sitting behind the stars, not lighting the scene itself (the existing directional light stays the light source).

## Technical notes

- `ui3d.tsx`: add `e.stopPropagation()` on `onPointerMove`/`Down`/`Up` for the `Panel` backing meshes and `Button3D`/`SliderRow` hit surfaces.
- `locomotion.tsx` `TeleportFloor`: ignore events where `e.intersections[0].object !== floorMesh` and clear the target on those frames.
- `MazeScene.tsx` `Walls`: replace the per-box `<group>` map with one `THREE.InstancedMesh` (unit box geometry, per-instance matrix scaled to `w/WALL_H/d`) written in `useLayoutEffect`; `computeBoundingSphere()`, `castShadow`/`receiveShadow` on the batch.
- `StoneFloor.tsx`: call `computeBoundingSphere()` after filling matrices.
- `MazeGame.tsx` `MenuRig`: on entering a menu phase reset `pos` to (0,0) and `yaw` to the panel-facing angle (0, looking towards -Z), not just position.
- `MazeGame.tsx`: add a `Moon` group at the normalised direction of the existing `directionalLight` position `[14, 22, -10]`, pushed out ~120 units — emissive sphere plus an additive sprite/plane halo, `frustumCulled` on, no shadow casting.

