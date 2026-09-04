# Research mode: accounts, measurement and guided sessions

Replaces the local "Highscores" list with a proper research record: named participants with logins, every run stored in a cloud database, a guided test session, and a spreadsheet export.

## 1. Participants and login

- Cloud backend added (database + accounts), so data follows a person across headsets.
- New sign-in screen before the title menu: email + password, plus "create account".
- Each account has a display name, and optional research fields: participant code, age, and notes (the code lets you de-identify data).
- One headset can be shared: a "Switch participant" option on the title screen signs out and returns to the login screen.
- Each person only ever sees their own data.

## 2. What gets measured per run

Recorded automatically for every attempt:

- Level, maze size, number of turns in the route, and the exact maze layout seed (so a run can be replayed or reproduced).
- Study phase: seconds allotted, seconds actually used, and whether they pressed Ready early.
- Outcome: cleared, ran out of time, stepped off route, or gave up.
- Completion time, and time from the first step to the goal.
- Recall span: how many correct steps were taken before the first mistake — the headline working-memory measure.
- Errors: number of off-route entries, number of backtracks, number of fake goals visited.
- Path efficiency: steps taken divided by the shortest possible number of steps.
- Hesitation: median and longest pause between two consecutive moves, and total time spent standing still.
- Settings in force (god mode, turn style, timers), so runs made under different conditions can be filtered apart.

Derived views shown in the headset:

- Per level: best time, mean recall span, error rate, and attempts.
- Progress over time: recall span and completion time per session date, so improvement is visible.
- Session summary right after each guided session.

God-mode runs and free-play runs are flagged and excluded from the comparable statistics by default.

## 3. Guided session

- New "Research session" option on the title menu.
- A session runs a fixed, preset sequence of levels (default: 3, 4, 5, 6, 7, 8, each once, in that order), so results are comparable between people and across dates.
- Between trials a short rest panel shows trial number and lets the participant continue.
- Timers and maze settings are locked to the protocol's own values during a session, so a participant cannot make it easier.
- At the end: a summary panel (trials cleared, mean recall span, mean time) and the whole session is stored as one record with its trials.
- Free play stays available and is still recorded, but marked as free play.

## 4. Records screen (replaces Highscores)

Tabs:

- **My progress** — personal bests and progress-over-time chart.
- **Sessions** — list of past guided sessions with date and summary numbers.
- **Export** — produces a spreadsheet file with one row per run containing every metric above, plus participant code, session id and timestamp. Downloaded from the browser on the desktop view (a headset can't easily save files, so export is available when the same account is opened on a computer).

## Technical notes

- Lovable Cloud enabled: tables `profiles`, `sessions`, `runs`, `run_events` (optional per-step log kept for future reaction-time work), all with row-level security scoping rows to the owning account, plus grants for the Data API.
- `MazeGame.tsx` gains a run-recorder: accumulates step timestamps, off-route entries, backtracks, fake-goal hits and study-phase timing in a ref, then writes a single row through a server function at run end. `handleCell` already sees every cell entry, so error and backtrack counts hook in there; forward/back steps report through the existing `onCell`.
- Maze seed becomes part of the recorded row; `generateMaze` already takes a seed-driven regeneration counter, which is stored so a layout is reproducible.
- Recall span computed by comparing the ordered list of entered cells against `maze.path` up to the first divergence.
- Session protocol defined as a constant array in `src/lib/protocol.ts` so it can be edited later; a `sessions` row groups its `runs`.
- Export implemented as a server function returning CSV, triggered from the desktop Records screen.
