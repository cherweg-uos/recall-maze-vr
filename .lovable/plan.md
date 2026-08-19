# Random start and goal placement

Right now every maze begins in the bottom-left corner: the generator hard-codes the start cell to column 0, bottom row, and the goal is simply wherever the carved route ends. That makes the first move predictable and hints at where the goal roughly sits.

## What changes

- The start cell is picked at random anywhere on the grid each time a maze is generated.
- The solution route is carved from that random start, so the goal also ends up anywhere on the map.
- If a random start can't fit the required route length (for example it gets boxed in near an edge), the generator retries from other random starts before shortening the route, so difficulty stays consistent per level.
- The player spawns on the new start cell facing the direction of the first step of the solution, so the briefing's first instruction always matches what they see.
- The briefing map already marks start and goal, so it keeps working unchanged.

## Technical notes

- `generateOnce` in `src/lib/maze.ts`: replace the fixed `start = { col: 0, row: rows - 1 }` with a shuffled list of candidate cells; try `walkPath` from each candidate at the target length, then fall back to progressively shorter lengths as today.
- `generateMaze` keeps running several candidates and scoring by false turns, so random starts don't reduce maze trickiness.
- `MazeScene`: derive the initial player yaw from `dirBetween(maze.path[0], maze.path[1])` instead of a fixed heading.
