# Stop the headset dropping out of VR

The session drops because a single frame occasionally takes far too long, and because nothing in the app reacts when the headset does end the session. Two separate fixes.

## 1. Remove the frame spikes

Suspected causes, all confirmed in the scene code:

- **Maze floor grows without limit.** The maze stone floor tiles the whole grid *plus a 14 m apron on every side*. At level 20 that is many thousands of extra instanced tiles built in one synchronous pass the moment the run starts. Cap the apron (about 3 m) and skip apron tiles that are far outside the play area.
- **Everything is rebuilt on every phase change.** Menu and maze are separate subtrees, so entering the briefing/run tears down one stone floor and builds the other from scratch inside a live XR frame. Keep the menu platform mounted (hidden) instead of unmounting, and build the maze placements once per maze rather than per mount.
- **Shadows are the heaviest cost per frame.** Every wall has `castShadow` + `receiveShadow` under a shadow-casting directional light. Restrict the shadow camera to a small area around the player, or drop wall shadow casting and keep a cheap ambient-occlusion look. Also lower the tile material cost by disabling `castShadow` on stones (already done) and shadows on stones entirely.
- **Cheaper renderer settings in VR**: clamp `dpr` lower while presenting, and keep the fog distance short so distant maze walls are culled.

## 2. Recover gracefully when the session ends

Today nothing watches the XR session, so if the headset ends it the app is left rendering a flat window in whatever phase it was in.

- Subscribe to the XR store's session state. On session end, return to the `enter` screen with a short "VR session ended — re-enter" message so re-entering is one click and the run isn't left in a broken half state.
- Pause the briefing/run countdowns while no session is present, so a dropout doesn't silently burn the maze timer.

## Verification

Load a level 20 maze on desktop with a frame-time readout and confirm the transition from briefing to run no longer produces a multi-hundred-millisecond stall, and that instance counts stay roughly flat as level rises.

## Technical notes

- `src/components/maze/vr/StoneFloor.tsx`: clamp `apron` default to ~3, and cache placements by seed.
- `src/components/maze/MazeGame.tsx`: render `MenuRoom` always with `visible={!inMaze}`; add `store.subscribe` for session end -> `setPhase("enter")`; gate the two countdown intervals on session presence.
- `src/components/maze/MazeScene.tsx`: drop `castShadow` on walls or tighten `directionalLight.shadow.camera` bounds; keep the single directional light.
- `Canvas`: `dpr={[1, 1.25]}` and `shadow-mapSize` reduced.

## Out of scope

Level-of-detail streaming of the maze, changing maze generation, sound.
