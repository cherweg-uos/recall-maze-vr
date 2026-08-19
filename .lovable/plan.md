# Maze polish: tighter corridors, fixed panel placement, fake goals

## 1. Closed corridors again — sculpt pass that also adds walls
Yes, that works and it is the better approach. Instead of a braid pass that only opens doors (which is what turns the grid into open rooms), replace it with a sculpt pass that both opens and closes walls, with a hard rule: every off-path cell may have at most 2 open sides. That single rule guarantees each side branch reads as a straight corridor or a corner with one entrance, never a room.

How the pass works:

- Carve the perfect maze and compute the solution path as today.
- Sculpt off-path cells: walk all cells not on the solution path and, wherever a cell has 3 or 4 open sides, close openings back up until only 2 remain. Openings are chosen for closing at random, but the opening that connects the branch back toward its entrance is kept, so the branch stays reachable and does not become an isolated pocket.
- Decoy entrances: from each chosen point on the solution path, open exactly one door into an off-path cell, and only when that neighbour still has a free side afterwards under the 2-open-sides rule. Number of entrances scales with level (roughly 1 per 4 path cells at level 3 up to 1 per 2 at level 20).
- Corridor growth: after opening an entrance, extend that branch a few cells (level-scaled length) by opening one door per step in a single direction with occasional 90° corners, always respecting the 2-open-sides cap, so wrong turns run several cells before dying.
- Path cells keep at most one decoy door each, so a junction is a clean T rather than a crossroads.
- Preserve the existing guarantees: no opening may shorten the route to the goal (BFS re-check), the solution stays the recorded shortest route, and the best-of-N candidate pick now scores on number of decoy corridor mouths plus their average length rather than raw openings.
- Closing walls never touches a wall between two solution-path cells or a wall on the branch's own entrance chain, so connectivity of everything the player can legitimately reach is unchanged.


## 2. Constant panel placement
Every menu, briefing, result and fail panel should appear at a fixed distance and height directly in front of the player at the moment the phase starts, and stay there.

- On entering a menu/result/briefing phase, capture the player's current head position and yaw once, and place the panel 1.6 m ahead at 1.45 m height, facing the player.
- After that, the panel does not follow the head — the player can walk/teleport around it, but the starting relationship is identical every time.
- Teleporting in menus does not re-anchor the panel, except the recenter that happens on each new phase.

## 3. Arrowhead start marker
In the briefing map, replace the grey circle at the start cell with a filled triangular arrowhead pointing North (the direction the player faces on spawn), so the starting orientation is unambiguous.

## 4. Thumbstick back step
Pulling the thumbstick backwards past the deadzone steps one cell backwards (opposite to the facing direction) without turning, using the same wall check and re-arm logic as the forward step. Also bound to the S / Down arrow key for desktop testing.

## 5. Fake goals
New settings:
- Fake goals on/off
- Number of fake goals (1–6)
- Fake goal colour: "same as real" or "distinct" (a separate tint)

Fake goals are placed on dead-end cells of false branches, never on the solution path and never adjacent to the real goal. They render with the same octahedron + floor glow as the real goal, tinted per setting. They are decoration only — stepping onto their cell already fails the run because it is off-path.

## 6. Briefing board resize
Enlarge the board and rebalance it so the step-instruction text never overlaps the map: taller panel, map square moved up and slightly smaller, step text in a dedicated band below it with wrapping across up to two lines, and the Ready/Quit buttons below that band.

## 7. Grabbable main menu
Extract the grab-and-move behaviour from the briefing board into a shared `useGrabbable` helper and apply it to the title panel (and the other menu panels), so the player can pick up and reposition menus with a trigger. Repositioning is reset by the per-phase recenter in item 2.

## Technical notes
- `src/lib/maze.ts` — corridor-preserving generation, open-side cap, fake-goal cell picker exported alongside the maze.
- `src/lib/gameSettings.ts` — `fakeGoals`, `fakeGoalCount`, `fakeGoalColor` settings plus ranges/defaults.
- `src/lib/mazeTexture.ts` — arrowhead start marker.
- `src/components/maze/vr/ui3d.tsx` — new `useGrabbable` hook and an `AnchoredPanel` wrapper that captures head pose on mount.
- `src/components/maze/vr/Menus.tsx`, `BriefingBoard.tsx` — anchored + grabbable panels, briefing layout resize.
- `src/components/maze/vr/locomotion.tsx` — backward stick step.
- `src/components/maze/MazeScene.tsx` — back step handler, fake goal rendering.
- `src/components/maze/MazeGame.tsx` — settings threading and phase-anchored panels.
