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

## Visual result

Each slider is read as: `[handle]  50%` then directly below it `Label text` — so there is no ambiguity about which label belongs to which control.

## Scope

Only the settings slider layout; no changes to slider logic, audio settings, or other game mechanics.
