# Briefing layout + thumbstick back step

## 1. Wider briefing board

The step list currently sits under the map and can overlap it. The board becomes a wider, landscape panel:

- Map stays square on the left side of the board.
- Level label, countdown and the direction list ("2 × Forward · Left · 3 × Forward") move to a column on the right, wrapped to that column's width so they never cross the map.
- Ready / Quit buttons and the grab hint stay along the bottom, spaced for the wider panel.

## 2. Back step with the thumbstick

Pulling the thumbstick backwards steps the player one cell backwards:

- Only allowed when there is no wall behind them.
- The player keeps their facing — they slide backwards, they do not turn around.
- Same deadzone and re-centre rule as the forward step, so a single pull moves exactly one cell.
- Backtracking onto a cell already visited never fails the run; only entering a new cell that is off the solution path fails.
- Desktop testing: S / ArrowDown does the same.

## Technical notes

- `BriefingBoard.tsx`: panel grows to roughly 2.1 × 1.1 with the map plane (~0.86) anchored left; labels re-positioned into a right-hand column with `maxWidth` set to that column.
- `locomotion.tsx` `useSticks` gains an `onBack` callback fired when the Y axis exceeds the deadzone in the positive direction, sharing the existing `armedY` latch.
- `MazeScene.tsx` adds `stepBack`, using the opposite of the current heading direction with the existing `canStep` wall check, plus the S / ArrowDown key binding.
- `MazeGame.tsx` deviation check tracks the set of cells already visited this run and only fails on an off-path cell that has not been visited yet.
