# Stone tile spacing + teleport marker height

Two small fixes to the maze floor.

## 1. Even tile spacing

The tiles are currently placed on a 1 m grid with random XZ offsets (up to +/-4 cm) and random scale (0.98-1.04, and 1.6x on the apron). Those two randomisations combine so neighbouring tiles sometimes pull apart into a visible gap and sometimes push into each other.

Fix:
- Keep tile centres exactly on the grid inside the maze footprint (no XZ jitter there).
- Lock the in-maze scale to a single value so every slab covers the same 1 m square.
- Keep the variety purely in yaw (0/90/180/270 plus a tiny 1-2 degree tilt) and the small Y jitter, which never changes footprint.
- Apron tiles keep their larger, sparser look, but on their own consistent grid step (tile size matched to their scale) so they also don't overlap.

## 2. Teleport marker sits below the stones

The landing disc and ring are drawn at y = 0.02, while the stone slabs rise to about y = 0.11, so the marker is buried. Raise the teleport target group (disc + ring) to sit just above the stone surface, and raise the invisible ray-catcher plane accordingly so hover picks the same height. The goal marker's ground halo (also at y = 0.02) gets the same lift so it stays visible.

## Technical notes

- `src/components/maze/vr/StoneFloor.tsx`: drop XZ jitter and scale variance for in-maze placements; give the apron its own step size derived from its scale.
- `src/components/maze/vr/locomotion.tsx`: raise the target group and catcher plane above the tile top (~0.13).
- `src/components/maze/MazeScene.tsx`: lift the goal halo circle to the same height.
