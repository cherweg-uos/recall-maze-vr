# Break up hedge wall monotony with 4 orientation variants

## Current state

In `WallChunk` (`src/components/maze/MazeScene.tsx`), each wall segment's rotation is derived purely from its axis:

- walls running east/west get a 90° yaw
- walls running north/south get 0°

There is no random component, so every hedge on the same axis shows the exact same face, and the repetition is visible along long corridors.

## Change

Give each wall segment one of 4 deterministic variants: horizontal (front-back) flip × vertical (top-bottom) flip.

- Derive a stable pseudo-random 2-bit value from the segment's grid position (hash of `x`/`z`), so a wall keeps the same look across re-renders, culling toggles, and chunk rebuilds — no flickering when visibility changes.
- Bit 1 (front-back): add 180° yaw. Swaps which end and which face point where.
- Bit 2 (top-bottom): add 180° roll around the segment's long axis, turning the hedge upside down.
- Both are pure rotations, so geometry winding, normals, and lighting stay correct — no mirrored/negative scale, and the single-sided material keeps working.
- The prop is already centred across its thin axis and its long axis. For the vertical flip it also needs to be centred vertically before rotating: shift the base-aligned geometry by half its height in the instance matrix so the roll happens around the segment's mid-height and the hedge still sits exactly on the ground with the same 2.5 m height.

## Notes

- Collision, teleport validation, and occlusion culling read the maze grid, not the mesh, so they are unaffected.
- Scale, height (2.5 m), and thickness stay as they are.
- If the model's top and bottom differ enough that upside-down hedges read as wrong (e.g. a visible trimmed top edge or root base), I'll keep the front-back flip and drop the vertical one, and tell you.
