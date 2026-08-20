# Distant moon disc + real culling for walls and floor

## 1. Moon becomes a flat, far-away disc

- Replace the textured sphere + halo shell with a single flat disc (circle geometry) that always faces the camera (billboard).
- Push it much further out along the same moonlight direction (from ~120 to ~400 units) and scale it up so it reads at roughly the same size in the sky but clearly sits "far away" behind the maze.
- Camera far plane goes up so the moon isn't clipped; the disc renders unlit, unfogged, and depth-write off so nothing in the scene punches through it.
- Soft glow stays as a second, larger additive disc behind it instead of a sphere shell.

## 2. Frustum culling that actually does something

Right now the whole maze is one instanced wall batch and the stone floor is two instanced batches, so frustum culling is all-or-nothing: as long as one wall is on screen, everything is drawn.

- Split walls into spatial chunks (a grid of ~8x8 maze cells each). Each chunk is its own instanced mesh with its own bounding sphere, so only the chunks in view are submitted.
- Do the same chunking for the stone floor tiles (per part), and keep `computeBoundingSphere()` after filling matrices in every batch.
- Explicitly leave `frustumCulled` on everywhere (no accidental `frustumCulled={false}`), and verify nothing in the maze scene disables it.

## 3. Occlusion culling for walls and floor

WebGL/WebXR gives no built-in occlusion queries, so this is done with maze-aware visibility on the CPU:

- Each frame (throttled, only when the player's cell or facing changes meaningfully), compute which maze cells are potentially visible from the player's cell by walking the corridor graph: a cell is reachable-visible if there's an open line of sight through gaps, limited by a max distance.
- Chunks with no potentially-visible cell are hidden outright; this is what actually removes the maze behind walls.
- Hedges are treated as fully solid, sight-blocking walls (same as stone walls), so the visibility test can be strict: a cell is only kept if there is an unobstructed corridor line of sight to it.
- The stone floor uses the same chunk visibility set, plus the frustum test, so floor chunks around the corner also stop drawing.
- In the menu space nothing changes — the platform is small and always fully visible.

## 4. Bigger floor tiles (4 per maze cell)

Maze cells are 3 m and tiles are currently 1 m, so every cell costs 9 tiles. Switching to 1.5 m tiles gives exactly 4 tiles per cell — a bit over half the instance count, with the stone texture scaled up correspondingly (stones read larger, which suits an outdoor hedge maze). The apron slabs scale up in the same proportion so the two grids stay aligned.


## Technical notes

- `MazeGame.tsx`: `Moon()` → `<Billboard>` (drei) with `circleGeometry` + `meshBasicMaterial map={moonTex} transparent depthWrite={false} toneMapped={false} fog={false}`; position `MOON_DIR * 400`, radius ~18; glow = second circle at ~2.6x scale, additive, low opacity. Canvas camera `far` raised to 600.
- `MazeScene.tsx`: `Walls` splits `buildWalls(maze)` boxes into chunk buckets keyed by `floor(col/CH), floor(row/CH)`; render one `<instancedMesh>` per bucket with `computeBoundingSphere()`.
- New `src/lib/mazeVisibility.ts`: `visibleCells(maze, col, row, maxDist)` doing a corridor flood/ray walk over open edges; returns a `Set` of chunk keys.
- `MazeScene.tsx` uses a `useFrame` throttle (recompute only on cell change) to set `visible` on each wall/floor chunk group.
- `StoneFloor.tsx`: `TILE` 1 → 1.5 (CELL/2, exact 4-per-cell grid) with instance scale 1.5; apron step/scale scaled by the same factor. Accepts an optional `visibleChunks` set and chunk size, splits placements per chunk per part, keeps `receiveShadow`, `castShadow={false}`, and the ground clip plane.
