# Constant panel placement + facing arrow on the briefing map

## Panels always in front of the player

Right now every 3D panel (title, level select, settings, highscores, result/fail) sits at a fixed spot in the menu room, and the briefing board sits at a fixed spot relative to the maze start. Because the player can teleport and physically walk, a panel can end up off to the side or too far away — and the distance the player stands from the briefing map changes how easy it is to read, which skews performance between runs.

New behaviour, applied when a screen appears (title, level select, settings, highscores, result/fail, and the briefing board at the start of a run):

- The screen is placed at a constant distance in front of the player, at a comfortable eye height, facing them.
- 0.5 seconds after it appears, check once whether the screen is actually in the player's view and at the intended distance.
- If it is not, reposition it once in front of the player. No further checks after that, so there is no chance of a panel chasing the player or looping.
- After that single validation the panel stays put, so the briefing board can still be grabbed and moved freely by hand.

## Briefing map start marker

The start point on the top-down map is drawn as a plain circle today. It becomes an arrowhead pointing in the direction the player will be facing when the run begins (the first step of the solution route), so the map can be read in the same orientation as the maze.

## Technical notes

- New `useFacePlayer` helper in `src/components/maze/vr/` returning a ref for an anchor `<group>`: on mount it places the group at camera position + forward × `PANEL_DISTANCE` (approx. 1.8 m) at 1.5 m height with yaw facing the camera, then after a 500 ms timeout runs one validation (dot product of camera forward vs. direction to panel above a threshold, and distance within tolerance) and repositions once if it fails. A `done` ref guarantees a single correction.
- `MazeGame.tsx` wraps `TitlePanel`, `LevelSelectPanel`, `SettingsPanel`, `HighscoresPanel` and `ResultPanel` in that anchor group; `Menus.tsx` panels drop their hard-coded `PANEL_POS` world offset and render at local origin.
- `BriefingBoard.tsx` uses the same helper for its initial transform, applied before grab handling so grabbing still overrides the position.
- Placement is measured from the world camera (XR headset pose when presenting, desktop camera otherwise), not the `XROrigin`, so teleporting mid-menu is accounted for.
- `mazeTexture.ts` `drawMazeMap` replaces the start circle with a filled triangle rotated to the first path direction (falls back to north when the path has a single cell).
