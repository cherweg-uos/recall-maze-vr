# Fix: mazes full of sealed-off squares

## What's happening

I generated sample mazes and counted cells with all four walls intact: **37–46% of every grid is sealed** (level 5: 46%, level 10: 37%, level 20: 46%). Those are cells the generator never touched at all.

The cause is in how `src/lib/maze.ts` builds a level. It only carves:

1. the solution route,
2. a bounded number of false branches sprouting off that route,
3. a few loops between branch cells.

Everything else is left as untouched solid grid. Worse, the route walker rejects any cell that already has more than one carved neighbour, so it deliberately leaves buffer cells around corridors. Result: a thin carved skeleton floating in a block of dead space, which reads as "closed squares that serve no purpose".

## The fix: fill the whole grid

Add a final flood pass so **every cell belongs to the corridor network**, while the solution route stays the only way from start to goal.

- After route + branches, sweep the remaining untouched cells and carve them with a turn-biased backtracker, seeded from cells adjacent to existing off-route corridors.
- Any leftover isolated pockets get connected to their nearest non-route neighbour.
- Hard rule: a fill corridor may never open a wall into a solution-route cell except at a junction the branch pass already created. This keeps the route unique and the shortest path unchanged (verified by the existing BFS check).
- Twistiness still drives the fill, so it produces short dead ends and frequent intersections rather than open rooms.

## Keeping it complex, not open

Filling the grid must not turn it into a wide-open field:

- The fill uses the same closed-corridor carving (single-cell-wide passages, no 2x2 openings), so the density comes from more intersections and dead ends, not bigger rooms.
- `loopiness` keeps controlling how often the new corridors reconnect; at the default low value most fill branches dead-end.
- Dead ends from the fill pass join the pool that fake goals are sampled from, so decoy goals spread across the map instead of clustering near the route.

## New setting

Add a **Fill coverage** slider to the Maze tab (`0–1`, default `1`): how much of the leftover grid gets carved. At 1 the map is fully used; lower values reintroduce solid blocks for players who prefer sparser layouts.

## Technical notes

- `src/lib/maze.ts`: new `fillRemaining(cells, cols, rows, used, pathSet, shape)` pass run after branches and before the loop pass; dead-end collection moves after it. `MazeShape` gains `fillCoverage`; `DEFAULT_SHAPE` sets it to 1.
- The candidate-scoring loop in `generateMaze` keeps picking the layout with the most false turns off the route.
- `src/lib/gameSettings.ts`: `SHAPE_RANGES.fillCoverage` entry; existing saved settings pick up the default through the current merge.
- `src/components/maze/vr/Menus.tsx`: one more slider row on the Maze tab.
