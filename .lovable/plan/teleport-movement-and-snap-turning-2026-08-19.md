# Teleport movement and snap turning

Replace smooth thumbstick walking with teleport locomotion everywhere, and 30° snap turning.

## Menus (title, level select, settings, highscores, briefing, result)

- Holding the trigger on either controller shows a curved teleport ray with a landing disc on the floor.
- Releasing the trigger moves the player to that spot instantly.
- Free positioning: any point on the menu-room floor is valid.
- Panels stay where they are, so the player can walk around and re-approach them.

## Maze

- Teleport is grid-locked: the ray snaps to the centre of the maze cell it lands on.
- Only the cell directly reachable from the current cell (adjacent, no wall between) is a valid target; invalid targets show the disc in a muted/blocked colour and releasing does nothing.
- Trigger release teleports one cell.
- Forward thumbstick push (past a generous deadzone, and requiring the stick to return to centre before the next push) teleports one cell in the direction the player is facing, using the same wall check.
- Sideways thumbstick push snaps the view 30° left or right, one snap per push.
- Stepping (teleporting) into a cell that is not on the solution path still fails the run immediately, and reaching the goal cell still clears it.

## Behaviour details

- Deadzone: about 0.75 on the stick axis, with a re-centre threshold of 0.25, so a slight nudge never fires.
- Snap turn also applies in the menus so the player can look around without physically turning.
- Desktop testing keeps working: arrow keys / A and D snap-turn 30°, W teleports forward one cell in the maze, and clicking the floor teleports in the menus.
- The on-screen hint text updates to describe teleport and snap turn.

## Technical notes

- New shared hook in `src/components/maze/vr/` for teleport: reads `useXRInputSourceState` trigger state on both controllers, raycasts against a floor plane, renders the arc plus landing marker, and calls an `onTeleport(x, z)` callback.
- `MazeScene.tsx` `Player` loses continuous movement: position becomes a discrete cell (col,row) held in a ref, converted to world coordinates; yaw becomes a multiple of 30°. The slide-collision `resolve` helper is no longer needed for movement and is replaced by an adjacency/wall check against `maze.cells`.
- `MazeGame.tsx` gets a menu-side teleport target on `MenuRoom`, moving the `XROrigin` in `MenuCamera` instead of parking it at the origin.
- Cell-change reporting to `onCell` fires on each teleport, keeping the existing deviation and goal logic untouched.
