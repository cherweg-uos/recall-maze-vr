# Floor height, hedge thickness, moon visibility

## 1. Lower the stone tiles
`StoneFloor.tsx` sinks each slab by only 0.005 m, so the ~0.12 m thick slabs stand ~0.11 m above the ground plane. Increase the sink to about 0.07 m so only a thin stone lip shows and the ground reads as packed earth between slabs.

Follow-ups so nothing floats:
- Teleport disc/ring and ray-catcher in `locomotion.tsx` currently sit at ~0.135; drop them to just above the new stone top (~0.06).
- Goal halo in `MazeScene.tsx` gets the same height.

## 2. Thicker hedges
Wall segments use `THICK = 0.18` in `MazeScene.tsx`, which is board-thin. Raise it to 0.7 m so each hedge has real volume; the hedge prop is scaled from this value, so it thickens automatically. Corridors stay 2.3 m wide inside a 3 m cell, which is still comfortable for teleport steps, and collision/teleport logic is grid-based so it is unaffected.

If 0.7 m feels cramped in play, 0.5 m is the fallback.

## 3. Moon
The moon sits 400 m out at y ~300 (about 52 degrees elevation) with camera far at 700, so it should be inside the view volume — the cause is not yet confirmed. First step is to verify in the running preview (screenshot looking up along the moonlight direction) and check for a texture/console error, then fix what that shows. Likely candidates, in order:
- moon texture failing to load, leaving an invisible mesh
- `depthWrite:false` + `renderOrder:-1` letting the star field or background draw over it
- elevation simply too high to notice at normal gaze

Whatever the cause, the target end state is a static disc (no billboarding) plainly visible when looking toward the moonlight, with its elevation lowered somewhat if it is only an aiming issue.

## Files
- `src/components/maze/vr/StoneFloor.tsx`
- `src/components/maze/vr/locomotion.tsx`
- `src/components/maze/MazeScene.tsx`
- `src/components/maze/MazeGame.tsx` (moon)
