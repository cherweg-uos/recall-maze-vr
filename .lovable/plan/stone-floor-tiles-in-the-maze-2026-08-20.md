# Stone floor tiles in the maze

Replace the flat grey ground inside the maze with your uploaded stone floor prop, tiled across the walkable area, varied by rotation, and rendered as instances so hundreds of tiles cost almost nothing.

## What the model contains

The GLB has exactly two stone sub-parts (`Mesh_0`, `Mesh_1`), sharing one PBR material (basecolor + normal + roughness/metal maps). Each part is roughly a 1 x 1 unit slab about 0.12 units thick, and neither part covers its square fully — so the base floor must remain visible underneath.

## Approach

1. **Asset hosting** — register the GLB with the asset CDN (`lovable-assets create`) and import the pointer JSON, so the 6 MB binary never lands in the repo.

2. **Load once** — `useGLTF(url)` in a small `StoneFloor` component; pull the two meshes' geometry and the shared material out of the loaded scene. Preload it so the maze doesn't pop in.

3. **Two instanced meshes, not hundreds of objects** — one `THREE.InstancedMesh` per sub-part (so 2 draw calls total for the whole floor, regardless of tile count). Tile transforms are baked into instance matrices once via `useMemo`, using a seeded RNG so a given maze always looks the same.

4. **Tile layout** — one tile per 1 x 1 metre square over the maze footprint (maze cols/rows x `CELL` = 3 m per cell), plus a small margin ring. For each square:
   - pick sub-part A or B at random (split across the two instanced meshes),
   - random yaw of 0/90/180/270 degrees plus a tiny random jitter (a couple of degrees) and a few centimetres of XZ offset to break the grid pattern,
   - slight random Y jitter for an uneven, laid-stone feel.

5. **Sink the prop 3/4 into the base floor** — the tile's visible thickness is ~0.12 m, so tiles sit with roughly the top quarter proud of the ground plane (Y offset around -0.09 with jitter). The existing grey plane stays in place and shows through the gaps as mortar/dirt; its colour gets darkened to read as grout rather than concrete.

6. **Coverage** — tiles fill the whole maze footprint (the ground you can actually walk and see between walls), plus an outward apron that extends to the visible ground beyond the maze walls. Fog already hides the world past ~40 m, so the apron stops there rather than covering the full 400 x 400 plane — visually it reads as "stone everywhere" at zero extra cost.

7. **Keep it cheap** — instanced meshes, `frustumCulled` on, tiles receive but do not cast shadows, texture anisotropy capped. Even a level-20 maze plus apron stays at 2 draw calls. If the instance count gets large, the apron switches to larger, sparser slabs (scaled-up instances) toward the outer ring.

## Technical notes

- New file `src/components/maze/vr/StoneFloor.tsx` exporting `<StoneFloor cols rows cell />`, rendered from `MazeWorld` in `src/components/maze/MazeScene.tsx` just above the existing ground plane.
- `useGLTF` comes from `@react-three/drei`, already installed.
- Instance count is measured after the first build; if it exceeds a comfortable budget for standalone headsets, the apron radius shrinks first — the in-maze coverage is never reduced.

