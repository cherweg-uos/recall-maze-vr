# Stone floor in the menu and briefing rooms

The briefing and every menu screen share the same room (`MenuRoom`), so adding the stone floor there covers title, level select, settings, highscores, result screens and the briefing in one change.

## What changes

1. **Make the stone floor area-based instead of maze-based.** Today `StoneFloor` takes maze `cols`/`rows`/`cell` and lays tiles from origin (0,0) outward. It gains an optional explicit footprint: a centre point plus width and depth in metres. The maze keeps calling it exactly as it does now (same layout, same seed, same look).

2. **Render it in the menu room.** `MenuRoom` gets a `StoneFloor` covering the area the player can teleport across (the room plane is 60 x 60, but fog hides everything past ~40 m, so tiles fill roughly a 44 x 44 m square centred on the origin plus the existing sparse apron beyond it). It sits inside a `Suspense` boundary the same way the maze does, with a fixed seed so the menu floor always looks identical.

3. **Darken the menu ground plane** from `#b3bbc0` to the same grout tone the maze uses, so the gaps between stones read as mortar rather than light concrete.

4. **Keep the teleport ring visible.** The accent ring at the spawn point currently sits at y = 0.005, below the stones; it moves up to the same height the maze teleport marker uses so it stays readable on top of the tiles.

## Performance

Still two draw calls for the whole floor (one instanced mesh per stone sub-part). The menu area is a fixed size, so the instance count is constant and comparable to a mid-size maze. The model is already preloaded via `useGLTF.preload`, and because the menu is the first thing shown, the maze floor will be warm in cache by the time a run starts — the current pop-in on entering a maze goes away.

## Technical notes

- `src/components/maze/vr/StoneFloor.tsx`: new optional props (`centerX`, `centerZ`, `width`, `depth`) that bypass the `cols * cell` derivation; tile-placement logic is unchanged otherwise.
- `src/components/maze/vr/Menus.tsx`: `MenuRoom` renders `<Suspense fallback={null}><StoneFloor .../></Suspense>` above the ground plane, updates the plane colour and raises the spawn ring.
- No changes to `MazeGame.tsx` or `MazeScene.tsx`.
