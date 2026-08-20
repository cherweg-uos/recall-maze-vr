# 5 m menu platform and moonlit night scene

## Menu movement area

- The menu ground becomes a circular stone/rock platform with a 5 m radius instead of the current 60 x 60 plane.
- Teleporting is only valid inside that circle. Aiming outside shows the landing disc in the same grey "blocked" style used for unreachable maze cells, and releasing the trigger does nothing.
- Clicking the floor on desktop follows the same rule.
- The maze is unchanged: cell-by-cell teleporting across the whole maze stays as it is.

## Scene transitions

- The existing "move the player/panel to face them" teleport-and-check on entering a menu is dropped.
- Instead, the moment the player steps onto a goal or fail tile, all movement (trigger teleport, thumbstick steps, snap turn, desktop keys) is disabled immediately and stays disabled for 0.5 s into the new scene, so a button press that triggers a scene swap can't teleport them straight away.
- Coming back from a maze to the menu space, the player is placed back at the centre of the 5 m platform, facing the panel.


## Nighttime sky

- Deep blue night sky with a dense star field surrounding the whole experience (menus and maze).
- Moonlight replaces the daylight setup: a cool directional "moon" plus a low blue ambient fill, bright enough that maze walls, floor and the solution path stay clearly readable.
- Fog is retinted to the night blue so distant geometry fades into the sky rather than into grey.
- Panels, goal markers and the teleport disc keep their current colours and read as gently glowing against the darker background.

## Technical notes

- `Menus.tsx` `MenuRoom`: swap the 60x60 plane for a `circleGeometry` of radius 5 (plus a subtle rim ring), keeping the existing centre marker.
- `locomotion.tsx` `TeleportFloor`: accept an optional radius; `snap` in the menu path marks targets outside `sqrt(x^2+z^2) > 5` as invalid so the existing valid/invalid disc styling handles the feedback.
- `MazeGame.tsx`: change `<color>`/`<fog>` to a night blue, replace the hemisphere/directional pair with a moonlit rig, and add a stars component (drei `Stars`, already available) rendered for both menu and maze phases. It also owns a shared `lockedUntil` timestamp ref set on every phase change (and on goal/fail detection); `useSticks` and `TeleportFloor` ignore input while locked, and the menu rig resets the origin to (0, 0, 0) with the default yaw when returning from a maze.
- Maze floor/wall materials stay the same; only lighting and background change so brightness is tuned via light intensities.
