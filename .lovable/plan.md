# Turn options + trickier mazes

## 1. Turning settings

Add a turn section to the in-VR Settings panel:

- Turn style toggle: two buttons, "Snap" and "Smooth" (one highlighted as active).
- Snap angle: 15° / 30° / 90° selector buttons (only shown when Snap is active).
- Smooth turn speed: slider, 45–240 degrees per second, step 15, default 120 (shown when Smooth is active).

Both settings persist with the existing local settings storage, defaulting to Snap / 30° so current behaviour is unchanged.

Behaviour:
- Snap: sideways thumbstick past the deadzone rotates by the chosen angle once, requiring recentre before firing again (current behaviour, configurable angle).
- Smooth: holding the stick sideways rotates continuously at the chosen degrees per second, scaled by stick deflection, with a small deadzone. Applies in both the menu room and inside the maze; the maze still teleports cell-to-cell for movement.

## 2. More false turns in the maze

The generator currently makes a perfect maze (exactly one route), so wrong choices are visibly short dead ends. Change generation so the layout offers many convincing decoy branches:

- After carving, add a braid pass that removes a percentage of dead-end walls, creating loops and longer wrong paths.
- Grow decoy corridors: for each junction along the solution path, ensure at least one adjacent false branch that runs several cells before ending, so a wrong turn looks plausible.
- Scale the decoy density with level: low levels keep a few, higher levels add more and longer decoys.
- The solution path stays the recorded shortest route from start to goal; stepping off it still fails the run, and the briefing map still shows only the true path.

## Technical notes

- `src/lib/gameSettings.ts`: add `turnStyle: "snap" | "smooth"`, `snapDegrees: 15 | 30 | 90`, `smoothDegPerSec`, plus defaults and range metadata.
- `src/components/maze/vr/Menus.tsx`: extend `SettingsPanel` with the toggle rows; panel grows in height to fit.
- `src/components/maze/vr/locomotion.tsx`: `useSticks` takes turn config and calls a per-frame continuous rotation callback in smooth mode.
- `src/components/maze/MazeGame.tsx` and `src/components/maze/MazeScene.tsx`: pass settings into the rigs and apply yaw per frame.
- `src/lib/maze.ts`: add braiding + decoy-branch passes after `carve`, keeping BFS path selection intact.
