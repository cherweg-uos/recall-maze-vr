# Maze polish: tighter corridors, fixed panel placement, fake goals

## 1. Closed corridors again
The generator currently opens two extra sets of doorways (a "braid" pass plus a large junction pass sized at 60% of the path length), which produces wide open areas instead of corridors. Rework it so the maze stays a corridor maze while remaining hard to memorise:

- Drop the braid/loop pass entirely (or cap it to a couple of openings at the highest levels only).
- Keep decoy junctions, but limit them to a small number scaled by level (roughly 1 per 4 path cells at level 3, up to 1 per 2 at level 20), and only where the neighbour cell is not already reachable through a nearby opening — so each false turn reads as a distinct corridor mouth.
- Add a check that rejects an opening if it would give a cell more than 3 open sides, which is what creates the "open room" feel.
- Keep the existing rule that no opening may shorten the route to the goal, and keep the best-of-N candidate scoring, scoring on number of false corridor mouths rather than raw openings.

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
