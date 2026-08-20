# Break up hedge wall monotony with random 180° flips

## Current state

In `WallChunk` (`src/components/maze/MazeScene.tsx`), each wall segment's rotation is derived purely from its axis:

- walls running east/west get a 90° yaw
- walls running north/south get 0°

There is no random component, so every hedge on the same axis shows the exact same face, and the repetition is visible along long corridors.

## Change

Add a deterministic per-segment 180° flip on top of the axis yaw:

- Derive a stable pseudo-random value from the segment's grid position (hash of `x`/`z`), so a wall keeps the same look across re-renders, culling toggles, and chunk rebuilds — no flickering when visibility changes.
- If the hash says "flip", add `Math.PI` to the yaw. Since the prop is already centred on both horizontal axes, a 180° turn keeps the segment exactly in place and gapless.
- Optionally mirror rather than rotate is not needed; a 180° yaw is enough to swap the visible face.

## Notes

- Collision, teleport validation, and occlusion culling read the maze grid, not the mesh, so they are unaffected.
- Scale, height (2.5 m), and thickness stay as they are.
