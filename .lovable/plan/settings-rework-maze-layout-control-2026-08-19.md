# Settings rework + maze layout control

## Settings panel with tabs

One panel with a tab row across the top: **Movement**, **Time**, **Maze**. Selecting a tab swaps the content below; a Back button stays at the bottom.

- **Movement** — turn style (Snap / Smooth), snap angle (15/30/90), smooth turn speed slider. (Existing controls, moved here.)
- **Time** — briefing base time, briefing time per level, maze base time, maze time per level, plus the "at level 10" preview line. (Existing controls, moved here.)
- **Maze** — new section, below.

## Maze tab

Fake goals:
- Toggle: fake goals on/off
- Slider: number of fake goals (0–6)
- Toggle: decoy colour — "Same as real goal" or "Distinct colour"

Fake goals are placed on dead ends of false branches, never on the solution path, and are purely visual: touching one does nothing, and they are not drawn on the briefing map.

Maze layout sliders:
- **Decoy density** — how many junctions branch off the solution route
- **Branch depth** — how long false branches run before dead-ending
- **Loops / braiding** — how often off-route corridors reconnect (low = closed, dead-endy)
- **Corridor twistiness** — bias toward turns over straight runs

Each has a sensible default matching a "closed, dense, twisty" feel rather than today's open layouts.

## Generator changes

Rework `src/lib/maze.ts` so layouts are driven by these parameters:

- Carve with a turn-biased backtracker (weight direction changes over continuing straight) so long straight corridors are rare.
- Replace the current broad braiding pass with a bounded one controlled by the loops slider; default low, so most off-route corridors terminate in dead ends.
- Junction pass grows false branches to the configured depth instead of opening arbitrary doors, keeping the solution's shortest-path length intact (BFS check as today).
- Collect the resulting dead-end cells; fake goals are sampled from the deepest ones.

## Technical notes

- `GameSettings` in `src/lib/gameSettings.ts` gains `fakeGoalsEnabled`, `fakeGoalCount`, `fakeGoalDistinct`, and a `mazeShape` group (`decoyDensity`, `branchDepth`, `loopiness`, `twistiness`), all with defaults merged for existing saved settings.
- `generateMaze(level, mazeShape, fakeGoalCount)` returns `decoyGoals: {col,row}[]` on the `Maze` object.
- `src/lib/mazeTexture.ts` ignores `decoyGoals` (briefing map unchanged).
- `src/components/maze/MazeScene.tsx` renders decoy goal markers using the same geometry as the real goal, tinted differently when "Distinct colour" is chosen; they have no collision or completion behaviour.
- `src/components/maze/vr/Menus.tsx`: `SettingsPanel` gets local tab state and three content sub-components; panel height sized to the tallest tab.
