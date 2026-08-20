# Smaller, faster menu floor

The menu/briefing room currently tiles a 44 x 44 m square plus a 14 m apron — several thousand stone instances, which is what makes the menu levels lag. It becomes a small circular platform instead.

## What changes

1. **Limit movement to a 5 m circle.** Teleporting in the menu is clamped to a 5 m radius around the origin. Spots outside the circle show the invalid (grey) landing disc and do nothing on release, exactly like a wall-blocked spot in the maze.

2. **Tile only that circle.** The stone floor gets a circular mode: tiles are placed on the same 1 m grid but only where the tile centre falls inside the disc. Roughly 90 tiles instead of ~3,000, so the menu becomes as cheap as a small maze.

3. **Fade out at the edge.** Between the 5 m walking radius and about 7 m, tiles are kept with a probability that falls off with distance (dithering), so the platform frays into the dark ground rather than ending in a hard circle. No tiles beyond that.

4. **Keep everything else.** Same grout-coloured ground plane, same fixed seed, spawn ring unchanged, maze floor untouched.

## Technical notes

- `src/components/maze/vr/StoneFloor.tsx`: add optional `radius` and `fadeRadius` props. When `radius` is set, iterate the grid over the bounding square of `fadeRadius` and keep a tile when `d <= radius`, or when `d < fadeRadius` and `rand() < 1 - (d - radius) / (fadeRadius - radius)`. The apron pass is skipped in this mode.
- `src/components/maze/vr/Menus.tsx`: `<StoneFloor radius={5} fadeRadius={7} seed={7} />`; shrink the ground plane from 60 x 60 to ~20 x 20.
- `src/components/maze/MazeGame.tsx`: pass a `snap` function to the menu `TeleportFloor` that marks targets valid only when `x² + z² <= 25`, and reduce the catcher plane `size` from 60 to 20.
