# Move slider labels below the slider handles

## Problem

In the VR settings panels, the labels for each slider are rendered above the slider handle, while the slider handle is offset downward. This places the label text closer to the *previous* slider above it than to the slider it actually describes, making it easy to mix up which label belongs to which control.

## Goal

Reposition the label and value text so each description sits directly underneath its own slider handle, with clear vertical spacing between one slider row and the next.

## Files to change

- `src/components/maze/vr/ui3d.tsx` — `SliderRow` layout
- `src/components/maze/vr/Menus.tsx` — row spacing in `TimeTab`, `MazeTab`, `AudioTab` (if needed after layout change)

## Proposed change

In `SliderRow`:

- Move the slider handle group to the local origin (y = 0) so the slider is the anchor point of the row.
- Place the label and value text **below** the slider handle (e.g., y = -0.14).
- Keep the label on the left and value text on the right.

Then verify the existing vertical spacing between rows in `TimeTab` (currently 0.24 units) still keeps rows clearly separated, and tighten/expand if necessary. If the new label-below layout reduces the row height, reduce the spacing between rows slightly to keep panels compact; otherwise leave it as is.

## Slider handle shape

In `Slider3D`, replace the cylinder handle with a rectangular block (a thin, slightly taller box than the track) so it reads as a flat rectangular grip instead of a puck. Keep the accent colour and the non-raycasting behaviour so dragging still works off the track mesh.

## Tick marks

Add small tick marks along the track at every snap position, derived from `min`, `max`, and `step`:

- Compute the step count; when it exceeds a readable limit (about 20 ticks), fall back to evenly spaced ticks at a coarser interval (or omit ticks entirely for very fine-grained sliders such as the 0–1 percentage knobs at 0.01 steps) so the track does not turn into a solid bar.
- Ticks render as thin, low-contrast marks just under the track, non-interactive (`raycast={() => null}`) so they never block drag input.
- The tick row sits between the track and the label text, keeping label-under-slider association intact.

## Visual result

Each slider reads as: rectangular handle on a ticked track, with `Label text` and its value directly underneath — no ambiguity about which label belongs to which control.

## Scope

Only the settings slider presentation (layout, handle shape, ticks); no changes to slider value logic, snapping behaviour, or other game mechanics.
