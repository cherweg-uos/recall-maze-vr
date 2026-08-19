# VR Maze Runner — endless procedural mazes in WebXR

A browser-based VR experience: before each maze you study a top-down map with the correct path drawn on it, then you enter the maze in first person and walk it from memory. Each maze is generated fresh and gets longer than the last.

## Player flow

```text
Title screen  ->  Briefing (top-down map + drawn path)  ->  Maze (VR / desktop)
                        ^                                        |
                        |                 reach goal / wrong turn |
                        +----------------------------------------+
```

1. **Title** — short explanation, "Enter VR" button (shown when a headset is detected) and "Play on screen" fallback.
2. **Briefing** — 2D top-down render of the generated maze with the solution path highlighted, plus the step list ("Forward 2, Left, Forward 3, Right"). A "Ready" button starts the run; the map is hidden once inside.
3. **Maze** — first-person 3D corridors. Player moves with headset controllers (thumbstick / teleport) or WASD + mouse on desktop. Reaching the goal tile completes the level.
4. **Result** — time taken, level number, "Next maze" continues with a harder maze.

## Difficulty progression

Endless. Level 1 starts with a short solution path (about 3 turns) on a small grid; each level increases grid size and required path length, so the sequence to memorize grows steadily. The generator guarantees a single solution path of the target length.

## Visual style

Clean and simple: light neutral floor, soft matte walls, a single accent color for the goal and for the drawn path on the briefing map. Structured so textures, lighting and props can be layered in later without reworking the geometry.

## Technical notes

- Three.js + WebXR via `@react-three/fiber` and `@react-three/xr`, rendered client-side only (dynamic import behind `ClientOnly`) since WebXR touches browser globals.
- Maze generation is a pure TypeScript module (grid + DFS carve, then path-length tuning) — no browser or server dependency, easy to unit test.
- Briefing map drawn on a canvas/SVG from the same maze data structure the 3D scene consumes.
- Walls as instanced boxes; collision by grid-cell lookup rather than physics, keeping frame rate high on standalone headsets.
- Routes: `/` (title + game shell). Game phases are local state, not separate routes, so no page reloads mid-session.
- Progress (current level, best times) kept in browser storage for now; no backend. Can move to Lovable Cloud later if you want cross-device scores or a leaderboard.

## Out of scope for this first build

Accounts, leaderboards, sound design, hand tracking, and hand-authored levels.
