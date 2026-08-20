# Looping background music

Add the uploaded melancholic horror track as looping background music that plays for the whole session, with a single place to swap the file later.

## Behaviour

- Music starts when the player leaves the flat "Enter VR" screen (Enter VR or Preview on screen) — browsers block autoplay before a click, so this button press is the unlock moment.
- Loops seamlessly and indefinitely, regardless of track length. No length assumptions anywhere.
- Keeps playing across every phase: title, level select, settings, highscores, briefing, maze, fail and clear screens.
- Stops (and rewinds) when the player exits back to the flat entry screen.
- Pauses while the browser tab is hidden, resumes when it comes back.

## Swapping the track

One constant at the top of a new `src/lib/bgm.ts`:

```text
const TRACK = bgmAsset.url   // change this single import/path to swap music
```

The track is uploaded to CDN storage and referenced through a `src/assets/*.asset.json` pointer, so replacing the music later means uploading a new file and pointing that one constant at it.

## Volume control

Add to Settings (a small "Audio" group or the existing tab layout):

- Music volume slider, 0–100%, 0 = silent.

Saved on this device with the other settings.

## Technical notes

- `src/lib/bgm.ts` owns a single lazily-created `HTMLAudioElement` with `loop = true` and `preload = "auto"`, plus `play`, `stop`, and `setVolume` helpers — no React re-render churn, one element for the app's lifetime.
- A `useBgm(phase, volume)` hook in `MazeGame` calls those helpers on phase change; the audio element lives outside the R3F canvas so canvas re-renders never restart it.
- `GameSettings` gains `musicVolume: number` (default 0.5) with the existing merge-on-load defaults handling old saved settings.
- Uploaded mp3 becomes a CDN asset pointer (`src/assets/bgm-main.mp3.asset.json`); the binary is not committed to the repo.
