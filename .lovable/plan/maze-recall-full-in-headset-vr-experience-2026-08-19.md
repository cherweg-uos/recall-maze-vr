# Maze Recall — full in-headset VR experience

Everything after a single "Enter VR" click happens inside the headset: menus, settings, briefing, maze, fail and clear screens are 3D panels floating in a calm empty room. Desktop input stays available purely for testing.

## Flow

```text
Enter VR (only flat screen)
        |
   Empty room / Title panel
   Start | Level select | Settings | Highscores | Exit
        |
   Briefing room  -- grabbable map + countdown + Ready button
        |
   Maze run  -- hold X for remaining time
        |
   Cleared  ->  Next maze          Failed -> Restart level (new layout) | Title
```

## Title room

A floating panel in an empty room with five options, pointed at and clicked with the controller ray:

1. **Start** — begins at level 3.
2. **Level select** — a grabbable slider from 3 to 20, with a live preview of grid size and number of turns, then Start.
3. **Settings** — see below.
4. **Highscores** — table of level, best time and date, scrollable, stored on this device.
5. **Exit** — ends the VR session and returns to the flat "Enter VR" screen.

## Settings (all sliders, saved on this device)

- Briefing base time: 10–30 s
- Briefing time added per level: 1–30 s
- Maze base time: 2–5 min
- Maze time added per level: 10–60 s

Effective time = base + (level − 3) × per-level increase, shown live as an example next to each slider.

## Briefing

- A physical map board rendered in 3D that the player can grab with either hand and move, rotate and hold close.
- Shows the maze top-down with the solution path highlighted, plus the step list ("Forward 2, Left, Forward 3, Right").
- A countdown ring/number on the board shows remaining study time. When it hits zero the run starts automatically.
- A "Ready" button on the board starts the run early.
- The board and the step list disappear the moment the run starts.

## Maze run

- First person, thumbstick movement, snap or smooth turning, grid-based collision (unchanged).
- Holding the **X** button shows a wrist-mounted panel with the time remaining; releasing hides it.
- **Fail on deviation**: stepping into any cell that is not on the solution path fails the run immediately.
- **Fail on timeout**: maze timer running out fails the run.
- Fail panel: "Restart level" generates a brand-new maze of the same difficulty and returns to the Briefing, or "Back to title".
- Reaching the goal clears the level, records the time, and offers the next level.

## Visual style

Same clean matte palette as now: neutral floor, soft off-white walls, one warm accent for goal, path and interactive highlights. The menu room is an empty softly lit space with a subtle floor grid so the panels read clearly.

## Technical notes

- New state machine in `MazeGame`: `enter | title | levelSelect | settings | highscores | briefing | playing | failed | cleared`. Everything except `enter` renders inside the same persistent R3F `<Canvas>`/`<XR>` so the VR session is never interrupted between screens.
- Menus built from `@react-three/uikit`-style panels; if that package is not desirable, use `drei`'s `Text` plus simple meshes with pointer events — either way controller rays drive them.
- Grabbable briefing board via XR hand/controller select events, following the controller transform while held.
- Deviation detection: precompute the solution-path cell set; on cell change, fail if the entered cell is not in it.
- `levelConfig` extended so levels 3–20 map to a growing grid (up to a practical cap) and a longer required route.
- Settings and highscores persisted in browser storage under a versioned key; no backend.
- Desktop keyboard/mouse path kept working for testing, with the same panels rendered in-scene.

## Out of scope

Accounts, online leaderboards, sound design, hand tracking gestures beyond grabbing, hand-authored levels.
