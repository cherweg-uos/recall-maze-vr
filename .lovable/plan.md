# Break up hedge wall monotony with 4 orientation variants

## Current state

In `WallChunk` (`src/components/maze/MazeScene.tsx`), each wall segment's rotation is derived purely from its axis:

- walls running east/west get a 90° yaw
- walls running north/south get 0°

There is no random component, so every hedge on the same axis shows the exact same face, and the repetition is visible along long corridors.

## Change

Give each wall segment one of 4 deterministic variants: 180° yaw flip × horizontal mirror.

- Derive a stable pseudo-random 2-bit value from the segment's grid position (hash of `x`/`z`), so a wall keeps the same look across re-renders, culling toggles, and chunk rebuilds — no flickering when visibility changes.
- Bit 1: add `Math.PI` to the yaw (swaps which face is seen).
- Bit 2: negate the long-axis scale, mirroring the prop end-to-end. Combined with the flip this gives 4 distinct silhouettes from one mesh.
- The prop is already centred on both horizontal axes, so both operations keep the segment in place and gapless.
- Mirroring inverts the geometry winding, which can make lighting look wrong on a single-sided material. To avoid that, keep the hedge material double-sided for the walls (it already tolerates this visually as a dense hedge) — or, if that looks off in the headset, drop the mirror bit back to a plain 2-variant flip and say so.

## Notes

- Collision, teleport validation, and occlusion culling read the maze grid, not the mesh, so they are unaffected.
- Scale magnitude, height (2.5 m), and thickness stay as they are.
