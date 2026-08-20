# Fix disappearing occluder walls + warm player glow

## 1. Walls that should block sight sometimes vanish

Confirmed cause in the culling code: every wall segment is filed under exactly one owning cell (`buildWalls` records a wall on a cell's N or W edge, plus S/E only on the outer border). A wall between a visible cell and a hidden cell is therefore often owned by the *hidden* cell — the one it occludes — so its chunk is dropped and the wall is not drawn. The current compensation in `visibleChunks` only widens towards `col-1` / `row-1`, which covers one side and misses the other.

Fix: when a cell is marked visible, also keep the chunks of its neighbours on all four sides (not just N/W). That guarantees the owner chunk of every wall bordering a visible cell is submitted, so no boundary wall can be culled away while the space it hides is drawn. Chunks are 8x8 cells, so this widening costs at most one extra chunk ring and only near chunk borders.

## 2. Warm glow around the player

A soft, warm lantern light travelling with the player, so nearby hedges and stones pick up a warm rim against the cool moonlight:

- A warm point light (amber, short range, gentle falloff) parented to the player rig at roughly chest height, following them through teleports automatically.
- Very subtle animated flicker so it reads as a carried light rather than a flat lamp.
- No shadow casting from it (keeps the moon as the single shadow source and stays cheap in VR).
- Present in the maze and in the menu space so the player is lit in both.

## Technical notes

- `src/lib/mazeVisibility.ts`: in `visibleChunks`, the `add` helper also adds `chunkKey(c + 1, r)` and `chunkKey(c, r + 1)` (clamped to maze bounds) alongside the existing `c - 1` / `r - 1` entries. The early `continue` fast-path stays.
- `src/components/maze/MazeScene.tsx` (`Player`) and `src/components/maze/MazeGame.tsx` (`MenuRig`): add a `<pointLight>` inside the rig group next to `<XROrigin>`, e.g. `color="#ffb877"`, `intensity ~2.5`, `distance ~6`, `decay 2`, `position [0, 1.2, 0]`, `castShadow={false}`; flicker via a small `useFrame` sine/noise multiplier on `intensity`.
